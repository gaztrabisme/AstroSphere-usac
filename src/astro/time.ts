// Thời gian thiên văn (sidereal time).

import { norm180, norm360 } from './math';

/** Độ dài ngày thiên văn trung bình: 23h 56m 04,0905s. */
export const SIDEREAL_DAY_SECONDS = 86164.0905;
/** Độ dài ngày Mặt Trời trung bình. */
export const SOLAR_DAY_SECONDS = 86400;
/** Tốc độ quay biểu kiến của bầu trời (độ / giây thời gian thường). */
export const SIDEREAL_RATE_DEG_PER_S = 360 / SIDEREAL_DAY_SECONDS;
/** 1 giờ thiên văn ứng với 15° góc giờ. */
export const DEG_PER_SIDEREAL_HOUR = 15;

export const J2000 = 2451545.0;

/** Ngày Julius (JD) của một thời điểm (UTC). */
export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Giờ thiên văn trung bình Greenwich (GMST) theo độ, công thức IAU 1982 (Meeus, 12.4).
 * Sai số < 0,1 giây thời gian trong khoảng 1900–2100.
 */
export function gmstDeg(jd: number): number {
  const d = jd - J2000;
  const t = d / 36525;
  return norm360(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000);
}

/** Thời gian thiên văn địa phương: LST = GST + λ (λ dương về phía Đông). */
export function localSiderealDeg(gstDeg: number, lonDeg: number): number {
  return norm360(gstDeg + lonDeg);
}

/** Góc giờ H = LST − α, chuẩn hóa về [−180°, 180°). H dương: sao đã qua kinh tuyến (về phía Tây). */
export function hourAngleDeg(lstDeg: number, raDeg: number): number {
  return norm180(lstDeg - raDeg);
}

/** Đổi độ sang giờ (1h = 15°). */
export const degToHours = (deg: number) => deg / 15;
export const hoursToDeg = (h: number) => h * 15;
