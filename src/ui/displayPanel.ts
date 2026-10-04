// Bảng 3: Hiển thị (các hộp kiểm, nhãn theo nhóm, phần mở rộng).

import { fmtDegSigned, fmtDuration, riseSet } from '../astro';
import { t } from '../i18n';
import { COLORS } from '../scene/colors';
import { sunEquatorial } from '../selection';
import type { Actions, LabelToggles, Store, Toggles } from '../state';
import { button, checkbox, h } from './dom';

type ToggleKey = keyof Toggles;

const BASIC: [ToggleKey, string?][] = [
  ['hourCircle0', COLORS.hourCircle],
  ['equator', COLORS.equator],
  ['underside'],
  ['zoneNeverRise', COLORS.neverRise],
  ['zoneRiseSet', COLORS.riseSet],
  ['zoneCircumpolar', COLORS.circumpolar],
  ['angle', COLORS.angle],
];

const LINES: [ToggleKey, string?][] = [
  ['poleAxis', COLORS.axis],
  ['equatorPlane', COLORS.equator],
  ['zenithNadir', COLORS.zenith],
  ['meridian', COLORS.meridian],
  ['verticalCircle', COLORS.vertical],
  ['poleAltitude', COLORS.latitude],
  ['horizonOnSphere', COLORS.horizon],
  ['altAzGrid', COLORS.altAzGrid],
  ['eqGrid', COLORS.grid],
];

const EXTRA: [ToggleKey, string?][] = [
  ['ecliptic', COLORS.ecliptic],
  ['galactic', COLORS.galactic],
  ['sun', COLORS.sun],
];

/** Các hộp kiểm khái niệm có một dòng giải thích `toggleHint.<key>` khi đang bật. */
export const HINTED_TOGGLES: readonly ToggleKey[] = [
  'poleAxis',
  'equator',
  'hourCircle0',
  'horizonOnSphere',
  'zenithNadir',
  'meridian',
  'verticalCircle',
  'altAzGrid',
  'eqGrid',
  'poleAltitude',
  'angle',
  'equatorPlane',
  'underside',
  'zoneCircumpolar',
  'zoneRiseSet',
  'zoneNeverRise',
];

const LABEL_KEYS: (keyof LabelToggles)[] = ['directions', 'poles', 'circles', 'stars', 'angles'];

export function displayPanel(store: Store, actions: Actions): HTMLElement {
  const boxes = new Map<ToggleKey, ReturnType<typeof checkbox>>();
  const labelBoxes = new Map<keyof LabelToggles, HTMLInputElement>();

  const makeGroup = (items: [ToggleKey, string?][]) =>
    items.map(([k, swatch]) => {
      const cb = checkbox(t(`toggle.${k}`), store.state.toggles[k], (v) => actions.setToggle(k, v), {
        tip: t(`toggleTip.${k}`),
        swatch,
        hint: HINTED_TOGGLES.includes(k) ? t(`toggleHint.${k}`) : undefined,
        emphasis: k,
      });
      boxes.set(k, cb);
      return cb.el;
    });

  const master = checkbox(t('labels.all'), store.state.labels.all, (v) => actions.setLabel('all', v), { tip: t('labels.allTip') });
  labelBoxes.set('all', master.input);
  const labelItems = LABEL_KEYS.map((k) => {
    const cb = checkbox(t(`labels.${k}`), store.state.labels[k], (v) => actions.setLabel(k, v));
    labelBoxes.set(k, cb.input);
    return cb.el;
  });

  const dateInput = h('input', {
    type: 'date',
    id: 'sun-date',
    value: store.state.sunDate,
    onchange: (e: Event) => actions.setSunDate((e.target as HTMLInputElement).value),
  });
  const sunInfo = h('p', { class: 'hint', 'aria-live': 'polite' });
  const seasonBtn = (key: string, md: string) =>
    button(t(`panel.display.${key}`), () => {
      const year = store.state.sunDate.slice(0, 4);
      actions.setSunDate(`${year}-${md}`);
      actions.setToggle('sun', true);
    }, { cls: 'chip' });

  const legend = h(
    'div',
    { class: 'legend-zones', 'aria-label': t('panel.display.zoneLegend') },
    ...(['zoneCircumpolar', 'zoneRiseSet', 'zoneNeverRise'] as const).map((k) =>
      h('span', { class: 'legend-item' }, h('span', { class: 'swatch swatch--zone', style: { background: COLORS[k === 'zoneCircumpolar' ? 'circumpolar' : k === 'zoneRiseSet' ? 'riseSet' : 'neverRise'] } }), t(`legend.${k}`)),
    ),
  );

  const el = h(
    'section',
    { class: 'panel', id: 'panel-display', 'aria-labelledby': 'h-display' },
    h('h2', { id: 'h-display', class: 'panel__title', text: t('panel.display.title') }),
    h('details', { class: 'sub', open: true }, h('summary', { text: t('panel.display.basic') }), h('div', { class: 'checks' }, ...makeGroup(BASIC)), legend),
    h('details', { class: 'sub' }, h('summary', { text: t('panel.display.lines') }), h('div', { class: 'checks' }, ...makeGroup(LINES))),
    h('details', { class: 'sub' }, h('summary', { text: t('panel.display.labels') }), h('div', { class: 'checks' }, master.el, h('div', { class: 'checks checks--indent' }, ...labelItems))),
    h(
      'details',
      { class: 'sub' },
      h('summary', { text: t('panel.display.extra') }),
      h('div', { class: 'checks' }, ...makeGroup(EXTRA)),
      h('div', { class: 'field' }, h('label', { htmlFor: 'sun-date', text: t('panel.display.sunDate') }), dateInput),
      h('div', { class: 'chips' }, seasonBtn('vernal', '03-20'), seasonBtn('summer', '06-21'), seasonBtn('autumnal', '09-23'), seasonBtn('winter', '12-22')),
      sunInfo,
    ),
  );

  const sync = () => {
    const s = store.state;
    for (const [k, cb] of boxes) cb.set(s.toggles[k]);
    for (const [k, input] of labelBoxes) {
      input.checked = s.labels[k];
      if (k !== 'all') input.disabled = !s.labels.all;
    }
    if (document.activeElement !== dateInput) dateInput.value = s.sunDate;
    legend.hidden = !(s.toggles.zoneCircumpolar || s.toggles.zoneRiseSet || s.toggles.zoneNeverRise);
    if (s.toggles.sun) {
      const p = sunEquatorial(s);
      const rs = riseSet(p.ra, p.dec, s.lat);
      const day =
        rs.visibility === 'circumpolar' ? t('panel.display.polarDay') : rs.visibility === 'neverRise' ? t('panel.display.polarNight') : t('panel.display.dayLength', { d: fmtDuration(rs.hoursAbove * 0.99727) });
      sunInfo.textContent = t('panel.display.sunInfo', { dec: fmtDegSigned(p.dec), day });
    } else sunInfo.textContent = t('panel.display.sunOff');
  };
  store.subscribe((s, prev) => {
    if (s.toggles !== prev.toggles || s.labels !== prev.labels || s.sunDate !== prev.sunDate || s.lat !== prev.lat) sync();
  });
  sync();
  return el;
}
