// Điểm vào của phần câu chuyện: nhỏ và tải ngay — màn hình mở đầu, chip "Tiếp tục", và tải động trình phát hành trình.

import { t } from '../i18n';
import { h } from '../ui/dom';
import { createHero, heroPrimary } from './hero';
import { isFinished, markSeen, readProgress, readSeen } from './progress';
import type { Player } from './storyPlayer';
import type { StoryHandle, StoryHost } from './types';

/** `?story=2.4` → { c: 1, s: 3 } (chương/bước tính từ 1 trên URL). */
function parseDeepLink(v: string | null): { c: number; s: number } | null {
  const m = v?.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  return { c: Math.max(0, Number(m[1]) - 1), s: Math.max(0, Number(m[2] ?? 1) - 1) };
}

export function mountStory(host: StoryHost): StoryHandle {
  let player: Player | null = null;
  let loading: Promise<Player> | null = null;
  let hero: HTMLElement | null = null;
  let heroOpener: HTMLElement | null = null;
  let inerted: HTMLElement[] = [];
  let chip: HTMLElement | null = null;

  function loadPlayer(): Promise<Player> {
    loading ??= import('./storyPlayer').then((m) => (player = m.createPlayer(host, { onClose: () => maybeShowChip() })));
    return loading;
  }

  function openAt(c: number, s: number): void {
    hideChip();
    void loadPlayer().then((p) => p.open(c, s));
  }

  function open(chapter?: number): void {
    if (chapter !== undefined) return openAt(chapter, 0);
    const p = readProgress();
    if (p && !isFinished(p)) openAt(p.c, p.s);
    else openAt(0, 0);
  }

  // ------------------------------------------------------------ Chip "Tiếp tục chương X · bước Y" (không chặn khám phá)
  function hideChip(): void {
    chip?.remove();
    chip = null;
  }

  function maybeShowChip(): void {
    const p = readProgress();
    if (!p || isFinished(p) || hero || player?.isOpen()) return;
    hideChip();
    chip = h(
      'div',
      { class: 'story-resume' },
      h('button', {
        type: 'button',
        class: 'story-resume__go',
        text: t('story.ui.resume', { c: p.c + 1, s: p.s + 1 }),
        onclick: () => open(),
      }),
      h('button', {
        type: 'button',
        class: 'story-resume__close',
        'aria-label': t('story.ui.resumeDismiss'),
        title: t('story.ui.resumeDismiss'),
        text: '×',
        onclick: () => hideChip(),
      }),
    );
    host.appRoot.append(chip);
  }

  // ------------------------------------------------------------ Màn hình mở đầu
  function closeHero(): void {
    if (!hero) return;
    hero.remove();
    hero = null;
    for (const el of inerted) el.inert = false;
    inerted = [];
    host.suspendRender('hero', false);
  }

  function showHero(): void {
    if (hero) return;
    if (player?.isOpen()) player.close(true);
    hideChip();
    heroOpener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const progress = readProgress();
    hero = createHero({
      progress: progress && !isFinished(progress) ? progress : null,
      onStart: () => {
        markSeen();
        closeHero();
        heroOpener = null;
        open();
      },
      onExplore: () => {
        markSeen();
        closeHero();
        if (heroOpener?.isConnected) heroOpener.focus();
        heroOpener = null;
        maybeShowChip();
      },
    });
    for (const child of Array.from(host.appRoot.children)) {
      if (child instanceof HTMLElement && !child.inert) {
        child.inert = true;
        inerted.push(child);
      }
    }
    host.appRoot.append(hero);
    host.suspendRender('hero', true);
    heroPrimary(hero)?.focus();
  }

  function maybeShowHero(): void {
    let q: URLSearchParams;
    try {
      q = new URLSearchParams(window.location.search);
    } catch {
      q = new URLSearchParams();
    }
    const deep = parseDeepLink(q.get('story'));
    if (deep) return openAt(deep.c, deep.s);
    if (q.get('intro') === '1') return showHero();
    if (q.get('explore') !== '1' && !readSeen()) return showHero();
    maybeShowChip();
  }

  return {
    maybeShowHero,
    showHero,
    open,
    isOpen: () => player?.isOpen() ?? false,
    onKey: (e) => player?.onKey(e) ?? false,
  };
}
