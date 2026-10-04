import { describe, expect, it } from 'vitest';
import { declutter, EDGE, LabelBoxes } from './declutter';

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
});
