// Vết sao: cung nhật động mà mỗi sao đã quét qua từ lúc đặt lại vết, mờ dần về phía cũ.
//
// Nhận xét then chốt: vị trí của sao tại LST' = LST − Δ (Δ = "tuổi" của điểm trên vết), khi biểu diễn
// trong hệ xích đạo đang quay cùng bầu trời ở thời điểm LST, chính là điểm (α + Δ, δ). Vì vậy vết của
// mỗi sao là một cung cố định trên vòng xích vĩ của nó, kéo dài từ α về phía α tăng. Hình học chỉ cần dựng
// một lần (khi danh sách sao hoặc độ dài vết đổi); mỗi khung hình chỉ cập nhật uniform `uSpan` (độ dài
// đã quét). Đối tượng được đặt trong nhóm quay `rot` nên luôn khớp với sao ở cả hai khung nhìn.

import * as THREE from 'three';
import { cosD, sinD } from '../astro';
import { lstCont, TRAIL_LENGTH_DEG, type AppState, type TrailMode, type UserStar } from '../state';

const STEP_DEG = 1.5;

function createTrailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSpan: { value: 0 },
      uLen: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aAge;
      uniform float uSpan;
      uniform float uLen;
      varying vec3 vColor;
      varying float vAlpha;
      #include <clipping_planes_pars_vertex>
      void main() {
        vColor = aColor;
        vAlpha = aAge <= uSpan + 0.001 ? pow(max(1.0 - aAge / uLen, 0.0), 1.3) * 0.9 : 0.0;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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
        if (vAlpha < 0.004) discard;
        gl_FragColor = vec4(vColor, vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    clipping: true,
  });
}

export class TrailLayer {
  readonly object: THREE.LineSegments;
  private material = createTrailMaterial();
  private stars: UserStar[] | null = null;
  private mode: TrailMode | null = null;
  private readonly R: number;

  constructor(R: number) {
    this.R = R;
    this.object = new THREE.LineSegments(new THREE.BufferGeometry(), this.material);
    this.object.frustumCulled = false;
    this.object.renderOrder = 2;
  }

  private rebuild(stars: UserStar[], mode: TrailMode): void {
    this.stars = stars;
    this.mode = mode;
    const len = TRAIL_LENGTH_DEG[mode];
    this.object.geometry.dispose();
    const g = new THREE.BufferGeometry();
    this.object.geometry = g;
    if (len <= 0 || stars.length === 0) return;
    const steps = Math.ceil(len / STEP_DEG);
    const per = steps + 1;
    const n = stars.length * per;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const age = new Float32Array(n);
    const IndexArray = n > 65535 ? Uint32Array : Uint16Array;
    const idx = new IndexArray(stars.length * steps * 2);
    const c = new THREE.Color();
    const R = this.R;
    let v = 0;
    let ii = 0;
    for (const st of stars) {
      c.set(st.color);
      const cd = cosD(st.dec) * R;
      const z = sinD(st.dec) * R;
      const base = v;
      for (let k = 0; k <= steps; k++) {
        const a = (len * k) / steps;
        const ra = st.ra + a;
        pos[v * 3] = cd * cosD(ra);
        pos[v * 3 + 1] = cd * sinD(ra);
        pos[v * 3 + 2] = z;
        col[v * 3] = c.r;
        col[v * 3 + 1] = c.g;
        col[v * 3 + 2] = c.b;
        age[v] = a;
        v++;
      }
      for (let k = 0; k < steps; k++) {
        idx[ii++] = base + k;
        idx[ii++] = base + k + 1;
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.material.uniforms.uLen.value = len;
  }

  update(s: AppState): void {
    if (s.stars !== this.stars || s.trails !== this.mode) this.rebuild(s.stars, s.trails);
    const len = TRAIL_LENGTH_DEG[s.trails];
    const span = Math.min(len, lstCont(s) - s.trailStart);
    this.object.visible = len > 0 && span > 0.01 && s.stars.length > 0;
    this.material.uniforms.uSpan.value = Math.max(0, span);
  }
}
