import { CityId, CityMapData, CustomerReview, RideOffer, TrafficLevel } from '../types/game';
import { findShortestRoute } from './cities';

export const RIDE_OFFER_TIMEOUT_MS = 60_000;

export type DispatchDemandLevel = 'high' | 'medium' | 'low';

export interface RideDispatchProfile {
  demand: DispatchDemandLevel;
  label: string;
  rateLabel: string;
  minWaitMs: number;
  maxWaitMs: number;
}

export function getRideDispatchProfile(
  cityId: CityId,
  timeOfDayHours: number,
  trafficDensity: TrafficLevel
): RideDispatchProfile {
  const hour = ((timeOfDayHours % 24) + 24) % 24;
  const isRushWindow =
    (hour >= 7 && hour < 9.5) ||
    (hour >= 11.5 && hour < 13.5) ||
    (hour >= 17 && hour < 20.5);
  const isNightLull = hour < 5.5 || hour >= 23;
  const isWeekendEvening = hour >= 20.5 && hour < 23;

  // City demand nuance: HCMC & Hanoi busier than Da Nang except evening tourist hours
  const cityBoost = cityId === 'hcmc' ? 0.86 : cityId === 'hanoi' ? 0.94 : 1.08;

  if ((isRushWindow || trafficDensity === 'high') && !isNightLull) {
    return {
      demand: 'high',
      label: 'Nhu cầu đặt xe cao',
      rateLabel: 'Giờ cao điểm · nổ cuốc khá nhanh',
      minWaitMs: Math.round(10_000 * cityBoost),
      maxWaitMs: Math.round(24_000 * cityBoost)
    };
  }

  if (isNightLull || (trafficDensity === 'low' && !isWeekendEvening)) {
    return {
      demand: 'low',
      label: 'Thưa khách',
      rateLabel: isNightLull ? 'Đêm muộn · nổ cuốc thưa' : 'Khu vực ít khách · chờ lâu hơn',
      minWaitMs: Math.round(26_000 * cityBoost),
      maxWaitMs: Math.round(52_000 * cityBoost)
    };
  }

  return {
    demand: 'medium',
    label: 'Nhu cầu bình thường',
    rateLabel: 'Tần suất ổn định · không liên tục',
    minWaitMs: Math.round(15_000 * cityBoost),
    maxWaitMs: Math.round(35_000 * cityBoost)
  };
}

export function computeNextRideDelayMs(
  cityId: CityId,
  timeOfDayHours: number,
  trafficDensity: TrafficLevel,
  reason: 'initial' | 'completed' | 'declined' | 'expired' | 'idle'
): number {
  if (reason === 'initial') {
    return 3_800 + Math.round(Math.random() * 2_700);
  }

  const profile = getRideDispatchProfile(cityId, timeOfDayHours, trafficDensity);
  const baseWait =
    profile.minWaitMs + Math.random() * Math.max(1000, profile.maxWaitMs - profile.minWaitMs);

  // Add realistic variance so consecutive offers never chain immediately back-to-back
  const waveRoll = Math.random();
  const waveMult = waveRoll < 0.22 ? 1.35 : waveRoll > 0.85 ? 0.78 : 1.0;

  const extraCooldownMs =
    reason === 'completed'
      ? 5_000 + Math.random() * 6_000
      : reason === 'expired'
      ? 4_000 + Math.random() * 6_000
      : reason === 'declined'
      ? 3_000 + Math.random() * 5_000
      : 0;

  return Math.max(9_000, Math.round(baseWait * waveMult + extraCooldownMs));
}

const VIETNAMESE_NAMES = [
  'Nguyễn Minh Anh',
  'Trần Hoàng Nam',
  'Lê Thu Hà',
  'Phạm Quang Huy',
  'Hoàng Thảo Vy',
  'Vũ Đức Thịnh',
  'Đặng Ngọc Linh',
  'Bùi Tuấn Kiệt',
  'Đỗ Lan Phương',
  'Ngô Quốc Bảo',
  'Dương Khánh Chi',
  'Tạ Gia Hưng'
];

const PICKUP_NOTES_NORMAL = [
  'Bác tài ơi em đang đứng ngay cổng chính, áo khoác màu be nhé.',
  'Nhờ anh đi lối thoáng giúp em, em đang có cuộc họp gấp.',
  'Em đi cùng hành lý nhỏ, bác tài tấp lề từ từ giúp em ạ.',
  'Chạy êm giúp em nhé bác tài, em hơi say xe một chút.',
  'Em vừa đặt xe xong, anh tới điểm đón bấm còi nhẹ là em ra liền.'
];

const PICKUP_NOTES_VIP = [
  'Khách VIP: Yêu cầu di chuyển êm ái, tuân thủ tuyệt đối luật giao thông.',
  'Khách doanh nhân: Cần đến đúng giờ và ưu tiên tuyến đường ít xóc.',
  'Nhóm khách gia đình / du lịch: Cảm ơn bác tài hỗ trợ hành lý.'
];

export function generateRideOffer(
  city: CityMapData,
  maxCarPassengers: number,
  vehicleFareMultiplier: number
): RideOffer {
  const nodes = city.nodes;
  let pickupNode = nodes[Math.floor(Math.random() * nodes.length)];
  let dropoffNode = nodes[Math.floor(Math.random() * nodes.length)];
  let guard = 0;
  while (dropoffNode.id === pickupNode.id && guard < 15) {
    dropoffNode = nodes[Math.floor(Math.random() * nodes.length)];
    guard++;
  }

  const pickupLandmark = city.landmarks.find((l) => l.nodeId === pickupNode.id);
  const dropoffLandmark = city.landmarks.find((l) => l.nodeId === dropoffNode.id);

  const findStreetForNode = (nodeId: string) => {
    const seg = city.segments.find((s) => s.from === nodeId || s.to === nodeId);
    return seg ? seg.streetName : 'Đường trung tâm';
  };

  const route = findShortestRoute(city, pickupNode.id, dropoffNode.id);
  // Scale world meters -> realistic city km (100 world m ≈ 0.85 km)
  const distanceKm = Math.max(1.2, Number(((route.totalDistM * 0.85) / 100).toFixed(1)));

  const rollTraffic = Math.random();
  const trafficLevel: TrafficLevel = rollTraffic < 0.3 ? 'low' : rollTraffic < 0.72 ? 'medium' : 'high';
  const trafficMult = trafficLevel === 'high' ? 1.32 : trafficLevel === 'medium' ? 1.12 : 1.0;

  // Passenger count adapts to car capacity (1-3 standard, 4-6 group for 5-7 seaters)
  const isGroup = maxCarPassengers >= 5 && Math.random() > 0.45;
  const passengerCount = isGroup
    ? Math.min(maxCarPassengers, 4 + Math.floor(Math.random() * (maxCarPassengers - 3)))
    : 1 + Math.floor(Math.random() * Math.min(3, maxCarPassengers));

  const isVip = vehicleFareMultiplier >= 1.35 && Math.random() > 0.4;
  const groupMult = passengerCount >= 4 ? 1.25 : 1.0;
  const baseFare = 15_000;
  const perKm = 13_500;
  const estimatedFare =
    Math.round(((baseFare + distanceKm * perKm) * trafficMult * vehicleFareMultiplier * groupMult) / 1000) * 1000;

  const passengerName = VIETNAMESE_NAMES[Math.floor(Math.random() * VIETNAMESE_NAMES.length)];
  const notePool = isVip || isGroup ? PICKUP_NOTES_VIP : PICKUP_NOTES_NORMAL;

  return {
    id: `ride_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    passengerName,
    passengerCount,
    pickupNodeId: pickupNode.id,
    pickupName: pickupLandmark ? pickupLandmark.name : pickupNode.label || findStreetForNode(pickupNode.id),
    pickupStreet: findStreetForNode(pickupNode.id),
    dropoffNodeId: dropoffNode.id,
    dropoffName: dropoffLandmark ? dropoffLandmark.name : dropoffNode.label || findStreetForNode(dropoffNode.id),
    dropoffStreet: findStreetForNode(dropoffNode.id),
    distanceKm,
    trafficLevel,
    estimatedFare,
    passengerNote: notePool[Math.floor(Math.random() * notePool.length)],
    isVip,
    expiresAt: Date.now() + RIDE_OFFER_TIMEOUT_MS
  };
}

export function buildCustomerFeedback(
  satisfaction: number,
  finesCount: number,
  collisionsCount: number,
  vehicleMultiplier: number
): { rating: number; comment: string; tags: string[] } {
  let rating = 5;
  if (satisfaction < 35) rating = 1;
  else if (satisfaction < 55) rating = 2;
  else if (satisfaction < 72) rating = 3;
  else if (satisfaction < 88) rating = 4;
  else rating = 5;

  const tags: string[] = [];
  if (rating === 5) {
    tags.push('Lái xe êm ái', 'Đúng luật giao thông', 'Đón trả đúng điểm');
    if (vehicleMultiplier >= 1.35) tags.push('Xe xịn, sạch sẽ');
    return {
      rating: 5,
      comment: 'Bác tài lái cực kỳ mượt mà, tuân thủ đèn đỏ và chọn đường rất thông minh. Chắc chắn sẽ đặt lại 5 sao!',
      tags
    };
  }
  if (rating === 4) {
    tags.push('Thân thiện', 'Đến nơi an toàn');
    if (collisionsCount > 0) tags.push('Hơi xóc nhẹ');
    return {
      rating: 4,
      comment: 'Chuyến đi khá ổn, bác tài nhiệt tình chỉ đường. Chỉ cần chạy chậm thêm chút ở ngã tư là hoàn hảo.',
      tags
    };
  }
  if (rating === 3) {
    if (finesCount > 0) tags.push('Vi phạm luật đường');
    if (collisionsCount > 0) tags.push('Va chạm nhẹ');
    tags.push('Cần chạy cẩn thận hơn');
    return {
      rating: 3,
      comment: 'Đến được nơi nhưng trên đường đi hơi gấp gáp và có vài pha phanh đột ngột làm mình hơi giật mình.',
      tags
    };
  }
  if (rating === 2) {
    if (finesCount > 0) tags.push('Vượt đèn đỏ / Quá tốc độ');
    if (collisionsCount > 0) tags.push('Gây va chạm');
    return {
      rating: 2,
      comment: 'Rất không hài lòng! Tài xế chạy ẩu, bị cảnh sát thổi phạt giữa đường khiến mình trễ giờ và rất lo lắng.',
      tags
    };
  }
  return {
    rating: 1,
    comment: 'Trải nghiệm tệ nhất! Gây tai nạn và liên tục vi phạm luật giao thông. Đề nghị hãng xem xét lại tài xế này!',
    tags: ['Lái xe nguy hiểm', 'Vi phạm nghiêm trọng', 'Gây tai nạn']
  };
}

export const INITIAL_SAMPLE_REVIEWS: CustomerReview[] = [
  {
    id: 'rev_init_1',
    passengerName: 'Lê Thu Hà',
    rating: 5,
    comment: 'Bác tài đón đúng điểm tại Hồ Hoàn Kiếm, chạy rất êm và lịch sự!',
    route: 'Hồ Hoàn Kiếm → Ga Hà Nội',
    fareEarned: 62_000,
    timestamp: 'Hôm nay'
  }
];
