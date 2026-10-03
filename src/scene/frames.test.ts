import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { equatorialToHorizontal } from '../astro';
import { eqVec, equatorialMatrix, horizonFrameMatrix, horVec, hourFrameMatrix } from './frames';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('Ánh xạ 3D của hai khung nhìn (tiêu chí 4: đồng bộ tuyệt đối)', () => {
  it('Khung chân trời: vị trí 3D của sao trùng với (A, h) tính bằng công thức', () => {
    const r = rng(17);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 500; i++) {
      const ra = r() * 360;
      const dec = r() * 180 - 90;
      const lat = r() * 180 - 90;
      const lst = r() * 360;
      const p = eqVec(ra, dec).applyMatrix4(equatorialMatrix('horizon', lat, lst, m));
      const { alt, az } = equatorialToHorizontal(ra, dec, lat, lst);
      expect(p.distanceTo(horVec(alt, az))).toBeLessThan(1e-9);
    }
  });

  it('Khung thiên cầu: cùng một sao, cùng một hướng so với chân trời của người quan sát', () => {
    const r = rng(23);
    const m = new THREE.Matrix4();
    const h = new THREE.Matrix4();
    for (let i = 0; i < 500; i++) {
      const ra = r() * 360;
      const dec = r() * 180 - 90;
      const lat = r() * 180 - 90;
      const lst = r() * 360;
      const p = eqVec(ra, dec).applyMatrix4(equatorialMatrix('sphere', lat, lst, m));
      const { alt, az } = equatorialToHorizontal(ra, dec, lat, lst);
      const q = horVec(alt, az).applyMatrix4(horizonFrameMatrix('sphere', lat, h));
      expect(p.distanceTo(q)).toBeLessThan(1e-9);
    }
  });

  it('Thiên đỉnh trong khung thiên cầu nằm đúng vị trí người quan sát (0, sin φ, cos φ)', () => {
    const lat = 21.03;
    const z = new THREE.Vector3(0, 1, 0).applyMatrix4(horizonFrameMatrix('sphere', lat));
    expect(z.x).toBeCloseTo(0, 12);
    expect(z.y).toBeCloseTo(Math.sin((lat * Math.PI) / 180), 12);
    expect(z.z).toBeCloseTo(Math.cos((lat * Math.PI) / 180), 12);
  });

  it('Vết sao: điểm (α + Δ, δ) trong nhóm quay = vị trí thật của sao lúc LST − Δ', () => {
    const r = rng(31);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 300; i++) {
      const ra = r() * 360;
      const dec = r() * 180 - 90;
      const lat = r() * 180 - 90;
      const lst = r() * 720;
      const age = r() * 359;
      const trailPoint = eqVec(ra + age, dec).applyMatrix4(equatorialMatrix('horizon', lat, lst, m));
      const past = equatorialToHorizontal(ra, dec, lat, lst - age);
      expect(trailPoint.distanceTo(horVec(past.alt, past.az))).toBeLessThan(1e-9);
    }
  });

  it('Các ma trận là phép quay thuần (định thức +1)', () => {
    for (const lat of [-90, -33.87, 0, 21.03, 90]) {
      expect(hourFrameMatrix('horizon', lat).determinant()).toBeCloseTo(1, 12);
      expect(hourFrameMatrix('sphere', lat).determinant()).toBeCloseTo(1, 12);
      expect(horizonFrameMatrix('sphere', lat).determinant()).toBeCloseTo(1, 12);
    }
  });
});
