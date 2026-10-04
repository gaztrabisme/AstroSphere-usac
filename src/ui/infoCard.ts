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
import { h } from './dom';

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

function row(label: string, title?: string): Row {
  const v = h('span', { class: 'kv__v' });
  const x = h('span', { class: 'kv__x' });
  return { el: h('div', { class: 'kv', title }, h('dt', { text: label }), h('dd', null, v, x)), v, x };
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function setRow(r: Row, value: string, extra = ''): void {
  setText(r.v, value);
  setText(r.x, extra);
}

export function infoCard(store: Store, actions: Actions) {
  const title = h('h3', { class: 'infocard__title' });
  const dot = h('span', { class: 'infocard__dot', 'aria-hidden': 'true' });
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
  const r = {
    ra: row(t('info.ra')),
    dec: row(t('info.dec')),
    ha: row(t('info.ha'), t('info.haTip')),
    az: row(t('info.az')),
    alt: row(t('info.alt')),
    rise: row(t('info.rise')),
    transit: row(t('info.transit')),
    set: row(t('info.set')),
    above: row(t('info.hoursAbove'), t('info.hoursAboveTip')),
    lowest: row(t('info.lowest')),
    highest: row(t('info.highest')),
  };
  const status = h('span', { class: 'status' });
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
      h('div', { class: 'kv' }, h('dt', { text: t('info.status') }), h('dd', null, status)),
      r.rise.el,
      r.transit.el,
      r.set.el,
      r.above.el,
      r.lowest.el,
      r.highest.el,
    ),
  );

  const el = h(
    'aside',
    { class: 'infocard', 'aria-label': t('info.aria'), hidden: true },
    h(
      'header',
      { class: 'infocard__head' },
      dot,
      title,
      collapseBtn,
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('info.close'), title: t('info.close'), text: '×', onclick: () => actions.select(null) }),
    ),
    kind,
    body,
  );

  // Kéo thẻ bằng thanh tiêu đề để không che phần đang quan sát (chỉ trên màn hình rộng).
  const head = el.querySelector('.infocard__head') as HTMLElement;
  head.title = t('info.dragTip');
  let drag: { dx: number; dy: number } | null = null;
  head.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button') || window.matchMedia?.('(max-width: 900px)').matches) return;
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
  const update = () => {
    const s = store.state;
    const obj = resolveSelection(s);
    el.hidden = !obj;
    if (!obj) return;
    const lst = lstOf(s);
    const { alt, az, ha } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lst);

    // Phần phụ thuộc vào đối tượng và vĩ độ (không đổi khi bầu trời quay)
    const key = `${obj.name}|${obj.ra}|${obj.dec}|${s.lat}`;
    if (key !== staticKey) {
      staticKey = key;
      const rs = riseSet(obj.ra, obj.dec, s.lat);
      setText(title, obj.name);
      dot.style.background = obj.color;
      setText(kind, obj.mag !== undefined ? `${obj.kind} · ${t('info.mag', { m: fmtNum(obj.mag, 2) })}` : obj.kind);
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

export function dataBar(store: Store) {
  const items: Record<string, HTMLElement> = {};
  const cell = (key: string, title?: string) => {
    const v = h('span', { class: 'data__v' });
    items[key] = v;
    return h('div', { class: 'data__item', title }, h('span', { class: 'data__k', text: t(`data.${key}`) }), v);
  };
  const sunCell = cell('solar', t('data.solarTip'));
  const selCell = cell('selected');
  const el = h(
    'section',
    { class: 'databar', 'aria-label': t('data.aria') },
    cell('lat'),
    cell('lon'),
    cell('lst', t('data.lstTip')),
    cell('gst', t('data.gstTip')),
    cell('pole', t('data.poleTip')),
    cell('incl', t('data.inclTip')),
    sunCell,
    selCell,
  );

  const update = () => {
    const s: AppState = store.state;
    const lst = lstOf(s);
    items.lat.textContent = `φ = ${fmtLat(s.lat)}`;
    items.lon.textContent = `λ = ${fmtLon(s.lon)}`;
    items.lst.textContent = fmtHMS(lst);
    items.gst.textContent = fmtHMS(s.gst);
    items.pole.textContent = fmtDeg(poleAltitude(s.lat));
    items.incl.textContent = fmtDeg(equatorInclination(s.lat));
    sunCell.hidden = !s.toggles.sun;
    if (s.toggles.sun) {
      const p = sunEquatorial(s);
      const haSun = equatorialToHorizontal(p.ra, p.dec, s.lat, lst).ha;
      items.solar.textContent = `≈ ${fmtHMS(norm360(haSun + 180), { seconds: false })}`;
    }
    const obj = resolveSelection(s);
    selCell.hidden = !obj;
    if (obj) {
      const { alt, az } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lst);
      items.selected.textContent = `${obj.name.split(' (')[0]}: α ${fmtHMS(obj.ra, { seconds: false })}, δ ${fmtDegSigned(obj.dec, 1)} │ A ${fmtDeg(az, 1)}, h ${fmtDegSigned(alt, 1)}`;
    }
  };
  return { el, update };
}
