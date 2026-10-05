// Codex (redesign-2 C) — phần tải lười: hộp thoại kiểu Mass Effect. Trái: danh mục và các mục (đã khám phá / mới /
// chưa khám phá) cùng dòng tiến độ. Phải: trang đọc (tiêu đề, câu dẫn, thân bài có công thức, sơ đồ, "Xem trong mô
// phỏng", mục liên quan). Điện thoại: danh sách → trang đọc, có nút quay lại.
//
// <dialog> gốc: bẫy tiêu điểm, Esc đóng trước mọi thứ khác, tiêu điểm trở về nút đã mở khi đóng.

import content from '../i18n/codex.vi.json';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { renderLines, renderMath } from '../ui/dialogs';
import { diagramSvg, type DiagramLabels } from './diagrams';
import { SIM } from './sim';
import { isDiscovered, isNew, markRead, onCodexChange, type CodexContext } from './triggers';

export interface CodexEntry {
  title: string;
  aka?: string;
  lede: string;
  body: string[];
  related: string[];
  sim?: string;
  figure?: string;
}

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
    const found = isDiscovered(id);
    btn.classList.toggle('is-locked', !found);
    btn.classList.toggle('is-new', isNew(id));
    const state = btn.querySelector<HTMLElement>('.cdx-item__state')!;
    state.textContent = !found ? t('codexUi.stateLocked') : isNew(id) ? t('codexUi.stateNew') : '';
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
        h('h3', { class: 'cdx-cat__title', id: `cdx-cat-${c.id}` }, h('span', { text: c.title }), count),
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
    const found = isDiscovered(id);
    const title = h('h3', {
      class: 'cdx-page__title',
      id: 'cdx-page-title',
      tabindex: '-1',
      text: e.title,
    });
    const figure = e.figure ? diagramSvg(id, labels(), ctx.store.state.lat, e.figure) : null;
    const fig = figure
      ? (() => {
          const f = h('figure', { class: 'cdx-figure' }, h('figcaption', { text: e.figure }));
          f.insertAdjacentHTML('afterbegin', figure);
          return f;
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
    const parts: (Node | null)[] = [
      back,
      h('p', { class: 'cdx-page__kicker', text: cat.title }),
      title,
      e.aka ? h('p', { class: 'cdx-page__aka', text: e.aka }) : null,
      h('p', {
        class: `cdx-page__state${found ? '' : ' is-locked'}`,
        text: found ? (wasNew ? t('codexUi.pageNew') : t('codexUi.pageFound')) : t('codexUi.pageLocked'),
      }),
      h('p', { class: 'cdx-page__lede', text: e.lede }),
      h('hr', { class: 'cdx-page__rule' }),
      fig,
      (() => {
        const body = renderLines(e.body);
        body.className = 'cdx-page__body';
        return body;
      })(),
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
            h('h4', { id: 'cdx-related-h', text: t('codexUi.related') }),
            h(
              'ul',
              { role: 'list' },
              ...e.related.map((r) =>
                h(
                  'li',
                  null,
                  h('button', {
                    type: 'button',
                    class: `cdx-rel${isDiscovered(r) ? '' : ' is-locked'}`,
                    text: ENTRIES[r]?.title ?? r,
                    onclick: () => show(r, { focus: 'page' }),
                  }),
                ),
              ),
            ),
          )
        : null,
    ];
    page.replaceChildren(...parts.filter((p): p is Node => p !== null));
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
