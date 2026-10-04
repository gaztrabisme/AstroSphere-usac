// Giải nghĩa đối tượng đang chọn (sao người dùng, sao danh mục, Mặt Trời).

import { julianDate, sunPosition } from './astro';
import { getCatalogStar, nameOf } from './data/catalog';
import type { AppState, Selection } from './state';
import { t } from './i18n';

export interface SelectedObject {
  sel: NonNullable<Selection>;
  /** Tên quốc tế (Polaris, Sirius, Sun…) — dùng cho tiêu đề, nhãn, chú thích. */
  name: string;
  /** Tên tiếng Việt (Sao Bắc Cực, Thiên Lang…) — chỉ hiện ở dòng phụ của thẻ thông tin. */
  viName?: string;
  /** Ký hiệu Bayer/Flamsteed (α UMi) nếu khác tên chính. */
  designation?: string;
  ra: number;
  dec: number;
  /** Mô tả loại đối tượng */
  kind: string;
  color: string;
  mag?: number;
}

/** JD lúc 12h UT của ngày chọn cho Mặt Trời. */
export function sunJd(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return julianDate(new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12)));
}

export function sunEquatorial(s: AppState) {
  return sunPosition(sunJd(s.sunDate));
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
    const names = star.hip ? nameOf(star.hip) : undefined;
    return {
      sel,
      name: star.name,
      viName: names?.viName,
      designation: names?.designation && names.designation !== star.name ? names.designation : undefined,
      ra: star.ra,
      dec: star.dec,
      kind,
      color: star.color,
      mag: star.kind === 'constellation' ? star.mag : undefined,
    };
  }
  if (sel.kind === 'catalog') {
    const c = getCatalogStar(sel.index);
    return {
      sel,
      name: c.label,
      viName: c.viName,
      designation: c.designation && c.designation !== c.label ? c.designation : undefined,
      ra: c.ra,
      dec: c.dec,
      kind: t('info.kindCatalog'),
      color: '#e2e8f0',
      mag: c.mag,
    };
  }
  if (!s.toggles.sun) return null;
  const p = sunEquatorial(s);
  return {
    sel,
    name: t('scene.sun'),
    viName: t('info.sunViName'),
    ra: p.ra,
    dec: p.dec,
    kind: t('info.kindSun', { date: s.sunDate.split('-').reverse().join('/') }),
    color: '#ffcc33',
  };
}
