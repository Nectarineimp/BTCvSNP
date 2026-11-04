import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DataPoint, AlignmentMode, ViewPerspective, GraphMode } from '../types/market';
import { createBitcoinHeroToken, createSP500HeroMonument } from './proceduralModels';
import { createGraphGrid, DynamicGraphRibbons, DEFAULT_LAYOUT, GraphLayoutConfig } from './graphVisuals';

// Module-scope reusable math scratchpad to prevent GC in the render loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetControlsTarget = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export interface ThreeSceneCallbacks {
  onHoverPoint: (point: DataPoint | null, clientX: number, clientY: number) => void;
  onProgressChange?: (progress: number) => void;
}

export class ThreeSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private isSoftwareGl: boolean;
  private frameId = 0;
  private clock = new THREE.Clock();

  // Procedural 3D scene elements
  private gridGroup: THREE.Group;
  private ribbons: DynamicGraphRibbons;
  private btcHeroToken: THREE.Group;
  private spxHeroMonument: THREE.Group;

  // Raycasting plane
  private raycastPlane: THREE.Mesh;

  // State
  private points: DataPoint[] = [];
  private progress = 1.0;
  private alignment: AlignmentMode = 'separated';
  private graphMode: GraphMode = 'percentage';
  private currentPerspective: ViewPerspective = 'isometric';
  private isCameraTransitioning = false;

  private callbacks: ThreeSceneCallbacks;
  private layout: GraphLayoutConfig = DEFAULT_LAYOUT;

  constructor(container: HTMLElement, callbacks: ThreeSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect software WebGL from GPU renderer string (never UA)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 2. Modern WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050811);
    this.scene.fog = new THREE.FogExp2(0x050811, 0.022);

    // 4. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Camera & OrbitControls
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 8, 22);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going beneath floor
    this.controls.minDistance = 6;
    this.controls.maxDistance = 45;
    this.controls.target.set(0, 2.5, 0);

    // Cancel camera transition if user manually moves controls
    this.controls.addEventListener('start', () => {
      this.isCameraTransitioning = false;
    });

    // 6. Balanced 3-Point Studio Lighting Rig
    const warmKeyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    warmKeyLight.position.set(14, 20, 16);
    warmKeyLight.castShadow = !this.isSoftwareGl;
    warmKeyLight.shadow.bias = -0.0005;
    warmKeyLight.shadow.normalBias = 0.02;
    warmKeyLight.shadow.mapSize.width = 2048;
    warmKeyLight.shadow.mapSize.height = 2048;
    warmKeyLight.shadow.camera.left = -18;
    warmKeyLight.shadow.camera.right = 18;
    warmKeyLight.shadow.camera.top = 18;
    warmKeyLight.shadow.camera.bottom = -18;
    this.scene.add(warmKeyLight);

    const coolHemiLight = new THREE.HemisphereLight(0x38bdf8, 0x050811, 0.75);
    this.scene.add(coolHemiLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 1.2);
    rimLight.position.set(-16, 12, -14);
    this.scene.add(rimLight);

    // 7. Grid & Reference Matrix
    this.gridGroup = createGraphGrid(this.layout);
    this.scene.add(this.gridGroup);

    // 8. Dynamic Graph Ribbons
    this.ribbons = new DynamicGraphRibbons(140, this.layout);
    this.scene.add(this.ribbons.root);

    // 9. Procedural Hero Models
    this.btcHeroToken = createBitcoinHeroToken();
    this.btcHeroToken.position.set(this.layout.xMin - 2.8, 0, -this.layout.zSeparation);
    this.scene.add(this.btcHeroToken);

    this.spxHeroMonument = createSP500HeroMonument();
    this.spxHeroMonument.position.set(this.layout.xMin - 2.8, 0, this.layout.zSeparation);
    this.scene.add(this.spxHeroMonument);

    // 10. Transparent Raycasting Plane
    const rayGeo = new THREE.PlaneGeometry(
      this.layout.xMax - this.layout.xMin + 4,
      12
    );
    const rayMat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    this.raycastPlane = new THREE.Mesh(rayGeo, rayMat);
    this.raycastPlane.position.set(0, 3.5, 0);
    this.scene.add(this.raycastPlane);

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);

    // Start loop
    this.startLoop();
  }

  private handleResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_mouse, this.camera);
    const hits = _raycaster.intersectObject(this.raycastPlane);

    if (hits.length > 0 && this.points.length > 0) {
      const hitPoint = hits[0].point;
      const xClamped = THREE.MathUtils.clamp(hitPoint.x, this.layout.xMin, this.layout.xMax);
      const ratio = (xClamped - this.layout.xMin) / (this.layout.xMax - this.layout.xMin);
      const index = Math.round(ratio * (this.points.length - 1));
      const pt = this.points[index];

      const yBtc = this.layout.yBase + pt.btcChangePct * this.layout.yScale;
      const ySpx = this.layout.yBase + pt.spxChangePct * this.layout.yScale;
      this.ribbons.setHoverGuide(xClamped, yBtc, ySpx);

      this.callbacks.onHoverPoint(pt, e.clientX, e.clientY);
    } else {
      this.ribbons.setHoverGuide(null);
      this.callbacks.onHoverPoint(null, 0, 0);
    }
  };

  private handlePointerLeave = () => {
    this.ribbons.setHoverGuide(null);
    this.callbacks.onHoverPoint(null, 0, 0);
  };

  /**
   * Continuous animation loop with Software WebGL pacing guard
   */
  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // Procedural idle rotations on hero props
      if (this.btcHeroToken) {
        const ring1 = this.btcHeroToken.getObjectByName('BtcOrbitalRing');
        const ring2 = this.btcHeroToken.getObjectByName('BtcOrbitalRing2');
        if (ring1) ring1.rotation.z += delta * 0.8;
        if (ring2) ring2.rotation.x += delta * 0.6;
        this.btcHeroToken.position.y = Math.sin(elapsed * 1.5) * 0.06;
      }

      if (this.spxHeroMonument) {
        this.spxHeroMonument.position.y = Math.cos(elapsed * 1.3) * 0.05;
      }

      // Smooth exponential damping on camera transitions
      if (this.isCameraTransitioning) {
        const dt = Math.min(delta, 0.1);
        const k = 5.0; // damping rate
        const factor = 1 - Math.exp(-k * dt);

        this.camera.position.lerp(_targetCamPos, factor);
        this.controls.target.lerp(_targetControlsTarget, factor);

        if (
          this.camera.position.distanceTo(_targetCamPos) < 0.05 &&
          this.controls.target.distanceTo(_targetControlsTarget) < 0.05
        ) {
          this.camera.position.copy(_targetCamPos);
          this.controls.target.copy(_targetControlsTarget);
          this.isCameraTransitioning = false;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  /**
   * Updates graph data & geometry
   */
  public setData(points: DataPoint[]) {
    this.points = points;
    this.ribbons.update(this.points, this.progress, this.alignment, this.graphMode);
  }

  /**
   * Sets playback progress (0.0 to 1.0)
   */
  public setProgress(progress: number) {
    this.progress = THREE.MathUtils.clamp(progress, 0.01, 1.0);
    this.ribbons.update(this.points, this.progress, this.alignment, this.graphMode);
  }

  /**
   * Sets alignment: 'separated' vs 'superimposed'
   */
  public setAlignment(alignment: AlignmentMode) {
    this.alignment = alignment;
    this.ribbons.update(this.points, this.progress, this.alignment, this.graphMode);

    // Smoothly shift hero token Z positions
    const targetBtcZ = alignment === 'separated' ? -this.layout.zSeparation : -1.2;
    const targetSpxZ = alignment === 'separated' ? this.layout.zSeparation : 1.2;
    this.btcHeroToken.position.z = targetBtcZ;
    this.spxHeroMonument.position.z = targetSpxZ;
  }

  /**
   * Sets display graph mode: 'percentage' vs 'normalized'
   */
  public setGraphMode(mode: GraphMode) {
    this.graphMode = mode;
    this.ribbons.update(this.points, this.progress, this.alignment, this.graphMode);
  }

  /**
   * Sets cinematic camera view preset with silky smooth damping
   */
  public setCameraPerspective(preset: ViewPerspective) {
    this.currentPerspective = preset;
    this.isCameraTransitioning = true;

    switch (preset) {
      case 'isometric':
        _targetCamPos.set(0, 9.5, 20.5);
        _targetControlsTarget.set(0, 2.4, 0);
        break;
      case 'head_to_head': {
        // Position camera in front of the active heads
        const ratio = this.progress;
        const headX = this.layout.xMin + ratio * (this.layout.xMax - this.layout.xMin);
        _targetCamPos.set(headX + 5.5, 4.2, 5.0);
        _targetControlsTarget.set(headX, 2.5, 0);
        break;
      }
      case 'chart_front':
        _targetCamPos.set(0, 2.8, 22.0);
        _targetControlsTarget.set(0, 2.8, 0);
        break;
      case 'top_down':
        _targetCamPos.set(0, 25.0, 0.1);
        _targetControlsTarget.set(0, 0, 0);
        break;
    }
  }

  /**
   * Resets camera to standard isometric view
   */
  public resetCamera() {
    this.setCameraPerspective('isometric');
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);

    this.ribbons.dispose();
    this.renderer.dispose();

    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
