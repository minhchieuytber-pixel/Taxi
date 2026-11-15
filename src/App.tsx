/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import { DrivingControlsHUD } from './components/DrivingControlsHUD';
import { GameViewport } from './components/GameViewport';
import { GarageModal } from './components/GarageModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { TripSummaryModal } from './components/TripSummaryModal';
import { VirtualPhone } from './components/VirtualPhone';
import { findNearestNode, findShortestRoute, getCityMap } from './data/cities';
import {
  buildCustomerFeedback,
  computeNextRideDelayMs,
  generateRideOffer,
  RIDE_OFFER_TIMEOUT_MS
} from './data/rides';
import { formatVND, getVehicleSpec, UPGRADE_CATALOG, VEHICLE_CATALOG } from './data/vehicles';
import {
  ActiveRide,
  CameraMode,
  CityId,
  CompletedRideReceipt,
  ControlsInput,
  HudTelemetry,
  NpcSpeechBubble,
  OwnedVehicleState,
  PhoneAppId,
  PlayerProfile,
  RideMessage,
  RideOffer,
  VehicleUpgrades,
  ViolationRecord,
  WeatherType
} from './types/game';

const STORAGE_KEY = 'taxi_hanoi_3d_career_v1';

function createInitialGarage(): Record<string, OwnedVehicleState> {
  const g: Record<string, OwnedVehicleState> = {};
  for (const car of VEHICLE_CATALOG) {
    g[car.id] = {
      specId: car.id,
      owned: false,
      rented: car.id === 'kia_morning',
      upgrades: { engine: 0, brakes: 0, suspension: 0, tires: 0 },
      appearance: {
        color: car.defaultColor,
        rimStyle: 'standard',
        roofSign: car.isElectric ? 'green_ev' : 'classic_yellow',
        spoiler: false,
        windowTint: 0
      }
    };
  }
  return g;
}

function createDefaultProfile(name = ''): PlayerProfile {
  return {
    driverName: name,
    money: 500_000,
    totalEarned: 0,
    completedRides: 0,
    totalDistanceKm: 0,
    ratingSum: 0,
    ratingCount: 0,
    activeCity: 'hanoi',
    activeVehicleId: 'kia_morning',
    garage: createInitialGarage(),
    reviews: [],
    violations: []
  };
}

function loadSavedProfile(): { profile: PlayerProfile; hasSaved: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profile: createDefaultProfile(), hasSaved: false };
    const parsed = JSON.parse(raw) as PlayerProfile;
    if (!parsed || !parsed.driverName) return { profile: createDefaultProfile(), hasSaved: false };
    return {
      profile: {
        ...createDefaultProfile(parsed.driverName),
        ...parsed,
        garage: { ...createInitialGarage(), ...parsed.garage }
      },
      hasSaved: true
    };
  } catch {
    return { profile: createDefaultProfile(), hasSaved: false };
  }
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function App() {
  const initialSaved = useMemo(() => loadSavedProfile(), []);
  const [profile, setProfile] = useState<PlayerProfile>(initialSaved.profile);
  const [isTitleMode, setIsTitleMode] = useState(true);

  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timeOfDayOverride, setTimeOfDayOverride] = useState<number | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [isMuted, setIsMuted] = useState(false);

  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneApp, setPhoneApp] = useState<PhoneAppId>('rides');
  const [unreadPhoneCount, setUnreadPhoneCount] = useState(0);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [pendingOffer, setPendingOffer] = useState<RideOffer | null>(null);
  const [offerRemainingMs, setOfferRemainingMs] = useState<number>(0);
  const [isOfferPopupDismissed, setIsOfferPopupDismissed] = useState(false);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [messages, setMessages] = useState<RideMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'system',
      senderName: 'Tổng đài Taxi Hà Nội',
      text: 'Chào mừng bác tài vào ca! Hãy bật app Nhận cuốc trên điện thoại để đón những vị khách đầu tiên.',
      timestamp: nowTimeStr(),
      tone: 'normal'
    }
  ]);

  const [angryToast, setAngryToast] = useState<{
    text: string;
    tone: 'danger' | 'success' | 'info';
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showCornerToast = useCallback((text: string, tone: 'danger' | 'success' | 'info', ms = 3500) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setAngryToast({ text, tone });
    toastTimerRef.current = window.setTimeout(() => setAngryToast(null), ms);
  }, []);

  const [customerOverheadSpeech, setCustomerOverheadSpeech] = useState<{
    speaker: string;
    text: string;
    key: number;
  } | null>(null);
  const custBubbleTimerRef = useRef<number | null>(null);
  const showCustomerOverheadSpeech = useCallback((speaker: string, text: string, ms = 4200) => {
    if (custBubbleTimerRef.current) window.clearTimeout(custBubbleTimerRef.current);
    setCustomerOverheadSpeech({ speaker, text, key: Date.now() });
    custBubbleTimerRef.current = window.setTimeout(() => setCustomerOverheadSpeech(null), ms);
  }, []);

  const [npcSpeech, setNpcSpeech] = useState<NpcSpeechBubble | null>(null);
  const npcSpeechTimerRef = useRef<number | null>(null);
  const handleNpcSpeech = useCallback((speech: NpcSpeechBubble) => {
    if (npcSpeechTimerRef.current) window.clearTimeout(npcSpeechTimerRef.current);
    setNpcSpeech(speech);
    npcSpeechTimerRef.current = window.setTimeout(() => setNpcSpeech(null), 3800);
  }, []);

  const [tripResult, setTripResult] = useState<{ receipt: CompletedRideReceipt; tags: string[] } | null>(null);
  const [fineBillPopup, setFineBillPopup] = useState<ViolationRecord | null>(null);
  const fineBillTimerRef = useRef<number | null>(null);

  const [telemetry, setTelemetry] = useState<HudTelemetry>({
    speedKmh: 0,
    rpmRatio: 0.12,
    gear: 'D',
    steeringAngle: 0,
    steerWheelDeg: 0,
    leftSignal: false,
    rightSignal: false,
    blinkOn: false,
    headlightsOn: false,
    currentStreet: 'Phố Đinh Tiên Hoàng',
    speedLimit: 45,
    nearestPoliceDistM: null,
    activeTrafficLight: null,
    activeTrafficLightSec: null,
    activeTrafficLightDistM: null,
    activeTrafficLightLabel: null,
    redLightWarning: false,
    wrongWayWarning: false,
    navDirection: null,
    navNextTurnDirection: null,
    navDistanceM: null,
    navTotalRemainingM: null,
    navStreetName: null,
    navSummary: null,
    trafficDensity: 'medium',
    playerX: 155,
    playerZ: 25,
    playerHeading: 0,
    timeOfDayHours: 9.5,
    gpsPathPoints: [],
    targetPoint: null,
    trafficLights: [],
    policePositions: [],
    trafficPositions: []
  });

  const soundEngine = useMemo(() => new SoundEngine(), []);

  const controlsRef = useRef<ControlsInput>({
    throttle: 0,
    brake: 0,
    steerInput: 0,
    steerWheelDeg: 0,
    keyboardSteerDir: 0,
    virtualWheelActive: false,
    gear: 'D',
    leftSignal: false,
    rightSignal: false,
    horn: false,
    headlights: false
  });

  const heldKeysRef = useRef<Set<string>>(new Set());
  const activeRideRef = useRef<ActiveRide | null>(activeRide);
  activeRideRef.current = activeRide;

  const pendingOfferRef = useRef<RideOffer | null>(pendingOffer);
  pendingOfferRef.current = pendingOffer;

  const offerRemainingMsRef = useRef<number>(offerRemainingMs);
  offerRemainingMsRef.current = offerRemainingMs;

  const dispatchReasonRef = useRef<'initial' | 'completed' | 'declined' | 'expired' | 'idle'>('initial');

  const profileRef = useRef<PlayerProfile>(profile);
  profileRef.current = profile;

  const telemetryRef = useRef<HudTelemetry>(telemetry);
  telemetryRef.current = telemetry;

  // Save profile whenever it updates
  useEffect(() => {
    if (profile.driverName) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [profile]);

  const pushMessage = useCallback(
    (sender: RideMessage['sender'], senderName: string, text: string, tone: RideMessage['tone'] = 'normal') => {
      setMessages((prev) => [
        {
          id: `msg_${Date.now()}_${Math.random()}`,
          sender,
          senderName,
          text,
          timestamp: nowTimeStr(),
          tone
        },
        ...prev.slice(0, 29)
      ]);
      if (!isPhoneOpen) {
        setUnreadPhoneCount((c) => c + 1);
      }
    },
    [isPhoneOpen]
  );

  // Keyboard Controls
  useEffect(() => {
    const syncKeyboardToControls = () => {
      const keys = heldKeysRef.current;
      const ctrl = controlsRef.current;
      if (isTitleMode || isGarageOpen || isSettingsOpen || Boolean(tripResult)) {
        ctrl.throttle = 0;
        ctrl.brake = 0;
        ctrl.keyboardSteerDir = 0;
        ctrl.virtualWheelActive = false;
        return;
      }

      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const space = keys.has('Space');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');

      if (ctrl.gear === 'D') {
        ctrl.throttle = up ? 1 : 0;
        ctrl.brake = down || space ? 1 : 0;
      } else {
        // In Reverse gear, W or S reverses cleanly; Space brakes
        ctrl.throttle = up || down ? 1 : 0;
        ctrl.brake = space ? 1 : 0;
      }

      ctrl.keyboardSteerDir = (right ? 1 : 0) - (left ? 1 : 0);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTitleMode) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      heldKeysRef.current.add(e.code);

      if (!e.repeat) {
        if (e.code === 'KeyP') {
          setIsPhoneOpen((v) => {
            if (!v) setUnreadPhoneCount(0);
            return !v;
          });
        } else if (e.code === 'KeyG') {
          if (!activeRideRef.current) setIsGarageOpen((v) => !v);
        } else if (e.code === 'KeyC') {
          setCameraMode((m) => (m === 'chase' ? 'close' : m === 'close' ? 'hood' : 'chase'));
        } else if (e.code === 'KeyM') {
          const nextMute = !soundEngine.isMuted();
          soundEngine.setMuted(nextMute);
          setIsMuted(nextMute);
        } else if (e.code === 'KeyQ') {
          controlsRef.current.leftSignal = !controlsRef.current.leftSignal;
          if (controlsRef.current.leftSignal) controlsRef.current.rightSignal = false;
        } else if (e.code === 'KeyE') {
          controlsRef.current.rightSignal = !controlsRef.current.rightSignal;
          if (controlsRef.current.rightSignal) controlsRef.current.leftSignal = false;
        } else if (e.code === 'KeyL') {
          controlsRef.current.headlights = !controlsRef.current.headlights;
        } else if (e.code === 'KeyH') {
          soundEngine.playHorn();
        } else if (e.code === 'KeyR') {
          controlsRef.current.gear = controlsRef.current.gear === 'D' ? 'R' : 'D';
        }
      }

      syncKeyboardToControls();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
      syncKeyboardToControls();
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      syncKeyboardToControls();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [isTitleMode, isGarageOpen, isSettingsOpen, tripResult, soundEngine]);

  // Automatic Incoming Ride Offers when idle with variable demand intervals
  const spawnRideOffer = useCallback(() => {
    const p = profileRef.current;
    const spec = getVehicleSpec(p.activeVehicleId);
    const city = getCityMap(p.activeCity);
    const offer = generateRideOffer(city, spec.maxPassengers, spec.fareMultiplier);
    setPendingOffer(offer);
    setOfferRemainingMs(RIDE_OFFER_TIMEOUT_MS);
    offerRemainingMsRef.current = RIDE_OFFER_TIMEOUT_MS;
    setIsOfferPopupDismissed(false);
    soundEngine.playPhoneChime('offer');
    if (!isPhoneOpen) setUnreadPhoneCount((c) => c + 1);
  }, [isPhoneOpen, soundEngine]);

  useEffect(() => {
    if (isTitleMode || isGarageOpen || isSettingsOpen || activeRide || pendingOffer || tripResult) return;
    const t = telemetryRef.current;
    const delayMs = computeNextRideDelayMs(
      profile.activeCity,
      t.timeOfDayHours,
      t.trafficDensity,
      dispatchReasonRef.current
    );
    const timer = window.setTimeout(() => {
      dispatchReasonRef.current = 'idle';
      spawnRideOffer();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [
    isTitleMode,
    isGarageOpen,
    isSettingsOpen,
    activeRide,
    pendingOffer,
    tripResult,
    profile.activeCity,
    spawnRideOffer
  ]);

  // 60-Second Expiration Countdown for Pending Ride Offer (pauses cleanly when modals are open)
  useEffect(() => {
    if (!pendingOffer || isTitleMode || isGarageOpen || isSettingsOpen || tripResult) return;
    let lastTick = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const dt = Math.min(500, Math.max(0, now - lastTick));
      lastTick = now;

      const nextMs = offerRemainingMsRef.current - dt;
      if (nextMs <= 0) {
        const expired = pendingOfferRef.current;
        offerRemainingMsRef.current = 0;
        setOfferRemainingMs(0);
        setPendingOffer(null);
        setIsOfferPopupDismissed(false);
        dispatchReasonRef.current = 'expired';
        soundEngine.playPhoneChime('warning');
        showCornerToast('Đã hết 60 giây chờ — mất cuốc xe vừa nổ!', 'danger', 4200);
        if (expired) {
          pushMessage(
            'system',
            'Tổng đài TaxiGo',
            `Cuốc xe từ ${expired.pickupName} → ${expired.dropoffName} (${formatVND(
              expired.estimatedFare
            )}) đã hết hạn sau 60 giây chờ và được chuyển cho tài xế khác.`,
            'warning'
          );
        }
      } else {
        offerRemainingMsRef.current = nextMs;
        setOfferRemainingMs(nextMs);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [pendingOffer, isTitleMode, isGarageOpen, isSettingsOpen, tripResult, pushMessage, showCornerToast, soundEngine]);

  // Dynamic weather rotation every 2 minutes
  useEffect(() => {
    if (isTitleMode) return;
    const pool: WeatherType[] = ['sunny', 'sunny', 'cloudy', 'rain', 'fog'];
    const id = window.setInterval(() => {
      setWeather(pool[Math.floor(Math.random() * pool.length)]);
    }, 120_000);
    return () => clearInterval(id);
  }, [isTitleMode]);

  const handleStartGame = (driverName: string, city: CityId) => {
    soundEngine.init();
    dispatchReasonRef.current = 'initial';
    setProfile((prev) => ({
      ...prev,
      driverName,
      activeCity: city
    }));
    setIsTitleMode(false);
  };

  const handleAcceptRide = () => {
    if (!pendingOffer) return;
    const city = getCityMap(profile.activeCity);
    const startNode = findNearestNode(city, telemetry.playerX, telemetry.playerZ);
    const route = findShortestRoute(city, startNode.id, pendingOffer.pickupNodeId);

    const newRide: ActiveRide = {
      offer: pendingOffer,
      phase: 'to_pickup',
      satisfaction: 100,
      startTime: Date.now(),
      elapsedSeconds: 0,
      finesDuringRide: 0,
      collisionsDuringRide: 0,
      routeNodeIds: route.nodeIds,
      currentStepIndex: 0,
      nextTurnInstruction: `Đi tới ${pendingOffer.pickupName}`,
      distanceRemainingM: route.totalDistM
    };

    dispatchReasonRef.current = 'completed';
    offerRemainingMsRef.current = 0;
    setOfferRemainingMs(0);
    setIsOfferPopupDismissed(false);
    setActiveRide(newRide);
    setPendingOffer(null);
    setIsPhoneOpen(false);
    soundEngine.playPhoneChime('message');
    showCornerToast(`Đã nhận cuốc! Chạy xe tới đón khách tại ${pendingOffer.pickupName}.`, 'info', 4000);
    pushMessage(
      'customer',
      pendingOffer.passengerName,
      `Em đang chờ ở ${pendingOffer.pickupName} (${pendingOffer.pickupStreet}). ${pendingOffer.passengerNote}`,
      'normal'
    );
  };

  const handleDeclineRide = () => {
    dispatchReasonRef.current = 'declined';
    offerRemainingMsRef.current = 0;
    setOfferRemainingMs(0);
    setIsOfferPopupDismissed(false);
    setPendingOffer(null);
    showCornerToast('Đã bỏ qua cuốc xe. Chờ nổ cuốc tiếp theo...', 'info', 2500);
  };

  const handleCancelActiveRide = () => {
    if (!activeRide) return;
    dispatchReasonRef.current = 'declined';
    setActiveRide(null);
    setCustomerOverheadSpeech(null);
    setProfile((prev) => ({ ...prev, money: Math.max(0, prev.money - 50_000) }));
    pushMessage('system', 'Tổng đài', 'Bạn đã hủy cuốc xe đang chạy (-50.000 ₫ phí hủy).', 'warning');
  };

  const handleReachedPickup = useCallback(() => {
    setActiveRide((prev) => {
      if (!prev || prev.phase !== 'to_pickup') return prev;
      const city = getCityMap(profileRef.current.activeCity);
      const route = findShortestRoute(city, prev.offer.pickupNodeId, prev.offer.dropoffNodeId);
      soundEngine.playPhoneChime('cash');
      showCornerToast(
        `${prev.offer.passengerName} đã lên xe! Đưa khách tới ${prev.offer.dropoffName}.`,
        'success',
        4000
      );
      showCustomerOverheadSpeech(
        prev.offer.passengerName,
        `Mình lên xe rồi nhé! Chạy tới ${prev.offer.dropoffName} nha bác tài!`,
        4500
      );
      pushMessage(
        'customer',
        prev.offer.passengerName,
        `Mình đã lên xe rồi nhé! Đưa mình tới ${prev.offer.dropoffName} (${prev.offer.dropoffStreet}) nha bác tài.`,
        'happy'
      );
      return {
        ...prev,
        phase: 'to_dropoff',
        routeNodeIds: route.nodeIds,
        nextTurnInstruction: `Hướng tới ${prev.offer.dropoffName}`,
        distanceRemainingM: route.totalDistM
      };
    });
  }, [pushMessage, showCornerToast, showCustomerOverheadSpeech, soundEngine]);

  const handleReachedDropoff = useCallback(() => {
    const ride = activeRideRef.current;
    if (!ride || ride.phase !== 'to_dropoff') return;

    const spec = getVehicleSpec(profileRef.current.activeVehicleId);
    const { rating, comment, tags } = buildCustomerFeedback(
      ride.satisfaction,
      ride.finesDuringRide,
      ride.collisionsDuringRide,
      spec.fareMultiplier
    );

    const baseFare = 15_000;
    const distanceFare = Math.round(ride.offer.distanceKm * 13_500);
    const trafficBonus =
      ride.offer.trafficLevel === 'high'
        ? Math.round((baseFare + distanceFare) * 0.32)
        : ride.offer.trafficLevel === 'medium'
        ? Math.round((baseFare + distanceFare) * 0.12)
        : 0;
    const subTotal = baseFare + distanceFare + trafficBonus;
    const vehicleBonus = Math.round(subTotal * Math.max(0, spec.fareMultiplier - 1));
    const tipBonus = rating === 5 ? Math.round(subTotal * 0.2) : rating === 4 ? Math.round(subTotal * 0.08) : 0;
    const totalEarned = Math.round((subTotal + vehicleBonus + tipBonus) / 1000) * 1000;

    const receipt: CompletedRideReceipt = {
      passengerName: ride.offer.passengerName,
      pickupName: ride.offer.pickupName,
      dropoffName: ride.offer.dropoffName,
      distanceKm: ride.offer.distanceKm,
      trafficLevel: ride.offer.trafficLevel,
      baseFare,
      distanceFare,
      trafficBonus,
      vehicleBonus,
      tipBonus,
      finesDeducted: 0,
      totalEarned,
      rating,
      comment
    };

    soundEngine.playPhoneChime('cash');
    setCustomerOverheadSpeech(null);
    setActiveRide(null);
    setTripResult({ receipt, tags });

    setProfile((prev) => ({
      ...prev,
      money: prev.money + totalEarned,
      totalEarned: prev.totalEarned + totalEarned,
      completedRides: prev.completedRides + 1,
      totalDistanceKm: prev.totalDistanceKm + ride.offer.distanceKm,
      ratingSum: prev.ratingSum + rating,
      ratingCount: prev.ratingCount + 1,
      reviews: [
        {
          id: `rev_${Date.now()}`,
          passengerName: ride.offer.passengerName,
          rating,
          comment,
          route: `${ride.offer.pickupName} → ${ride.offer.dropoffName}`,
          fareEarned: totalEarned,
          timestamp: nowTimeStr()
        },
        ...prev.reviews.slice(0, 19)
      ]
    }));

    pushMessage(
      'customer',
      ride.offer.passengerName,
      `Cảm ơn bác tài! Mình đã gửi đánh giá ${rating}/5 sao và thanh toán ${formatVND(totalEarned)}.`,
      rating >= 4 ? 'happy' : 'angry'
    );
  }, [pushMessage, soundEngine]);

  const handleViolation = useCallback(
    (
      type: 'speeding' | 'red_light' | 'collision' | 'wrong_way',
      streetName: string,
      fine: number,
      meta?: { billNote?: string; speedKmh?: number; speedLimit?: number; timeLabel?: string }
    ) => {
      const title =
        type === 'speeding'
          ? 'Chạy quá tốc độ'
          : type === 'red_light'
          ? 'Vượt đèn đỏ'
          : type === 'wrong_way'
          ? 'Đi ngược chiều đường một chiều'
          : 'Gây va chạm giao thông';

      const timeLabel = meta?.timeLabel || new Date().toLocaleTimeString('vi-VN', { hour12: false });
      const billNote =
        meta?.billNote ||
        (type === 'red_light'
          ? `Bị camera giám sát tại giao lộ ${streetName} ghi nhận vào lúc ${timeLabel}`
          : type === 'speeding'
          ? `Bị CSGT tuần tra phát hiện chạy quá tốc độ tại ${streetName} lúc ${timeLabel}`
          : type === 'wrong_way'
          ? `Đi ngược chiều đường một chiều tại ${streetName} lúc ${timeLabel}`
          : `Gây va chạm giao thông tại ${streetName} lúc ${timeLabel}`);

      const newRecord: ViolationRecord = {
        id: `vio_${Date.now()}`,
        type,
        title,
        fineAmount: fine,
        streetName,
        timestamp: timeLabel,
        billNote,
        speedKmh: meta?.speedKmh,
        speedLimit: meta?.speedLimit
      };

      setProfile((prev) => ({
        ...prev,
        money: Math.max(0, prev.money - fine),
        violations: [newRecord, ...prev.violations.slice(0, 19)]
      }));

      // Show non-blocking Fine Bill popup card cleanly on HUD (especially for red-light camera & CSGT bills)
      if (fineBillTimerRef.current) window.clearTimeout(fineBillTimerRef.current);
      setFineBillPopup(newRecord);
      fineBillTimerRef.current = window.setTimeout(() => setFineBillPopup(null), 7000);

      pushMessage(
        'police',
        type === 'red_light' ? 'Camera Giám Sát Giao Thông' : 'CSGT Tuần tra',
        type === 'red_light'
          ? `BILL PHẠT NGUỘI: Vượt đèn đỏ — ${billNote}. Mức phạt: ${formatVND(fine)}.`
          : `Biên bản: ${billNote}. Mức phạt: ${formatVND(fine)}.`,
        'warning'
      );

      // Customer angry reaction if on an active trip!
      const ride = activeRideRef.current;
      if (ride) {
        const penaltySat = type === 'collision' ? 24 : type === 'wrong_way' ? 22 : type === 'red_light' ? 20 : 14;
        const shortLine =
          type === 'collision'
            ? 'Trời ơi, đâm xe rồi kìa! Anh lái cẩn thận chút!'
            : type === 'red_light'
            ? 'Đèn đỏ mà anh cũng vượt à? Bị camera chụp phạt rồi kìa!'
            : type === 'wrong_way'
            ? 'Đường một chiều đó anh ơi, quay xe lại ngay!'
            : 'Chậm lại chút đi anh ơi, bị CSGT thổi phạt rồi kìa!';
        const angryText = `${ride.offer.passengerName}: "${shortLine}"`;

        showCornerToast(angryText, 'danger', 4000);
        if (ride.phase === 'to_dropoff') {
          showCustomerOverheadSpeech(ride.offer.passengerName, shortLine, 4200);
        }
        soundEngine.playPhoneChime('warning');
        pushMessage('customer', ride.offer.passengerName, shortLine, 'angry');

        setActiveRide((prev) =>
          prev
            ? {
                ...prev,
                satisfaction: Math.max(10, prev.satisfaction - penaltySat),
                finesDuringRide: prev.finesDuringRide + (type !== 'collision' ? 1 : 0),
                collisionsDuringRide: prev.collisionsDuringRide + (type === 'collision' ? 1 : 0)
              }
            : null
        );
      } else if (type !== 'red_light') {
        showCornerToast(`CSGT phạt ${formatVND(fine)}: ${billNote}`, 'danger', 3500);
      }
    },
    [pushMessage, showCornerToast, showCustomerOverheadSpeech, soundEngine]
  );

  // Garage Actions
  const handleSelectVehicle = (specId: string) => {
    setProfile((prev) => ({ ...prev, activeVehicleId: specId }));
  };

  const handleRentVehicle = (specId: string) => {
    const spec = getVehicleSpec(specId);
    setProfile((prev) => {
      if (prev.money < spec.rentCost) return prev;
      return {
        ...prev,
        money: prev.money - spec.rentCost,
        activeVehicleId: specId,
        garage: {
          ...prev.garage,
          [specId]: { ...prev.garage[specId], rented: true }
        }
      };
    });
  };

  const handleBuyVehicle = (specId: string) => {
    const spec = getVehicleSpec(specId);
    setProfile((prev) => {
      if (prev.money < spec.buyPrice) return prev;
      return {
        ...prev,
        money: prev.money - spec.buyPrice,
        activeVehicleId: specId,
        garage: {
          ...prev.garage,
          [specId]: { ...prev.garage[specId], owned: true, rented: false }
        }
      };
    });
    soundEngine.playPhoneChime('cash');
  };

  const handleUpgradePart = (specId: string, part: keyof VehicleUpgrades) => {
    setProfile((prev) => {
      const carState = prev.garage[specId];
      if (!carState) return prev;
      const curLv = carState.upgrades[part];
      if (curLv >= 4) return prev;
      const price = UPGRADE_CATALOG[part].prices[curLv + 1];
      if (prev.money < price) return prev;
      return {
        ...prev,
        money: prev.money - price,
        garage: {
          ...prev.garage,
          [specId]: {
            ...carState,
            upgrades: { ...carState.upgrades, [part]: curLv + 1 }
          }
        }
      };
    });
    soundEngine.playPhoneChime('message');
  };

  const handleCustomizeAppearance = (
    specId: string,
    patch: Partial<OwnedVehicleState['appearance']>,
    cost: number
  ) => {
    setProfile((prev) => {
      if (prev.money < cost) return prev;
      const carState = prev.garage[specId];
      if (!carState) return prev;
      return {
        ...prev,
        money: prev.money - cost,
        garage: {
          ...prev.garage,
          [specId]: {
            ...carState,
            appearance: { ...carState.appearance, ...patch }
          }
        }
      };
    });
  };

  const handleSwitchCity = (cityId: CityId) => {
    if (activeRide) return;
    dispatchReasonRef.current = 'initial';
    offerRemainingMsRef.current = 0;
    setOfferRemainingMs(0);
    setPendingOffer(null);
    setProfile((prev) => ({ ...prev, activeCity: cityId }));
    pushMessage('system', 'GPS Thế Giới Mở', `Đã di chuyển tới thành phố ${getCityMap(cityId).name}.`, 'normal');
  };

  const handleResetCareer = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatchReasonRef.current = 'initial';
    offerRemainingMsRef.current = 0;
    setOfferRemainingMs(0);
    setActiveRide(null);
    setPendingOffer(null);
    setTripResult(null);
    setProfile(createDefaultProfile());
    setIsSettingsOpen(false);
    setIsTitleMode(true);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Isolated 3D WebGL Canvas */}
      <GameViewport
        cityId={profile.activeCity}
        activeVehicleId={profile.activeVehicleId}
        garage={profile.garage}
        activeRide={activeRide}
        weather={weather}
        timeOfDayOverride={timeOfDayOverride}
        cameraMode={cameraMode}
        isTitleMode={isTitleMode}
        isPaused={isGarageOpen || isSettingsOpen || Boolean(tripResult)}
        controlsRef={controlsRef}
        soundEngine={soundEngine}
        customerOverheadSpeech={customerOverheadSpeech}
        onTelemetry={setTelemetry}
        onViolation={handleViolation}
        onReachedPickup={handleReachedPickup}
        onReachedDropoff={handleReachedDropoff}
        onNpcSpeech={handleNpcSpeech}
      />

      {/* Start Screen with Name Input */}
      {isTitleMode && (
        <TitleScreen
          initialName={profile.driverName}
          initialCity={profile.activeCity}
          hasSavedCareer={initialSaved.hasSaved}
          savedMoney={profile.money}
          onStart={handleStartGame}
        />
      )}

      {/* Active Driving HUD & Virtual Controls */}
      {!isTitleMode && (
        <DrivingControlsHUD
          profile={profile}
          telemetry={telemetry}
          activeRide={activeRide}
          pendingOffer={pendingOffer}
          offerRemainingSec={Math.max(0, Math.ceil(offerRemainingMs / 1000))}
          isOfferPopupVisible={!isOfferPopupDismissed}
          onAcceptRide={handleAcceptRide}
          onDeclineRide={handleDeclineRide}
          onOpenPhoneRides={() => {
            setIsPhoneOpen(true);
            setPhoneApp('rides');
            setUnreadPhoneCount(0);
          }}
          onDismissOfferPopup={() => setIsOfferPopupDismissed(true)}
          angryFeedbackToast={angryToast}
          fineBill={fineBillPopup}
          onDismissFineBill={() => setFineBillPopup(null)}
          npcSpeech={npcSpeech}
          unreadPhoneCount={unreadPhoneCount}
          isPhoneOpen={isPhoneOpen}
          cameraMode={cameraMode}
          isMuted={isMuted}
          controlsRef={controlsRef}
          onTogglePhone={() => {
            setIsPhoneOpen((v) => {
              if (!v) setUnreadPhoneCount(0);
              return !v;
            });
          }}
          onOpenMapInPhone={() => {
            setIsPhoneOpen(true);
            setPhoneApp('map');
            setUnreadPhoneCount(0);
          }}
          onOpenGarage={() => {
            if (!activeRide) setIsGarageOpen(true);
            else {
              showCornerToast('Hãy hoàn thành cuốc xe hiện tại trước khi vào Gara!', 'info', 2500);
            }
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCycleCamera={() =>
            setCameraMode((m) => (m === 'chase' ? 'close' : m === 'close' ? 'hood' : 'chase'))
          }
          onToggleMute={() => {
            const next = !soundEngine.isMuted();
            soundEngine.setMuted(next);
            setIsMuted(next);
          }}
          onHorn={() => soundEngine.playHorn()}
        />
      )}

      {/* Interactive Virtual Smartphone */}
      {!isTitleMode && (
        <VirtualPhone
          isOpen={isPhoneOpen}
          activeApp={phoneApp}
          profile={profile}
          telemetry={telemetry}
          pendingOffer={pendingOffer}
          offerRemainingSec={Math.max(0, Math.ceil(offerRemainingMs / 1000))}
          activeRide={activeRide}
          messages={messages}
          onClose={() => setIsPhoneOpen(false)}
          onSelectApp={setPhoneApp}
          onAcceptRide={handleAcceptRide}
          onDeclineRide={handleDeclineRide}
          onRequestNewOffer={spawnRideOffer}
          onCancelActiveRide={handleCancelActiveRide}
          onSwitchCity={handleSwitchCity}
          onOpenGarage={() => {
            setIsPhoneOpen(false);
            if (!activeRide) setIsGarageOpen(true);
          }}
          onOpenSettings={() => {
            setIsPhoneOpen(false);
            setIsSettingsOpen(true);
          }}
        />
      )}

      {/* Garage & Dealership Modal */}
      {isGarageOpen && (
        <GarageModal
          profile={profile}
          onClose={() => setIsGarageOpen(false)}
          onSelectVehicle={handleSelectVehicle}
          onRentVehicle={handleRentVehicle}
          onBuyVehicle={handleBuyVehicle}
          onUpgradePart={handleUpgradePart}
          onCustomizeAppearance={handleCustomizeAppearance}
        />
      )}

      {/* Trip Complete & 5-Star Customer Feedback Modal */}
      {tripResult && (
        <TripSummaryModal
          receipt={tripResult.receipt}
          tags={tripResult.tags}
          onClose={() => setTripResult(null)}
        />
      )}

      {/* Dynamic Weather, Day/Night & Camera Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          weather={weather}
          timeOfDayOverride={timeOfDayOverride}
          cameraMode={cameraMode}
          onChangeWeather={setWeather}
          onChangeTimeOverride={setTimeOfDayOverride}
          onChangeCameraMode={setCameraMode}
          onResetCareer={handleResetCareer}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </main>
  );
}
