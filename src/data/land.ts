// Đường bờ lục địa (Natural Earth 1:110m, phạm vi công cộng) — dùng cho bản đồ và họa tiết Trái Đất.

import raw from './generated/land.json';

/** Mỗi vòng là mảng phẳng [lon0, lat0, lon1, lat1, ...]. */
export const LAND_RINGS = raw as unknown as number[][];

/** Vẽ lục địa lên canvas theo phép chiếu trụ đều (equirectangular). */
export function drawLand(ctx: CanvasRenderingContext2D, w: number, h: number, fill: string, stroke?: string): void {
  ctx.beginPath();
  for (const ring of LAND_RINGS) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = ((ring[i] + 180) / 360) * w;
      const y = ((90 - ring[i + 1]) / 180) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.fillStyle = fill;
  ctx.fill('evenodd');
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
