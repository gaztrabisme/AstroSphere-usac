// Gợi ý thao tác: MỘT dòng chú thích nằm dưới khung nhìn chính (không phải lớp nổi che cảnh — review-1 B4, E3).
// Lần đầu vào trang dòng này đậm (màu chữ thường); sau lần đầu người dùng kéo hoặc bấm vào một khung nhìn 3D
// (đã làm đúng điều gợi ý) nó lùi về màu phụ và trạng thái được nhớ (`astrosphere.hint.v1`).

import { readJson, writeJson } from './storage';

export const HINT_KEY = 'astrosphere.hint.v1';

const isTrue = (v: unknown): v is boolean => v === true;

export function hintSeen(): boolean {
  return readJson(HINT_KEY, isTrue, false);
}

/**
 * `caption`: dòng gợi ý dưới khung nhìn. `canvases`: chạm vào một trong các vùng này = đã hiểu gợi ý.
 * Lớp `is-new` làm dòng gợi ý nổi hơn cho tới lần tương tác đầu tiên.
 */
export function bindHintCaption(caption: HTMLElement, canvases: HTMLElement[]): void {
  if (hintSeen()) return;
  caption.classList.add('is-new');
  const done = () => {
    writeJson(HINT_KEY, true);
    caption.classList.remove('is-new');
    for (const c of canvases) c.removeEventListener('pointerdown', done);
  };
  for (const c of canvases) c.addEventListener('pointerdown', done);
}
