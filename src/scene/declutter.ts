// Gỡ chồng chéo nhãn trong không gian màn hình (review-1 D2, C2).
//
// Thuần số học, không DOM, không three.js: khung nhìn chiếu từng nhãn đang hiện ra hộp (x, y, w, h) theo thứ tự
// ưu tiên giảm dần, rồi gọi `declutter`. Nhãn ưu tiên cao giữ chỗ trước; nhãn sau chồng lên một nhãn đã giữ thì bị ẩn.
// Nhãn chạm dải mép (EDGE px) bị ẩn, trừ nhãn được phép đẩy vào trong (ưu tiên cao: đối tượng chọn, số đo góc,
// hướng, thiên cực). Mảng cấp phát sẵn và chỉ lớn thêm khi số nhãn tăng (dựng lại cảnh) — không cấp phát mỗi khung hình.

/** Dải mép (px) mà nhãn không được chạm vào. */
export const EDGE = 6;
/** Khoảng trống tối thiểu giữa hai nhãn (px). */
export const GAP = 2;

export class LabelBoxes {
  n = 0;
  x = new Float32Array(0);
  y = new Float32Array(0);
  w = new Float32Array(0);
  h = new Float32Array(0);
  /** 1 = được phép đẩy vào trong mép thay vì bị ẩn. */
  nudge = new Uint8Array(0);
  /** Kết quả: 1 = giữ. */
  keep = new Uint8Array(0);
  /** Kết quả: độ dời (px) đã áp dụng để đưa nhãn vào trong mép. */
  dx = new Float32Array(0);
  dy = new Float32Array(0);

  /** Bảo đảm đủ chỗ cho `cap` hộp (chỉ cấp phát khi cần lớn hơn). */
  ensure(cap: number): void {
    if (this.x.length >= cap) return;
    const c = Math.max(cap, 16);
    this.x = new Float32Array(c);
    this.y = new Float32Array(c);
    this.w = new Float32Array(c);
    this.h = new Float32Array(c);
    this.nudge = new Uint8Array(c);
    this.keep = new Uint8Array(c);
    this.dx = new Float32Array(c);
    this.dy = new Float32Array(c);
  }

  reset(): void {
    this.n = 0;
  }

  /** Thêm một hộp (góc trên trái x, y; px). Trả về chỉ số. Gọi theo thứ tự ưu tiên giảm dần. */
  push(x: number, y: number, w: number, h: number, nudge: boolean): number {
    const i = this.n++;
    this.x[i] = x;
    this.y[i] = y;
    this.w[i] = w;
    this.h[i] = h;
    this.nudge[i] = nudge ? 1 : 0;
    this.keep[i] = 0;
    this.dx[i] = 0;
    this.dy[i] = 0;
    return i;
  }
}

/** Quyết định giữ/ẩn từng hộp trong khung W×H (px). Độ phức tạp O(n · số hộp đã giữ). */
export function declutter(b: LabelBoxes, W: number, H: number, edge = EDGE, gap = GAP): void {
  const n = b.n;
  for (let i = 0; i < n; i++) {
    let x = b.x[i];
    let y = b.y[i];
    const w = b.w[i];
    const h = b.h[i];
    let dx = 0;
    let dy = 0;
    if (x < edge) dx = edge - x;
    else if (x + w > W - edge) dx = W - edge - (x + w);
    if (y < edge) dy = edge - y;
    else if (y + h > H - edge) dy = H - edge - (y + h);
    if (dx !== 0 || dy !== 0) {
      // Nhãn quá lớn so với khung, hoặc không được phép dời: ẩn.
      if (!b.nudge[i] || w > W - 2 * edge || h > H - 2 * edge) {
        b.keep[i] = 0;
        continue;
      }
      x += dx;
      y += dy;
    }
    let hit = false;
    for (let j = 0; j < i; j++) {
      if (!b.keep[j]) continue;
      if (x < b.x[j] + b.w[j] + gap && b.x[j] < x + w + gap && y < b.y[j] + b.h[j] + gap && b.y[j] < y + h + gap) {
        hit = true;
        break;
      }
    }
    if (hit) {
      b.keep[i] = 0;
      continue;
    }
    b.keep[i] = 1;
    b.x[i] = x;
    b.y[i] = y;
    b.dx[i] = dx;
    b.dy[i] = dy;
  }
}
