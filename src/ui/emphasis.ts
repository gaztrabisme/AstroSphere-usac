// Tô sáng liên kết phía giao diện (ux-brief §6): rê chuột hoặc chọn tiêu điểm (bàn phím) một con số → hình tương ứng
// trong hai khung nhìn đậm lên; rê chuột lên hình → con số tương ứng có lớp `is-linked`.
//
// Ba nguồn có thể cùng muốn tô sáng: con trỏ trên một ô, con trỏ trên một hình 3D, tiêu điểm bàn phím. Ưu tiên
// theo thứ tự đó, để rời chuột khỏi một ô không xóa tô sáng của ô đang có tiêu điểm bàn phím.

import { emphasisForUi, uiLinked, type EmphasisKey } from '../emphasis';
import { t } from '../i18n';
import type { Actions, Store } from '../state';
import { h } from './dom';

export type EmphasisSource = 'hover' | 'scene' | 'focus';

interface Bound {
  el: HTMLElement;
  key: string;
  linked: boolean;
}

const HINT_ID = 'emphasis-hint';
const bound: Bound[] = [];
const sources: Record<EmphasisSource, EmphasisKey | null> = { hover: null, scene: null, focus: null };
let subscribed = false;

/** Đặt khóa tô sáng của một nguồn và cập nhật store theo thứ tự ưu tiên con trỏ ô → con trỏ hình → tiêu điểm. */
export function setEmphasisSource(actions: Actions, src: EmphasisSource, key: EmphasisKey | null): void {
  sources[src] = key;
  actions.setEmphasis(sources.hover ?? sources.scene ?? sources.focus);
}

function ensureHint(): void {
  if (typeof document === 'undefined' || document.getElementById(HINT_ID)) return;
  document.body.append(h('p', { id: HINT_ID, class: 'sr-only', text: t('emphasis.hint') }));
}

function sync(e: EmphasisKey | null): void {
  for (const b of bound) {
    const on = uiLinked(b.key, e);
    if (on !== b.linked) {
      b.linked = on;
      b.el.classList.toggle('is-linked', on);
    }
  }
}

/**
 * Nối một ô số liệu / dòng thẻ thông tin (có `data-emphasis`) với tô sáng liên kết. Ô có khóa không ánh xạ tới
 * hình nào thì bỏ qua. Ô được nối nhận tabindex="0" và aria-describedby trỏ tới câu giải thích ẩn.
 */
export function bindEmphasis(el: HTMLElement, store: Store, actions: Actions): void {
  const key = el.dataset.emphasis ?? '';
  const k = emphasisForUi(key);
  if (!k) return;
  if (!subscribed) {
    subscribed = true;
    store.subscribe((s, prev) => {
      if (s.emphasis !== prev.emphasis) sync(s.emphasis);
    });
  }
  ensureHint();
  el.tabIndex = 0;
  const desc = el.getAttribute('aria-describedby');
  el.setAttribute('aria-describedby', desc ? `${desc} ${HINT_ID}` : HINT_ID);
  el.classList.add('is-linkable');
  bound.push({ el, key, linked: false });

  // Cảm ứng: pointerenter/pointerleave bao quanh lúc chạm → giữ ngón tay để xem trước.
  el.addEventListener('pointerenter', () => setEmphasisSource(actions, 'hover', k));
  el.addEventListener('pointerleave', () => {
    if (sources.hover === k) setEmphasisSource(actions, 'hover', null);
  });
  // Chỉ tiêu điểm "nhìn thấy được" (bàn phím): bấm chuột vào ô không để lại tô sáng dính sau khi rời chuột.
  el.addEventListener('focus', () => {
    let visible = true;
    try {
      visible = el.matches(':focus-visible');
    } catch {
      /* trình duyệt cũ: coi như bàn phím */
    }
    if (visible) setEmphasisSource(actions, 'focus', k);
  });
  el.addEventListener('blur', () => {
    if (sources.focus === k) setEmphasisSource(actions, 'focus', null);
  });
  sync(store.state.emphasis);
}
