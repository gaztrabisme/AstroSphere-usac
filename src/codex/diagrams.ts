// Codex › sơ đồ nhỏ (SVG nội tuyến) cho vài mục then chốt. Màu là màu ngữ nghĩa của cảnh 3D (scene/colors.ts):
// cùng một nét trong sơ đồ và trong mô phỏng mang cùng một nghĩa. Chữ giải thích đặt ngay cạnh nét (information-
// design: giải thích gần dấu), chú thích đầy đủ nằm trong <figcaption> và làm tên truy cập của hình.

import { fmtDeg } from '../astro';
import { COLORS } from '../scene/colors';

export interface DiagramLabels {
  observer: string;
  horizon: string;
  equator: string;
  ecliptic: string;
  zenith: string;
  pole: string;
  star: string;
  vernal: string;
  circumpolar: string;
  riseSet: string;
  neverRise: string;
  north: string;
  east: string;
  south: string;
  west: string;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const rad = (d: number) => (d * Math.PI) / 180;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const text = (x: number, y: number, s: string, cls = 'cdx-svg__t', anchor = 'middle', fill = '') =>
  `<text x="${r1(x)}" y="${r1(y)}" class="${cls}" text-anchor="${anchor}"${fill ? ` style="fill:${fill}"` : ''}>${esc(s)}</text>`;

/** Độ cao thiên cực = vĩ độ: chân trời, người quan sát, trục tới thiên cực và cung h_P. */
function latPole(L: DiagramLabels, lat: number): string {
  const phi = Math.min(Math.abs(lat), 89);
  const cx = 150;
  const cy = 130;
  const R = 105;
  const px = cx - R * Math.cos(rad(phi));
  const py = cy - R * Math.sin(rad(phi));
  const ar = 52;
  const ax = cx - ar * Math.cos(rad(phi));
  const ay = cy - ar * Math.sin(rad(phi));
  return `
    <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" class="cdx-svg__dome"/>
    <line x1="${cx - R - 20}" y1="${cy}" x2="${cx + R + 20}" y2="${cy}" stroke="${COLORS.horizon}" stroke-width="2.5"/>
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - R}" stroke="${COLORS.zenith}" stroke-width="1" stroke-dasharray="3 4"/>
    <line x1="${cx}" y1="${cy}" x2="${r1(px)}" y2="${r1(py)}" stroke="${COLORS.axis}" stroke-width="2.5"/>
    <path d="M ${cx - ar} ${cy} A ${ar} ${ar} 0 0 1 ${r1(ax)} ${r1(ay)}" fill="none" stroke="${COLORS.latitude}" stroke-width="3"/>
    <circle cx="${r1(px)}" cy="${r1(py)}" r="5" fill="${COLORS.axis}"/>
    <circle cx="${cx}" cy="${cy}" r="4" class="cdx-svg__me"/>
    ${text(cx - 10, cy + 20, `h = ${fmtDeg(phi)}`, 'cdx-svg__t cdx-svg__t--key', 'end', COLORS.latitude)}
    ${text(px + (phi > 60 ? 10 : 0), py - 10, L.pole, 'cdx-svg__t', phi > 60 ? 'start' : 'middle')}
    ${text(cx, cy - R - 8, L.zenith)}
    ${text(cx - R - 18, cy + 18, L.north, 'cdx-svg__t cdx-svg__t--dir')}
    ${text(cx + R + 18, cy + 18, L.south, 'cdx-svg__t cdx-svg__t--dir')}
    ${text(cx + R - 4, cy - 8, L.horizon, 'cdx-svg__t cdx-svg__t--muted', 'end')}
    ${text(cx + 8, cy + 20, L.observer, 'cdx-svg__t cdx-svg__t--muted', 'start')}`;
}

/** Hệ chân trời: vòm trời, ellipse chân trời (B ở xa, Đ bên phải), cung A từ B qua Đ, cung h lên sao. */
function altaz(L: DiagramLabels): string {
  const cx = 150;
  const cy = 120;
  const rx = 110;
  const ry = 34;
  const A = 125;
  const hAlt = 38;
  const footX = cx + rx * Math.sin(rad(A));
  const footY = cy - ry * Math.cos(rad(A));
  const sx = cx + rx * Math.cos(rad(hAlt)) * Math.sin(rad(A));
  const sy = cy - ry * Math.cos(rad(hAlt)) * Math.cos(rad(A)) - rx * Math.sin(rad(hAlt));
  const qx = footX + 14;
  const qy = (footY + sy) / 2;
  return `
    <path d="M ${cx - rx} ${cy} A ${rx} ${rx} 0 0 1 ${cx + rx} ${cy}" class="cdx-svg__dome"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${COLORS.horizon}" stroke-width="2.5"/>
    <path d="M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${r1(footX)} ${r1(footY)}" fill="none" stroke="${COLORS.azimuth}" stroke-width="3.5"/>
    <line x1="${cx}" y1="${cy}" x2="${r1(footX)}" y2="${r1(footY)}" stroke="${COLORS.azimuth}" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - ry}" stroke="${COLORS.azimuth}" stroke-width="1" stroke-dasharray="3 3"/>
    <path d="M ${r1(footX)} ${r1(footY)} Q ${r1(qx)} ${r1(qy)} ${r1(sx)} ${r1(sy)}" fill="none" stroke="${COLORS.vertical}" stroke-width="3.5"/>
    <circle cx="${r1(sx)}" cy="${r1(sy)}" r="5.5" class="cdx-svg__star"/>
    <circle cx="${cx}" cy="${cy}" r="4" class="cdx-svg__me"/>
    ${text(sx - 10, sy - 6, L.star, 'cdx-svg__t', 'end')}
    ${text(cx + 64, cy - ry - 2, 'A', 'cdx-svg__t cdx-svg__t--key', 'middle', COLORS.azimuth)}
    ${text(qx + 12, qy + 4, 'h', 'cdx-svg__t cdx-svg__t--key', 'start', COLORS.vertical)}
    ${text(cx, cy - ry - 8, L.north, 'cdx-svg__t cdx-svg__t--dir')}
    ${text(cx + rx + 12, cy + 5, L.east, 'cdx-svg__t cdx-svg__t--dir', 'start')}
    ${text(cx, cy + ry + 18, L.south, 'cdx-svg__t cdx-svg__t--dir')}
    ${text(cx - rx - 12, cy + 5, L.west, 'cdx-svg__t cdx-svg__t--dir', 'end')}
    ${text(cx - 6, cy + 16, L.observer, 'cdx-svg__t cdx-svg__t--muted', 'end')}`;
}

/** Hệ xích đạo: thiên cầu, trục, xích đạo trời, điểm γ, cung α dọc xích đạo, cung δ lên sao. */
function radec(L: DiagramLabels): string {
  const cx = 150;
  const cy = 92;
  const R = 70;
  const ry = 20;
  const eq = (tDeg: number, dec = 0): [number, number] => [
    cx + R * Math.cos(rad(dec)) * Math.sin(rad(tDeg)),
    cy + ry * Math.cos(rad(dec)) * Math.cos(rad(tDeg)) - R * Math.sin(rad(dec)),
  ];
  const [gx, gy] = eq(-55);
  const [fx, fy] = eq(35);
  const [sx, sy] = eq(35, 42);
  return `
    <circle cx="${cx}" cy="${cy}" r="${R}" class="cdx-svg__dome"/>
    <line x1="${cx}" y1="${cy - R - 14}" x2="${cx}" y2="${cy + R + 14}" stroke="${COLORS.axis}" stroke-width="2" stroke-dasharray="5 4"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${ry}" fill="none" stroke="${COLORS.equator}" stroke-width="2.5"/>
    <path d="M ${r1(gx)} ${r1(gy)} A ${R} ${ry} 0 0 0 ${r1(fx)} ${r1(fy)}" fill="none" stroke="${COLORS.equator}" stroke-width="5" stroke-opacity="0.55"/>
    <path d="M ${r1(fx)} ${r1(fy)} Q ${r1(fx + 16)} ${r1((fy + sy) / 2)} ${r1(sx)} ${r1(sy)}" fill="none" stroke="${COLORS.vertical}" stroke-width="3.5"/>
    <circle cx="${r1(gx)}" cy="${r1(gy)}" r="4" fill="${COLORS.equator}"/>
    <circle cx="${r1(sx)}" cy="${r1(sy)}" r="5.5" class="cdx-svg__star"/>
    <circle cx="${cx}" cy="${cy - R}" r="4" fill="${COLORS.axis}"/>
    ${text(gx - 8, gy + 16, L.vernal, 'cdx-svg__t cdx-svg__t--key', 'end')}
    ${text((gx + fx) / 2, cy + ry + 18, 'α', 'cdx-svg__t cdx-svg__t--key')}
    ${text(fx - 2, (fy + sy) / 2 + 6, 'δ', 'cdx-svg__t cdx-svg__t--key', 'end', COLORS.vertical)}
    ${text(sx + 10, sy - 6, L.star, 'cdx-svg__t', 'start')}
    ${text(cx + 8, cy - R - 6, L.pole, 'cdx-svg__t', 'start')}
    ${text(cx - R - 6, cy - 4, L.equator, 'cdx-svg__t cdx-svg__t--muted', 'end')}`;
}

/** Ba vùng mọc – lặn trên trục xích vĩ, tại vĩ độ đang chọn. */
function zones(L: DiagramLabels, lat: number): string {
  const top = 18;
  const bottom = 178;
  const x = 70;
  const w = 34;
  const y = (dec: number) => top + ((90 - dec) / 180) * (bottom - top);
  const lim = 90 - Math.abs(lat);
  // Bắc bán cầu: cận cực ở phía δ dương; Nam bán cầu đối xứng.
  const north = lat >= 0;
  const bands = [
    {
      from: 90,
      to: lim,
      color: north ? COLORS.circumpolar : COLORS.neverRise,
      label: north ? L.circumpolar : L.neverRise,
    },
    { from: lim, to: -lim, color: COLORS.riseSet, label: L.riseSet },
    {
      from: -lim,
      to: -90,
      color: north ? COLORS.neverRise : COLORS.circumpolar,
      label: north ? L.neverRise : L.circumpolar,
    },
  ];
  let out = '';
  for (const b of bands) {
    const y0 = y(b.from);
    const y1 = y(b.to);
    if (y1 - y0 < 0.5) continue;
    out += `<rect x="${x}" y="${r1(y0)}" width="${w}" height="${r1(y1 - y0)}" fill="${b.color}" fill-opacity="0.75"/>`;
    if (y1 - y0 >= 12) out += text(x + w + 12, (y0 + y1) / 2 + 4, b.label, 'cdx-svg__t', 'start');
  }
  for (const d of [90, 0, -90])
    out += text(x - 8, y(d) + 4, `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}°`, 'cdx-svg__t cdx-svg__t--muted', 'end');
  if (lim > 0 && lim < 90) {
    for (const d of [lim, -lim]) {
      out += `<line x1="${x - 4}" y1="${r1(y(d))}" x2="${x + w + 4}" y2="${r1(y(d))}" class="cdx-svg__rule"/>`;
    }
  }
  out += text(x + w / 2, 12, 'δ', 'cdx-svg__t cdx-svg__t--key');
  out += text(290, 14, `φ = ${fmtDeg(Math.abs(lat))} ${north ? L.north : L.south}`, 'cdx-svg__t cdx-svg__t--muted', 'end');
  return out;
}

/** Hoàng đạo trên bản đồ phẳng (α ngang, δ dọc): sóng nghiêng 23,44° quanh xích đạo trời. */
function ecliptic(L: DiagramLabels): string {
  const x0 = 30;
  const x1 = 290;
  const y0 = 100;
  const k = 2.6; // px mỗi độ xích vĩ
  const eps = rad(23.44);
  let d = '';
  for (let a = 0; a <= 360; a += 10) {
    const dec = (Math.atan(Math.tan(eps) * Math.sin(rad(a))) * 180) / Math.PI;
    d += `${a === 0 ? 'M' : 'L'} ${r1(x0 + ((x1 - x0) * a) / 360)} ${r1(y0 - dec * k)} `;
  }
  const xPeak = x0 + (x1 - x0) / 4;
  return `
    <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${COLORS.equator}" stroke-width="2.5"/>
    <path d="${d}" fill="none" stroke="${COLORS.ecliptic}" stroke-width="3" stroke-dasharray="8 4"/>
    <line x1="${r1(xPeak)}" y1="${y0}" x2="${r1(xPeak)}" y2="${r1(y0 - 23.44 * k)}" class="cdx-svg__rule"/>
    <circle cx="${x0}" cy="${y0}" r="4.5" fill="${COLORS.equator}"/>
    ${text(xPeak, y0 + 22, 'ε = 23,44°', 'cdx-svg__t cdx-svg__t--key', 'middle', COLORS.ecliptic)}
    ${text(x0 + 2, y0 + 20, L.vernal, 'cdx-svg__t cdx-svg__t--key', 'start')}
    ${text(x1, y0 - 8, L.equator, 'cdx-svg__t cdx-svg__t--muted', 'end')}
    ${text(x0 + ((x1 - x0) * 3) / 4, y0 + 23.44 * k + 20, L.ecliptic, 'cdx-svg__t cdx-svg__t--muted')}
    ${text(x0, 186, '0h', 'cdx-svg__t cdx-svg__t--muted')}
    ${text((x0 + x1) / 2, 186, 'α = 12h', 'cdx-svg__t cdx-svg__t--muted')}
    ${text(x1, 186, '24h', 'cdx-svg__t cdx-svg__t--muted')}`;
}

/** Chiều cao khung (viewBox 300 × h) của từng sơ đồ: vừa khít nội dung, không chừa khoảng trống thừa. */
const HEIGHT: Readonly<Record<string, number>> = {
  latPole: 160,
  altaz: 180,
  radec: 185,
  ecliptic: 195,
};

const DIAGRAMS: Readonly<Record<string, (L: DiagramLabels, lat: number) => string>> = {
  latPole,
  altaz,
  radec,
  circumpolar: zones,
  riseSetZone: zones,
  neverRise: zones,
  ecliptic,
};

export const hasDiagram = (id: string): boolean => id in DIAGRAMS;

/** Chuỗi SVG của sơ đồ cho mục `id` (null nếu mục không có sơ đồ). */
export function diagramSvg(id: string, L: DiagramLabels, lat: number, caption: string): string | null {
  const f = DIAGRAMS[id];
  if (!f) return null;
  return `<svg class="cdx-svg" viewBox="0 0 300 ${HEIGHT[id] ?? 190}" role="img" aria-label="${esc(caption).replace(/"/g, '&quot;')}">${f(L, lat)}</svg>`;
}
