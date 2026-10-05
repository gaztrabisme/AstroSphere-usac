// Điểm khởi động: dựng bố cục, hai khung nhìn 3D, bốn bảng điều khiển và vòng lặp hoạt ảnh.

import './styles.css';
import logoUrl from './assets/usac-logo.png';
import { Animator } from './animator';
import { t } from './i18n';
import { CelestialSphereView } from './scene/celestialSphere';
import { COLORS } from './scene/geom';
import { HorizonDiagramView } from './scene/horizonDiagram';
import type { View } from './scene/view';
import { Actions, createInitialState, Store, type AppState, type Toggles } from './state';
import { animationPanel } from './ui/animationPanel';
import { createDialogs } from './ui/dialogs';
import { displayPanel } from './ui/displayPanel';
import { button, clear, h } from './ui/dom';
import { dataBar, infoCard } from './ui/infoCard';
import { learningDrawer } from './ui/learning';
import { locationPanel } from './ui/locationPanel';
import { starPanel } from './ui/starPanel';
import { attachViewInteraction } from './ui/viewInteraction';

const store = new Store(createInitialState());
const actions = new Actions(store);
const app = document.getElementById('app')!;

// ---------------------------------------------------------------- Thanh trên cùng
const learn = learningDrawer(store, actions);
const dialogs = createDialogs();
let sphere: CelestialSphereView | null = null;
let horizon: HorizonDiagramView | null = null;

const learnBtn = button(t('top.learn'), () => learn.toggle(), { cls: 'btn--top', icon: '🎓', title: t('top.learnTip') });
const topbar = h(
  'header',
  { class: 'topbar' },
  h(
    'div',
    { class: 'brand' },
    h('img', { class: 'brand__logo', src: logoUrl, alt: t('app.logoAlt'), width: 44, height: 44, decoding: 'async' }),
    h('h1', { class: 'brand__text' }, h('span', { class: 'brand__org', text: t('app.org') }), h('span', { class: 'brand__name', text: t('app.title') })),
  ),
  h(
    'nav',
    { class: 'topbar__actions', 'aria-label': t('top.navAria') },
    learnBtn,
    button(t('top.reset'), () => resetAll(), { cls: 'btn--top', icon: '↺', title: t('top.resetTip') }),
    button(t('top.help'), () => dialogs.help(), { cls: 'btn--top', icon: '?', title: t('top.helpTip') }),
    button(t('top.about'), () => dialogs.about(), { cls: 'btn--top', icon: 'i', title: t('top.aboutTip') }),
  ),
);

// ---------------------------------------------------------------- Hai khung nhìn
const sphereHost = h('div', { class: 'view__canvas', role: 'img', 'aria-label': t('view.sphereAria') });
const horizonHost = h('div', { class: 'view__canvas', role: 'img', 'aria-label': t('view.horizonAria') });
const fpBtn = h('button', {
  type: 'button',
  class: 'btn btn--small',
  'aria-pressed': 'false',
  title: t('view.firstPersonTip'),
  text: t('view.firstPerson'),
  onclick: () => {
    if (!horizon) return;
    const on = !horizon.isFirstPerson();
    horizon.setFirstPerson(on);
    fpBtn.setAttribute('aria-pressed', String(on));
    fpBtn.textContent = on ? t('view.outside') : t('view.firstPerson');
  },
});

function viewBox(id: string, title: string, sub: string, host: HTMLElement, tools: HTMLElement[]) {
  return h(
    'article',
    { class: 'view', id, 'aria-labelledby': `${id}-title` },
    h(
      'header',
      { class: 'view__head' },
      h('div', null, h('h2', { id: `${id}-title`, text: title }), h('p', { class: 'view__sub', text: sub })),
      h('div', { class: 'view__tools' }, ...tools),
    ),
    host,
    h('p', { class: 'view__hint', text: t('view.dragHint') }),
  );
}

const sphereBox = viewBox('view-sphere', t('view.sphere'), t('view.sphereSub'), sphereHost, [
  button(t('view.resetCamera'), () => sphere?.resetCamera(), { cls: 'btn--small', title: t('view.resetCameraTip') }),
]);
const horizonBox = viewBox('view-horizon', t('view.horizon'), t('view.horizonSub'), horizonHost, [
  fpBtn,
  button(t('view.resetCamera'), () => horizon?.resetCamera(), { cls: 'btn--small', title: t('view.resetCameraTip') }),
]);

const card = infoCard(store, actions);
const legend = h('div', { class: 'legend', 'aria-label': t('legend.aria') });
const views = h('section', { class: 'views', 'data-active': 'horizon' }, sphereBox, horizonBox, card.el);

const viewTab = (key: 'sphere' | 'horizon') =>
  h('button', {
    type: 'button',
    role: 'tab',
    class: 'tab',
    'aria-selected': String(key === 'horizon'),
    'aria-controls': `view-${key}`,
    text: t(`view.${key}`),
    onclick: () => {
      views.dataset.active = key;
      viewTabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === tabEls[key])));
      window.dispatchEvent(new Event('resize'));
    },
  });
const tabEls = { sphere: viewTab('sphere'), horizon: viewTab('horizon') };
const viewTabs = h('div', { class: 'viewtabs', role: 'tablist', 'aria-label': t('view.tabsAria') }, tabEls.sphere, tabEls.horizon);

// ---------------------------------------------------------------- Bảng số liệu và bảng điều khiển
const data = dataBar(store);
const panelDefs = [
  { key: 'location', el: locationPanel(store, actions) },
  { key: 'animation', el: animationPanel(store, actions) },
  { key: 'display', el: displayPanel(store, actions) },
  { key: 'stars', el: starPanel(store, actions) },
];
const panels = h('section', { class: 'panels', 'data-active': 'location', 'aria-label': t('panel.aria') });
const panelTabs = h('div', { class: 'paneltabs', role: 'tablist', 'aria-label': t('panel.tabsAria') });
for (const p of panelDefs) {
  const tab = h('button', {
    type: 'button',
    role: 'tab',
    class: 'tab',
    'aria-selected': String(p.key === 'location'),
    'aria-controls': p.el.id,
    text: t(`panel.${p.key}.short`),
    onclick: () => {
      const same = panels.dataset.active === p.key && !panels.classList.contains('collapsed');
      panels.dataset.active = p.key;
      panels.classList.toggle('collapsed', same);
      panelTabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
    },
  });
  panelTabs.append(tab);
  p.el.dataset.panel = p.key;
}
panels.append(panelTabs, ...panelDefs.map((p) => p.el));

window.addEventListener('open-catalog', () => dialogs.catalog());
const footer = h(
  'footer',
  { class: 'site-footer' },
  h('p', { class: 'site-footer__credit', text: t('app.footer') }),
  h('p', { class: 'site-footer__contact' }, `${t('app.contact')} `, h('a', { href: `mailto:${t('app.email')}`, text: t('app.email') })),
  h('p', { class: 'site-footer__links' }, h('button', { type: 'button', class: 'link-btn', text: t('app.catalogLink'), onclick: () => dialogs.catalog() })),
);
app.append(topbar, h('main', { class: 'layout' }, viewTabs, views, legend, data.el, panels), footer, learn.el);

// ---------------------------------------------------------------- Chú giải màu
const LEGEND: { key: keyof Toggles | 'horizon'; color: string; zone?: boolean }[] = [
  { key: 'equator', color: COLORS.equator },
  { key: 'poleAxis', color: COLORS.axis },
  { key: 'horizon', color: COLORS.horizon },
  { key: 'hourCircle0', color: COLORS.hourCircle },
  { key: 'meridian', color: COLORS.meridian },
  { key: 'verticalCircle', color: COLORS.vertical },
  { key: 'ecliptic', color: COLORS.ecliptic },
  { key: 'galactic', color: COLORS.galactic },
  { key: 'zoneCircumpolar', color: COLORS.circumpolar, zone: true },
  { key: 'zoneRiseSet', color: COLORS.riseSet, zone: true },
  { key: 'zoneNeverRise', color: COLORS.neverRise, zone: true },
];
let legendKey = '';
function updateLegend(s: AppState) {
  const items = LEGEND.filter((l) => l.key === 'horizon' || s.toggles[l.key as keyof Toggles]);
  const key = items.map((i) => i.key).join(',');
  if (key === legendKey) return;
  legendKey = key;
  clear(legend);
  legend.append(h('span', { class: 'legend__title', text: t('legend.title') }));
  for (const it of items) {
    legend.append(
      h(
        'span',
        { class: 'legend-item' },
        h('span', { class: it.zone ? 'swatch swatch--zone' : 'swatch swatch--line', style: { background: it.color }, 'aria-hidden': 'true' }),
        t(`legend.${it.key}`),
      ),
    );
  }
}

// ---------------------------------------------------------------- Khởi tạo 3D
let uiDirty = true;
try {
  sphere = new CelestialSphereView(sphereHost, store);
  horizon = new HorizonDiagramView(horizonHost, store);
  for (const v of [sphere, horizon] as View[]) attachViewInteraction(v, store, actions);
} catch (err) {
  console.error(err);
  for (const host of [sphereHost, horizonHost]) {
    clear(host);
    host.append(h('p', { class: 'webgl-error', text: t('view.webglError') }));
  }
}

store.subscribe((s) => {
  sphere?.update(s);
  horizon?.update(s);
  uiDirty = true;
});
updateLegend(store.state);

// Hook gỡ lỗi/đo hiệu năng — chỉ có ở chế độ phát triển.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__app = { store, actions, sphere, horizon, data, card, get animator() { return animator; } };
}

function resetAll() {
  actions.resetAll();
  if (horizon?.isFirstPerson()) fpBtn.click();
  sphere?.resetCamera();
  horizon?.resetCamera();
}

// ---------------------------------------------------------------- Vòng lặp
const animator = new Animator(store, actions);
let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  animator.tick(dt);
  sphere?.frame();
  horizon?.frame();
  if (uiDirty) {
    uiDirty = false;
    data.update();
    card.update();
    updateLegend(store.state);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------------------------------------------------------------- Phím tắt
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || dialogs.isOpen()) return;
  const target = e.target as HTMLElement;
  const tag = target?.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target?.isContentEditable || target?.getAttribute('role') === 'slider';
  if (e.key === 'Escape') {
    if (!learn.el.hidden) learn.open(false);
    else actions.select(null);
    return;
  }
  if (typing) return;
  const k = e.key.toLowerCase();
  if (e.key === ' ' && tag !== 'BUTTON') {
    e.preventDefault();
    actions.togglePlay();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    actions.stepHours(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    actions.stepHours(-1);
  } else if (e.key === '+' || e.key === '=') actions.setRate(store.state.rate - 5);
  else if (e.key === '-' || e.key === '_') actions.setRate(store.state.rate + 5);
  else if (k === 'n') actions.setNow();
  else if (k === 'v') actions.resetTrails();
  else if (k === 'c') {
    sphere?.resetCamera();
    horizon?.resetCamera();
  } else if (k === 'h' || e.key === '?') dialogs.help();
  else if (k === 'l') learn.toggle();
});
