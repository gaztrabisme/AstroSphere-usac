// Màn hình mở đầu: hộp thoại toàn màn hình, hai lựa chọn — "Bắt đầu hành trình" hoặc "Khám phá tự do".

import './hero.css';
import logoUrl from '../assets/usac-logo.png';
import { t } from '../i18n';
import { h } from '../ui/dom';
import type { StoryProgress } from './progress';

export interface HeroOptions {
  /** Có tiến độ dở dang → nút chính đổi thành "Tiếp tục hành trình". */
  progress: StoryProgress | null;
  onStart(): void;
  onExplore(): void;
}

export function createHero(o: HeroOptions): HTMLElement {
  const resume = !!o.progress;
  const primary = h(
    'button',
    { type: 'button', class: 'hero__cta hero__cta--primary', onclick: () => o.onStart() },
    h('span', { class: 'hero__cta-label', text: t(resume ? 'hero.resume' : 'hero.start') }),
    h('span', {
      class: 'hero__cta-sub',
      text: resume && o.progress ? t('hero.resumeSub', { c: o.progress.c + 1, s: o.progress.s + 1 }) : t('hero.startSub'),
    }),
  );
  const secondary = h(
    'button',
    { type: 'button', class: 'hero__cta hero__cta--secondary', onclick: () => o.onExplore() },
    h('span', { class: 'hero__cta-label', text: t('hero.explore') }),
  );
  const el = h(
    'div',
    { class: 'hero', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hero-title', 'aria-describedby': 'hero-lead' },
    h(
      'div',
      { class: 'hero__inner' },
      h('img', { class: 'hero__logo', src: logoUrl, alt: t('hero.logoAlt'), width: 72, height: 72, decoding: 'async' }),
      h('p', { class: 'hero__kicker', text: t('hero.kicker') }),
      h('h1', { class: 'hero__title', id: 'hero-title', text: t('hero.title') }),
      h('p', { class: 'hero__lead', id: 'hero-lead', text: t('hero.lead') }),
      h('div', { class: 'hero__ctas' }, primary, secondary),
      h('p', { class: 'hero__slogan', text: t('hero.slogan') }),
    ),
  );
  el.addEventListener('keydown', (e) => {
    // Phím trong màn hình mở đầu không đi tiếp tới phím tắt toàn cục.
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      o.onExplore();
    }
  });
  return el;
}

/** Nút chính (để đặt tiêu điểm khi mở). */
export const heroPrimary = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('.hero__cta--primary');
