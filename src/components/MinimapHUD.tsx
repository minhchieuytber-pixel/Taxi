import React, { useEffect, useRef } from 'react';
import { getCityMap, getNodeMap } from '../data/cities';
import { CityId, HudTelemetry } from '../types/game';

interface MinimapHUDProps {
  cityId: CityId;
  telemetry: HudTelemetry;
  onOpenFullMap: () => void;
}

export const MinimapHUD: React.FC<MinimapHUDProps> = ({ cityId, telemetry, onOpenFullMap }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const city = getCityMap(cityId);
    const nodeMap = getNodeMap(city);

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);

    const scale = 0.62; // pixels per world meter
    const cx = w / 2;
    const cy = h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    // Rotate map around player heading so Up = Forward!
    ctx.rotate(telemetry.playerHeading);
    ctx.translate(-telemetry.playerX * scale, -telemetry.playerZ * scale);

    // Water bodies
    ctx.fillStyle = '#0f766e';
    for (const wb of city.waterBodies) {
      ctx.save();
      ctx.translate(wb.x * scale, wb.z * scale);
      if (wb.rotation) ctx.rotate(-wb.rotation);
      if (wb.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(0, 0, (wb.width * 0.5) * scale, (wb.depth * 0.5) * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(
          (-wb.width * 0.5) * scale,
          (-wb.depth * 0.5) * scale,
          wb.width * scale,
          wb.depth * scale
        );
      }
      ctx.restore();
    }

    // Road segments (big roads, normal roads, narrow alleys + one-way directional arrows)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const seg of city.segments) {
      const a = nodeMap.get(seg.from);
      const b = nodeMap.get(seg.to);
      if (!a || !b) continue;
      ctx.strokeStyle = seg.isBridge ? '#92400e' : seg.lanes === 1 ? '#1e293b' : '#334155';
      ctx.lineWidth = (seg.lanes >= 6 ? 15.0 : seg.lanes >= 4 ? 11.5 : seg.lanes === 3 ? 9 : seg.lanes === 1 ? 4.4 : 7.2) * scale;
      ctx.beginPath();
      ctx.moveTo(a.x * scale, a.z * scale);
      ctx.lineTo(b.x * scale, b.z * scale);
      ctx.stroke();

      ctx.strokeStyle = seg.lanes === 1 ? '#64748b' : seg.oneWay ? '#3b526b' : '#475569';
      ctx.lineWidth = (seg.lanes >= 6 ? 11.5 : seg.lanes >= 4 ? 8.5 : seg.lanes === 3 ? 6.6 : seg.lanes === 1 ? 2.8 : 5.2) * scale;
      ctx.beginPath();
      ctx.moveTo(a.x * scale, a.z * scale);
      ctx.lineTo(b.x * scale, b.z * scale);
      ctx.stroke();

      if (seg.oneWay) {
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const ang = Math.atan2(dz, dx);
        const mx = (a.x + b.x) * 0.5 * scale;
        const mz = (a.z + b.z) * 0.5 * scale;
        ctx.save();
        ctx.translate(mx, mz);
        ctx.rotate(ang);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-2.5, -2.5);
        ctx.lineTo(2, 0);
        ctx.lineTo(-2.5, 2.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    // GPS Route Line
    if (telemetry.gpsPathPoints.length >= 2) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      telemetry.gpsPathPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x * scale, pt.z * scale);
        else ctx.lineTo(pt.x * scale, pt.z * scale);
      });
      ctx.stroke();
    }

    // Traffic lights dots
    for (const tl of telemetry.trafficLights) {
      ctx.fillStyle = tl.state === 'red' ? '#ef4444' : tl.state === 'yellow' ? '#f59e0b' : '#22c55e';
      ctx.beginPath();
      ctx.arc(tl.x * scale, tl.z * scale, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // AI traffic
    ctx.fillStyle = '#94a3b8';
    for (const tc of telemetry.trafficPositions) {
      ctx.fillRect(tc.x * scale - 1.5, tc.z * scale - 1.5, 3, 3);
    }

    // Patrolling CSGT Police
    for (const pol of telemetry.policePositions) {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(pol.x * scale, pol.z * scale, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Target Pickup / Dropoff Pin
    if (telemetry.targetPoint) {
      ctx.fillStyle = telemetry.targetPoint.type === 'pickup' ? '#22c55e' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(telemetry.targetPoint.x * scale, telemetry.targetPoint.z * scale, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    // Player Taxi Arrow fixed at center pointing Up
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [cityId, telemetry]);

  return (
    <button
      type="button"
      onClick={onOpenFullMap}
      title="Nhấn để mở Bản đồ thành phố"
      className="group relative rounded-xl overflow-hidden border-2 border-slate-700/90 bg-slate-950 shadow-xl cursor-pointer text-left shrink-0"
    >
      <canvas ref={canvasRef} width={176} height={176} className="block w-[92px] h-[92px] sm:w-[132px] sm:h-[132px] md:w-[164px] md:h-[164px]" />
      <div className="px-2 py-1 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
        <span className="font-semibold text-slate-200 truncate max-w-[64px] sm:max-w-[96px] md:max-w-[115px]">{telemetry.currentStreet}</span>
        <span className={`font-mono-num font-bold shrink-0 ${telemetry.speedLimit !== null ? 'text-amber-400' : 'text-slate-400'}`}>
          {telemetry.speedLimit !== null ? telemetry.speedLimit : 'Tự do'}
        </span>
      </div>
    </button>
  );
};
