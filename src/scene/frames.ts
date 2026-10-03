// Ánh xạ các hệ tọa độ thiên văn sang không gian 3D của Three.js (trục Y hướng lên).
//
// Khung "thiên cầu":   trục thiên cực Bắc → +Y, giao điểm xích đạo trời với kinh tuyến người quan sát → +Z
//                      (hướng về phía camera mặc định), điểm Đông → +X. Trái Đất đứng yên, bầu trời quay.
// Khung "chân trời":   Thiên đỉnh → +Y, Bắc → −Z, Nam → +Z, Đông → +X.
//
// Mọi đối tượng gắn với bầu trời được dựng trong hệ xích đạo gốc (x → điểm xuân phân, z → thiên cực Bắc)
// rồi đặt vào nhóm có ma trận: M = B(khung, φ) · Rz(−LST). Vì cả hai khung dùng cùng phép quay Rz(−LST)
// và cùng phép quay (90° − φ) quanh trục Đông–Tây như công thức ở astro/coords.ts, hai khung luôn đồng bộ.

import * as THREE from 'three';
import { cosD, DEG, sinD } from '../astro';

export type ViewKind = 'sphere' | 'horizon';

/** Hệ góc giờ (x′ kinh tuyến, y′ Đông, z′ thiên cực Bắc) → không gian 3D. */
export function hourFrameMatrix(view: ViewKind, lat: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  if (view === 'sphere') {
    return out.set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  }
  const c = cosD(lat);
  const s = sinD(lat);
  // X = E = y′;  Y = U = cosφ·x′ + sinφ·z′;  Z = −N = sinφ·x′ − cosφ·z′
  return out.set(0, 1, 0, 0, c, 0, s, 0, s, 0, -c, 0, 0, 0, 0, 1);
}

const _rz = new THREE.Matrix4();

/** Hệ xích đạo → không gian 3D tại LST cho trước. */
export function equatorialMatrix(view: ViewKind, lat: number, lst: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  hourFrameMatrix(view, lat, out);
  _rz.makeRotationZ(-lst * DEG);
  return out.multiply(_rz);
}

/**
 * Khung chân trời (dựng sẵn theo quy ước khung "chân trời") → không gian 3D của khung nhìn.
 * Với khung thiên cầu đây là phép quay quanh trục Đông–Tây một góc (90° − φ).
 */
export function horizonFrameMatrix(view: ViewKind, lat: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  if (view === 'horizon') return out.identity();
  return out.makeRotationX((90 - lat) * DEG);
}

/** Vectơ trong hệ xích đạo gốc. */
export function eqVec(ra: number, dec: number, r = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const cd = cosD(dec);
  return out.set(cd * cosD(ra) * r, cd * sinD(ra) * r, sinD(dec) * r);
}

/** Vectơ theo (A, h) trong khung chân trời 3D: X = Đông, Y = Thiên đỉnh, Z = Nam. */
export function horVec(alt: number, az: number, r = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const ch = cosD(alt);
  return out.set(ch * sinD(az) * r, sinD(alt) * r, -ch * cosD(az) * r);
}
