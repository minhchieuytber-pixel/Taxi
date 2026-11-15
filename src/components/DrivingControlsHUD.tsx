import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Camera,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  CornerUpRight,
  MapPin,
  RotateCcw,
  Settings,
  Smartphone,
  Star,
  Volume2,
  VolumeX,
  AlertTriangle,
  Check,
  Clock,
  FileText,
  Lightbulb,
  Megaphone,
  X
} from 'lucide-react';
import { formatVND, getVehicleSpec } from '../data/vehicles';
import {
  ActiveRide,
  CameraMode,
  CityId,
  ControlsInput,
  GearMode,
  HudTelemetry,
  NavDirection,
  NpcSpeechBubble,
  PlayerProfile,
  RideOffer,
  ViolationRecord
} from '../types/game';
import { MinimapHUD } from './MinimapHUD';

interface DrivingControlsHUDProps {
  profile: PlayerProfile;
  telemetry: HudTelemetry;
  activeRide: ActiveRide | null;
  pendingOffer?: RideOffer | null;
  offerRemainingSec?: number;
  isOfferPopupVisible?: boolean;
  onAcceptRide?: () => void;
  onDeclineRide?: () => void;
  onOpenPhoneRides?: () => void;
  onDismissOfferPopup?: () => void;
  angryFeedbackToast: { text: string; tone: 'danger' | 'success' | 'info' } | null;
  fineBill?: ViolationRecord | null;
  onDismissFineBill?: () => void;
  npcSpeech?: NpcSpeechBubble | null;
  unreadPhoneCount: number;
  isPhoneOpen: boolean;
  cameraMode: CameraMode;
  isMuted: boolean;
  controlsRef: React.MutableRefObject<ControlsInput>;
  onTogglePhone: () => void;
  onOpenMapInPhone: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onHorn: () => void;
}

function computePedalIntensity(e: React.PointerEvent<HTMLButtonElement>): number {
  const rect = e.currentTarget.getBoundingClientRect();
  // Touch lower on the pedal for light throttle/braking (~0.40), higher for full/emergency (~1.0)
  const relY = rect.height > 0 ? Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height)) : 0.7;
  const posLevel = 0.4 + relY * 0.6;
  // Blend with hardware touch force if supported by device (default mouse/fallback is 0.5 or 0)
  if (e.pressure > 0 && Math.abs(e.pressure - 0.5) > 0.08) {
    return Math.max(0.35, Math.min(1, posLevel * 0.65 + e.pressure * 0.45));
  }
  return Math.max(0.4, Math.min(1, posLevel));
}

export const DrivingControlsHUD: React.FC<DrivingControlsHUDProps> = ({
  profile,
  telemetry,
  activeRide,
  pendingOffer,
  offerRemainingSec = 60,
  isOfferPopupVisible = false,
  onAcceptRide,
  onDeclineRide,
  onOpenPhoneRides,
  onDismissOfferPopup,
  angryFeedbackToast,
  fineBill,
  onDismissFineBill,
  npcSpeech,
  unreadPhoneCount,
  isPhoneOpen,
  cameraMode,
  isMuted,
  controlsRef,
  onTogglePhone,
  onOpenMapInPhone,
  onOpenGarage,
  onOpenSettings,
  onCycleCamera,
  onToggleMute,
  onHorn
}) => {
  const [gearUI, setGearUI] = useState<GearMode>(controlsRef.current.gear);
  const [leftSigUI, setLeftSigUI] = useState(false);
  const [rightSigUI, setRightSigUI] = useState(false);
  const [headlightsUI, setHeadlightsUI] = useState(false);
  const [throttleLevel, setThrottleLevel] = useState(0);
  const [brakeLevel, setBrakeLevel] = useState(0);

  useEffect(() => {
    setLeftSigUI(telemetry.leftSignal);
  }, [telemetry.leftSignal]);

  useEffect(() => {
    setRightSigUI(telemetry.rightSignal);
  }, [telemetry.rightSignal]);

  useEffect(() => {
    setGearUI(telemetry.gear);
  }, [telemetry.gear]);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const wheelPointerIdRef = useRef<number | null>(null);
  const prevWheelAngleRef = useRef<number | null>(null);
  const prevClientXRef = useRef<number | null>(null);

  const gasPointerIdRef = useRef<number | null>(null);
  const brakePointerIdRef = useRef<number | null>(null);

  const spec = getVehicleSpec(profile.activeVehicleId);
  const avgRating =
    profile.ratingCount > 0 ? (profile.ratingSum / profile.ratingCount).toFixed(2) : 'Mới';

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    wheelPointerIdRef.current = e.pointerId;
    controlsRef.current.virtualWheelActive = true;
    const el = wheelRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      prevWheelAngleRef.current = Math.atan2(dy, dx);
      prevClientXRef.current = e.clientX;
    }
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    let deltaDeg = 0;
    if (dist > 14 && prevWheelAngleRef.current !== null) {
      const currAng = Math.atan2(dy, dx);
      const rawDelta = currAng - prevWheelAngleRef.current;
      const shortestRad = Math.atan2(Math.sin(rawDelta), Math.cos(rawDelta));
      deltaDeg = (shortestRad * 180) / Math.PI;
      prevWheelAngleRef.current = currAng;
    } else if (prevClientXRef.current !== null) {
      deltaDeg = (e.clientX - prevClientXRef.current) * 3.2;
      prevWheelAngleRef.current = dist > 14 ? Math.atan2(dy, dx) : null;
    }
    prevClientXRef.current = e.clientX;

    const nextDeg = Math.max(-720, Math.min(720, controlsRef.current.steerWheelDeg + deltaDeg));
    controlsRef.current.steerWheelDeg = nextDeg;
    controlsRef.current.steerInput = nextDeg / 720;
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    wheelPointerIdRef.current = null;
    prevWheelAngleRef.current = null;
    prevClientXRef.current = null;
    controlsRef.current.virtualWheelActive = false;
  };

  const toggleGear = (g: GearMode) => {
    controlsRef.current.gear = g;
    setGearUI(g);
  };

  const toggleLeftSignal = () => {
    const next = !controlsRef.current.leftSignal;
    controlsRef.current.leftSignal = next;
    if (next) controlsRef.current.rightSignal = false;
    setLeftSigUI(next);
    setRightSigUI(false);
  };

  const toggleRightSignal = () => {
    const next = !controlsRef.current.rightSignal;
    controlsRef.current.rightSignal = next;
    if (next) controlsRef.current.leftSignal = false;
    setRightSigUI(next);
    setLeftSigUI(false);
  };

  const toggleHeadlights = () => {
    const next = !controlsRef.current.headlights;
    controlsRef.current.headlights = next;
    setHeadlightsUI(next);
  };

  const isSpeeding = telemetry.speedLimit !== null && telemetry.speedKmh > telemetry.speedLimit + 8;
  const formattedHour = `${String(Math.floor(telemetry.timeOfDayHours)).padStart(2, '0')}:${String(
    Math.floor((telemetry.timeOfDayHours % 1) * 60)
  ).padStart(2, '0')}`;

  const renderNavArrow = (dir: NavDirection | null, sizeClass = 'w-5 h-5') => {
    if (dir === 'left') return <CornerUpLeft className={sizeClass} />;
    if (dir === 'right') return <CornerUpRight className={sizeClass} />;
    if (dir === 'uturn') return <RotateCcw className={sizeClass} />;
    if (dir === 'arrive') return <MapPin className={sizeClass} />;
    return <ArrowUp className={sizeClass} />;
  };

  const navBadgeBg =
    telemetry.navDirection === 'left' || telemetry.navDirection === 'right'
      ? 'bg-amber-400 text-slate-950'
      : telemetry.navDirection === 'uturn'
      ? 'bg-red-500 text-white'
      : activeRide?.phase === 'to_pickup'
      ? 'bg-emerald-500 text-slate-950'
      : 'bg-sky-400 text-slate-950';

  const navNextLabel =
    telemetry.navNextTurnDirection === 'left'
      ? 'rẽ trái'
      : telemetry.navNextTurnDirection === 'right'
      ? 'rẽ phải'
      : telemetry.navNextTurnDirection === 'uturn'
      ? 'quay đầu'
      : telemetry.navNextTurnDirection === 'arrive'
      ? 'điểm đến'
      : '';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none touch-none select-none flex flex-col justify-between p-2 sm:p-3 md:p-4">
      {/* TOP-CENTER POPUP STACK: Fine Bill Receipt & Phone Incoming Ride Notification Popup */}
      {(fineBill || (pendingOffer && isOfferPopupVisible && !isPhoneOpen)) && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-sm flex flex-col gap-2 pointer-events-none">
          {pendingOffer && isOfferPopupVisible && !isPhoneOpen && (
            <div className="pointer-events-auto rounded-[22px] bg-gradient-to-b from-zinc-500/90 via-zinc-700/90 to-zinc-600/90 p-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
              <div className="rounded-[20px] bg-slate-950/97 border border-amber-400/50 p-3 text-slate-100">
                {/* iPhone Notification Bar Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-amber-300 truncate">
                        iPhone 18 · {pendingOffer.isVip ? 'Có cuốc VIP mới' : 'Thông báo nổ cuốc'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        TaxiGo Driver · {pendingOffer.passengerCount} khách · {pendingOffer.distanceKm} km
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`font-mono-num text-xs font-bold flex items-center gap-1 ${
                        offerRemainingSec <= 15 ? 'text-red-400' : 'text-amber-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {offerRemainingSec}s
                    </span>
                    {onDismissOfferPopup && (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onDismissOfferPopup}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="Thu gọn về iPhone"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 60-Second Countdown Progress Bar */}
                <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      offerRemainingSec <= 15 ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (offerRemainingSec / 60) * 100))}%` }}
                  />
                </div>

                {/* Passenger & Estimated Fare */}
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{pendingOffer.passengerName}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {pendingOffer.trafficLevel === 'high'
                        ? 'Đường đông (+32%)'
                        : pendingOffer.trafficLevel === 'medium'
                        ? 'Giao thông TB (+12%)'
                        : 'Đường thoáng'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400">Cước dự kiến</div>
                    <div className="font-mono-num text-sm font-bold text-emerald-400">
                      {formatVND(pendingOffer.estimatedFare)}
                    </div>
                  </div>
                </div>

                {/* Pickup -> Dropoff */}
                <div className="mt-2 rounded-xl bg-slate-900/95 border border-slate-800 px-2.5 py-2 text-[11px] space-y-1">
                  <div className="flex items-baseline gap-1.5 truncate">
                    <span className="font-bold text-emerald-400 shrink-0">Đón:</span>
                    <span className="text-slate-100 truncate">{pendingOffer.pickupName}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 truncate">
                    <span className="font-bold text-amber-400 shrink-0">Trả:</span>
                    <span className="text-slate-100 truncate">{pendingOffer.dropoffName}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2.5 flex items-center gap-2">
                  {onDeclineRide && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onDeclineRide}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Từ chối
                    </button>
                  )}
                  {onOpenPhoneRides && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onOpenPhoneRides}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Mở ĐT
                    </button>
                  )}
                  {onAcceptRide && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onAcceptRide}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Nhận cuốc</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {fineBill && (
            <div className="pointer-events-auto bg-slate-950/96 border-2 border-red-500/85 rounded-2xl p-3 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-red-900/60">
                <div className="flex items-center gap-2 text-red-400">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="font-display font-bold text-xs tracking-wide uppercase">
                    {fineBill.type === 'red_light'
                      ? 'BILL PHẠT NGUỘI · CAMERA GIÁM SÁT'
                      : fineBill.type === 'speeding'
                      ? 'BILL PHẠT CSGT · QUÁ TỐC ĐỘ'
                      : `BIÊN BẢN PHẠT · ${fineBill.title.toUpperCase()}`}
                  </span>
                </div>
                <span className="font-mono-num text-[11px] font-bold text-amber-300">{fineBill.timestamp}</span>
              </div>

              <p className="mt-2 text-xs text-slate-100 leading-relaxed">
                {fineBill.billNote || `${fineBill.title} tại ${fineBill.streetName}`}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Tiền phạt trừ ví:{' '}
                  <strong className="font-mono-num text-sm text-red-400">-{formatVND(fineBill.fineAmount)}</strong>
                </span>
                {onDismissFineBill && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDismissFineBill();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOP BAR ROW */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* TOP LEFT: Minimap + GPS Turn Arrows + Traffic Light Countdown + Wrong-Way Warning */}
        <div className="flex flex-col gap-1.5 pointer-events-auto min-w-0">
          <div className="flex items-start gap-2">
            <MinimapHUD
              cityId={profile.activeCity as CityId}
              telemetry={telemetry}
              onOpenFullMap={onOpenMapInPhone}
            />

            <div className="hidden sm:flex flex-col gap-1.5 max-w-[230px] md:max-w-[255px]">
              {/* Active GPS Turn-by-Turn Arrow & Distance Card */}
              {activeRide ? (
                <div
                  className={`bg-slate-950/92 rounded-xl px-2.5 py-2 shadow-lg border ${
                    activeRide.phase === 'to_pickup' ? 'border-emerald-500/60' : 'border-sky-500/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md ${navBadgeBg}`}
                    >
                      {renderNavArrow(telemetry.navDirection, 'w-6 h-6 stroke-[2.5]')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-bold tracking-wide ${
                            activeRide.phase === 'to_pickup' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {activeRide.phase === 'to_pickup' ? 'ĐI ĐÓN KHÁCH' : 'CHỞ KHÁCH'}
                        </span>
                        <span className="font-mono-num text-xs font-bold text-white">
                          {telemetry.navDistanceM ?? Math.round(activeRide.distanceRemainingM)} m
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white leading-tight truncate mt-0.5">
                        {telemetry.navSummary || activeRide.nextTurnInstruction}
                      </div>
                      {telemetry.navDirection === 'straight' &&
                        telemetry.navNextTurnDirection &&
                        telemetry.navNextTurnDirection !== 'arrive' && (
                          <div className="text-[10px] text-amber-300 font-medium mt-0.5">
                            Chuẩn bị {navNextLabel} sau {telemetry.navDistanceM}m
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400 font-mono-num">
                    <span className="truncate">{activeRide.offer.passengerName}</span>
                    <span>Tổng {telemetry.navTotalRemainingM ?? Math.round(activeRide.distanceRemainingM)}m</span>
                  </div>
                </div>
              ) : pendingOffer ? (
                <button
                  type="button"
                  onClick={onOpenPhoneRides || onTogglePhone}
                  className="bg-slate-950/92 border border-amber-400/80 hover:border-amber-300 rounded-xl px-3 py-2 shadow-lg text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-amber-400">
                    <span>CÓ CUỐC XE MỚI</span>
                    <span className="font-mono-num text-xs">{offerRemainingSec}s</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-200 truncate">
                    {pendingOffer.pickupName} · {formatVND(pendingOffer.estimatedFare)}
                  </div>
                </button>
              ) : (
                <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 shadow-lg">
                  <div className="text-[11px] font-semibold text-amber-400">ĐANG CHỜ CUỐC XE</div>
                  <div className="mt-0.5 text-xs text-slate-300">
                    Mở iPhone 18 (P) · Cuốc đến theo mật độ giờ
                  </div>
                </div>
              )}

              {/* Wrong-way One-Way Street Warning */}
              {telemetry.wrongWayWarning && (
                <div className="rounded-xl px-2.5 py-1.5 border bg-red-950/95 border-red-400 text-red-100 shadow-lg flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>CẢNH BÁO: ĐI NGƯỢC CHIỀU!</span>
                </div>
              )}

              {/* 3-Lamp Traffic Light + Countdown Seconds + Red Light Warning */}
              {telemetry.activeTrafficLight && (
                <div
                  className={`rounded-xl px-2.5 py-1.5 border shadow-lg transition-colors ${
                    telemetry.redLightWarning
                      ? 'bg-red-950/95 border-red-400'
                      : 'bg-slate-950/92 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          telemetry.activeTrafficLight === 'red'
                            ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                            : 'bg-red-950'
                        }`}
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          telemetry.activeTrafficLight === 'yellow'
                            ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                            : 'bg-amber-950'
                        }`}
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          telemetry.activeTrafficLight === 'green'
                            ? 'bg-emerald-500 shadow-[0_0_8px_#22c55e]'
                            : 'bg-emerald-950'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-bold ${
                            telemetry.activeTrafficLight === 'red'
                              ? 'text-red-300'
                              : telemetry.activeTrafficLight === 'yellow'
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {telemetry.redLightWarning
                            ? 'CẢNH BÁO ĐÈN ĐỎ!'
                            : telemetry.activeTrafficLight === 'red'
                            ? 'ĐÈN ĐỎ — DỪNG VẠCH'
                            : telemetry.activeTrafficLight === 'yellow'
                            ? 'ĐÈN VÀNG — GIẢM TỐC'
                            : 'ĐÈN XANH — ĐƯỢC ĐI'}
                        </span>
                        <span
                          className={`font-mono-num text-sm font-bold leading-none ${
                            telemetry.activeTrafficLight === 'red'
                              ? 'text-red-400'
                              : telemetry.activeTrafficLight === 'yellow'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {telemetry.activeTrafficLightSec ?? 0}s
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {telemetry.activeTrafficLightLabel} · cách {telemetry.activeTrafficLightDistM}m
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Police Patrol Warning */}
              {telemetry.nearestPoliceDistM !== null && telemetry.nearestPoliceDistM < 75 && (
                <div className="bg-blue-950/95 border border-blue-500/70 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs text-blue-100 shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold">CSGT tuần tra ({telemetry.nearestPoliceDistM}m)</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile compact GPS Arrow + Distance & Traffic Light Countdown */}
          <div className="sm:hidden flex flex-col gap-1 max-w-[205px]">
            {activeRide && (
              <div className="bg-slate-950/92 border border-sky-500/50 rounded-lg px-2 py-1 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${navBadgeBg}`}>
                  {renderNavArrow(telemetry.navDirection, 'w-4 h-4 stroke-[2.5]')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-sky-400 flex justify-between">
                    <span>{activeRide.phase === 'to_pickup' ? 'Đón khách' : 'Trả khách'}</span>
                    <span className="font-mono-num text-white">
                      {telemetry.navDistanceM ?? Math.round(activeRide.distanceRemainingM)}m
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-white truncate">
                    {telemetry.navSummary || activeRide.nextTurnInstruction}
                  </div>
                </div>
              </div>
            )}

            {telemetry.wrongWayWarning && (
              <div className="rounded-lg px-2 py-1 border bg-red-950/95 border-red-400 text-red-100 text-[10px] font-bold">
                ĐI NGƯỢC CHIỀU!
              </div>
            )}

            {telemetry.activeTrafficLight && (
              <div
                className={`rounded-lg px-2 py-1 border flex items-center justify-between gap-2 text-[11px] ${
                  telemetry.redLightWarning
                    ? 'bg-red-950/95 border-red-400 text-red-100'
                    : 'bg-slate-950/92 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      telemetry.activeTrafficLight === 'red'
                        ? 'bg-red-500'
                        : telemetry.activeTrafficLight === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="font-bold truncate">
                    {telemetry.redLightWarning
                      ? 'CẢNH BÁO ĐÈN ĐỎ!'
                      : telemetry.activeTrafficLight === 'red'
                      ? 'Đèn đỏ'
                      : telemetry.activeTrafficLight === 'yellow'
                      ? 'Đèn vàng'
                      : 'Đèn xanh'}
                  </span>
                </div>
                <span className="font-mono-num font-bold shrink-0">{telemetry.activeTrafficLightSec ?? 0}s</span>
              </div>
            )}
          </div>

          {/* Compact Corner Customer Feedback / Ride Status Toast */}
          {angryFeedbackToast && (
            <div
              className={`rounded-lg px-2.5 py-1.5 text-[11px] leading-snug font-medium shadow-lg max-w-[205px] sm:max-w-[250px] border ${
                angryFeedbackToast.tone === 'success'
                  ? 'bg-emerald-950/92 border-emerald-500/80 text-emerald-100'
                  : angryFeedbackToast.tone === 'info'
                  ? 'bg-sky-950/92 border-sky-500/80 text-sky-100'
                  : 'bg-red-950/92 border-red-500/80 text-red-100'
              }`}
            >
              {angryFeedbackToast.text}
            </div>
          )}
        </div>

        {/* TOP RIGHT: Cash/Rating + Function Buttons + Speedometer + Satisfaction Bar */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          <div className="bg-slate-950/92 border border-slate-700/85 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-4 shadow-xl">
            <div className="text-right">
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[100px] sm:max-w-[140px]">
                {profile.driverName} · {spec.name}
              </div>
              <div className="font-mono-num text-sm sm:text-base md:text-lg font-bold text-emerald-400">
                {formatVND(profile.money)}
              </div>
            </div>

            <div className="h-6 sm:h-7 w-px bg-slate-800" />

            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-amber-400 font-mono-num font-bold text-xs sm:text-sm">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400" />
                <span>{avgRating}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono-num">
                {formattedHour} ·{' '}
                <span
                  className={
                    telemetry.trafficDensity === 'high'
                      ? 'text-red-400'
                      : telemetry.trafficDensity === 'low'
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }
                >
                  {telemetry.trafficDensity === 'high'
                    ? 'Đông xe'
                    : telemetry.trafficDensity === 'low'
                    ? 'Thoáng'
                    : 'TB'}
                </span>
              </div>
            </div>
          </div>

          {/* Function Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={onTogglePhone}
              className={`relative px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPhoneOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-950/92 text-slate-100 border-slate-700 hover:border-slate-500'
              }`}
              title="Mở/Đóng iPhone 18 (P)"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden md:inline">Điện thoại</span>
              {unreadPhoneCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white font-mono-num text-[10px] font-bold">
                  {unreadPhoneCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-950/92 border border-slate-700 hover:border-amber-400 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Gara & Mua / Nâng cấp xe (G)"
            >
              <CarFront className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Gara xe</span>
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-950/92 border border-slate-700 hover:border-slate-500 text-slate-200 transition-colors cursor-pointer"
              title={`Đổi góc nhìn Camera (${cameraMode}) [C]`}
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-950/92 border border-slate-700 hover:border-slate-500 text-slate-200 transition-colors cursor-pointer"
              title="Thời tiết & Ngày/Đêm"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-950/92 border border-slate-700 hover:border-slate-500 text-slate-200 transition-colors cursor-pointer"
              title="Bật/Tắt âm thanh (M)"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* SPEEDOMETER + GEAR + RPM + SPEED LIMIT (Right side under function buttons) */}
          <div className="bg-slate-950/92 border border-slate-700/90 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-xl">
            <ChevronLeft
              className={`w-3.5 h-3.5 transition-colors ${
                (leftSigUI || telemetry.leftSignal) && telemetry.blinkOn
                  ? 'text-amber-400'
                  : 'text-slate-700'
              }`}
            />

            <div className="flex items-baseline gap-1">
              <span
                className={`font-display font-mono-num text-2xl sm:text-3xl font-bold leading-none ${
                  isSpeeding ? 'text-red-400' : 'text-white'
                }`}
              >
                {telemetry.speedKmh}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400">km/h</span>
            </div>

            <div className="h-6 sm:h-7 w-px bg-slate-800" />

            <div className="flex flex-col gap-1 min-w-[54px] sm:min-w-[68px]">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                <span className="text-slate-400">SỐ</span>
                <span
                  className={`font-mono-num font-bold ${
                    telemetry.gear === 'R' ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {telemetry.gear === 'R' ? 'R (Lùi)' : 'D (Tiến)'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75"
                  style={{ width: `${Math.round(telemetry.rpmRatio * 100)}%` }}
                />
              </div>
            </div>

            {telemetry.speedLimit !== null ? (
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-mono-num text-[11px] sm:text-xs font-bold shrink-0 ${
                  isSpeeding
                    ? 'border-red-500 bg-red-950 text-red-200'
                    : 'border-red-500/85 bg-white text-slate-950'
                }`}
                title="Giới hạn tốc độ đoạn đường này"
              >
                {telemetry.speedLimit}
              </div>
            ) : (
              <div
                className="px-1.5 py-0.5 rounded-md border border-slate-700 bg-slate-900 text-[10px] font-semibold text-slate-400 shrink-0"
                title="Đoạn đường không gắn biển giới hạn tốc độ"
              >
                Tự do
              </div>
            )}

            <ChevronRight
              className={`w-3.5 h-3.5 transition-colors ${
                (rightSigUI || telemetry.rightSignal) && telemetry.blinkOn
                  ? 'text-amber-400'
                  : 'text-slate-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS ROW */}
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {/* BOTTOM LEFT: Larger 2-Rotation Swipeable Virtual Steering Wheel + Horn/Lights */}
        <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
          <div className="flex flex-col items-center gap-1">
            {/* Rotation lock readout */}
            <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-700/80 text-[10px] font-mono-num text-slate-300 leading-none">
              {Math.abs(telemetry.steerWheelDeg) < 2
                ? '0°'
                : `${telemetry.steerWheelDeg > 0 ? '+' : ''}${Math.round(telemetry.steerWheelDeg)}° (${(
                    Math.abs(telemetry.steerWheelDeg) / 360
                  ).toFixed(1)}v)`}
            </div>

            {/* Larger Interactive 2-Turn (±720°) Virtual Steering Wheel */}
            <div
              ref={wheelRef}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-slate-950/90 border-2 border-slate-700 flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing touch-none select-none"
              title="Vuốt xoay vô lăng tối đa 2 vòng mỗi bên — thả tay tự trả lái (hoặc dùng A / D)"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 pointer-events-none"
                style={{ transform: `rotate(${telemetry.steerWheelDeg}deg)` }}
              >
                <circle cx="50" cy="50" r="42" fill="none" stroke="#334155" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="10"
                  strokeDasharray="16 248"
                  strokeDashoffset="-116"
                />
                <path d="M12 50 H38 M62 50 H88 M50 62 V88" stroke="#475569" strokeWidth="9" strokeLinecap="round" />
                <circle cx="50" cy="50" r="14" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
                <text x="50" y="53" textAnchor="middle" fill="#facc15" fontSize="9" fontWeight="bold">
                  TAXI
                </text>
              </svg>
            </div>
          </div>

          {/* Horn & Headlights (instant multi-touch onPointerDown) */}
          <div className="flex flex-col gap-1.5 pb-1">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onHorn();
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950/92 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center justify-center cursor-pointer active:bg-amber-400 active:text-slate-950 shadow-lg touch-none select-none"
              title="Còi xe (H)"
            >
              <Megaphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleHeadlights();
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shadow-lg touch-none select-none ${
                headlightsUI || telemetry.headlightsOn
                  ? 'bg-sky-500 text-slate-950 border-sky-300'
                  : 'bg-slate-950/92 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              title="Đèn pha (L)"
            >
              <Lightbulb className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BOTTOM CENTER: Optional Subtle Nearby NPC Caption (kept compact at bottom edge) */}
        <div className="hidden md:flex flex-col items-center justify-end pb-1 max-w-xs">
          {npcSpeech && (
            <div className="bg-slate-950/92 border border-slate-700/85 rounded-xl px-3 py-1.5 text-[11px] text-slate-200 shadow-lg text-center">
              <span className="font-bold text-amber-400 mr-1.5">{npcSpeech.speaker}:</span>
              <span>“{npcSpeech.text}”</span>
            </div>
          )}
        </div>

        {/* BOTTOM RIGHT: Turn Signals ABOVE Gear + Light/Hard Brake & Light/Heavy Gas Pedals */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Turn Signals directly above Gas & Brake Pedals (instant multi-touch onPointerDown works while steering/gassing) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleLeftSignal();
              }}
              className={`w-11 h-9 sm:w-14 sm:h-10 rounded-xl border flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-lg touch-none select-none ${
                leftSigUI || telemetry.leftSignal
                  ? telemetry.blinkOn
                    ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                    : 'bg-amber-950/90 text-amber-400 border-amber-500/70'
                  : 'bg-slate-950/92 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              title="Xi nhan trái (Q)"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[10px] font-bold hidden sm:inline">Q</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleRightSignal();
              }}
              className={`w-11 h-9 sm:w-14 sm:h-10 rounded-xl border flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-lg touch-none select-none ${
                rightSigUI || telemetry.rightSignal
                  ? telemetry.blinkOn
                    ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                    : 'bg-amber-950/90 text-amber-400 border-amber-500/70'
                  : 'bg-slate-950/92 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              title="Xi nhan phải (E)"
            >
              <span className="text-[10px] font-bold hidden sm:inline">E</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-end gap-1.5 sm:gap-2.5">
            {/* Gear Shifter D / R */}
            <div className="flex flex-col bg-slate-950/92 border border-slate-700 rounded-xl p-1 gap-1 shadow-lg">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleGear('D');
                }}
                className={`px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-lg font-display text-xs font-bold transition-colors cursor-pointer touch-none select-none ${
                  gearUI === 'D' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Số tiến (D)"
              >
                D
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleGear('R');
                }}
                className={`px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-lg font-display text-xs font-bold transition-colors cursor-pointer touch-none select-none ${
                  gearUI === 'R' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Số lùi (R)"
              >
                R
              </button>
            </div>

            {/* Progressive Brake Pedal: Hard/Emergency (top) / Light (bottom) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                brakePointerIdRef.current = e.pointerId;
                const level = computePedalIntensity(e);
                controlsRef.current.brake = level;
                setBrakeLevel(level);
              }}
              onPointerMove={(e) => {
                if (brakePointerIdRef.current !== e.pointerId) return;
                const level = computePedalIntensity(e);
                controlsRef.current.brake = level;
                setBrakeLevel(level);
              }}
              onPointerUp={(e) => {
                if (brakePointerIdRef.current === e.pointerId) {
                  brakePointerIdRef.current = null;
                  controlsRef.current.brake = 0;
                  setBrakeLevel(0);
                }
              }}
              onPointerCancel={() => {
                brakePointerIdRef.current = null;
                controlsRef.current.brake = 0;
                setBrakeLevel(0);
              }}
              title="Chạm phần dưới: Thắng nhẹ · Chạm/vuốt lên phần trên: Thắng gấp"
              className="relative overflow-hidden w-16 h-24 sm:w-20 sm:h-28 md:w-22 md:h-32 rounded-xl bg-red-950/92 border-2 border-red-500/75 flex flex-col items-center justify-between py-1.5 text-red-100 shadow-xl cursor-pointer touch-none select-none"
            >
              <div
                className="absolute inset-x-0 bottom-0 bg-red-500/45 transition-all duration-75 pointer-events-none"
                style={{ height: `${Math.round(brakeLevel * 100)}%` }}
              />
              <span className="relative z-10 text-[9px] font-bold text-red-300 uppercase">
                {brakeLevel >= 0.78 ? 'THẮNG GẤP' : 'GẤP · Space'}
              </span>
              <div className="relative z-10 flex flex-col items-center">
                <span className="font-display font-bold text-xs sm:text-sm tracking-wider leading-none">PHANH</span>
                {brakeLevel > 0 && (
                  <span className="text-[9px] font-mono-num text-red-200 mt-0.5">
                    {Math.round(brakeLevel * 100)}%
                  </span>
                )}
              </div>
              <span className="relative z-10 text-[9px] font-bold text-red-200/90 uppercase">
                {brakeLevel > 0 && brakeLevel < 0.78 ? 'THẮNG NHẸ' : 'NHẸ'}
              </span>
            </button>

            {/* Progressive Gas Pedal: Heavy (top) / Light (bottom) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                gasPointerIdRef.current = e.pointerId;
                const level = computePedalIntensity(e);
                controlsRef.current.throttle = level;
                setThrottleLevel(level);
              }}
              onPointerMove={(e) => {
                if (gasPointerIdRef.current !== e.pointerId) return;
                const level = computePedalIntensity(e);
                controlsRef.current.throttle = level;
                setThrottleLevel(level);
              }}
              onPointerUp={(e) => {
                if (gasPointerIdRef.current === e.pointerId) {
                  gasPointerIdRef.current = null;
                  controlsRef.current.throttle = 0;
                  setThrottleLevel(0);
                }
              }}
              onPointerCancel={() => {
                gasPointerIdRef.current = null;
                controlsRef.current.throttle = 0;
                setThrottleLevel(0);
              }}
              title="Chạm phần dưới: Ga nhẹ · Chạm/vuốt lên phần trên: Ga mạnh"
              className="relative overflow-hidden w-16 h-26 sm:w-20 sm:h-32 md:w-22 md:h-36 rounded-xl bg-emerald-950/92 border-2 border-emerald-500/80 flex flex-col items-center justify-between py-1.5 text-emerald-100 shadow-xl cursor-pointer touch-none select-none"
            >
              <div
                className="absolute inset-x-0 bottom-0 bg-emerald-500/45 transition-all duration-75 pointer-events-none"
                style={{ height: `${Math.round(throttleLevel * 100)}%` }}
              />
              <span className="relative z-10 text-[9px] font-bold text-emerald-300 uppercase">
                {throttleLevel >= 0.78 ? 'GA MẠNH' : 'MẠNH · W/↑'}
              </span>
              <div className="relative z-10 flex flex-col items-center">
                <span className="font-display font-bold text-xs sm:text-sm tracking-wider leading-none">GA</span>
                {throttleLevel > 0 && (
                  <span className="text-[9px] font-mono-num text-emerald-200 mt-0.5">
                    {Math.round(throttleLevel * 100)}%
                  </span>
                )}
              </div>
              <span className="relative z-10 text-[9px] font-bold text-emerald-200/90 uppercase">
                {throttleLevel > 0 && throttleLevel < 0.78 ? 'GA NHẸ' : 'NHẸ'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
