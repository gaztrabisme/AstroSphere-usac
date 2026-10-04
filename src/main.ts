// Điểm khởi động: dựng bố cục, hai khung nhìn 3D, bốn bảng điều khiển và vòng lặp hoạt ảnh.

import './styles.css';
import logoUrl from './assets/usac-logo.png';
import { Animator } from './animator';
import { t } from './i18n';
import { startFrameLoop, type FrameView } from './runtime/frameLoop';
import { createQuality } from './runtime/quality';
import type { SceneViews } from './scene/boot';
import { COLORS } from './scene/colors';
import type { CelestialSphereView } from './scene/celestialSphere';
import type { HorizonDiagramView } from './scene/horizonDiagram';
import { mountStory } from './story/entry';
import type { ViewKey } from './story/types';
import { Actions, createInitialState, Store, type AppState, type Toggles } from './state';
import { animationPanel } from './ui/animationPanel';
import { displayPanel } from './ui/displayPanel';
import { button, clear, h } from './ui/dom';
import { dataBar, infoCard } from './ui/infoCard';
import { locationPanel } from './ui/locationPanel';
import { mountQualityNotice } from './ui/qualityNotice';
import { starPanel } from './ui/starPanel';
import { attachViewInteraction } from './ui/viewInteraction';

// Tải cảnh 3D (three.js) song song với việc dựng giao diện.
const scenePromise = import('./scene/boot');

const store = new Store(createInitialState());
const actions = new Actions(store);
const app = document.getElementById('app')!;

// ---------------------------------------------------------------- Ngăn Ôn tập và hộp thoại (tải động khi dùng lần đầu)
type LearnDrawer = ReturnType<typeof import('./ui/learning').learningDrawer>;
type Dialogs = ReturnType<typeof import('./ui/dialogs').createDialogs>;

let learnDrawer: LearnDrawer | null = null;
let learnLoading: Promise<LearnDrawer> | null = null;
let learnOpener: HTMLElement | null = null;
function loadLearn(): Promise<LearnDrawer> {
  learnLoading ??= import('./ui/learning').then((m) => {
    learnDrawer = m.learningDrawer(store, actions, {
      returnFocus: () => (learnOpener?.isConnected ? learnOpener : learnBtn),
    });
    app.append(learnDrawer.el);
    return learnDrawer;
  });
  return learnLoading;
}
/** Mặt tiền an toàn: dùng được trước khi mô-đun được tải. */
const learn = {
  isOpen: () => !!learnDrawer && !learnDrawer.el.hidden,
  open(v: boolean) {
    if (!v && !learnDrawer) return;
    if (v && !learn.isOpen()) learnOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    void loadLearn().then((d) => d.open(v));
  },
  toggle: () => learn.open(!learn.isOpen()),
};

let dialogsMod: Dialogs | null = null;
let dialogsLoading: Promise<Dialogs> | null = null;
function loadDialogs(): Promise<Dialogs> {
  dialogsLoading ??= import('./ui/dialogs').then((m) => (dialogsMod = m.createDialogs({ onShowHero: () => story.showHero() })));
  return dialogsLoading;
}
const dialogs = {
  help: () => void loadDialogs().then((d) => d.help()),
  about: () => void loadDialogs().then((d) => d.about()),
  isOpen: () => dialogsMod?.isOpen() ?? false,
};

// ---------------------------------------------------------------- Thanh trên cùng
let sphere: CelestialSphereView | null = null;
let horizon: HorizonDiagramView | null = null;

const learnBtn = button(t('top.learn'), () => learn.toggle(), { cls: 'btn--top', icon: '🎓', title: t('top.learnTip') });
const presentBtn = button(t('top.present'), () => setPresent(!presenting), { cls: 'btn--top', icon: '⛶', title: t('top.presentTip') });
presentBtn.setAttribute('aria-pressed', 'false');
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
    button(t('top.story'), () => story.open(), { cls: 'btn--top', icon: '✦', title: t('top.storyTip') }),
    learnBtn,
    presentBtn,
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
    onclick: () => selectView(key),
  });
const tabEls = { sphere: viewTab('sphere'), horizon: viewTab('horizon') };
const viewTabs = h('div', { class: 'viewtabs', role: 'tablist', 'aria-label': t('view.tabsAria') }, tabEls.sphere, tabEls.horizon);
function selectView(key: ViewKey) {
  views.dataset.active = key;
  viewTabs.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b === tabEls[key])));
  window.dispatchEvent(new Event('resize'));
}

// ---------------------------------------------------------------- Bảng số liệu và bảng điều khiển
const data = dataBar(store);
const animation = animationPanel(store, actions);
const panelDefs = [
  { key: 'location', el: locationPanel(store, actions) },
  { key: 'animation', el: animation.el },
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
      loop.markUiDirty(); // bảng vừa hiện: ghi bù số liệu đã bỏ qua khi ẩn
    },
  });
  panelTabs.append(tab);
  p.el.dataset.panel = p.key;
}
panels.append(panelTabs, ...panelDefs.map((p) => p.el));

// Chữ ký CLB và liên kết DUY NHẤT về trang CLB (AGENTS.md › Brand).
const footer = h(
  'footer',
  { class: 'site-footer' },
  h('p', { class: 'site-footer__sig' }, h('strong', { text: t('app.signature') }), ` · ${t('app.slogan')}`),
  h('p', { class: 'site-footer__contact' }, `${t('app.contact')} `, h('a', { href: `mailto:${t('app.email')}`, text: t('app.email') })),
  h('p', { class: 'site-footer__club' }, h('a', { href: t('app.clubUrl'), rel: 'noopener', target: '_blank', title: t('app.clubLinkTip'), text: `${t('app.clubLink')} ↗` })),
);

// ---------------------------------------------------------------- Chế độ trình chiếu (spec K6, K8)
let presenting = false;
function setPresent(on: boolean) {
  if (on === presenting) return;
  presenting = on;
  document.body.classList.toggle('present', on);
  presentBtn.setAttribute('aria-pressed', String(on));
  presentBtn.title = t(on ? 'top.exitPresent' : 'top.presentTip');
  const root = document.documentElement;
  try {
    if (on && !document.fullscreenElement && root.requestFullscreen) void root.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => {});
  } catch {
    /* trình duyệt không cho toàn màn hình: vẫn giữ bố cục trình chiếu */
  }
  window.dispatchEvent(new Event('resize'));
}
// Người dùng thoát toàn màn hình bằng Esc (trình duyệt tự xử lý) → tắt luôn chế độ trình chiếu.
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && presenting) setPresent(false);
});
// Khung nhìn đổi kích thước (đổi bố cục điện thoại ↔ máy tính, trình chiếu): ghi bù số liệu.
window.addEventListener('resize', () => loop.markUiDirty());
app.append(topbar, h('main', { class: 'layout' }, viewTabs, views, legend, data.el, panels), footer);

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

// ---------------------------------------------------------------- Khởi tạo 3D (tải động)
for (const host of [sphereHost, horizonHost]) host.append(h('p', { class: 'view__loading', text: t('view.loading') }));

function showSceneError(key: 'view.webglError' | 'view.loadError') {
  for (const host of [sphereHost, horizonHost]) {
    clear(host);
    host.append(h('p', { class: 'webgl-error', text: t(key) }));
  }
}

const sceneReady: Promise<SceneViews | null> = scenePromise.then(
  (m) => {
    for (const host of [sphereHost, horizonHost]) clear(host);
    try {
      const v = m.bootScene(sphereHost, horizonHost, store);
      sphere = v.sphere;
      horizon = v.horizon;
      for (const view of [sphere, horizon]) attachViewInteraction(view, store, actions);
      sphere.update(store.state);
      horizon.update(store.state);
      loop.markUiDirty();
      return v;
    } catch (err) {
      console.error(err);
      showSceneError('view.webglError');
      return null;
    }
  },
  (err) => {
    console.error(err);
    showSceneError('view.loadError');
    return null;
  },
);

store.subscribe((s) => {
  sphere?.update(s);
  horizon?.update(s);
  loop.markUiDirty();
});
updateLegend(store.state);

function resetAll() {
  actions.resetAll();
  if (horizon?.isFirstPerson()) fpBtn.click();
  sphere?.resetCamera();
  horizon?.resetCamera();
}

// ---------------------------------------------------------------- Vòng lặp
const animator = new Animator(store, actions);
const quality = createQuality();
const loop = startFrameLoop({
  animator,
  getViews: (): readonly FrameView[] => (sphere && horizon ? [sphere, horizon] : []),
  onUiTick: () => {
    data.update();
    card.update();
    updateLegend(store.state);
    animation.tick();
  },
  isPlaying: () => store.state.playing,
  quality,
});
mountQualityNotice(quality, app);

// ---------------------------------------------------------------- Câu chuyện
const story = mountStory({
  store,
  actions,
  appRoot: app,
  reducedMotion: () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  showView: selectView,
  setFirstPerson: (on) => {
    void sceneReady.then(() => {
      if (horizon && horizon.isFirstPerson() !== on) fpBtn.click();
    });
  },
  resetCameras: () => {
    void sceneReady.then(() => {
      sphere?.resetCamera();
      horizon?.resetCamera();
    });
  },
  openLearning: () => learn.open(true),
  suspendRender: (reason, on) => loop.suspend(reason, on),
});
story.maybeShowHero();

// Hook gỡ lỗi/đo hiệu năng — chỉ có ở chế độ phát triển.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__app = {
    store,
    actions,
    data,
    card,
    animator,
    loop,
    quality,
    story,
    get sphere() {
      return sphere;
    },
    get horizon() {
      return horizon;
    },
  };
}

// ---------------------------------------------------------------- Phím tắt
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || dialogs.isOpen()) return;
  const target = e.target as HTMLElement;
  const tag = target?.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target?.isContentEditable || target?.getAttribute('role') === 'slider';
  if (e.key === 'Escape') {
    if (learn.isOpen()) learn.open(false);
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
  else if (k === 'f') setPresent(!presenting);
});
