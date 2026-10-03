// Hộp thoại Trợ giúp và Giới thiệu (dùng phần tử <dialog> gốc: có bẫy tiêu điểm và phím Esc).

import { t, tList } from '../i18n';
import { h } from './dom';

/** Dựng nội dung từ danh sách dòng: "## " → tiêu đề, "- " → mục danh sách, "| a | b" → hàng bảng, còn lại → đoạn văn. */
function renderLines(lines: string[]): HTMLElement {
  const root = h('div', { class: 'dialog__content' });
  let ul: HTMLUListElement | null = null;
  let table: HTMLTableElement | null = null;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!ul) root.append((ul = h('ul')));
      ul.append(h('li', { text: line.slice(2) }));
      continue;
    }
    ul = null;
    if (line.startsWith('|')) {
      if (!table) root.append((table = h('table', { class: 'keys' })));
      const cells = line.split('|').slice(1).map((c) => c.trim());
      table.append(h('tr', null, h('th', null, h('kbd', { text: cells[0] })), h('td', { text: cells[1] ?? '' })));
      continue;
    }
    table = null;
    if (line.startsWith('## ')) root.append(h('h3', { text: line.slice(3) }));
    else root.append(h('p', { text: line }));
  }
  return root;
}

function makeDialog(id: string, title: string, lines: string[]): HTMLDialogElement {
  const dlg = h(
    'dialog',
    { class: 'dialog', id, 'aria-labelledby': `${id}-title` },
    h(
      'header',
      { class: 'dialog__head' },
      h('h2', { id: `${id}-title`, text: title }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('dialog.close'), title: t('dialog.close'), text: '×', onclick: () => dlg.close() }),
    ),
    renderLines(lines),
    h('footer', { class: 'dialog__foot' }, h('button', { type: 'button', class: 'btn btn--primary', text: t('dialog.ok'), onclick: () => dlg.close() })),
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
  return {
    help: () => help.showModal(),
    about: () => about.showModal(),
    isOpen: () => help.open || about.open,
  };
}
