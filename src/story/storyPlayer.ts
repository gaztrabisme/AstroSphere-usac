// Trình phát hành trình (tải động): thẻ bước — tấm trượt dưới đáy trên điện thoại, thẻ gọn neo dưới khung nhìn trên máy tính.

import './story.css';
import { classify, equatorialToHorizontal, fmtDeg, fmtDegSigned, fmtHMS, fmtLat, norm360, poleAltitude } from '../astro';
import { t, tList } from '../i18n';
import { resolveSelection } from '../selection';
import { lstOf, type AppState } from '../state';
import { clear, h } from '../ui/dom';
import { applyPreset, applyStep } from './apply';
import { CHAPTERS, STORY_STARS, stepKey, type ReadoutKey, type StepDef } from './chapters';
import { readProgress, writeProgress, type StoryProgress } from './progress';
import type { StoryHost, ViewKey } from './types';

export interface PlayerOptions {
  /** Gọi sau khi đóng (để hiện lại chip "Tiếp tục" nếu còn dở). */
  onClose(): void;
}

export interface Player {
  open(c: number, s: number): void;
  close(restore: boolean): void;
  isOpen(): boolean;
  onKey(e: KeyboardEvent): boolean;
}

const PHONE = '(max-width: 900px)';
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const STAR_NAME: Record<number, string> = {
  [STORY_STARS.polaris]: 'story.stars.polaris',
  [STORY_STARS.betelgeuse]: 'story.stars.betelgeuse',
  [STORY_STARS.gacrux]: 'story.stars.gacrux',
};
const STAR_KEYS: ReadoutKey[] = ['ra', 'dec', 'ha', 'az', 'alt', 'status'];

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

const isPhone = () => window.matchMedia?.(PHONE).matches ?? false;

export function createPlayer(host: StoryHost, opts: PlayerOptions): Player {
  const { store } = host;
  let c = 0;
  let s = 0;
  let openFlag = false;
  let snapshot: AppState | null = null;
  let prevView: ViewKey | null = null;
  let opener: HTMLElement | null = null;
  let collapsed = false;
  let autoCollapsed = false;
  let applying = false;
  let unsub: (() => void) | null = null;
  let timer = 0;
  let progress: StoryProgress = readProgress() ?? { c: 0, s: 0, done: [] };

  // ------------------------------------------------------------ Khung thẻ
  const toggleBtn = h('button', { type: 'button', class: 'story__toggle', 'aria-expanded': 'true', onclick: () => setCollapsed(!collapsed, false) });
  const chapterBtns = CHAPTERS.map((ch, i) =>
    h('button', {
      type: 'button',
      class: 'story__chapter',
      text: String(i + 1),
      title: t('story.ui.chapterTip', { c: i + 1, title: t(`story.${ch.id}.title`) }),
      'aria-label': t('story.ui.chapterTip', { c: i + 1, title: t(`story.${ch.id}.title`) }),
      onclick: () => go(i, 0),
    }),
  );
  const chapters = h('div', { class: 'story__chapters', role: 'group', 'aria-label': t('story.ui.chaptersAria') }, ...chapterBtns);
  const progressText = h('span', { class: 'story__progress-text' });
  const dots = h('span', { class: 'story__dots', 'aria-hidden': 'true' });
  const mini = h('span', { class: 'story__mini', 'aria-hidden': 'true' });
  const progressEl = h('div', { class: 'story__progress' }, progressText, dots);

  const title = h('h2', { class: 'story__title', tabindex: '-1' });
  const chapterTitle = h('p', { class: 'story__kicker' });
  const body = h('p', { class: 'story__body' });
  const noticeText = h('span');
  const notice = h('aside', { class: 'story__notice' }, h('strong', { text: t('story.ui.notice') }), ' ', noticeText);
  const live = h('div', { class: 'story__live', 'aria-live': 'polite' }, chapterTitle, title, body, notice);

  const readoutStar = h('p', { class: 'story__readout-star' });
  const readoutList = h('dl', { class: 'story__readout-list' });
  const readout = h('section', { class: 'story__readout', 'aria-label': t('story.ui.readout') }, readoutStar, readoutList);
  const chips = h('div', { class: 'story__try' });
  const quiz = h('div', { class: 'story__quiz' });
  const endBox = h('div', { class: 'story__end' });
  const scroll = h('div', { class: 'story__scroll' }, live, readout, chips, quiz, endBox);

  const prevBtn = h('button', { type: 'button', class: 'story__btn', text: t('story.ui.prev'), onclick: () => step(-1) });
  const nextBtn = h('button', { type: 'button', class: 'story__btn story__btn--primary', text: t('story.ui.next'), onclick: () => step(1) });
  const exitBtn = h('button', { type: 'button', class: 'story__btn story__btn--ghost', text: t('story.ui.exit'), title: t('story.ui.exitTip'), onclick: () => close(true) });
  const nav = h('div', { class: 'story__nav' }, exitBtn, h('span', { class: 'story__spacer' }), prevBtn, nextBtn);

  const el = h(
    'section',
    { class: 'story', 'aria-label': t('story.ui.aria') },
    h('div', { class: 'story__head' }, toggleBtn, progressEl, mini, chapters),
    scroll,
    nav,
  );

  // ------------------------------------------------------------ Bố cục: --sheet-h và vị trí khung nhìn
  const root = document.documentElement;
  let lastMeasure = '';
  const measure = () => {
    if (!openFlag) return;
    const views = host.appRoot.querySelector<HTMLElement>('.views');
    const top = views ? Math.round(views.getBoundingClientRect().top + window.scrollY) : 0;
    const sheet = Math.max(0, Math.ceil(window.innerHeight - el.getBoundingClientRect().top));
    const key = `${top}|${sheet}`;
    if (key === lastMeasure) return;
    lastMeasure = key;
    if (views) root.style.setProperty('--story-views-top', `${top}px`);
    root.style.setProperty('--sheet-h', `${sheet}px`);
    // Khung nhìn đổi chiều cao → báo cho cảnh 3D (sự kiện tổng hợp, không kích hoạt lại vòng đo).
    window.dispatchEvent(new Event('resize'));
  };
  let measuring = false;
  const scheduleMeasure = () => {
    if (measuring) return;
    measuring = true;
    requestAnimationFrame(() => {
      measuring = false;
      measure();
    });
  };
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleMeasure) : null;
  const onWinResize = (e: Event) => {
    if (e.isTrusted) scheduleMeasure();
  };

  function setCollapsed(v: boolean, auto: boolean): void {
    collapsed = v;
    autoCollapsed = v && auto;
    el.classList.toggle('is-collapsed', v);
    toggleBtn.setAttribute('aria-expanded', String(!v));
    const label = t(v ? 'story.ui.expand' : 'story.ui.collapse');
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.title = label;
  }

  // ------------------------------------------------------------ Số liệu trực tiếp (≈10 Hz)
  const cells = new Map<ReadoutKey, HTMLElement>();
  let readoutKeys: ReadoutKey[] = [];

  function buildReadout(keys: ReadoutKey[]): void {
    readoutKeys = keys;
    cells.clear();
    clear(readoutList);
    readout.hidden = keys.length === 0;
    readoutStar.hidden = !keys.some((k) => STAR_KEYS.includes(k));
    for (const k of keys) {
      const v = h('dd');
      cells.set(k, v);
      readoutList.append(h('div', { class: 'story__kv' }, h('dt', { text: t(`story.ui.readoutLabel.${k}`) }), v));
    }
    updateReadout();
  }

  function updateReadout(): void {
    timer = 0;
    if (!openFlag || readoutKeys.length === 0) return;
    const st = store.state;
    const lst = lstOf(st);
    const sel = resolveSelection(st);
    const hipNow = st.selected?.kind === 'user' ? st.stars.find((x) => x.id === (st.selected as { id: string }).id)?.hip : undefined;
    setText(readoutStar, sel ? (hipNow && STAR_NAME[hipNow] ? t(STAR_NAME[hipNow]) : sel.name) : t('story.ui.noStar'));
    const hz = sel ? equatorialToHorizontal(sel.ra, sel.dec, st.lat, lst) : null;
    for (const [k, cell] of cells) {
      let v = '—';
      if (k === 'lat') v = fmtLat(st.lat);
      else if (k === 'pole') v = fmtDeg(poleAltitude(st.lat));
      else if (k === 'lst') v = fmtHMS(lst, { seconds: false });
      else if (sel && hz) {
        if (k === 'ra') v = fmtHMS(sel.ra, { seconds: false });
        else if (k === 'dec') v = fmtDegSigned(sel.dec, 1);
        else if (k === 'ha') v = fmtHMS(hz.ha, { signed: true, seconds: false });
        else if (k === 'az') v = `${fmtDeg(hz.az, 1)} (${t(`compass.${DIRS[Math.round(norm360(hz.az) / 45) % 8]}`)})`;
        else if (k === 'alt') v = fmtDegSigned(hz.alt, 1);
        else if (k === 'status') v = t(`visibility.${classify(sel.dec, st.lat)}`);
      }
      setText(cell, v);
    }
  }

  function onState(st: AppState, prev: AppState): void {
    if (!timer) timer = window.setTimeout(updateReadout, 100);
    // Điện thoại: tự thu gọn khi người dùng cho chạy hoạt ảnh; mở lại khi dừng.
    if (st.playing !== prev.playing && !applying) {
      if (st.playing && !collapsed && isPhone()) setCollapsed(true, true);
      else if (!st.playing && autoCollapsed) setCollapsed(false, false);
    }
  }

  // ------------------------------------------------------------ Dựng một bước
  const stepDef = (): StepDef => CHAPTERS[c].steps[s];

  function render(): void {
    const ch = CHAPTERS[c];
    const sd = stepDef();
    const n = ch.steps.length;
    setText(progressText, t('story.ui.progress', { c: c + 1, s: s + 1, n }));
    progressEl.setAttribute('aria-label', t('story.ui.progress', { c: c + 1, s: s + 1, n }));
    clear(dots);
    for (let i = 0; i < n; i++) dots.append(h('span', { class: `story__dot${i < s ? ' is-done' : i === s ? ' is-current' : ''}` }));
    chapterBtns.forEach((b, i) => (i === c ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));

    setText(chapterTitle, t(`story.${ch.id}.title`));
    setText(title, t(stepKey(ch, sd, 'title')));
    setText(mini, t(stepKey(ch, sd, 'title')));
    setText(body, t(stepKey(ch, sd, 'body')));
    const nk = stepKey(ch, sd, 'notice');
    const hasNotice = t(nk) !== nk;
    notice.hidden = !hasNotice;
    setText(noticeText, hasNotice ? t(nk) : '');

    buildReadout(sd.readout ?? []);

    clear(chips);
    chips.hidden = !sd.actions?.length;
    if (sd.actions?.length) {
      chips.append(h('span', { class: 'story__try-label', text: t('story.ui.tryLabel') }));
      for (const a of sd.actions) {
        chips.append(
          h('button', {
            type: 'button',
            class: 'story__chip',
            text: t(stepKey(ch, sd, `try.${a.key}`)),
            onclick: () => applyPreset(host, a.preset, null),
          }),
        );
      }
    }

    clear(quiz);
    quiz.hidden = !sd.quiz;
    if (sd.quiz) {
      const correct = sd.quiz.correct;
      const feedback = h('p', { class: 'story__feedback', role: 'status' });
      const explain = h('p', { class: 'story__explain', hidden: true, text: t(stepKey(ch, sd, 'explain')) });
      const opts = tList(stepKey(ch, sd, 'options'));
      const list = h('div', { class: 'story__options', role: 'group', 'aria-label': t('story.ui.quizLabel') });
      opts.forEach((label, i) => {
        const b = h('button', {
          type: 'button',
          class: 'story__option',
          text: label,
          onclick: () => {
            const ok = i === correct;
            b.classList.add(ok ? 'is-right' : 'is-wrong');
            b.setAttribute('aria-pressed', 'true');
            feedback.className = `story__feedback ${ok ? 'is-right' : 'is-wrong'}`;
            setText(feedback, t(ok ? 'story.ui.right' : 'story.ui.wrong'));
            if (ok) {
              explain.hidden = false;
              list.querySelectorAll('button').forEach((x) => x !== b && x.classList.remove('is-wrong'));
            }
          },
        });
        list.append(b);
      });
      quiz.append(list, feedback, explain);
    }

    clear(endBox);
    endBox.hidden = !sd.end;
    if (sd.end) {
      endBox.append(
        h('button', {
          type: 'button',
          class: 'story__btn story__btn--primary',
          text: t('story.ui.review'),
          onclick: () => {
            close(false);
            host.openLearning();
          },
        }),
        h('button', { type: 'button', class: 'story__btn', text: t('story.ui.explore'), onclick: () => close(false) }),
        h('button', { type: 'button', class: 'story__btn story__btn--ghost', text: t('story.ui.restart'), onclick: () => go(0, 0) }),
      );
    }

    prevBtn.disabled = c === 0 && s === 0;
    nextBtn.hidden = !!sd.end;
  }

  function go(ci: number, si: number): void {
    c = Math.max(0, Math.min(CHAPTERS.length - 1, ci));
    s = Math.max(0, Math.min(CHAPTERS[c].steps.length - 1, si));
    applying = true;
    try {
      applyStep(host, stepDef());
    } finally {
      applying = false;
    }
    if (autoCollapsed || isPhone()) setCollapsed(false, false);
    render();
    // Lưu tiến độ; đánh dấu chương đã đi hết khi tới bước cuối của nó.
    const ch = CHAPTERS[c];
    const done = new Set(progress.done);
    if (s === ch.steps.length - 1) done.add(ch.id);
    progress = { c, s, done: [...done] };
    writeProgress(progress);
    scroll.scrollTop = 0;
    title.focus({ preventScroll: true });
    el.dataset.step = `${c + 1}.${s + 1}`;
  }

  function step(d: 1 | -1): boolean {
    if (d > 0) {
      if (stepDef().end) return false;
      if (s + 1 < CHAPTERS[c].steps.length) go(c, s + 1);
      else if (c + 1 < CHAPTERS.length) go(c + 1, 0);
      else return false;
    } else {
      if (s > 0) go(c, s - 1);
      else if (c > 0) go(c - 1, CHAPTERS[c - 1].steps.length - 1);
      else return false;
    }
    return true;
  }

  // ------------------------------------------------------------ Phím
  function onKey(e: KeyboardEvent): boolean {
    if (!openFlag || e.ctrlKey || e.metaKey || e.altKey) return false;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return false;
    const inWidget = !!target?.closest?.('[role=tablist],[role=slider],[role=radiogroup]');
    let handled = false;
    switch (e.key) {
      case 'PageDown':
        handled = step(1);
        break;
      case 'ArrowRight':
        if (!inWidget) handled = step(1);
        break;
      case 'Enter':
        // Enter trên nút / liên kết giữ nguyên hành vi bấm.
        if (!target?.closest?.('button,a,summary')) handled = step(1);
        break;
      case 'PageUp':
        handled = step(-1);
        break;
      case 'ArrowLeft':
        if (!inWidget) handled = step(-1);
        break;
      case 'Escape':
        close(true);
        handled = true;
        break;
    }
    if (handled) e.preventDefault();
    // Phím điều hướng vẫn thuộc về câu chuyện kể cả khi đã ở bước đầu/cuối (không tua giờ ngoài ý muốn).
    return handled || ['PageDown', 'PageUp'].includes(e.key) || (!inWidget && ['ArrowRight', 'ArrowLeft'].includes(e.key));
  }

  /**
   * Dự phòng: tự bắt phím điều hướng (pha capture) khi main.ts chưa chuyển phím cho story.onKey.
   * Khi đã xử lý thì chặn lan truyền, nên không bao giờ bị xử lý hai lần. Esc chỉ khi không có hộp thoại / ngăn Ôn tập đang mở.
   */
  const capture = (e: KeyboardEvent) => {
    if (!openFlag || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') {
      const learn = document.getElementById('learn');
      if (learn && !learn.hidden) return;
    }
    if (onKey(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };

  // ------------------------------------------------------------ Mở / đóng
  function open(ci: number, si: number): void {
    if (!openFlag) {
      snapshot = store.state;
      const active = host.appRoot.querySelector<HTMLElement>('.views')?.dataset.active;
      prevView = active === 'sphere' || active === 'horizon' ? active : null;
      opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
      openFlag = true;
      setCollapsed(false, false);
      host.appRoot.append(el);
      document.body.classList.add('story-open');
      window.scrollTo(0, 0);
      unsub = store.subscribe(onState);
      ro?.observe(el);
      window.addEventListener('resize', onWinResize);
      window.addEventListener('keydown', capture, true);
    }
    go(ci, si);
    measure();
  }

  function close(restore: boolean): void {
    if (!openFlag) return;
    openFlag = false;
    unsub?.();
    unsub = null;
    if (timer) window.clearTimeout(timer);
    timer = 0;
    ro?.disconnect();
    window.removeEventListener('resize', onWinResize);
    window.removeEventListener('keydown', capture, true);
    el.remove();
    document.body.classList.remove('story-open');
    root.style.removeProperty('--sheet-h');
    root.style.removeProperty('--story-views-top');
    lastMeasure = '';
    if (restore && snapshot) {
      store.set(snapshot);
      if (prevView) host.showView(prevView);
    }
    snapshot = null;
    window.dispatchEvent(new Event('resize'));
    if (opener?.isConnected) opener.focus();
    opener = null;
    opts.onClose();
  }

  return { open, close, isOpen: () => openFlag, onKey };
}
