// Vật liệu điểm sao: kích thước theo cấp sao, màu riêng từng sao, hỗ trợ mặt phẳng cắt (ẩn dưới chân trời).

import * as THREE from 'three';

/** ring = true: vẽ vòng tròn rỗng (dùng cho thiên thể sâu) thay vì chấm đặc. */
export function createStarMaterial(ring = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    defines: ring ? { RING: 1 } : {},
    uniforms: {
      uPixelRatio: { value: 1 },
      // Hệ số làm mờ cho phần nằm dưới chân trời (y < 0 trong khung chân trời); 1 = không làm mờ.
      uBelowDim: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      uniform float uPixelRatio;
      uniform float uBelowDim;
      varying vec3 vColor;
      varying float vAlpha;
      #include <clipping_planes_pars_vertex>
      void main() {
        vColor = aColor;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vAlpha = aAlpha * (wp.y < 0.0 ? uBelowDim : 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        #ifdef RING
          float a = smoothstep(0.5, 0.64, d) * (1.0 - smoothstep(0.84, 1.0, d));
        #else
          float a = 1.0 - smoothstep(0.55, 1.0, d);
        #endif
        gl_FragColor = vec4(vColor, vAlpha * a);
      }
    `,
    transparent: true,
    depthWrite: false,
    clipping: true,
  });
}

export interface StarBuffers {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
}

export function makeStarPoints(buf: StarBuffers, material: THREE.ShaderMaterial): THREE.Points {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(buf.positions, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(buf.colors, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(buf.sizes, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(buf.alphas, 1));
  g.computeBoundingSphere();
  const p = new THREE.Points(g, material);
  p.frustumCulled = false;
  return p;
}

/** Kích thước điểm (px) theo cấp sao biểu kiến. */
export function sizeForMagnitude(mag: number): number {
  return Math.max(1.6, Math.min(7.5, 6.2 - 1.05 * mag));
}
