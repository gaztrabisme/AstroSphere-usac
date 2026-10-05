import { describe, expect, it } from 'vitest';
import { catalogIndexByHip, getCatalogStar, starConstellation, starNameVi } from './catalog';
import { ALL_FIGURES, constellationName, constellationNameVi } from './constellations';
import { createInitialState } from '../state';

describe('Thống nhất tên quốc tế', () => {
  it('đủ 88 chòm sao có tên IAU và tên tiếng Việt (Wikipedia)', () => {
    const abbrs = Object.keys(ALL_FIGURES);
    expect(abbrs).toHaveLength(88);
    for (const a of abbrs) {
      expect(constellationName(a), a).toMatch(/^[A-Z][a-zö]+( [A-Z][a-z]+)*$/);
      expect(constellationNameVi(a), a).not.toBe('');
    }
    expect(constellationName('UMa')).toBe('Ursa Major');
    expect(constellationName('Ori')).toBe('Orion');
    expect(constellationName('Ara')).toBe('Ara');
    expect(constellationNameVi('Leo')).not.toBe('');
    expect(constellationNameVi('UMa')).toBe('Đại Hùng (Gấu Lớn)');
  });

  it('nhãn sao dùng tên quốc tế; tên tiếng Việt chỉ để tra trong chi tiết', () => {
    const sirius = getCatalogStar(catalogIndexByHip(32349)!);
    expect(sirius.shortName).toBe('Sirius');
    expect(sirius.label).toBe('Sirius (α CMa)');
    expect(starNameVi(32349)).toBe('Thiên Lang');
    expect(starConstellation(32349)).toBe('CMa');
    expect(getCatalogStar(catalogIndexByHip(11767)!).shortName).toBe('Polaris');
  });

  it('mặc định chỉ hiện sao và chòm sao; thiên thể sâu, hoàng đạo, Mặt Trời… đều tắt', () => {
    const s = createInitialState();
    expect(s.toggles.catalog).toBe(true);
    expect(s.toggles.constellationLines).toBe(true);
    for (const k of ['deepSky', 'ecliptic', 'galactic', 'sun', 'zoneCircumpolar', 'zoneRiseSet', 'zoneNeverRise'] as const) expect(s.toggles[k], k).toBe(false);
    expect(s.stars).toHaveLength(0);
    expect(s.selected).toBeNull();
  });
});
