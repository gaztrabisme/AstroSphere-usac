// Tiện ích dựng DOM gọn nhẹ (không dùng framework).

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown>;

const PROPS = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'min', 'max', 'step', 'type', 'name', 'htmlFor', 'tabIndex']);

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'text') el.textContent = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (PROPS.has(k)) (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

let uid = 0;
export const newId = (p = 'id') => `${p}-${++uid}`;

/** Hộp kiểm kèm nhãn và chú thích (title). */
export function checkbox(label: string, checked: boolean, onChange: (v: boolean) => void, opts: { tip?: string; swatch?: string } = {}) {
  const id = newId('cb');
  const input = h('input', { type: 'checkbox', id, checked, onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked) });
  const lbl = h(
    'label',
    { class: 'check', htmlFor: id, title: opts.tip },
    input,
    opts.swatch ? h('span', { class: 'swatch', style: { background: opts.swatch }, 'aria-hidden': 'true' }) : null,
    h('span', { text: label }),
  );
  return { el: lbl, input };
}

export function button(label: string, onClick: () => void, opts: { cls?: string; title?: string; aria?: string; icon?: string } = {}) {
  return h(
    'button',
    { type: 'button', class: `btn ${opts.cls ?? ''}`.trim(), title: opts.title, 'aria-label': opts.aria ?? (opts.icon ? label : undefined), onclick: onClick },
    opts.icon ? h('span', { class: 'btn__icon', 'aria-hidden': 'true', text: opts.icon }) : null,
    h('span', { class: 'btn__text', text: label }),
  );
}

/** Nhóm có tiêu đề trong bảng điều khiển. */
export function fieldset(title: string, ...children: Child[]) {
  return h('fieldset', { class: 'group' }, h('legend', { text: title }), ...children);
}
