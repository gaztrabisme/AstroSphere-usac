import { describe, expect, it } from 'vitest';
import { catalogArrays, catalogCount } from './catalog';

describe('star catalogue', () => {
  it('is sorted by magnitude (brightest first), so a magnitude limit is a prefix', () => {
    // skyLayer.setCatalogMagLimit dùng geometry.setDrawRange(0, n) và chỉ cho chọn n sao đầu.
    const { mag } = catalogArrays();
    expect(mag.length).toBe(catalogCount);
    for (let i = 1; i < mag.length; i++) expect(mag[i]).toBeGreaterThanOrEqual(mag[i - 1]);
  });

  it('has parallel arrays of equal length', () => {
    const c = catalogArrays();
    for (const arr of [c.ra, c.dec, c.bv, c.hip]) expect(arr.length).toBe(c.mag.length);
  });

  it('keeps a useful number of stars under the reduced-quality limit of 4.0', () => {
    const { mag } = catalogArrays();
    const n = mag.filter((m) => m <= 4.0).length;
    expect(n).toBeGreaterThan(300);
    expect(n).toBeLessThan(mag.length);
  });
});
