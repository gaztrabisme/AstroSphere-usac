// Giải nghĩa đối tượng đang chọn (sao người dùng, sao danh mục, thiên thể sâu, Mặt Trời).

import { fmtNum, julianDate, sunPosition } from './astro';
import { getCatalogStar, starConstellation, starDesignations, starNameVi } from './data/catalog';
import { constellationName, constellationNameVi } from './data/constellations';
import { DSOS, dsoDesignation, dsoGroup } from './data/deepSky';
import type { AppState, Selection } from './state';
import { t } from './i18n';

export interface SelectedObject {
  sel: NonNullable<Selection>;
  name: string;
  ra: number;
  dec: number;
  /** Mô tả loại đối tượng */
  kind: string;
  color: string;
  mag?: number;
  /** Các dòng thông tin bổ sung: định danh chuẩn, khoảng cách, kích thước… */
  details?: [string, string][];
}

export const DSO_COLORS = { galaxy: '#f9a8d4', nebula: '#5eead4', cluster: '#fde68a', other: '#cbd5e1' } as const;

/** JD lúc 12h UT của ngày chọn cho Mặt Trời. */
export function sunJd(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return julianDate(new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12)));
}

export function sunEquatorial(s: AppState) {
  return sunPosition(sunJd(s.sunDate));
}

/** Các dòng chi tiết của một sao: định danh, tên tiếng Việt, chòm sao (tên quốc tế — tên tiếng Việt). */
function starDetails(hip: number | undefined, figureAbbr?: string): [string, string][] {
  const rows: [string, string][] = [];
  if (hip) {
    rows.push([t('info.designation'), starDesignations(hip)]);
    const vi = starNameVi(hip);
    if (vi) rows.push([t('info.nameVi'), vi]);
  }
  const abbr = figureAbbr || (hip ? starConstellation(hip) : '');
  const vi = abbr ? constellationNameVi(abbr) : '';
  if (vi) {
    rows.push([t('info.constellation'), `${constellationName(abbr)} — ${vi}`]);
  }
  return rows;
}

/** Khoảng cách theo năm ánh sáng, cách viết Việt Nam: "1 344 năm ánh sáng", "2,5 triệu năm ánh sáng". */
export function fmtLightYears(ly: number): string {
  if (ly >= 1e6) return t('info.lyMillion', { v: fmtNum(ly / 1e6, ly >= 1e7 ? 0 : 1) });
  return t('info.ly', { v: Math.round(ly).toLocaleString('vi-VN') });
}

function fmtSize(arcmin: number): string {
  return arcmin >= 60 ? `${fmtNum(arcmin / 60, 1)}°` : `${fmtNum(arcmin, arcmin < 10 ? 1 : 0)}′`;
}

export function resolveSelection(s: AppState, sel: Selection = s.selected): SelectedObject | null {
  if (!sel) return null;
  if (sel.kind === 'user') {
    const star = s.stars.find((x) => x.id === sel.id);
    if (!star) return null;
    const fig = star.figureId ? s.figures.find((f) => f.id === star.figureId) : undefined;
    const kind = fig
      ? t('info.kindConstellation', { name: fig.name })
      : star.kind === 'random'
        ? t('info.kindRandom')
        : t('info.kindManual');
    const details = starDetails(star.hip, fig?.templateId);
    return { sel, name: star.name, ra: star.ra, dec: star.dec, kind, color: star.color, mag: star.kind === 'constellation' ? star.mag : undefined, details };
  }
  if (sel.kind === 'catalog') {
    const c = getCatalogStar(sel.index);
    return { sel, name: c.label, ra: c.ra, dec: c.dec, kind: t('info.kindCatalog'), color: '#e2e8f0', mag: c.mag, details: starDetails(c.hip) };
  }
  if (sel.kind === 'dso') {
    if (!s.toggles.deepSky) return null;
    const o = DSOS[sel.index];
    if (!o) return null;
    const details: [string, string][] = [[t('info.designation'), dsoDesignation(o)]];
    if (o.nameVi) details.push([t('info.nameVi'), o.nameVi]);
    if (o.sizeArcmin) details.push([t('info.apparentSize'), fmtSize(o.sizeArcmin)]);
    if (o.distanceLy) details.push([t('info.distance'), `≈ ${fmtLightYears(o.distanceLy)}`]);
    // Chỉ là ước tính thô: làm tròn 2 chữ số có nghĩa để tránh độ chính xác giả.
    if (o.diameterLy) details.push([t('info.diameter'), `≈ ${fmtLightYears(Number(o.diameterLy.toPrecision(2)))}`]);
    const name = o.nameEn ? `${o.id} — ${o.nameEn}` : o.id;
    return { sel, name, ra: o.ra, dec: o.dec, kind: o.typeVi, color: DSO_COLORS[dsoGroup(o.type)], mag: o.mag, details };
  }
  if (!s.toggles.sun) return null;
  const p = sunEquatorial(s);
  return { sel, name: t('scene.sun'), ra: p.ra, dec: p.dec, kind: t('info.kindSun', { date: s.sunDate.split('-').reverse().join('/') }), color: '#ffcc33' };
}

