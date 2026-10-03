// Tiện ích lượng giác theo độ và chuẩn hóa góc. Không phụ thuộc giao diện.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export const sinD = (x: number) => Math.sin(x * DEG);
export const cosD = (x: number) => Math.cos(x * DEG);
export const tanD = (x: number) => Math.tan(x * DEG);
export const asinD = (x: number) => Math.asin(clamp(x, -1, 1)) * RAD;
export const acosD = (x: number) => Math.acos(clamp(x, -1, 1)) * RAD;
export const atan2D = (y: number, x: number) => Math.atan2(y, x) * RAD;

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Chuẩn hóa góc về [0, 360). */
export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r === 360 ? 0 : r;
}

/** Chuẩn hóa góc về [-180, 180). */
export function norm180(x: number): number {
  return norm360(x + 180) - 180;
}

/** Hiệu góc nhỏ nhất |a − b| (độ), trong [0, 180]. */
export function angleDiff(a: number, b: number): number {
  return Math.abs(norm180(a - b));
}

export type Vec3 = [number, number, number];

/** Ma trận 3×3 theo hàng: [m00, m01, m02, m10, ..., m22]. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9) as Mat3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

export function mat3Apply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function mat3Transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function mat3Det(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/** Quay quanh trục x một góc θ (độ), chiều dương ngược chiều kim đồng hồ khi nhìn từ +x. */
export function rotX(theta: number): Mat3 {
  const c = cosD(theta);
  const s = sinD(theta);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

export function rotY(theta: number): Mat3 {
  const c = cosD(theta);
  const s = sinD(theta);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

export function rotZ(theta: number): Mat3 {
  const c = cosD(theta);
  const s = sinD(theta);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
