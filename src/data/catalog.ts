// Danh mục sao sáng (≈1300 sao, cấp ≤ 4,8) trích từ d3-celestial / HYG.

import raw from './generated/stars.json';

export interface CatalogData {
  magLimit: number;
  ra: number[];
  dec: number[];
  mag: number[];
  bv: number[];
  hip: number[];
  names: Record<string, [string, string]>;
}

const data = raw as unknown as CatalogData;

/** Tên tiếng Việt của một số sao nổi tiếng (theo tên quốc tế) — chỉ hiện trong phần chi tiết của thẻ thông tin. */
export const VI_STAR_NAMES: Record<string, string> = {
  Sirius: 'Thiên Lang',
  Canopus: 'Lão Nhân',
  Arcturus: 'Đại Giác',
  Vega: 'Chức Nữ',
  Capella: 'Ngũ Xa Nhị',
  Rigel: 'Sâm Tú Thất',
  Procyon: 'Nam Hà Tam',
  Achernar: 'Thủy Ủy Nhất',
  Betelgeuse: 'Sâm Tú Tứ',
  Altair: 'Ngưu Lang',
  Aldebaran: 'Tất Tú Ngũ',
  Antares: 'Tâm Tú Nhị',
  Spica: 'Giác Tú Nhất',
  Pollux: 'Bắc Hà Tam',
  Castor: 'Bắc Hà Nhị',
  Fomalhaut: 'Bắc Lạc Sư Môn',
  Deneb: 'Thiên Tân Tứ',
  Regulus: 'Hiên Viên Thập Tứ',
  Polaris: 'Sao Bắc Cực',
};

export interface CatalogStar {
  index: number;
  ra: number;
  dec: number;
  mag: number;
  bv: number;
  hip: number;
  /** Tên hiển thị theo tên quốc tế (IAU) kèm ký hiệu Bayer: "Sirius (α CMa)". */
  label: string;
  /** Tên riêng quốc tế dùng làm nhãn trên khung nhìn (rỗng nếu sao không có tên riêng). */
  shortName: string;
}

export const catalogCount = data.ra.length;
export const catalogMagLimit = data.magLimit;

function nameOf(hip: number): { label: string; short: string } {
  const n = data.names[String(hip)];
  if (!n) return { label: `HIP ${hip}`, short: '' };
  const [proper, desig] = n;
  if (proper) return { label: desig ? `${proper} (${desig})` : proper, short: proper };
  return { label: desig || `HIP ${hip}`, short: '' };
}

export function getCatalogStar(index: number): CatalogStar {
  const hip = data.hip[index];
  const { label, short } = nameOf(hip);
  return {
    index,
    ra: data.ra[index],
    dec: data.dec[index],
    mag: data.mag[index],
    bv: data.bv[index],
    hip,
    label,
    shortName: short,
  };
}

/** Định danh chuẩn của sao theo HIP: "Sirius · α CMa · HIP 32349" (tên riêng theo IAU, Bayer/Flamsteed, Hipparcos). */
export function starDesignations(hip: number): string {
  const n = data.names[String(hip)];
  return [n?.[0], n?.[1], `HIP ${hip}`].filter(Boolean).join(' · ');
}

/** Tên tiếng Việt của sao (nếu có) theo HIP. */
export function starNameVi(hip: number): string {
  const proper = data.names[String(hip)]?.[0];
  return (proper && VI_STAR_NAMES[proper]) || '';
}

/** Mã chòm sao IAU của sao, lấy từ ký hiệu Bayer/Flamsteed ("α CMa" → "CMa"). */
export function starConstellation(hip: number): string {
  const desig = data.names[String(hip)]?.[1] ?? '';
  return desig.split(' ').pop() ?? '';
}

export function catalogArrays() {
  return data;
}

const byHip = new Map<number, number>();
data.hip.forEach((h, i) => byHip.set(h, i));

export function catalogIndexByHip(hip: number): number | undefined {
  return byHip.get(hip);
}

export function findCatalogByName(proper: string): CatalogStar | undefined {
  for (const [hip, [name]] of Object.entries(data.names)) {
    if (name === proper) {
      const i = byHip.get(Number(hip));
      if (i !== undefined) return getCatalogStar(i);
    }
  }
  return undefined;
}

/** Màu gần đúng của sao theo chỉ số màu B−V. */
const BV_STOPS: [number, [number, number, number]][] = [
  [-0.4, [155, 178, 255]],
  [0.0, [202, 216, 255]],
  [0.4, [248, 247, 255]],
  [0.8, [255, 244, 232]],
  [1.2, [255, 214, 165]],
  [1.6, [255, 187, 120]],
  [2.0, [255, 160, 90]],
];

export function bvToRgb(bv: number): [number, number, number] {
  if (bv <= BV_STOPS[0][0]) return BV_STOPS[0][1].map((c) => c / 255) as [number, number, number];
  for (let i = 1; i < BV_STOPS.length; i++) {
    const [b1, c1] = BV_STOPS[i];
    if (bv <= b1) {
      const [b0, c0] = BV_STOPS[i - 1];
      const t = (bv - b0) / (b1 - b0);
      return [0, 1, 2].map((k) => (c0[k] + (c1[k] - c0[k]) * t) / 255) as [number, number, number];
    }
  }
  return BV_STOPS[BV_STOPS.length - 1][1].map((c) => c / 255) as [number, number, number];
}
