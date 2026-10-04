import { describe, expect, it } from 'vitest';
import { riseSet } from '../astro';
import { azimuthText, compassName } from './infoCard';

describe('Tên hướng trong thẻ thông tin', () => {
  it('đặt tên 8 hướng cho phương vị hữu hạn', () => {
    expect(compassName(0)).not.toMatch(/compass\./);
    expect(compassName(90)).not.toBe(compassName(270));
  });

  it('không lộ khóa i18n khi phương vị không xác định (|φ| = 90°)', () => {
    expect(compassName(Number.NaN)).toBe('');
    expect(azimuthText(Number.NaN)).toBe('A = —');
    const rs = riseSet(0, 0, 90);
    for (const az of [rs.riseAz, rs.setAz]) expect(azimuthText(az)).not.toMatch(/compass|undefined|NaN/);
  });
});
