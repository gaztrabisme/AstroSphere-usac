import { describe, expect, it } from 'vitest';
import { COMETS, DSOS, dsoDesignation } from './deepSky';

const find = (id: string) => DSOS.find((o) => o.id === id)!;

describe('Danh mục thiên thể sâu', () => {
  it('có đủ 110 thiên thể Messier và các thiên thể NGC/PGC bổ sung', () => {
    expect(DSOS.filter((o) => /^M\d+$/.test(o.id))).toHaveLength(110);
    for (const id of ['LMC', 'SMC', 'NGC 5139', 'NGC 104', 'NGC 3372']) expect(find(id), id).toBeTruthy();
  });

  it('định danh chuẩn theo Messier/NGC', () => {
    expect(dsoDesignation(find('M31'))).toBe('M31 · NGC 224');
    expect(dsoDesignation(find('M42'))).toBe('M42 · NGC 1976');
    expect(find('M31').nameEn).toBe('Andromeda Galaxy');
  });

  it('tọa độ J2000 khớp giá trị chuẩn (SIMBAD) trong 0,1°', () => {
    // M31: 00h 42m 44s, +41° 16′ 09″ — M42: 05h 35m 17s, −05° 23′ 28″
    expect(Math.abs(find('M31').ra - 10.6847)).toBeLessThan(0.1);
    expect(Math.abs(find('M31').dec - 41.269)).toBeLessThan(0.1);
    expect(Math.abs(find('M42').ra - 83.822)).toBeLessThan(0.1);
    expect(Math.abs(find('M42').dec - -5.391)).toBeLessThan(0.1);
  });

  it('đường kính thực = khoảng cách × kích thước góc', () => {
    const m31 = find('M31');
    // 2,5 triệu năm ánh sáng × 190′ ≈ 138 000 năm ánh sáng
    expect(m31.diameterLy!).toBeGreaterThan(130_000);
    expect(m31.diameterLy!).toBeLessThan(145_000);
  });

  it('mọi thiên thể tiêu biểu đều có khoảng cách; dữ liệu hợp lệ', () => {
    for (const o of DSOS) {
      if (o.featured) expect(o.distanceLy, o.id).toBeGreaterThan(0);
      expect(o.ra).toBeGreaterThanOrEqual(0);
      expect(o.ra).toBeLessThan(360);
      expect(Math.abs(o.dec)).toBeLessThanOrEqual(90);
    }
  });

  it('sao chổi dùng ký hiệu IAU/MPC và có số liệu quỹ đạo', () => {
    expect(COMETS.map((c) => c.designation)).toContain('1P/Halley');
    for (const c of COMETS) {
      expect(c.designation).toMatch(/^(\d+P\/|C\/\d{4} )/);
      expect(c.eccentricity).toBeGreaterThan(0);
      expect(c.eccentricity).toBeLessThan(1);
    }
  });
});
