import React from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { formatVND } from '../data/vehicles';
import { CompletedRideReceipt } from '../types/game';

interface TripSummaryModalProps {
  receipt: CompletedRideReceipt;
  tags: string[];
  onClose: () => void;
}

export const TripSummaryModal: React.FC<TripSummaryModalProps> = ({ receipt, tags, onClose }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto thin-scroll bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-display font-bold text-base text-white">Hoàn Thành Chuyến Đi</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono-num">{receipt.distanceKm} km</span>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer 5-Star Rating & Feedback Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2.5">
            <div className="text-xs font-semibold text-slate-400">
              Đánh giá từ khách hàng <span className="text-white">{receipt.passengerName}</span>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-7 h-7 ${
                    s <= receipt.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="font-display text-sm font-bold text-amber-400">
              {receipt.rating === 5
                ? 'Xuất sắc · 5/5 Sao!'
                : receipt.rating === 4
                ? 'Hài lòng · 4/5 Sao'
                : receipt.rating === 3
                ? 'Bình thường · 3/5 Sao'
                : 'Không hài lòng · Cần cải thiện!'}
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-300 italic pt-1 leading-relaxed">
              "{receipt.comment}"
            </p>
          </div>

          {/* Fare Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Lộ trình</span>
              <span className="font-medium text-white truncate max-w-[210px]">
                {receipt.pickupName} → {receipt.dropoffName}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Giá mở cửa & Quãng đường</span>
              <span className="font-mono-num text-slate-200">
                {formatVND(receipt.baseFare + receipt.distanceFare)}
              </span>
            </div>
            {receipt.trafficBonus > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Phụ thu lưu lượng giao thông</span>
                <span className="font-mono-num text-amber-400">+{formatVND(receipt.trafficBonus)}</span>
              </div>
            )}
            {receipt.vehicleBonus > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Phụ cấp dòng xe nâng cấp</span>
                <span className="font-mono-num text-sky-400">+{formatVND(receipt.vehicleBonus)}</span>
              </div>
            )}
            {receipt.tipBonus > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tiền Tip đánh giá cao</span>
                <span className="font-mono-num text-emerald-400">+{formatVND(receipt.tipBonus)}</span>
              </div>
            )}

            <div className="pt-2.5 mt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Thực nhận vào ví</span>
              <span className="font-mono-num text-xl font-bold text-emerald-400">
                +{formatVND(receipt.totalEarned)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
          >
            TIẾP TỤC CHẠY TAXI
          </button>
        </div>
      </div>
    </div>
  );
};
