import React, { useState } from 'react';
import { Car, Check, Gauge, Paintbrush, Users, Wrench, X, Zap } from 'lucide-react';
import {
  formatVND,
  getVehicleSpec,
  PAINT_SWATCHES,
  UPGRADE_CATALOG,
  VEHICLE_CATALOG
} from '../data/vehicles';
import { OwnedVehicleState, PlayerProfile, VehicleUpgrades } from '../types/game';

interface GarageModalProps {
  profile: PlayerProfile;
  onClose: () => void;
  onSelectVehicle: (specId: string) => void;
  onRentVehicle: (specId: string) => void;
  onBuyVehicle: (specId: string) => void;
  onUpgradePart: (specId: string, part: keyof VehicleUpgrades) => void;
  onCustomizeAppearance: (
    specId: string,
    patch: Partial<OwnedVehicleState['appearance']>,
    cost: number
  ) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  profile,
  onClose,
  onSelectVehicle,
  onRentVehicle,
  onBuyVehicle,
  onUpgradePart,
  onCustomizeAppearance
}) => {
  const [tab, setTab] = useState<'fleet' | 'upgrades' | 'appearance'>('fleet');
  const [inspectId, setInspectId] = useState<string>(profile.activeVehicleId);

  const activeSpec = getVehicleSpec(profile.activeVehicleId);
  const activeState = profile.garage[profile.activeVehicleId];
  const inspectSpec = getVehicleSpec(inspectId);
  const inspectState = profile.garage[inspectId];

  const effectiveTopSpeed = Math.round(
    activeSpec.topSpeedKmh * (1 + (activeState?.upgrades.engine || 0) * 0.085)
  );
  const effectiveHp = Math.round(
    activeSpec.horsepower * (1 + (activeState?.upgrades.engine || 0) * 0.1)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85">
      <div className="w-full max-w-5xl max-h-[92dvh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">Gara & Đại Lý Xe Taxi</h2>
            <p className="text-xs text-slate-400">
              Xe đang lái: <span className="text-amber-400 font-semibold">{activeSpec.name}</span> · Số dư:{' '}
              <span className="font-mono-num font-bold text-emerald-400">{formatVND(profile.money)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTab('fleet')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'fleet' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Thuê & Mua xe</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('upgrades')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'upgrades' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Động cơ</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('appearance')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'appearance' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span>Ngoại hình</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto thin-scroll p-4 sm:p-6">
          {tab === 'fleet' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Vehicle List */}
              <div className="lg:col-span-7 space-y-2.5">
                {VEHICLE_CATALOG.map((car) => {
                  const st = profile.garage[car.id];
                  const isActive = profile.activeVehicleId === car.id;
                  const isInspecting = inspectId === car.id;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => setInspectId(car.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                        isInspecting
                          ? 'bg-slate-800/95 border-amber-400'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white truncate">{car.name}</span>
                          {car.isElectric && (
                            <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-0.5">
                              <Zap className="w-3 h-3" /> Điện
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {car.segment} · {car.seats} chỗ ({car.maxPassengers} khách) · Hệ số cước x{car.fareMultiplier}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isActive ? (
                          <span className="text-xs font-bold text-emerald-400">Đang sử dụng</span>
                        ) : st?.owned ? (
                          <span className="text-xs font-bold text-sky-400">Đã sở hữu</span>
                        ) : st?.rented ? (
                          <span className="text-xs font-bold text-amber-400">Đang thuê</span>
                        ) : (
                          <div className="font-mono-num text-xs font-bold text-slate-200">
                            {formatVND(car.buyPrice)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detailed Specs Panel */}
              <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-amber-400 font-semibold">{inspectSpec.brand} · {inspectSpec.segment}</div>
                    <h3 className="font-display text-2xl font-bold text-white mt-0.5">{inspectSpec.name}</h3>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{inspectSpec.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400">Công suất</div>
                      <div className="font-mono-num font-bold text-white text-sm mt-0.5">{inspectSpec.horsepower} HP</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400">Mô-men xoắn</div>
                      <div className="font-mono-num font-bold text-white text-sm mt-0.5">{inspectSpec.torqueNm} Nm</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400">Tốc độ tối đa</div>
                      <div className="font-mono-num font-bold text-amber-400 text-sm mt-0.5">{inspectSpec.topSpeedKmh} km/h</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400">Tăng tốc 0-100</div>
                      <div className="font-mono-num font-bold text-white text-sm mt-0.5">{inspectSpec.zeroToHundredSec} giây</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Sức chở</div>
                      <div className="font-mono-num font-bold text-emerald-400 text-sm mt-0.5">
                        {inspectSpec.seats} chỗ ({inspectSpec.maxPassengers} khách)
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-slate-400">Hệ số thu nhập</div>
                      <div className="font-mono-num font-bold text-sky-400 text-sm mt-0.5">x{inspectSpec.fareMultiplier} cước</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-900/70 rounded-lg px-3 py-2 border border-slate-800">
                    Động cơ: <span className="text-slate-200">{inspectSpec.engineInfo}</span> · Trọng lượng: {inspectSpec.weightKg} kg
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {inspectState?.owned || inspectState?.rented ? (
                    <button
                      type="button"
                      disabled={profile.activeVehicleId === inspectSpec.id}
                      onClick={() => onSelectVehicle(inspectSpec.id)}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {profile.activeVehicleId === inspectSpec.id ? 'Đang lái xe này' : 'Chọn chạy xe này'}
                    </button>
                  ) : null}

                  {!inspectState?.owned && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={Boolean(inspectState?.rented) || profile.money < inspectSpec.rentCost}
                        onClick={() => onRentVehicle(inspectSpec.id)}
                        className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-45 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        {inspectState?.rented
                          ? 'Đã thuê ca này'
                          : `Thuê xe (${formatVND(inspectSpec.rentCost)})`}
                      </button>

                      <button
                        type="button"
                        disabled={profile.money < inspectSpec.buyPrice}
                        onClick={() => onBuyVehicle(inspectSpec.id)}
                        className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-45 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        Mua đứt ({formatVND(inspectSpec.buyPrice)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Nâng cấp cho xe đang lái</div>
                  <div className="font-display text-lg font-bold text-white">{activeSpec.name}</div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-slate-400">Công suất thực tế: </span>
                    <span className="font-mono-num font-bold text-amber-400">{effectiveHp} HP</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Tốc độ tối đa: </span>
                    <span className="font-mono-num font-bold text-emerald-400 flex-inline items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 inline mr-1" />
                      {effectiveTopSpeed} km/h
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(UPGRADE_CATALOG) as Array<keyof VehicleUpgrades>).map((partKey) => {
                  const item = UPGRADE_CATALOG[partKey];
                  const curLv = activeState?.upgrades[partKey] || 0;
                  const isMax = curLv >= 4;
                  const nextPrice = isMax ? 0 : item.prices[curLv + 1];
                  return (
                    <div
                      key={partKey}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          <span className="font-mono-num text-xs font-bold text-amber-400">Cấp {curLv}/4</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.description}</p>

                        <div className="flex gap-1.5 mt-3">
                          {[1, 2, 3, 4].map((lv) => (
                            <div
                              key={lv}
                              className={`h-2 flex-1 rounded-full ${
                                lv <= curLv ? 'bg-amber-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isMax || profile.money < nextPrice}
                        onClick={() => onUpgradePart(activeSpec.id, partKey)}
                        className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        {isMax ? 'Đã nâng tối đa' : `Nâng cấp Cấp ${curLv + 1} · ${formatVND(nextPrice)}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'appearance' && activeState && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-2.5">Màu sơn ngoại thất</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PAINT_SWATCHES.map((sw) => {
                    const selected = activeState.appearance.color.toLowerCase() === sw.hex.toLowerCase();
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        disabled={!selected && profile.money < sw.price}
                        onClick={() => onCustomizeAppearance(activeSpec.id, { color: sw.hex }, selected ? 0 : sw.price)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer disabled:opacity-45 ${
                          selected
                            ? 'bg-slate-800 border-amber-400'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-white/25 shrink-0"
                          style={{ backgroundColor: sw.hex }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{sw.name}</div>
                          <div className="text-[10px] font-mono-num text-slate-400">
                            {selected ? 'Đang dùng' : sw.price === 0 ? 'Miễn phí' : formatVND(sw.price)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rims */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-bold text-white">Mâm hợp kim (Vành xe)</h4>
                  {(
                    [
                      { id: 'standard', label: 'Tiêu chuẩn (Bạc)', price: 0 },
                      { id: 'sport', label: 'Đa chấu Thể thao (Trắng)', price: 250_000 },
                      { id: 'amg', label: 'AMG Đen Bóng', price: 450_000 }
                    ] as const
                  ).map((rim) => {
                    const sel = activeState.appearance.rimStyle === rim.id;
                    return (
                      <button
                        key={rim.id}
                        type="button"
                        disabled={!sel && profile.money < rim.price}
                        onClick={() =>
                          onCustomizeAppearance(activeSpec.id, { rimStyle: rim.id }, sel ? 0 : rim.price)
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer disabled:opacity-45 ${
                          sel ? 'bg-amber-400/15 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{rim.label}</span>
                        <span className="font-mono-num">{sel ? <Check className="w-3.5 h-3.5" /> : formatVND(rim.price)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Taxi Roof Sign */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h4 className="text-sm font-bold text-white">Hộp đèn Taxi nóc xe</h4>
                  {(
                    [
                      { id: 'classic_yellow', label: 'Đèn TAXI Vàng truyền thống', price: 0 },
                      { id: 'green_ev', label: 'Đèn XANH TAXI hiện đại', price: 180_000 },
                      { id: 'led_vip', label: 'Đèn LED VIP Đen-Vàng', price: 320_000 }
                    ] as const
                  ).map((sign) => {
                    const sel = activeState.appearance.roofSign === sign.id;
                    return (
                      <button
                        key={sign.id}
                        type="button"
                        disabled={!sel && profile.money < sign.price}
                        onClick={() =>
                          onCustomizeAppearance(activeSpec.id, { roofSign: sign.id }, sel ? 0 : sign.price)
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer disabled:opacity-45 ${
                          sel ? 'bg-amber-400/15 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{sign.label}</span>
                        <span className="font-mono-num">{sel ? <Check className="w-3.5 h-3.5" /> : formatVND(sign.price)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Aero & Tint */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-white">Phụ kiện khí động học</h4>
                  <button
                    type="button"
                    disabled={!activeState.appearance.spoiler && profile.money < 400_000}
                    onClick={() =>
                      onCustomizeAppearance(
                        activeSpec.id,
                        { spoiler: !activeState.appearance.spoiler },
                        activeState.appearance.spoiler ? 0 : 400_000
                      )
                    }
                    className={`w-full px-3 py-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer disabled:opacity-45 ${
                      activeState.appearance.spoiler
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>Cánh gió thể thao Carbon</span>
                    <span className="font-mono-num">
                      {activeState.appearance.spoiler ? 'Đã lắp (Gỡ)' : formatVND(400_000)}
                    </span>
                  </button>

                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Phim cách nhiệt kính xe</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((lv) => {
                        const sel = activeState.appearance.windowTint === lv;
                        const cost = lv === 0 ? 0 : lv * 150_000;
                        return (
                          <button
                            key={lv}
                            type="button"
                            disabled={!sel && profile.money < cost}
                            onClick={() => onCustomizeAppearance(activeSpec.id, { windowTint: lv }, sel ? 0 : cost)}
                            className={`py-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              sel ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {lv === 0 ? 'Trong' : lv === 1 ? 'Khói' : 'VIP Đen'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
