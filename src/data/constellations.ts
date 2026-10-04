// Mẫu chòm sao (đường nối từ d3-celestial) với tên IAU và tên tiếng Việt (phụ).
//
// Gói khởi động chỉ chứa hình của 16 mẫu (TEMPLATE_FIGURES, ~7 KB). Đủ 88 chòm sao (~29 KB) được
// tải động bằng loadAllFigures() khi người dùng bật "Đường nối 88 chòm sao".

import templateRaw from './generated/constellation-templates.json';

export interface ConstellationFigure {
  /** [α (độ), δ (độ), cấp sao, HIP (0 nếu không khớp)] */
  stars: [number, number, number, number][];
  /** Cặp chỉ số sao được nối với nhau */
  segs: [number, number][];
}

export type FigureMap = Record<string, ConstellationFigure>;

/** Hình của các mẫu trong TEMPLATES (nạp sẵn). */
export const TEMPLATE_FIGURES = templateRaw as unknown as FigureMap;

let allFigures: Promise<FigureMap> | null = null;

/** Tải hình của đủ 88 chòm sao (một lần, dùng chung). */
export function loadAllFigures(): Promise<FigureMap> {
  allFigures ??= import('./generated/constellations.json').then((m) => m.default as unknown as FigureMap);
  return allFigures;
}

export interface ConstellationTemplate {
  id: string;
  /** Tên IAU (Latin) — dùng cho danh sách mẫu, nhãn 3D, thẻ chòm và thẻ thông tin (ux-brief §7). */
  name: string;
  /** Tên tiếng Việt — chỉ hiện ở dòng mô tả của mẫu, sau tên IAU. */
  viName: string;
  /** Tên gọi khác bằng tiếng Việt (có thể rỗng). */
  alias: string;
  color: string;
  note: string;
}

export const TEMPLATES: ConstellationTemplate[] = [
  { id: 'UMa', name: 'Ursa Major', viName: 'Đại Hùng', alias: 'Gấu Lớn', color: '#7dd3fc', note: 'Chứa nhóm sao Big Dipper (Bắc Đẩu, hình cái gáo) — một phần cận cực ở miền Bắc Việt Nam.' },
  { id: 'UMi', name: 'Ursa Minor', viName: 'Tiểu Hùng', alias: 'Gấu Nhỏ', color: '#f0abfc', note: 'Sao Polaris ở đuôi, gần như trùng thiên cực Bắc (δ ≈ +89,3°).' },
  { id: 'Cas', name: 'Cassiopeia', viName: 'Thiên Hậu', alias: '', color: '#fda4af', note: 'Hình chữ W, đối diện Big Dipper qua sao Polaris.' },
  { id: 'Ori', name: 'Orion', viName: 'Thợ Săn', alias: 'Lạp Hộ', color: '#fcd34d', note: 'Nằm trên xích đạo trời: mọc gần chính Đông, lặn gần chính Tây.' },
  { id: 'Cru', name: 'Crux', viName: 'Nam Thập Tự', alias: 'Chữ Thập Phương Nam', color: '#86efac', note: 'Chòm sao nhỏ nhất, gần thiên cực Nam (δ ≈ −57° … −63°).' },
  { id: 'Sco', name: 'Scorpius', viName: 'Thần Nông', alias: 'Bọ Cạp', color: '#fb923c', note: 'Có sao Antares màu đỏ, nằm ở phía Nam xích đạo trời.' },
  { id: 'Cyg', name: 'Cygnus', viName: 'Thiên Nga', alias: 'Chữ Thập Phương Bắc', color: '#a5b4fc', note: 'Có sao Deneb, nằm trên dải Ngân Hà.' },
  { id: 'Lyr', name: 'Lyra', viName: 'Thiên Cầm', alias: 'Cây Đàn', color: '#67e8f9', note: 'Có sao Vega, một trong các sao sáng nhất bầu trời.' },
  { id: 'Aql', name: 'Aquila', viName: 'Thiên Ưng', alias: 'Đại Bàng', color: '#fde68a', note: 'Có sao Altair — cặp với Vega trong truyện dân gian về chàng chăn trâu và nàng dệt vải.' },
  { id: 'Leo', name: 'Leo', viName: 'Sư Tử', alias: '', color: '#fdba74', note: 'Có sao Regulus, nằm gần hoàng đạo.' },
  { id: 'Gem', name: 'Gemini', viName: 'Song Tử', alias: 'Anh Em Sinh Đôi', color: '#c4b5fd', note: 'Hai sao sáng Castor và Pollux.' },
  { id: 'CMa', name: 'Canis Major', viName: 'Đại Khuyển', alias: 'Chó Lớn', color: '#93c5fd', note: 'Có sao Sirius — sao sáng nhất bầu trời đêm.' },
  { id: 'Tau', name: 'Taurus', viName: 'Kim Ngưu', alias: 'Con Bò', color: '#fca5a5', note: 'Có sao Aldebaran và cụm sao Pleiades (Thất Nữ) gần đó.' },
  { id: 'Sgr', name: 'Sagittarius', viName: 'Nhân Mã', alias: 'Cung Thủ', color: '#bef264', note: 'Hướng về Galactic Center (tâm Ngân Hà).' },
  { id: 'Cen', name: 'Centaurus', viName: 'Bán Nhân Mã', alias: '', color: '#5eead4', note: 'Có α Centauri — hệ sao gần Mặt Trời nhất.' },
  { id: 'Peg', name: 'Pegasus', viName: 'Phi Mã', alias: 'Ngựa Bay', color: '#d8b4fe', note: 'Hình vuông lớn của Pegasus, dễ nhận vào mùa thu.' },
];

/** Dòng mô tả của mẫu: tên IAU trước, tên tiếng Việt sau, rồi ghi chú — "Ursa Major — Đại Hùng (Gấu Lớn). …". */
export function templateDescription(t: ConstellationTemplate): string {
  return `${t.name} — ${t.viName}${t.alias ? ` (${t.alias})` : ''}. ${t.note}`;
}

export function getTemplate(id: string): ConstellationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
