import * as THREE from 'three';
import { DataPoint, AlignmentMode, GraphMode } from '../types/market';

export interface GraphLayoutConfig {
  xMin: number;
  xMax: number;
  yBase: number; // Y position of 0% return
  yScale: number; // Units per 1% return
  zSeparation: number; // Half-distance between tracks in separated mode
}

export const DEFAULT_LAYOUT: GraphLayoutConfig = {
  xMin: -11.0,
  xMax: 11.0,
  yBase: 2.2,
  yScale: 1.4,
  zSeparation: 2.2,
};

/**
 * Creates a procedural canvas label for axis markings (e.g. "+2.0%", "12:00")
 */
export function createTextLabelTexture(
  text: string,
  color = '#94a3b8',
  fontSize = 36,
  bgColor?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.roundRect ? ctx.roundRect(4, 4, 248, 88, 12) : ctx.rect(4, 4, 248, 88);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.font = `600 ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates the 3D Grid floor, axes, time markers, and baseline plane.
 */
export function createGraphGrid(layout = DEFAULT_LAYOUT): THREE.Group {
  const gridGroup = new THREE.Group();
  gridGroup.name = 'GraphGridGroup';

  const xSpan = layout.xMax - layout.xMin;
  const zSpan = 14.0;

  // 1. Floor grid ground plate
  const floorGeo = new THREE.PlaneGeometry(xSpan + 10, zSpan + 4);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050811,
    metalness: 0.9,
    roughness: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.0;
  floor.receiveShadow = true;
  gridGroup.add(floor);

  // 2. Coordinate Grid Lines on the floor
  const gridHelper = new THREE.GridHelper(28, 28, 0x1e293b, 0x0f172a);
  gridHelper.position.y = 0.01;
  gridGroup.add(gridHelper);

  // 3. Baseline (0.0% Return) plane and glowing line
  const baseLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(layout.xMin - 1.0, layout.yBase, 0),
    new THREE.Vector3(layout.xMax + 1.0, layout.yBase, 0),
  ]);
  const baseLineMat = new THREE.LineBasicMaterial({
    color: 0x475569,
    transparent: true,
    opacity: 0.8,
  });
  const baseLine = new THREE.Line(baseLineGeo, baseLineMat);
  gridGroup.add(baseLine);

  // 0.0% semi-transparent reference plane across X and Z
  const basePlaneGeo = new THREE.PlaneGeometry(xSpan + 2, 8.0);
  const basePlaneMat = new THREE.MeshBasicMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const basePlane = new THREE.Mesh(basePlaneGeo, basePlaneMat);
  basePlane.rotation.x = Math.PI / 2;
  basePlane.position.set((layout.xMin + layout.xMax) / 2, layout.yBase, 0);
  gridGroup.add(basePlane);

  // 4. Return Level Tick Planes & Labels (+3%, +2%, +1%, 0%, -1%, -2%)
  const returnTicks = [-2, -1, 0, 1, 2, 3];
  returnTicks.forEach((pct) => {
    const yPos = layout.yBase + pct * layout.yScale;

    // Horizontal dashed guide line
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(layout.xMin - 0.5, yPos, -layout.zSeparation * 1.5),
      new THREE.Vector3(layout.xMax + 0.5, yPos, -layout.zSeparation * 1.5),
    ]);
    const tickMat = new THREE.LineDashedMaterial({
      color: pct === 0 ? 0x94a3b8 : 0x1e293b,
      dashSize: 0.4,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.6,
    });
    const tickLine = new THREE.Line(tickGeo, tickMat);
    tickLine.computeLineDistances();
    gridGroup.add(tickLine);

    // Label texture on a billboard quad
    const labelTex = createTextLabelTexture(
      `${pct > 0 ? '+' : ''}${pct}.0%`,
      pct === 0 ? '#cbd5e1' : pct > 0 ? '#34d399' : '#f87171',
      32
    );
    const labelGeo = new THREE.PlaneGeometry(1.6, 0.6);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.set(layout.xMin - 1.2, yPos, -layout.zSeparation * 1.5);
    gridGroup.add(labelMesh);
  });

  // 5. Time Markers on X axis (09:30, 11:00, 12:30, 14:00, 15:30, 16:00)
  const timeLabels = [
    { ratio: 0.0, text: '09:30 Open' },
    { ratio: 0.23, text: '11:00' },
    { ratio: 0.46, text: '12:30' },
    { ratio: 0.69, text: '14:00' },
    { ratio: 0.88, text: '15:15' },
    { ratio: 1.0, text: '16:00 Close' },
  ];

  timeLabels.forEach(({ ratio, text }) => {
    const xPos = layout.xMin + ratio * (layout.xMax - layout.xMin);

    // Vertical column marker
    const colGeo = new THREE.CylinderGeometry(0.015, 0.015, 6.0, 8);
    const colMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35,
    });
    const column = new THREE.Mesh(colGeo, colMat);
    column.position.set(xPos, 3.0, 0);
    gridGroup.add(column);

    // Time label on floor
    const timeTex = createTextLabelTexture(text, '#94a3b8', 30);
    const labelGeo = new THREE.PlaneGeometry(1.8, 0.7);
    const labelMat = new THREE.MeshBasicMaterial({
      map: timeTex,
      transparent: true,
      depthWrite: false,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.set(xPos, 0.02, layout.zSeparation * 1.6);
    gridGroup.add(labelMesh);
  });

  return gridGroup;
}

/**
 * Creates dynamic 3D extruded ribbons and curtains for Bitcoin and S&P 500.
 */
export class DynamicGraphRibbons {
  public root = new THREE.Group();

  // Bitcoin track objects
  public btcRibbonMesh: THREE.Mesh;
  public btcEdgeLine: THREE.Line;
  public btcCurtainMesh: THREE.Mesh;
  public btcHeadPuck: THREE.Group;

  // S&P 500 track objects
  public spxRibbonMesh: THREE.Mesh;
  public spxEdgeLine: THREE.Line;
  public spxCurtainMesh: THREE.Mesh;
  public spxHeadPuck: THREE.Group;

  // Spread delta connection beam
  public spreadBeamMesh: THREE.Line;
  public spreadCurtainMesh: THREE.Mesh;
  public hoverGuideLine: THREE.Line;

  private maxPoints: number;
  private layout: GraphLayoutConfig;

  constructor(maxPoints = 120, layout = DEFAULT_LAYOUT) {
    this.maxPoints = maxPoints;
    this.layout = layout;
    this.root.name = 'DynamicGraphRibbons';

    const ribbonWidth = 0.3;

    // --- BITCOIN RIBBON (Amber / Gold PBR) ---
    const btcRibbonGeo = new THREE.BufferGeometry();
    const btcPositions = new Float32Array(maxPoints * 2 * 3); // 2 vertices per slice
    const btcNormals = new Float32Array(maxPoints * 2 * 3);
    const btcUvs = new Float32Array(maxPoints * 2 * 2);
    const btcIndices: number[] = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      btcIndices.push(v0, v1, v2, v1, v3, v2);
    }
    btcRibbonGeo.setAttribute('position', new THREE.BufferAttribute(btcPositions, 3));
    btcRibbonGeo.setAttribute('normal', new THREE.BufferAttribute(btcNormals, 3));
    btcRibbonGeo.setAttribute('uv', new THREE.BufferAttribute(btcUvs, 2));
    btcRibbonGeo.setIndex(btcIndices);
    btcRibbonGeo.setDrawRange(0, 0);

    const btcRibbonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.18,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
    });
    this.btcRibbonMesh = new THREE.Mesh(btcRibbonGeo, btcRibbonMat);
    this.btcRibbonMesh.castShadow = true;
    this.root.add(this.btcRibbonMesh);

    // Glowing edge line for BTC
    const btcLineGeo = new THREE.BufferGeometry();
    btcLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
    btcLineGeo.setDrawRange(0, 0);
    const btcLineMat = new THREE.LineBasicMaterial({
      color: 0xfef08a,
      linewidth: 2,
    });
    this.btcEdgeLine = new THREE.Line(btcLineGeo, btcLineMat);
    this.root.add(this.btcEdgeLine);

    // Vertical translucent drop curtain for BTC
    const btcCurtainGeo = new THREE.BufferGeometry();
    const btcCurtainPositions = new Float32Array(maxPoints * 2 * 3);
    btcCurtainGeo.setAttribute('position', new THREE.BufferAttribute(btcCurtainPositions, 3));
    btcCurtainGeo.setIndex(btcIndices);
    btcCurtainGeo.setDrawRange(0, 0);
    const btcCurtainMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.btcCurtainMesh = new THREE.Mesh(btcCurtainGeo, btcCurtainMat);
    this.root.add(this.btcCurtainMesh);

    // BTC Active Head Puck
    this.btcHeadPuck = this.createHeadPuck(0xf59e0b, 0xfef08a, 'BTC');
    this.root.add(this.btcHeadPuck);

    // --- S&P 500 RIBBON (Sapphire / Cyan PBR) ---
    const spxRibbonGeo = new THREE.BufferGeometry();
    const spxPositions = new Float32Array(maxPoints * 2 * 3);
    const spxNormals = new Float32Array(maxPoints * 2 * 3);
    const spxUvs = new Float32Array(maxPoints * 2 * 2);
    spxRibbonGeo.setAttribute('position', new THREE.BufferAttribute(spxPositions, 3));
    spxRibbonGeo.setAttribute('normal', new THREE.BufferAttribute(spxNormals, 3));
    spxRibbonGeo.setAttribute('uv', new THREE.BufferAttribute(spxUvs, 2));
    spxRibbonGeo.setIndex(btcIndices);
    spxRibbonGeo.setDrawRange(0, 0);

    const spxRibbonMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.92,
      roughness: 0.22,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
    });
    this.spxRibbonMesh = new THREE.Mesh(spxRibbonGeo, spxRibbonMat);
    this.spxRibbonMesh.castShadow = true;
    this.root.add(this.spxRibbonMesh);

    // Glowing edge line for SPX
    const spxLineGeo = new THREE.BufferGeometry();
    spxLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
    spxLineGeo.setDrawRange(0, 0);
    const spxLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
    });
    this.spxEdgeLine = new THREE.Line(spxLineGeo, spxLineMat);
    this.root.add(this.spxEdgeLine);

    // Vertical translucent drop curtain for SPX
    const spxCurtainGeo = new THREE.BufferGeometry();
    const spxCurtainPositions = new Float32Array(maxPoints * 2 * 3);
    spxCurtainGeo.setAttribute('position', new THREE.BufferAttribute(spxCurtainPositions, 3));
    spxCurtainGeo.setIndex(btcIndices);
    spxCurtainGeo.setDrawRange(0, 0);
    const spxCurtainMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.spxCurtainMesh = new THREE.Mesh(spxCurtainGeo, spxCurtainMat);
    this.root.add(this.spxCurtainMesh);

    // SPX Active Head Puck
    this.spxHeadPuck = this.createHeadPuck(0x0284c7, 0x38bdf8, 'SPX');
    this.root.add(this.spxHeadPuck);

    // Spread connection laser beam between BTC head and SPX head
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      linewidth: 2,
    });
    this.spreadBeamMesh = new THREE.Line(beamGeo, beamMat);
    this.root.add(this.spreadBeamMesh);

    // Spread delta vertical bridge curtain between BTC and SPX
    const spreadCurtainGeo = new THREE.BufferGeometry();
    const spreadPositions = new Float32Array(maxPoints * 2 * 3);
    spreadCurtainGeo.setAttribute('position', new THREE.BufferAttribute(spreadPositions, 3));
    spreadCurtainGeo.setIndex(btcIndices);
    spreadCurtainGeo.setDrawRange(0, 0);
    const spreadCurtainMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.spreadCurtainMesh = new THREE.Mesh(spreadCurtainGeo, spreadCurtainMat);
    this.root.add(this.spreadCurtainMesh);

    // Hover vertical laser guide line
    const hoverGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 8, 0),
    ]);
    const hoverMat = new THREE.LineBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.8,
    });
    this.hoverGuideLine = new THREE.Line(hoverGeo, hoverMat);
    this.hoverGuideLine.visible = false;
    this.root.add(this.hoverGuideLine);
  }

  /**
   * Creates a multi-part glowing puck for the leading price head.
   */
  private createHeadPuck(primaryColor: number, glowColor: number, label: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `HeadPuck_${label}`;

    // Sphere core
    const sphereGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: glowColor,
      emissiveIntensity: 0.7,
      metalness: 0.9,
      roughness: 0.1,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Orbital ring
    const ringGeo = new THREE.TorusGeometry(0.28, 0.02, 12, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Vertical point light
    const light = new THREE.PointLight(glowColor, 0.8, 3.5);
    group.add(light);

    return group;
  }

  /**
   * Updates geometry buffers based on data points, playback progress (0.0 to 1.0),
   * and display alignment.
   */
  public update(
    points: DataPoint[],
    progress: number,
    alignment: AlignmentMode = 'separated',
    graphMode: GraphMode = 'percentage'
  ) {
    if (points.length < 2) return;

    const visibleCount = Math.max(2, Math.min(points.length, Math.floor(progress * (points.length - 1)) + 1));
    const ribbonHalfWidth = 0.16;

    const zBtc = alignment === 'separated' ? -this.layout.zSeparation : -0.25;
    const zSpx = alignment === 'separated' ? this.layout.zSeparation : 0.25;

    const btcPos = this.btcRibbonMesh.geometry.attributes.position.array as Float32Array;
    const btcCurtainPos = this.btcCurtainMesh.geometry.attributes.position.array as Float32Array;
    const btcLinePos = this.btcEdgeLine.geometry.attributes.position.array as Float32Array;

    const spxPos = this.spxRibbonMesh.geometry.attributes.position.array as Float32Array;
    const spxCurtainPos = this.spxCurtainMesh.geometry.attributes.position.array as Float32Array;
    const spxLinePos = this.spxEdgeLine.geometry.attributes.position.array as Float32Array;

    const spreadPos = this.spreadCurtainMesh.geometry.attributes.position.array as Float32Array;

    let lastBtcVec = new THREE.Vector3();
    let lastSpxVec = new THREE.Vector3();

    for (let i = 0; i < visibleCount; i++) {
      const pt = points[i];
      const ratio = i / (points.length - 1);
      const x = this.layout.xMin + ratio * (this.layout.xMax - this.layout.xMin);

      // Y calculations based on percentage return
      const yBtc = this.layout.yBase + pt.btcChangePct * this.layout.yScale;
      const ySpx = this.layout.yBase + pt.spxChangePct * this.layout.yScale;

      // 1. BTC Ribbon (2 vertices: left and right of ribbon width)
      const vIdx = i * 2 * 3;
      btcPos[vIdx] = x;
      btcPos[vIdx + 1] = yBtc;
      btcPos[vIdx + 2] = zBtc - ribbonHalfWidth;

      btcPos[vIdx + 3] = x;
      btcPos[vIdx + 4] = yBtc;
      btcPos[vIdx + 5] = zBtc + ribbonHalfWidth;

      // BTC Curtain (drop from yBtc to yBase)
      btcCurtainPos[vIdx] = x;
      btcCurtainPos[vIdx + 1] = yBtc;
      btcCurtainPos[vIdx + 2] = zBtc;

      btcCurtainPos[vIdx + 3] = x;
      btcCurtainPos[vIdx + 4] = this.layout.yBase;
      btcCurtainPos[vIdx + 5] = zBtc;

      // BTC Edge line
      const lineIdx = i * 3;
      btcLinePos[lineIdx] = x;
      btcLinePos[lineIdx + 1] = yBtc + 0.02;
      btcLinePos[lineIdx + 2] = zBtc;

      // 2. SPX Ribbon
      spxPos[vIdx] = x;
      spxPos[vIdx + 1] = ySpx;
      spxPos[vIdx + 2] = zSpx - ribbonHalfWidth;

      spxPos[vIdx + 3] = x;
      spxPos[vIdx + 4] = ySpx;
      spxPos[vIdx + 5] = zSpx + ribbonHalfWidth;

      // SPX Curtain
      spxCurtainPos[vIdx] = x;
      spxCurtainPos[vIdx + 1] = ySpx;
      spxCurtainPos[vIdx + 2] = zSpx;

      spxCurtainPos[vIdx + 3] = x;
      spxCurtainPos[vIdx + 4] = this.layout.yBase;
      spxCurtainPos[vIdx + 5] = zSpx;

      // SPX Edge line
      spxLinePos[lineIdx] = x;
      spxLinePos[lineIdx + 1] = ySpx + 0.02;
      spxLinePos[lineIdx + 2] = zSpx;

      // 3. Spread curtain between BTC and SPX
      spreadPos[vIdx] = x;
      spreadPos[vIdx + 1] = yBtc;
      spreadPos[vIdx + 2] = zBtc;

      spreadPos[vIdx + 3] = x;
      spreadPos[vIdx + 4] = ySpx;
      spreadPos[vIdx + 5] = zSpx;

      if (i === visibleCount - 1) {
        lastBtcVec.set(x, yBtc, zBtc);
        lastSpxVec.set(x, ySpx, zSpx);
      }
    }

    // Set draw ranges
    const triCount = (visibleCount - 1) * 6;
    this.btcRibbonMesh.geometry.setDrawRange(0, triCount);
    this.btcCurtainMesh.geometry.setDrawRange(0, triCount);
    this.btcEdgeLine.geometry.setDrawRange(0, visibleCount);

    this.spxRibbonMesh.geometry.setDrawRange(0, triCount);
    this.spxCurtainMesh.geometry.setDrawRange(0, triCount);
    this.spxEdgeLine.geometry.setDrawRange(0, visibleCount);

    this.spreadCurtainMesh.geometry.setDrawRange(0, triCount);

    // Flag updates
    this.btcRibbonMesh.geometry.attributes.position.needsUpdate = true;
    this.btcCurtainMesh.geometry.attributes.position.needsUpdate = true;
    this.btcEdgeLine.geometry.attributes.position.needsUpdate = true;
    this.btcRibbonMesh.geometry.computeVertexNormals();

    this.spxRibbonMesh.geometry.attributes.position.needsUpdate = true;
    this.spxCurtainMesh.geometry.attributes.position.needsUpdate = true;
    this.spxEdgeLine.geometry.attributes.position.needsUpdate = true;
    this.spxRibbonMesh.geometry.computeVertexNormals();

    this.spreadCurtainMesh.geometry.attributes.position.needsUpdate = true;

    // Update Head puck positions
    this.btcHeadPuck.position.copy(lastBtcVec);
    this.spxHeadPuck.position.copy(lastSpxVec);

    // Update connecting spread beam
    const beamPositions = this.spreadBeamMesh.geometry.attributes.position.array as Float32Array;
    beamPositions[0] = lastBtcVec.x;
    beamPositions[1] = lastBtcVec.y;
    beamPositions[2] = lastBtcVec.z;
    beamPositions[3] = lastSpxVec.x;
    beamPositions[4] = lastSpxVec.y;
    beamPositions[5] = lastSpxVec.z;
    this.spreadBeamMesh.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Sets hover guide beam position
   */
  public setHoverGuide(x: number | null, yBtc?: number, ySpx?: number, zBtc?: number, zSpx?: number) {
    if (x === null || yBtc === undefined || ySpx === undefined) {
      this.hoverGuideLine.visible = false;
      return;
    }
    this.hoverGuideLine.visible = true;
    const pos = this.hoverGuideLine.geometry.attributes.position.array as Float32Array;
    pos[0] = x;
    pos[1] = Math.min(yBtc, ySpx) - 0.5;
    pos[2] = 0;

    pos[3] = x;
    pos[4] = Math.max(yBtc, ySpx) + 0.8;
    pos[5] = 0;
    this.hoverGuideLine.geometry.attributes.position.needsUpdate = true;
  }

  public dispose() {
    this.btcRibbonMesh.geometry.dispose();
    (this.btcRibbonMesh.material as THREE.Material).dispose();
    this.btcEdgeLine.geometry.dispose();
    (this.btcEdgeLine.material as THREE.Material).dispose();
    this.btcCurtainMesh.geometry.dispose();
    (this.btcCurtainMesh.material as THREE.Material).dispose();

    this.spxRibbonMesh.geometry.dispose();
    (this.spxRibbonMesh.material as THREE.Material).dispose();
    this.spxEdgeLine.geometry.dispose();
    (this.spxEdgeLine.material as THREE.Material).dispose();
    this.spxCurtainMesh.geometry.dispose();
    (this.spxCurtainMesh.material as THREE.Material).dispose();

    this.spreadCurtainMesh.geometry.dispose();
    (this.spreadCurtainMesh.material as THREE.Material).dispose();
    this.spreadBeamMesh.geometry.dispose();
    (this.spreadBeamMesh.material as THREE.Material).dispose();
    this.hoverGuideLine.geometry.dispose();
    (this.hoverGuideLine.material as THREE.Material).dispose();
  }
}
