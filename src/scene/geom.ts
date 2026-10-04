// Hàm dựng hình học dùng chung cho cả hai khung nhìn.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { cosD, sinD } from '../astro';

export { COLORS } from './colors';

export interface FatLineOpts {
  width?: number;
  opacity?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  depthTest?: boolean;
}

/** Đường có độ dày tính bằng pixel (Line2). */
export function fatLine(points: THREE.Vector3[], color: string, opts: FatLineOpts = {}): Line2 {
  const geom = new LineGeometry();
  geom.setPositions(flatten(points));
  const mat = new LineMaterial({
    color: new THREE.Color(color).getHex(),
    linewidth: opts.width ?? 2,
    transparent: (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
    dashed: !!opts.dashed,
    dashSize: opts.dashSize ?? 0.4,
    gapSize: opts.gapSize ?? 0.3,
    depthTest: opts.depthTest ?? true,
  });
  const line = new Line2(geom, mat);
  if (opts.dashed) line.computeLineDistances();
  return line;
}

export function setFatLinePoints(line: Line2, points: THREE.Vector3[]): void {
  const old = line.geometry;
  const geom = new LineGeometry();
  geom.setPositions(flatten(points));
  line.geometry = geom;
  old.dispose();
  if ((line.material as LineMaterial).dashed) line.computeLineDistances();
}

function flatten(points: THREE.Vector3[]): number[] {
  const arr: number[] = [];
  for (const p of points) arr.push(p.x, p.y, p.z);
  return arr;
}

/** Vòng xích vĩ δ trong hệ xích đạo gốc. */
export function decCircle(dec: number, r: number, n = 180): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const cd = cosD(dec);
  const z = sinD(dec) * r;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 360;
    pts.push(new THREE.Vector3(cd * cosD(a) * r, cd * sinD(a) * r, z));
  }
  return pts;
}

/** Cung tròn lớn đi từ a đến b (theo cung ngắn hoặc qua điểm trung gian nếu có). */
export function greatArc(a: THREE.Vector3, b: THREE.Vector3, r: number, n = 64): THREE.Vector3[] {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const pts: THREE.Vector3[] = [];
  if (angle < 1e-9) return [ua.multiplyScalar(r), ub.multiplyScalar(r)];
  const sinA = Math.sin(angle);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wa = Math.sin((1 - t) * angle) / sinA;
    const wb = Math.sin(t * angle) / sinA;
    pts.push(ua.clone().multiplyScalar(wa).add(ub.clone().multiplyScalar(wb)).multiplyScalar(r));
  }
  return pts;
}

/** Vòng tròn lớn vuông góc với trục `pole`. */
export function greatCircle(pole: THREE.Vector3, r: number, n = 180): THREE.Vector3[] {
  const p = pole.clone().normalize();
  const helper = Math.abs(p.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(p, helper).normalize();
  const v = new THREE.Vector3().crossVectors(p, u).normalize();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push(u.clone().multiplyScalar(Math.cos(t) * r).add(v.clone().multiplyScalar(Math.sin(t) * r)));
  }
  return pts;
}

/** Dải cầu giữa hai xích vĩ (độ), trong hệ xích đạo gốc. */
export function decBandGeometry(dec1: number, dec2: number, r: number, segs = 96): THREE.BufferGeometry {
  const lo = Math.min(dec1, dec2);
  const hi = Math.max(dec1, dec2);
  const stacks = Math.max(2, Math.ceil((hi - lo) / 3));
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= stacks; j++) {
    const d = lo + ((hi - lo) * j) / stacks;
    const cd = cosD(d);
    const z = sinD(d) * r;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * 360;
      pos.push(cd * cosD(a) * r, cd * sinD(a) * r, z);
    }
  }
  const row = segs + 1;
  for (let j = 0; j < stacks; j++) {
    for (let i = 0; i < segs; i++) {
      const a = j * row + i;
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Hình quạt (góc) từ tâm `center`, quét từ hướng `from` tới hướng `to` theo cung ngắn. */
export function sectorGeometry(from: THREE.Vector3, to: THREE.Vector3, radius: number, n = 48): THREE.BufferGeometry {
  const arc = greatArc(from, to, radius, n);
  const pos: number[] = [0, 0, 0];
  for (const p of arc) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let i = 1; i < arc.length; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function translucent(color: string, opacity: number, side: THREE.Side = THREE.DoubleSide): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side, depthWrite: false });
}

/** Tập đoạn thẳng mảnh (LineSegments) từ mảng tọa độ phẳng. */
export function thinSegments(positions: number[], color: string, opacity = 1): THREE.LineSegments {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const m = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  return new THREE.LineSegments(g, m);
}

/** Nối các điểm liên tiếp thành mảng đoạn thẳng phẳng. */
export function polylineToSegments(points: THREE.Vector3[], out: number[] = []): number[] {
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return out;
}

/** Họa tiết hình vành khuyên dùng để đánh dấu đối tượng đang chọn. */
export function ringTexture(color = '#ffffff'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const anyO = o as THREE.Mesh;
    anyO.geometry?.dispose?.();
    const m = anyO.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose?.();
  });
}
