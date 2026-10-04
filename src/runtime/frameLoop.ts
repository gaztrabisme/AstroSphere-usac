// Vòng lặp khung hình: tiến hoạt ảnh, vẽ các khung nhìn và cập nhật giao diện DOM.

import type { QualityController } from './quality';

export interface FrameView {
  /** Vẽ nếu cần; trả về true nếu đã vẽ. */
  frame(): boolean | void;
}

export interface FrameLoopOptions {
  animator: { tick(dt: number): void };
  /** Danh sách khung nhìn hiện có ([] cho tới khi cảnh 3D tải xong). */
  getViews(): readonly FrameView[];
  /** Cập nhật DOM (bảng số liệu, thẻ thông tin…) — chỉ gọi khi giao diện "bẩn". */
  onUiTick(): void;
  isPlaying(): boolean;
  quality?: QualityController;
}

export interface FrameLoop {
  markUiDirty(): void;
  /** Tạm dừng vẽ 3D vì một lý do (vd. màn hình mở đầu che khung nhìn). */
  suspend(reason: string, on: boolean): void;
  readonly stats: { frames: number; renders: number; uiTicks: number };
}

export function startFrameLoop(o: FrameLoopOptions): FrameLoop {
  const stats = { frames: 0, renders: 0, uiTicks: 0 };
  const suspended = new Set<string>();
  let uiDirty = true;
  let last = performance.now();

  function loop(now: number) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    stats.frames++;
    o.animator.tick(dt);
    if (suspended.size === 0) {
      for (const v of o.getViews()) if (v.frame()) stats.renders++;
    }
    if (uiDirty) {
      uiDirty = false;
      stats.uiTicks++;
      o.onUiTick();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    markUiDirty: () => {
      uiDirty = true;
    },
    suspend: (reason, on) => {
      if (on) suspended.add(reason);
      else suspended.delete(reason);
    },
    stats,
  };
}
