import * as THREE from 'three';

/**
 * Creates a procedural radial soft shadow texture using HTML5 Canvas.
 * No external images needed.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a procedural canvas texture for the Bitcoin "₿" coin face.
 */
function createBitcoinFaceTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Radial brushed gold background
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(0.5, '#f59e0b');
  grad.addColorStop(0.85, '#d97706');
  grad.addColorStop(1, '#92400e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Subtle circular concentric micro-grooves
  ctx.lineWidth = 1.5;
  for (let r = 50; r < 220; r += 12) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${r % 24 === 0 ? 0.2 : 0.08})`;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Outer border ring
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.stroke();

  // Embossed Bitcoin symbol "₿"
  ctx.font = 'bold 230px monospace, "Courier New", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Emboss shadow
  ctx.fillStyle = 'rgba(120, 53, 15, 0.85)';
  ctx.fillText('₿', size / 2 + 5, size / 2 + 7);

  // Main bright face
  ctx.fillStyle = '#ffffff';
  ctx.fillText('₿', size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a procedural canvas texture for the S&P 500 Monument plate.
 */
function createSP500PlateTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark obsidian with blue rim gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#0284c7');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  // Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 90px "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S&P', size / 2, size * 0.38);

  ctx.font = '900 110px "Arial", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('500', size / 2, size * 0.64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Hero Procedural Model 1: Bitcoin 3D Token & Hologram Base
 * Composed of 8 distinct parts across primary silhouette, secondary read, and accent details.
 */
export function createBitcoinHeroToken(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'BitcoinHeroToken';

  // Part 1: Outer beveled coin rim (gold, high metalness)
  const rimGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.18, 48);
  const goldMetalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.92,
    roughness: 0.18,
  });
  const rimMesh = new THREE.Mesh(rimGeo, goldMetalMat);
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  rimMesh.position.y = 1.6;
  rimMesh.rotation.x = Math.PI * 0.15; // tilted slightly for cinematic perspective
  root.add(rimMesh);

  // Part 2: Inner recessed face with embossed ₿ procedural texture
  const faceTexture = createBitcoinFaceTexture();
  const faceGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.2, 36);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    metalness: 0.85,
    roughness: 0.25,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0, 0);
  rimMesh.add(faceMesh);

  // Part 3: Radial edge notched teeth (secondary accent)
  const notchGeo = new THREE.BoxGeometry(0.04, 0.2, 0.06);
  const notchMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    metalness: 0.95,
    roughness: 0.12,
  });
  const notchGroup = new THREE.Group();
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(Math.cos(angle) * 1.205, 0, Math.sin(angle) * 1.205);
    notch.rotation.y = -angle;
    notchGroup.add(notch);
  }
  rimMesh.add(notchGroup);

  // Part 4: Cybernetic floating orbital halo ring
  const ringGeo = new THREE.TorusGeometry(1.6, 0.035, 16, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
  });
  const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
  orbitalRing.name = 'BtcOrbitalRing';
  orbitalRing.rotation.x = Math.PI * 0.45;
  orbitalRing.position.y = 1.6;
  root.add(orbitalRing);

  // Part 5: Secondary inner orbit ring with offset angle
  const ringGeo2 = new THREE.TorusGeometry(1.4, 0.02, 16, 48);
  const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xb45309,
    emissiveIntensity: 0.4,
    metalness: 0.9,
    roughness: 0.2,
  });
  const orbitalRing2 = new THREE.Mesh(ringGeo2, ringMat2);
  orbitalRing2.name = 'BtcOrbitalRing2';
  orbitalRing2.rotation.y = Math.PI * 0.3;
  orbitalRing2.position.y = 1.6;
  root.add(orbitalRing2);

  // Part 6: Hexagonal pedestal plinth base (grounded at bottom-center)
  const baseGeo = new THREE.CylinderGeometry(1.3, 1.5, 0.35, 6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.4,
  });
  const pedestal = new THREE.Mesh(baseGeo, baseMat);
  pedestal.position.y = 0.175;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  root.add(pedestal);

  // Part 7: Illuminated energy column / laser riser
  const columnGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.25,
    metalness: 0.7,
    roughness: 0.3,
  });
  const column = new THREE.Mesh(columnGeo, columnMat);
  column.position.y = 0.85;
  root.add(column);

  // Part 8: Soft radial contact shadow plane flush with ground
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.005;
  root.add(shadowPlane);

  return root;
}

/**
 * Hero Procedural Model 2: S&P 500 Index Monument
 * Composed of 8 distinct parts across primary silhouette, secondary read, and accent details.
 */
export function createSP500HeroMonument(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'SP500HeroMonument';

  // Part 1: Stepped tiered plinth base (grounded at bottom-center)
  const tier1Geo = new THREE.BoxGeometry(2.4, 0.25, 2.4);
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.25,
  });
  const tier1 = new THREE.Mesh(tier1Geo, obsidianMat);
  tier1.position.y = 0.125;
  tier1.castShadow = true;
  tier1.receiveShadow = true;
  root.add(tier1);

  const tier2Geo = new THREE.BoxGeometry(2.0, 0.2, 2.0);
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const tier2 = new THREE.Mesh(tier2Geo, titaniumMat);
  tier2.position.y = 0.35;
  tier2.castShadow = true;
  root.add(tier2);

  // Part 2: Monolithic crystal obelisk (Primary silhouette)
  const obeliskGeo = new THREE.CylinderGeometry(0.65, 0.95, 2.2, 4);
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.25,
    metalness: 0.3,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const obelisk = new THREE.Mesh(obeliskGeo, crystalMat);
  obelisk.position.y = 1.55;
  obelisk.rotation.y = Math.PI / 4;
  obelisk.castShadow = true;
  root.add(obelisk);

  // Part 3: Pyramidal capstone tip
  const capGeo = new THREE.ConeGeometry(0.65, 0.6, 4);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    metalness: 0.95,
    roughness: 0.1,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 2.95;
  cap.rotation.y = Math.PI / 4;
  root.add(cap);

  // Part 4: Blue anodized corner bracket clamps
  const bracketGeo = new THREE.BoxGeometry(0.12, 1.8, 0.12);
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.95,
    roughness: 0.15,
  });
  const corners = [
    [-0.65, -0.65], [0.65, -0.65],
    [-0.65, 0.65], [0.65, 0.65]
  ];
  corners.forEach(([x, z]) => {
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.set(x * 0.9, 1.5, z * 0.9);
    root.add(bracket);
  });

  // Part 5: 5 horizontal strata rings (representing 500 companies in 5 tiers)
  const ringGeo = new THREE.TorusGeometry(0.9, 0.025, 12, 36);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
  });
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.8 + i * 0.38;
    ring.scale.setScalar(1.0 - i * 0.06);
    root.add(ring);
  }

  // Part 6: Embossed "S&P 500" emblem badge plate
  const plateTex = createSP500PlateTexture();
  const plateGeo = new THREE.PlaneGeometry(0.7, 0.7);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    metalness: 0.7,
    roughness: 0.3,
  });
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.position.set(0, 1.5, 0.7);
  root.add(plateMesh);

  // Part 7: Vertical cyan laser beacon column projecting upward
  const beaconGeo = new THREE.CylinderGeometry(0.04, 0.04, 5.0, 12);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 5.2;
  root.add(beacon);

  // Part 8: Soft radial contact shadow plane flush with ground
  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(4.0, 4.0);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.005;
  root.add(shadowPlane);

  return root;
}
