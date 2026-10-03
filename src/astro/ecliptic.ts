// Phần mở rộng: hệ hoàng đạo, Mặt Trời theo ngày, hệ thiên hà.

import { asinD, atan2D, cosD, norm360, sinD } from './math';
import { J2000 } from './time';
import type { Equatorial } from './coords';

/** Độ nghiêng của hoàng đạo ε (J2000). */
export const OBLIQUITY = 23.4393;

/** Hoàng đạo (λ, β) → xích đạo (α, δ): quay quanh trục x một góc ε. */
export function eclipticToEquatorial(lambda: number, beta: number, eps = OBLIQUITY): Equatorial {
  const cb = cosD(beta);
  const x = cb * cosD(lambda);
  const y = cb * sinD(lambda) * cosD(eps) - sinD(beta) * sinD(eps);
  const z = cb * sinD(lambda) * sinD(eps) + sinD(beta) * cosD(eps);
  return { ra: norm360(atan2D(y, x)), dec: asinD(z) };
}

export function equatorialToEcliptic(ra: number, dec: number, eps = OBLIQUITY): { lambda: number; beta: number } {
  const cd = cosD(dec);
  const x = cd * cosD(ra);
  const y = cd * sinD(ra) * cosD(eps) + sinD(dec) * sinD(eps);
  const z = -cd * sinD(ra) * sinD(eps) + sinD(dec) * cosD(eps);
  return { lambda: norm360(atan2D(y, x)), beta: asinD(z) };
}

/**
 * Vị trí biểu kiến gần đúng của Mặt Trời (Astronomical Almanac, sai số ~0,01° trong 1950–2050).
 */
export function sunPosition(jd: number): Equatorial & { lambda: number } {
  const n = jd - J2000;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  const lambda = norm360(L + 1.915 * sinD(g) + 0.02 * sinD(2 * g));
  const eps = 23.439 - 0.0000004 * n;
  return { ...eclipticToEquatorial(lambda, 0, eps), lambda };
}

// Hệ thiên hà (IAU 1958, J2000): cực Bắc thiên hà và kinh độ thiên hà của thiên cực Bắc.
const NGP_RA = 192.85948;
const NGP_DEC = 27.12825;
const L_NCP = 122.93192;

export function galacticToEquatorial(l: number, b: number): Equatorial {
  const sb = sinD(b);
  const cb = cosD(b);
  const dl = L_NCP - l;
  const sd = sb * sinD(NGP_DEC) + cb * cosD(NGP_DEC) * cosD(dl);
  const y = cb * sinD(dl);
  const x = sb * cosD(NGP_DEC) - cb * sinD(NGP_DEC) * cosD(dl);
  return { ra: norm360(NGP_RA + atan2D(y, x)), dec: asinD(sd) };
}

export function equatorialToGalactic(ra: number, dec: number): { l: number; b: number } {
  const sd = sinD(dec);
  const cd = cosD(dec);
  const da = ra - NGP_RA;
  const sb = sd * sinD(NGP_DEC) + cd * cosD(NGP_DEC) * cosD(da);
  const y = cd * sinD(da);
  const x = sd * cosD(NGP_DEC) - cd * sinD(NGP_DEC) * cosD(da);
  return { l: norm360(L_NCP - atan2D(y, x)), b: asinD(sb) };
}
