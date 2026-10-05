// Hộp xác nhận "Đặt lại mọi thứ?" (quyết định của chủ dự án 2026-10-05, review-2 #6): một lần bấm nhầm vào "Đặt lại"
// (trên điện thoại nút nằm sát công tắc chế độ) không còn xóa mất vị trí, thời gian và các sao người dùng đã thêm.
//
// <dialog> gốc mở bằng showModal(): có bẫy tiêu điểm, Esc là "Hủy" (sự kiện cancel), tiêu điểm mặc định ở "Hủy"
// (lựa chọn an toàn) và trả về nút đã mở hộp khi đóng. Dựng lười ở lần mở đầu tiên.

import { t } from '../i18n';
import { button, h } from './dom';

export interface ResetConfirm {
  /** Mở hộp xác nhận; `onConfirm` chỉ chạy khi người dùng bấm "Đặt lại". */
  open(): void;
  isOpen(): boolean;
}

export function resetConfirm(onConfirm: () => void): ResetConfirm {
  let dlg: HTMLDialogElement | null = null;
  let cancelBtn: HTMLButtonElement | null = null;
  let opener: HTMLElement | null = null;

  function build(): HTMLDialogElement {
    const d = h(
      'dialog',
      { class: 'dialog dialog--confirm', id: 'dlg-reset', 'aria-labelledby': 'dlg-reset-title', 'aria-describedby': 'dlg-reset-body' },
      h('header', { class: 'dialog__head' }, h('h2', { id: 'dlg-reset-title', text: t('resetConfirm.title') })),
      h(
        'div',
        { class: 'dialog__content', id: 'dlg-reset-body' },
        h('p', { class: 'confirm__line' }, h('strong', { text: t('resetConfirm.resetsLabel') }), ` ${t('resetConfirm.resets')}`),
        h('p', { class: 'confirm__line' }, h('strong', { text: t('resetConfirm.keepsLabel') }), ` ${t('resetConfirm.keeps')}`),
      ),
    ) as HTMLDialogElement;
    // "Hủy" đứng trước (đọc trước, tiêu điểm mặc định); "Đặt lại" là nút chính màu cam ở cuối.
    cancelBtn = button(t('resetConfirm.cancel'), () => d.close('cancel'), { cls: 'confirm__btn', guide: 'resetCancel' }) as HTMLButtonElement;
    cancelBtn.autofocus = true;
    const okBtn = button(t('resetConfirm.confirm'), () => d.close('confirm'), { cls: 'btn--primary confirm__btn', guide: 'resetConfirm' });
    d.append(h('footer', { class: 'dialog__foot confirm__foot' }, cancelBtn, okBtn));
    // Bấm ra ngoài hộp (nền mờ) = Hủy.
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close('cancel');
    });
    d.addEventListener('close', () => {
      const confirmed = d.returnValue === 'confirm';
      if (confirmed) onConfirm();
      // Trả tiêu điểm về nút đã mở hộp (AGENTS.md › Accessibility), kể cả khi trình duyệt không tự làm.
      if (opener?.isConnected) opener.focus();
      opener = null;
    });
    document.body.append(d);
    return d;
  }

  return {
    open() {
      if (dlg?.open) return;
      const a = document.activeElement;
      opener = a instanceof HTMLElement && a !== document.body ? a : null;
      dlg ??= build();
      dlg.returnValue = '';
      dlg.showModal();
      cancelBtn?.focus();
    },
    isOpen: () => !!dlg?.open,
  };
}
