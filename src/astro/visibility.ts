// Phân loại sao theo vĩ độ người quan sát và tính thời điểm mọc – lặn.

import { acosD, cosD, norm360, sinD, tanD, clamp } from './math';

export type Visibility = 'circumpolar' | 'riseSet' | 'neverRise';

/** Độ cao của thiên cực (Bắc nếu φ ≥ 0, Nam nếu φ < 0) = |φ|. */
export function poleAltitude(lat: number): number {
  return Math.abs(lat);
}

/** Góc nghiêng giữa mặt phẳng xích đạo trời và mặt phẳng chân trời = 90° − |φ|. */
export function equatorInclination(lat: number): number {
  return 90 - Math.abs(lat);
}

/**
 * Giới hạn xích vĩ của các vùng.
 *  - φ ≥ 0: cận cực khi δ > 90° − φ; không bao giờ mọc khi δ < −(90° − φ).
 *  - φ < 0: đối xứng — cận cực khi δ < −(90° − |φ|); không bao giờ mọc khi δ > 90° − |φ|.
 */
export function zoneLimits(lat: number): { circumpolar: [number, number]; neverRise: [number, number] } {
  const c = 90 - Math.abs(lat);
  return lat >= 0
    ? { circumpolar: [c, 90], neverRise: [-90, -c] }
    : { circumpolar: [-90, -c], neverRise: [c, 90] };
}

export function classify(dec: number, lat: number): Visibility {
  const c = 90 - Math.abs(lat);
  if (lat >= 0) {
    if (dec > c) return 'circumpolar';
    if (dec < -c) return 'neverRise';
  } else {
    if (dec < -c) return 'circumpolar';
    if (dec > c) return 'neverRise';
  }
  return 'riseSet';
}

export interface RiseSetInfo {
  visibility: Visibility;
  /** Góc giờ lúc mọc/lặn H₀ (độ): 180 nếu cận cực, 0 nếu không bao giờ mọc. */
  h0: number;
  /** Thời gian ở trên chân trời (giờ thiên văn) = 2H₀ / 15. */
  hoursAbove: number;
  /** LST lúc mọc / qua kinh tuyến trên / lặn (độ). Chỉ có nghĩa với sao mọc-lặn. */
  riseLst: number;
  transitLst: number;
  setLst: number;
  /** Phương vị lúc mọc / lặn (độ). */
  riseAz: number;
  setAz: number;
  /** Độ cao lúc qua kinh tuyến trên / dưới (độ). */
  upperAlt: number;
  lowerAlt: number;
}

/** cos H₀ = −tan φ · tan δ */
export function riseSet(ra: number, dec: number, lat: number): RiseSetInfo {
  const visibility = classify(dec, lat);
  let h0: number;
  if (visibility === 'circumpolar') h0 = 180;
  else if (visibility === 'neverRise') h0 = 0;
  else h0 = acosD(clamp(-tanD(lat) * tanD(dec), -1, 1));

  // cos A_mọc = sin δ / cos φ  (phương vị mọc nằm ở nửa phía Đông)
  const cp = cosD(lat);
  const riseAz = Math.abs(cp) < 1e-9 ? NaN : acosD(clamp(sinD(dec) / cp, -1, 1));

  return {
    visibility,
    h0,
    hoursAbove: (2 * h0) / 15,
    riseLst: norm360(ra - h0),
    transitLst: norm360(ra),
    setLst: norm360(ra + h0),
    riseAz,
    setAz: Number.isNaN(riseAz) ? NaN : norm360(360 - riseAz),
    upperAlt: 90 - Math.abs(lat - dec),
    lowerAlt: Math.abs(lat + dec) - 90,
  };
}
