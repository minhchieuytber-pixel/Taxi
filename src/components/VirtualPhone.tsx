import React, { useEffect, useRef } from 'react';
import {
  Car,
  Check,
  ChevronLeft,
  Clock,
  CloudRain,
  Map as MapIcon,
  MessageSquare,
  Navigation,
  ShieldAlert,
  Star,
  User,
  Users,
  X
} from 'lucide-react';
import { CITIES, getCityMap, getNodeMap } from '../data/cities';
import { getRideDispatchProfile } from '../data/rides';
import { formatVND, getVehicleSpec } from '../data/vehicles';
import {
  ActiveRide,
  CityId,
  HudTelemetry,
  PhoneAppId,
  PlayerProfile,
  RideMessage,
  RideOffer
} from '../types/game';

interface VirtualPhoneProps {
  isOpen: boolean;
  activeApp: PhoneAppId;
  profile: PlayerProfile;
  telemetry: HudTelemetry;
  pendingOffer: RideOffer | null;
  offerRemainingSec?: number;
  activeRide: ActiveRide | null;
  messages: RideMessage[];
  onClose: () => void;
  onSelectApp: (app: PhoneAppId) => void;
  onAcceptRide: () => void;
  onDeclineRide: () => void;
  onRequestNewOffer: () => void;
  onCancelActiveRide: () => void;
  onSwitchCity: (cityId: CityId) => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
}

export const VirtualPhone: React.FC<VirtualPhoneProps> = ({
  isOpen,
  activeApp,
  profile,
  telemetry,
  pendingOffer,
  offerRemainingSec = 60,
  activeRide,
  messages,
  onClose,
  onSelectApp,
  onAcceptRide,
  onDeclineRide,
  onRequestNewOffer,
  onCancelActiveRide,
  onSwitchCity,
  onOpenGarage,
  onOpenSettings
}) => {
  const fullMapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || activeApp !== 'map') return;
    const canvas = fullMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const city = getCityMap(profile.activeCity);
    const nodeMap = getNodeMap(city);
    const scale = Math.min(w, h) / (city.bounds * 2.25);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Water
    ctx.fillStyle = '#0d9488';
    for (const wb of city.waterBodies) {
      ctx.save();
      ctx.translate(wb.x * scale, wb.z * scale);
      if (wb.rotation) ctx.rotate(-wb.rotation);
      if (wb.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(0, 0, (wb.width * 0.5) * scale, (wb.depth * 0.5) * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect((-wb.width * 0.5) * scale, (-wb.depth * 0.5) * scale, wb.width * scale, wb.depth * scale);
      }
      ctx.restore();
    }

    // Roads (big roads, small roads, alleys + one-way arrows)
    ctx.lineCap = 'round';
    for (const seg of city.segments) {
      const a = nodeMap.get(seg.from);
      const b = nodeMap.get(seg.to);
      if (!a || !b) continue;
      ctx.strokeStyle = seg.isBridge ? '#d97706' : seg.lanes === 1 ? '#64748b' : seg.oneWay ? '#3b82f6' : '#475569';
      ctx.lineWidth = seg.lanes >= 6 ? 6.8 : seg.lanes >= 4 ? 5 : seg.lanes === 3 ? 3.5 : seg.lanes === 1 ? 1.6 : 2.6;
      ctx.beginPath();
      ctx.moveTo(a.x * scale, a.z * scale);
      ctx.lineTo(b.x * scale, b.z * scale);
      ctx.stroke();

      if (seg.oneWay) {
        const mx = (a.x + b.x) * 0.5 * scale;
        const mz = (a.z + b.z) * 0.5 * scale;
        const ang = Math.atan2(b.z - a.z, b.x - a.x);
        ctx.save();
        ctx.translate(mx, mz);
        ctx.rotate(ang);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.lineTo(2, 0);
        ctx.lineTo(-2, 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // GPS Path
    if (telemetry.gpsPathPoints.length >= 2) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      telemetry.gpsPathPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x * scale, pt.z * scale);
        else ctx.lineTo(pt.x * scale, pt.z * scale);
      });
      ctx.stroke();
    }

    // Speed Cameras
    ctx.fillStyle = '#ef4444';
    for (const camId of city.speedCameraNodes) {
      const n = nodeMap.get(camId);
      if (!n) continue;
      ctx.beginPath();
      ctx.arc(n.x * scale, n.z * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Landmarks Labels
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    for (const lm of city.landmarks) {
      const lx = lm.x * scale;
      const lz = lm.z * scale;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(lx, lz, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(lm.name, lx, lz - 6);
    }

    // Police
    for (const p of telemetry.policePositions) {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(p.x * scale, p.z * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(telemetry.playerX * scale, telemetry.playerZ * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }, [isOpen, activeApp, profile.activeCity, telemetry]);

  if (!isOpen) return null;

  const spec = getVehicleSpec(profile.activeVehicleId);
  const dispatchProfile = getRideDispatchProfile(
    profile.activeCity,
    telemetry.timeOfDayHours,
    telemetry.trafficDensity
  );
  const avgRating: number | null =
    profile.ratingCount > 0 ? Number((profile.ratingSum / profile.ratingCount).toFixed(2)) : null;

  // Star breakdown counts
  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: profile.reviews.filter((r) => r.rating === s).length
  }));
  const totalRev = Math.max(1, profile.reviews.length);

  const formattedHour = `${String(Math.floor(telemetry.timeOfDayHours)).padStart(2, '0')}:${String(
    Math.floor((telemetry.timeOfDayHours % 1) * 60)
  ).padStart(2, '0')}`;

  return (
    <div className="fixed inset-x-3 top-3 bottom-3 sm:inset-x-auto sm:right-5 md:right-6 sm:top-20 sm:bottom-24 z-30 sm:z-20 mx-auto max-w-[356px] sm:w-[348px] max-h-[86dvh] sm:max-h-[650px] flex pointer-events-auto">
      {/* iPhone 18 Hardware Side Buttons (Left: Action + Vol Up/Down) */}
      <div className="hidden sm:flex flex-col gap-2 pt-20 -mr-[2px] z-10">
        <div className="w-[3px] h-5 rounded-l-sm bg-zinc-400/80 shadow" />
        <div className="w-[3px] h-9 rounded-l-sm bg-zinc-400/80 shadow mt-1" />
        <div className="w-[3px] h-9 rounded-l-sm bg-zinc-400/80 shadow" />
      </div>

      {/* Brushed Titanium Chassis */}
      <div className="relative flex-1 flex flex-col rounded-[42px] bg-gradient-to-b from-zinc-500 via-zinc-700 to-zinc-600 p-[3px] shadow-[0_24px_64px_rgba(0,0,0,0.85)] ring-1 ring-white/25">
        {/* Ultra-thin Black Ceramic OLED Bezel */}
        <div className="flex-1 flex flex-col rounded-[39px] bg-black p-[4px] overflow-hidden">
          <div className="flex-1 flex flex-col rounded-[35px] bg-slate-950 overflow-hidden">
            {/* iPhone 18 Status Bar & Micro Dynamic Pill */}
            <div className="px-5 pt-2.5 pb-1.5 bg-slate-950 flex items-center justify-between text-[11px] text-slate-200 select-none">
              <span className="font-mono-num font-bold tracking-tight w-12">{formattedHour}</span>

              {/* iPhone 18 Slim Dynamic Pill (Camera + FaceID) */}
              <div className="h-4 w-20 rounded-full bg-black border border-zinc-800/90 flex items-center justify-between px-2 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <span className="w-2 h-2 rounded-full bg-slate-900 ring-1 ring-sky-900/80" />
              </div>

              <div className="flex items-center justify-end gap-1.5 w-16">
                <span className="text-[10px] font-bold text-emerald-400">5G</span>
                {/* Battery Icon */}
                <div className="flex items-center gap-0.5">
                  <div className="w-4 h-2 rounded-[2px] border border-slate-400 p-[1px] flex items-center">
                    <div className="w-2.5 h-full bg-emerald-400 rounded-[1px]" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Đóng iPhone 18 (P)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* App Header Bar */}
            {activeApp !== 'home' && (
              <div className="px-3.5 py-2 bg-slate-900/95 border-y border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectApp('home')}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Màn hình chính</span>
                </button>
                <span className="text-xs font-bold text-slate-100">
                  {activeApp === 'rides'
                    ? 'TaxiGo Driver'
                    : activeApp === 'messages'
                    ? 'Tin nhắn & Lộ trình'
                    : activeApp === 'profile'
                    ? 'Hồ sơ & Đánh giá 5★'
                    : 'Bản đồ Thành phố'}
                </span>
              </div>
            )}

            {/* In-Phone Incoming Ride Push Banner when browsing other apps */}
            {pendingOffer && activeApp !== 'rides' && (
              <button
                type="button"
                onClick={() => onSelectApp('rides')}
                className="mx-3 mt-2 rounded-2xl bg-slate-900 border border-amber-400/80 hover:border-amber-300 px-3 py-2 text-left shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-amber-300">
                    TaxiGo · {pendingOffer.isVip ? 'Cuốc VIP mới' : 'Có cuốc mới'}
                  </span>
                  <span
                    className={`font-mono-num font-bold ${
                      offerRemainingSec <= 15 ? 'text-red-400' : 'text-amber-300'
                    }`}
                  >
                    Còn {offerRemainingSec}s
                  </span>
                </div>
                <div className="text-xs font-semibold text-white truncate mt-0.5">
                  {pendingOffer.pickupName} → {pendingOffer.dropoffName}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Nhấn để xem & nhận cuốc</span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {formatVND(pendingOffer.estimatedFare)}
                  </span>
                </div>
              </button>
            )}

      {/* App Body */}
      <div className="flex-1 overflow-y-auto thin-scroll p-3.5 bg-slate-950">
        {/* HOME SCREEN */}
        {activeApp === 'home' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5">
              <div className="text-[11px] text-slate-400">Tài xế đang trực tuyến</div>
              <div className="text-base font-display font-bold text-white mt-0.5">{profile.driverName}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-300">{CITIES[profile.activeCity].name}</span>
                <span className="font-mono-num font-bold text-emerald-400">{formatVND(profile.money)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Sao trung bình</span>
                <span className="flex items-center gap-1 text-amber-400 font-mono-num font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />{' '}
                  {avgRating !== null ? `${avgRating.toFixed(2)} (${profile.ratingCount} chuyến)` : 'Chưa có'}
                </span>
              </div>
            </div>

            {/* App Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onSelectApp('rides')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer relative"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Nhận cuốc</span>
                {(pendingOffer || activeRide) && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                    1
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectApp('messages')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer relative"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Tin nhắn</span>
                {messages.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 rounded-full bg-sky-400 text-[10px] font-bold text-slate-950">
                    {Math.min(9, messages.length)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectApp('profile')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Hồ sơ 5★</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectApp('map')}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <MapIcon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Bản đồ</span>
              </button>

              <button
                type="button"
                onClick={onOpenGarage}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500 text-slate-950 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Gara xe</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center">
                  <CloudRain className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-200 text-center">Thời tiết</span>
              </button>
            </div>
          </div>
        )}

        {/* RIDES APP (ACCEPT / DECLINE + AVERAGE TRIP RATING) */}
        {activeApp === 'rides' && (
          <div className="space-y-3">
            {/* Driver Average Star Rating Banner inside TaxiGo Driver app */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                  Đánh giá trung bình các chuyến
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5 font-mono-num">
                  {profile.completedRides} chuyến hoàn thành · {profile.ratingCount} đánh giá
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-1 shrink-0">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-mono-num text-sm font-bold text-amber-300">
                  {avgRating !== null ? avgRating.toFixed(2) : '—'}
                </span>
              </div>
            </div>

            {activeRide ? (
              <div className="rounded-2xl bg-slate-900 border border-emerald-500/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">
                    {activeRide.phase === 'to_pickup' ? 'ĐANG TỚI ĐIỂM ĐÓN' : 'ĐANG CHỞ KHÁCH'}
                  </span>
                  <span className="font-mono-num text-xs font-bold text-amber-400">
                    {formatVND(activeRide.offer.estimatedFare)}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-bold text-white">{activeRide.offer.passengerName}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{activeRide.offer.passengerCount} hành khách</span>
                    <span>·</span>
                    <span>{activeRide.offer.distanceKm} km</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-slate-950 rounded-xl p-2.5 border border-slate-800">
                  <div>
                    <div className="text-[10px] text-emerald-400 font-semibold">ĐIỂM ĐÓN</div>
                    <div className="text-slate-200 font-medium">{activeRide.offer.pickupName}</div>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5">
                    <div className="text-[10px] text-amber-400 font-semibold">ĐIỂM TRẢ</div>
                    <div className="text-slate-200 font-medium">{activeRide.offer.dropoffName}</div>
                  </div>
                </div>

                <div className="text-xs text-sky-300 bg-sky-950/60 border border-sky-800/70 rounded-lg p-2">
                  GPS: {activeRide.nextTurnInstruction}
                </div>

                <button
                  type="button"
                  onClick={onCancelActiveRide}
                  className="w-full py-2 rounded-lg bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-semibold cursor-pointer"
                >
                  Hủy cuốc xe (Phạt 50.000 ₫)
                </button>
              </div>
            ) : pendingOffer ? (
              <div className="rounded-2xl bg-slate-900 border border-amber-400/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    {pendingOffer.isVip ? 'CUỐC XE VIP MỚI' : 'CUỐC XE MỚI'}
                  </span>
                  <span
                    className={`font-mono-num text-xs font-bold flex items-center gap-1 ${
                      offerRemainingSec <= 15 ? 'text-red-400' : 'text-amber-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Còn {offerRemainingSec}s / 60s
                  </span>
                </div>

                {/* 60-Second Countdown Bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      offerRemainingSec <= 15 ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (offerRemainingSec / 60) * 100))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nếu không nhận sau 60s sẽ mất cuốc</span>
                  <span>
                    {pendingOffer.trafficLevel === 'high'
                      ? 'Đường đông (+32%)'
                      : pendingOffer.trafficLevel === 'medium'
                      ? 'Giao thông TB (+12%)'
                      : 'Đường thoáng'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{pendingOffer.passengerName}</div>
                    <div className="text-xs text-slate-400">
                      {pendingOffer.passengerCount} khách · {pendingOffer.distanceKm} km
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Cước dự kiến</div>
                    <div className="font-mono-num text-base font-bold text-emerald-400">
                      {formatVND(pendingOffer.estimatedFare)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs bg-slate-950 rounded-xl p-2.5 border border-slate-800">
                  <div>
                    <div className="text-[10px] text-emerald-400 font-semibold">ĐÓN TẠI</div>
                    <div className="text-slate-100 font-medium">{pendingOffer.pickupName}</div>
                    <div className="text-[11px] text-slate-400">{pendingOffer.pickupStreet}</div>
                  </div>
                  <div className="border-t border-slate-800 pt-1.5">
                    <div className="text-[10px] text-amber-400 font-semibold">TRẢ TẠI</div>
                    <div className="text-slate-100 font-medium">{pendingOffer.dropoffName}</div>
                    <div className="text-[11px] text-slate-400">{pendingOffer.dropoffStreet}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/70 rounded-lg p-2 border border-slate-800/80">
                  "{pendingOffer.passengerNote}"
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onDeclineRide}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>TỪ CHỐI</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAcceptRide}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>NHẬN CUỐC</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-center space-y-3">
                <Navigation className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">Đang chờ nổ cuốc...</div>
                <p className="text-xs text-slate-400">
                  Hệ thống đang quét khách quanh {CITIES[profile.activeCity].name} (tối đa {spec.maxPassengers} khách).
                </p>
                <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-left text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tỷ lệ nổ cuốc lúc này</span>
                    <span
                      className={`font-bold ${
                        dispatchProfile.demand === 'high'
                          ? 'text-emerald-400'
                          : dispatchProfile.demand === 'low'
                          ? 'text-slate-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {dispatchProfile.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">{dispatchProfile.rateLabel} · Hạn nhận 60s</div>
                </div>
                <button
                  type="button"
                  onClick={onRequestNewOffer}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Tìm cuốc xe ngay
                </button>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES & ROUTE NOTIFICATIONS APP */}
        {activeApp === 'messages' && (
          <div className="space-y-2.5">
            {messages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                Chưa có tin nhắn lộ trình nào.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-2.5 border text-xs ${
                    msg.tone === 'angry'
                      ? 'bg-red-950/60 border-red-700/70 text-red-100'
                      : msg.tone === 'warning'
                      ? 'bg-amber-950/60 border-amber-700/70 text-amber-100'
                      : msg.tone === 'happy'
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-100'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                    <span className="font-bold">{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* DRIVER PROFILE & 5-STAR CUSTOMER FEEDBACK APP */}
        {activeApp === 'profile' && (
          <div className="space-y-3.5">
            {/* Driver Summary */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-display font-bold text-white">{profile.driverName}</div>
                  <div className="text-[11px] text-slate-400">{spec.name} · {spec.seats} chỗ</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono-num font-bold text-emerald-400">{formatVND(profile.totalEarned)}</div>
                  <div className="text-[10px] text-slate-400">Tổng thu nhập</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-center">
                <div>
                  <div className="font-mono-num text-sm font-bold text-white">{profile.completedRides}</div>
                  <div className="text-[10px] text-slate-400">Cuốc xe</div>
                </div>
                <div>
                  <div className="font-mono-num text-sm font-bold text-white">{profile.totalDistanceKm.toFixed(1)}</div>
                  <div className="text-[10px] text-slate-400">Tổng km</div>
                </div>
                <div>
                  <div className="font-mono-num text-sm font-bold text-red-400">{profile.violations.length}</div>
                  <div className="text-[10px] text-slate-400">Lỗi phạt</div>
                </div>
              </div>
            </div>

            {/* 5-Star Customer Rating Breakdown */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white">Đánh giá từ Khách hàng (5★)</div>
                <span className="text-[11px] text-slate-400">{profile.ratingCount} lượt</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-center pr-3 border-r border-slate-800">
                  <div className="font-display font-mono-num text-2xl font-bold text-amber-400">
                    {avgRating !== null ? avgRating.toFixed(2) : '—'}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          avgRating !== null && s <= Math.round(avgRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  {starCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-5 font-mono-num text-slate-300">{star}★</span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${profile.reviews.length > 0 ? Math.round((count / totalRev) * 100) : 0}%`
                          }}
                        />
                      </div>
                      <span className="w-4 text-right font-mono-num text-slate-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Feedback List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">Phản hồi gần đây</div>
              {profile.reviews.length === 0 ? (
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center text-[11px] text-slate-400">
                  Chưa có đánh giá nào. Hoàn thành chuyến đi đầu tiên để nhận đánh giá sao từ khách!
                </div>
              ) : (
                profile.reviews.slice(0, 8).map((rev) => (
                  <div key={rev.id} className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{rev.passengerName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-sky-400">{rev.route}</div>
                    <p className="text-[11px] text-slate-300 leading-snug">"{rev.comment}"</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>{rev.timestamp}</span>
                      <span className="font-mono-num text-emerald-400">{formatVND(rev.fareEarned)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Traffic Violations & Fine Bills */}
            {profile.violations.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Bill phạt nguội & Vi phạm giao thông</span>
                </div>
                {profile.violations.slice(0, 10).map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg bg-red-950/40 border border-red-900/60 px-2.5 py-2 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-red-200">{v.title}</span>
                      <span className="font-mono-num font-bold text-red-300 shrink-0">-{formatVND(v.fineAmount)}</span>
                    </div>
                    <div className="text-[10px] text-red-200/90 leading-snug">
                      {v.billNote || `${v.streetName} · ${v.timestamp}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INTERACTIVE FULL CITY MAP & MULTI-CITY EXPLORATION */}
        {activeApp === 'map' && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
              <canvas ref={fullMapCanvasRef} width={300} height={270} className="w-full h-auto block" />
              <div className="px-2.5 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Xanh lá: Xe bạn · Đỏ: Camera · Xanh dương: CSGT</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-200 mb-1.5">
                Khám phá bản đồ thành phố khác
              </div>
              <div className="space-y-1.5">
                {(['hanoi', 'hcmc', 'danang'] as CityId[]).map((cid) => {
                  const c = CITIES[cid];
                  const isCurrent = profile.activeCity === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      disabled={Boolean(activeRide)}
                      onClick={() => onSwitchCity(cid)}
                      className={`w-full px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                        isCurrent
                          ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{c.name}</span>
                        <span className="text-[10px] font-semibold">
                          {isCurrent ? 'Đang hoạt động' : 'Di chuyển tới'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.subtitle}</div>
                    </button>
                  );
                })}
                {activeRide && (
                  <p className="text-[10px] text-amber-400">
                    Hoàn thành hoặc hủy cuốc hiện tại trước khi chuyển thành phố.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

            {/* iPhone 18 Bottom Home Gesture Bar */}
            <div className="py-2 bg-slate-950 border-t border-slate-900 flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectApp('home')}
                className="w-28 h-1.5 rounded-full bg-slate-400/70 hover:bg-white transition-colors cursor-pointer"
                title="Về màn hình chính iPhone 18"
              />
            </div>
          </div>
        </div>
      </div>

      {/* iPhone 18 Hardware Side Buttons (Right: Power + Camera Control) */}
      <div className="hidden sm:flex flex-col justify-between pt-24 pb-28 -ml-[2px] z-10">
        <div className="w-[3px] h-14 rounded-r-sm bg-zinc-400/80 shadow" />
        <div className="w-[3px] h-10 rounded-r-sm bg-zinc-400/70 shadow" />
      </div>
    </div>
  );
};
