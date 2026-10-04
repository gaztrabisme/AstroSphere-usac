// Nhãn chữ HTML (CSS2D) — hiển thị tiếng Việt sắc nét, bật/tắt theo từng nhóm.
// Mỗi nhãn mang hạng ưu tiên tĩnh (`rank`) và kích thước hộp đã đo (`w`, `h`) để khung nhìn gỡ chồng chéo
// trong không gian màn hình mà không gọi getBoundingClientRect mỗi khung hình (xem declutter.ts, view.ts).

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LabelToggles } from '../state';

export type LabelGroup = Exclude<keyof LabelToggles, 'all'>;

export interface LabelData {
  group: LabelGroup;
  hideBelowHorizon: boolean;
  /**
   * Hạng ưu tiên tĩnh, nhỏ = quan trọng hơn: 0 số đo góc (tô sáng) · 10 hướng B/N/Đ/T · 11 thiên đỉnh, thiên cực ·
   * 20 tên vòng tròn · 25 nhãn phụ của vòng · 30 tên chòm sao · 40 + cấp sao: tên sao (sáng hơn trước).
   * Nhãn của đối tượng đang chọn luôn được xét đầu tiên (động, xem view.ts).
   */
  rank: number;
  /** Hộp nhãn (px, CSS) đã đo; 0 = cần đo lại (chữ đổi độ dài, đổi cỡ chữ trình chiếu). */
  w: number;
  h: number;
  /** Điểm neo gốc (center) — khung nhìn có thể đẩy nhãn ưu tiên cao vào trong mép rồi trả về giá trị này. */
  cx0: number;
  cy0: number;
  /** Đối tượng mà nhãn này gọi tên (để nhãn của đối tượng đang chọn được ưu tiên). */
  selKind: '' | 'user' | 'catalog' | 'sun';
  selId: string;
  selIdx: number;
}

export interface Label extends CSS2DObject {
  userData: LabelData;
}

const GROUP_RANK: Record<LabelGroup, number> = { angles: 0, directions: 10, poles: 11, circles: 20, stars: 40 };

export interface LabelOpts {
  color?: string;
  cls?: string;
  hideBelowHorizon?: boolean;
  anchor?: [number, number];
  /** Ghi đè hạng ưu tiên (mặc định theo nhóm, xem LabelData.rank). */
  rank?: number;
  /** Cấp sao (nhãn tên sao): sao sáng hơn được giữ khi chồng nhau. */
  mag?: number;
  /** Đối tượng mà nhãn gọi tên. */
  sel?: { kind: 'user'; id: string } | { kind: 'catalog'; index: number } | { kind: 'sun' };
}

/** Hạng ưu tiên mặc định (tách riêng để kiểm thử). */
export function labelRank(group: LabelGroup, opts: Pick<LabelOpts, 'rank' | 'mag' | 'cls'> = {}): number {
  if (opts.rank !== undefined) return opts.rank;
  if (group === 'stars' && opts.mag !== undefined) return GROUP_RANK.stars + Math.min(9, Math.max(-2, opts.mag));
  if (group === 'circles' && opts.cls?.includes('lbl--small')) return 25;
  return GROUP_RANK[group];
}

export function makeLabel(text: string, group: LabelGroup, opts: LabelOpts = {}): Label {
  const el = document.createElement('div');
  el.className = `lbl lbl--${group}${opts.cls ? ` ${opts.cls}` : ''}`;
  el.textContent = text;
  if (opts.color) el.style.color = opts.color;
  const obj = new CSS2DObject(el) as Label;
  // Điểm neo của nhãn (0,5; 0,5 = chính giữa). Nhãn tên sao đặt lệch sang phải để không che sao.
  if (opts.anchor) obj.center.set(opts.anchor[0], opts.anchor[1]);
  const sel = opts.sel;
  obj.userData = {
    group,
    hideBelowHorizon: opts.hideBelowHorizon ?? true,
    rank: labelRank(group, opts),
    w: 0,
    h: 0,
    cx0: obj.center.x,
    cy0: obj.center.y,
    selKind: sel ? sel.kind : '',
    selId: sel?.kind === 'user' ? sel.id : '',
    selIdx: sel?.kind === 'catalog' ? sel.index : -1,
  };
  return obj;
}

export function setLabelText(label: Label, text: string): void {
  const el = label.element;
  const old = el.textContent ?? '';
  if (old === text) return;
  el.textContent = text;
  // Chữ số Arial cùng bề rộng: chỉ đo lại khi độ dài đổi (tránh ép bố cục mỗi khung hình khi đang chạy).
  if (old.length !== text.length) label.userData.w = 0;
}
