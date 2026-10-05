// Chòm sao: đường nối (d3-celestial) + tên.
// Tên hiển thị thống nhất theo tên quốc tế của IAU (Ursa Major, Orion…). Tên tiếng Việt (Hán Việt / thuần Việt)
// lấy từ Wikipedia tiếng Việt "Danh sách chòm sao" (CC BY-SA 4.0), chỉ hiện trong phần chi tiết.

import raw from './generated/constellations.json';
import names from './constellationNames.json';

export interface ConstellationFigure {
  /** [α (độ), δ (độ), cấp sao, HIP (0 nếu không khớp)] */
  stars: [number, number, number, number][];
  /** Cặp chỉ số sao được nối với nhau */
  segs: [number, number][];
}

export const ALL_FIGURES = raw as unknown as Record<string, ConstellationFigure>;

const NAMES = names as Record<string, { iau: string; hanViet: string; thuanViet: string }>;

/** Tên quốc tế (IAU) theo mã viết tắt 3 chữ: "UMa" → "Ursa Major". */
export function constellationName(abbr: string): string {
  return NAMES[abbr]?.iau ?? abbr;
}

/** Tên tiếng Việt: "Đại Hùng (Gấu Lớn)". */
export function constellationNameVi(abbr: string): string {
  const n = NAMES[abbr];
  if (!n) return '';
  const han = n.hanViet;
  const extra = n.thuanViet.split(', ').filter((x) => x && !han.split(', ').includes(x));
  return extra.length ? `${han} (${extra.join(', ')})` : han;
}

export interface ConstellationTemplate {
  /** Mã IAU 3 chữ */
  id: string;
  color: string;
  note: string;
}

export const TEMPLATES: ConstellationTemplate[] = [
  { id: 'UMa', color: '#7dd3fc', note: 'Chứa nhóm sao Big Dipper (Bắc Đẩu, cái gáo); hai sao Dubhe và Merak chỉ hướng về Polaris.' },
  { id: 'UMi', color: '#f0abfc', note: 'Polaris (sao Bắc Cực) ở đuôi, gần như trùng thiên cực Bắc (δ ≈ +89,3°).' },
  { id: 'Cas', color: '#fda4af', note: 'Hình chữ W, đối diện Big Dipper qua Polaris.' },
  { id: 'Ori', color: '#fcd34d', note: 'Nằm trên xích đạo trời: mọc gần chính Đông, lặn gần chính Tây. Có Betelgeuse và Rigel.' },
  { id: 'Cru', color: '#86efac', note: 'Chòm sao nhỏ nhất, gần thiên cực Nam (δ ≈ −57° … −63°). Có Acrux và Gacrux.' },
  { id: 'Sco', color: '#fb923c', note: 'Có Antares màu đỏ, nằm ở phía Nam xích đạo trời.' },
  { id: 'Cyg', color: '#a5b4fc', note: 'Có Deneb, nằm trên dải Ngân Hà.' },
  { id: 'Lyr', color: '#67e8f9', note: 'Có Vega, một trong các sao sáng nhất bầu trời.' },
  { id: 'Aql', color: '#fde68a', note: 'Có Altair; cùng Vega và Deneb tạo thành Tam giác Mùa hè.' },
  { id: 'Leo', color: '#fdba74', note: 'Có Regulus, nằm gần hoàng đạo.' },
  { id: 'Gem', color: '#c4b5fd', note: 'Hai sao sáng Castor và Pollux.' },
  { id: 'CMa', color: '#93c5fd', note: 'Có Sirius — sao sáng nhất bầu trời đêm.' },
  { id: 'Tau', color: '#fca5a5', note: 'Có Aldebaran và cụm sao Pleiades (M45) gần đó.' },
  { id: 'Sgr', color: '#bef264', note: 'Hướng về tâm Ngân Hà.' },
  { id: 'Cen', color: '#5eead4', note: 'Có Rigil Kentaurus (α Centauri) — hệ sao gần Mặt Trời nhất.' },
  { id: 'Peg', color: '#d8b4fe', note: 'Hình vuông lớn Great Square of Pegasus, dễ nhận vào mùa thu.' },
];

export function getTemplate(id: string): ConstellationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
