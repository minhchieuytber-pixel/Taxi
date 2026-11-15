import * as THREE from 'three';
import { CityMapData, OwnedVehicleState, VehicleSpec } from '../types/game';

export type TrafficVehicleType = 'sedan' | 'hatchback' | 'suv' | 'truck' | 'container';

export interface CarRig {
  group: THREE.Group;
  bodyMesh: THREE.Object3D;
  wheelPivots: THREE.Group[]; // [FL, FR, RL, RR] - front pivots steer
  wheelSpinners: THREE.Group[]; // [FL, FR, RL, RR] - spin around X
  brakeLightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  leftSignalMat: THREE.MeshStandardMaterial;
  rightSignalMat: THREE.MeshStandardMaterial;
  headlightSpotL: THREE.SpotLight | null;
  headlightSpotR: THREE.SpotLight | null;
}

export interface PoliceRig {
  group: THREE.Group;
  redBeaconMat: THREE.MeshStandardMaterial;
  blueBeaconMat: THREE.MeshStandardMaterial;
}

export interface TrafficLightNodeRig {
  nodeId: string;
  x: number;
  z: number;
  nsRed: THREE.MeshStandardMaterial;
  nsYellow: THREE.MeshStandardMaterial;
  nsGreen: THREE.MeshStandardMaterial;
  ewRed: THREE.MeshStandardMaterial;
  ewYellow: THREE.MeshStandardMaterial;
  ewGreen: THREE.MeshStandardMaterial;
}

export interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CitySceneAssets {
  root: THREE.Group;
  trafficLights: TrafficLightNodeRig[];
  colliders: BuildingCollider[];
  buildingWindowMats: THREE.MeshStandardMaterial[];
  streetLampMats: THREE.MeshStandardMaterial[];
  roadMaterial: THREE.MeshStandardMaterial;
  updateTrafficTimers: (
    nsState: 'green' | 'yellow' | 'red',
    nsSec: number,
    ewState: 'green' | 'yellow' | 'red',
    ewSec: number
  ) => void;
  dispose: () => void;
}

function createAsphaltTexture(
  maxAnisotropy: number,
  variant: 'six_lane' | 'four_lane' | 'two_lane' | 'alley' = 'two_lane'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = variant === 'six_lane' ? 512 : 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;

  ctx.fillStyle = variant === 'alley' ? '#3f4652' : '#22262e';
  ctx.fillRect(0, 0, W, 256);

  // Subtle asphalt / concrete grain
  const grainCount = variant === 'six_lane' ? 5200 : 3000;
  for (let i = 0; i < grainCount; i++) {
    const x = Math.random() * W;
    const y = Math.random() * 256;
    const base = variant === 'alley' ? 54 : 28;
    const v = base + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  if (variant === 'alley') {
    // Concrete expansion seams for narrow Vietnamese alleys (ngõ / hẻm)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(0, 126, W, 3);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.fillRect(4, 0, 3, 256);
    ctx.fillRect(W - 7, 0, 3, 256);
  } else {
    // Bright white edge lines separating roadway from curb
    ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.fillRect(6, 0, 6, 256);
    ctx.fillRect(W - 12, 0, 6, 256);

    if (variant === 'six_lane') {
      // Double solid yellow median divider at center
      ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.fillRect(W / 2 - 9, 0, 6, 256);
      ctx.fillRect(W / 2 + 3, 0, 6, 256);
      // 2 dashed white lane dividers on each side (6 lanes total)
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      const laneXs = [90, 170, W - 170, W - 90];
      for (let y = 10; y < 256; y += 64) {
        for (const lx of laneXs) {
          ctx.fillRect(lx - 2, y, 4, 30);
        }
      }
    } else if (variant === 'four_lane') {
      // Double solid yellow median divider
      ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.fillRect(120, 0, 5, 256);
      ctx.fillRect(131, 0, 5, 256);
      // Dashed white lane dividers
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      for (let y = 10; y < 256; y += 64) {
        ctx.fillRect(63, y, 4, 30);
        ctx.fillRect(189, y, 4, 30);
      }
    } else {
      // Dashed yellow center divider
      ctx.fillStyle = 'rgba(250, 204, 21, 0.92)';
      for (let y = 12; y < 256; y += 64) {
        ctx.fillRect(125, y, 6, 34);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSidewalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Light warm urban stone paving tiles (vỉa hè lát gạch)
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  const tile = 32;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const shade = ((x / tile + y / tile) % 2 === 0) ? '#d5dde6' : '#c4cedb';
      ctx.fillStyle = shade;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  // Subtle tile grout lines
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += tile) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createRoadArrowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 256);

  // Crisp white painted one-way street arrow
  ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.beginPath();
  ctx.moveTo(64, 18);
  ctx.lineTo(110, 98);
  ctx.lineTo(80, 98);
  ctx.lineTo(80, 236);
  ctx.lineTo(48, 236);
  ctx.lineTo(48, 98);
  ctx.lineTo(18, 98);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSignTexture(
  kind: 'speed' | 'one_way' | 'no_entry' | 'traffic_light' | 'ped_cross' | 'no_parking' | 'speed_cam',
  value?: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  if (kind === 'speed') {
    // Biển P.127: Giới hạn tốc độ tối đa
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 112px "Chakra Petch", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value ?? 50), 128, 134);
  } else if (kind === 'no_entry') {
    // Biển P.102: Cấm đi ngược chiều
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(46, 106, 164, 44);
  } else if (kind === 'one_way') {
    // Biển I.407a: Đường một chiều
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(10, 10, 236, 236);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(16, 16, 224, 224);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(128, 44);
    ctx.lineTo(188, 118);
    ctx.lineTo(148, 118);
    ctx.lineTo(148, 210);
    ctx.lineTo(108, 210);
    ctx.lineTo(108, 118);
    ctx.lineTo(68, 118);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'no_parking') {
    // Biển P.130: Cấm dừng và đỗ xe
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4ed8';
    ctx.fill();
    ctx.lineWidth = 24;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(54, 54);
    ctx.lineTo(202, 202);
    ctx.moveTo(202, 54);
    ctx.lineTo(54, 202);
    ctx.stroke();
  } else if (kind === 'traffic_light' || kind === 'ped_cross') {
    // Biển nguy hiểm tam giác viền đỏ nền vàng (W.209 / W.224)
    ctx.beginPath();
    ctx.moveTo(128, 20);
    ctx.lineTo(238, 222);
    ctx.lineTo(18, 222);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.lineWidth = 22;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    if (kind === 'traffic_light') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(106, 92, 44, 108);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(128, 114, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(128, 146, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(128, 178, 11, 0, Math.PI * 2); ctx.fill();
    } else {
      // Pedestrian crossing silhouette
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(128, 106, 12, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(128, 120);
      ctx.lineTo(124, 160);
      ctx.lineTo(106, 196);
      ctx.moveTo(124, 160);
      ctx.lineTo(148, 196);
      ctx.moveTo(104, 144);
      ctx.lineTo(128, 128);
      ctx.lineTo(152, 148);
      ctx.stroke();
    }
  } else {
    // Biển chỉ dẫn Camera Phạt Nguội
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(10, 42, 236, 172);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(16, 48, 224, 160);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAMERA', 128, 108);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PHẠT NGUỘI', 128, 152);
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ĐO TỐC ĐỘ', 128, 186);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBuildingFacadeTexture(
  baseColor: string,
  windowLitColor: string,
  rows: number,
  cols: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle vertical pilasters
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(0, 0, 12, 512);
  ctx.fillRect(244, 0, 12, 512);

  const padX = 24;
  const padY = 26;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (512 - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + cellW * 0.16;
      const wy = padY + r * cellH + cellH * 0.18;
      const ww = cellW * 0.68;
      const wh = cellH * 0.62;

      const isLit = Math.random() > 0.42;
      ctx.fillStyle = isLit ? windowLitColor : '#1e293b';
      ctx.fillRect(wx, wy, ww, wh);

      // Window frame
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, ww, wh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTaxiRoofTexture(label: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 96);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 88);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 52px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLicensePlateTexture(text = '29E-888.88', bgHex = '#facc15'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 128, 48);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 44);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 25);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContainerCorrugationTexture(baseColorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 12) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, 0, 4, 128);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 5, 0, 3, 128);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VIETLOGISTICS', 128, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a beveled 3D body hull from 2D side-profile [z, y] points.
 * (-z = front nose, +z = rear tail, y = height above ground).
 */
function createCarHullGeo(
  pts: Array<[number, number]>,
  width: number,
  bevelSize = 0.06,
  bevelThickness = 0.08
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();

  const innerDepth = Math.max(0.2, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 2,
    curveSegments: 6
  });
  geo.translate(0, 0, -innerDepth * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function buildStyledWheel(
  radius: number,
  width: number,
  tireMat: THREE.Material,
  rimMat: THREE.Material,
  darkHubMat: THREE.Material,
  spokeCount = 5
): THREE.Group {
  const spinner = new THREE.Group();
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;

  const barrelGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.015, 16);
  barrelGeo.rotateZ(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, darkHubMat);

  const outerLipGeo = new THREE.CylinderGeometry(radius * 0.68, radius * 0.68, width + 0.025, 16, 1, true);
  outerLipGeo.rotateZ(Math.PI / 2);
  const outerLip = new THREE.Mesh(outerLipGeo, rimMat);

  const hubGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, rimMat);

  spinner.add(tire, barrel, outerLip, hub);

  const spokeGeo = new THREE.BoxGeometry(width + 0.03, radius * 0.54, radius * 0.12);
  for (let s = 0; s < spokeCount; s++) {
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    const a = (s / spokeCount) * Math.PI * 2;
    spoke.rotation.x = a;
    spoke.position.set(0, Math.cos(a) * radius * 0.34, Math.sin(a) * radius * 0.34);
    spinner.add(spoke);
  }
  return spinner;
}

export function buildPlayerCarMesh(
  spec: VehicleSpec,
  state: OwnedVehicleState,
  enableLights: boolean
): CarRig {
  const group = new THREE.Group();
  const sprungBody = new THREE.Group();
  group.add(sprungBody);

  const { width, length, height } = spec.dimensions;
  const paintColor = state.appearance.color || spec.defaultColor;
  const halfL = length * 0.5;
  const isSuvOrMpv = spec.bodyStyle === 'ev_suv' || spec.bodyStyle === 'mpv' || spec.bodyStyle === 'luxury_suv';
  const isHatch = spec.bodyStyle === 'hatchback';
  const isMpv = spec.bodyStyle === 'mpv';
  const isLuxurySedan = spec.bodyStyle === 'luxury_sedan';
  const isVinfast = spec.id.includes('vinfast');
  const isMercedes = spec.id === 'mercedes_e300';
  const isXpander = spec.id === 'mitsubishi_xpander';
  const isCamry = spec.id === 'toyota_camry';
  const isVios = spec.id === 'toyota_vios';
  const isMorning = spec.id === 'kia_morning';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(paintColor),
    metalness: 0.45,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.22,
    roughness: 0.68
  });

  const blackGlossMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.35,
    roughness: 0.16,
    clearcoat: 0.9
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.94,
    roughness: 0.12
  });

  const tintOpacity = 0.78 + state.appearance.windowTint * 0.08;
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1322,
    metalness: 0.15,
    roughness: 0.06,
    clearcoat: 1.0,
    transparent: true,
    opacity: Math.min(0.95, tintOpacity)
  });

  // Ground clearance & proportions tuned to real-world car classes
  const sillY = isSuvOrMpv ? 0.32 : 0.25;
  const beltY = isSuvOrMpv ? height * 0.62 : height * 0.57;
  const hoodY = isSuvOrMpv ? height * 0.59 : isLuxurySedan ? height * 0.53 : height * 0.54;
  const roofY = height * 0.98;
  const frontOverhang = -halfL + 0.06;
  const rearOverhang = halfL - 0.06;

  // 1. Sculpted Beveled Lower Body Hull (real-world car nose, hood slope, trunk/tailgate deck)
  const hullPts: Array<[number, number]> = isHatch
    ? [
        [frontOverhang + 0.06, sillY + 0.04],
        [frontOverhang, sillY + 0.26],
        [-halfL * 0.84, hoodY - 0.06],
        [-halfL * 0.44, hoodY + 0.04],
        [rearOverhang - 0.08, beltY + 0.04],
        [rearOverhang, sillY + 0.22],
        [rearOverhang - 0.06, sillY + 0.04]
      ]
    : isSuvOrMpv
    ? [
        [frontOverhang + 0.08, sillY + 0.04],
        [frontOverhang, sillY + 0.32],
        [-halfL * 0.88, hoodY - 0.04],
        [-halfL * 0.4, hoodY + 0.05],
        [rearOverhang - 0.06, beltY + 0.06],
        [rearOverhang, sillY + 0.28],
        [rearOverhang - 0.08, sillY + 0.04]
      ]
    : [
        // Sleek Sedan / Executive Fastback
        [frontOverhang + 0.08, sillY + 0.03],
        [frontOverhang, sillY + 0.24],
        [-halfL * 0.86, hoodY - 0.06],
        [-halfL * 0.36, hoodY + 0.04],
        [halfL * 0.66, beltY + 0.03],
        [rearOverhang - 0.04, beltY - 0.04],
        [rearOverhang, sillY + 0.24],
        [rearOverhang - 0.08, sillY + 0.03]
      ];

  const hullGeo = createCarHullGeo(hullPts, width, 0.06, 0.08);
  const hullMesh = new THREE.Mesh(hullGeo, bodyMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  sprungBody.add(hullMesh);

  // 2. Sculpted Greenhouse Cabin + Window Beltline Cutout
  const cabinFrontZ = isHatch ? -halfL * 0.46 : isSuvOrMpv ? -halfL * 0.42 : isLuxurySedan ? -halfL * 0.34 : -halfL * 0.38;
  const roofStartZ = cabinFrontZ + (isLuxurySedan ? 0.56 : 0.44);
  const roofEndZ = isHatch
    ? halfL * 0.66
    : isMpv || spec.id === 'vinfast_vf9'
    ? halfL * 0.74
    : spec.id === 'vinfast_vf6'
    ? halfL * 0.56
    : halfL * 0.38;
  const cabinRearZ = isHatch || isMpv || spec.id === 'vinfast_vf9' ? halfL * 0.88 : halfL * 0.72;

  const cabinPts: Array<[number, number]> = [
    [cabinFrontZ, beltY - 0.02],
    [roofStartZ, roofY],
    [roofEndZ, roofY],
    [cabinRearZ, beltY - 0.01]
  ];
  const cabinW = width * 0.84;
  const cabinGeo = createCarHullGeo(cabinPts, cabinW, 0.04, 0.055);
  const cabinMesh = new THREE.Mesh(cabinGeo, isVinfast ? blackGlossMat : bodyMat);
  cabinMesh.castShadow = true;
  sprungBody.add(cabinMesh);

  // Roof cap matches paint (except floating contrast pillars on VinFast)
  if (isVinfast) {
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW * 0.9, 0.05, Math.max(0.8, roofEndZ - roofStartZ + 0.1)),
      bodyMat
    );
    roofCap.position.set(0, roofY + 0.025, (roofStartZ + roofEndZ) * 0.5);
    sprungBody.add(roofCap);
  }

  // Tinted Recessed Glass Canopy (Windshield, Rear Glass, Side Windows)
  const glassPts: Array<[number, number]> = [
    [cabinFrontZ - 0.025, beltY + 0.03],
    [roofStartZ + 0.03, roofY - 0.05],
    [roofEndZ - 0.03, roofY - 0.05],
    [cabinRearZ + 0.025, beltY + 0.03]
  ];
  const glassGeo = createCarHullGeo(glassPts, cabinW * 0.94, 0.025, 0.035);
  const glassCanopy = new THREE.Mesh(glassGeo, glassMat);
  sprungBody.add(glassCanopy);

  // Side window glass planes + B-pillar dividers for realistic silhouette
  const sideWinZ = (roofStartZ + roofEndZ) * 0.5 + 0.04;
  const sideWinLen = (cabinRearZ - cabinFrontZ) * 0.68;
  const sideWinH = (roofY - beltY) * 0.68;
  const sideGlassBox = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 1.03, sideWinH, sideWinLen), glassMat);
  sideGlassBox.position.set(0, beltY + sideWinH * 0.54, sideWinZ);
  sprungBody.add(sideGlassBox);

  // Black B-pillars + Chrome window beltline (Luxury / Vios / Camry / Mercedes)
  [-1, 1].forEach((side) => {
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, sideWinH + 0.06, 0.11), trimMat);
    bPillar.position.set(side * (cabinW * 0.515), beltY + sideWinH * 0.54, sideWinZ - 0.04);
    sprungBody.add(bPillar);

    if (isLuxurySedan || isVios || isVinfast) {
      const beltTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, sideWinLen + 0.25), chromeMat);
      beltTrim.position.set(side * (width * 0.47), beltY + 0.02, sideWinZ);
      sprungBody.add(beltTrim);
    }

    // Side lower rocker skirt & sculpted door handles
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, length * 0.5), trimMat);
    skirt.position.set(side * (width * 0.49), sillY + 0.04, 0.02);
    sprungBody.add(skirt);

    const handleFront = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.16), chromeMat);
    handleFront.position.set(side * (width * 0.505), beltY - 0.11, -0.2);
    const handleRear = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.16), chromeMat);
    handleRear.position.set(side * (width * 0.505), beltY - 0.11, 0.58);
    sprungBody.add(handleFront, handleRear);
  });

  // Panoramic Glass Sunroof for Luxury / EV / VIP cars
  if (isLuxurySedan || isVinfast) {
    const sunroof = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.68, 0.025, Math.max(0.7, (roofEndZ - roofStartZ) * 0.6)), blackGlossMat);
    sunroof.position.set(0, roofY + 0.04, (roofStartZ + roofEndZ) * 0.5);
    sprungBody.add(sunroof);
  }

  // SUV Silver Roof Rails (Xpander Cross & VF 9)
  if (isMpv || spec.id === 'vinfast_vf9') {
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, (roofEndZ - roofStartZ) * 0.85), chromeMat);
      rail.position.set(side * (cabinW * 0.4), roofY + 0.055, (roofStartZ + roofEndZ) * 0.5);
      sprungBody.add(rail);
    });
  }

  // Aerodynamic Shark-Fin Antenna
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), blackGlossMat);
  fin.rotation.x = -0.35;
  fin.position.set(0, roofY + 0.07, roofEndZ - 0.22);
  sprungBody.add(fin);

  // 3. Wheel Arch Fenders (matte cladding for SUV/MPV, sleek arches for sedans) + Front/Rear Lower Bumpers
  const wheelRadius = isSuvOrMpv ? 0.365 : 0.325;
  const wheelOffsets: Array<[number, number]> = [
    [-width * 0.47, -length * 0.315], // FL
    [width * 0.47, -length * 0.315],  // FR
    [-width * 0.47, length * 0.315],  // RL
    [width * 0.47, length * 0.315]    // RR
  ];
  const archMat = isSuvOrMpv ? trimMat : blackGlossMat;
  for (const [wx, wz] of wheelOffsets) {
    const archGeo = new THREE.TorusGeometry(wheelRadius + 0.075, isSuvOrMpv ? 0.065 : 0.04, 8, 14, Math.PI);
    archGeo.rotateY(Math.PI / 2);
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(wx > 0 ? width * 0.495 : -width * 0.495, wheelRadius + 0.02, wz);
    sprungBody.add(arch);
  }

  // Front & Rear Bumpers + Skid plates
  const frontBumper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.98, 0.15, 0.18),
    isSuvOrMpv ? trimMat : blackGlossMat
  );
  frontBumper.position.set(0, sillY + 0.06, -halfL + 0.06);
  sprungBody.add(frontBumper);

  const rearBumper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.98, 0.16, 0.18),
    isSuvOrMpv ? trimMat : blackGlossMat
  );
  rearBumper.position.set(0, sillY + 0.06, halfL - 0.06);
  sprungBody.add(rearBumper);

  // Dual Chrome Exhaust Tips for ICE Luxury / Sport Sedans (Camry / Mercedes E300)
  if (!spec.isElectric && (isLuxurySedan || isXpander)) {
    [-1, 1].forEach((side) => {
      const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.075, 0.12), chromeMat);
      exhaust.position.set(side * (width * 0.31), sillY + 0.05, halfL - 0.01);
      sprungBody.add(exhaust);
    });
  }

  // 4. Stylized Brand-Specific Front Grille & Lighting Architecture
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: new THREE.Color(0xfef9c3),
    emissiveIntensity: 1.4,
    roughness: 0.1
  });
  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xe0f2fe),
    emissiveIntensity: 1.7,
    roughness: 0.1
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 0.65,
    roughness: 0.18
  });
  const leftSignalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.0,
    roughness: 0.2
  });
  const rightSignalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.0,
    roughness: 0.2
  });

  const lightY = sillY + (isSuvOrMpv ? 0.36 : 0.31);
  const frontZ = -halfL + 0.01;
  const rearZ = halfL - 0.01;

  if (isVinfast) {
    // Signature VinFast glowing V-Wing LED DRL bar on both Front & Rear!
    const vfEmissive = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xe0f2fe),
      emissiveIntensity: 2.2,
      roughness: 0.1
    });
    const badgeV = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.05), chromeMat);
    badgeV.rotation.z = Math.PI / 4;
    badgeV.position.set(0, lightY + 0.02, frontZ - 0.015);
    sprungBody.add(badgeV);

    [-1, 1].forEach((side) => {
      const wingF = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.045, 0.05), vfEmissive);
      wingF.position.set(side * (width * 0.22), lightY + 0.045, frontZ - 0.01);
      wingF.rotation.z = side * 0.11;
      sprungBody.add(wingF);

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.045, 0.05), brakeLightMat);
      wingR.position.set(side * (width * 0.22), lightY + 0.06, rearZ + 0.01);
      wingR.rotation.z = side * 0.1;
      sprungBody.add(wingR);
    });
    const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.14, 0.06), blackGlossMat);
    lowerIntake.position.set(0, sillY + 0.16, frontZ - 0.005);
    sprungBody.add(lowerIntake);
  } else if (isMercedes) {
    // Mercedes AMG: Chrome diamond/vertical-slat grille + 3-Pointed Star badge + twin-eyebrow LEDs
    const mercGrille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.24, 0.06), blackGlossMat);
    mercGrille.position.set(0, lightY - 0.04, frontZ - 0.005);
    const grilleRim = new THREE.Mesh(new THREE.BoxGeometry(width * 0.49, 0.27, 0.04), chromeMat);
    grilleRim.position.set(0, lightY - 0.04, frontZ + 0.004);
    const chromeBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.035, 0.07), chromeMat);
    chromeBar.position.set(0, lightY - 0.04, frontZ - 0.01);
    const starRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 8, 16), chromeMat);
    starRing.position.set(0, lightY - 0.04, frontZ - 0.045);
    sprungBody.add(grilleRim, mercGrille, chromeBar, starRing);
  } else if (isXpander) {
    // Mitsubishi Xpander: Dynamic Shield twin chrome C-bars + bold grille
    const centerGrille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.24, 0.06), blackGlossMat);
    centerGrille.position.set(0, lightY, frontZ - 0.005);
    sprungBody.add(centerGrille);
    [-1, 1].forEach((side) => {
      const cBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.07), chromeMat);
      cBar.position.set(side * (width * 0.26), lightY - 0.04, frontZ - 0.012);
      cBar.rotation.z = side * 0.24;
      sprungBody.add(cBar);
    });
  } else if (isMorning) {
    // Kia Morning: Compact Tiger Nose upper grille + wide smiling lower bumper intake
    const tigerGrille = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.12, 0.06), blackGlossMat);
    tigerGrille.position.set(0, lightY + 0.02, frontZ - 0.008);
    const tigerChrome = new THREE.Mesh(new THREE.BoxGeometry(width * 0.48, 0.145, 0.045), chromeMat);
    tigerChrome.position.set(0, lightY + 0.02, frontZ);
    const lowerSmile = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.14, 0.06), trimMat);
    lowerSmile.position.set(0, sillY + 0.17, frontZ - 0.005);
    sprungBody.add(tigerChrome, tigerGrille, lowerSmile);
  } else {
    // Toyota Vios / Camry / Hyundai i10: Wide sculpted lower air dam + upper chrome badge bar
    const wideMouth = new THREE.Mesh(
      new THREE.BoxGeometry(width * (isCamry ? 0.66 : 0.54), isCamry ? 0.22 : 0.18, 0.06),
      blackGlossMat
    );
    wideMouth.position.set(0, sillY + 0.2, frontZ - 0.006);
    const upperWing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.045, 0.06), chromeMat);
    upperWing.position.set(0, lightY + 0.03, frontZ - 0.012);
    sprungBody.add(wideMouth, upperWing);
  }

  // Swept Headlights, LED DRL Strips, Tail Lights, Turn Signals & Side Mirrors
  [-1, 1].forEach((side) => {
    const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.08), blackGlossMat);
    hlHousing.position.set(side * (width * 0.35), lightY + (isXpander ? -0.05 : 0.01), frontZ + 0.01);
    hlHousing.rotation.y = side * -0.18;
    const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.085, 0.06), headlightMat);
    hlLens.position.set(side * (width * 0.345), lightY + (isXpander ? -0.05 : 0.01), frontZ - 0.012);
    hlLens.rotation.y = side * -0.18;
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.032, 0.05), drlMat);
    drl.position.set(side * (width * 0.355), lightY + (isXpander ? 0.09 : 0.065), frontZ - 0.015);
    drl.rotation.y = side * -0.18;
    sprungBody.add(hlHousing, hlLens, drl);

    // Sculpted rear LED tail-light bar wrapping corner
    const tlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.08), blackGlossMat);
    tlHousing.position.set(side * (width * 0.33), lightY + 0.04, rearZ - 0.01);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.07), brakeLightMat);
    bl.position.set(side * (width * 0.33), lightY + 0.04, rearZ + 0.015);
    sprungBody.add(tlHousing, bl);

    const sigMat = side < 0 ? leftSignalMat : rightSignalMat;
    const sigF = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.08), sigMat);
    sigF.position.set(side * (width * 0.45), lightY - 0.01, frontZ - 0.01);
    const sigR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), sigMat);
    sigR.position.set(side * (width * 0.44), lightY + 0.04, rearZ + 0.018);
    sprungBody.add(sigF, sigR);

    // Aerodynamic Side Mirrors + integrated LED blinker strip
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.06), trimMat);
    mirrorArm.position.set(side * (width * 0.47), beltY + 0.06, cabinFrontZ + 0.14);
    const mirrorCap = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.13), bodyMat);
    mirrorCap.position.set(side * (width * 0.525), beltY + 0.08, cabinFrontZ + 0.16);
    const sigMirror = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.06), sigMat);
    sigMirror.position.set(side * (width * 0.535), beltY + 0.085, cabinFrontZ + 0.11);
    sprungBody.add(mirrorArm, mirrorCap, sigMirror);
  });

  // Vietnamese Golden-Yellow Commercial Taxi Plates (Front & Rear)
  const plateTex = createLicensePlateTexture(spec.isElectric ? '29E-688.88' : '30H-868.68', '#facc15');
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35 });
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.13), plateMat);
  plateF.position.set(0, sillY + 0.15, frontZ - 0.035);
  plateF.rotation.y = Math.PI;
  const plateR = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.13), plateMat);
  plateR.position.set(0, sillY + 0.27, rearZ + 0.025);
  sprungBody.add(plateF, plateR);

  // 5. Aerodynamic Taxi Roof Sign
  const roofLabel =
    state.appearance.roofSign === 'green_ev'
      ? 'XANH TAXI'
      : state.appearance.roofSign === 'led_vip'
      ? 'VIP TAXI'
      : 'TAXI';
  const roofBg =
    state.appearance.roofSign === 'green_ev'
      ? '#06b6d4'
      : state.appearance.roofSign === 'led_vip'
      ? '#0f172a'
      : '#facc15';
  const roofFg = state.appearance.roofSign === 'led_vip' ? '#facc15' : '#0f172a';
  const roofTex = createTaxiRoofTexture(roofLabel, roofBg, roofFg);
  const roofSignMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    emissive: new THREE.Color(roofBg),
    emissiveIntensity: 0.48,
    roughness: 0.22
  });
  const roofPodBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.3), trimMat);
  roofPodBase.position.set(0, roofY + 0.05, (roofStartZ + roofEndZ) * 0.45);
  const roofSign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.21, 0.24), roofSignMat);
  roofSign.position.set(0, roofY + 0.17, (roofStartZ + roofEndZ) * 0.45);
  sprungBody.add(roofPodBase, roofSign);

  // 6. Optional Rear GT / AMG Wing Spoiler
  if (state.appearance.spoiler) {
    const wingY = isHatch || isSuvOrMpv ? roofY + 0.06 : beltY + 0.17;
    const wingZ = isHatch || isSuvOrMpv ? cabinRearZ - 0.08 : rearOverhang - 0.12;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.045, 0.22), blackGlossMat);
    wing.position.set(0, wingY, wingZ);
    wing.rotation.x = 0.08;
    sprungBody.add(wing);
    [-1, 1].forEach((side) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.12), blackGlossMat);
      strut.position.set(side * (width * 0.3), wingY - 0.08, wingZ);
      sprungBody.add(strut);
    });
  }

  // 7. 4 Detailed 5-Spoke Alloy Wheels (Grounded outside sprungBody)
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88, metalness: 0.05 });
  const darkHubMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.55 });
  const rimColor =
    state.appearance.rimStyle === 'amg'
      ? 0x334155
      : state.appearance.rimStyle === 'sport'
      ? 0xf8fafc
      : 0xcbd5e1;
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.92,
    roughness: 0.16
  });

  const wheelPivots: THREE.Group[] = [];
  const wheelSpinners: THREE.Group[] = [];
  for (const [wx, wz] of wheelOffsets) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wheelRadius, wz);
    const spinner = buildStyledWheel(
      wheelRadius,
      0.24,
      tireMat,
      rimMat,
      darkHubMat,
      state.appearance.rimStyle === 'amg' ? 6 : 5
    );
    pivot.add(spinner);
    group.add(pivot);
    wheelPivots.push(pivot);
    wheelSpinners.push(spinner);
  }

  // 8. Real Headlight Spotlights (for night visibility)
  let headlightSpotL: THREE.SpotLight | null = null;
  let headlightSpotR: THREE.SpotLight | null = null;
  if (enableLights) {
    headlightSpotL = new THREE.SpotLight(0xfffbeb, 0, 42, Math.PI / 5, 0.5, 1.4);
    headlightSpotL.position.set(-width * 0.34, lightY, -halfL);
    headlightSpotL.target.position.set(-width * 0.2, 0, -halfL - 18);
    sprungBody.add(headlightSpotL);
    sprungBody.add(headlightSpotL.target);

    headlightSpotR = new THREE.SpotLight(0xfffbeb, 0, 42, Math.PI / 5, 0.5, 1.4);
    headlightSpotR.position.set(width * 0.34, lightY, -halfL);
    headlightSpotR.target.position.set(width * 0.2, 0, -halfL - 18);
    sprungBody.add(headlightSpotR);
    sprungBody.add(headlightSpotR.target);
  }

  // Proportional compact car scale relative to multi-lane & alley roads
  group.scale.setScalar(0.78);

  return {
    group,
    bodyMesh: sprungBody,
    wheelPivots,
    wheelSpinners,
    brakeLightMat,
    headlightMat,
    leftSignalMat,
    rightSignalMat,
    headlightSpotL,
    headlightSpotR
  };
}

export function buildTrafficCarMesh(
  colorHex: number,
  variantOrIsTruck: boolean | TrafficVehicleType = 'sedan'
): THREE.Group {
  const variant: TrafficVehicleType =
    variantOrIsTruck === true ? 'truck' : variantOrIsTruck === false ? 'sedan' : variantOrIsTruck;

  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.26,
    metalness: 0.4,
    clearcoat: 0.9
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72, metalness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.16 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.22 });
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.85 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.8 });

  if (variant === 'container') {
    // Stylized Heavy Tractor Head + 40ft Corrugated ISO Container Semi-Trailer (Xe Container)
    const cabW = 2.15;
    const tractorMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.85
    });
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.5 });

    // 1. Heavy High-Roof Tractor Cab (-Z front: -4.6 to -2.1)
    const cabPts: Array<[number, number]> = [
      [-4.6, 0.42],
      [-4.62, 1.35],
      [-4.45, 2.38],
      [-4.05, 2.86],
      [-2.55, 2.88],
      [-2.52, 0.42]
    ];
    const cabMesh = new THREE.Mesh(createCarHullGeo(cabPts, cabW, 0.05, 0.07), tractorMat);
    cabMesh.castShadow = true;
    g.add(cabMesh);

    // Tractor windshield + grille + bumper + sun visor + twin exhaust stacks
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.86, 0.72, 0.12), glassMat);
    windshield.position.set(0, 2.02, -4.48);
    windshield.rotation.x = 0.2;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(cabW * 0.62, 0.66, 0.08), chromeMat);
    grille.position.set(0, 1.05, -4.62);
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(cabW * 1.02, 0.24, 0.2), trimMat);
    frontBumper.position.set(0, 0.46, -4.62);
    g.add(windshield, grille, frontBumper);

    [-1, 1].forEach((side) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), hlMat);
      hl.position.set(side * (cabW * 0.36), 0.78, -4.63);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.25, 8), chromeMat);
      stack.position.set(side * (cabW * 0.46), 1.95, -2.42);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.14), trimMat);
      mirror.position.set(side * (cabW * 0.57), 1.98, -4.25);
      g.add(hl, stack, mirror);
    });

    // 2. Long Flatbed Gooseneck Trailer Frame (-2.4 to +4.65)
    const frameBeam = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 7.1), chassisMat);
    frameBeam.position.set(0, 0.92, 1.12);
    const landingGear = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.58, 0.2), chassisMat);
    landingGear.position.set(0, 0.54, -1.2);
    g.add(frameBeam, landingGear);

    // 3. Corrugated Shipping Container Box
    const containerPalette = ['#0284c7', '#1e3a8a', '#15803d', '#b91c1c', '#d97706'];
    const cColor = containerPalette[colorHex % containerPalette.length];
    const cTex = createContainerCorrugationTexture(cColor);
    const containerMat = new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.55, metalness: 0.35 });
    const containerBox = new THREE.Mesh(new THREE.BoxGeometry(2.18, 2.18, 6.45), containerMat);
    containerBox.position.set(0, 2.12, 1.42);
    containerBox.castShadow = true;
    containerBox.receiveShadow = true;
    g.add(containerBox);

    // Side amber marker strips & rear red lights on container trailer
    [-1, 1].forEach((side) => {
      const sideGuard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 2.6), trimMat);
      sideGuard.position.set(side * 1.04, 0.58, 0.65);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), tailMat);
      tl.position.set(side * 0.72, 0.88, 4.68);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.16), amberMat);
      marker.position.set(side * 1.1, 1.06, 4.5);
      g.add(sideGuard, tl, marker);
    });

    // 4. Dual-Axle Trailer + Tractor Wheels (4 axles = 8 wheel hubs)
    const wheelZList = [-3.95, -2.55, 2.95, 3.95];
    for (const wz of wheelZList) {
      [-1, 1].forEach((side) => {
        const w = buildStyledWheel(0.42, 0.28, tireMat, rimMat, trimMat, 5);
        w.position.set(side * 1.02, 0.42, wz);
        g.add(w);
      });
    }

    g.scale.setScalar(0.78);
    return g;
  }

  if (variant === 'truck') {
    // Stylized Vietnamese Box Cargo Truck (Hyundai Porter / Kia K200)
    const w = 1.98;
    const cabMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.28, clearcoat: 0.85 });
    const cabPts: Array<[number, number]> = [
      [-2.45, 0.38],
      [-2.48, 1.15],
      [-2.2, 2.12],
      [-1.08, 2.12],
      [-1.05, 0.38]
    ];
    const cab = new THREE.Mesh(createCarHullGeo(cabPts, w * 0.94, 0.04, 0.06), cabMat);
    cab.castShadow = true;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.62, 0.1), glassMat);
    windshield.position.set(0, 1.62, -2.32);
    windshield.rotation.x = 0.28;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 0.28, 0.07), trimMat);
    grille.position.set(0, 0.82, -2.48);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.2, 3.8), trimMat);
    frame.position.set(0, 0.58, 0.5);

    const boxTex = createContainerCorrugationTexture('#e2e8f0');
    const cargoMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.5, metalness: 0.2 });
    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 1.72, 3.35), cargoMat);
    cargoBox.position.set(0, 1.54, 0.85);
    cargoBox.castShadow = true;
    g.add(cab, windshield, grille, frame, cargoBox);

    [-1, 1].forEach((side) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), hlMat);
      hl.position.set(side * (w * 0.35), 0.72, -2.49);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), tailMat);
      tl.position.set(side * (w * 0.36), 0.68, 2.54);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.1), trimMat);
      mirror.position.set(side * (w * 0.55), 1.58, -2.2);
      g.add(hl, tl, mirror);

      const fw = buildStyledWheel(0.36, 0.24, tireMat, rimMat, trimMat, 5);
      fw.position.set(side * (w * 0.47), 0.36, -1.78);
      const rw = buildStyledWheel(0.36, 0.28, tireMat, rimMat, trimMat, 5);
      rw.position.set(side * (w * 0.47), 0.36, 1.55);
      g.add(fw, rw);
    });

    g.scale.setScalar(0.8);
    return g;
  }

  // Stylized Sedan, Hatchback, or SUV
  const isSuv = variant === 'suv';
  const isHatch = variant === 'hatchback';
  const w = isSuv ? 1.98 : isHatch ? 1.82 : 1.9;
  const l = isSuv ? 4.4 : isHatch ? 3.85 : 4.3;
  const h = isSuv ? 1.62 : 1.48;
  const halfL = l * 0.5;
  const sillY = isSuv ? 0.3 : 0.24;
  const beltY = isSuv ? h * 0.6 : h * 0.56;

  const pts: Array<[number, number]> = isHatch
    ? [
        [-halfL + 0.08, sillY + 0.04],
        [-halfL + 0.04, sillY + 0.24],
        [-halfL * 0.8, beltY - 0.04],
        [-halfL * 0.4, beltY + 0.03],
        [halfL - 0.12, beltY + 0.04],
        [halfL - 0.04, sillY + 0.22],
        [halfL - 0.1, sillY + 0.04]
      ]
    : isSuv
    ? [
        [-halfL + 0.08, sillY + 0.04],
        [-halfL + 0.04, sillY + 0.3],
        [-halfL * 0.86, beltY - 0.02],
        [-halfL * 0.38, beltY + 0.04],
        [halfL - 0.1, beltY + 0.05],
        [halfL - 0.04, sillY + 0.26],
        [halfL - 0.1, sillY + 0.04]
      ]
    : [
        [-halfL + 0.08, sillY + 0.04],
        [-halfL + 0.04, sillY + 0.24],
        [-halfL * 0.84, beltY - 0.04],
        [-halfL * 0.36, beltY + 0.03],
        [halfL * 0.65, beltY + 0.03],
        [halfL - 0.05, beltY - 0.05],
        [halfL - 0.04, sillY + 0.22],
        [halfL - 0.1, sillY + 0.04]
      ];

  const hull = new THREE.Mesh(createCarHullGeo(pts, w, 0.05, 0.07), bodyMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);

  const cFront = isHatch ? -halfL * 0.42 : -halfL * 0.36;
  const rStart = cFront + 0.42;
  const rEnd = isHatch || isSuv ? halfL * 0.65 : halfL * 0.36;
  const cRear = isHatch || isSuv ? halfL * 0.86 : halfL * 0.72;
  const cabin = new THREE.Mesh(
    createCarHullGeo(
      [
        [cFront, beltY - 0.01],
        [rStart, h],
        [rEnd, h],
        [cRear, beltY - 0.01]
      ],
      w * 0.84,
      0.035,
      0.05
    ),
    bodyMat
  );
  cabin.castShadow = true;
  const glass = new THREE.Mesh(
    createCarHullGeo(
      [
        [cFront - 0.02, beltY + 0.03],
        [rStart + 0.02, h - 0.05],
        [rEnd - 0.02, h - 0.05],
        [cRear + 0.02, beltY + 0.03]
      ],
      w * 0.79,
      0.02,
      0.035
    ),
    glassMat
  );
  const sideGlass = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.87, (h - beltY) * 0.66, (cRear - cFront) * 0.68),
    glassMat
  );
  sideGlass.position.set(0, beltY + (h - beltY) * 0.38, (rStart + rEnd) * 0.5);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, 0.18, 0.06), trimMat);
  grille.position.set(0, sillY + 0.22, -halfL + 0.02);
  g.add(cabin, glass, sideGlass, grille);

  const wRad = isSuv ? 0.35 : 0.31;
  [-1, 1].forEach((side) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), hlMat);
    hl.position.set(side * (w * 0.34), sillY + 0.28, -halfL + 0.01);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.06), tailMat);
    tl.position.set(side * (w * 0.33), sillY + 0.32, halfL - 0.01);
    g.add(hl, tl);

    const fw = buildStyledWheel(wRad, 0.22, tireMat, rimMat, trimMat, 5);
    fw.position.set(side * (w * 0.47), wRad, -l * 0.31);
    const rw = buildStyledWheel(wRad, 0.22, tireMat, rimMat, trimMat, 5);
    rw.position.set(side * (w * 0.47), wRad, l * 0.31);
    g.add(fw, rw);
  });

  g.scale.setScalar(0.78);
  return g;
}

export function buildPoliceCarMesh(): PoliceRig {
  const group = new THREE.Group();
  const w = 1.94;
  const l = 4.45;
  const h = 1.5;
  const halfL = l * 0.5;

  const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.25, clearcoat: 1.0 });
  const greenStripeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.08, clearcoat: 1.0 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });

  const sillY = 0.25;
  const beltY = 0.84;
  const hull = new THREE.Mesh(
    createCarHullGeo(
      [
        [-halfL + 0.08, sillY + 0.04],
        [-halfL + 0.03, sillY + 0.24],
        [-halfL * 0.84, beltY - 0.04],
        [-halfL * 0.36, beltY + 0.03],
        [halfL * 0.65, beltY + 0.03],
        [halfL - 0.05, beltY - 0.04],
        [halfL - 0.04, sillY + 0.22],
        [halfL - 0.1, sillY + 0.04]
      ],
      w,
      0.05,
      0.07
    ),
    whiteMat
  );
  hull.castShadow = true;
  group.add(hull);

  // CSGT dark-green side livery stripe & hood badge
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.18, l * 0.66), greenStripeMat);
  stripe.position.set(0, 0.62, 0.08);
  const hoodCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), goldMat);
  hoodCrest.position.set(0, 0.83, -halfL * 0.56);
  group.add(stripe, hoodCrest);

  // Cabin + Glass
  const cabin = new THREE.Mesh(
    createCarHullGeo(
      [
        [-halfL * 0.36, beltY - 0.01],
        [-halfL * 0.18, h],
        [halfL * 0.36, h],
        [halfL * 0.72, beltY - 0.01]
      ],
      w * 0.84,
      0.035,
      0.05
    ),
    whiteMat
  );
  const glass = new THREE.Mesh(
    createCarHullGeo(
      [
        [-halfL * 0.38, beltY + 0.03],
        [-halfL * 0.16, h - 0.05],
        [halfL * 0.34, h - 0.05],
        [halfL * 0.74, beltY + 0.03]
      ],
      w * 0.79,
      0.02,
      0.035
    ),
    glassMat
  );
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.87, 0.44, 1.55), glassMat);
  sideGlass.position.set(0, 1.1, 0.18);
  group.add(cabin, glass, sideGlass);

  // Front push-bar bumper + Headlights
  const pushBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, 0.24, 0.16), trimMat);
  pushBar.position.set(0, 0.48, -halfL - 0.04);
  group.add(pushBar);

  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.5 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 });
  [-1, 1].forEach((side) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.07), hlMat);
    hl.position.set(side * (w * 0.34), 0.58, -halfL + 0.01);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.07), tailMat);
    tl.position.set(side * (w * 0.33), 0.62, halfL - 0.01);
    group.add(hl, tl);
  });

  // Aerodynamic Red/Blue LED Roof Lightbar
  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 2.0
  });
  const blueBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: new THREE.Color(0x3b82f6),
    emissiveIntensity: 0.2
  });

  const barCenter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.24), trimMat);
  barCenter.position.set(0, h + 0.08, 0.12);
  const lightbarL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.24), redBeaconMat);
  lightbarL.position.set(-0.34, h + 0.08, 0.12);
  const lightbarR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.24), blueBeaconMat);
  lightbarR.position.set(0.34, h + 0.08, 0.12);
  group.add(barCenter, lightbarL, lightbarR);

  [
    [-w * 0.47, -l * 0.31],
    [w * 0.47, -l * 0.31],
    [-w * 0.47, l * 0.31],
    [w * 0.47, l * 0.31]
  ].forEach(([wx, wz]) => {
    const wheel = buildStyledWheel(0.32, 0.22, tireMat, rimMat, trimMat, 5);
    wheel.position.set(wx, 0.32, wz);
    group.add(wheel);
  });

  group.scale.setScalar(0.78);
  return { group, redBeaconMat, blueBeaconMat };
}

export interface PedestrianRig {
  group: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
}

export function buildMotorbikeNpcMesh(colorHex: number, helmetColorHex: number): THREE.Group {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    roughness: 0.24,
    metalness: 0.4,
    clearcoat: 0.9
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.16 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.68 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const helmetMat = new THREE.MeshPhysicalMaterial({
    color: helmetColorHex,
    roughness: 0.16,
    clearcoat: 1.0
  });
  const headLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.6
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.2
  });

  // Spoked Scooter Wheels + Brake Discs
  const fw = buildStyledWheel(0.24, 0.11, darkMat, chromeMat, darkMat, 5);
  fw.position.set(0, 0.24, -0.64);
  const rw = buildStyledWheel(0.24, 0.13, darkMat, chromeMat, darkMat, 5);
  rw.position.set(0, 0.24, 0.58);
  g.add(fw, rw);

  // Sculpted Scooter / Honda SH-Wave Side Silhouette (Step-through floorboard + tapered apron + upswept tail)
  const scooterProfile: Array<[number, number]> = [
    [-0.64, 0.34],
    [-0.6, 0.88],
    [-0.4, 0.88],
    [-0.36, 0.38],
    [-0.06, 0.36],
    [0.08, 0.7],
    [0.74, 0.78],
    [0.78, 0.54],
    [0.45, 0.34],
    [-0.08, 0.28],
    [-0.36, 0.3]
  ];
  const bodyHull = new THREE.Mesh(createCarHullGeo(scooterProfile, 0.44, 0.03, 0.04), bodyMat);
  bodyHull.castShadow = true;
  g.add(bodyHull);

  // Front mudguard fender + telescopic forks + chrome exhaust pipe
  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.32), bodyMat);
  fender.position.set(0, 0.49, -0.64);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.62, 8), chromeMat);
  exhaust.rotation.x = Math.PI / 2 - 0.14;
  exhaust.position.set(0.19, 0.36, 0.42);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.68), darkMat);
  seat.position.set(0, 0.77, 0.22);
  const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.055, 0.075), darkMat);
  handlebar.position.set(0, 1.06, -0.45);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.07), headLightMat);
  hl.position.set(0, 0.96, -0.58);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.06), tailLightMat);
  tl.position.set(0, 0.7, 0.78);
  g.add(fender, exhaust, seat, handlebar, hl, tl);

  // Twin Rearview Mirrors (Gương chiếu hậu)
  [-1, 1].forEach((side) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), chromeMat);
    stem.position.set(side * 0.28, 1.13, -0.44);
    stem.rotation.z = side * -0.25;
    const mHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.065, 0.03), darkMat);
    mHead.position.set(side * 0.31, 1.2, -0.44);
    g.add(stem, mHead);
  });

  // Rider sitting naturally on scooter
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.22), jacketMat);
  torso.position.set(0, 1.12, 0.15);
  torso.rotation.x = -0.2;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.175, 12, 12), helmetMat);
  head.position.set(0, 1.49, 0.06);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.12), darkMat);
  visor.position.set(0, 1.47, -0.07);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.1), jacketMat);
  armL.position.set(-0.22, 1.08, -0.15);
  armL.rotation.x = 1.08;
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.1), jacketMat);
  armR.position.set(0.22, 1.08, -0.15);
  armR.rotation.x = 1.08;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.13), pantsMat);
  legL.position.set(-0.17, 0.62, -0.12);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.13), pantsMat);
  legR.position.set(0.17, 0.62, -0.12);

  g.add(torso, head, visor, armL, armR, legL, legR);
  g.scale.setScalar(0.84);
  return g;
}

export function buildPedestrianMesh(shirtColorHex: number, pantsColorHex: number): PedestrianRig {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColorHex, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColorHex, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), skinMat);
  head.position.y = 1.54;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 1.56;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.54, 0.22), shirtMat);
  torso.position.y = 1.08;
  torso.castShadow = true;

  const legGeo = new THREE.BoxGeometry(0.14, 0.7, 0.16);
  const armGeo = new THREE.BoxGeometry(0.11, 0.48, 0.11);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.1, 0.78, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.y = -0.35;
  leftLegPivot.add(leftLeg);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.1, 0.78, 0);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.y = -0.35;
  rightLegPivot.add(rightLeg);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.26, 1.3, 0);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.y = -0.22;
  leftArmPivot.add(leftArm);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.26, 1.3, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.y = -0.22;
  rightArmPivot.add(rightArm);

  group.add(head, hair, torso, leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot);
  return { group, leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot };
}

export function buildCityEnvironment(
  city: CityMapData,
  maxAnisotropy: number
): CitySceneAssets {
  const root = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const colliders: BuildingCollider[] = [];
  const trafficLights: TrafficLightNodeRig[] = [];
  const buildingWindowMats: THREE.MeshStandardMaterial[] = [];
  const streetLampMats: THREE.MeshStandardMaterial[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // 1. Extended Ground Plane
  const groundSize = city.bounds * 3.2;
  const groundGeo = track(new THREE.PlaneGeometry(groundSize, groundSize));
  const groundMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.94,
      metalness: 0.04
    })
  );
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // Sidewalk grass / plaza inner ground (distinct lighter urban stone tone from dark asphalt)
  const cityPadGeo = track(new THREE.PlaneGeometry(city.bounds * 2.25, city.bounds * 2.25));
  const cityPadMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x7c8a99,
      roughness: 0.92,
      metalness: 0.03
    })
  );
  const cityPad = new THREE.Mesh(cityPadGeo, cityPadMat);
  cityPad.rotation.x = -Math.PI / 2;
  cityPad.position.y = 0.02;
  cityPad.receiveShadow = true;
  root.add(cityPad);

  // 2. Water Bodies (Hồ Gươm, Hồ Tây, Sông Hồng / Sông Sài Gòn / Sông Hàn)
  const waterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0f766e,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06
    })
  );

  for (const wb of city.waterBodies) {
    let geo: THREE.BufferGeometry;
    if (wb.shape === 'ellipse') {
      geo = track(new THREE.CylinderGeometry(1, 1, 0.16, 36));
      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.scale.set(wb.width * 0.5, 1, wb.depth * 0.5);
      mesh.position.set(wb.x, 0.01, wb.z);
      if (wb.rotation) mesh.rotation.y = wb.rotation;
      mesh.receiveShadow = true;
      root.add(mesh);

      // Curb around lake
      const curbMat = track(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 }));
      const curbGeo = track(new THREE.TorusGeometry(1, 0.045, 8, 40));
      curbGeo.rotateX(Math.PI / 2);
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.scale.set(wb.width * 0.51, 1, wb.depth * 0.51);
      curb.position.set(wb.x, 0.12, wb.z);
      if (wb.rotation) curb.rotation.y = wb.rotation;
      root.add(curb);
    } else {
      geo = track(new THREE.BoxGeometry(wb.width, 0.18, wb.depth));
      const mesh = new THREE.Mesh(geo, waterMat);
      mesh.position.set(wb.x, 0.0, wb.z);
      if (wb.rotation) mesh.rotation.y = wb.rotation;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
  }

  // 3. Road Network + Raised 3D Sidewalks (Vỉa hè & Bó vỉa) + One-Way Markings + Traffic Signs
  const nodeMap = new Map(city.nodes.map((n) => [n.id, n]));
  const roadTexTwoLane = track(createAsphaltTexture(maxAnisotropy, 'two_lane'));
  const roadTexFourLane = track(createAsphaltTexture(maxAnisotropy, 'four_lane'));
  const roadTexSixLane = track(createAsphaltTexture(maxAnisotropy, 'six_lane'));
  const roadTexAlley = track(createAsphaltTexture(maxAnisotropy, 'alley'));
  const sidewalkTex = track(createSidewalkTexture(maxAnisotropy));
  const roadArrowTex = track(createRoadArrowTexture());

  const roadMaterial = track(
    new THREE.MeshStandardMaterial({
      map: roadTexTwoLane,
      roughness: 0.78,
      metalness: 0.08
    })
  );
  const intersectionMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.8,
      metalness: 0.08
    })
  );
  const crosswalkMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.6
    })
  );
  const curbMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.72,
      metalness: 0.05
    })
  );
  const roadArrowMat = track(
    new THREE.MeshBasicMaterial({
      map: roadArrowTex,
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    })
  );
  const arrowPlaneGeo = track(new THREE.PlaneGeometry(2.2, 4.4));

  // Helpers to classify junction size
  const isNodeAlleyOnly = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (node?.hasTrafficLight) return false;
    const connected = city.segments.filter((s) => s.from === nodeId || s.to === nodeId);
    return connected.length > 0 && connected.every((s) => s.lanes === 1);
  };
  const getNodeMaxLanes = (nodeId: string) => {
    let maxL = 2;
    for (const s of city.segments) {
      if ((s.from === nodeId || s.to === nodeId) && s.lanes > maxL) {
        maxL = s.lanes;
      }
    }
    return maxL;
  };

  // Sign textures & shared geometries
  const signPostGeo = track(new THREE.CylinderGeometry(0.06, 0.075, 3.1, 8));
  const signPostMat = track(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.35 }));
  const signBackMat = track(new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.5 }));
  const signBoardGeo = track(new THREE.PlaneGeometry(1.1, 1.1));
  const signMatCache = new Map<string, THREE.MeshStandardMaterial>();

  const getSignMat = (
    kind: 'speed' | 'one_way' | 'no_entry' | 'traffic_light' | 'ped_cross' | 'no_parking' | 'speed_cam',
    value?: number
  ) => {
    const key = `${kind}_${value ?? ''}`;
    let mat = signMatCache.get(key);
    if (!mat) {
      const tex = track(createSignTexture(kind, value));
      mat = track(
        new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          alphaTest: 0.15,
          roughness: 0.35,
          metalness: 0.1
        })
      );
      signMatCache.set(key, mat);
    }
    return mat;
  };

  const placeTrafficSign = (
    sx: number,
    sz: number,
    yaw: number, // direction sign face points toward (towards oncoming driver)
    kind: 'speed' | 'one_way' | 'no_entry' | 'traffic_light' | 'ped_cross' | 'no_parking' | 'speed_cam',
    value?: number
  ) => {
    const g = new THREE.Group();
    g.position.set(sx, 0.18, sz);
    g.rotation.y = yaw;

    const post = new THREE.Mesh(signPostGeo, signPostMat);
    post.position.y = 1.55;
    post.castShadow = true;
    g.add(post);

    const frontFace = new THREE.Mesh(signBoardGeo, getSignMat(kind, value));
    frontFace.position.set(0, 2.85, 0.05);
    g.add(frontFace);

    const backFace = new THREE.Mesh(signBoardGeo, signBackMat);
    backFace.position.set(0, 2.85, 0.03);
    backFace.rotation.y = Math.PI;
    g.add(backFace);

    root.add(g);
  };

  for (let segIdx = 0; segIdx < city.segments.length; segIdx++) {
    const seg = city.segments[segIdx];
    const a = nodeMap.get(seg.from);
    const b = nodeMap.get(seg.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;

    const isAlley = seg.lanes === 1;
    const width = seg.lanes >= 6 ? 21.5 : seg.lanes >= 4 ? 16.5 : seg.lanes === 3 ? 13.5 : seg.lanes === 2 ? 10.2 : 5.6;
    const angle = Math.atan2(dx, dz);

    const baseTex =
      seg.lanes >= 6
        ? roadTexSixLane
        : seg.lanes >= 4
        ? roadTexFourLane
        : isAlley
        ? roadTexAlley
        : roadTexTwoLane;
    const segTex = baseTex.clone();
    segTex.needsUpdate = true;
    segTex.repeat.set(1, Math.max(1, Math.round(len / 18)));
    disposables.push(segTex);
    const segMat = track(
      new THREE.MeshStandardMaterial({
        map: segTex,
        color: 0xffffff,
        roughness: isAlley ? 0.88 : 0.78,
        metalness: 0.08
      })
    );

    const roadGeo = track(new THREE.PlaneGeometry(width, len));
    const roadMesh = new THREE.Mesh(roadGeo, segMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = angle;
    roadMesh.position.set((a.x + b.x) * 0.5, seg.isBridge ? 0.25 : 0.06, (a.z + b.z) * 0.5);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);

    // Painted One-Way Arrows along the asphalt (from -> to)
    const dirX = dx / len;
    const dirZ = dz / len;
    const rightX = -dirZ;
    const rightZ = dirX;
    if (seg.oneWay) {
      const arrowCount = Math.max(1, Math.floor(len / 34));
      for (let ai = 1; ai <= arrowCount; ai++) {
        const frac = ai / (arrowCount + 1);
        const ax = a.x + dx * frac;
        const az = a.z + dz * frac;
        const arrow = new THREE.Mesh(arrowPlaneGeo, roadArrowMat);
        arrow.rotation.order = 'YXZ';
        arrow.rotation.y = Math.atan2(-dirX, -dirZ);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(ax, seg.isBridge ? 0.28 : 0.09, az);
        root.add(arrow);
      }
    }

    // Raised 3D Sidewalks (Vỉa hè) & Concrete Curbs (Bó vỉa) along non-bridge segments
    if (!seg.isBridge) {
      const trimA = isNodeAlleyOnly(seg.from) ? 4.4 : getNodeMaxLanes(seg.from) >= 6 ? 11.8 : 9.4;
      const trimB = isNodeAlleyOnly(seg.to) ? 4.4 : getNodeMaxLanes(seg.to) >= 6 ? 11.8 : 9.4;
      const swLen = len - trimA - trimB;
      if (swLen > 3) {
        const tMid = (trimA + swLen * 0.5) / len;
        const midX = a.x + dx * tMid;
        const midZ = a.z + dz * tMid;
        const swWidth = isAlley ? 1.35 : 3.2;
        const curbWidth = 0.34;

        const swTex = sidewalkTex.clone();
        swTex.needsUpdate = true;
        swTex.repeat.set(Math.max(1, Math.round(swWidth / 2)), Math.max(1, Math.round(swLen / 4)));
        disposables.push(swTex);
        const swMat = track(
          new THREE.MeshStandardMaterial({
            map: swTex,
            roughness: 0.85,
            metalness: 0.04
          })
        );
        const swGeo = track(new THREE.BoxGeometry(swWidth, 0.22, swLen));
        const curbGeo = track(new THREE.BoxGeometry(curbWidth, 0.24, swLen));

        [-1, 1].forEach((side) => {
          const swOffset = side * (width * 0.5 + swWidth * 0.5);
          const swMesh = new THREE.Mesh(swGeo, swMat);
          swMesh.position.set(midX + rightX * swOffset, 0.11, midZ + rightZ * swOffset);
          swMesh.rotation.y = angle;
          swMesh.receiveShadow = true;
          root.add(swMesh);

          const curbOffset = side * (width * 0.5 + curbWidth * 0.5);
          const curbMesh = new THREE.Mesh(curbGeo, curbMat);
          curbMesh.position.set(midX + rightX * curbOffset, 0.12, midZ + rightZ * curbOffset);
          curbMesh.rotation.y = angle;
          curbMesh.receiveShadow = true;
          root.add(curbMesh);
        });
      }

      // Authentic Roadside Traffic Signs on the sidewalk edge
      const signLateral = width * 0.5 + (isAlley ? 0.75 : 1.35);
      const yawFacingA = Math.atan2(-dirX, -dirZ); // Faces drivers entering at A heading toward B
      const yawFacingB = Math.atan2(dirX, dirZ);   // Faces drivers entering at B heading toward A

      if (len > 36) {
        // Place Speed Limit P.127 sign ONLY on roads that actually have a speedLimit
        if (seg.speedLimit) {
          const dFromA = Math.min(len * 0.25, 19);
          placeTrafficSign(
            a.x + dirX * dFromA + rightX * signLateral,
            a.z + dirZ * dFromA + rightZ * signLateral,
            yawFacingA,
            'speed',
            seg.speedLimit
          );
        } else if (segIdx % 3 === 0 && !isAlley) {
          // Place No Parking sign on some unrestricted urban streets
          const dFromA = Math.min(len * 0.22, 18);
          placeTrafficSign(
            a.x + dirX * dFromA + rightX * signLateral,
            a.z + dirZ * dFromA + rightZ * signLateral,
            yawFacingA,
            'no_parking'
          );
        }

        if (seg.oneWay) {
          // One-Way Blue Arrow sign at entry A, and Red Do-Not-Enter sign at exit B!
          const dEntry = Math.min(len * 0.16, 13.5);
          placeTrafficSign(
            a.x + dirX * dEntry + rightX * signLateral,
            a.z + dirZ * dEntry + rightZ * signLateral,
            yawFacingA,
            'one_way'
          );

          const dExit = len - Math.min(len * 0.16, 13.5);
          placeTrafficSign(
            a.x + dirX * dExit - rightX * signLateral,
            a.z + dirZ * dExit - rightZ * signLateral,
            yawFacingB,
            'no_entry'
          );
        } else if (segIdx % 2 === 0 && len > 65) {
          // Two-way street: Speed Limit (if regulated) or No Parking facing drivers from B too
          const dFromB = len - Math.min(len * 0.24, 19);
          const signKindB = seg.speedLimit && segIdx % 4 !== 0 ? 'speed' : 'no_parking';
          placeTrafficSign(
            a.x + dirX * dFromB - rightX * signLateral,
            a.z + dirZ * dFromB - rightZ * signLateral,
            yawFacingB,
            signKindB,
            seg.speedLimit
          );
        }

        // Traffic light / Crosswalk warning sign before signalized junctions
        if (b.hasTrafficLight && len > 52) {
          const dWarn = len - 24;
          placeTrafficSign(
            a.x + dirX * dWarn + rightX * signLateral,
            a.z + dirZ * dWarn + rightZ * signLateral,
            yawFacingA,
            segIdx % 2 === 0 ? 'traffic_light' : 'ped_cross'
          );
        }
      }
    }

    // Bridge railings / steel trusses
    if (seg.isBridge) {
      const bridgeDeck = new THREE.Mesh(
        track(new THREE.BoxGeometry(width + 1.4, 0.36, len)),
        track(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.4 }))
      );
      bridgeDeck.position.set((a.x + b.x) * 0.5, 0.05, (a.z + b.z) * 0.5);
      bridgeDeck.rotation.y = angle;
      root.add(bridgeDeck);

      const railColor = seg.streetName.includes('Rồng') ? 0xf59e0b : 0x78350f;
      const railMat = track(new THREE.MeshStandardMaterial({ color: railColor, metalness: 0.75, roughness: 0.35 }));
      [-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 2.2, len)), railMat);
        const offsetX = Math.cos(angle) * (side * (width * 0.5 + 0.5));
        const offsetZ = -Math.sin(angle) * (side * (width * 0.5 + 0.5));
        rail.position.set((a.x + b.x) * 0.5 + offsetX, 1.3, (a.z + b.z) * 0.5 + offsetZ);
        rail.rotation.y = angle;
        root.add(rail);
      });
    }
  }

  // Intersections + Zebra crosswalks + Stop lines + Traffic Lights
  const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 }));
  const lampHeadMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xfde68a),
      emissiveIntensity: 0.1
    })
  );
  streetLampMats.push(lampHeadMat);

  const speedCamSet = new Set(city.speedCameraNodes);

  // Shared 3D LED Countdown Materials + Cached Digit Textures (updated once per second)
  const timerTexCache = new Map<string, THREE.CanvasTexture>();
  const getTimerTexture = (st: 'green' | 'yellow' | 'red', sec: number): THREE.CanvasTexture => {
    const key = `${st}_${sec}`;
    let tex = timerTexCache.get(key);
    if (!tex) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 84;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 128, 84);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 122, 78);
      ctx.fillStyle = st === 'red' ? '#ff3b3b' : st === 'yellow' ? '#fbbf24' : '#22c55e';
      ctx.font = 'bold 58px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(sec).padStart(2, '0'), 64, 44);
      tex = track(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      timerTexCache.set(key, tex);
    }
    return tex;
  };
  const nsTimerSharedMat = track(new THREE.MeshBasicMaterial({ map: getTimerTexture('green', 18) }));
  const ewTimerSharedMat = track(new THREE.MeshBasicMaterial({ map: getTimerTexture('red', 22) }));
  let lastNsKey = 'green_18';
  let lastEwKey = 'red_22';

  for (const node of city.nodes) {
    const isAlleyNode = isNodeAlleyOnly(node.id);
    const maxLanes = getNodeMaxLanes(node.id);
    const isSixLaneNode = maxLanes >= 6;
    const padSize = isAlleyNode ? 6.8 : isSixLaneNode ? 23.0 : 17.5;
    const pad = new THREE.Mesh(track(new THREE.PlaneGeometry(padSize, padSize)), intersectionMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(node.x, 0.075, node.z);
    pad.receiveShadow = true;
    root.add(pad);

    // Crosswalk stripes + prominent 4-way white stop lines (vạch dừng đèn đỏ)
    if (!isAlleyNode) {
      const cwDist = isSixLaneNode ? 11.4 : 8.4;
      const cwSpan = isSixLaneNode ? 7.8 : 4.8;
      for (let s = -cwSpan; s <= cwSpan; s += 2.2) {
        const stripeN = new THREE.Mesh(track(new THREE.PlaneGeometry(0.9, 2.2)), crosswalkMat);
        stripeN.rotation.x = -Math.PI / 2;
        stripeN.position.set(node.x + s, 0.09, node.z - cwDist);
        root.add(stripeN);

        const stripeS = new THREE.Mesh(track(new THREE.PlaneGeometry(0.9, 2.2)), crosswalkMat);
        stripeS.rotation.x = -Math.PI / 2;
        stripeS.position.set(node.x + s, 0.09, node.z + cwDist);
        root.add(stripeS);

        const stripeW = new THREE.Mesh(track(new THREE.PlaneGeometry(2.2, 0.9)), crosswalkMat);
        stripeW.rotation.x = -Math.PI / 2;
        stripeW.position.set(node.x - cwDist, 0.09, node.z + s);
        root.add(stripeW);

        const stripeE = new THREE.Mesh(track(new THREE.PlaneGeometry(2.2, 0.9)), crosswalkMat);
        stripeE.rotation.x = -Math.PI / 2;
        stripeE.position.set(node.x + cwDist, 0.09, node.z + s);
        root.add(stripeE);
      }

      if (node.hasTrafficLight) {
        // Thick solid white stop lines (vạch dừng xe) right before each approach crosswalk
        const stopDist = isSixLaneNode ? 13.8 : 10.8;
        const stopW = isSixLaneNode ? 9.6 : 6.8;
        const stopOff = isSixLaneNode ? 4.8 : 3.4;

        const stopLineGeoNS = track(new THREE.PlaneGeometry(stopW, 0.68));
        const stopLineN = new THREE.Mesh(stopLineGeoNS, crosswalkMat);
        stopLineN.rotation.x = -Math.PI / 2;
        stopLineN.position.set(node.x - stopOff, 0.096, node.z - stopDist);

        const stopLineS = new THREE.Mesh(stopLineGeoNS, crosswalkMat);
        stopLineS.rotation.x = -Math.PI / 2;
        stopLineS.position.set(node.x + stopOff, 0.096, node.z + stopDist);

        const stopLineGeoEW = track(new THREE.PlaneGeometry(0.68, stopW));
        const stopLineW = new THREE.Mesh(stopLineGeoEW, crosswalkMat);
        stopLineW.rotation.x = -Math.PI / 2;
        stopLineW.position.set(node.x - stopDist, 0.096, node.z + stopOff);

        const stopLineE = new THREE.Mesh(stopLineGeoEW, crosswalkMat);
        stopLineE.rotation.x = -Math.PI / 2;
        stopLineE.position.set(node.x + stopDist, 0.096, node.z - stopOff);

        root.add(stopLineN, stopLineS, stopLineW, stopLineE);
      }
    }

    // Speed Camera Sign
    if (speedCamSet.has(node.id)) {
      const camOff = isSixLaneNode ? 12.2 : 9.6;
      placeTrafficSign(node.x + camOff, node.z + camOff + 2.0, 0, 'speed_cam');
    }

    // Traffic Lights oriented strictly along each incoming road axis with 3D LED Countdown Timers
    const timerFaceGeo = track(new THREE.PlaneGeometry(0.92, 0.58));
    const timerHousingGeo = track(new THREE.BoxGeometry(1.0, 0.66, 0.42));
    const visorGeo = track(new THREE.BoxGeometry(0.46, 0.1, 0.24));
    if (node.hasTrafficLight) {
      const nsRed = track(new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xef4444, emissiveIntensity: 0 }));
      const nsYellow = track(new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0xf59e0b, emissiveIntensity: 0 }));
      const nsGreen = track(new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 1.8 }));

      const ewRed = track(new THREE.MeshStandardMaterial({ color: 0x450a0a, emissive: 0xef4444, emissiveIntensity: 1.8 }));
      const ewYellow = track(new THREE.MeshStandardMaterial({ color: 0x451a03, emissive: 0xf59e0b, emissiveIntensity: 0 }));
      const ewGreen = track(new THREE.MeshStandardMaterial({ color: 0x052e16, emissive: 0x22c55e, emissiveIntensity: 0 }));

      // Collect every incoming road vector at this intersection
      const approaches: Array<{ ux: number; uz: number; halfW: number }> = [];
      for (const seg of city.segments) {
        const incomingFromA = seg.to === node.id;
        const incomingFromB = !seg.oneWay && seg.from === node.id;
        if (!incomingFromA && !incomingFromB) continue;
        const other = nodeMap.get(incomingFromA ? seg.from : seg.to);
        if (!other) continue;
        const dx = node.x - other.x;
        const dz = node.z - other.z;
        const dLen = Math.hypot(dx, dz);
        if (dLen < 1) continue;
        const rW = seg.lanes >= 6 ? 21.5 : seg.lanes >= 4 ? 16.5 : seg.lanes === 3 ? 13.5 : seg.lanes === 1 ? 5.6 : 10.2;
        approaches.push({ ux: dx / dLen, uz: dz / dLen, halfW: rW * 0.5 });
      }

      const placedPoles: Array<{ x: number; z: number }> = [];
      const cwDist = isSixLaneNode ? 11.4 : 8.4;

      for (const app of approaches) {
        const rightX = -app.uz;
        const rightZ = app.ux;
        const latOff = Math.max(app.halfW + 1.35, isSixLaneNode ? 11.2 : 6.5);
        let px = node.x + app.ux * (cwDist + 1.25) + rightX * latOff;
        let pz = node.z + app.uz * (cwDist + 1.25) + rightZ * latOff;

        // Small nudge if two acute approaches land very close
        if (placedPoles.some((p) => Math.hypot(p.x - px, p.z - pz) < 2.2)) {
          px += app.ux * 2.4;
          pz += app.uz * 2.4;
        }
        placedPoles.push({ x: px, z: pz });

        // Rotate pole so local +Z points strictly back down the incoming road vector (-ux, -uz)
        // and local -X extends over the incoming traffic lanes
        const poleGroup = new THREE.Group();
        poleGroup.position.set(px, 0, pz);
        poleGroup.rotation.y = Math.atan2(-app.ux, -app.uz);

        const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.2, 5.7, 8)), poleMat);
        pole.position.set(0, 2.85, 0);
        poleGroup.add(pole);

        const armLen = isSixLaneNode ? 3.8 : 3.1;
        const arm = new THREE.Mesh(track(new THREE.BoxGeometry(armLen, 0.15, 0.15)), poleMat);
        arm.position.set(-armLen * 0.5, 5.35, 0);
        poleGroup.add(arm);

        const bx = -armLen + 0.45;
        const box = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 1.56, 0.52)), poleMat);
        box.position.set(bx, 4.72, 0);
        poleGroup.add(box);

        // LED Countdown Housing & Front Display facing straight down the incoming road (+Z)
        const isNSApproach = Math.abs(app.uz) >= Math.abs(app.ux);
        const timerHousing = new THREE.Mesh(timerHousingGeo, poleMat);
        timerHousing.position.set(bx, 5.88, 0);
        poleGroup.add(timerHousing);

        const tMat = isNSApproach ? nsTimerSharedMat : ewTimerSharedMat;
        const scrFront = new THREE.Mesh(timerFaceGeo, tMat);
        scrFront.position.set(bx, 5.88, 0.22);
        poleGroup.add(scrFront);

        const mats = isNSApproach ? [nsRed, nsYellow, nsGreen] : [ewRed, ewYellow, ewGreen];
        mats.forEach((m, idx) => {
          const by = 5.18 - idx * 0.46;
          const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.21, 10, 10)), m);
          bulb.position.set(bx, by, 0.24);
          const visor = new THREE.Mesh(visorGeo, poleMat);
          visor.position.set(bx, by + 0.19, 0.34);
          visor.rotation.x = 0.22;
          poleGroup.add(bulb, visor);
        });

        root.add(poleGroup);
      }

      trafficLights.push({
        nodeId: node.id,
        x: node.x,
        z: node.z,
        nsRed,
        nsYellow,
        nsGreen,
        ewRed,
        ewYellow,
        ewGreen
      });
    }
  }

  // 4. City Buildings (Vietnamese tube houses, modern office towers, colonial villas)
  // Place buildings inside city blocks while avoiding roads and water bodies
  const blockColors = ['#e2d9c8', '#cbd5e1', '#d6ccc2', '#e5e7eb', '#d1d5db', '#fde68a'];
  const facadeMats: THREE.MeshStandardMaterial[] = blockColors.map((col, i) => {
    const tex = track(createBuildingFacadeTexture(col, i % 2 === 0 ? '#fef08a' : '#bae6fd', 7, 4, maxAnisotropy));
    const mat = track(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xfef3c7),
        emissiveIntensity: 0.05,
        roughness: 0.72
      })
    );
    buildingWindowMats.push(mat);
    return mat;
  });
  const roofMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }));

  const isNearRoadOrWater = (bx: number, bz: number, bw: number, bd: number): boolean => {
    // Check water bodies
    for (const wb of city.waterBodies) {
      if (
        Math.abs(bx - wb.x) < wb.width * 0.5 + bw * 0.5 + 8 &&
        Math.abs(bz - wb.z) < wb.depth * 0.5 + bd * 0.5 + 8
      ) {
        return true;
      }
    }
    // Check landmarks
    for (const lm of city.landmarks) {
      if (Math.hypot(bx - lm.x, bz - lm.z) < 26) return true;
    }
    // Check road segments distance
    for (const seg of city.segments) {
      const a = nodeMap.get(seg.from);
      const b = nodeMap.get(seg.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((bx - a.x) * dx + (bz - a.z) * dz) / lenSq));
      const px = a.x + t * dx;
      const pz = a.z + t * dz;
      const clearance =
        (seg.lanes >= 6 ? 14.5 : seg.lanes >= 4 ? 11.5 : seg.lanes === 1 ? 4.8 : 8.8) + Math.max(bw, bd) * 0.55;
      if (Math.hypot(bx - px, bz - pz) < clearance) return true;
    }
    return false;
  };

  // Deterministic pseudo-random city block generator
  let seed = city.id === 'hanoi' ? 101 : city.id === 'hcmc' ? 202 : 303;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const treePositions: Array<{ x: number; z: number; scale: number; isFlowering?: boolean }> = [];
  const isNearWaterOrLandmark = (tx: number, tz: number): boolean => {
    for (const wb of city.waterBodies) {
      if (
        Math.abs(tx - wb.x) < wb.width * 0.5 + 4 &&
        Math.abs(tz - wb.z) < wb.depth * 0.5 + 4
      ) {
        return true;
      }
    }
    for (const lm of city.landmarks) {
      if (Math.hypot(tx - lm.x, tz - lm.z) < 20) return true;
    }
    return false;
  };

  // Dedicated Street-Lined Urban Trees (Cây xanh trồng dọc vỉa hè hai bên đường phố)
  for (let segIdx = 0; segIdx < city.segments.length; segIdx++) {
    const seg = city.segments[segIdx];
    if (seg.isBridge || seg.lanes < 2) continue;
    const a = nodeMap.get(seg.from);
    const b = nodeMap.get(seg.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 34) continue;
    const dirX = dx / len;
    const dirZ = dz / len;
    const rightX = -dirZ;
    const rightZ = dirX;
    const rWidth = seg.lanes >= 6 ? 21.5 : seg.lanes >= 4 ? 16.5 : seg.lanes === 3 ? 13.5 : 10.2;
    const treeLat = rWidth * 0.5 + 2.55;
    const startD = (getNodeMaxLanes(seg.from) >= 6 ? 11.8 : 9.4) + 6.5;
    const endD = len - (getNodeMaxLanes(seg.to) >= 6 ? 11.8 : 9.4) - 6.5;

    for (let d = startD; d <= endD; d += 21) {
      for (const side of [-1, 1] as const) {
        const tx = a.x + dirX * d + rightX * (side * treeLat);
        const tz = a.z + dirZ * d + rightZ * (side * treeLat);
        if (isNearWaterOrLandmark(tx, tz)) continue;
        // Avoid overlap with already-added intersection trees
        if (treePositions.some((tp) => Math.hypot(tp.x - tx, tp.z - tz) < 8.5)) continue;
        treePositions.push({
          x: tx,
          z: tz,
          scale: 0.78 + ((segIdx + Math.round(d)) % 4) * 0.08,
          isFlowering: (segIdx + Math.round(d)) % 7 === 0
        });
      }
    }
  }

  const step = 30;
  for (let gx = -city.bounds + 25; gx <= city.bounds - 25; gx += step) {
    for (let gz = -city.bounds + 25; gz <= city.bounds - 25; gz += step) {
      const bx = gx + (rand() - 0.5) * 6;
      const bz = gz + (rand() - 0.5) * 6;
      const bw = 12 + rand() * 10;
      const bd = 12 + rand() * 10;

      if (isNearRoadOrWater(bx, bz, bw, bd)) {
        if (rand() > 0.6 && !isNearRoadOrWater(bx, bz, 3, 3)) {
          treePositions.push({ x: bx, z: bz, scale: 0.85 + rand() * 0.35, isFlowering: rand() > 0.8 });
        }
        continue;
      }

      const bh = 9 + rand() * (city.id === 'hcmc' ? 32 : 20);
      const mat = facadeMats[Math.floor(rand() * facadeMats.length)];
      const building = new THREE.Mesh(track(new THREE.BoxGeometry(bw, bh, bd)), [
        mat,
        mat,
        roofMat,
        roofMat,
        mat,
        mat
      ]);
      building.position.set(bx, bh * 0.5, bz);
      building.castShadow = true;
      building.receiveShadow = true;
      root.add(building);

      colliders.push({
        minX: bx - bw * 0.5,
        maxX: bx + bw * 0.5,
        minZ: bz - bd * 0.5,
        maxZ: bz + bd * 0.5
      });
    }
  }

  // 5. Iconic Landmarks (Hồ Gươm Tháp Rùa, Cầu Thê Húc, Nhà Hát Lớn, Lăng Bác, Văn Miếu, Bitexco, Cầu Rồng...)
  for (const lm of city.landmarks) {
    const lmGroup = new THREE.Group();
    lmGroup.position.set(lm.x, 0, lm.z);

    if (lm.type === 'thap_rua') {
      const island = new THREE.Mesh(
        track(new THREE.CylinderGeometry(8.5, 10, 1.2, 20)),
        track(new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 }))
      );
      island.position.y = 0.6;
      lmGroup.add(island);

      const towerMat = track(new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.8 }));
      const t1 = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 4.2, 5.2)), towerMat);
      t1.position.y = 3.2;
      const t2 = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 3.4, 4.0)), towerMat);
      t2.position.y = 7.0;
      const t3 = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 2.8, 2.8)), towerMat);
      t3.position.y = 10.1;
      const spire = new THREE.Mesh(track(new THREE.ConeGeometry(1.8, 2.2, 4)), towerMat);
      spire.rotation.y = Math.PI / 4;
      spire.position.y = 12.6;
      lmGroup.add(t1, t2, t3, spire);

      const theHuc = new THREE.Mesh(
        track(new THREE.BoxGeometry(16, 1.2, 2.8)),
        track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }))
      );
      theHuc.position.set(16, 1.3, -24);
      lmGroup.add(theHuc);
    } else if (lm.type === 'nha_hat_lon') {
      const wallMat = track(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 }));
      const roof = new THREE.Mesh(
        track(new THREE.ConeGeometry(13, 6, 4)),
        track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }))
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 14;
      const body = new THREE.Mesh(track(new THREE.BoxGeometry(18, 11, 14)), wallMat);
      body.position.y = 5.5;
      lmGroup.add(body, roof);
      colliders.push({ minX: lm.x - 9, maxX: lm.x + 9, minZ: lm.z - 7, maxZ: lm.z + 7 });
    } else if (lm.type === 'lang_bac') {
      const graniteMat = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 }));
      const base = new THREE.Mesh(track(new THREE.BoxGeometry(22, 3.2, 22)), graniteMat);
      base.position.y = 1.6;
      const main = new THREE.Mesh(track(new THREE.BoxGeometry(17, 10, 17)), graniteMat);
      main.position.y = 8.2;
      const cap = new THREE.Mesh(track(new THREE.BoxGeometry(20, 2.6, 20)), graniteMat);
      cap.position.y = 14.2;
      lmGroup.add(base, main, cap);
      colliders.push({ minX: lm.x - 11, maxX: lm.x + 11, minZ: lm.z - 11, maxZ: lm.z + 11 });
    } else if (lm.type === 'van_mieu') {
      const redMat = track(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 }));
      const tileMat = track(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 }));
      const base = new THREE.Mesh(track(new THREE.BoxGeometry(14, 5, 10)), redMat);
      base.position.y = 2.5;
      const pav = new THREE.Mesh(track(new THREE.BoxGeometry(9, 4.5, 8)), redMat);
      pav.position.y = 7.2;
      const roof = new THREE.Mesh(track(new THREE.ConeGeometry(7, 3.5, 4)), tileMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 11.2;
      lmGroup.add(base, pav, roof);
      colliders.push({ minX: lm.x - 7, maxX: lm.x + 7, minZ: lm.z - 5, maxZ: lm.z + 5 });
    } else if (lm.type === 'bitexco') {
      const glassTower = track(new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.15, clearcoat: 1 }));
      const tower = new THREE.Mesh(track(new THREE.CylinderGeometry(6, 9, 48, 16)), glassTower);
      tower.position.y = 24;
      const helipad = new THREE.Mesh(track(new THREE.CylinderGeometry(5, 5, 0.8, 16)), glassTower);
      helipad.position.set(7, 36, 0);
      lmGroup.add(tower, helipad);
      colliders.push({ minX: lm.x - 9, maxX: lm.x + 9, minZ: lm.z - 9, maxZ: lm.z + 9 });
    } else if (lm.type === 'cau_rong') {
      const goldMat = track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4, metalness: 0.8, roughness: 0.2 }));
      for (let i = -2; i <= 2; i++) {
        const arch = new THREE.Mesh(track(new THREE.TorusGeometry(6, 0.7, 8, 20, Math.PI)), goldMat);
        arch.position.set(i * 14, 1.5, 0);
        arch.rotation.y = Math.PI / 2;
        lmGroup.add(arch);
      }
    } else {
      const hallMat = track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, metalness: 0.2 }));
      const hall = new THREE.Mesh(track(new THREE.BoxGeometry(16, 10, 12)), hallMat);
      hall.position.y = 5;
      lmGroup.add(hall);
      colliders.push({ minX: lm.x - 8, maxX: lm.x + 8, minZ: lm.z - 6, maxZ: lm.z + 6 });
    }

    root.add(lmGroup);
  }

  // 6. Instanced Multi-Crown Urban Street & Park Trees (Cây xanh dọc đường phố)
  if (treePositions.length > 0) {
    const trunkGeo = track(new THREE.CylinderGeometry(0.24, 0.4, 3.4, 7));
    trunkGeo.translate(0, 1.7, 0);
    const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x6b3a1e, roughness: 0.92 }));
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);

    const canopyGeo = track(new THREE.DodecahedronGeometry(2.15, 1));
    canopyGeo.scale(1.08, 0.85, 1.08);
    canopyGeo.translate(0, 4.15, 0);
    const canopyMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 }));
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);

    const upperCanopyGeo = track(new THREE.DodecahedronGeometry(1.48, 1));
    upperCanopyGeo.translate(0.32, 5.25, -0.22);
    const upperCanopies = new THREE.InstancedMesh(upperCanopyGeo, canopyMat, treePositions.length);

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    const tintUpper = new THREE.Color();
    treePositions.forEach((tp, idx) => {
      dummy.position.set(tp.x, 0.16, tp.z);
      dummy.scale.setScalar(tp.scale);
      dummy.rotation.y = idx * 1.15;
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);
      canopies.setMatrixAt(idx, dummy.matrix);
      upperCanopies.setMatrixAt(idx, dummy.matrix);

      if (tp.isFlowering) {
        // Phượng vĩ đỏ cam / Bằng lăng tím nhẹ đặc trưng đường phố Việt Nam
        const hue = idx % 2 === 0 ? 0.03 : 0.77;
        tint.setHSL(0.32, 0.55, 0.28);
        tintUpper.setHSL(hue, 0.72, 0.52);
      } else {
        tint.setHSL(0.31 + (idx % 5) * 0.015, 0.58, 0.25 + (idx % 4) * 0.035);
        tintUpper.setHSL(0.3 + (idx % 5) * 0.015, 0.62, 0.32 + (idx % 4) * 0.04);
      }
      canopies.setColorAt(idx, tint);
      upperCanopies.setColorAt(idx, tintUpper);
    });
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
    upperCanopies.computeBoundingSphere();
    canopies.castShadow = true;
    upperCanopies.castShadow = true;
    root.add(trunks, canopies, upperCanopies);
  }

  return {
    root,
    trafficLights,
    colliders,
    buildingWindowMats,
    streetLampMats,
    roadMaterial,
    updateTrafficTimers: (nsState, nsSec, ewState, ewSec) => {
      const nKey = `${nsState}_${nsSec}`;
      if (nKey !== lastNsKey) {
        lastNsKey = nKey;
        nsTimerSharedMat.map = getTimerTexture(nsState, nsSec);
        nsTimerSharedMat.needsUpdate = true;
      }
      const eKey = `${ewState}_${ewSec}`;
      if (eKey !== lastEwKey) {
        lastEwKey = eKey;
        ewTimerSharedMat.map = getTimerTexture(ewState, ewSec);
        ewTimerSharedMat.needsUpdate = true;
      }
    },
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    }
  };
}
