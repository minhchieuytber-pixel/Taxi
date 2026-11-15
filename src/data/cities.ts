import { CityId, CityMapData, RoadNode, RoadSegment } from '../types/game';

export const CITIES: Record<CityId, CityMapData> = {
  hanoi: {
    id: 'hanoi',
    name: 'Hà Nội',
    subtitle: 'Hoàn Kiếm · Ba Đình · Phố Cổ · Mỹ Đình',
    centerLatLng: { lat: 21.028511, lng: 105.854444 },
    bounds: 540,
    waterBodies: [
      {
        id: 'ho_guom',
        name: 'Hồ Hoàn Kiếm',
        shape: 'ellipse',
        x: 120,
        z: 10,
        width: 44,
        depth: 96,
        rotation: -0.06
      },
      {
        id: 'ho_tay_corner',
        name: 'Hồ Tây (Nam)',
        shape: 'ellipse',
        x: -160,
        z: -330,
        width: 260,
        depth: 120,
        rotation: 0.08
      },
      {
        id: 'song_hong',
        name: 'Sông Hồng',
        shape: 'river',
        x: 345,
        z: 0,
        width: 110,
        depth: 1120,
        rotation: 0
      }
    ],
    nodes: [
      // Vành đai Bắc mới (Tây Hồ - Nhật Tân - Long Biên)
      { id: 'hn_lac_long_quan', x: -360, z: -340, hasTrafficLight: true, label: 'Lạc Long Quân - Võ Chí Công' },
      { id: 'hn_au_co', x: -50, z: -340, hasTrafficLight: true, label: 'Âu Cơ - Nghi Tàm' },
      { id: 'hn_yen_phu_n', x: 215, z: -340, hasTrafficLight: false, label: 'Đê Yên Phụ (Bắc)' },

      // Phố Cổ & Bờ Bắc
      { id: 'hn_hang_dau', x: 110, z: -200, hasTrafficLight: true, label: 'Bốt Hàng Đậu' },
      { id: 'hn_quan_thanh', x: -50, z: -200, hasTrafficLight: false, label: 'Quán Thánh' },
      { id: 'hn_lang_bac', x: -150, z: -200, hasTrafficLight: false, label: 'Quảng trường Ba Đình' },
      { id: 'hn_kim_ma_n', x: -260, z: -200, hasTrafficLight: true, label: 'Đào Tấn - Kim Mã' },
      { id: 'hn_cau_giay', x: -450, z: -200, hasTrafficLight: true, label: 'Nút giao Cầu Giấy - Xuân Thủy' },

      // Trục Trần Nhật Duật - Cầu Long Biên / Chương Dương (mở rộng sang Gia Lâm)
      { id: 'hn_tnd_n', x: 215, z: -200, hasTrafficLight: false, label: 'Đầu Cầu Long Biên' },
      { id: 'hn_long_bien_e', x: 470, z: -200, hasTrafficLight: true, label: 'Gia Lâm - Ngọc Lâm' },
      { id: 'hn_tnd_c', x: 215, z: -90, hasTrafficLight: true, label: 'Trần Nhật Duật' },
      { id: 'hn_chuong_duong_e', x: 470, z: -90, hasTrafficLight: false, label: 'Nguyễn Văn Cừ - Long Biên' },
      { id: 'hn_vinh_tuy_e', x: 470, z: 185, hasTrafficLight: true, label: 'Cầu Vĩnh Tuy - AEON Long Biên' },

      // Phố Cổ & Hoàn Kiếm Bắc
      { id: 'hn_hang_dao', x: 110, z: -90, hasTrafficLight: false, label: 'Ngã tư Hàng Đào - Hàng Ngang' },
      { id: 'hn_hang_bong', x: 10, z: -90, hasTrafficLight: true, label: 'Cửa Nam - Hàng Bông' },
      { id: 'hn_dien_bien', x: -150, z: -90, hasTrafficLight: false, label: 'Điện Biên Phủ - Hùng Vương' },
      { id: 'hn_kim_ma_c', x: -260, z: -90, hasTrafficLight: true, label: 'Ngã tư Kim Mã - Liễu Giai' },
      { id: 'hn_lang', x: -450, z: -90, hasTrafficLight: false, label: 'Đường Láng - Nguyễn Khang' },

      // Quanh Hồ Hoàn Kiếm & Ngõ Phố Cổ
      { id: 'hn_quang_truong_dk', x: 155, z: -60, hasTrafficLight: false, label: 'Đông Kinh Nghĩa Thục' },
      { id: 'hn_dinh_tien_hoang', x: 155, z: 75, hasTrafficLight: true, label: 'Đinh Tiên Hoàng - Tràng Tiền' },
      { id: 'hn_le_thai_to', x: 80, z: 75, hasTrafficLight: false, label: 'Lê Thái Tổ - Hàng Khay' },
      { id: 'hn_le_thai_to_n', x: 80, z: -60, hasTrafficLight: false, label: 'Lê Thái Tổ (Bắc)' },
      { id: 'hn_nha_hat_lon', x: 215, z: 75, hasTrafficLight: false, label: 'Quảng trường Nhà Hát Lớn' },
      { id: 'hn_tran_khanh_du', x: 215, z: 185, hasTrafficLight: true, label: 'Trần Khánh Dư' },

      // Nút Ngõ / Hẻm Hà Nội
      { id: 'hn_ngo_phat_loc', x: 162, z: -135, hasTrafficLight: false, label: 'Ngõ Phất Lộc' },
      { id: 'hn_ngo_bao_khanh', x: 45, z: -25, hasTrafficLight: false, label: 'Ngõ Bảo Khánh' },
      { id: 'hn_ngo_trang_tien', x: 185, z: 105, hasTrafficLight: false, label: 'Ngõ Tràng Tiền' },
      { id: 'hn_ngo_van_chuong', x: -70, z: 75, hasTrafficLight: false, label: 'Ngõ Văn Chương' },

      // Trục Hai Bà Trưng - Nguyễn Thái Học - Văn Miếu
      { id: 'hn_hbt_cua_nam', x: 10, z: 15, hasTrafficLight: false, label: 'Ngã tư Hai Bà Trưng - Lê Duẩn' },
      { id: 'hn_van_mieu', x: -150, z: 15, hasTrafficLight: true, label: 'Văn Miếu - Quốc Tử Giám' },
      { id: 'hn_giang_vo', x: -260, z: 15, hasTrafficLight: false, label: 'Giảng Võ - Cát Linh' },
      { id: 'hn_lang_c', x: -450, z: 15, hasTrafficLight: true, label: 'Láng Hạ - Đường Láng' },

      // Trục Lý Thường Kiệt - Ga Hà Nội - Đại lộ Thăng Long
      { id: 'hn_ga_ha_noi', x: 10, z: 130, hasTrafficLight: false, label: 'Ga Hà Nội (Lê Duẩn)' },
      { id: 'hn_pho_hue_ltk', x: 110, z: 130, hasTrafficLight: true, label: 'Phố Huế - Lý Thường Kiệt' },
      { id: 'hn_ba_trieu_ltk', x: 155, z: 130, hasTrafficLight: false, label: 'Bà Triệu - Lý Thường Kiệt' },
      { id: 'hn_kham_thien', x: -150, z: 130, hasTrafficLight: true, label: 'Ô Chợ Dừa - Xã Đàn' },
      { id: 'hn_trung_hoa', x: -260, z: 130, hasTrafficLight: false, label: 'Trần Duy Hưng - Hoàng Đạo Thúy' },
      { id: 'hn_my_dinh', x: -450, z: 130, hasTrafficLight: true, label: 'Đại lộ Thăng Long - Mỹ Đình' },

      // Vành đai Nam trung tâm (Trần Hưng Đạo - Đại Cồ Việt)
      { id: 'hn_thd_le_duan', x: 10, z: 235, hasTrafficLight: true, label: 'Công viên Thống Nhất' },
      { id: 'hn_pho_hue_s', x: 110, z: 235, hasTrafficLight: false, label: 'Phố Huế - Đại Cồ Việt' },
      { id: 'hn_ba_trieu_s', x: 155, z: 235, hasTrafficLight: true, label: 'Vincom Bà Triệu' },
      { id: 'hn_xa_dan', x: -150, z: 235, hasTrafficLight: false, label: 'Hầm Kim Liên - Xã Đàn' },
      { id: 'hn_le_van_luong', x: -260, z: 235, hasTrafficLight: true, label: 'Lê Văn Lương' },
      { id: 'hn_keangnam', x: -450, z: 235, hasTrafficLight: false, label: 'Phạm Hùng - Keangnam' },

      // Vành đai Nam mở rộng (Giải Phóng - Trường Chinh - Minh Khai)
      { id: 'hn_nga_tu_so', x: -260, z: 365, hasTrafficLight: true, label: 'Ngã Tư Sở' },
      { id: 'hn_bach_mai', x: 110, z: 365, hasTrafficLight: true, label: 'Ngã tư Bạch Mai - Minh Khai' },
      { id: 'hn_ben_xe_giap_bat', x: 10, z: 365, hasTrafficLight: false, label: 'Đường Giải Phóng' }
    ],
    segments: [
      // Vành đai Bắc mới (-340)
      { id: 'sn1', from: 'hn_lac_long_quan', to: 'hn_au_co', streetName: 'Đường Lạc Long Quân', lanes: 4 },
      { id: 'sn2', from: 'hn_au_co', to: 'hn_yen_phu_n', streetName: 'Đường Âu Cơ', lanes: 4 },
      { id: 'sn3', from: 'hn_lac_long_quan', to: 'hn_cau_giay', streetName: 'Đường Bưởi - Võ Chí Công', lanes: 6, speedLimit: 70 },
      { id: 'sn4', from: 'hn_au_co', to: 'hn_quan_thanh', streetName: 'Đường Thanh Niên', lanes: 3 },
      { id: 'sn5', from: 'hn_yen_phu_n', to: 'hn_tnd_n', streetName: 'Đê Yên Phụ', lanes: 3 },

      // Hàng ngang Bắc (-200)
      { id: 's1', from: 'hn_cau_giay', to: 'hn_kim_ma_n', streetName: 'Đường Cầu Giấy', lanes: 6, speedLimit: 60 },
      { id: 's2', from: 'hn_kim_ma_n', to: 'hn_lang_bac', streetName: 'Phố Hoàng Hoa Thám', lanes: 2 },
      { id: 's3', from: 'hn_lang_bac', to: 'hn_quan_thanh', streetName: 'Phố Quán Thánh', lanes: 2 },
      { id: 's4', from: 'hn_quan_thanh', to: 'hn_hang_dau', streetName: 'Phố Phan Đình Phùng', lanes: 3 },
      { id: 's5', from: 'hn_hang_dau', to: 'hn_tnd_n', streetName: 'Đường Yên Phụ', lanes: 4 },
      { id: 's6', from: 'hn_tnd_n', to: 'hn_long_bien_e', streetName: 'Cầu Long Biên', lanes: 2, speedLimit: 50, isBridge: true },

      // Hàng ngang Phố Cổ (-90)
      { id: 's7', from: 'hn_lang', to: 'hn_kim_ma_c', streetName: 'Đường Cầu Giấy - Kim Mã', lanes: 4 },
      { id: 's8', from: 'hn_kim_ma_c', to: 'hn_dien_bien', streetName: 'Phố Kim Mã', lanes: 4, speedLimit: 50 },
      { id: 's9', from: 'hn_dien_bien', to: 'hn_hang_bong', streetName: 'Phố Điện Biên Phủ', lanes: 3 },
      { id: 's10', from: 'hn_hang_bong', to: 'hn_hang_dao', streetName: 'Phố Hàng Bông', lanes: 2 },
      { id: 's11', from: 'hn_hang_dao', to: 'hn_tnd_c', streetName: 'Phố Hàng Mắm', lanes: 2, speedLimit: 45 },
      { id: 's12', from: 'hn_tnd_c', to: 'hn_chuong_duong_e', streetName: 'Cầu Chương Dương', lanes: 6, speedLimit: 60, isBridge: true },

      // Quanh Hồ Hoàn Kiếm (đường một chiều theo chiều kim đồng hồ như ngoài đời thật)
      { id: 's13', from: 'hn_hang_dao', to: 'hn_quang_truong_dk', streetName: 'Phố Hàng Đào', lanes: 2, speedLimit: 40, oneWay: true },
      { id: 's14', from: 'hn_le_thai_to_n', to: 'hn_quang_truong_dk', streetName: 'Quảng trường Đông Kinh Nghĩa Thục', lanes: 2, speedLimit: 40, oneWay: true },
      { id: 's15', from: 'hn_le_thai_to', to: 'hn_le_thai_to_n', streetName: 'Phố Lê Thái Tổ', lanes: 2, speedLimit: 40, oneWay: true },
      { id: 's16', from: 'hn_quang_truong_dk', to: 'hn_dinh_tien_hoang', streetName: 'Phố Đinh Tiên Hoàng', lanes: 3, speedLimit: 45, oneWay: true },
      { id: 's17', from: 'hn_dinh_tien_hoang', to: 'hn_le_thai_to', streetName: 'Phố Hàng Khay', lanes: 2, speedLimit: 45, oneWay: true },
      { id: 's18', from: 'hn_dinh_tien_hoang', to: 'hn_nha_hat_lon', streetName: 'Phố Tràng Tiền', lanes: 3 },

      // Các Ngõ / Hẻm nhỏ Hà Nội (lanes: 1)
      { id: 'hn_a1', from: 'hn_hang_dao', to: 'hn_ngo_phat_loc', streetName: 'Ngõ Phất Lộc', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'hn_a2', from: 'hn_ngo_phat_loc', to: 'hn_tnd_c', streetName: 'Ngõ Phất Lộc', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'hn_a3', from: 'hn_hang_bong', to: 'hn_ngo_bao_khanh', streetName: 'Ngõ Bảo Khánh', lanes: 1, speedLimit: 30 },
      { id: 'hn_a4', from: 'hn_ngo_bao_khanh', to: 'hn_le_thai_to', streetName: 'Ngõ Bảo Khánh', lanes: 1, speedLimit: 30 },
      { id: 'hn_a5', from: 'hn_dinh_tien_hoang', to: 'hn_ngo_trang_tien', streetName: 'Ngõ Tràng Tiền', lanes: 1 },
      { id: 'hn_a6', from: 'hn_ngo_trang_tien', to: 'hn_ba_trieu_ltk', streetName: 'Ngõ Tràng Tiền', lanes: 1 },
      { id: 'hn_a7', from: 'hn_van_mieu', to: 'hn_ngo_van_chuong', streetName: 'Ngõ Văn Chương', lanes: 1 },
      { id: 'hn_a8', from: 'hn_ngo_van_chuong', to: 'hn_ga_ha_noi', streetName: 'Ngõ Văn Chương', lanes: 1 },

      // Hàng ngang Hai Bà Trưng - Văn Miếu (+15)
      { id: 's19', from: 'hn_lang_c', to: 'hn_giang_vo', streetName: 'Phố Láng Hạ', lanes: 6 },
      { id: 's20', from: 'hn_giang_vo', to: 'hn_van_mieu', streetName: 'Phố Giảng Võ - Cát Linh', lanes: 4 },
      { id: 's21', from: 'hn_van_mieu', to: 'hn_hbt_cua_nam', streetName: 'Phố Nguyễn Thái Học', lanes: 3 },
      { id: 's22', from: 'hn_hbt_cua_nam', to: 'hn_le_thai_to', streetName: 'Phố Hai Bà Trưng', lanes: 3 },

      // Hàng ngang Lý Thường Kiệt - Trần Duy Hưng (+130)
      { id: 's23', from: 'hn_my_dinh', to: 'hn_trung_hoa', streetName: 'Đại lộ Thăng Long', lanes: 6, speedLimit: 80 },
      { id: 's24', from: 'hn_trung_hoa', to: 'hn_kham_thien', streetName: 'Đường Trần Duy Hưng', lanes: 6, speedLimit: 65 },
      { id: 's25', from: 'hn_kham_thien', to: 'hn_ga_ha_noi', streetName: 'Phố Khâm Thiên', lanes: 2 },
      { id: 's26', from: 'hn_ga_ha_noi', to: 'hn_pho_hue_ltk', streetName: 'Phố Lý Thường Kiệt', lanes: 3 },
      { id: 's27', from: 'hn_pho_hue_ltk', to: 'hn_ba_trieu_ltk', streetName: 'Phố Lý Thường Kiệt', lanes: 3 },
      { id: 's28', from: 'hn_ba_trieu_ltk', to: 'hn_nha_hat_lon', streetName: 'Phố Phan Chu Trinh', lanes: 3 },

      // Hàng ngang Trần Hưng Đạo - Đại Cồ Việt (+235)
      { id: 's29', from: 'hn_keangnam', to: 'hn_le_van_luong', streetName: 'Đường Phạm Hùng', lanes: 6, speedLimit: 70 },
      { id: 's30', from: 'hn_le_van_luong', to: 'hn_xa_dan', streetName: 'Đường Lê Văn Lương', lanes: 4 },
      { id: 's31', from: 'hn_xa_dan', to: 'hn_thd_le_duan', streetName: 'Đường Xã Đàn', lanes: 6 },
      { id: 's32', from: 'hn_thd_le_duan', to: 'hn_pho_hue_s', streetName: 'Phố Trần Nhân Tông', lanes: 3 },
      { id: 's33', from: 'hn_pho_hue_s', to: 'hn_ba_trieu_s', streetName: 'Đường Đại Cồ Việt', lanes: 4, speedLimit: 55 },
      { id: 's34', from: 'hn_ba_trieu_s', to: 'hn_tran_khanh_du', streetName: 'Phố Trần Hưng Đạo', lanes: 3 },
      { id: 's35', from: 'hn_tran_khanh_du', to: 'hn_vinh_tuy_e', streetName: 'Cầu Vĩnh Tuy', lanes: 6, speedLimit: 65, isBridge: true },

      // Vành đai Nam mới (+365)
      { id: 'ss1', from: 'hn_nga_tu_so', to: 'hn_ben_xe_giap_bat', streetName: 'Đường Trường Chinh', lanes: 6 },
      { id: 'ss2', from: 'hn_ben_xe_giap_bat', to: 'hn_bach_mai', streetName: 'Đường Minh Khai', lanes: 6 },
      { id: 'ss3', from: 'hn_le_van_luong', to: 'hn_nga_tu_so', streetName: 'Đường Nguyễn Trãi', lanes: 6 },
      { id: 'ss4', from: 'hn_thd_le_duan', to: 'hn_ben_xe_giap_bat', streetName: 'Đường Giải Phóng', lanes: 6 },
      { id: 'ss5', from: 'hn_pho_hue_s', to: 'hn_bach_mai', streetName: 'Phố Bạch Mai', lanes: 3 },

      // Trục dọc (Bắc - Nam)
      { id: 'v1', from: 'hn_cau_giay', to: 'hn_lang', streetName: 'Đường Láng', lanes: 4 },
      { id: 'v2', from: 'hn_lang', to: 'hn_lang_c', streetName: 'Đường Láng', lanes: 4 },
      { id: 'v3', from: 'hn_lang_c', to: 'hn_my_dinh', streetName: 'Đường Khuất Duy Tiến', lanes: 6, speedLimit: 70 },
      { id: 'v4', from: 'hn_my_dinh', to: 'hn_keangnam', streetName: 'Đường Phạm Hùng', lanes: 6, speedLimit: 70 },

      { id: 'v5', from: 'hn_kim_ma_n', to: 'hn_kim_ma_c', streetName: 'Phố Liễu Giai', lanes: 4 },
      { id: 'v6', from: 'hn_kim_ma_c', to: 'hn_giang_vo', streetName: 'Phố Nguyễn Chí Thanh', lanes: 6 },
      { id: 'v7', from: 'hn_giang_vo', to: 'hn_trung_hoa', streetName: 'Đường Láng Hạ - Hoàng Đạo Thúy', lanes: 4 },
      { id: 'v8', from: 'hn_trung_hoa', to: 'hn_le_van_luong', streetName: 'Phố Hoàng Minh Giám', lanes: 3 },

      { id: 'v9', from: 'hn_lang_bac', to: 'hn_dien_bien', streetName: 'Đường Hùng Vương', lanes: 4, speedLimit: 40 },
      { id: 'v10', from: 'hn_dien_bien', to: 'hn_van_mieu', streetName: 'Phố Chu Văn An - Tôn Đức Thắng', lanes: 3 },
      { id: 'v11', from: 'hn_van_mieu', to: 'hn_kham_thien', streetName: 'Phố Tôn Đức Thắng', lanes: 3 },
      { id: 'v12', from: 'hn_kham_thien', to: 'hn_xa_dan', streetName: 'Phố Xã Đàn', lanes: 4 },

      { id: 'v13', from: 'hn_quan_thanh', to: 'hn_hang_bong', streetName: 'Phố Hoàng Diệu', lanes: 3 },
      { id: 'v14', from: 'hn_hang_bong', to: 'hn_hbt_cua_nam', streetName: 'Đường Lê Duẩn', lanes: 3 },
      { id: 'v15', from: 'hn_hbt_cua_nam', to: 'hn_ga_ha_noi', streetName: 'Đường Lê Duẩn', lanes: 3 },
      { id: 'v16', from: 'hn_ga_ha_noi', to: 'hn_thd_le_duan', streetName: 'Đường Lê Duẩn', lanes: 3 },

      { id: 'v17', from: 'hn_hang_dau', to: 'hn_hang_dao', streetName: 'Phố Hàng Giấy - Đồng Xuân', lanes: 2 },
      // Cặp đường một chiều Phố Huế - Hàng Bài (Nam -> Bắc) & Bà Triệu (Bắc -> Nam)
      { id: 'v18', from: 'hn_pho_hue_ltk', to: 'hn_le_thai_to', streetName: 'Phố Hàng Bài', lanes: 3, oneWay: true },
      { id: 'v19', from: 'hn_pho_hue_s', to: 'hn_pho_hue_ltk', streetName: 'Phố Huế', lanes: 3, speedLimit: 50, oneWay: true },
      { id: 'v20', from: 'hn_dinh_tien_hoang', to: 'hn_ba_trieu_ltk', streetName: 'Phố Ngô Quyền - Bà Triệu', lanes: 3, oneWay: true },
      { id: 'v21', from: 'hn_ba_trieu_ltk', to: 'hn_ba_trieu_s', streetName: 'Phố Bà Triệu', lanes: 3, speedLimit: 50, oneWay: true },

      { id: 'v22', from: 'hn_tnd_n', to: 'hn_tnd_c', streetName: 'Đường Trần Nhật Duật', lanes: 4, speedLimit: 60 },
      { id: 'v23', from: 'hn_tnd_c', to: 'hn_nha_hat_lon', streetName: 'Đường Trần Quang Khải', lanes: 4, speedLimit: 60 },
      { id: 'v24', from: 'hn_nha_hat_lon', to: 'hn_tran_khanh_du', streetName: 'Đường Trần Khánh Dư', lanes: 4 },

      // Nối Gia Lâm (bên kia sông)
      { id: 'v25', from: 'hn_long_bien_e', to: 'hn_chuong_duong_e', streetName: 'Đường Nguyễn Văn Cừ (Long Biên)', lanes: 4 },
      { id: 'v26', from: 'hn_chuong_duong_e', to: 'hn_vinh_tuy_e', streetName: 'Đường Cổ Linh (Long Biên)', lanes: 4 }
    ],
    landmarks: [
      {
        id: 'lm_thap_rua',
        name: 'Hồ Hoàn Kiếm & Tháp Rùa',
        description: 'Trái tim Thủ đô Hà Nội với Tháp Rùa cổ kính và Cầu Thê Húc sơn son rực rỡ.',
        x: 120,
        z: 10,
        nodeId: 'hn_dinh_tien_hoang',
        type: 'thap_rua',
        category: 'landmark'
      },
      {
        id: 'lm_nha_hat_lon',
        name: 'Nhà Hát Lớn Hà Nội',
        description: 'Công trình kiến trúc Pháp cổ kính tại Quảng trường Cách mạng Tháng Tám.',
        x: 245,
        z: 48,
        nodeId: 'hn_nha_hat_lon',
        type: 'nha_hat_lon',
        category: 'landmark'
      },
      {
        id: 'lm_lang_bac',
        name: 'Lăng Chủ tịch Hồ Chí Minh',
        description: 'Quảng trường Ba Đình lịch sử trang nghiêm.',
        x: -185,
        z: -165,
        nodeId: 'hn_lang_bac',
        type: 'lang_bac',
        category: 'landmark'
      },
      {
        id: 'lm_van_mieu',
        name: 'Văn Miếu - Quốc Tử Giám',
        description: 'Trường đại học đầu tiên của Việt Nam với Khuê Văn Các.',
        x: -180,
        z: 45,
        nodeId: 'hn_van_mieu',
        type: 'van_mieu',
        category: 'landmark'
      },
      {
        id: 'lm_ga_ha_noi',
        name: 'Ga Hà Nội',
        description: 'Nhà ga đường sắt trung tâm sầm uất trên phố Lê Duẩn.',
        x: -20,
        z: 155,
        nodeId: 'hn_ga_ha_noi',
        type: 'ga_ha_noi',
        category: 'station'
      },
      {
        id: 'lm_cau_long_bien',
        name: 'Cầu Long Biên',
        description: 'Cây cầu thép lịch sử bắc qua Sông Hồng nối Hoàn Kiếm với Long Biên.',
        x: 310,
        z: -200,
        nodeId: 'hn_tnd_n',
        type: 'cau_long_bien',
        category: 'landmark'
      },
      {
        id: 'lm_my_dinh',
        name: 'Khu Liên hợp Thể thao Mỹ Đình',
        description: 'Trung tâm phía Tây hiện đại trên trục Đại lộ Thăng Long - Phạm Hùng.',
        x: -395,
        z: 165,
        nodeId: 'hn_my_dinh',
        type: 'my_dinh',
        category: 'station'
      }
    ],
    speedCameraNodes: ['hn_tnd_c', 'hn_trung_hoa', 'hn_my_dinh', 'hn_pho_hue_s', 'hn_kim_ma_n']
  },

  hcmc: {
    id: 'hcmc',
    name: 'TP. Hồ Chí Minh',
    subtitle: 'Quận 1 · Bến Thành · Nguyễn Huệ · Thủ Thiêm',
    centerLatLng: { lat: 10.776889, lng: 106.700806 },
    bounds: 500,
    waterBodies: [
      {
        id: 'song_sai_gon',
        name: 'Sông Sài Gòn',
        shape: 'river',
        x: 245,
        z: 0,
        width: 115,
        depth: 1040,
        rotation: 0.05
      }
    ],
    nodes: [
      { id: 'sg_duc_ba', x: -20, z: -150, hasTrafficLight: true, label: 'Nhà thờ Đức Bà' },
      { id: 'sg_le_duan_e', x: 140, z: -150, hasTrafficLight: false, label: 'Lê Duẩn - Tôn Đức Thắng' },
      { id: 'sg_dinh_doc_lap', x: -160, z: -150, hasTrafficLight: false, label: 'Dinh Độc Lập' },
      { id: 'sg_cmt8_n', x: -340, z: -150, hasTrafficLight: true, label: 'Vòng xoay Dân Chủ (Q.3)' },
      { id: 'sg_ben_thanh', x: -160, z: 20, hasTrafficLight: true, label: 'Vòng xoay Chợ Bến Thành' },
      { id: 'sg_le_loi', x: -20, z: 20, hasTrafficLight: false, label: 'Lê Lợi - Pasteur' },
      { id: 'sg_nguyen_hue', x: 70, z: 20, hasTrafficLight: false, label: 'Phố đi bộ Nguyễn Huệ' },
      { id: 'sg_bach_dang', x: 155, z: 20, hasTrafficLight: true, label: 'Bến Bạch Đằng' },
      { id: 'sg_thu_thiem_e', x: 385, z: 20, hasTrafficLight: false, label: 'Đô thị Thủ Thiêm' },
      { id: 'sg_bitexco', x: 70, z: 140, hasTrafficLight: false, label: 'Tháp Bitexco - Hàm Nghi' },
      { id: 'sg_ham_nghi_w', x: -160, z: 140, hasTrafficLight: true, label: 'Trần Hưng Đạo - Q1' },
      { id: 'sg_bui_vien', x: -340, z: 140, hasTrafficLight: false, label: 'Phố Tây Bùi Viện' },
      { id: 'sg_cau_ong_lanh', x: -20, z: 260, hasTrafficLight: false, label: 'Võ Văn Kiệt - Cầu Ông Lãnh' },
      { id: 'sg_khanh_hoi', x: -160, z: 330, hasTrafficLight: true, label: 'Cầu Khánh Hội - Quận 4' },
      { id: 'sg_thu_thiem_s', x: 385, z: -150, hasTrafficLight: false, label: 'Cầu Ba Son (Thủ Thiêm)' },

      // Hẻm Sài Gòn
      { id: 'sg_hem_le_thanh_ton', x: 25, z: -65, hasTrafficLight: false, label: 'Hẻm 15B Lê Thánh Tôn' },
      { id: 'sg_hem_bui_vien', x: -250, z: 215, hasTrafficLight: false, label: 'Hẻm Bùi Viện - Đề Thám' }
    ],
    segments: [
      { id: 'sg0', from: 'sg_cmt8_n', to: 'sg_dinh_doc_lap', streetName: 'Đường Cách Mạng Tháng 8', lanes: 6, speedLimit: 60 },
      { id: 'sg1', from: 'sg_dinh_doc_lap', to: 'sg_duc_ba', streetName: 'Đường Lê Duẩn', lanes: 4 },
      { id: 'sg2', from: 'sg_duc_ba', to: 'sg_le_duan_e', streetName: 'Đường Lê Duẩn', lanes: 4 },
      { id: 'sg3', from: 'sg_le_duan_e', to: 'sg_thu_thiem_s', streetName: 'Cầu Ba Son', lanes: 6, speedLimit: 60, isBridge: true },
      { id: 'sg4', from: 'sg_ben_thanh', to: 'sg_le_loi', streetName: 'Đường Lê Lợi', lanes: 4 },
      { id: 'sg5', from: 'sg_le_loi', to: 'sg_nguyen_hue', streetName: 'Đường Lê Lợi', lanes: 4, speedLimit: 45 },
      { id: 'sg6', from: 'sg_nguyen_hue', to: 'sg_bach_dang', streetName: 'Đường Tôn Đức Thắng', lanes: 4, speedLimit: 50 },
      { id: 'sg7', from: 'sg_bach_dang', to: 'sg_thu_thiem_e', streetName: 'Cầu Thủ Thiêm', lanes: 6, speedLimit: 70, isBridge: true },
      { id: 'sg8', from: 'sg_bui_vien', to: 'sg_ham_nghi_w', streetName: 'Phố Bùi Viện - Phạm Ngũ Lão', lanes: 3 },
      { id: 'sg9', from: 'sg_ham_nghi_w', to: 'sg_bitexco', streetName: 'Đại lộ Hàm Nghi', lanes: 6 },
      { id: 'sg10', from: 'sg_ben_thanh', to: 'sg_dinh_doc_lap', streetName: 'Đường Nam Kỳ Khởi Nghĩa', lanes: 4, oneWay: true },
      { id: 'sg11', from: 'sg_ben_thanh', to: 'sg_ham_nghi_w', streetName: 'Đường Trần Hưng Đạo', lanes: 4 },
      { id: 'sg12', from: 'sg_duc_ba', to: 'sg_le_loi', streetName: 'Đường Pasteur', lanes: 3, oneWay: true },
      { id: 'sg13', from: 'sg_cau_ong_lanh', to: 'sg_le_loi', streetName: 'Đường Nam Kỳ Khởi Nghĩa', lanes: 4, oneWay: true },
      { id: 'sg14', from: 'sg_nguyen_hue', to: 'sg_bitexco', streetName: 'Đường Nguyễn Huệ', lanes: 6, speedLimit: 40 },
      { id: 'sg15', from: 'sg_le_duan_e', to: 'sg_bach_dang', streetName: 'Đường Tôn Đức Thắng', lanes: 4, speedLimit: 50 },
      { id: 'sg16', from: 'sg_bitexco', to: 'sg_cau_ong_lanh', streetName: 'Đại lộ Võ Văn Kiệt', lanes: 6, speedLimit: 65 },
      { id: 'sg17', from: 'sg_thu_thiem_s', to: 'sg_thu_thiem_e', streetName: 'Đại lộ Vòng Cung Thủ Thiêm', lanes: 6, speedLimit: 70 },
      { id: 'sg18', from: 'sg_cmt8_n', to: 'sg_bui_vien', streetName: 'Đường Nguyễn Thị Minh Khai', lanes: 4 },
      { id: 'sg19', from: 'sg_ham_nghi_w', to: 'sg_khanh_hoi', streetName: 'Đường Khánh Hội', lanes: 3 },
      { id: 'sg20', from: 'sg_khanh_hoi', to: 'sg_cau_ong_lanh', streetName: 'Đường Bến Vân Đồn', lanes: 3 },

      // Hẻm Sài Gòn (lanes: 1)
      { id: 'sg_a1', from: 'sg_duc_ba', to: 'sg_hem_le_thanh_ton', streetName: 'Hẻm 15B Lê Thánh Tôn', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'sg_a2', from: 'sg_hem_le_thanh_ton', to: 'sg_nguyen_hue', streetName: 'Hẻm 15B Lê Thánh Tôn', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'sg_a3', from: 'sg_bui_vien', to: 'sg_hem_bui_vien', streetName: 'Hẻm Bùi Viện - Đề Thám', lanes: 1 },
      { id: 'sg_a4', from: 'sg_hem_bui_vien', to: 'sg_cau_ong_lanh', streetName: 'Hẻm Bùi Viện - Đề Thám', lanes: 1 }
    ],
    landmarks: [
      {
        id: 'lm_ben_thanh',
        name: 'Chợ Bến Thành',
        description: 'Biểu tượng giao thương nổi tiếng nhất trung tâm Sài Gòn.',
        x: -195,
        z: 55,
        nodeId: 'sg_ben_thanh',
        type: 'ben_thanh',
        category: 'market'
      },
      {
        id: 'lm_bitexco',
        name: 'Tháp Bitexco Financial',
        description: 'Tòa tháp 68 tầng hình búp sen với sân đỗ trực thăng đặc trưng.',
        x: 108,
        z: 170,
        nodeId: 'sg_bitexco',
        type: 'bitexco',
        category: 'landmark'
      },
      {
        id: 'lm_duc_ba',
        name: 'Nhà thờ Đức Bà Sài Gòn',
        description: 'Công trình gạch đỏ cổ kính ngay công trường Công xã Paris.',
        x: -20,
        z: -190,
        nodeId: 'sg_duc_ba',
        type: 'nha_tho_duc_ba',
        category: 'landmark'
      },
      {
        id: 'lm_nguyen_hue',
        name: 'Phố đi bộ Nguyễn Huệ',
        description: 'Quảng trường trung tâm sôi động nối UBND Thành phố tới Bến Bạch Đằng.',
        x: 70,
        z: -20,
        nodeId: 'sg_nguyen_hue',
        type: 'nguyen_hue',
        category: 'park'
      }
    ],
    speedCameraNodes: ['sg_bach_dang', 'sg_cau_ong_lanh', 'sg_thu_thiem_e']
  },

  danang: {
    id: 'danang',
    name: 'Đà Nẵng',
    subtitle: 'Sông Hàn · Cầu Rồng · Biển Mỹ Khê',
    centerLatLng: { lat: 16.061102, lng: 108.227319 },
    bounds: 480,
    waterBodies: [
      {
        id: 'song_han',
        name: 'Sông Hàn',
        shape: 'river',
        x: 60,
        z: 0,
        width: 95,
        depth: 960,
        rotation: 0
      },
      {
        id: 'bien_my_khe',
        name: 'Biển Mỹ Khê',
        shape: 'river',
        x: 380,
        z: 0,
        width: 110,
        depth: 980,
        rotation: 0
      }
    ],
    nodes: [
      { id: 'dn_san_bay', x: -320, z: 120, hasTrafficLight: false, label: 'Cảng HKQT Đà Nẵng' },
      { id: 'dn_nvl_w', x: -130, z: 120, hasTrafficLight: true, label: 'Nguyễn Văn Linh - Hoàng Diệu' },
      { id: 'dn_cau_rong_w', x: -15, z: 120, hasTrafficLight: false, label: 'Đuôi Cầu Rồng - Bạch Đằng' },
      { id: 'dn_cau_rong_e', x: 145, z: 120, hasTrafficLight: true, label: 'Đầu Cầu Rồng - Trần Hưng Đạo' },
      { id: 'dn_my_khe', x: 285, z: 120, hasTrafficLight: false, label: 'Bãi biển Mỹ Khê (Võ Nguyên Giáp)' },

      { id: 'dn_le_duan_w', x: -130, z: -110, hasTrafficLight: false, label: 'Đường Lê Duẩn' },
      { id: 'dn_cau_sh_w', x: -15, z: -110, hasTrafficLight: true, label: 'Đầu Cầu Sông Hàn (Tây)' },
      { id: 'dn_cau_sh_e', x: 145, z: -110, hasTrafficLight: false, label: 'Vòng xoay Cầu Sông Hàn (Đông)' },
      { id: 'dn_pham_van_dong', x: 285, z: -110, hasTrafficLight: true, label: 'Công viên Biển Đông' },

      { id: 'dn_cho_han', x: -15, z: 15, hasTrafficLight: false, label: 'Chợ Hàn - Bạch Đằng' },
      { id: 'dn_ga_dn', x: -320, z: -110, hasTrafficLight: true, label: 'Ga Đà Nẵng' },
      { id: 'dn_ngu_hanh_son', x: 285, z: 280, hasTrafficLight: true, label: 'Đường Ngũ Hành Sơn' },
      { id: 'dn_cach_mang', x: -130, z: 280, hasTrafficLight: false, label: 'Cầu Trần Thị Lý (Tây)' },

      // Kiệt / Hẻm Đà Nẵng
      { id: 'dn_kiet_bach_dang', x: -72, z: -45, hasTrafficLight: false, label: 'Kiệt Bạch Đằng' },
      { id: 'dn_kiet_nvl', x: -72, z: 195, hasTrafficLight: false, label: 'Kiệt Nguyễn Văn Linh' }
    ],
    segments: [
      { id: 'dn1', from: 'dn_san_bay', to: 'dn_nvl_w', streetName: 'Đường Duy Tân - Nguyễn Văn Linh', lanes: 6, speedLimit: 60 },
      { id: 'dn2', from: 'dn_nvl_w', to: 'dn_cau_rong_w', streetName: 'Đường Nguyễn Văn Linh', lanes: 6 },
      { id: 'dn3', from: 'dn_cau_rong_w', to: 'dn_cau_rong_e', streetName: 'Cầu Rồng', lanes: 6, speedLimit: 60, isBridge: true },
      { id: 'dn4', from: 'dn_cau_rong_e', to: 'dn_my_khe', streetName: 'Đường Võ Văn Kiệt', lanes: 6 },

      { id: 'dn5', from: 'dn_ga_dn', to: 'dn_le_duan_w', streetName: 'Đường Hải Phòng - Lê Duẩn', lanes: 3 },
      { id: 'dn6', from: 'dn_le_duan_w', to: 'dn_cau_sh_w', streetName: 'Đường Lê Duẩn', lanes: 4 },
      { id: 'dn7', from: 'dn_cau_sh_w', to: 'dn_cau_sh_e', streetName: 'Cầu Sông Hàn', lanes: 4, speedLimit: 55, isBridge: true },
      { id: 'dn8', from: 'dn_cau_sh_e', to: 'dn_pham_van_dong', streetName: 'Đường Phạm Văn Đồng', lanes: 6, speedLimit: 65 },

      { id: 'dn9', from: 'dn_cau_sh_w', to: 'dn_cho_han', streetName: 'Đường Bạch Đằng', lanes: 3, oneWay: true },
      { id: 'dn10', from: 'dn_cho_han', to: 'dn_cau_rong_w', streetName: 'Đường Bạch Đằng', lanes: 3, oneWay: true },
      { id: 'dn11', from: 'dn_le_duan_w', to: 'dn_nvl_w', streetName: 'Đường Hoàng Diệu', lanes: 3 },
      { id: 'dn12', from: 'dn_san_bay', to: 'dn_ga_dn', streetName: 'Đường Nguyễn Tri Phương', lanes: 4 },
      { id: 'dn13', from: 'dn_cau_rong_e', to: 'dn_cau_sh_e', streetName: 'Đường Trần Hưng Đạo', lanes: 4, oneWay: true },
      { id: 'dn14', from: 'dn_pham_van_dong', to: 'dn_my_khe', streetName: 'Đường Võ Nguyên Giáp', lanes: 6, speedLimit: 70 },
      { id: 'dn15', from: 'dn_my_khe', to: 'dn_ngu_hanh_son', streetName: 'Đường Ngũ Hành Sơn', lanes: 6, speedLimit: 65 },
      { id: 'dn16', from: 'dn_cach_mang', to: 'dn_ngu_hanh_son', streetName: 'Cầu Trần Thị Lý', lanes: 6, speedLimit: 60, isBridge: true },
      { id: 'dn17', from: 'dn_nvl_w', to: 'dn_cach_mang', streetName: 'Đường 2 Tháng 9', lanes: 6 },

      // Kiệt / Hẻm Đà Nẵng (lanes: 1)
      { id: 'dn_a1', from: 'dn_le_duan_w', to: 'dn_kiet_bach_dang', streetName: 'Kiệt Bạch Đằng', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'dn_a2', from: 'dn_kiet_bach_dang', to: 'dn_cho_han', streetName: 'Kiệt Bạch Đằng', lanes: 1, speedLimit: 30, oneWay: true },
      { id: 'dn_a3', from: 'dn_nvl_w', to: 'dn_kiet_nvl', streetName: 'Kiệt Nguyễn Văn Linh', lanes: 1 },
      { id: 'dn_a4', from: 'dn_kiet_nvl', to: 'dn_cach_mang', streetName: 'Kiệt Nguyễn Văn Linh', lanes: 1 }
    ],
    landmarks: [
      {
        id: 'lm_cau_rong',
        name: 'Cầu Rồng Sông Hàn',
        description: 'Cây cầu biểu tượng hình rồng vàng uốn lượn bắc qua sông Hàn.',
        x: 65,
        z: 120,
        nodeId: 'dn_cau_rong_w',
        type: 'cau_rong',
        category: 'landmark'
      },
      {
        id: 'lm_my_khe',
        name: 'Bãi biển Mỹ Khê',
        description: 'Bờ biển tuyệt đẹp dọc đại lộ Võ Nguyên Giáp.',
        x: 285,
        z: 120,
        nodeId: 'dn_my_khe',
        type: 'my_khe',
        category: 'park'
      },
      {
        id: 'lm_san_bay_dn',
        name: 'Sân bay Quốc tế Đà Nẵng',
        description: 'Cửa ngõ hàng không miền Trung, luôn nhộn nhịp khách du lịch.',
        x: -275,
        z: 155,
        nodeId: 'dn_san_bay',
        type: 'san_bay_dn',
        category: 'station'
      }
    ],
    speedCameraNodes: ['dn_my_khe', 'dn_pham_van_dong', 'dn_san_bay']
  }
};

export function getCityMap(cityId: CityId): CityMapData {
  return CITIES[cityId] || CITIES.hanoi;
}

export function getNodeMap(city: CityMapData): Map<string, RoadNode> {
  const m = new Map<string, RoadNode>();
  for (const n of city.nodes) m.set(n.id, n);
  return m;
}

export function buildAdjacency(city: CityMapData): Map<string, Array<{ to: string; dist: number; segment: RoadSegment }>> {
  const nodes = getNodeMap(city);
  const adj = new Map<string, Array<{ to: string; dist: number; segment: RoadSegment }>>();
  for (const n of city.nodes) adj.set(n.id, []);

  for (const seg of city.segments) {
    const a = nodes.get(seg.from);
    const b = nodes.get(seg.to);
    if (!a || !b) continue;
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    adj.get(seg.from)!.push({ to: seg.to, dist, segment: seg });
    if (!seg.oneWay) {
      adj.get(seg.to)!.push({ to: seg.from, dist, segment: seg });
    }
  }
  return adj;
}

export function findNearestNode(city: CityMapData, x: number, z: number): RoadNode {
  let best = city.nodes[0];
  let bestD = Infinity;
  for (const n of city.nodes) {
    const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function findNearestSegment(
  city: CityMapData,
  x: number,
  z: number,
  heading?: number
): { segment: RoadSegment; dist: number; t: number } {
  const nodes = getNodeMap(city);
  let bestSeg = city.segments[0];
  let bestScore = Infinity;
  let bestDist = Infinity;
  let bestT = 0;

  const fx = heading !== undefined ? -Math.sin(heading) : 0;
  const fz = heading !== undefined ? -Math.cos(heading) : 0;

  for (const seg of city.segments) {
    const a = nodes.get(seg.from);
    const b = nodes.get(seg.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lenSq));
    const px = a.x + t * dx;
    const pz = a.z + t * dz;
    const d = Math.hypot(x - px, z - pz);
    let score = d;
    if (heading !== undefined && d < 9) {
      const segLen = Math.sqrt(lenSq) || 1;
      const align = Math.abs((fx * dx + fz * dz) / segLen);
      score -= align * 3.5;
    }
    if (score < bestScore) {
      bestScore = score;
      bestDist = d;
      bestSeg = seg;
      bestT = t;
    }
  }
  return { segment: bestSeg, dist: bestDist, t: bestT };
}

/** Dijkstra shortest path over the city road graph (respects one-way streets) */
export function findShortestRoute(
  city: CityMapData,
  startNodeId: string,
  endNodeId: string
): { nodeIds: string[]; totalDistM: number; streetNames: string[] } {
  if (startNodeId === endNodeId) {
    return { nodeIds: [startNodeId], totalDistM: 0, streetNames: [] };
  }
  const adj = buildAdjacency(city);
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; street: string }>();
  const unvisited = new Set<string>();

  for (const n of city.nodes) {
    dist.set(n.id, Infinity);
    unvisited.add(n.id);
  }
  dist.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let u: string | null = null;
    let minD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Infinity;
      if (d < minD) {
        minD = d;
        u = id;
      }
    }
    if (!u || minD === Infinity || u === endNodeId) break;
    unvisited.delete(u);

    for (const edge of adj.get(u) || []) {
      if (!unvisited.has(edge.to)) continue;
      const alt = minD + edge.dist;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, { nodeId: u, street: edge.segment.streetName });
      }
    }
  }

  const nodeIds: string[] = [];
  const streetNames: string[] = [];
  let curr: string | undefined = endNodeId;
  while (curr) {
    nodeIds.unshift(curr);
    const p = prev.get(curr);
    if (p) {
      streetNames.unshift(p.street);
      curr = p.nodeId;
    } else {
      break;
    }
  }

  if (nodeIds[0] !== startNodeId) {
    return { nodeIds: [startNodeId, endNodeId], totalDistM: 400, streetNames: ['Đường trung tâm'] };
  }

  return {
    nodeIds,
    totalDistM: dist.get(endNodeId) ?? 400,
    streetNames
  };
}

/**
 * Dynamic real-time route computation from the player's current position & heading.
 * Evaluates candidate upcoming nodes along the current road (respecting one-way streets)
 * so taking any detour or switching roads smoothly reroutes toward destNodeId.
 */
export function findBestRouteFromPosition(
  city: CityMapData,
  playerX: number,
  playerZ: number,
  playerHeading: number,
  destNodeId: string
): { nodeIds: string[]; totalDistM: number; streetNames: string[] } {
  const nodeMap = getNodeMap(city);
  const destNode = nodeMap.get(destNodeId);
  if (!destNode) {
    return { nodeIds: [destNodeId], totalDistM: 0, streetNames: [] };
  }

  const { segment } = findNearestSegment(city, playerX, playerZ, playerHeading);
  const nFrom = nodeMap.get(segment.from);
  const nTo = nodeMap.get(segment.to);
  const nearest = findNearestNode(city, playerX, playerZ);

  const fx = -Math.sin(playerHeading);
  const fz = -Math.cos(playerHeading);

  const candidates: Array<{ nodeId: string; entryCost: number }> = [];
  const seen = new Set<string>();

  const addCandidate = (n: RoadNode | undefined, extraPenalty = 0) => {
    if (!n || seen.has(n.id)) return;
    seen.add(n.id);
    const dx = n.x - playerX;
    const dz = n.z - playerZ;
    const d = Math.hypot(dx, dz);
    let penalty = extraPenalty;
    if (d > 14) {
      const dot = (fx * dx + fz * dz) / d;
      // Slight preference for continuing forward rather than abrupt mid-block U-turn
      if (dot < -0.35) penalty += 26;
    }
    candidates.push({ nodeId: n.id, entryCost: d + penalty });
  };

  if (nTo) addCandidate(nTo, 0);
  if (nFrom) {
    // On one-way street, prefer exiting forward to nTo unless still right at nFrom junction
    const distToFrom = Math.hypot(nFrom.x - playerX, nFrom.z - playerZ);
    if (!segment.oneWay || distToFrom < 14) {
      addCandidate(nFrom, 0);
    }
  }
  addCandidate(nearest, 8);

  let bestResult: { nodeIds: string[]; totalDistM: number; streetNames: string[] } | null = null;
  let bestScore = Infinity;

  for (const cand of candidates) {
    const route = findShortestRoute(city, cand.nodeId, destNodeId);
    const totalScore = cand.entryCost + route.totalDistM;
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestResult = {
        nodeIds: route.nodeIds,
        totalDistM: Math.round(cand.entryCost + route.totalDistM),
        streetNames: route.streetNames
      };
    }
  }

  return bestResult || findShortestRoute(city, nearest.id, destNodeId);
}

export interface TurnNavigationInfo {
  direction: 'straight' | 'left' | 'right' | 'uturn' | 'arrive';
  nextTurnDirection: 'left' | 'right' | 'uturn' | 'arrive' | null;
  distanceToManeuverM: number;
  remainingM: number;
  targetStreet: string;
  instruction: string;
}

export function computeTurnInstruction(
  city: CityMapData,
  routeNodeIds: string[],
  playerX: number,
  playerZ: number,
  playerHeading: number
): TurnNavigationInfo {
  const nodes = getNodeMap(city);
  if (routeNodeIds.length === 0) {
    return {
      direction: 'arrive',
      nextTurnDirection: 'arrive',
      distanceToManeuverM: 0,
      remainingM: 0,
      targetStreet: 'Điểm đến',
      instruction: 'Đã đến điểm đích'
    };
  }

  const getStreetBetween = (idA: string, idB: string): string | null => {
    const seg = city.segments.find(
      (s) => (s.from === idA && s.to === idB) || (s.to === idA && s.from === idB)
    );
    return seg ? seg.streetName : null;
  };

  // Determine the upcoming node index along routeNodeIds (skip node 0 if player has already passed it toward node 1)
  let startIdx = 0;
  if (routeNodeIds.length >= 2) {
    const n0 = nodes.get(routeNodeIds[0]);
    const n1 = nodes.get(routeNodeIds[1]);
    if (n0 && n1) {
      const segDx = n1.x - n0.x;
      const segDz = n1.z - n0.z;
      const segLenSq = segDx * segDx + segDz * segDz || 1;
      const proj = ((playerX - n0.x) * segDx + (playerZ - n0.z) * segDz) / segLenSq;
      if (proj > 0.08) {
        startIdx = 1;
      }
    }
  }

  // Total remaining distance from player -> startIdx -> ... -> end
  let totalM = 0;
  const firstAhead = nodes.get(routeNodeIds[startIdx]);
  if (firstAhead) {
    totalM += Math.hypot(firstAhead.x - playerX, firstAhead.z - playerZ);
  }
  for (let i = startIdx; i < routeNodeIds.length - 1; i++) {
    const a = nodes.get(routeNodeIds[i]);
    const b = nodes.get(routeNodeIds[i + 1]);
    if (a && b) totalM += Math.hypot(b.x - a.x, b.z - a.z);
  }

  const destNode = nodes.get(routeNodeIds[routeNodeIds.length - 1]);
  const destLabel = destNode?.label || 'điểm đến';

  // Close to final destination
  if (totalM < 28) {
    return {
      direction: 'arrive',
      nextTurnDirection: 'arrive',
      distanceToManeuverM: Math.round(totalM),
      remainingM: totalM,
      targetStreet: destLabel,
      instruction: `Sắp tới ${destLabel} (${Math.round(totalM)}m)`
    };
  }

  // Check if player is currently facing away from the immediate path -> U-turn prompt
  const fx = -Math.sin(playerHeading);
  const fz = -Math.cos(playerHeading);
  if (firstAhead) {
    const dx = firstAhead.x - playerX;
    const dz = firstAhead.z - playerZ;
    const d = Math.hypot(dx, dz) || 1;
    const dotFwd = (fx * dx + fz * dz) / d;
    if (dotFwd < -0.4 && d > 14) {
      const streetNow =
        routeNodeIds.length >= 2
          ? getStreetBetween(routeNodeIds[0], routeNodeIds[1]) || destLabel
          : destLabel;
      return {
        direction: 'uturn',
        nextTurnDirection: 'uturn',
        distanceToManeuverM: Math.round(d),
        remainingM: totalM,
        targetStreet: streetNow,
        instruction: `Quay đầu để vào ${streetNow} (${Math.round(totalM)}m)`
      };
    }
  }

  // Walk forward along route nodes to find the FIRST actual turn (left / right / uturn)
  let distToTurn = firstAhead ? Math.hypot(firstAhead.x - playerX, firstAhead.z - playerZ) : 0;
  let foundTurn: { dir: 'left' | 'right' | 'uturn'; distM: number; street: string } | null = null;

  for (let i = startIdx; i < routeNodeIds.length - 1; i++) {
    const currNode = nodes.get(routeNodeIds[i]);
    const nextNode = nodes.get(routeNodeIds[i + 1]);
    if (!currNode || !nextNode) continue;

    // Incoming vector into currNode
    let inX: number;
    let inZ: number;
    if (i === startIdx) {
      inX = currNode.x - playerX;
      inZ = currNode.z - playerZ;
      if (Math.hypot(inX, inZ) < 6 && i > 0) {
        const prevN = nodes.get(routeNodeIds[i - 1]);
        if (prevN) {
          inX = currNode.x - prevN.x;
          inZ = currNode.z - prevN.z;
        }
      }
    } else {
      const prevN = nodes.get(routeNodeIds[i - 1]);
      if (!prevN) continue;
      inX = currNode.x - prevN.x;
      inZ = currNode.z - prevN.z;
    }

    const outX = nextNode.x - currNode.x;
    const outZ = nextNode.z - currNode.z;
    const inLen = Math.hypot(inX, inZ);
    const outLen = Math.hypot(outX, outZ);

    if (inLen > 4 && outLen > 4) {
      const u1x = inX / inLen;
      const u1z = inZ / inLen;
      const u2x = outX / outLen;
      const u2z = outZ / outLen;

      // Cross > 0 => Right turn, Cross < 0 => Left turn
      const cross = u1x * u2z - u1z * u2x;
      const dot = u1x * u2x + u1z * u2z;
      const nextStreet = getStreetBetween(routeNodeIds[i], routeNodeIds[i + 1]) || currNode.label || 'phía trước';

      if (dot < -0.5) {
        foundTurn = { dir: 'uturn', distM: distToTurn, street: nextStreet };
        break;
      } else if (cross > 0.36) {
        foundTurn = { dir: 'right', distM: distToTurn, street: nextStreet };
        break;
      } else if (cross < -0.36) {
        foundTurn = { dir: 'left', distM: distToTurn, street: nextStreet };
        break;
      }
    }

    distToTurn += Math.hypot(nextNode.x - currNode.x, nextNode.z - currNode.z);
  }

  if (foundTurn) {
    const roundedDist = Math.max(5, Math.round(foundTurn.distM));
    const dirText =
      foundTurn.dir === 'left' ? 'rẽ trái' : foundTurn.dir === 'right' ? 'rẽ phải' : 'quay đầu';

    // Within 90m of the turn, highlight the turn arrow directly; farther out, show Straight arrow + preview
    if (roundedDist <= 90) {
      return {
        direction: foundTurn.dir,
        nextTurnDirection: foundTurn.dir,
        distanceToManeuverM: roundedDist,
        remainingM: totalM,
        targetStreet: foundTurn.street,
        instruction: `Còn ${roundedDist}m ${dirText} vào ${foundTurn.street}`
      };
    } else {
      return {
        direction: 'straight',
        nextTurnDirection: foundTurn.dir,
        distanceToManeuverM: roundedDist,
        remainingM: totalM,
        targetStreet: foundTurn.street,
        instruction: `Đi thẳng ${roundedDist}m rồi ${dirText} vào ${foundTurn.street}`
      };
    }
  }

  // Straight all the way to the destination
  const straightDist = Math.max(10, Math.round(totalM));
  const currentStreet =
    routeNodeIds.length >= 2
      ? getStreetBetween(routeNodeIds[startIdx], routeNodeIds[Math.min(startIdx + 1, routeNodeIds.length - 1)]) ||
        destLabel
      : destLabel;

  return {
    direction: 'straight',
    nextTurnDirection: 'arrive',
    distanceToManeuverM: straightDist,
    remainingM: totalM,
    targetStreet: currentStreet,
    instruction: `Đi thẳng ${straightDist}m tới ${destLabel}`
  };
}
