// Dựng một bước câu chuyện lên mô phỏng — chỉ qua Actions và scenario.ts, theo một thứ tự cố định (lặp lại vẫn cho cùng kết quả).

import { ensureConstellation, PLACES, selectHip } from '../scenario';
import type { Toggles } from '../state';
import { STORY_BASE_TOGGLES, type StepDef, type StepPreset } from './chapters';
import type { StoryHost } from './types';

/** Phần của StoryHost mà việc dựng bước cần (dễ giả lập trong kiểm thử). */
export type ApplyHost = Pick<StoryHost, 'store' | 'actions' | 'reducedMotion' | 'showView'>;

/**
 * Áp dụng một cấu hình.
 *  - `base` khác null (một bước): mọi hộp kiểm đặt theo bộ nền + cấu hình, luôn tạm dừng trước.
 *  - `base` null (một nút "Thử"): chỉ đổi những gì cấu hình nêu ra.
 */
export function applyPreset(host: ApplyHost, p: StepPreset, base: Toggles | null): void {
  const { store, actions } = host;
  const ctx = { store, actions };
  // 1. Tạm dừng
  if (base || p.motion) actions.pause();
  // 2. Vị trí (giữ kinh độ hiện tại nếu không nêu)
  if (p.place) {
    const pl = typeof p.place === 'string' ? PLACES[p.place] : p.place;
    actions.setLocation(pl.lat, pl.lon ?? store.state.lon);
  }
  // 3. Chòm sao
  for (const id of p.constellations ?? []) ensureConstellation(ctx, id);
  // 4. Hộp kiểm hiển thị — chỉ ghi những khóa khác giá trị hiện tại
  const want: Partial<Toggles> = base ? { ...base, ...p.toggles } : { ...p.toggles };
  for (const k of Object.keys(want) as (keyof Toggles)[]) {
    const v = want[k];
    if (v !== undefined && store.state.toggles[k] !== v) actions.setToggle(k, v);
  }
  // 5. Giờ thiên văn
  if (p.lst !== undefined) actions.setLst(p.lst);
  if (p.advanceDeg) actions.advance(p.advanceDeg);
  // 6. Sao được chọn
  if (p.selectHip !== undefined) selectHip(ctx, p.selectHip);
  // 7. Vết sao (sau LST: lùi LST sẽ ghi đè trailStart)
  if (p.trails) actions.setTrails(p.trails);
  if (p.resetTrails) actions.resetTrails();
  // 8. Khung nhìn
  if (p.view) host.showView(p.view);
  // 9. Chuyển động
  const m = p.motion;
  if (m && m !== 'pause') {
    if (host.reducedMotion()) {
      actions.advance(m.staticAdvanceDeg);
    } else {
      actions.setMode('continuous');
      actions.setRate(m.rate);
      actions.play();
    }
  }
}

/** Dựng một bước đầy đủ (bộ nền + cấu hình của bước). */
export function applyStep(host: ApplyHost, step: StepDef): void {
  applyPreset(host, step.preset, STORY_BASE_TOGGLES);
}
