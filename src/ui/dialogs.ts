// Hộp thoại Trợ giúp và Giới thiệu (dùng phần tử <dialog> gốc: có bẫy tiêu điểm và phím Esc).
//
// Nội dung lấy từ vi.json dưới dạng danh sách dòng với cú pháp đánh dấu gọn:
//   "## Tiêu đề"            → tiêu đề mục
//   "### Tiêu đề phụ"       → tiêu đề nhỏ
//   "- Mục"                 → mục danh sách
//   "|| Cột 1 | Cột 2"      → hàng tiêu đề bảng;  "| Phím | Mô tả" → hàng bảng
//   "$$ Chú thích :: TeX"   → thẻ công thức (các dòng liền nhau gộp thành lưới)
//   còn lại                 → đoạn văn
// Trong một dòng: **chữ đậm**, \( TeX \) công thức trong dòng, {{#màu}} ô màu.
// Công thức được dựng bằng KaTeX (đóng gói kèm ứng dụng, chỉ tải khi mở hộp thoại lần đầu).

import { t, tList } from '../i18n';
import { h } from './dom';

const INLINE = /(\*\*.+?\*\*|\\\(.+?\\\)|\{\{#[0-9a-fA-F]{3,8}\}\})/g;

function mathSpan(tex: string, display: boolean): HTMLElement {
  // Hiện mã TeX tạm thời cho tới khi KaTeX được tải xong.
  return h('span', { class: display ? 'math math--display' : 'math', 'data-tex': tex, 'data-display': display ? '1' : '0', text: tex });
}

function inline(text: string): (Node | string)[] {
  const out: (Node | string)[] = [];
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) out.push(h('strong', { text: part.slice(2, -2) }));
    else if (part.startsWith('\\(') && part.endsWith('\\)')) out.push(mathSpan(part.slice(2, -2).trim(), false));
    else if (part.startsWith('{{#')) out.push(h('span', { class: 'swatch swatch--inline', style: { background: part.slice(2, -2) }, 'aria-hidden': 'true' }));
    else out.push(part);
  }
  return out;
}

function renderLines(lines: string[]): HTMLElement {
  const root = h('div', { class: 'dialog__content' });
  let ul: HTMLUListElement | null = null;
  let table: HTMLTableElement | null = null;
  let grid: HTMLDivElement | null = null;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!ul) root.append((ul = h('ul')));
      ul.append(h('li', null, ...inline(line.slice(2))));
      continue;
    }
    ul = null;
    if (line.startsWith('|')) {
      if (!table) root.append((table = h('table', { class: 'keys' })));
      const header = line.startsWith('||');
      const cells = line.replace(/^\|\|?/, '').split('|').map((c) => c.trim());
      table.append(
        header
          ? h('tr', null, ...cells.map((c) => h('th', { scope: 'col', text: c })))
          : h('tr', null, h('td', null, ...cells[0].split(' ').map((k) => h('kbd', { text: k }))), h('td', null, ...inline(cells[1] ?? ''))),
      );
      continue;
    }
    table = null;
    if (line.startsWith('$$')) {
      if (!grid) root.append((grid = h('div', { class: 'formula-grid' })));
      const body = line.slice(2).trim();
      const cut = body.indexOf('::');
      const caption = cut >= 0 ? body.slice(0, cut).trim() : '';
      const tex = (cut >= 0 ? body.slice(cut + 2) : body).trim();
      grid.append(
        h(
          'figure',
          { class: `formula${tex.length > 60 ? ' formula--wide' : ''}` },
          caption ? h('figcaption', null, ...inline(caption)) : null,
          mathSpan(tex, true),
        ),
      );
      continue;
    }
    grid = null;
    if (line.startsWith('### ')) root.append(h('h4', null, ...inline(line.slice(4))));
    else if (line.startsWith('## ')) root.append(h('h3', null, ...inline(line.slice(3))));
    else root.append(h('p', null, ...inline(line)));
  }
  return root;
}

type Katex = typeof import('katex').default;
let katexReady: Promise<Katex> | null = null;

/** Tải KaTeX (một lần) rồi dựng mọi công thức còn đang ở dạng mã TeX. */
function renderMath(root: HTMLElement): void {
  const pending = [...root.querySelectorAll<HTMLElement>('.math[data-tex]')];
  if (!pending.length) return;
  katexReady ??= Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([mod]) => mod.default);
  katexReady
    .then((katex) => {
      for (const el of pending) {
        const tex = el.dataset.tex!;
        katex.render(tex, el, { displayMode: el.dataset.display === '1', throwOnError: false, output: 'htmlAndMathml' });
        el.removeAttribute('data-tex');
      }
    })
    .catch(() => {
      /* Không tải được KaTeX: giữ nguyên mã TeX đã hiển thị */
    });
}

function makeDialog(id: string, title: string, lines: string[], extra: HTMLElement[] = []): HTMLDialogElement {
  const content = renderLines(lines);
  const dlg = h(
    'dialog',
    { class: 'dialog', id, 'aria-labelledby': `${id}-title` },
    h(
      'header',
      { class: 'dialog__head' },
      h('h2', { id: `${id}-title`, text: title }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('dialog.close'), title: t('dialog.close'), text: '×', onclick: () => dlg.close() }),
    ),
    content,
    h('footer', { class: 'dialog__foot' }, ...extra, h('button', { type: 'button', class: 'btn btn--primary', text: t('dialog.ok'), onclick: () => dlg.close() })),
  );
  // Bấm ra ngoài hộp thoại để đóng
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  document.body.append(dlg);
  return dlg;
}

export function createDialogs() {
  const help = makeDialog('dlg-help', t('help.title'), tList('help.body'));
  const about = makeDialog('dlg-about', t('about.title'), tList('about.body'));
  const open = (dlg: HTMLDialogElement) => {
    dlg.showModal();
    renderMath(dlg);
  };
  return {
    help: () => open(help),
    about: () => open(about),
    isOpen: () => help.open || about.open,
  };
}
