// Nhãn chữ HTML (CSS2D) — hiển thị tiếng Việt sắc nét, bật/tắt theo từng nhóm.

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LabelToggles } from '../state';

export type LabelGroup = Exclude<keyof LabelToggles, 'all'>;

export interface Label extends CSS2DObject {
  userData: { group: LabelGroup; hideBelowHorizon: boolean };
}

export function makeLabel(
  text: string,
  group: LabelGroup,
  opts: { color?: string; cls?: string; hideBelowHorizon?: boolean; anchor?: [number, number] } = {},
): Label {
  const el = document.createElement('div');
  el.className = `lbl lbl--${group}${opts.cls ? ` ${opts.cls}` : ''}`;
  el.textContent = text;
  if (opts.color) el.style.color = opts.color;
  const obj = new CSS2DObject(el) as Label;
  obj.userData = { group, hideBelowHorizon: opts.hideBelowHorizon ?? true };
  // Điểm neo của nhãn (0,5; 0,5 = chính giữa). Nhãn tên sao đặt lệch sang phải để không che sao.
  if (opts.anchor) obj.center.set(opts.anchor[0], opts.anchor[1]);
  return obj;
}

export function setLabelText(label: Label, text: string): void {
  if (label.element.textContent !== text) label.element.textContent = text;
}
