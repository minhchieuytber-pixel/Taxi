import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/SoundEngine';
import {
  computeTurnInstruction,
  findBestRouteFromPosition,
  findNearestSegment,
  getCityMap,
  getNodeMap
} from '../data/cities';
import { getVehicleSpec } from '../data/vehicles';
import {
  buildCityEnvironment,
  buildMotorbikeNpcMesh,
  buildPedestrianMesh,
  buildPlayerCarMesh,
  buildPoliceCarMesh,
  buildTrafficCarMesh,
  CarRig,
  CitySceneAssets,
  PedestrianRig,
  PoliceRig,
  TrafficVehicleType
} from '../three/ProceduralModels';
import { createSpeechBubbleRig, SpeechRole } from '../three/SpeechBubbleSprite';
import {
  ActiveRide,
  CameraMode,
  CityId,
  ControlsInput,
  HudTelemetry,
  NpcSpeechBubble,
  OwnedVehicleState,
  TrafficLevel,
  WeatherType
} from '../types/game';

interface GameViewportProps {
  cityId: CityId;
  activeVehicleId: string;
  garage: Record<string, OwnedVehicleState>;
  activeRide: ActiveRide | null;
  weather: WeatherType;
  timeOfDayOverride: number | null; // null = auto cycle
  cameraMode: CameraMode;
  isTitleMode: boolean;
  isPaused: boolean;
  controlsRef: React.MutableRefObject<ControlsInput>;
  soundEngine: SoundEngine;
  customerOverheadSpeech?: { speaker: string; text: string; key: number } | null;
  onTelemetry: (t: HudTelemetry) => void;
  onViolation: (
    type: 'speeding' | 'red_light' | 'collision' | 'wrong_way',
    streetName: string,
    fine: number,
    meta?: { billNote?: string; speedKmh?: number; speedLimit?: number; timeLabel?: string }
  ) => void;
  onReachedPickup: () => void;
  onReachedDropoff: () => void;
  onNpcSpeech?: (speech: NpcSpeechBubble) => void;
}

interface AiCarAgent {
  mesh: THREE.Group;
  fromId: string;
  toId: string;
  t: number;
  speed: number;
  baseSpeed: number;
  laneOffset: number;
  currentLaneOffset: number;
  overtakeState: 'none' | 'passing' | 'returning';
  overtakeTargetIdx: number | null;
  overtakePassOffset: number;
  x: number;
  z: number;
  heading: number;
  isPolice: boolean;
  isMotorbike?: boolean;
  vehicleKind: 'police' | 'motorbike' | TrafficVehicleType;
  halfLength: number;
  halfWidth: number;
  policeRig?: PoliceRig;
}

interface PedestrianAgent {
  kind: 'crosswalk' | 'sidewalk';
  rig: PedestrianRig;
  nodeId: string;
  hasTrafficLight: boolean;
  axis: 'ns' | 'ew'; // ns = crossing along X; ew = crossing along Z
  crosswalkOffset: number;
  crossHalfSpan: number;
  progress: number; // -1..+1 across road width
  dir: 1 | -1;
  speed: number;
  walkPhase: number;
  x: number;
  y: number;
  z: number;
  // Sidewalk walking fields
  ax?: number;
  az?: number;
  dirX?: number;
  dirZ?: number;
  startD?: number;
  endD?: number;
  d?: number;
  lateral?: number;
}

function getAgentLaneOffset(lanes: number, isMotorbike: boolean, isHeavy = false): number {
  if (isMotorbike) {
    if (lanes >= 6) return 8.3;
    if (lanes >= 4) return 6.2;
    if (lanes === 3) return 4.9;
    if (lanes === 1) return 1.2;
    return 3.7;
  }
  if (isHeavy) {
    if (lanes >= 6) return 6.4;
    if (lanes >= 4) return 4.6;
    if (lanes === 3) return 3.3;
    return 2.45;
  }
  if (lanes >= 6) return 5.0;
  if (lanes >= 4) return 4.1;
  if (lanes === 3) return 3.2;
  return 2.4;
}

function getCurbStopPosition(
  city: ReturnType<typeof getCityMap>,
  nodeMap: Map<string, ReturnType<typeof getCityMap>['nodes'][number]>,
  nodeId: string
): { x: number; y: number; z: number; roadX: number; roadZ: number } {
  const destNode = nodeMap.get(nodeId);
  if (!destNode) return { x: 0, y: 0.22, z: 0, roadX: 0, roadZ: 0 };

  const connected = city.segments.filter((s) => s.from === nodeId || s.to === nodeId);
  // Prefer non-bridge, multi-lane road segments so passenger waits on proper paved sidewalk
  const sorted = [...connected].sort((sa, sb) => {
    const scoreA = (sa.isBridge ? -10 : 0) + sa.lanes;
    const scoreB = (sb.isBridge ? -10 : 0) + sb.lanes;
    return scoreB - scoreA;
  });

  const seg = sorted[0];
  if (!seg) return { x: destNode.x + 6.5, y: 0.22, z: destNode.z + 6.5, roadX: destNode.x, roadZ: destNode.z };

  const otherId = seg.from === nodeId ? seg.to : seg.from;
  const other = nodeMap.get(otherId);
  if (!other) return { x: destNode.x + 6.5, y: 0.22, z: destNode.z + 6.5, roadX: destNode.x, roadZ: destNode.z };

  const dx = other.x - destNode.x;
  const dz = other.z - destNode.z;
  const len = Math.hypot(dx, dz) || 1;
  const dirX = dx / len;
  const dirZ = dz / len;
  const rightX = -dirZ;
  const rightZ = dirX;

  let maxNodeLanes = 2;
  for (const s of connected) {
    if (s.lanes > maxNodeLanes) maxNodeLanes = s.lanes;
  }
  const junctionClear = maxNodeLanes >= 6 ? 13.4 : maxNodeLanes === 1 ? 4.4 : 10.6;
  const alongDist = Math.min(len * 0.42, junctionClear + 4.8);
  const roadHalfW =
    seg.lanes >= 6 ? 10.75 : seg.lanes >= 4 ? 8.25 : seg.lanes === 3 ? 6.75 : seg.lanes === 1 ? 2.8 : 5.1;
  const curbLat = roadHalfW + (seg.lanes === 1 ? 1.15 : 1.55);

  return {
    x: destNode.x + dirX * alongDist + rightX * curbLat,
    y: seg.isBridge || seg.lanes === 1 ? 0.08 : 0.22,
    z: destNode.z + dirZ * alongDist + rightZ * curbLat,
    roadX: destNode.x + dirX * alongDist + rightX * Math.max(1.2, roadHalfW * 0.55),
    roadZ: destNode.z + dirZ * alongDist + rightZ * Math.max(1.2, roadHalfW * 0.55)
  };
}

// Module-level reusable math helpers (zero GC inside animation loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _skyColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _dayColor = new THREE.Color(0x7dd3fc);
const _dawnColor = new THREE.Color(0xfdba74);
const _sunsetColor = new THREE.Color(0xfb7185);
const _nightColor = new THREE.Color(0x090d1a);
const _sunWarm = new THREE.Color(0xfffbeb);
const _sunSunset = new THREE.Color(0xfb923c);
const _moonCool = new THREE.Color(0x64748b);

export const GameViewport: React.FC<GameViewportProps> = ({
  cityId,
  activeVehicleId,
  garage,
  activeRide,
  weather,
  timeOfDayOverride,
  cameraMode,
  isTitleMode,
  isPaused,
  controlsRef,
  soundEngine,
  customerOverheadSpeech,
  onTelemetry,
  onViolation,
  onReachedPickup,
  onReachedDropoff,
  onNpcSpeech
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Sync latest React props to refs so WebGL loop never restarts
  const propsRef = useRef({
    cityId,
    activeVehicleId,
    garage,
    activeRide,
    weather,
    timeOfDayOverride,
    cameraMode,
    isTitleMode,
    isPaused,
    customerOverheadSpeech,
    onTelemetry,
    onViolation,
    onReachedPickup,
    onReachedDropoff,
    onNpcSpeech
  });
  propsRef.current = {
    cityId,
    activeVehicleId,
    garage,
    activeRide,
    weather,
    timeOfDayOverride,
    cameraMode,
    isTitleMode,
    isPaused,
    customerOverheadSpeech,
    onTelemetry,
    onViolation,
    onReachedPickup,
    onReachedDropoff,
    onNpcSpeech
  };

  // Trigger flags when city or car changes
  const rebuildCityFlagRef = useRef<CityId | null>(null);
  const rebuildCarKeyRef = useRef<string>('');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7dd3fc);
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0028);

    const camera = new THREE.PerspectiveCamera(
      60,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.3,
      900
    );

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x334155, 0.75);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(120, 180, 90);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const d = 95;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 420;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // 3D On-Road Animated Navigation Guide Ribbon (Nét điều hướng chỉ đường trên mặt đường) + Target Beacon
    const navCanvas = document.createElement('canvas');
    navCanvas.width = 128;
    navCanvas.height = 256;
    const navCtx = navCanvas.getContext('2d')!;
    navCtx.clearRect(0, 0, 128, 256);
    // Soft translucent glow lane band
    navCtx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    navCtx.fillRect(14, 0, 100, 256);
    // Crisp glowing side guide rails
    navCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    navCtx.fillRect(14, 0, 9, 256);
    navCtx.fillRect(105, 0, 9, 256);
    // Bold forward chevron arrows pointing along direction of travel (top = forward)
    navCtx.fillStyle = '#ffffff';
    for (const cy of [42, 170]) {
      navCtx.beginPath();
      navCtx.moveTo(64, cy - 26);
      navCtx.lineTo(100, cy + 26);
      navCtx.lineTo(82, cy + 26);
      navCtx.lineTo(64, cy);
      navCtx.lineTo(46, cy + 26);
      navCtx.lineTo(28, cy + 26);
      navCtx.closePath();
      navCtx.fill();
    }

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const gpsTex = new THREE.CanvasTexture(navCanvas);
    gpsTex.colorSpace = THREE.SRGBColorSpace;
    gpsTex.wrapS = THREE.RepeatWrapping;
    gpsTex.wrapT = THREE.RepeatWrapping;
    gpsTex.anisotropy = maxAniso;

    const gpsLeadTex = gpsTex.clone();
    gpsLeadTex.needsUpdate = true;
    gpsLeadTex.wrapS = THREE.RepeatWrapping;
    gpsLeadTex.wrapT = THREE.RepeatWrapping;
    gpsLeadTex.anisotropy = maxAniso;

    const gpsMat = new THREE.MeshBasicMaterial({
      map: gpsTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const gpsLeadMat = new THREE.MeshBasicMaterial({
      map: gpsLeadTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const gpsGroup = new THREE.Group();
    gpsGroup.renderOrder = 3;
    scene.add(gpsGroup);

    // Dynamic leading GPS strip connecting taxi position directly onto the road path ahead
    const gpsLeadGeo = new THREE.PlaneGeometry(1.75, 1);
    const gpsLeadStrip = new THREE.Mesh(gpsLeadGeo, gpsLeadMat);
    gpsLeadStrip.rotation.order = 'YXZ';
    gpsLeadStrip.rotation.x = -Math.PI / 2;
    gpsLeadStrip.renderOrder = 3;
    gpsLeadStrip.visible = false;
    scene.add(gpsLeadStrip);

    const beaconGroup = new THREE.Group();
    const beaconRingMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: new THREE.Color(0x22c55e),
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const beaconRing = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.2, 32), beaconRingMat);
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.22;
    const beaconPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 2.2, 16, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beaconPillar.position.y = 8;
    beaconGroup.add(beaconRing, beaconPillar);
    beaconGroup.visible = false;
    scene.add(beaconGroup);

    // 3D Waiting Passenger Model with articulated limbs + Overhead Speech Bubble
    const passengerGroup = new THREE.Group();
    const pSkinMat = new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.6 });
    const pShirtMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.3, roughness: 0.5 });
    const pPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const pHairMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.88 });
    const pBagMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), pSkinMat);
    pHead.position.y = 1.56;
    const pHair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), pHairMat);
    pHair.position.y = 1.58;
    const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), pShirtMat);
    pTorso.position.y = 1.1;
    pTorso.castShadow = true;

    const pLegGeo = new THREE.BoxGeometry(0.15, 0.72, 0.17);
    const pLeftLegPivot = new THREE.Group();
    pLeftLegPivot.position.set(-0.11, 0.78, 0);
    const pLeftLeg = new THREE.Mesh(pLegGeo, pPantsMat);
    pLeftLeg.position.y = -0.36;
    pLeftLegPivot.add(pLeftLeg);

    const pRightLegPivot = new THREE.Group();
    pRightLegPivot.position.set(0.11, 0.78, 0);
    const pRightLeg = new THREE.Mesh(pLegGeo, pPantsMat);
    pRightLeg.position.y = -0.36;
    pRightLegPivot.add(pRightLeg);

    const pArmGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    const pLeftArmPivot = new THREE.Group();
    pLeftArmPivot.position.set(-0.28, 1.32, 0);
    const pLeftArm = new THREE.Mesh(pArmGeo, pSkinMat);
    pLeftArm.position.y = -0.23;
    pLeftArmPivot.add(pLeftArm);

    const pRightArmPivot = new THREE.Group();
    pRightArmPivot.position.set(0.28, 1.32, 0);
    const pRightArm = new THREE.Mesh(pArmGeo, pSkinMat);
    pRightArm.position.y = -0.23;
    pRightArmPivot.add(pRightArm);

    const pSuitcase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.18), pBagMat);
    pSuitcase.position.set(-0.42, 0.22, 0.04);
    const pMarkerMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const pMarker = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), pMarkerMat);
    pMarker.position.set(0, 2.32, 0);
    const passengerWaitBubble = createSpeechBubbleRig(0.95);
    passengerWaitBubble.sprite.position.set(0, 2.68, 0);
    passengerGroup.add(
      pHead,
      pHair,
      pTorso,
      pLeftLegPivot,
      pRightLegPivot,
      pLeftArmPivot,
      pRightArmPivot,
      pSuitcase,
      pMarker,
      passengerWaitBubble.sprite
    );
    passengerGroup.visible = false;
    scene.add(passengerGroup);

    // 3D Overhead Speech Bubbles for Passenger inside Taxi & Nearby NPCs
    const carPassengerBubble = createSpeechBubbleRig(1.0);
    scene.add(carPassengerBubble.sprite);
    const npcBubbleRig = createSpeechBubbleRig(0.92);
    scene.add(npcBubbleRig.sprite);

    // Rain particle system
    const rainCount = 900;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 140;
      rainPositions[i * 3 + 1] = Math.random() * 50;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.42,
      transparent: true,
      opacity: 0.65
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.visible = false;
    scene.add(rainPoints);

    // Mutable Simulation State
    let currentCityAssets: CitySceneAssets | null = null;
    let currentCityData = getCityMap(propsRef.current.cityId);
    let currentNodeMap = getNodeMap(currentCityData);
    let carRig: CarRig | null = null;
    const aiAgents: AiCarAgent[] = [];
    const pedestrianAgents: PedestrianAgent[] = [];
    let dynamicTrafficLevel: TrafficLevel = 'medium';
    let trafficShiftTimer = 24 + Math.random() * 16;

    const playerState = {
      x: 155,
      z: 35,
      heading: 0, // 0 = -Z (North)
      speedMs: 0,
      steerAngle: 0,
      wheelSpin: 0,
      pitch: 0,
      roll: 0,
      cameraShake: 0,
      timeOfDayHours: 9.5, // Start morning in Hanoi
      violationCooldown: 0,
      collisionCooldown: 0,
      redLightCooldown: 0,
      wrongWayTimer: 0,
      npcSpeechCooldown: 2.5,
      lastPickupBubbleRideId: '',
      lastRouteKey: ''
    };

    const signalTracker = {
      activeSide: 'none' as 'none' | 'left' | 'right',
      armed: false,
      peakWheelDeg: 0,
      cumulativeHeadingRad: 0,
      peakHeadingInDirRad: 0,
      straightHoldSec: 0,
      elapsedSec: 0,
      lastHeading: 0
    };

    const resetSignalTracker = (side: 'none' | 'left' | 'right', heading: number) => {
      signalTracker.activeSide = side;
      signalTracker.armed = false;
      signalTracker.peakWheelDeg = 0;
      signalTracker.cumulativeHeadingRad = 0;
      signalTracker.peakHeadingInDirRad = 0;
      signalTracker.straightHoldSec = 0;
      signalTracker.elapsedSec = 0;
      signalTracker.lastHeading = heading;
    };

    let activeNpcTarget: {
      kind: 'ped' | 'ai';
      index: number;
      speaker: string;
      role: SpeechRole;
      text: string;
      until: number;
    } | null = null;
    let simElapsed = 0;

    const boardingState = {
      active: false,
      rideId: '',
      x: 0,
      y: 0.22,
      z: 0,
      walkPhase: 0,
      elapsed: 0
    };

    const spawnPlayerAtCityStart = (cityIdVal: CityId) => {
      // Spawn near iconic starting landmark
      if (cityIdVal === 'hanoi') {
        playerState.x = 155;
        playerState.z = 25;
        playerState.heading = 0;
      } else if (cityIdVal === 'hcmc') {
        playerState.x = 70;
        playerState.z = 55;
        playerState.heading = 0;
      } else {
        playerState.x = -15;
        playerState.z = 55;
        playerState.heading = 0;
      }
      playerState.speedMs = 0;
      playerState.steerAngle = 0;
    };

    const rebuildCity = (newCityId: CityId) => {
      if (currentCityAssets) {
        scene.remove(currentCityAssets.root);
        currentCityAssets.dispose();
        currentCityAssets = null;
      }
      // Remove old AI agents & pedestrians
      for (const ag of aiAgents) scene.remove(ag.mesh);
      aiAgents.length = 0;
      for (const ped of pedestrianAgents) scene.remove(ped.rig.group);
      pedestrianAgents.length = 0;

      currentCityData = getCityMap(newCityId);
      currentNodeMap = getNodeMap(currentCityData);
      currentCityAssets = buildCityEnvironment(currentCityData, renderer.capabilities.getMaxAnisotropy());
      scene.add(currentCityAssets.root);
      spawnPlayerAtCityStart(newCityId);
      controlsRef.current.leftSignal = false;
      controlsRef.current.rightSignal = false;
      resetSignalTracker('none', playerState.heading);

      // Spawn AI Cars, Trucks, Container Trucks, NPC Motorbikes & 3 Patrolling CSGT Police Cars
      const trafficColors = [0xe2e8f0, 0x3b82f6, 0xef4444, 0xf97316, 0x10b981, 0x64748b, 0xfacc15, 0x0284c7];
      const motoColors = [0xef4444, 0x0ea5e9, 0x10b981, 0xf59e0b, 0xf8fafc, 0x1e293b];
      const helmetColors = [0xffffff, 0xfacc15, 0x38bdf8, 0xf43f5e, 0x22c55e];
      const mainRoadSegs = currentCityData.segments.filter((s) => s.lanes >= 2);
      const wideRoadSegs = currentCityData.segments.filter((s) => s.lanes >= 4);
      const totalVehicles = 22;
      const totalMotorbikes = 16;
      const totalPolice = 3;

      for (let i = 0; i < totalVehicles + totalMotorbikes + totalPolice; i++) {
        const isPolice = i >= totalVehicles + totalMotorbikes;
        const isMotorbike = !isPolice && i >= totalVehicles;

        let vehicleKind: AiCarAgent['vehicleKind'] = 'sedan';
        let carVariant: TrafficVehicleType = 'sedan';
        let halfLength = 1.65;
        let halfWidth = 0.85;
        if (isPolice) {
          vehicleKind = 'police';
          halfLength = 1.7;
          halfWidth = 0.82;
        } else if (isMotorbike) {
          vehicleKind = 'motorbike';
          halfLength = 0.85;
          halfWidth = 0.42;
        } else if (i % 7 === 0 && wideRoadSegs.length > 0) {
          carVariant = 'container';
          vehicleKind = 'container';
          halfLength = 3.9;
          halfWidth = 1.05;
        } else if (i % 5 === 2) {
          carVariant = 'truck';
          vehicleKind = 'truck';
          halfLength = 2.2;
          halfWidth = 0.96;
        } else {
          const carVariants: TrafficVehicleType[] = ['sedan', 'hatchback', 'suv'];
          carVariant = carVariants[i % carVariants.length];
          vehicleKind = carVariant;
          halfLength = carVariant === 'hatchback' ? 1.5 : 1.72;
          halfWidth = 0.82;
        }

        const pool =
          vehicleKind === 'motorbike'
            ? currentCityData.segments
            : vehicleKind === 'container' && wideRoadSegs.length > 0
            ? wideRoadSegs
            : mainRoadSegs;
        const seg = pool[(i * 3) % pool.length];
        const a = currentNodeMap.get(seg.from)!;
        const b = currentNodeMap.get(seg.to)!;
        let mesh: THREE.Group;
        let policeRig: PoliceRig | undefined;
        if (isPolice) {
          policeRig = buildPoliceCarMesh();
          mesh = policeRig.group;
        } else if (isMotorbike) {
          mesh = buildMotorbikeNpcMesh(
            motoColors[i % motoColors.length],
            helmetColors[i % helmetColors.length]
          );
        } else {
          mesh = buildTrafficCarMesh(trafficColors[i % trafficColors.length], carVariant);
        }
        scene.add(mesh);
        const isHeavy = vehicleKind === 'container' || vehicleKind === 'truck';
        const laneOff = getAgentLaneOffset(seg.lanes, isMotorbike, isHeavy);
        const baseSpeed = isPolice
          ? 9.2
          : isMotorbike
          ? 7.4 + (i % 5) * 0.95
          : vehicleKind === 'container'
          ? 4.1 + (i % 2) * 0.45
          : vehicleKind === 'truck'
          ? 4.8 + (i % 3) * 0.55
          : 5.5 + (i % 4) * 1.15;
        aiAgents.push({
          mesh,
          fromId: seg.from,
          toId: seg.to,
          t: (i * 0.13) % 0.9,
          speed: baseSpeed,
          baseSpeed,
          laneOffset: laneOff,
          currentLaneOffset: laneOff,
          overtakeState: 'none',
          overtakeTargetIdx: null,
          overtakePassOffset: laneOff,
          x: a.x,
          z: a.z,
          heading: Math.atan2(-(b.x - a.x), -(b.z - a.z)),
          isPolice,
          isMotorbike,
          vehicleKind,
          halfLength,
          halfWidth,
          policeRig
        });
      }

      // Spawn Crosswalk Pedestrians & Longitudinal Sidewalk NPCs
      const pedNodes = currentCityData.nodes.filter((n) => {
        if (n.hasTrafficLight) return true;
        return currentCityData.segments.some((s) => (s.from === n.id || s.to === n.id) && s.lanes >= 2);
      });
      const shirtColors = [0xf43f5e, 0x38bdf8, 0xfacc15, 0x22c55e, 0xa855f7, 0xf97316, 0xf8fafc];
      const pantsColors = [0x1e293b, 0x334155, 0x0f172a, 0x3f3f46];
      const totalCrosswalkPeds = Math.min(24, pedNodes.length * 2);
      for (let i = 0; i < totalCrosswalkPeds; i++) {
        const node = pedNodes[i % pedNodes.length];
        const maxLanes = currentCityData.segments.reduce(
          (mx, s) => ((s.from === node.id || s.to === node.id) && s.lanes > mx ? s.lanes : mx),
          2
        );
        const isSix = maxLanes >= 6;
        const rig = buildPedestrianMesh(
          shirtColors[i % shirtColors.length],
          pantsColors[i % pantsColors.length]
        );
        scene.add(rig.group);
        const axis: 'ns' | 'ew' = i % 2 === 0 ? 'ns' : 'ew';
        const cwDist = isSix ? 11.4 : 8.4;
        const crosswalkOffset = i % 4 < 2 ? -cwDist : cwDist;
        const crossHalfSpan = isSix ? 10.2 : 7.4;
        const progress = ((i * 0.37) % 2) - 1;
        pedestrianAgents.push({
          kind: 'crosswalk',
          rig,
          nodeId: node.id,
          hasTrafficLight: Boolean(node.hasTrafficLight),
          axis,
          crosswalkOffset,
          crossHalfSpan,
          progress,
          dir: i % 2 === 0 ? 1 : -1,
          speed: 1.15 + (i % 3) * 0.25,
          walkPhase: i * 0.9,
          x: node.x,
          y: 0.08,
          z: node.z
        });
      }

      // Sidewalk Strolling NPCs (đi bộ trên vỉa hè dọc các tuyến phố)
      const sidewalkSegs = currentCityData.segments.filter((s) => !s.isBridge && s.lanes >= 2);
      const getNodeClear = (nodeId: string) => {
        let mx = 2;
        for (const s of currentCityData.segments) {
          if ((s.from === nodeId || s.to === nodeId) && s.lanes > mx) mx = s.lanes;
        }
        return mx >= 6 ? 12.2 : 9.6;
      };
      const totalSidewalkPeds = Math.min(44, sidewalkSegs.length * 2);
      for (let i = 0; i < totalSidewalkPeds; i++) {
        const seg = sidewalkSegs[(i * 2) % sidewalkSegs.length];
        const a = currentNodeMap.get(seg.from);
        const b = currentNodeMap.get(seg.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        const startD = getNodeClear(seg.from) + 2.5;
        const endD = len - getNodeClear(seg.to) - 2.5;
        if (endD - startD < 10) continue;

        const dirX = dx / len;
        const dirZ = dz / len;
        const side = i % 2 === 0 ? 1 : -1;
        const rW = seg.lanes >= 6 ? 21.5 : seg.lanes >= 4 ? 16.5 : seg.lanes === 3 ? 13.5 : 10.2;
        const lateral = side * (rW * 0.5 + 1.2);
        const dInit = startD + ((i * 19.7) % (endD - startD));

        const rig = buildPedestrianMesh(
          shirtColors[(i + 3) % shirtColors.length],
          pantsColors[(i + 1) % pantsColors.length]
        );
        scene.add(rig.group);

        const rightX = -dirZ;
        const rightZ = dirX;
        pedestrianAgents.push({
          kind: 'sidewalk',
          rig,
          nodeId: seg.from,
          hasTrafficLight: false,
          axis: 'ns',
          crosswalkOffset: 0,
          crossHalfSpan: 1,
          progress: 0,
          dir: i % 3 === 0 ? -1 : 1,
          speed: 1.05 + (i % 4) * 0.22,
          walkPhase: i * 1.3,
          x: a.x + dirX * dInit + rightX * lateral,
          y: 0.22,
          z: a.z + dirZ * dInit + rightZ * lateral,
          ax: a.x,
          az: a.z,
          dirX,
          dirZ,
          startD,
          endD,
          d: dInit,
          lateral
        });
      }

      boardingState.active = false;
      boardingState.rideId = '';
      rebuildCityFlagRef.current = newCityId;
    };

    const rebuildPlayerCar = () => {
      const { activeVehicleId: vId, garage: g } = propsRef.current;
      const spec = getVehicleSpec(vId);
      const vState = g[vId] || {
        specId: vId,
        owned: false,
        rented: true,
        upgrades: { engine: 0, brakes: 0, suspension: 0, tires: 0 },
        appearance: {
          color: spec.defaultColor,
          rimStyle: 'standard',
          roofSign: spec.isElectric ? 'green_ev' : 'classic_yellow',
          spoiler: false,
          windowTint: 0
        }
      };
      const key = `${vId}_${JSON.stringify(vState.appearance)}`;
      if (key === rebuildCarKeyRef.current && carRig) return;
      rebuildCarKeyRef.current = key;

      if (carRig) {
        scene.remove(carRig.group);
      }
      carRig = buildPlayerCarMesh(spec, vState, !isSoftwareGl);
      carRig.group.position.set(playerState.x, 0, playerState.z);
      carRig.group.rotation.y = playerState.heading;
      scene.add(carRig.group);
    };

    const rebuildGpsVisuals = (routeNodeIds: string[]) => {
      while (gpsGroup.children.length > 0) {
        const child = gpsGroup.children.pop() as THREE.Mesh;
        child.geometry.dispose();
      }
      if (routeNodeIds.length < 2) return;

      for (let i = 0; i < routeNodeIds.length - 1; i++) {
        const a = currentNodeMap.get(routeNodeIds[i]);
        const b = currentNodeMap.get(routeNodeIds[i + 1]);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;

        const segMatch = currentCityData.segments.find(
          (s) =>
            (s.from === routeNodeIds[i] && s.to === routeNodeIds[i + 1]) ||
            (s.to === routeNodeIds[i] && s.from === routeNodeIds[i + 1])
        );
        const stripY = segMatch?.isBridge ? 0.31 : 0.14;

        const stripGeo = new THREE.PlaneGeometry(1.75, len);
        const uvAttr = stripGeo.attributes.uv;
        const repeatV = Math.max(1, len / 6.5);
        for (let k = 0; k < uvAttr.count; k++) {
          uvAttr.setY(k, uvAttr.getY(k) * repeatV);
        }
        uvAttr.needsUpdate = true;

        const strip = new THREE.Mesh(stripGeo, gpsMat);
        strip.rotation.order = 'YXZ';
        strip.rotation.y = Math.atan2(-dx, -dz);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set((a.x + b.x) * 0.5, stripY, (a.z + b.z) * 0.5);
        gpsGroup.add(strip);
      }
    };

    // Initial build
    rebuildCity(propsRef.current.cityId);
    rebuildPlayerCar();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let trafficCycleTimer = 0;
    let telemetryAccumulator = 0;
    let blinkTimer = 0;
    let titleOrbitAngle = 0;

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      simElapsed += dt;

      const {
        cityId: targetCity,
        activeVehicleId: vId,
        garage: g,
        activeRide: ride,
        weather: curWeather,
        timeOfDayOverride: manualHour,
        cameraMode: camMode,
        isTitleMode: titleMode,
        isPaused: paused,
        customerOverheadSpeech: custSpeech,
        onTelemetry: emitTelemetry,
        onViolation: emitViolation,
        onReachedPickup: reachPickup,
        onReachedDropoff: reachDropoff,
        onNpcSpeech: emitNpcSpeech
      } = propsRef.current;

      if (rebuildCityFlagRef.current !== targetCity) {
        rebuildCity(targetCity);
      }
      rebuildPlayerCar();

      // 1. Update Time of Day & Lighting / Weather (calmer day/night pace)
      if (manualHour !== null) {
        playerState.timeOfDayHours = manualHour;
      } else if (!paused) {
        playerState.timeOfDayHours = (playerState.timeOfDayHours + dt * 0.032) % 24;
      }
      const hour = playerState.timeOfDayHours;
      const isNight = hour < 6.0 || hour > 18.5;

      // Sky & Fog interpolation
      if (hour >= 5.5 && hour < 7.5) {
        const t = (hour - 5.5) / 2.0;
        _skyColor.copy(_nightColor).lerp(_dawnColor, t);
      } else if (hour >= 7.5 && hour < 16.5) {
        const t = Math.min(1, (hour - 7.5) / 1.5);
        _skyColor.copy(_dawnColor).lerp(_dayColor, t);
      } else if (hour >= 16.5 && hour < 19.0) {
        const t = (hour - 16.5) / 2.5;
        _skyColor.copy(_dayColor).lerp(_sunsetColor, Math.sin(t * Math.PI * 0.5));
        if (t > 0.55) _skyColor.lerp(_nightColor, (t - 0.55) / 0.45);
      } else {
        _skyColor.copy(_nightColor);
      }

      if (curWeather === 'rain' || curWeather === 'cloudy') {
        _skyColor.lerp(new THREE.Color(isNight ? 0x0f172a : 0x64748b), 0.52);
      } else if (curWeather === 'fog') {
        _skyColor.lerp(new THREE.Color(isNight ? 0x1e293b : 0xcbd5e1), 0.65);
      }

      (scene.background as THREE.Color).copy(_skyColor);
      _fogColor.copy(_skyColor);
      const fogDensity =
        curWeather === 'fog' ? 0.0095 : curWeather === 'rain' ? 0.0052 : isNight ? 0.0036 : 0.0024;
      (scene.fog as THREE.FogExp2).color.copy(_fogColor);
      (scene.fog as THREE.FogExp2).density = fogDensity;

      // Sun arc
      const sunAngle = ((hour - 6) / 12) * Math.PI;
      const sunElev = Math.sin(sunAngle);
      sunLight.position.set(
        playerState.x + Math.cos(sunAngle) * 160,
        Math.max(25, sunElev * 180),
        playerState.z + 90
      );
      sunLight.target.position.set(playerState.x, 0, playerState.z);
      if (isNight) {
        sunLight.color.copy(_moonCool);
        sunLight.intensity = 0.55;
        hemiLight.intensity = 0.42;
      } else if (hour > 16.5 || hour < 7.2) {
        sunLight.color.copy(_sunSunset);
        sunLight.intensity = 1.45;
        hemiLight.intensity = 0.65;
      } else {
        sunLight.color.copy(_sunWarm);
        sunLight.intensity = curWeather === 'rain' || curWeather === 'cloudy' ? 1.15 : 1.85;
        hemiLight.intensity = 0.8;
      }

      if (currentCityAssets) {
        const winEmissive = isNight ? 0.85 : 0.04;
        for (const m of currentCityAssets.buildingWindowMats) {
          m.emissiveIntensity = winEmissive;
        }
        currentCityAssets.roadMaterial.roughness = curWeather === 'rain' ? 0.25 : 0.78;
        currentCityAssets.roadMaterial.metalness = curWeather === 'rain' ? 0.28 : 0.08;
      }

      // Rain particles
      rainPoints.visible = curWeather === 'rain';
      if (rainPoints.visible && !paused) {
        rainPoints.position.set(playerState.x, 0, playerState.z);
        const posArr = rainGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          posArr[i * 3 + 1] -= dt * 42;
          if (posArr[i * 3 + 1] < 0) posArr[i * 3 + 1] = 48 + Math.random() * 6;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // 2. Traffic Light Cycle (44s calmer cycle: NS green 18s, NS yellow 4s, NS red 22s; EW red 22s, EW green 18s, EW yellow 4s)
      if (!paused) {
        trafficCycleTimer = (trafficCycleTimer + dt) % 44;
      }
      const nsState: 'green' | 'yellow' | 'red' =
        trafficCycleTimer < 18 ? 'green' : trafficCycleTimer < 22 ? 'yellow' : 'red';
      const nsRemainingSec =
        trafficCycleTimer < 18
          ? Math.max(1, Math.ceil(18 - trafficCycleTimer))
          : trafficCycleTimer < 22
          ? Math.max(1, Math.ceil(22 - trafficCycleTimer))
          : Math.max(1, Math.ceil(44 - trafficCycleTimer));

      const ewState: 'green' | 'yellow' | 'red' =
        trafficCycleTimer < 22 ? 'red' : trafficCycleTimer < 40 ? 'green' : 'yellow';
      const ewRemainingSec =
        trafficCycleTimer < 22
          ? Math.max(1, Math.ceil(22 - trafficCycleTimer))
          : trafficCycleTimer < 40
          ? Math.max(1, Math.ceil(40 - trafficCycleTimer))
          : Math.max(1, Math.ceil(44 - trafficCycleTimer));

      if (currentCityAssets) {
        currentCityAssets.updateTrafficTimers(nsState, nsRemainingSec, ewState, ewRemainingSec);
        for (const tl of currentCityAssets.trafficLights) {
          tl.nsGreen.emissiveIntensity = nsState === 'green' ? 2.4 : 0;
          tl.nsYellow.emissiveIntensity = nsState === 'yellow' ? 2.4 : 0;
          tl.nsRed.emissiveIntensity = nsState === 'red' ? 2.4 : 0;
          tl.ewGreen.emissiveIntensity = ewState === 'green' ? 2.4 : 0;
          tl.ewYellow.emissiveIntensity = ewState === 'yellow' ? 2.4 : 0;
          tl.ewRed.emissiveIntensity = ewState === 'red' ? 2.4 : 0;
        }
      }

      // 3. Player Driving Physics (calmer pace + progressive light/heavy gas & light/hard brake)
      const spec = getVehicleSpec(vId);
      const vState = g[vId];
      const upg = vState?.upgrades || { engine: 0, brakes: 0, suspension: 0, tires: 0 };

      const maxSpeedKmh = spec.topSpeedKmh * 0.85 * (1 + upg.engine * 0.085);
      const maxSpeedMs = maxSpeedKmh / 3.6;
      const accelPower = (spec.horsepower / spec.weightKg) * 58 * (1 + upg.engine * 0.11);
      const brakePower = (22 + upg.brakes * 4.0) * (curWeather === 'rain' ? 0.78 : 1.0);
      const gripFactor = (1 + upg.tires * 0.14) * (curWeather === 'rain' ? 0.85 : 1.0);

      const ctrl = controlsRef.current;
      blinkTimer += dt;
      const blinkOn = Math.floor(blinkTimer * 2.8) % 2 === 0;

      if (!titleMode && !paused) {
        playerState.violationCooldown = Math.max(0, playerState.violationCooldown - dt);
        playerState.collisionCooldown = Math.max(0, playerState.collisionCooldown - dt);
        playerState.redLightCooldown = Math.max(0, playerState.redLightCooldown - dt);
        playerState.npcSpeechCooldown = Math.max(0, playerState.npcSpeechCooldown - dt);
        playerState.cameraShake = Math.max(0, playerState.cameraShake - dt * 2.5);

        // 2-Rotation Steering Wheel (-720° to +720°) + Automatic Self-Centering Return
        if (!ctrl.virtualWheelActive) {
          if (ctrl.keyboardSteerDir !== 0) {
            const targetDeg = ctrl.keyboardSteerDir * 720;
            ctrl.steerWheelDeg = THREE.MathUtils.damp(ctrl.steerWheelDeg, targetDeg, 3.2, dt);
          } else {
            // Auto self-centering return (caster effect: brisker when moving, gentle when stopped)
            const speedFactor = Math.min(1, Math.abs(playerState.speedMs) / 10);
            const returnLambda = 3.2 + speedFactor * 5.2;
            ctrl.steerWheelDeg = THREE.MathUtils.damp(ctrl.steerWheelDeg, 0, returnLambda, dt);
            if (Math.abs(ctrl.steerWheelDeg) < 0.8) ctrl.steerWheelDeg = 0;
          }
        }
        ctrl.steerWheelDeg = THREE.MathUtils.clamp(ctrl.steerWheelDeg, -720, 720);
        const rawNorm = ctrl.steerWheelDeg / 720;
        ctrl.steerInput = rawNorm;

        // Progressive non-linear steering curve for easy lane-keeping + full 2-turn lock
        const curvedSteer = Math.sign(rawNorm) * Math.pow(Math.abs(rawNorm), 1.32);
        const speedKmhTemp = Math.abs(playerState.speedMs) * 3.6;
        const highSpeedStability = 1 / (1 + Math.pow(speedKmhTemp / 95, 2) * 0.65);
        const targetFrontAngle = curvedSteer * 0.56 * highSpeedStability;
        playerState.steerAngle = THREE.MathUtils.damp(playerState.steerAngle, targetFrontAngle, 12 * gripFactor, dt);

        // Longitudinal acceleration / braking (light vs heavy throttle, light vs hard emergency brake)
        const isReverse = ctrl.gear === 'R';
        if (ctrl.brake > 0.05) {
          const isHardBrake = ctrl.brake >= 0.78;
          const decel = brakePower * (isHardBrake ? 1.38 : 0.65) * ctrl.brake * dt;
          if (Math.abs(playerState.speedMs) <= decel) {
            playerState.speedMs = 0;
          } else {
            playerState.speedMs -= Math.sign(playerState.speedMs) * decel;
          }
        } else if (ctrl.throttle > 0.05) {
          const throttleForce = Math.pow(ctrl.throttle, 1.35);
          if (!isReverse) {
            // Forward in D
            const speedRatio = Math.max(0, playerState.speedMs) / maxSpeedMs;
            const torqueCurve = Math.max(0.22, 1 - speedRatio * 0.75);
            playerState.speedMs = Math.min(maxSpeedMs, playerState.speedMs + accelPower * torqueCurve * throttleForce * dt);
          } else {
            // Reverse in R
            const maxRev = 9.5;
            playerState.speedMs = Math.max(-maxRev, playerState.speedMs - accelPower * 0.72 * throttleForce * dt);
          }
        } else {
          // Coasting aerodynamic & rolling drag
          const drag = (0.85 + Math.abs(playerState.speedMs) * 0.045) * dt;
          if (Math.abs(playerState.speedMs) <= drag) playerState.speedMs = 0;
          else playerState.speedMs -= Math.sign(playerState.speedMs) * drag;
        }

        // Smooth Ackermann bicycle turning model
        const speedKmhNow = Math.abs(playerState.speedMs) * 3.6;
        if (Math.abs(playerState.speedMs) > 0.15) {
          const wheelbase = 2.65;
          const angularVel = (playerState.speedMs / wheelbase) * Math.tan(playerState.steerAngle);
          playerState.heading -= angularVel * dt;
        }

        // Auto-cancel turn signal after completing a turn or lane change
        const desiredSide: 'none' | 'left' | 'right' = ctrl.leftSignal
          ? 'left'
          : ctrl.rightSignal
          ? 'right'
          : 'none';
        if (desiredSide !== signalTracker.activeSide) {
          resetSignalTracker(desiredSide, playerState.heading);
        } else if (desiredSide !== 'none') {
          signalTracker.elapsedSec += dt;
          const dHeading = Math.atan2(
            Math.sin(playerState.heading - signalTracker.lastHeading),
            Math.cos(playerState.heading - signalTracker.lastHeading)
          );
          signalTracker.lastHeading = playerState.heading;
          if (Math.abs(playerState.speedMs) > 0.35) {
            signalTracker.cumulativeHeadingRad += dHeading;
          }

          const wheelInDir = desiredSide === 'left' ? -ctrl.steerWheelDeg : ctrl.steerWheelDeg;
          const headingInDirRad =
            desiredSide === 'left' ? signalTracker.cumulativeHeadingRad : -signalTracker.cumulativeHeadingRad;

          if (Math.abs(playerState.speedMs) > 0.6) {
            signalTracker.peakWheelDeg = Math.max(signalTracker.peakWheelDeg, wheelInDir);
            signalTracker.peakHeadingInDirRad = Math.max(signalTracker.peakHeadingInDirRad, headingInDirRad);
          }

          if (
            !signalTracker.armed &&
            (signalTracker.peakWheelDeg >= 105 || signalTracker.peakHeadingInDirRad >= 0.26)
          ) {
            signalTracker.armed = true;
          }

          if (signalTracker.armed && Math.abs(playerState.speedMs) > 0.7) {
            const absWheel = Math.abs(ctrl.steerWheelDeg);
            const wheelStraight = absWheel <= 55 && ctrl.keyboardSteerDir === 0;
            if (wheelStraight) {
              signalTracker.straightHoldSec += dt;
            } else {
              signalTracker.straightHoldSec = 0;
            }

            const cornerCompleted =
              signalTracker.peakHeadingInDirRad >= 0.58 && signalTracker.straightHoldSec >= 0.12;
            const laneShiftCompleted = signalTracker.straightHoldSec >= 0.38;
            const deepTurnUnwinding =
              signalTracker.peakHeadingInDirRad >= 1.12 &&
              absWheel <= 95 &&
              Math.abs(wheelInDir) <= 95 &&
              ctrl.keyboardSteerDir === 0;
            const oppositeSteerCancel =
              signalTracker.elapsedSec >= 0.35 &&
              wheelInDir <= -95 &&
              (signalTracker.peakHeadingInDirRad >= 0.22 || signalTracker.peakWheelDeg >= 135);

            if (cornerCompleted || laneShiftCompleted || deepTurnUnwinding || oppositeSteerCancel) {
              ctrl.leftSignal = false;
              ctrl.rightSignal = false;
              resetSignalTracker('none', playerState.heading);
              soundEngine.playSignalCancelClick();
            }
          }
        }

        // Apply motion (heading=0 faces -Z)
        const fx = -Math.sin(playerState.heading);
        const fz = -Math.cos(playerState.heading);
        const nextX = playerState.x + fx * playerState.speedMs * dt;
        const nextZ = playerState.z + fz * playerState.speedMs * dt;

        // World boundary & Building colliders
        const bound = currentCityData.bounds - 8;
        let collided = false;
        let clampedX = THREE.MathUtils.clamp(nextX, -bound, bound);
        let clampedZ = THREE.MathUtils.clamp(nextZ, -bound, bound);
        if (clampedX !== nextX || clampedZ !== nextZ) collided = true;

        const carHalf = 1.05;
        if (currentCityAssets) {
          for (const col of currentCityAssets.colliders) {
            if (
              clampedX + carHalf > col.minX &&
              clampedX - carHalf < col.maxX &&
              clampedZ + carHalf > col.minZ &&
              clampedZ - carHalf < col.maxZ
            ) {
              // Push out along shallowest axis
              const penLeft = clampedX + carHalf - col.minX;
              const penRight = col.maxX - (clampedX - carHalf);
              const penTop = clampedZ + carHalf - col.minZ;
              const penBot = col.maxZ - (clampedZ - carHalf);
              const minPen = Math.min(penLeft, penRight, penTop, penBot);
              if (minPen === penLeft) clampedX = col.minX - carHalf;
              else if (minPen === penRight) clampedX = col.maxX + carHalf;
              else if (minPen === penTop) clampedZ = col.minZ - carHalf;
              else clampedZ = col.maxZ + carHalf;
              collided = true;
            }
          }
        }

        playerState.x = clampedX;
        playerState.z = clampedZ;

        if (collided && Math.abs(playerState.speedMs) > 3.5) {
          playerState.speedMs *= -0.32;
          playerState.cameraShake = 0.42;
          soundEngine.playCollision(0.9);
          if (playerState.collisionCooldown <= 0) {
            playerState.collisionCooldown = 2.5;
            const segInfo = findNearestSegment(currentCityData, playerState.x, playerState.z);
            emitViolation('collision', segInfo.segment.streetName, 200_000);
          }
        }

        // Suspension pitch & roll (sharper nose-dive on emergency brake >= 0.78)
        const targetPitch =
          (ctrl.brake > 0.05
            ? ctrl.brake >= 0.78
              ? -0.068
              : -0.032
            : ctrl.throttle > 0.1
            ? 0.025 + ctrl.throttle * 0.015
            : 0) *
          (1 - upg.suspension * 0.12);
        const targetRoll = (playerState.steerAngle / 0.56) * Math.min(1, speedKmhNow / 65) * 0.065 * (1 - upg.suspension * 0.12);
        playerState.pitch = THREE.MathUtils.damp(playerState.pitch, targetPitch, 8, dt);
        playerState.roll = THREE.MathUtils.damp(playerState.roll, targetRoll, 8, dt);
        playerState.wheelSpin -= (playerState.speedMs / 0.34) * dt;
      }

      // Update Player Car Mesh
      if (carRig) {
        carRig.group.position.set(playerState.x, 0, playerState.z);
        carRig.group.rotation.y = playerState.heading;
        carRig.bodyMesh.rotation.x = playerState.pitch;
        carRig.bodyMesh.rotation.z = playerState.roll;

        // Front wheel steer + all 4 spin
        carRig.wheelPivots[0].rotation.y = -playerState.steerAngle;
        carRig.wheelPivots[1].rotation.y = -playerState.steerAngle;
        for (const sp of carRig.wheelSpinners) {
          sp.rotation.x = playerState.wheelSpin;
        }

        // Brake & Headlights & Turn signals
        const braking = ctrl.brake > 0.1 || ctrl.gear === 'R';
        carRig.brakeLightMat.emissiveIntensity = braking ? 2.4 : 0.45;
        const hlOn = ctrl.headlights || isNight;
        carRig.headlightMat.emissiveIntensity = hlOn ? 2.2 : 0.4;
        if (carRig.headlightSpotL && carRig.headlightSpotR) {
          const spotInt = hlOn ? (isNight ? 48 : 12) : 0;
          carRig.headlightSpotL.intensity = spotInt;
          carRig.headlightSpotR.intensity = spotInt;
        }

        carRig.leftSignalMat.emissiveIntensity = ctrl.leftSignal && blinkOn ? 3.8 : 0;
        carRig.rightSignalMat.emissiveIntensity = ctrl.rightSignal && blinkOn ? 3.8 : 0;
      }

      // 4. Dynamic Random Traffic Density + AI Cars + NPC Motorbikes + CSGT Police
      if (!paused && !titleMode) {
        trafficShiftTimer -= dt;
        if (trafficShiftTimer <= 0) {
          const levels: TrafficLevel[] = ['low', 'medium', 'high'];
          dynamicTrafficLevel = levels[Math.floor(Math.random() * levels.length)];
          trafficShiftTimer = 24 + Math.random() * 18;
        }
      }

      const effectiveTrafficLevel: TrafficLevel = ride ? ride.offer.trafficLevel : dynamicTrafficLevel;
      const trafficFactor =
        effectiveTrafficLevel === 'high' ? 1.0 : effectiveTrafficLevel === 'low' ? 0.42 : 0.72;

      let nearestPoliceDistM: number | null = null;
      let nonPoliceCarCount = 0;
      let motorbikeCount = 0;
      const maxCarsVisible = Math.max(4, Math.round(18 * trafficFactor));
      const maxBikesVisible = Math.max(4, Math.round(16 * trafficFactor));

      for (let i = 0; i < aiAgents.length; i++) {
        const ag = aiAgents[i];
        let visible = true;
        if (ag.isPolice) {
          visible = true;
        } else if (ag.isMotorbike) {
          motorbikeCount++;
          visible = motorbikeCount <= maxBikesVisible;
        } else {
          nonPoliceCarCount++;
          visible = nonPoliceCarCount <= maxCarsVisible;
        }
        ag.mesh.visible = visible;
        if (!visible) continue;

        const fromN = currentNodeMap.get(ag.fromId);
        const toN = currentNodeMap.get(ag.toId);
        if (!fromN || !toN) continue;

        const dx = toN.x - fromN.x;
        const dz = toN.z - fromN.z;
        const segLen = Math.hypot(dx, dz) || 1;
        const dirX = dx / segLen;
        const dirZ = dz / segLen;
        const rightX = -dirZ;
        const rightZ = dirX;
        const isNS = Math.abs(dz) >= Math.abs(dx);
        const currentSeg = currentCityData.segments.find(
          (s) => (s.from === ag.fromId && s.to === ag.toId) || (!s.oneWay && s.to === ag.fromId && s.from === ag.toId)
        );
        const segLanes = currentSeg?.lanes ?? 2;
        const segIsBridge = Boolean(currentSeg?.isBridge);
        const segIsOneWay = Boolean(currentSeg?.oneWay);
        const segLimitMs = currentSeg?.speedLimit ? currentSeg.speedLimit / 3.6 : 15.0;

        let latSteerOffset = 0;

        if (!paused) {
          // 1. Red/Yellow Traffic Light stop check
          let stopAtLight = false;
          const distRemaining = (1 - ag.t) * segLen;
          if (toN.hasTrafficLight && distRemaining < 17 && distRemaining > 7) {
            const lightState = isNS ? nsState : ewState;
            if (lightState === 'red' || lightState === 'yellow') {
              stopAtLight = true;
            }
          }

          // 2. Find nearest vehicle ahead in current lane (same direction on this segment)
          let leadIdx: number | null = null;
          let leadGap = 999;
          let leadSpeed = ag.baseSpeed;

          for (let j = 0; j < aiAgents.length; j++) {
            if (j === i) continue;
            const other = aiAgents[j];
            if (!other.mesh.visible) continue;
            if (other.fromId !== ag.fromId || other.toId !== ag.toId || other.t <= ag.t) continue;
            if (Math.abs(other.currentLaneOffset - ag.currentLaneOffset) < ag.halfWidth + other.halfWidth + 0.55) {
              const gap = (other.t - ag.t) * segLen - (ag.halfLength + other.halfLength);
              if (gap < leadGap) {
                leadGap = gap;
                leadIdx = j;
                leadSpeed = other.speed;
              }
            }
          }

          // Also detect player car if directly ahead in the same lane along this segment
          const relPX = playerState.x - fromN.x;
          const relPZ = playerState.z - fromN.z;
          const pAlong = relPX * dirX + relPZ * dirZ;
          const pLat = relPX * rightX + relPZ * rightZ;
          const playerAheadM = pAlong - ag.t * segLen - (ag.halfLength + 1.55);
          if (
            pAlong > ag.t * segLen &&
            pAlong < segLen - 6 &&
            Math.abs(pLat - ag.currentLaneOffset) < ag.halfWidth + 1.15 &&
            playerAheadM < leadGap
          ) {
            leadGap = playerAheadM;
            leadIdx = -1; // -1 sentinel = player vehicle ahead
            leadSpeed = Math.max(0, playerState.speedMs);
          }

          // 3. Determine lawful passing lane offset (NEVER cross double yellow median; only overtake cleanly!)
          const computeLawfulPassLat = (): number | null => {
            if (segLanes <= 1 || segIsBridge) return null;
            if (ag.vehicleKind === 'container') return null; // Heavy 40ft container stays steady in its outer lane
            if (segLanes >= 4) {
              // Multi-lane divided road: overtake strictly inside the left same-direction lane!
              return Math.max(1.85, ag.laneOffset - (ag.isMotorbike ? 2.4 : 2.3));
            }
            if (segLanes === 3) {
              return Math.max(1.4, ag.laneOffset - 1.95);
            }
            // 2-lane road: cross dashed yellow centerline ONLY if not oneWay (or left lane if oneWay)
            if (segIsOneWay) {
              return Math.max(-1.6, ag.laneOffset - 2.4);
            }
            return ag.isMotorbike ? -0.45 : -2.15;
          };

          const isPassingLaneClear = (passLat: number): boolean => {
            // Check same-direction vehicles in target passing lane
            for (let j = 0; j < aiAgents.length; j++) {
              if (j === i || j === leadIdx) continue;
              const other = aiAgents[j];
              if (!other.mesh.visible) continue;
              if (other.fromId === ag.fromId && other.toId === ag.toId) {
                if (Math.abs(other.currentLaneOffset - passLat) < ag.halfWidth + other.halfWidth + 0.6) {
                  const longDist = (other.t - ag.t) * segLen;
                  if (longDist > -(ag.halfLength + other.halfLength + 6) && longDist < ag.halfLength + other.halfLength + 16) {
                    return false;
                  }
                }
              }
              // Check oncoming traffic if passLat crosses dashed center line (passLat < 0.7) on 2-way road
              if (passLat < 0.7 && !segIsOneWay && other.fromId === ag.toId && other.toId === ag.fromId) {
                const oppPosOnSeg = (1 - other.t) * segLen;
                const headOnDist = oppPosOnSeg - ag.t * segLen;
                if (headOnDist > -6 && headOnDist < 54) {
                  return false;
                }
              }
            }

            // Check player vehicle in passing lane or oncoming if crossing centerline
            if (pAlong > 0 && pAlong < segLen) {
              if (Math.abs(pLat - passLat) < ag.halfWidth + 1.25) {
                const pLong = pAlong - ag.t * segLen;
                if (pLong > -(ag.halfLength + 6) && pLong < ag.halfLength + 18) return false;
              }
              if (passLat < 0.7 && !segIsOneWay && pLat < 0.2) {
                const pLong = pAlong - ag.t * segLen;
                if (pLong > -6 && pLong < 56) return false;
              }
            }
            return true;
          };

          const isRightLaneClearToMerge = (): boolean => {
            for (let j = 0; j < aiAgents.length; j++) {
              if (j === i) continue;
              const other = aiAgents[j];
              if (!other.mesh.visible) continue;
              if (other.fromId === ag.fromId && other.toId === ag.toId) {
                if (Math.abs(other.currentLaneOffset - ag.laneOffset) < ag.halfWidth + other.halfWidth + 0.45) {
                  const longDist = (other.t - ag.t) * segLen;
                  if (longDist > -(ag.halfLength + other.halfLength + 4.0) && longDist < ag.halfLength + other.halfLength + 4.5) {
                    return false;
                  }
                }
              }
            }
            return true;
          };

          // 4. Overtake State Machine
          const safeZoneForNewOvertake =
            ag.t > 0.12 &&
            distRemaining > 28 &&
            (!toN.hasTrafficLight || distRemaining > 34) &&
            !stopAtLight;

          if (ag.overtakeState === 'none') {
            if (
              safeZoneForNewOvertake &&
              leadIdx !== null &&
              leadGap < 12.5 &&
              leadSpeed < ag.baseSpeed * 0.88
            ) {
              const passLat = computeLawfulPassLat();
              if (passLat !== null && isPassingLaneClear(passLat)) {
                ag.overtakeState = 'passing';
                ag.overtakeTargetIdx = leadIdx;
                ag.overtakePassOffset = passLat;
              }
            }
          } else if (ag.overtakeState === 'passing') {
            // Abort safely if intersection/crosswalk is near or oncoming danger appears on 2-way road
            let dangerOncoming = false;
            if (ag.overtakePassOffset < 0.7 && !segIsOneWay) {
              for (let j = 0; j < aiAgents.length; j++) {
                const other = aiAgents[j];
                if (other.mesh.visible && other.fromId === ag.toId && other.toId === ag.fromId) {
                  const headOnDist = (1 - other.t) * segLen - ag.t * segLen;
                  if (headOnDist > -4 && headOnDist < 28) {
                    dangerOncoming = true;
                    break;
                  }
                }
              }
            }

            let passedTarget = false;
            if (ag.overtakeTargetIdx === -1) {
              passedTarget = ag.t * segLen - pAlong > ag.halfLength + 5.5 || pAlong <= 0 || pAlong >= segLen;
            } else if (ag.overtakeTargetIdx !== null) {
              const tgt = aiAgents[ag.overtakeTargetIdx];
              if (!tgt || tgt.fromId !== ag.fromId || tgt.toId !== ag.toId) {
                passedTarget = true;
              } else {
                passedTarget = (ag.t - tgt.t) * segLen > ag.halfLength + tgt.halfLength + 4.8;
              }
            } else {
              passedTarget = true;
            }

            if (distRemaining < 18 || dangerOncoming) {
              if (isRightLaneClearToMerge()) {
                ag.overtakeState = 'returning';
              } else {
                // Slow down to drop safely behind target before returning to right lane
                ag.speed = THREE.MathUtils.damp(ag.speed, Math.max(0, leadSpeed * 0.65), 7.0, dt);
              }
            } else if (passedTarget && isRightLaneClearToMerge()) {
              ag.overtakeState = 'returning';
            }
          } else if (ag.overtakeState === 'returning') {
            if (Math.abs(ag.currentLaneOffset - ag.laneOffset) < 0.16) {
              ag.currentLaneOffset = ag.laneOffset;
              ag.overtakeState = 'none';
              ag.overtakeTargetIdx = null;
            }
          }

          // 5. Smooth Lateral Lane Transition + Subtle Steering Angle
          const targetLat = ag.overtakeState === 'passing' ? ag.overtakePassOffset : ag.laneOffset;
          const prevLat = ag.currentLaneOffset;
          ag.currentLaneOffset = THREE.MathUtils.damp(ag.currentLaneOffset, targetLat, 4.6, dt);
          const latVel = (ag.currentLaneOffset - prevLat) / Math.max(dt, 0.001);
          latSteerOffset = THREE.MathUtils.clamp(latVel * 0.075, -0.22, 0.22);

          // 6. Compute Safe Speed (respect speed limit, traffic light, & vehicle ahead)
          let desiredSpeed =
            ag.overtakeState === 'passing'
              ? Math.min(ag.baseSpeed * 1.28, segLimitMs)
              : Math.min(ag.baseSpeed, segLimitMs);

          if (stopAtLight) {
            desiredSpeed = 0;
          } else if (leadIdx !== null) {
            const minGap = ag.isMotorbike ? 2.4 : 3.4;
            if (leadGap < minGap) {
              desiredSpeed = 0;
            } else if (leadGap < 9.5) {
              const followCap = leadSpeed * THREE.MathUtils.clamp((leadGap - minGap) / 6.0, 0.15, 1.0);
              desiredSpeed = Math.min(desiredSpeed, followCap);
            }
          }

          ag.speed = THREE.MathUtils.damp(ag.speed, desiredSpeed, desiredSpeed === 0 ? 7.5 : 4.2, dt);
          ag.t += (ag.speed / segLen) * dt;

          if (ag.t >= 1) {
            ag.t = 0;
            const prevFrom = ag.fromId;
            ag.fromId = ag.toId;
            ag.overtakeState = 'none';
            ag.overtakeTargetIdx = null;
            // Pick next connected segment (container trucks stay on wide lanes >= 4 boulevards)
            const candidates = currentCityData.segments.filter((s) => {
              const canEnter = s.from === ag.fromId || (!s.oneWay && s.to === ag.fromId);
              if (!canEnter) return false;
              if (!ag.isMotorbike && !ag.isPolice && s.lanes === 1) return false;
              return true;
            });
            const wideOnly =
              ag.vehicleKind === 'container' ? candidates.filter((s) => s.lanes >= 4) : candidates;
            const laneMatched = wideOnly.length > 0 ? wideOnly : candidates;
            const nonReverse = laneMatched.filter((s) => {
              const other = s.from === ag.fromId ? s.to : s.from;
              return other !== prevFrom;
            });
            const pickPool = nonReverse.length > 0 ? nonReverse : laneMatched;
            const nextSeg = pickPool[Math.floor(Math.random() * pickPool.length)];
            if (nextSeg) {
              ag.toId = nextSeg.from === ag.fromId ? nextSeg.to : nextSeg.from;
              const isHeavy = ag.vehicleKind === 'container' || ag.vehicleKind === 'truck';
              const newLane = getAgentLaneOffset(nextSeg.lanes, Boolean(ag.isMotorbike), isHeavy);
              ag.laneOffset = newLane;
              ag.currentLaneOffset = newLane;
              ag.overtakePassOffset = newLane;
            }
          }
        }

        // Right-hand driving lane offset in Vietnam
        ag.x = fromN.x + dx * ag.t + rightX * ag.currentLaneOffset;
        ag.z = fromN.z + dz * ag.t + rightZ * ag.currentLaneOffset;
        ag.heading = Math.atan2(-dirX, -dirZ) - latSteerOffset;
        ag.mesh.position.set(ag.x, 0, ag.z);
        ag.mesh.rotation.y = ag.heading;

        if (ag.isPolice && ag.policeRig) {
          const policeFlash = Math.floor(blinkTimer * 7) % 2 === 0;
          ag.policeRig.redBeaconMat.emissiveIntensity = policeFlash ? 2.8 : 0.15;
          ag.policeRig.blueBeaconMat.emissiveIntensity = policeFlash ? 0.15 : 2.8;
          const dPol = Math.hypot(ag.x - playerState.x, ag.z - playerState.z);
          if (nearestPoliceDistM === null || dPol < nearestPoliceDistM) {
            nearestPoliceDistM = dPol;
          }
        }

        // Player vs AI Car / Truck / Container / Motorbike Oriented Collision
        if (!titleMode && !paused) {
          const relX = playerState.x - ag.x;
          const relZ = playerState.z - ag.z;
          const agFwdX = -Math.sin(ag.heading);
          const agFwdZ = -Math.cos(ag.heading);
          const agRightX = -agFwdZ;
          const agRightZ = agFwdX;
          const localFwd = relX * agFwdX + relZ * agFwdZ;
          const localLat = relX * agRightX + relZ * agRightZ;
          const limFwd = ag.halfLength + 1.45;
          const limLat = ag.halfWidth + 0.85;
          if (Math.abs(localFwd) < limFwd && Math.abs(localLat) < limLat) {
            const penFwd = limFwd - Math.abs(localFwd);
            const penLat = limLat - Math.abs(localLat);
            if (penLat <= penFwd) {
              const s = localLat >= 0 ? 1 : -1;
              playerState.x += agRightX * s * (penLat + 0.05);
              playerState.z += agRightZ * s * (penLat + 0.05);
            } else {
              const s = localFwd >= 0 ? 1 : -1;
              playerState.x += agFwdX * s * (penFwd + 0.05);
              playerState.z += agFwdZ * s * (penFwd + 0.05);
            }
            if (Math.abs(playerState.speedMs) > 3.2) {
              playerState.speedMs *= -0.25;
              playerState.cameraShake = 0.5;
              soundEngine.playCollision(1.1);
              if (playerState.collisionCooldown <= 0) {
                playerState.collisionCooldown = 3.0;
                const segInfo = findNearestSegment(currentCityData, playerState.x, playerState.z);
                emitViolation('collision', segInfo.segment.streetName, 350_000);
              }
            }
          }
        }
      }

      // 4b. Crosswalk & Sidewalk Pedestrians Simulation
      for (const ped of pedestrianAgents) {
        let walking = !paused;

        if (ped.kind === 'sidewalk') {
          if (
            walking &&
            ped.ax !== undefined &&
            ped.az !== undefined &&
            ped.dirX !== undefined &&
            ped.dirZ !== undefined &&
            ped.startD !== undefined &&
            ped.endD !== undefined &&
            ped.d !== undefined &&
            ped.lateral !== undefined
          ) {
            ped.d += ped.dir * ped.speed * dt;
            if (ped.d >= ped.endD) {
              ped.d = ped.endD;
              ped.dir = -1;
            } else if (ped.d <= ped.startD) {
              ped.d = ped.startD;
              ped.dir = 1;
            }
            ped.walkPhase += dt * ped.speed * 5.0;
            const rightX = -ped.dirZ;
            const rightZ = ped.dirX;
            ped.x = ped.ax + ped.dirX * ped.d + rightX * ped.lateral;
            ped.z = ped.az + ped.dirZ * ped.d + rightZ * ped.lateral;
            const faceX = ped.dirX * ped.dir;
            const faceZ = ped.dirZ * ped.dir;
            ped.rig.group.rotation.y = Math.atan2(faceX, faceZ);
            ped.rig.group.position.set(ped.x, ped.y, ped.z);
          }
        } else {
          const node = currentNodeMap.get(ped.nodeId);
          if (!node) continue;

          if (walking) {
            // Wait on curb if signalized intersection gives green/yellow to crossing cars
            const atCurb = Math.abs(ped.progress) > 0.85;
            if (ped.hasTrafficLight && atCurb) {
              const carLight = ped.axis === 'ns' ? nsState : ewState;
              if (carLight === 'green' || carLight === 'yellow') {
                walking = false;
              }
            }

            // Pause cautiously if player car is speeding right across the crosswalk
            const distPedPlayer = Math.hypot(ped.x - playerState.x, ped.z - playerState.z);
            if (distPedPlayer < 5.8 && Math.abs(playerState.speedMs) > 3.0 && atCurb) {
              walking = false;
            }

            if (walking) {
              ped.progress += (ped.dir * ped.speed * dt) / ped.crossHalfSpan;
              if (ped.progress >= 1) {
                ped.progress = 1;
                ped.dir = -1;
              } else if (ped.progress <= -1) {
                ped.progress = -1;
                ped.dir = 1;
              }
              ped.walkPhase += dt * ped.speed * 5.2;
            }
          }

          if (ped.axis === 'ns') {
            ped.x = node.x + ped.progress * ped.crossHalfSpan;
            ped.z = node.z + ped.crosswalkOffset;
            ped.rig.group.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            ped.x = node.x + ped.crosswalkOffset;
            ped.z = node.z + ped.progress * ped.crossHalfSpan;
            ped.rig.group.rotation.y = ped.dir > 0 ? 0 : Math.PI;
          }
          ped.rig.group.position.set(ped.x, 0.08, ped.z);
        }

        const swing = walking ? Math.sin(ped.walkPhase) * 0.55 : 0;
        ped.rig.leftLegPivot.rotation.x = swing;
        ped.rig.rightLegPivot.rotation.x = -swing;
        ped.rig.leftArmPivot.rotation.x = -swing * 0.7;
        ped.rig.rightArmPivot.rotation.x = swing * 0.7;

        // Pedestrian collision check
        if (!titleMode && !paused) {
          const dPed = Math.hypot(ped.x - playerState.x, ped.z - playerState.z);
          if (dPed < 1.9 && Math.abs(playerState.speedMs) > 3.0) {
            playerState.speedMs *= 0.2;
            playerState.cameraShake = 0.55;
            soundEngine.playCollision(1.1);
            if (playerState.collisionCooldown <= 0) {
              playerState.collisionCooldown = 3.2;
              const segInfo = findNearestSegment(currentCityData, playerState.x, playerState.z);
              emitViolation('collision', segInfo.segment.streetName, 450_000);
            }
          }
        }
      }

      // 5. Traffic Law Enforcement (Speeding on designated roads, Red Light, Wrong-Way on One-Way) & NPC Overhead Speech Triggers
      const nearestSegInfo = findNearestSegment(currentCityData, playerState.x, playerState.z, playerState.heading);
      const currentStreet = nearestSegInfo.segment.streetName;
      const speedLimit: number | null = nearestSegInfo.segment.speedLimit ?? null;
      const speedKmh = Math.abs(playerState.speedMs) * 3.6;

      let activeTrafficLight: 'green' | 'yellow' | 'red' | null = null;
      let activeTrafficLightSec: number | null = null;
      let activeTrafficLightDistM: number | null = null;
      let activeTrafficLightLabel: string | null = null;
      let redLightWarning = false;
      let wrongWayWarning = false;

      if (!titleMode && !paused) {
        // Check nearest traffic light intersection within 46m for early countdown & red-light warning
        let nearestTlDist = 46;
        let nearestTlNode: (typeof currentCityData.nodes)[number] | null = null;
        for (const node of currentCityData.nodes) {
          if (!node.hasTrafficLight) continue;
          const dNode = Math.hypot(playerState.x - node.x, playerState.z - node.z);
          if (dNode < nearestTlDist) {
            nearestTlDist = dNode;
            nearestTlNode = node;
          }
        }

        if (nearestTlNode) {
          const movingNS = Math.abs(Math.cos(playerState.heading)) >= Math.abs(Math.sin(playerState.heading));
          const light = movingNS ? nsState : ewState;
          const secRemaining = movingNS ? nsRemainingSec : ewRemainingSec;
          activeTrafficLight = light;
          activeTrafficLightSec = secRemaining;
          activeTrafficLightDistM = Math.round(nearestTlDist);
          activeTrafficLightLabel = nearestTlNode.label || currentStreet;

          const tlMaxLanes = currentCityData.segments.reduce(
            (mx, s) => ((s.from === nearestTlNode!.id || s.to === nearestTlNode!.id) && s.lanes > mx ? s.lanes : mx),
            2
          );
          const stopLineDist = tlMaxLanes >= 6 ? 12.8 : 10.2;

          // Warn player early if approaching a RED light before stop line
          if (light === 'red' && nearestTlDist < 42 && nearestTlDist >= stopLineDist - 0.5 && speedKmh > 10) {
            redLightWarning = true;
          }

          if (nearestTlDist < stopLineDist && light === 'red' && speedKmh > 18 && playerState.redLightCooldown <= 0) {
            playerState.redLightCooldown = 6.5;
            soundEngine.playPoliceSiren();
            const intersectionLabel = nearestTlNode.label || currentStreet;
            const recordedAt = new Date().toLocaleTimeString('vi-VN', { hour12: false });
            emitViolation('red_light', intersectionLabel, 500_000, {
              billNote: `Bị camera giám sát tại giao lộ ${intersectionLabel} ghi nhận vào lúc ${recordedAt}`,
              timeLabel: recordedAt
            });
          }
        }

        // Check One-Way Street Direction (Đường một chiều)
        if (nearestSegInfo.segment.oneWay && nearestSegInfo.dist < 10.5 && speedKmh > 15 && ctrl.gear === 'D') {
          const segA = currentNodeMap.get(nearestSegInfo.segment.from);
          const segB = currentNodeMap.get(nearestSegInfo.segment.to);
          if (segA && segB) {
            const sdx = segB.x - segA.x;
            const sdz = segB.z - segA.z;
            const slen = Math.hypot(sdx, sdz) || 1;
            const pfx = -Math.sin(playerState.heading);
            const pfz = -Math.cos(playerState.heading);
            const dot = (pfx * sdx + pfz * sdz) / slen;
            if (dot < -0.52) {
              wrongWayWarning = true;
              playerState.wrongWayTimer += dt;
              if (playerState.wrongWayTimer > 1.8 && playerState.violationCooldown <= 0) {
                playerState.wrongWayTimer = 0;
                playerState.violationCooldown = 6.5;
                soundEngine.playPoliceSiren();
                emitViolation('wrong_way', currentStreet, 600_000);
              }
            } else {
              playerState.wrongWayTimer = Math.max(0, playerState.wrongWayTimer - dt * 2);
            }
          }
        } else {
          playerState.wrongWayTimer = Math.max(0, playerState.wrongWayTimer - dt * 2);
        }

        // Check Speeding: ONLY fined when detected directly by patrolling CSGT traffic police
        const policeDetected = nearestPoliceDistM !== null && nearestPoliceDistM < 56;
        if (speedLimit !== null && policeDetected && speedKmh > speedLimit + 10 && playerState.violationCooldown <= 0) {
          playerState.violationCooldown = 7.0;
          soundEngine.playPoliceSiren();
          const recordedAt = new Date().toLocaleTimeString('vi-VN', { hour12: false });
          const roundedSpeed = Math.round(speedKmh);
          emitViolation('speeding', currentStreet, 400_000, {
            billNote: `Bị CSGT tuần tra phát hiện chạy quá tốc độ (${roundedSpeed}/${speedLimit} km/h) tại ${currentStreet} lúc ${recordedAt}`,
            speedKmh: roundedSpeed,
            speedLimit,
            timeLabel: recordedAt
          });
        }

        // Trigger nearby NPC Dialogue (attached directly over that NPC's 3D head + optional HUD mirror)
        if (playerState.npcSpeechCooldown <= 0) {
          let spoke = false;
          for (let pi = 0; pi < pedestrianAgents.length; pi++) {
            const ped = pedestrianAgents[pi];
            const d = Math.hypot(ped.x - playerState.x, ped.z - playerState.z);
            if (d < 13) {
              const line =
                speedKmh > 30
                  ? 'Chú taxi chạy chậm thôi kẻo va vào bà con!'
                  : speedKmh < 10
                  ? 'Cảm ơn bác tài đã nhường đường cho người đi bộ!'
                  : 'Đường phố hôm nay đi lại dễ chịu quá bác tài ơi!';
              activeNpcTarget = {
                kind: 'ped',
                index: pi,
                speaker: 'Người đi bộ',
                role: 'pedestrian',
                text: line,
                until: simElapsed + 3.8
              };
              emitNpcSpeech?.({ id: `npc_${Date.now()}`, speaker: 'Người đi bộ', role: 'pedestrian', text: line });
              spoke = true;
              break;
            }
          }
          if (!spoke) {
            for (let ai = 0; ai < aiAgents.length; ai++) {
              const ag = aiAgents[ai];
              if (!ag.mesh.visible) continue;
              const d = Math.hypot(ag.x - playerState.x, ag.z - playerState.z);
              if (ag.isMotorbike && d < 10.5) {
                const line =
                  Math.random() > 0.5
                    ? 'Xin đường xíu nha anh taxi, em giao đơn gấp!'
                    : 'Bác tài ơi nhìn biển báo đường một chiều cẩn thận nhé!';
                activeNpcTarget = {
                  kind: 'ai',
                  index: ai,
                  speaker: 'Shipper / Xe máy',
                  role: 'motorbike',
                  text: line,
                  until: simElapsed + 3.8
                };
                emitNpcSpeech?.({ id: `npc_${Date.now()}`, speaker: 'Shipper / Xe máy', role: 'motorbike', text: line });
                spoke = true;
                break;
              }
              if (ag.isPolice && d < 32) {
                const line = 'CSGT: Chú ý chấp hành đèn đỏ và tốc độ quy định!';
                activeNpcTarget = {
                  kind: 'ai',
                  index: ai,
                  speaker: 'CSGT Tuần tra',
                  role: 'police',
                  text: line,
                  until: simElapsed + 3.8
                };
                emitNpcSpeech?.({ id: `npc_${Date.now()}`, speaker: 'CSGT Tuần tra', role: 'police', text: line });
                spoke = true;
                break;
              }
            }
          }
          if (spoke) playerState.npcSpeechCooldown = 9.0;
        }
      }

      // Update 3D Overhead NPC Speech Bubble Position right above the speaking character's head
      if (activeNpcTarget && simElapsed < activeNpcTarget.until) {
        let tx = 0;
        let tz = 0;
        let ty = 2.4;
        let valid = false;
        if (activeNpcTarget.kind === 'ped') {
          const ped = pedestrianAgents[activeNpcTarget.index];
          if (ped) {
            tx = ped.x;
            tz = ped.z;
            ty = 2.15;
            valid = true;
          }
        } else {
          const ag = aiAgents[activeNpcTarget.index];
          if (ag && ag.mesh.visible) {
            tx = ag.x;
            tz = ag.z;
            ty = ag.isMotorbike ? 2.1 : 2.35;
            valid = true;
          }
        }
        if (valid) {
          npcBubbleRig.setContent(activeNpcTarget.speaker, activeNpcTarget.role, activeNpcTarget.text);
          npcBubbleRig.sprite.position.set(tx, ty, tz);
        } else {
          npcBubbleRig.clear();
        }
      } else {
        activeNpcTarget = null;
        npcBubbleRig.clear();
      }

      // Update 3D Overhead Speech Bubble above the Taxi when Customer inside speaks
      if (custSpeech && !titleMode) {
        carPassengerBubble.setContent(custSpeech.speaker, 'passenger', custSpeech.text);
        carPassengerBubble.sprite.position.set(playerState.x, 2.15, playerState.z);
      } else {
        carPassengerBubble.clear();
      }

      // 6. Active Ride GPS (Dynamic Multi-Route Detour Rerouting) & Pickup / Dropoff Detection
      let gpsPathPoints: Array<{ x: number; z: number }> = [];
      let targetPoint: { x: number; z: number; label: string; type: 'pickup' | 'dropoff' } | null = null;
      let navDirection: 'straight' | 'left' | 'right' | 'uturn' | 'arrive' | null = null;
      let navNextTurnDirection: 'left' | 'right' | 'uturn' | 'arrive' | null = null;
      let navDistanceM: number | null = null;
      let navTotalRemainingM: number | null = null;
      let navStreetName: string | null = null;
      let navSummary: string | null = null;

      if (ride && !titleMode) {
        const destNodeId = ride.phase === 'to_pickup' ? ride.offer.pickupNodeId : ride.offer.dropoffNodeId;
        const destNode = currentNodeMap.get(destNodeId);
        // Dynamic GPS rerouting from player's current street & heading (supports any detour/loop!)
        const route = findBestRouteFromPosition(
          currentCityData,
          playerState.x,
          playerState.z,
          playerState.heading,
          destNodeId
        );
        const routeKey = `${ride.offer.id}_${ride.phase}_${route.nodeIds.join(',')}`;
        if (routeKey !== playerState.lastRouteKey) {
          playerState.lastRouteKey = routeKey;
          rebuildGpsVisuals(route.nodeIds);
        }

        // Color & animate 3D on-road navigation guide (bright green for pickup, warm amber-gold for dropoff)
        const navColorHex = ride.phase === 'to_pickup' ? 0x4ade80 : 0xfbbf24;
        gpsMat.color.setHex(navColorHex);
        gpsLeadMat.color.setHex(navColorHex);
        gpsTex.offset.y = (gpsTex.offset.y - dt * 1.45) % 1;
        gpsLeadTex.offset.y = gpsTex.offset.y;

        gpsPathPoints = [{ x: playerState.x, z: playerState.z }];
        for (const id of route.nodeIds) {
          const n = currentNodeMap.get(id);
          if (n) gpsPathPoints.push({ x: n.x, z: n.z });
        }

        // Update leading 3D GPS connector strip directly on the road from taxi toward upcoming node
        const leadNode = route.nodeIds.length > 0 ? currentNodeMap.get(route.nodeIds[0]) : undefined;
        if (leadNode) {
          const ldx = leadNode.x - playerState.x;
          const ldz = leadNode.z - playerState.z;
          const lLen = Math.hypot(ldx, ldz);
          if (lLen > 2.2) {
            gpsLeadStrip.visible = true;
            gpsLeadStrip.scale.set(1, lLen, 1);
            gpsLeadTex.repeat.set(1, Math.max(0.5, lLen / 6.5));
            gpsLeadStrip.rotation.y = Math.atan2(-ldx, -ldz);
            const leadY = nearestSegInfo.segment.isBridge ? 0.31 : 0.14;
            gpsLeadStrip.position.set((playerState.x + leadNode.x) * 0.5, leadY, (playerState.z + leadNode.z) * 0.5);
          } else {
            gpsLeadStrip.visible = false;
          }
        } else {
          gpsLeadStrip.visible = false;
        }

        if (destNode) {
          const curbSpot = getCurbStopPosition(currentCityData, currentNodeMap, destNodeId);
          gpsPathPoints.push({ x: curbSpot.roadX, z: curbSpot.roadZ });

          targetPoint = {
            x: curbSpot.x,
            z: curbSpot.z,
            label: ride.phase === 'to_pickup' ? ride.offer.pickupName : ride.offer.dropoffName,
            type: ride.phase === 'to_pickup' ? 'pickup' : 'dropoff'
          };

          beaconGroup.visible = true;
          beaconGroup.position.set(targetPoint.x, curbSpot.y + 0.02, targetPoint.z);
          const bColor = ride.phase === 'to_pickup' ? 0x22c55e : 0xf59e0b;
          beaconRingMat.color.setHex(bColor);
          beaconRingMat.emissive.setHex(bColor);
          (beaconPillar.material as THREE.MeshBasicMaterial).color.setHex(bColor);
          beaconRing.scale.setScalar(1 + Math.sin(blinkTimer * 4) * 0.08);

          const distToNode = Math.hypot(destNode.x - playerState.x, destNode.z - playerState.z);
          const distToCurb = Math.hypot(curbSpot.x - playerState.x, curbSpot.z - playerState.z);
          const distToPickupTarget = Math.min(distToNode, distToCurb);

          // Show waiting customer strictly on the sidewalk curb + animated walk-to-board wait
          if (ride.phase === 'to_pickup') {
            passengerGroup.visible = true;
            const isNear = distToPickupTarget <= 65;

            // Choose nearest side door on player taxi so passenger never clips through the car
            const cosH = Math.cos(playerState.heading);
            const sinH = Math.sin(playerState.heading);
            const doorRX = playerState.x + cosH * 1.15;
            const doorRZ = playerState.z - sinH * 1.15;
            const doorLX = playerState.x - cosH * 1.15;
            const doorLZ = playerState.z + sinH * 1.15;
            const dRight = Math.hypot(doorRX - curbSpot.x, doorRZ - curbSpot.z);
            const dLeft = Math.hypot(doorLX - curbSpot.x, doorLZ - curbSpot.z);
            const doorX = dRight <= dLeft ? doorRX : doorLX;
            const doorZ = dRight <= dLeft ? doorRZ : doorLZ;

            if (!paused && distToPickupTarget < 19 && speedKmh <= 10) {
              if (!boardingState.active || boardingState.rideId !== ride.offer.id) {
                boardingState.active = true;
                boardingState.rideId = ride.offer.id;
                boardingState.x = curbSpot.x;
                boardingState.y = curbSpot.y;
                boardingState.z = curbSpot.z;
                boardingState.walkPhase = 0;
                boardingState.elapsed = 0;
              }
            } else if (boardingState.active && (speedKmh > 16 || distToPickupTarget > 21)) {
              boardingState.active = false;
            }

            if (boardingState.active && boardingState.rideId === ride.offer.id) {
              if (!paused) {
                boardingState.elapsed += dt;
                const bdx = doorX - boardingState.x;
                const bdz = doorZ - boardingState.z;
                const bDist = Math.hypot(bdx, bdz);
                const walkStep = 2.65 * dt;
                if (bDist > walkStep) {
                  boardingState.x += (bdx / bDist) * walkStep;
                  boardingState.z += (bdz / bDist) * walkStep;
                } else {
                  boardingState.x = doorX;
                  boardingState.z = doorZ;
                }
                boardingState.y = THREE.MathUtils.damp(boardingState.y, 0.08, 6, dt);
                boardingState.walkPhase += dt * 11.5;

                if (bDist <= 1.25 && boardingState.elapsed >= 1.1) {
                  boardingState.active = false;
                  boardingState.rideId = '';
                  playerState.pitch = -0.024;
                  reachPickup();
                }
              }

              passengerGroup.position.set(boardingState.x, boardingState.y, boardingState.z);
              passengerGroup.lookAt(doorX, boardingState.y, doorZ);
              const walkSwing = Math.sin(boardingState.walkPhase) * 0.62;
              pLeftLegPivot.rotation.x = walkSwing;
              pRightLegPivot.rotation.x = -walkSwing;
              pLeftArmPivot.rotation.x = -walkSwing * 0.7;
              pRightArmPivot.rotation.z = 0;
              pRightArmPivot.rotation.x = walkSwing * 0.7;
              pMarker.rotation.y = blinkTimer * 3.0;
              pMarker.position.y = 2.32;
              passengerWaitBubble.setContent(
                ride.offer.passengerName,
                'passenger',
                'Đợi em chút nha, em đi bộ lên xe ngay đây!'
              );
            } else {
              // Standing safely inside sidewalk curb, waving arm toward incoming taxi
              const bounceY = isNear ? Math.abs(Math.sin(blinkTimer * 5.2)) * 0.08 : 0;
              passengerGroup.position.set(curbSpot.x, curbSpot.y + bounceY, curbSpot.z);
              passengerGroup.lookAt(playerState.x, curbSpot.y + bounceY, playerState.z);
              pLeftLegPivot.rotation.x = 0;
              pRightLegPivot.rotation.x = 0;
              pLeftArmPivot.rotation.x = 0;
              pRightArmPivot.rotation.x = 0;
              pRightArmPivot.rotation.z = isNear
                ? 2.45 + Math.sin(blinkTimer * 9.5) * 0.45
                : 0.2 + Math.sin(blinkTimer * 2.4) * 0.1;
              pMarker.rotation.y = blinkTimer * 2.4;
              pMarker.position.y = 2.32 + Math.sin(blinkTimer * 4) * 0.1;

              if (distToPickupTarget <= 75) {
                const waitLine =
                  distToPickupTarget < 24 && speedKmh > 10
                    ? 'Bác tài tấp lề dừng xe (<10 km/h) cho em lên nhé!'
                    : isNear
                    ? 'Em đứng trên lề đường vẫy tay ngay đây ạ!'
                    : ride.offer.passengerNote || 'Em đang đợi trên vỉa hè điểm đón nhé!';
                passengerWaitBubble.setContent(ride.offer.passengerName, 'passenger', waitLine);
              } else {
                passengerWaitBubble.clear();
              }

              if (isNear && playerState.lastPickupBubbleRideId !== ride.offer.id) {
                playerState.lastPickupBubbleRideId = ride.offer.id;
                emitNpcSpeech?.({
                  id: `pickup_${ride.offer.id}`,
                  speaker: ride.offer.passengerName,
                  role: 'passenger',
                  text: 'Em đứng ngay trên vỉa hè vẫy tay đây bác tài ơi!'
                });
              }
            }
          } else {
            boardingState.active = false;
            passengerGroup.visible = false;
            passengerWaitBubble.clear();
            if (!paused && distToCurb < 13.5 && speedKmh <= 14) {
              reachDropoff();
            }
          }
        } else {
          boardingState.active = false;
          passengerGroup.visible = false;
          passengerWaitBubble.clear();
        }

        // Update ride turn instruction & structured directional arrow telemetry
        const nav = computeTurnInstruction(
          currentCityData,
          route.nodeIds,
          playerState.x,
          playerState.z,
          playerState.heading
        );
        navDirection = nav.direction;
        navNextTurnDirection = nav.nextTurnDirection;
        navDistanceM = nav.distanceToManeuverM;
        navTotalRemainingM = Math.round(nav.remainingM);
        navStreetName = nav.targetStreet;
        const distNow = targetPoint
          ? Math.hypot(targetPoint.x - playerState.x, targetPoint.z - playerState.z)
          : 999;
        navSummary =
          ride.phase === 'to_pickup' && boardingState.active
            ? 'Đang đợi khách từ lề đường bước lên xe...'
            : distNow < 22 && speedKmh > (ride.phase === 'to_pickup' ? 10 : 14)
            ? ride.phase === 'to_pickup'
              ? 'Tấp lề dừng hẳn (<10 km/h) để đón khách!'
              : 'Tấp lề giảm tốc (<14 km/h) để trả khách!'
            : distNow <= 55
            ? ride.phase === 'to_pickup'
              ? `Khách đang đứng trên vỉa hè phía trước (${Math.round(distNow)}m)`
              : `Tấp vào lề đường điểm trả khách (${Math.round(distNow)}m)`
            : nav.instruction;
        ride.nextTurnInstruction = navSummary;
        ride.distanceRemainingM = nav.remainingM;
      } else {
        boardingState.active = false;
        beaconGroup.visible = false;
        passengerGroup.visible = false;
        passengerWaitBubble.clear();
        gpsLeadStrip.visible = false;
        if (playerState.lastRouteKey !== '') {
          playerState.lastRouteKey = '';
          rebuildGpsVisuals([]);
        }
      }

      // 7. Sound Engine Update
      if (!titleMode && !paused) {
        const rpmRatio = THREE.MathUtils.clamp((speedKmh % 48) / 48 + (ctrl.throttle * 0.28), 0.15, 1.0);
        soundEngine.updateEngine(
          speedKmh,
          rpmRatio,
          ctrl.throttle,
          spec.isElectric,
          curWeather === 'rain',
          ctrl.leftSignal || ctrl.rightSignal,
          dt
        );
      }

      // 8. Smooth Third-Person Camera (elevated angle for clear street visibility)
      if (titleMode) {
        titleOrbitAngle += dt * 0.14;
        const cx = playerState.x + Math.sin(titleOrbitAngle) * 29;
        const cz = playerState.z + Math.cos(titleOrbitAngle) * 29;
        camera.position.set(cx, 14.5, cz);
        camera.lookAt(playerState.x, 2.0, playerState.z);
        camera.fov = 56;
        camera.updateProjectionMatrix();
      } else {
        const fx = -Math.sin(playerState.heading);
        const fz = -Math.cos(playerState.heading);

        let distBack = 11.2;
        let heightUp = 6.6;
        let lookAhead = 12.0;
        let lookY = 1.1;

        if (camMode === 'close') {
          distBack = 7.6;
          heightUp = 4.3;
          lookAhead = 11.5;
          lookY = 1.3;
        } else if (camMode === 'hood') {
          distBack = -0.3;
          heightUp = 1.85;
          lookAhead = 17;
          lookY = 1.4;
        }

        const shakeX = (Math.random() - 0.5) * playerState.cameraShake;
        const shakeY = (Math.random() - 0.5) * playerState.cameraShake * 0.7;

        _camTarget.set(
          playerState.x - fx * distBack + shakeX,
          heightUp + shakeY,
          playerState.z - fz * distBack
        );
        _lookTarget.set(
          playerState.x + fx * lookAhead,
          lookY,
          playerState.z + fz * lookAhead
        );

        const camDamp = camMode === 'hood' ? 28 : 9.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTarget.x, camDamp, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTarget.y, camDamp, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTarget.z, camDamp, dt);

        _vecA.copy(_lookTarget);
        camera.lookAt(_vecA);

        const targetFov = 58 + THREE.MathUtils.clamp(speedKmh / 220, 0, 1) * 14;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
          camera.updateProjectionMatrix();
        }
      }

      renderer.render(scene, camera);

      // 9. Throttled HUD Telemetry (~30 Hz for smooth wheel spin & blinking signals)
      telemetryAccumulator += dt;
      if (telemetryAccumulator >= 0.032) {
        telemetryAccumulator = 0;
        const tlPositions: Array<{ x: number; z: number; state: 'green' | 'yellow' | 'red' }> = [];
        for (const n of currentCityData.nodes) {
          if (n.hasTrafficLight) {
            tlPositions.push({ x: n.x, z: n.z, state: nsState });
          }
        }
        const policePositions = aiAgents
          .filter((a) => a.isPolice)
          .map((a) => ({ x: a.x, z: a.z, heading: a.heading }));
        const trafficPositions = aiAgents
          .filter((a) => !a.isPolice && a.mesh.visible)
          .map((a) => ({ x: a.x, z: a.z }));

        emitTelemetry({
          speedKmh: Math.round(speedKmh),
          rpmRatio: THREE.MathUtils.clamp((speedKmh % 48) / 48 + ctrl.throttle * 0.28, 0.12, 1),
          gear: ctrl.gear,
          steeringAngle: playerState.steerAngle / 0.56,
          steerWheelDeg: ctrl.steerWheelDeg,
          leftSignal: ctrl.leftSignal,
          rightSignal: ctrl.rightSignal,
          blinkOn,
          headlightsOn: ctrl.headlights || isNight,
          currentStreet,
          speedLimit,
          nearestPoliceDistM: nearestPoliceDistM !== null ? Math.round(nearestPoliceDistM) : null,
          activeTrafficLight,
          activeTrafficLightSec,
          activeTrafficLightDistM,
          activeTrafficLightLabel,
          redLightWarning,
          wrongWayWarning,
          navDirection,
          navNextTurnDirection,
          navDistanceM,
          navTotalRemainingM,
          navStreetName,
          navSummary,
          trafficDensity: effectiveTrafficLevel,
          playerX: playerState.x,
          playerZ: playerState.z,
          playerHeading: playerState.heading,
          timeOfDayHours: hour,
          gpsPathPoints,
          targetPoint,
          trafficLights: tlPositions,
          policePositions,
          trafficPositions
        });
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      if (currentCityAssets) currentCityAssets.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      gpsTex.dispose();
      gpsLeadTex.dispose();
      gpsMat.dispose();
      gpsLeadMat.dispose();
      gpsLeadGeo.dispose();
      beaconRingMat.dispose();
      passengerWaitBubble.dispose();
      carPassengerBubble.dispose();
      npcBubbleRig.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [controlsRef, soundEngine]);

  return <div ref={mountRef} className="w-full h-full relative" />;
};
