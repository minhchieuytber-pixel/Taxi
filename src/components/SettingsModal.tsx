import React from 'react';
import { Cloud, CloudFog, CloudRain, Moon, RotateCcw, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { CameraMode, WeatherType } from '../types/game';

interface SettingsModalProps {
  weather: WeatherType;
  timeOfDayOverride: number | null;
  cameraMode: CameraMode;
  onChangeWeather: (w: WeatherType) => void;
  onChangeTimeOverride: (h: number | null) => void;
  onChangeCameraMode: (c: CameraMode) => void;
  onResetCareer: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  weather,
  timeOfDayOverride,
  cameraMode,
  onChangeWeather,
  onChangeTimeOverride,
  onChangeCameraMode,
  onResetCareer,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto thin-scroll bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white">Thời Tiết, Ngày Đêm & Camera</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Weather */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2">Hệ thống thời tiết động</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'sunny', label: 'Nắng đẹp', icon: Sun },
                  { id: 'cloudy', label: 'Trời âm u', icon: Cloud },
                  { id: 'rain', label: 'Mưa rào (Đường trơn)', icon: CloudRain },
                  { id: 'fog', label: 'Sương mù sáng sớm', icon: CloudFog }
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = weather === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeWeather(item.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time of day */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2">Chu kỳ Ngày & Đêm</div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Tự động', val: null, icon: Sun },
                  { label: 'Bình minh', val: 6.2, icon: Sunrise },
                  { label: 'Ban ngày', val: 11.5, icon: Sun },
                  { label: 'Hoàng hôn', val: 17.6, icon: Sunset },
                  { label: 'Ban đêm', val: 22.0, icon: Moon }
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = timeOfDayOverride === t.val;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => onChangeTimeOverride(t.val)}
                    className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera Mode */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2">Góc nhìn thứ ba</div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'chase', label: 'Theo sau rộng' },
                  { id: 'close', label: 'Theo sau gần' },
                  { id: 'hood', label: 'Nắp ca-pô' }
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChangeCameraMode(c.id)}
                  className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                    cameraMode === c.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Career */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Khởi tạo lại sự nghiệp mới?</span>
            <button
              type="button"
              onClick={onResetCareer}
              className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Chơi lại từ đầu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
