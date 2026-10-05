// Màu ngữ nghĩa của cảnh 3D (không phụ thuộc three.js để giao diện dùng được mà không kéo three vào gói khởi động).
// Các màu này mang nghĩa (xích đạo vàng, trục xanh…) nên không đổi theo thương hiệu.

export const COLORS = {
  equator: '#ffd54f',
  axis: '#4f9dff',
  horizon: '#4caf50',
  // Mặt đất: cùng họ xanh lá của chân trời, nhưng độ bão hòa (OKLCH C 0,105 → 0,063) và độ đục (0,92 → 0,55) giảm
  // ~40 % để đĩa không nặng hơn bài học — viền chân trời (horizon) vẫn sáng (review-3 B2).
  ground: '#37593b',
  hourCircle: '#a3a3a3',
  meridian: '#e2e8f0',
  zenith: '#ffffff',
  vertical: '#f472b6',
  // Cung và nhãn phương vị A: xanh lơ, khác hẳn vàng xích đạo, cam hoàng đạo/thương hiệu, hồng vòng thẳng đứng và
  // màu các vùng (review-2 G2: hổ phách cũ đọc như cùng họ với xích đạo). 13,7:1 trên nền trời, 5,4:1 trên mặt đất.
  azimuth: '#67e8f9',
  circumpolar: '#8b5cf6',
  riseSet: '#14b8a6',
  neverRise: '#ef4444',
  ecliptic: '#fb923c',
  galactic: '#e879f9',
  sun: '#ffcc33',
  grid: '#64748b',
  angle: '#fde047',
  latitude: '#38bdf8',
  altAzGrid: '#7dd3a8',
} as const;
