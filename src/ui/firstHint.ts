// Gợi ý một lần trên khung nhìn chính: một bước kế tiếp đúng lúc, không phải chuỗi hướng dẫn.
// Ẩn vĩnh viễn khi người dùng đóng nó hoặc lần đầu chạm vào một khung nhìn 3D (đã làm đúng điều gợi ý).

import { t } from '../i18n';
import { h } from './dom';
import { readJson, writeJson } from './storage';

export const HINT_KEY = 'astrosphere.hint.v1';

const isTrue = (v: unknown): v is boolean => v === true;

export function hintSeen(): boolean {
  return readJson(HINT_KEY, isTrue, false);
}

/**
 * Gắn gợi ý vào `host` (khung giản đồ chân trời) nếu người dùng chưa thấy nó.
 * `canvases`: chạm vào một trong các vùng này cũng coi như đã hiểu gợi ý.
 * `focusAfter`: nơi nhận tiêu điểm nếu nút đóng đang được chọn khi gợi ý biến mất.
 */
export function mountFirstHint(host: HTMLElement, canvases: HTMLElement[], focusAfter: () => HTMLElement | null): void {
  if (hintSeen()) return;

  const text = h('span', { class: 'firsthint__text' });
  const close = h('button', {
    type: 'button',
    class: 'icon-btn firsthint__x',
    'aria-label': t('firstHint.close'),
    title: t('firstHint.close'),
    text: '×',
  });
  // role=status (lịch sự): chữ được đặt sau khi vùng đã có trong DOM để trình đọc màn hình đọc nó một lần.
  const el = h('div', { class: 'firsthint', role: 'status' }, text, close);

  const dismiss = () => {
    writeJson(HINT_KEY, true);
    const hadFocus = el.contains(document.activeElement);
    el.remove();
    for (const c of canvases) c.removeEventListener('pointerdown', dismiss);
    if (hadFocus) focusAfter()?.focus();
  };
  close.addEventListener('click', dismiss);
  for (const c of canvases) c.addEventListener('pointerdown', dismiss);

  host.append(el);
  setTimeout(() => {
    if (!el.isConnected) return;
    text.textContent = t('firstHint.text');
    el.dataset.ready = '';
  }, 150);
}
