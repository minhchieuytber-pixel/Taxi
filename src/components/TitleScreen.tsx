import React, { useState } from 'react';
import { CITIES } from '../data/cities';
import { CityId } from '../types/game';
import { MapPin, ArrowRight } from 'lucide-react';

interface TitleScreenProps {
  initialName: string;
  initialCity: CityId;
  hasSavedCareer: boolean;
  savedMoney: number;
  onStart: (driverName: string, city: CityId) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  initialName,
  initialCity,
  hasSavedCareer,
  savedMoney,
  onStart
}) => {
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState<CityId>(initialCity);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên tài xế để bắt đầu ca lái.');
      return;
    }
    setError('');
    onStart(trimmed, city);
  };

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto thin-scroll flex flex-col justify-between gap-4 p-4 sm:p-6 md:p-10 bg-gradient-to-r from-slate-950/92 via-slate-950/70 to-slate-950/30 pointer-events-auto">
      {/* Top Wordmark Lockup */}
      <div className="flex items-center gap-3 shrink-0">
        <svg width="38" height="38" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="38" height="38" rx="9" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
          <path d="M10 25L13.5 16.5C14.1 15.1 15.4 14 17 14H25C26.6 14 27.9 15.1 28.5 16.5L32 25V29.5H28.5V27.5H13.5V29.5H10V25Z" fill="#FACC15" />
          <rect x="17" y="10" width="8" height="3.5" rx="1" fill="#F8FAFC" />
          <circle cx="14.5" cy="24" r="1.8" fill="#0F172A" />
          <circle cx="27.5" cy="24" r="1.8" fill="#0F172A" />
        </svg>
        <div>
          <div className="font-display text-base sm:text-lg font-bold tracking-wider text-amber-400">TAXI HÀ NỘI 3D</div>
          <div className="text-[11px] sm:text-xs text-slate-400">Hành Trình Vô Lăng · Thế Giới Mở</div>
        </div>
      </div>

      {/* Main Left-Aligned Hero Panel leaving right 55% live 3D city unobstructed */}
      <div className="max-w-md w-full my-auto shrink-0">
        <h1
          className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight"
          style={{ textWrap: 'balance' }}
        >
          Làm Chủ Tay Lái Giữa Phố Phường Thủ Đô
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed">
          Khởi nghiệp bằng chiếc taxi thuê, đón trả khách theo bản đồ đường phố thực tế, tuân thủ đèn đỏ và CSGT để tích lũy mua siêu xe hạng sang.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-3.5 sm:space-y-4 bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-2xl">
          <div>
            <label htmlFor="driver-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên tài xế của bạn
            </label>
            <input
              id="driver-name"
              type="text"
              maxLength={24}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ví dụ: Nguyễn Văn Minh"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">
              Thành phố xuất phát
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['hanoi', 'hcmc', 'danang'] as CityId[]).map((cid) => {
                const c = CITIES[cid];
                const active = city === cid;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => setCity(cid)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-colors text-left cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-950/90 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-400 truncate">
              {CITIES[city].subtitle}
            </p>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
          >
            <span>{hasSavedCareer ? 'TIẾP TỤC CA LÁI' : 'NHẬN XE THUÊ & BẮT ĐẦU'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {hasSavedCareer && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>Tiến trình đã lưu</span>
              <span className="font-mono-num font-semibold text-emerald-400">
                {new Intl.NumberFormat('vi-VN').format(savedMoney)} ₫
              </span>
            </div>
          )}
        </form>
      </div>

      {/* Single Flat Control Hint Line */}
      <div className="text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 shrink-0 pb-1">
        <span>W / S / ↑ / ↓: Ga & Lùi</span>
        <span aria-hidden="true">·</span>
        <span>A / D hoặc Vô lăng ảo: Đánh lái</span>
        <span aria-hidden="true">·</span>
        <span>Space: Phanh</span>
        <span aria-hidden="true">·</span>
        <span>Q / E: Xi nhan</span>
        <span aria-hidden="true">·</span>
        <span>P: Điện thoại</span>
        <span aria-hidden="true">·</span>
        <span>C: Camera</span>
      </div>
    </div>
  );
};
