// Trái Đất ở tâm thiên cầu: họa tiết vẽ từ dữ liệu lục địa nội bộ (không cần mạng).

import * as THREE from 'three';
import { drawLand } from '../data/land';

export function createEarthTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, '#1d4f7a');
  ocean.addColorStop(0.5, '#1a5d8f');
  ocean.addColorStop(1, '#1d4f7a');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);
  drawLand(ctx, w, h, '#3f8f4a', '#7fc77f');
  // Băng ở hai cực
  ctx.fillStyle = 'rgba(235,245,255,0.85)';
  ctx.fillRect(0, 0, w, h * 0.035);
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  // Lưới kinh – vĩ tuyến
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Xích đạo Trái Đất
  ctx.strokeStyle = 'rgba(255,213,79,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
