// Mẫu chòm sao (đường nối từ d3-celestial) với tên quốc tế IAU và tên tiếng Việt (phụ).
// Tên tiếng Việt (Hán Việt / thuần Việt) lấy từ Wikipedia tiếng Việt "Danh sách chòm sao" (CC BY-SA 4.0),
// chỉ hiện trong phần chi tiết.
//
// Gói khởi động chỉ chứa hình của 16 mẫu (TEMPLATE_FIGURES, ~7 KB). Đủ 88 chòm sao (~29 KB) được
// tải động bằng loadAllFigures() khi lớp "Chòm sao" cần vẽ.

import templateRaw from './generated/constellation-templates.json';
import names from './constellationNames.json';

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

const NAMES = names as Record<string, { iau: string; hanViet: string; thuanViet: string }>;

/** Tên quốc tế (IAU) theo mã viết tắt 3 chữ: "UMa" → "Ursa Major". */
export function constellationName(abbr: string): string {
  return NAMES[abbr]?.iau ?? abbr;
}

/** Tên tiếng Việt: "Đại Hùng (Gấu Lớn)". */
export function constellationNameVi(abbr: string): string {
  const { viName, alias } = viParts(abbr);
  return alias ? `${viName} (${alias})` : viName;
}

export interface ConstellationTemplate {
  /** Mã IAU 3 chữ */
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

/** Tên tiếng Việt của một chòm: Hán Việt chính, tên thuần Việt khác (nếu có) làm tên gọi khác. */
function viParts(abbr: string): { viName: string; alias: string } {
  const n = NAMES[abbr];
  if (!n) return { viName: '', alias: '' };
  const han = n.hanViet.split(', ');
  const extra = n.thuanViet.split(', ').filter((x) => x && !han.includes(x));
  return { viName: n.hanViet, alias: extra.join(', ') };
}

function tpl(id: string, rest: { color: string; note: string }): ConstellationTemplate {
  return { id, name: constellationName(id), ...viParts(id), ...rest };
}

export const TEMPLATES: ConstellationTemplate[] = [
  tpl('UMa', { color: '#7dd3fc', note: 'Chứa nhóm sao Big Dipper (Bắc Đẩu, cái gáo); hai sao Dubhe và Merak chỉ hướng về Polaris.' }),
  tpl('UMi', { color: '#f0abfc', note: 'Polaris (sao Bắc Cực) ở đuôi, gần như trùng thiên cực Bắc (δ ≈ +89,3°).' }),
  tpl('Cas', { color: '#fda4af', note: 'Hình chữ W, đối diện Big Dipper qua Polaris.' }),
  tpl('Ori', { color: '#a5b4fc', note: 'Nằm trên xích đạo trời: mọc gần chính Đông, lặn gần chính Tây. Có Betelgeuse và Rigel.' }),
  tpl('Cru', { color: '#86efac', note: 'Chòm sao nhỏ nhất, gần thiên cực Nam (δ ≈ −57° … −63°). Có Acrux và Gacrux.' }),
  tpl('Sco', { color: '#fb923c', note: 'Có Antares màu đỏ, nằm ở phía Nam xích đạo trời.' }),
  tpl('Cyg', { color: '#99f6e4', note: 'Có Deneb, nằm trên dải Ngân Hà.' }),
  tpl('Lyr', { color: '#67e8f9', note: 'Có Vega, một trong các sao sáng nhất bầu trời.' }),
  tpl('Aql', { color: '#fde68a', note: 'Có Altair; cùng Vega và Deneb tạo thành Tam giác Mùa hè.' }),
  tpl('Leo', { color: '#fdba74', note: 'Có Regulus, nằm gần hoàng đạo.' }),
  tpl('Gem', { color: '#c4b5fd', note: 'Hai sao sáng Castor và Pollux.' }),
  tpl('CMa', { color: '#93c5fd', note: 'Có Sirius — sao sáng nhất bầu trời đêm.' }),
  tpl('Tau', { color: '#fca5a5', note: 'Có Aldebaran và cụm sao Pleiades (M45) gần đó.' }),
  tpl('Sgr', { color: '#bef264', note: 'Hướng về tâm Ngân Hà.' }),
  tpl('Cen', { color: '#5eead4', note: 'Có Rigil Kentaurus (α Centauri) — hệ sao gần Mặt Trời nhất.' }),
  tpl('Peg', { color: '#d8b4fe', note: 'Hình vuông lớn Great Square of Pegasus, dễ nhận vào mùa thu.' }),
];

/** Dòng mô tả của mẫu: tên IAU trước, tên tiếng Việt sau, rồi ghi chú — "Ursa Major — Đại Hùng (Gấu Lớn). …". */
export function templateDescription(t: ConstellationTemplate): string {
  return `${t.name} — ${t.viName}${t.alias ? ` (${t.alias})` : ''}. ${t.note}`;
}

export function getTemplate(id: string): ConstellationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
