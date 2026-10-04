// Thẻ thông tin đối tượng đang chọn và thanh số liệu trực tiếp (φ, λ, LST, tọa độ ở cả hai hệ).

import {
  equatorialToHorizontal,
  equatorInclination,
  fmtDeg,
  fmtDegSigned,
  fmtDMS,
  fmtDuration,
  fmtHMS,
  fmtLat,
  fmtLon,
  fmtNum,
  norm360,
  poleAltitude,
  riseSet,
} from '../astro';
import { t } from '../i18n';
import { resolveSelection, sunEquatorial } from '../selection';
import { lstOf, type Actions, type AppState, type Store } from '../state';
import { h, setHidden, setText } from './dom';
import { bindEmphasis } from './emphasis';

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Tên hướng (8 hướng) cho phương vị; chuỗi rỗng nếu phương vị không xác định (vd. ở hai cực). */
export function compassName(az: number): string {
  if (!Number.isFinite(az)) return '';
  return t(`compass.${DIRS[Math.round(norm360(az) / 45) % 8]}`);
}

/** "A = 63,4° (ĐB)", hoặc "A = —" khi phương vị không xác định (|φ| = 90°). */
export function azimuthText(az: number): string {
  return Number.isFinite(az) ? `A = ${fmtDeg(az, 1)} (${compassName(az)})` : 'A = —';
}

interface Row {
  el: HTMLElement;
  v: HTMLSpanElement;
  x: HTMLSpanElement;
}

/** Các dòng của thẻ có thêm một câu nghĩa ngắn `info.<key>Note` ngay dưới giá trị. */
export const INFO_NOTE_KEYS = ['ra', 'dec', 'ha', 'az', 'alt'] as const;

function row(key: string, label: string, title?: string, note?: string): Row {
  const v = h('span', { class: 'kv__v' });
  const x = h('span', { class: 'kv__x' });
  const n = note ? h('span', { class: 'kv__note', text: note }) : null;
  // data-emphasis: khóa "tô sáng liên kết" (ui/emphasis.ts nối các khóa có hình tương ứng).
  return { el: h('div', { class: 'kv', title, 'data-emphasis': key }, h('dt', { text: label }), h('dd', null, v, x, n)), v, x };
}

function setRow(r: Row, value: string, extra = ''): void {
  setText(r.v, value);
  setText(r.x, extra);
}

export function infoCard(store: Store, actions: Actions) {
  const title = h('h3', { class: 'infocard__title', text: t('info.emptyTitle') });
  const dot = h('span', { class: 'infocard__dot', 'aria-hidden': 'true' });
  // Dòng phụ: tên tiếng Việt (nếu có) ngay dưới tên quốc tế (ux-brief §7).
  const viName = h('p', { class: 'infocard__vi', lang: 'vi', hidden: true });
  const kind = h('p', { class: 'infocard__kind' });
  const collapseBtn = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-expanded': 'true',
    'aria-label': t('info.collapse'),
    title: t('info.collapse'),
    text: '–',
    onclick: () => {
      const collapsed = el.classList.toggle('is-collapsed');
      collapseBtn.setAttribute('aria-expanded', String(!collapsed));
      collapseBtn.textContent = collapsed ? '+' : '–';
      const label = t(collapsed ? 'info.expand' : 'info.collapse');
      collapseBtn.setAttribute('aria-label', label);
      collapseBtn.title = label;
    },
  });

  // Cấu trúc thẻ dựng một lần; mỗi lần cập nhật chỉ thay chữ (rẻ khi đang chạy hoạt ảnh).
  const note = (k: (typeof INFO_NOTE_KEYS)[number]) => t(`info.${k}Note`);
  const r = {
    ra: row('ra', t('info.ra'), undefined, note('ra')),
    dec: row('dec', t('info.dec'), undefined, note('dec')),
    ha: row('ha', t('info.ha'), t('info.haTip'), note('ha')),
    az: row('az', t('info.az'), undefined, note('az')),
    alt: row('alt', t('info.alt'), undefined, note('alt')),
    rise: row('rise', t('info.rise')),
    transit: row('transit', t('info.transit')),
    set: row('set', t('info.set')),
    above: row('above', t('info.hoursAbove'), t('info.hoursAboveTip')),
    lowest: row('lowest', t('info.lowest')),
    highest: row('highest', t('info.highest')),
  };
  const status = h('span', { class: 'status' });
  const statusRow = h('div', { class: 'kv', 'data-emphasis': 'status' }, h('dt', { text: t('info.status') }), h('dd', null, status));
  const body = h(
    'div',
    { class: 'infocard__body' },
    h('h4', { text: t('info.equatorial') }),
    h('dl', null, r.ra.el, r.dec.el, r.ha.el),
    h('h4', { text: t('info.horizontal') }),
    h('dl', null, r.az.el, r.alt.el),
    h('h4', { text: t('info.riseSet') }),
    h(
      'dl',
      null,
      statusRow,
      r.rise.el,
      r.transit.el,
      r.set.el,
      r.above.el,
      r.lowest.el,
      r.highest.el,
    ),
  );

  for (const row of [r.ha.el, r.az.el, r.alt.el, statusRow]) bindEmphasis(row, store, actions);

  // Trạng thái trống: nói rõ vì sao thẻ trống và việc nên làm tiếp (thay cho việc ẩn thẻ).
  const empty = h('p', { class: 'infocard__empty', text: t('info.empty') });
  const el = h(
    'aside',
    { class: 'infocard is-empty', 'aria-label': t('info.aria') },
    h(
      'header',
      { class: 'infocard__head' },
      dot,
      title,
      collapseBtn,
      h('button', { type: 'button', class: 'icon-btn infocard__close', 'aria-label': t('info.close'), title: t('info.close'), text: '×', onclick: () => actions.select(null) }),
    ),
    viName,
    kind,
    empty,
    body,
  );

  // Kéo thẻ bằng thanh tiêu đề để không che phần đang quan sát (chỉ trên màn hình rộng).
  const head = el.querySelector('.infocard__head') as HTMLElement;
  head.addEventListener('pointerenter', () => {
    head.title = getComputedStyle(el).position === 'absolute' ? t('info.dragTip') : '';
  });
  let drag: { dx: number; dy: number } | null = null;
  head.addEventListener('pointerdown', (e) => {
    // Chỉ kéo được khi thẻ nổi trên khung nhìn (không kéo khi là cột cố định hoặc trên điện thoại).
    if ((e.target as HTMLElement).closest('button') || window.matchMedia?.('(max-width: 900px)').matches) return;
    if (getComputedStyle(el).position !== 'absolute') return;
    const r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    head.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag || !el.parentElement) return;
    const box = el.parentElement.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - box.left - drag.dx, 0), box.width - el.offsetWidth);
    const y = Math.min(Math.max(e.clientY - box.top - drag.dy, 0), box.height - 40);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.right = 'auto';
  });
  const endDrag = () => (drag = null);
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  // Trên màn hình hẹp, thẻ bắt đầu ở dạng thu gọn để không che khung nhìn.
  if (window.matchMedia?.('(max-width: 900px)').matches) collapseBtn.click();

  let staticKey = '';
  let wasEmpty: boolean | null = null;
  const update = () => {
    const s = store.state;
    const obj = resolveSelection(s);
    const isEmpty = !obj;
    if (isEmpty !== wasEmpty) {
      wasEmpty = isEmpty;
      el.classList.toggle('is-empty', isEmpty);
      if (isEmpty) {
        staticKey = '';
        setText(title, t('info.emptyTitle'));
      }
    }
    if (!obj) return;
    const lst = lstOf(s);
    const { alt, az, ha } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lst);

    // Phần phụ thuộc vào đối tượng và vĩ độ (không đổi khi bầu trời quay)
    const key = `${obj.name}|${obj.viName ?? ''}|${obj.kind}|${obj.ra}|${obj.dec}|${s.lat}`;
    if (key !== staticKey) {
      staticKey = key;
      const rs = riseSet(obj.ra, obj.dec, s.lat);
      setText(title, obj.name);
      setText(viName, obj.viName ?? '');
      setHidden(viName, !obj.viName);
      dot.style.background = obj.color;
      const kindParts = [obj.designation, obj.kind, obj.mag !== undefined ? t('info.mag', { m: fmtNum(obj.mag, 2) }) : undefined];
      setText(kind, kindParts.filter(Boolean).join(' · '));
      setRow(r.ra, fmtHMS(obj.ra), `(${fmtDeg(obj.ra)})`);
      setRow(r.dec, fmtDMS(obj.dec), `(${fmtDegSigned(obj.dec)})`);
      status.className = `status status--${rs.visibility}`;
      setText(status, t(`visibility.${rs.visibility}`));
      const rsVis = rs.visibility === 'riseSet';
      r.rise.el.hidden = !rsVis;
      r.set.el.hidden = !rsVis;
      r.above.el.hidden = !rsVis;
      r.transit.el.hidden = rs.visibility === 'neverRise';
      r.lowest.el.hidden = rs.visibility !== 'circumpolar';
      r.highest.el.hidden = rs.visibility !== 'neverRise';
      setRow(r.rise, `LST ${fmtHMS(rs.riseLst, { seconds: false })}`, azimuthText(rs.riseAz));
      setRow(r.transit, `LST ${fmtHMS(rs.transitLst, { seconds: false })}`, `h = ${fmtDegSigned(rs.upperAlt, 1)}`);
      setRow(r.set, `LST ${fmtHMS(rs.setLst, { seconds: false })}`, azimuthText(rs.setAz));
      setRow(r.above, fmtDuration(rs.hoursAbove), t('info.siderealHours'));
      setRow(r.lowest, `h = ${fmtDegSigned(rs.lowerAlt, 1)}`, t('info.lowestNote'));
      setRow(r.highest, `h = ${fmtDegSigned(rs.upperAlt, 1)}`, t('info.highestNote'));
    }

    // Phần thay đổi theo thời gian
    setRow(r.ha, fmtHMS(ha, { signed: true }), ha >= 0 ? t('info.haWest') : t('info.haEast'));
    setRow(r.az, Number.isFinite(az) ? fmtDeg(az, 2) : '—', compassName(az));
    setRow(r.alt, fmtDegSigned(alt, 2), alt >= 0 ? t('info.above') : t('info.below'));
  };

  return { el, update };
}

/**
 * Thứ tự ô = thứ tự khái niệm: vị trí (φ, độ cao thiên cực, góc xích đạo – chân trời) → thời gian (λ, LST, GST,
 * giờ Mặt Trời) → đối tượng đang chọn. φ và độ cao thiên cực đứng cạnh nhau để thấy chúng bằng nhau.
 * `group-end` đánh dấu ô cuối của một cụm (khoảng trống lớn hơn phía sau thay cho đường viền).
 */
export const DATA_CELLS = [
  { key: 'lat', tip: false, end: false },
  { key: 'pole', tip: true, end: false },
  { key: 'incl', tip: true, end: true },
  { key: 'lon', tip: false, end: false },
  { key: 'lst', tip: true, end: false },
  { key: 'gst', tip: true, end: false },
  { key: 'solar', tip: true, end: true },
  { key: 'selected', tip: false, end: false },
] as const;
export type DataKey = (typeof DATA_CELLS)[number]['key'];

export function dataBar(store: Store, actions: Actions) {
  const items = {} as Record<DataKey, HTMLElement>;
  const cells = {} as Record<DataKey, HTMLElement>;
  for (const c of DATA_CELLS) {
    const v = h('span', { class: 'data__v' });
    items[c.key] = v;
    const note = h('span', { class: 'data__n', text: t(`data.${c.key}Note`) });
    // data-emphasis: khóa "tô sáng liên kết" (số ↔ hình trong hai khung nhìn), xem ui/emphasis.ts.
    cells[c.key] = h(
      'div',
      { class: c.end ? 'data__item data__item--end' : 'data__item', title: c.tip ? t(`data.${c.key}Tip`) : undefined, 'data-emphasis': c.key },
      h('span', { class: 'data__k', text: t(`data.${c.key}`) }),
      v,
      note,
    );
  }
  for (const c of DATA_CELLS) bindEmphasis(cells[c.key], store, actions);
  const sunCell = cells.solar;
  const el = h('section', { class: 'databar', 'aria-label': t('data.aria') }, ...DATA_CELLS.map((c) => cells[c.key]));

  const update = () => {
    const s: AppState = store.state;
    const lst = lstOf(s);
    setText(items.lat, `φ = ${fmtLat(s.lat)}`);
    setText(items.lon, `λ = ${fmtLon(s.lon)}`);
    setText(items.lst, fmtHMS(lst));
    setText(items.gst, fmtHMS(s.gst));
    setText(items.pole, fmtDeg(poleAltitude(s.lat)));
    setText(items.incl, fmtDeg(equatorInclination(s.lat)));
    setHidden(sunCell, !s.toggles.sun);
    if (s.toggles.sun) {
      const p = sunEquatorial(s);
      const haSun = equatorialToHorizontal(p.ra, p.dec, s.lat, lst).ha;
      setText(items.solar, `≈ ${fmtHMS(norm360(haSun + 180), { seconds: false })}`);
    }
    const obj = resolveSelection(s);
    if (obj) {
      const { alt, az } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lst);
      setText(items.selected, `${obj.name.split(' (')[0]}: α ${fmtHMS(obj.ra, { seconds: false })}, δ ${fmtDegSigned(obj.dec, 1)} │ A ${fmtDeg(az, 1)}, h ${fmtDegSigned(alt, 1)}`);
    } else setText(items.selected, t('data.selectedNone'));
  };
  return { el, update };
}
