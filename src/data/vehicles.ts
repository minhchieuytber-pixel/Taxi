import { VehicleSpec } from '../types/game';

export const VEHICLE_CATALOG: VehicleSpec[] = [
  {
    id: 'kia_morning',
    name: 'Kia Morning 1.25 AT',
    brand: 'Kia',
    segment: 'Hatchback Hạng A (Phổ thông)',
    bodyStyle: 'hatchback',
    isElectric: false,
    horsepower: 83,
    torqueNm: 120,
    engineInfo: '1.25L Kappa 4 xi-lanh · Hộp số 4AT',
    seats: 4,
    maxPassengers: 3,
    topSpeedKmh: 165,
    zeroToHundredSec: 13.5,
    weightKg: 985,
    rentCost: 0, // Xe thuê khởi điểm miễn phí ca đầu
    buyPrice: 369_000_000,
    fareMultiplier: 1.0,
    defaultColor: '#eab308', // Vàng Taxi truyền thống
    dimensions: { width: 1.85, length: 3.9, height: 1.52 },
    description:
      'Mẫu hatchback nhỏ gọn linh hoạt bậc nhất phố cổ Hà Nội. Dễ dàng luồn lách qua các ngõ phố Hàng Đào, Hàng Bông và tiết kiệm nhiên liệu.'
  },
  {
    id: 'hyundai_i10',
    name: 'Hyundai Grand i10 Sedan',
    brand: 'Hyundai',
    segment: 'Sedan Hạng A+ (Phổ thông)',
    bodyStyle: 'sedan',
    isElectric: false,
    horsepower: 87,
    torqueNm: 114,
    engineInfo: '1.2L Kappa MPi · Hộp số 4AT',
    seats: 4,
    maxPassengers: 3,
    topSpeedKmh: 172,
    zeroToHundredSec: 12.6,
    weightKg: 1020,
    rentCost: 120_000,
    buyPrice: 435_000_000,
    fareMultiplier: 1.1,
    defaultColor: '#f8fafc', // Trắng taxi công nghệ
    dimensions: { width: 1.9, length: 4.15, height: 1.52 },
    description:
      'Dòng taxi quốc dân bền bỉ với khoang hành lý rộng hơn bản hatchback, vận hành ổn định trên các trục đường lớn như Trần Hưng Đạo.'
  },
  {
    id: 'toyota_vios',
    name: 'Toyota Vios 1.5G CVT',
    brand: 'Toyota',
    segment: 'Sedan Hạng B (Tiêu chuẩn)',
    bodyStyle: 'sedan',
    isElectric: false,
    horsepower: 107,
    torqueNm: 140,
    engineInfo: '1.5L Dual VVT-i · Hộp số CVT',
    seats: 4,
    maxPassengers: 3,
    topSpeedKmh: 185,
    zeroToHundredSec: 10.8,
    weightKg: 1110,
    rentCost: 220_000,
    buyPrice: 545_000_000,
    fareMultiplier: 1.22,
    defaultColor: '#16a34a', // Xanh Mai Linh
    dimensions: { width: 1.94, length: 4.45, height: 1.5 },
    description:
      'Biểu tượng bền bỉ của giới tài xế Việt Nam. Tăng tốc mượt mà, phanh đầm chắc, được hành khách đánh giá cao về sự thoải mái.'
  },
  {
    id: 'vinfast_vf6',
    name: 'VinFast VF 6 Plus (Taxi Xanh)',
    brand: 'VinFast',
    segment: 'SUV Điện B-Segment',
    bodyStyle: 'ev_suv',
    isElectric: true,
    horsepower: 201,
    torqueNm: 310,
    engineInfo: 'Động cơ điện PMSM · Pin LFP 59.6 kWh',
    seats: 5,
    maxPassengers: 4,
    topSpeedKmh: 192,
    zeroToHundredSec: 7.4,
    weightKg: 1620,
    rentCost: 340_000,
    buyPrice: 765_000_000,
    fareMultiplier: 1.38,
    defaultColor: '#06b6d4', // Xanh Cyan Xanh SM
    dimensions: { width: 2.02, length: 4.35, height: 1.62 },
    description:
      'SUV thuần điện không tiếng ồn động cơ, mô-men xoắn tức thì 310 Nm giúp bứt tốc cực nhanh tại các ngã tư và tăng sự hài lòng của khách.'
  },
  {
    id: 'mitsubishi_xpander',
    name: 'Mitsubishi Xpander Cross 7 Chỗ',
    brand: 'Mitsubishi',
    segment: 'MPV 7 Chỗ (Gia đình / Nhóm)',
    bodyStyle: 'mpv',
    isElectric: false,
    horsepower: 104,
    torqueNm: 141,
    engineInfo: '1.5L MIVEC · Dẫn động cầu trước',
    seats: 7,
    maxPassengers: 6,
    topSpeedKmh: 178,
    zeroToHundredSec: 12.1,
    weightKg: 1290,
    rentCost: 380_000,
    buyPrice: 698_000_000,
    fareMultiplier: 1.52,
    defaultColor: '#cbd5e1', // Bạc Titan
    dimensions: { width: 2.04, length: 4.65, height: 1.78 },
    description:
      'Chở được tới 6 hành khách cùng lúc! Mở khóa các cuốc xe nhóm đông người đi sân bay, Ga Hà Nội hoặc khu Mỹ Đình với giá cước cao.'
  },
  {
    id: 'toyota_camry',
    name: 'Toyota Camry 2.5Q',
    brand: 'Toyota',
    segment: 'Sedan Hạng D (Thương gia)',
    bodyStyle: 'luxury_sedan',
    isElectric: false,
    horsepower: 207,
    torqueNm: 250,
    engineInfo: '2.5L Dynamic Force · Hộp số 8AT',
    seats: 4,
    maxPassengers: 3,
    topSpeedKmh: 220,
    zeroToHundredSec: 8.2,
    weightKg: 1580,
    rentCost: 600_000,
    buyPrice: 1_405_000_000,
    fareMultiplier: 1.78,
    defaultColor: '#0f172a', // Đen Obsidian
    dimensions: { width: 2.05, length: 4.9, height: 1.48 },
    description:
      'Sedan doanh nhân sang trọng với hộp số 8 cấp mượt mà. Chuyên phục vụ khách VIP tại khu vực Nhà Hát Lớn và Trung tâm Hội nghị.'
  },
  {
    id: 'vinfast_vf9',
    name: 'VinFast VF 9 Plus 7 Chỗ',
    brand: 'VinFast',
    segment: 'SUV Điện Hạng E (Thương gia 7 chỗ)',
    bodyStyle: 'luxury_suv',
    isElectric: true,
    horsepower: 402,
    torqueNm: 620,
    engineInfo: '2 Mô-tơ điện AWD · Pin 123 kWh',
    seats: 7,
    maxPassengers: 6,
    topSpeedKmh: 215,
    zeroToHundredSec: 6.1,
    weightKg: 2800,
    rentCost: 900_000,
    buyPrice: 1_690_000_000,
    fareMultiplier: 2.1,
    defaultColor: '#0284c7', // Xanh đại dương
    dimensions: { width: 2.18, length: 5.1, height: 1.78 },
    description:
      'Flagship SUV điện 7 chỗ mạnh mẽ 402 mã lực, dẫn động 4 bánh toàn thời gian. Vừa chở được nhóm 6 khách VIP vừa mang lại mức cước khủng.'
  },
  {
    id: 'mercedes_e300',
    name: 'Mercedes-Benz E300 AMG',
    brand: 'Mercedes-Benz',
    segment: 'Sedan Hạng Sang (Siêu VIP)',
    bodyStyle: 'luxury_sedan',
    isElectric: false,
    horsepower: 258,
    torqueNm: 370,
    engineInfo: '2.0L Turbocharged I4 · 9G-TRONIC',
    seats: 4,
    maxPassengers: 3,
    topSpeedKmh: 250,
    zeroToHundredSec: 5.9,
    weightKg: 1715,
    rentCost: 1_250_000,
    buyPrice: 2_950_000_000,
    fareMultiplier: 2.5,
    defaultColor: '#1e293b', // Đen Graphite AMG
    dimensions: { width: 2.06, length: 4.95, height: 1.46 },
    description:
      'Đỉnh cao dòng xe dịch vụ hạng sang. Vận tốc tối đa 250 km/h, hệ thống treo êm ái tuyệt đối, mang lại mức thưởng tip cao nhất từ khách hàng.'
  }
];

export const PAINT_SWATCHES = [
  { id: 'taxi_yellow', name: 'Vàng Taxi Hà Nội', hex: '#eab308', price: 0 },
  { id: 'xanh_cyan', name: 'Xanh SM Cyan', hex: '#06b6d4', price: 150_000 },
  { id: 'mai_linh_green', name: 'Xanh Lục Cổ Điển', hex: '#16a34a', price: 150_000 },
  { id: 'pearl_white', name: 'Trắng Ngọc Trai', hex: '#f1f5f9', price: 200_000 },
  { id: 'obsidian_black', name: 'Đen Obsidian', hex: '#0f172a', price: 300_000 },
  { id: 'titanium_silver', name: 'Bạc Titan', hex: '#94a3b8', price: 220_000 },
  { id: 'crimson_red', name: 'Đỏ Đô Ruby', hex: '#dc2626', price: 350_000 },
  { id: 'royal_gold', name: 'Vàng Đồng Luxury', hex: '#d97706', price: 480_000 }
];

export const UPGRADE_CATALOG = {
  engine: {
    name: 'Động cơ & ECU',
    description: 'Tăng công suất (+10% HP/cấp) & tốc độ tối đa',
    prices: [0, 350_000, 750_000, 1_400_000, 2_400_000]
  },
  brakes: {
    name: 'Phanh gốm ABS',
    description: 'Rút ngắn quãng đường phanh & chống trượt khi mưa',
    prices: [0, 250_000, 550_000, 1_000_000, 1_800_000]
  },
  suspension: {
    name: 'Hệ thống treo khí nén',
    description: 'Giảm nghiêng thân xe & tăng êm ái cho hành khách',
    prices: [0, 280_000, 600_000, 1_100_000, 1_900_000]
  },
  tires: {
    name: 'Lốp bám đường thể thao',
    description: 'Vào cua tốc độ cao chính xác hơn, chống văng đuôi',
    prices: [0, 220_000, 480_000, 900_000, 1_550_000]
  }
};

export function getVehicleSpec(id: string): VehicleSpec {
  return VEHICLE_CATALOG.find((v) => v.id === id) || VEHICLE_CATALOG[0];
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}
