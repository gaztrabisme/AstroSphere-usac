// Các vị trí chọn nhanh.

export interface Place {
  id: string;
  name: string;
  lat: number;
  /** Bỏ trống: giữ nguyên kinh độ hiện tại (dùng cho các trường hợp biên). */
  lon?: number;
}

export const VN_PLACES: Place[] = [
  { id: 'hanoi', name: 'Hà Nội', lat: 21.03, lon: 105.85 },
  { id: 'hue', name: 'Huế', lat: 16.46, lon: 107.59 },
  { id: 'danang', name: 'Đà Nẵng', lat: 16.05, lon: 108.2 },
  { id: 'hcm', name: 'TP.HCM', lat: 10.82, lon: 106.63 },
  { id: 'camau', name: 'Cà Mau', lat: 9.18, lon: 105.15 },
  { id: 'truongsa', name: 'Trường Sa', lat: 8.64, lon: 111.92 },
  { id: 'hoangsa', name: 'Hoàng Sa', lat: 16.53, lon: 111.61 },
];

export const SPECIAL_PLACES: Place[] = [
  { id: 'equator', name: 'Xích đạo', lat: 0 },
  { id: 'northpole', name: 'Bắc Cực', lat: 90 },
  { id: 'southpole', name: 'Nam Cực', lat: -90 },
];

export const DEFAULT_PLACE = VN_PLACES[0];
