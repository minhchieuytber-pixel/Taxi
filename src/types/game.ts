export type CityId = 'hanoi' | 'hcmc' | 'danang';

export type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'fog';

export type CameraMode = 'chase' | 'close' | 'hood';

export type GearMode = 'D' | 'R';

export type NavDirection = 'straight' | 'left' | 'right' | 'uturn' | 'arrive';

export type PhoneAppId = 'home' | 'rides' | 'messages' | 'profile' | 'map';

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  hasTrafficLight?: boolean;
  label?: string;
}

export interface RoadSegment {
  id: string;
  from: string;
  to: string;
  streetName: string;
  lanes: number; // 1 = hẻm/ngõ (5.6m), 2 = phố nhỏ (10.2m), 3 = đường vừa (13.5m), 4 = đại lộ (16.5m), 6 = đại lộ 6 làn (21.5m)
  speedLimit?: number; // km/h (chỉ gắn biển giới hạn tốc độ ở một số tuyến đường quy định)
  isBridge?: boolean;
  oneWay?: boolean; // true = đường một chiều (chiều đi: from -> to)
}

export interface LandmarkData {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  nodeId: string;
  type:
    | 'ho_guom'
    | 'thap_rua'
    | 'nha_hat_lon'
    | 'lang_bac'
    | 'van_mieu'
    | 'ga_ha_noi'
    | 'cau_long_bien'
    | 'my_dinh'
    | 'ben_thanh'
    | 'nguyen_hue'
    | 'bitexco'
    | 'nha_tho_duc_ba'
    | 'cau_rong'
    | 'my_khe'
    | 'san_bay_dn'
    | 'cau_song_han';
  category: 'landmark' | 'station' | 'market' | 'park';
}

export interface WaterBody {
  id: string;
  name: string;
  shape: 'ellipse' | 'river';
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
}

export interface CityMapData {
  id: CityId;
  name: string;
  subtitle: string;
  centerLatLng: { lat: number; lng: number };
  bounds: number; // half-size in world meters
  nodes: RoadNode[];
  segments: RoadSegment[];
  landmarks: LandmarkData[];
  waterBodies: WaterBody[];
  speedCameraNodes: string[];
}

export type VehicleBodyStyle = 'hatchback' | 'sedan' | 'ev_suv' | 'mpv' | 'luxury_sedan' | 'luxury_suv';

export interface VehicleSpec {
  id: string;
  name: string;
  brand: string;
  segment: string;
  bodyStyle: VehicleBodyStyle;
  isElectric: boolean;
  horsepower: number; // HP
  torqueNm: number; // Nm
  engineInfo: string;
  seats: number; // Total seats
  maxPassengers: number; // Max ride passengers
  topSpeedKmh: number;
  zeroToHundredSec: number;
  weightKg: number;
  rentCost: number; // VNĐ per shift (0 if starter free/deposit)
  buyPrice: number; // VNĐ to own permanently
  fareMultiplier: number; // Earnings multiplier
  defaultColor: string;
  dimensions: { width: number; length: number; height: number };
  description: string;
}

export interface VehicleUpgrades {
  engine: number; // 0..4
  brakes: number; // 0..4
  suspension: number; // 0..4
  tires: number; // 0..4
}

export interface VehicleAppearance {
  color: string;
  rimStyle: 'standard' | 'sport' | 'amg';
  roofSign: 'classic_yellow' | 'green_ev' | 'led_vip';
  spoiler: boolean;
  windowTint: number; // 0..2
}

export interface OwnedVehicleState {
  specId: string;
  owned: boolean;
  rented: boolean;
  upgrades: VehicleUpgrades;
  appearance: VehicleAppearance;
}

export type TrafficLevel = 'low' | 'medium' | 'high';

export interface RideOffer {
  id: string;
  passengerName: string;
  passengerCount: number;
  pickupNodeId: string;
  pickupName: string;
  pickupStreet: string;
  dropoffNodeId: string;
  dropoffName: string;
  dropoffStreet: string;
  distanceKm: number;
  trafficLevel: TrafficLevel;
  estimatedFare: number;
  passengerNote: string;
  isVip: boolean;
  expiresAt: number;
}

export interface ActiveRide {
  offer: RideOffer;
  phase: 'to_pickup' | 'to_dropoff';
  satisfaction: number; // 0..100
  startTime: number;
  elapsedSeconds: number;
  finesDuringRide: number;
  collisionsDuringRide: number;
  routeNodeIds: string[];
  currentStepIndex: number;
  nextTurnInstruction: string;
  distanceRemainingM: number;
}

export interface RideMessage {
  id: string;
  sender: 'customer' | 'system' | 'police' | 'gps';
  senderName: string;
  text: string;
  timestamp: string;
  tone: 'normal' | 'happy' | 'angry' | 'warning';
}

export interface NpcSpeechBubble {
  id: string;
  speaker: string;
  role: 'pedestrian' | 'motorbike' | 'passenger' | 'police';
  text: string;
}

export interface CustomerReview {
  id: string;
  passengerName: string;
  rating: number; // 1..5
  comment: string;
  route: string;
  fareEarned: number;
  timestamp: string;
}

export interface ViolationRecord {
  id: string;
  type: 'speeding' | 'red_light' | 'collision' | 'wrong_way';
  title: string;
  fineAmount: number;
  streetName: string;
  timestamp: string;
  billNote?: string;
  speedKmh?: number;
  speedLimit?: number;
}

export interface CompletedRideReceipt {
  passengerName: string;
  pickupName: string;
  dropoffName: string;
  distanceKm: number;
  trafficLevel: TrafficLevel;
  baseFare: number;
  distanceFare: number;
  trafficBonus: number;
  vehicleBonus: number;
  tipBonus: number;
  finesDeducted: number;
  totalEarned: number;
  rating: number;
  comment: string;
}

export interface HudTelemetry {
  speedKmh: number;
  rpmRatio: number; // 0..1
  gear: GearMode;
  steeringAngle: number; // -1..1
  steerWheelDeg: number; // -720..720 (2 full rotations each side)
  blinkOn: boolean;
  leftSignal: boolean;
  rightSignal: boolean;
  headlightsOn: boolean;
  currentStreet: string;
  speedLimit: number | null;
  nearestPoliceDistM: number | null;
  activeTrafficLight: 'green' | 'yellow' | 'red' | null;
  activeTrafficLightSec: number | null;
  activeTrafficLightDistM: number | null;
  activeTrafficLightLabel: string | null;
  redLightWarning: boolean;
  wrongWayWarning: boolean;
  navDirection: NavDirection | null;
  navNextTurnDirection: 'left' | 'right' | 'uturn' | 'arrive' | null;
  navDistanceM: number | null;
  navTotalRemainingM: number | null;
  navStreetName: string | null;
  navSummary: string | null;
  trafficDensity: TrafficLevel;
  playerX: number;
  playerZ: number;
  playerHeading: number;
  timeOfDayHours: number; // 0..24
  gpsPathPoints: Array<{ x: number; z: number }>;
  targetPoint: { x: number; z: number; label: string; type: 'pickup' | 'dropoff' } | null;
  trafficLights: Array<{ x: number; z: number; state: 'green' | 'yellow' | 'red' }>;
  policePositions: Array<{ x: number; z: number; heading: number }>;
  trafficPositions: Array<{ x: number; z: number }>;
}

export interface ControlsInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steerInput: number; // -1 (left) .. +1 (right)
  steerWheelDeg: number; // -720 .. +720 degrees
  keyboardSteerDir: number; // -1, 0, +1
  virtualWheelActive: boolean;
  gear: GearMode;
  leftSignal: boolean;
  rightSignal: boolean;
  horn: boolean;
  headlights: boolean;
}

export interface PlayerProfile {
  driverName: string;
  money: number;
  totalEarned: number;
  completedRides: number;
  totalDistanceKm: number;
  ratingSum: number;
  ratingCount: number;
  activeCity: CityId;
  activeVehicleId: string;
  garage: Record<string, OwnedVehicleState>;
  reviews: CustomerReview[];
  violations: ViolationRecord[];
}
