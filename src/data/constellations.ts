// Mẫu chòm sao (đường nối từ d3-celestial) với tên tiếng Việt.

import raw from './generated/constellations.json';

export interface ConstellationFigure {
  /** [α (độ), δ (độ), cấp sao, HIP (0 nếu không khớp)] */
  stars: [number, number, number, number][];
  /** Cặp chỉ số sao được nối với nhau */
  segs: [number, number][];
}

export const ALL_FIGURES = raw as unknown as Record<string, ConstellationFigure>;

export interface ConstellationTemplate {
  id: string;
  name: string;
  alias: string;
  latin: string;
  color: string;
  note: string;
}

export const TEMPLATES: ConstellationTemplate[] = [
  { id: 'UMa', name: 'Đại Hùng', alias: 'Gấu Lớn', latin: 'Ursa Major', color: '#7dd3fc', note: 'Chứa chòm Bắc Đẩu (cái gáo) — cận cực ở miền Bắc Việt Nam một phần.' },
  { id: 'UMi', name: 'Tiểu Hùng', alias: 'Gấu Nhỏ, có sao Bắc Cực', latin: 'Ursa Minor', color: '#f0abfc', note: 'Sao Bắc Cực ở đuôi, gần như trùng thiên cực Bắc (δ ≈ +89,3°).' },
  { id: 'Cas', name: 'Thiên Hậu', alias: 'Cassiopeia', latin: 'Cassiopeia', color: '#fda4af', note: 'Hình chữ W, đối diện Bắc Đẩu qua sao Bắc Cực.' },
  { id: 'Ori', name: 'Thợ Săn', alias: 'Lạp Hộ', latin: 'Orion', color: '#fcd34d', note: 'Nằm trên xích đạo trời: mọc gần chính Đông, lặn gần chính Tây.' },
  { id: 'Cru', name: 'Nam Thập Tự', alias: 'Chữ Thập Phương Nam', latin: 'Crux', color: '#86efac', note: 'Chòm sao nhỏ nhất, gần thiên cực Nam (δ ≈ −57° … −63°).' },
  { id: 'Sco', name: 'Thần Nông', alias: 'Bọ Cạp', latin: 'Scorpius', color: '#fb923c', note: 'Có sao Tâm Tú Nhị (Antares) màu đỏ, nằm ở phía Nam xích đạo trời.' },
  { id: 'Cyg', name: 'Thiên Nga', alias: 'Chữ Thập Phương Bắc', latin: 'Cygnus', color: '#a5b4fc', note: 'Có sao Thiên Tân Tứ (Deneb), nằm trên dải Ngân Hà.' },
  { id: 'Lyr', name: 'Thiên Cầm', alias: 'Cây Đàn', latin: 'Lyra', color: '#67e8f9', note: 'Có sao Chức Nữ (Vega), một trong các sao sáng nhất bầu trời.' },
  { id: 'Aql', name: 'Thiên Ưng', alias: 'Đại Bàng', latin: 'Aquila', color: '#fde68a', note: 'Có sao Ngưu Lang (Altair) — cặp với Chức Nữ trong truyện dân gian.' },
  { id: 'Leo', name: 'Sư Tử', alias: 'Leo', latin: 'Leo', color: '#fdba74', note: 'Có sao Hiên Viên Thập Tứ (Regulus), nằm gần hoàng đạo.' },
  { id: 'Gem', name: 'Song Tử', alias: 'Anh Em Sinh Đôi', latin: 'Gemini', color: '#c4b5fd', note: 'Hai sao sáng Castor và Pollux.' },
  { id: 'CMa', name: 'Đại Khuyển', alias: 'Chó Lớn', latin: 'Canis Major', color: '#93c5fd', note: 'Có sao Thiên Lang (Sirius) — sao sáng nhất bầu trời đêm.' },
  { id: 'Tau', name: 'Kim Ngưu', alias: 'Con Bò', latin: 'Taurus', color: '#fca5a5', note: 'Có sao Tất Tú Ngũ (Aldebaran) và cụm sao Thất Nữ (Pleiades) gần đó.' },
  { id: 'Sgr', name: 'Nhân Mã', alias: 'Cung Thủ', latin: 'Sagittarius', color: '#bef264', note: 'Hướng về tâm Ngân Hà.' },
  { id: 'Cen', name: 'Bán Nhân Mã', alias: 'Centaurus', latin: 'Centaurus', color: '#5eead4', note: 'Có α Centauri — hệ sao gần Mặt Trời nhất.' },
  { id: 'Peg', name: 'Phi Mã', alias: 'Ngựa Bay', latin: 'Pegasus', color: '#d8b4fe', note: 'Hình vuông lớn Pegasus, dễ nhận vào mùa thu.' },
];

export function getTemplate(id: string): ConstellationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
