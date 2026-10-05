// Codex (redesign-2 C) — phần tải lười: hộp thoại kiểu Mass Effect. Trái: danh mục và các mục (đã khám phá / mới /
// chưa khám phá) cùng dòng tiến độ. Phải: trang đọc (tiêu đề, câu dẫn, thân bài có công thức, sơ đồ, "Xem trong mô
// phỏng", mục liên quan). Điện thoại: danh sách → trang đọc, có nút quay lại.
//
// <dialog> gốc: bẫy tiêu điểm, Esc đóng trước mọi thứ khác, tiêu điểm trở về nút đã mở khi đóng.

import content from '../i18n/codex.vi.json';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { renderLines, renderMath } from '../ui/dialogs';
import { sunEquatorial } from '../selection';
import type { DiagramEnv, DiagramLabels } from './diagrams';
import { categoryGlyph, stateGlyph, type EntryState } from './glyphs';
import { SIM } from './sim';
import { isDiscovered, isNew, markRead, onCodexChange, type CodexContext } from './triggers';
import { entryFacts, entryVisual, formulaLines } from './visual';

export interface CodexEntry {
  title: string;
  aka?: string;
  lede: string;
  body: string[];
  related: string[];
  sim?: string;
  figure?: string;
}

/** Trạng thái hiển thị: chưa khám phá (ổ khóa) · mới (chấm đặc + "mới") · đã đọc (dấu tích). */
export function entryState(id: string): EntryState {
  return !isDiscovered(id) ? 'locked' : isNew(id) ? 'new' : 'read';
}

const STATE_TEXT = (s: EntryState): string =>
  s === 'locked' ? t('codexUi.stateLocked') : s === 'new' ? t('codexUi.stateNew') : content.ui.stateRead;

export interface CodexCategory {
  id: string;
  title: string;
  blurb: string;
  entries: string[];
}

export const CATEGORIES = content.categories as CodexCategory[];
export const ENTRIES = content.entries as Record<string, CodexEntry>;
const ORDER = CATEGORIES.flatMap((c) => c.entries);
const CATEGORY_OF = new Map<string, CodexCategory>();
for (const c of CATEGORIES) for (const id of c.entries) CATEGORY_OF.set(id, c);

const PHONE = '(max-width: 700px)';
const isPhone = () => window.matchMedia?.(PHONE).matches ?? false;

interface Ui {
  dlg: HTMLDialogElement;
  items: Map<string, HTMLButtonElement>;
  catCounts: Map<string, HTMLElement>;
  progress: HTMLElement;
  bar: HTMLElement;
  page: HTMLElement;
  current: string;
  show: (id: string, focus: Focus) => void;
}

type Focus = 'page' | 'item' | 'none';

let ui: Ui | null = null;

function labels(): DiagramLabels {
  return {
    ...content.diagram,
    north: t('scene.dirN'),
    east: t('scene.dirE'),
    south: t('scene.dirS'),
    west: t('scene.dirW'),
  };
}

function syncMarkers(u: Ui): void {
  for (const [id, btn] of u.items) {
    const state = entryState(id);
    if (btn.dataset.state === state) continue;
    btn.dataset.state = state;
    btn.classList.toggle('is-locked', state === 'locked');
    btn.classList.toggle('is-new', state === 'new');
    btn.querySelector('.cdx-item__mark')!.innerHTML = stateGlyph(state);
    btn.querySelector<HTMLElement>('.cdx-item__state')!.textContent = STATE_TEXT(state);
  }
  for (const rel of u.page.querySelectorAll<HTMLElement>('.cdx-rel[data-entry]')) {
    const state = entryState(rel.dataset.entry!);
    rel.dataset.state = state;
    rel.classList.toggle('is-locked', state === 'locked');
  }
  for (const c of CATEGORIES) {
    const n = c.entries.filter(isDiscovered).length;
    u.catCounts.get(c.id)!.textContent = `${n}/${c.entries.length}`;
  }
  const n = ORDER.filter(isDiscovered).length;
  u.progress.textContent = t('codexUi.progress', { n, total: ORDER.length });
  u.bar.style.setProperty('--p', String(n / ORDER.length));
}

function build(ctx: CodexContext): Ui {
  const items = new Map<string, HTMLButtonElement>();
  const catCounts = new Map<string, HTMLElement>();
  const progress = h('p', {
    class: 'cdx-progress__text',
    id: 'codex-progress',
  });
  const bar = h('div', { class: 'cdx-progress__bar', 'aria-hidden': 'true' });
  const page = h('article', { class: 'cdx-page', 'aria-live': 'off' });

  const nav = h(
    'nav',
    { class: 'cdx-nav', 'aria-label': t('codexUi.navAria') },
    h('div', { class: 'cdx-progress' }, progress, bar),
    ...CATEGORIES.map((c) => {
      const count = h('span', { class: 'cdx-cat__count' });
      catCounts.set(c.id, count);
      return h(
        'section',
        { class: 'cdx-cat', 'aria-labelledby': `cdx-cat-${c.id}` },
        (() => {
          const name = h('span', { class: 'cdx-cat__name', text: c.title });
          name.insertAdjacentHTML('afterbegin', categoryGlyph(c.id));
          return h('h3', { class: 'cdx-cat__title', id: `cdx-cat-${c.id}` }, name, count);
        })(),
        h(
          'ul',
          { class: 'cdx-list', role: 'list' },
          ...c.entries.map((id) => {
            const btn = h(
              'button',
              {
                type: 'button',
                class: 'cdx-item',
                'data-entry': id,
                onclick: () => show(id, { focus: isPhone() ? 'page' : 'none' }),
              },
              h('span', { class: 'cdx-item__mark', 'aria-hidden': 'true' }),
              h('span', { class: 'cdx-item__name', text: ENTRIES[id].title }),
              h('span', { class: 'cdx-item__state' }),
            );
            items.set(id, btn);
            return h('li', null, btn);
          }),
        ),
      );
    }),
  );

  const closeBtn = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-label': t('codexUi.close'),
    title: t('codexUi.close'),
    text: '×',
    onclick: () => dlg.close(),
  });
  const dlg = h(
    'dialog',
    {
      class: 'dialog cdx',
      id: 'dlg-codex',
      'aria-labelledby': 'codex-title',
      'aria-describedby': 'codex-progress',
    },
    h(
      'header',
      { class: 'dialog__head cdx__head' },
      h('div', null, h('h2', { id: 'codex-title', text: t('codexUi.title') }), h('p', { class: 'cdx__sub', text: t('codexUi.subtitle') })),
      closeBtn,
    ),
    h('div', { class: 'cdx__body' }, nav, page),
  );
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', () => dlg.classList.remove('is-reading'));
  document.body.append(dlg);

  const u: Ui = {
    dlg,
    items,
    catCounts,
    progress,
    bar,
    page,
    current: '',
    show: (id, focus) => show(id, { focus }),
  };
  onCodexChange(() => syncMarkers(u));

  function show(id: string, opts: { focus: Focus }): void {
    const e = ENTRIES[id];
    if (!e) return;
    u.current = id;
    const cat = CATEGORY_OF.get(id)!;
    const wasNew = isNew(id);
    for (const [k, b] of items) {
      if (k === id) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    }
    const state = entryState(id);
    const found = state !== 'locked';
    const title = h('h3', {
      class: 'cdx-page__title',
      id: 'cdx-page-title',
      tabindex: '-1',
      text: e.title,
    });
    const s = ctx.store.state;
    const env: DiagramEnv = { lat: s.lat, sun: sunEquatorial(s), sunDate: s.sunDate };
    const visual = entryVisual(id, e.figure, labels(), env);
    const fig = visual
      ? (() => {
          const f = h('figure', { class: 'cdx-figure', 'data-visual': id }, h('figcaption', { text: visual.caption }));
          f.insertAdjacentHTML('afterbegin', visual.svg);
          return f;
        })()
      : null;
    const facts = entryFacts(id, env);
    const formulas = formulaLines(e.body);
    const factsBox = facts.length
      ? h(
          'section',
          { class: 'cdx-facts', 'aria-labelledby': 'cdx-facts-h' },
          h('h4', { class: 'cdx-aside__h', id: 'cdx-facts-h', text: content.ui.factsTitle }),
          h('dl', null, ...facts.flatMap((f) => [h('dt', { text: f.label }), h('dd', { text: f.value })])),
          h('p', { class: 'cdx-facts__src', text: id === 'sun' ? content.ui.factsSourceSun : content.ui.factsSource }),
        )
      : formulas.length
        ? (() => {
            // Thẻ công thức: tóm tắt nhanh ở cột bên trên màn hình rộng. Thân bài vẫn giữ công thức đúng chỗ của
            // nó trong lời giải thích, nên trên màn hình hẹp thẻ này ẩn đi (không lặp lại).
            const box = renderLines(formulas);
            box.className = 'cdx-formulas__body';
            return h(
              'section',
              { class: 'cdx-facts cdx-facts--formula', 'aria-labelledby': 'cdx-facts-h' },
              h('h4', { class: 'cdx-aside__h', id: 'cdx-facts-h', text: content.ui.formulaTitle }),
              box,
            );
          })()
        : null;
    const simFn = SIM[id];
    const back = h('button', {
      type: 'button',
      class: 'btn btn--ghost cdx-page__back',
      text: `‹ ${t('codexUi.back')}`,
      onclick: () => {
        dlg.classList.remove('is-reading');
        items.get(id)?.focus();
      },
    });
    const stateLine = h('p', { class: `cdx-page__state${found ? '' : ' is-locked'}`, 'data-state': state });
    stateLine.insertAdjacentHTML('afterbegin', stateGlyph(state));
    stateLine.append(h('span', { text: found ? (wasNew ? t('codexUi.pageNew') : t('codexUi.pageFound')) : t('codexUi.pageLocked') }));
    const kicker = h('p', { class: 'cdx-page__kicker' }, h('span', { text: cat.title }));
    kicker.insertAdjacentHTML('afterbegin', categoryGlyph(cat.id));
    const head = h('header', { class: 'cdx-page__head' }, back, kicker, title, e.aka ? h('p', { class: 'cdx-page__aka', text: e.aka }) : null, stateLine);
    const main = h(
      'div',
      { class: 'cdx-page__main' },
      h('p', { class: 'cdx-page__lede', text: e.lede }),
      h('hr', { class: 'cdx-page__rule' }),
      (() => {
        const body = renderLines(e.body);
        body.className = 'cdx-page__body';
        return body;
      })(),
    );
    const asideParts: (Node | null)[] = [
      fig,
      factsBox,
      simFn
        ? h(
            'div',
            { class: 'cdx-page__sim' },
            h('button', {
              type: 'button',
              class: 'btn btn--primary',
              'aria-describedby': 'cdx-sim-note',
              text: `▶ ${t('codexUi.showInSim')}`,
              onclick: () => {
                dlg.close();
                simFn(ctx);
                document.querySelector('.views')?.scrollIntoView({ block: 'nearest' });
              },
            }),
            e.sim
              ? h('p', {
                  class: 'cdx-page__simnote',
                  id: 'cdx-sim-note',
                  text: e.sim,
                })
              : null,
          )
        : null,
      e.related.length
        ? h(
            'section',
            { class: 'cdx-page__related', 'aria-labelledby': 'cdx-related-h' },
            h('h4', { class: 'cdx-aside__h', id: 'cdx-related-h', text: t('codexUi.related') }),
            h(
              'ul',
              { role: 'list' },
              ...e.related.map((r) => {
                const rs = entryState(r);
                const b = h(
                  'button',
                  {
                    type: 'button',
                    class: `cdx-rel${rs === 'locked' ? ' is-locked' : ''}`,
                    'data-entry': r,
                    'data-state': rs,
                    onclick: () => show(r, { focus: 'page' }),
                  },
                  h('span', { class: 'cdx-rel__mark', 'aria-hidden': 'true' }),
                  h('span', { text: ENTRIES[r]?.title ?? r }),
                  h('span', { class: 'sr-only', text: `, ${STATE_TEXT(rs)}` }),
                );
                b.firstElementChild!.innerHTML = stateGlyph(rs);
                return h('li', null, b);
              }),
            ),
          )
        : null,
    ];
    const aside = h('aside', { class: 'cdx-page__aside', 'aria-label': content.ui.asideTitle }, ...asideParts.filter((p): p is Node => p !== null));
    page.replaceChildren(h('div', { class: 'cdx-page__in' }, head, main, aside));
    page.setAttribute('aria-labelledby', 'cdx-page-title');
    renderMath(page);
    page.scrollTop = 0;
    dlg.classList.add('is-reading');
    markRead(id); // đồng bộ dấu "mới" và huy hiệu qua onCodexChange
    syncMarkers(u);
    if (opts.focus === 'page') title.focus();
    else if (opts.focus === 'item') items.get(id)?.focus();
    if (!isPhone()) items.get(id)?.scrollIntoView({ block: 'nearest' });
  }

  return u;
}

/** Mục mở mặc định: mục mới đầu tiên (đã khám phá, chưa đọc); nếu không có, mục đang xem gần nhất hoặc mục đầu. */
function defaultEntry(u: Ui): string {
  return ORDER.find(isNew) ?? (u.current || ORDER[0]);
}

export function openCodexUi(ctx: CodexContext, id?: string): void {
  const u = (ui ??= build(ctx));
  if (!u.dlg.open) u.dlg.showModal();
  syncMarkers(u);
  if (id && ENTRIES[id]) u.show(id, 'page');
  else if (isPhone()) {
    // Điện thoại: mở ở danh sách; chưa mục nào bị đánh dấu "đã đọc" cho tới khi người dùng chạm vào nó.
    u.dlg.classList.remove('is-reading');
    u.items.get(defaultEntry(u))?.focus();
  } else u.show(defaultEntry(u), 'item');
}
