import { describe, expect, it } from 'vitest';
import { declutter, EDGE, GAP, LabelBoxes, MAX_ALTS } from './declutter';

function boxes(list: [number, number, number, number, boolean?][]): LabelBoxes {
  const b = new LabelBoxes();
  b.ensure(list.length);
  for (const [x, y, w, h, nudge] of list) b.push(x, y, w, h, !!nudge);
  return b;
}

describe('declutter', () => {
  it('keeps the higher-priority (earlier) box when two overlap', () => {
    const b = boxes([
      [100, 100, 60, 16],
      [130, 105, 60, 16],
      [300, 100, 60, 16],
    ]);
    declutter(b, 800, 600);
    expect([...b.keep.slice(0, 3)]).toEqual([1, 0, 1]);
  });

  it('a hidden box does not block later boxes', () => {
    const b = boxes([
      [100, 100, 60, 16],
      [150, 100, 60, 16], // hidden by #0
      [205, 100, 60, 16], // overlaps only #1 (hidden) → kept
    ]);
    declutter(b, 800, 600);
    expect([...b.keep.slice(0, 3)]).toEqual([1, 0, 1]);
  });

  it('hides low-priority boxes in the edge band', () => {
    const b = boxes([
      [2, 100, 60, 16],
      [760, 100, 60, 16],
      [100, 590, 60, 16],
    ]);
    declutter(b, 800, 600);
    expect([...b.keep.slice(0, 3)]).toEqual([0, 0, 0]);
  });

  it('nudges high-priority boxes inside the edge band instead of hiding them', () => {
    const b = boxes([
      [-10, 100, 60, 16, true],
      [780, 590, 40, 16, true],
    ]);
    declutter(b, 800, 600);
    expect(b.keep[0]).toBe(1);
    expect(b.x[0]).toBe(EDGE);
    expect(b.dx[0]).toBe(EDGE + 10);
    expect(b.keep[1]).toBe(1);
    expect(b.x[1] + 40).toBe(800 - EDGE);
    expect(b.y[1] + 16).toBe(600 - EDGE);
  });

  it('a nudged box then takes part in collisions at its new place', () => {
    const b = boxes([
      [-20, 100, 60, 16, true], // nudged to x = EDGE
      [30, 100, 40, 16], // overlaps the nudged box
    ]);
    declutter(b, 800, 600);
    expect([...b.keep.slice(0, 2)]).toEqual([1, 0]);
  });

  it('reuses its buffers: ensure() does not shrink and reset() clears the count', () => {
    const b = new LabelBoxes();
    b.ensure(40);
    const x = b.x;
    b.ensure(10);
    expect(b.x).toBe(x);
    b.push(0, 0, 1, 1, false);
    b.reset();
    expect(b.n).toBe(0);
  });

  // review-3 D2: nhãn số đo đang tô sáng nhường chỗ cho chữ hướng (B/N/Đ/T) bằng cách dời dọc theo cung.
  it('a box whose place is taken moves to its first free alternate position instead of hiding', () => {
    const b = boxes([
      [100, 100, 20, 18, true], // chữ hướng "B", giữ chỗ trước
      [90, 95, 200, 18, true], // nhãn số đo chồng lên "B"
    ]);
    b.addAlt(1, 95, 105); // vẫn chồng
    b.addAlt(1, 80, 140); // trống
    b.addAlt(1, 80, 200); // trống nhưng đứng sau
    declutter(b, 800, 600);
    expect([...b.keep.slice(0, 2)]).toEqual([1, 1]);
    expect(b.x[0]).toBe(100); // chữ hướng không bị dời, không bị ẩn
    expect([b.x[1], b.y[1]]).toEqual([80, 140]);
    expect([b.dx[1], b.dy[1]]).toEqual([-10, 45]);
  });

  it('a must box with no free place stays at its own place; a plain box is hidden', () => {
    const b = boxes([
      [100, 100, 20, 18, true],
      [90, 95, 200, 18, true],
      [90, 95, 200, 18, true],
    ]);
    b.must[1] = 1;
    b.addAlt(1, 95, 105);
    declutter(b, 800, 600);
    expect(b.keep[1]).toBe(1);
    expect([b.dx[1], b.dy[1]]).toEqual([0, 0]);
    expect(b.keep[2]).toBe(0);
  });

  it('padding around a kept box clears lower-priority neighbours further away', () => {
    const near = GAP + 6; // ngoài khoảng GAP thường, trong vùng đệm 10 px
    const b = boxes([
      [100, 100, 60, 16, true],
      [160 + near, 100, 40, 16],
    ]);
    declutter(b, 800, 600);
    expect(b.keep[1]).toBe(1);
    b.reset();
    b.push(100, 100, 60, 16, true);
    b.pad[0] = 10;
    b.push(160 + near, 100, 40, 16, false);
    declutter(b, 800, 600);
    expect(b.keep[1]).toBe(0);
  });

  it('ignores alternates beyond MAX_ALTS', () => {
    const b = boxes([[0, 0, 1, 1]]);
    for (let k = 0; k < MAX_ALTS + 3; k++) b.addAlt(0, k, k);
    expect(b.altN[0]).toBe(MAX_ALTS);
  });

  it('an obstacle (solid) moves an ordinary label to its alternative, but a soft label ignores it', () => {
    const b = new LabelBoxes();
    b.ensure(3);
    const o = b.push(100, 100, 40, 40, false); // vòng chọn
    b.solid[o] = 1;
    b.must[o] = 1;
    const d = b.push(130, 110, 20, 20, true); // chữ hướng chồng lên vòng
    b.addAlt(d, 160, 110);
    const p = b.push(110, 90, 30, 16, true); // tên thiên cực (soft) chồng lên vòng
    b.soft[p] = 1;
    declutter(b, 800, 600);
    expect(b.keep[o]).toBe(1);
    expect(b.keep[d]).toBe(1);
    expect(b.dx[d]).toBe(30); // dời sang vị trí thay thế
    expect(b.keep[p]).toBe(1);
    expect(b.dx[p]).toBe(0); // bỏ qua vật cản, giữ chỗ gốc
  });

  it('a must box with no free place stays at its origin even when an obstacle covers it', () => {
    const b = new LabelBoxes();
    b.ensure(2);
    const o = b.push(100, 100, 40, 40, false);
    b.solid[o] = 1;
    b.must[o] = 1;
    const d = b.push(110, 110, 20, 20, true);
    b.must[d] = 1;
    declutter(b, 800, 600);
    expect(b.keep[d]).toBe(1);
    expect(b.dx[d]).toBe(0);
  });
});
