// Điều khiển hoạt ảnh: tiến LST theo thời gian thực dựa trên tốc độ và chế độ chạy.

import { lstCont, type Actions, type Store } from './state';

export class Animator {
  private stepTimer = 0;
  constructor(
    private store: Store,
    private actions: Actions,
  ) {}

  /** dt: giây thời gian thực từ khung hình trước. */
  tick(dt: number): void {
    const s = this.store.state;
    if (!s.playing) {
      this.stepTimer = 0;
      return;
    }
    const degPerSec = 360 / s.rate; // 1 ngày thiên văn (360°) trong `rate` giây
    if (s.mode === 'stepHour') {
      // Nhảy từng giờ thiên văn; mỗi bước kéo dài rate/24 giây (tối thiểu 0,25 s)
      this.stepTimer += dt;
      const interval = Math.max(0.25, s.rate / 24);
      if (this.stepTimer >= interval) {
        this.stepTimer -= interval;
        this.actions.stepHours(1);
      }
      return;
    }
    const delta = degPerSec * dt;
    if (s.mode === 'oneDay') {
      const remaining = s.runStartLst + 360 - lstCont(s);
      if (remaining <= delta) {
        this.actions.advance(Math.max(0, remaining));
        this.actions.pause();
        return;
      }
    }
    this.actions.advance(delta);
  }
}
