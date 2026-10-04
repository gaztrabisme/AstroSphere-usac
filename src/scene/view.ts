// Khung nhìn 3D cơ sở: renderer WebGL + nhãn CSS2D + OrbitControls (chuột và cảm ứng), chọn sao, chú thích khi rê chuột.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Line2 } from 'three/addons/lines/Line2.js';
import type { QualitySettings, QualityTarget } from '../runtime/quality';
import { lstOf, type AppState, type Selection, type Store } from '../state';
import type { ViewKind } from './frames';
import { HorizonLayer } from './horizonLayer';
import type { Label } from './labels';
import { SkyLayer } from './skyLayer';
import { TrailLayer } from './trails';

export const SKY_RADIUS = 10;

export interface HoverInfo {
  kind: 'object' | 'tip';
  sel?: NonNullable<Selection>;
  tip?: string;
}

const _v = new THREE.Vector3();
const _p = new THREE.Vector3();

export abstract class View implements QualityTarget {
  readonly renderer: THREE.WebGLRenderer;
  readonly labelRenderer: CSS2DRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly sky: SkyLayer;
  readonly horizon: HorizonLayer;
  readonly trails: TrailLayer;
  readonly R = SKY_RADIUS;
  dirty = true;
  /** Khung nhìn nằm trong vùng hiển thị của trang (IntersectionObserver). */
  onScreen = true;
  /** Tạm dừng vẽ riêng khung nhìn này. */
  suspended = false;
  /** Trần tỉ lệ điểm ảnh do chất lượng thích ứng đặt. */
  private pixelRatioCap = 2;
  private dprQuery: MediaQueryList | null = null;
  protected raycaster = new THREE.Raycaster();
  private defaultCamera: THREE.Vector3;
  private width = 0;
  private height = 0;
  readonly container: HTMLElement;
  readonly kind: ViewKind;
  protected store: Store;

  constructor(container: HTMLElement, kind: ViewKind, store: Store, defaultCamera: THREE.Vector3) {
    this.container = container;
    this.kind = kind;
    this.store = store;
    this.defaultCamera = defaultCamera.clone();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.targetPixelRatio());
    this.renderer.localClippingEnabled = false;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    container.appendChild(this.labelRenderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.camera.position.copy(defaultCamera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = this.R * 1.25;
    this.controls.maxDistance = this.R * 7;
    this.controls.rotateSpeed = 0.7;
    this.controls.addEventListener('change', () => (this.dirty = true));

    this.sky = new SkyLayer(kind, this.R);
    this.sky.setPixelRatio(this.renderer.getPixelRatio());
    this.horizon = new HorizonLayer(kind, this.R);
    this.trails = new TrailLayer(this.R);
    // Vết sao nằm trong nhóm quay cùng bầu trời (xem trails.ts)
    this.sky.rot.add(this.trails.object);
    this.scene.add(this.sky.fixed, this.sky.rot, this.horizon.group);

    new ResizeObserver(() => this.resize()).observe(container);
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver((entries) => {
        const e = entries[entries.length - 1];
        const on = e.isIntersecting;
        if (on && !this.onScreen) this.dirty = true;
        this.onScreen = on;
      }).observe(container);
    }
    this.watchDevicePixelRatio();
    this.resize();
  }

  private targetPixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, this.pixelRatioCap);
  }

  /** Theo dõi thay đổi devicePixelRatio (kéo cửa sổ sang màn hình khác, phóng to trang). */
  private watchDevicePixelRatio(): void {
    if (typeof window.matchMedia !== 'function') return;
    const onChange = () => {
      this.dprQuery?.removeEventListener('change', onChange);
      this.setPixelRatio(this.targetPixelRatio());
      this.dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      this.dprQuery.addEventListener('change', onChange);
    };
    this.dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.dprQuery.addEventListener('change', onChange);
  }

  /** Đặt tỉ lệ điểm ảnh cho renderer và kích thước điểm sao. */
  setPixelRatio(pr: number): void {
    if (pr === this.renderer.getPixelRatio()) return;
    this.renderer.setPixelRatio(pr);
    this.sky.setPixelRatio(pr);
    this.dirty = true;
  }

  /** QualityTarget: trần tỉ lệ điểm ảnh và giới hạn cấp sao của danh mục. */
  setQuality(q: QualitySettings): void {
    this.pixelRatioCap = q.pixelRatioCap;
    this.setPixelRatio(this.targetPixelRatio());
    this.sky.setCatalogMagLimit(q.catalogMagLimit);
    this.dirty = true;
  }

  resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) {
      // Khung nhìn bị ẩn (vd. tab còn lại trên điện thoại): ghi nhận kích thước 0 để ngừng vẽ.
      this.width = 0;
      this.height = 0;
      return;
    }
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = this.preferredFov(w / h);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /** Màn hình dọc (điện thoại): mở rộng góc nhìn để vẫn thấy trọn thiên cầu. */
  protected preferredFov(aspect: number): number {
    return aspect < 0.9 ? 58 : 42;
  }

  /** Đồng bộ toàn bộ khung nhìn với trạng thái. */
  update(s: AppState): void {
    this.sky.update(s);
    this.sky.setTime(s.lat, lstOf(s));
    this.horizon.update(s);
    this.trails.update(s);
    this.onUpdate(s);
    this.dirty = true;
  }

  protected abstract onUpdate(s: AppState): void;

  /** Có cắt bỏ phần dưới chân trời không. */
  protected clipBelow(_s: AppState): boolean {
    return false;
  }

  /** Điểm (tọa độ thế giới) có bị Trái Đất che không. */
  protected isOccluded(_world: THREE.Vector3): boolean {
    return false;
  }

  /** Gọi mỗi khung hình từ vòng lặp chính. Trả về true nếu đã vẽ. */
  frame(): boolean {
    this.controls.update();
    if (!this.dirty || this.width === 0 || this.height === 0 || !this.onScreen || this.suspended) return false;
    const s = this.store.state;
    this.scene.updateMatrixWorld();
    this.updateLabels(s);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.dirty = false;
    return true;
  }

  private updateLabels(s: AppState): void {
    const lt = s.labels;
    const clip = this.clipBelow(s);
    this.scene.traverse((o) => {
      if (!(o instanceof CSS2DObject)) return;
      const lbl = o as Label;
      const g = lbl.userData.group;
      let vis = lt.all && lt[g];
      if (vis) {
        lbl.getWorldPosition(_v);
        if (clip && lbl.userData.hideBelowHorizon && _v.y < -0.03 * this.R) vis = false;
        else if (this.isOccluded(_v)) vis = false;
      }
      lbl.visible = vis;
    });
  }

  resetCamera(): void {
    this.camera.position.copy(this.defaultCamera);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.dirty = true;
  }

  private toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  /** Tìm sao / Mặt Trời gần vị trí con trỏ nhất (theo pixel trên màn hình). */
  pickAt(clientX: number, clientY: number): NonNullable<Selection> | null {
    const s = this.store.state;
    const { x, y } = this.toLocal(clientX, clientY);
    this.scene.updateMatrixWorld();
    const m = this.sky.rot.matrixWorld;
    const clip = this.clipBelow(s);
    let best: NonNullable<Selection> | null = null;
    let bestScore = Infinity;
    for (const c of this.sky.pickCandidates(s)) {
      _v.copy(c.local).applyMatrix4(m);
      if (clip && _v.y < -0.02 * this.R) continue;
      if (this.isOccluded(_v)) continue;
      _p.copy(_v).project(this.camera);
      if (_p.z > 1) continue;
      const sx = ((_p.x + 1) / 2) * this.width;
      const sy = ((1 - _p.y) / 2) * this.height;
      const d = Math.hypot(sx - x, sy - y);
      if (d > c.tolerancePx) continue;
      const score = d - c.priority * 3;
      if (score < bestScore) {
        bestScore = score;
        best = c.sel;
      }
    }
    return best;
  }

  /** Đối tượng dưới con trỏ: ưu tiên sao, sau đó tới các đường/mặt có chú thích. */
  hoverAt(clientX: number, clientY: number): HoverInfo | null {
    const sel = this.pickAt(clientX, clientY);
    if (sel) return { kind: 'object', sel };
    const s = this.store.state;
    const { x, y } = this.toLocal(clientX, clientY);
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.params.Line = { threshold: this.R * 0.012 };
    (this.raycaster.params as unknown as Record<string, unknown>).Line2 = { threshold: 5 };
    const clip = this.clipBelow(s);
    const hits = this.raycaster.intersectObjects(this.hoverTargets(), false).filter((h) => {
      if (!isShown(h.object)) return false;
      if (clip && h.point.y < -0.02 * this.R && h.object.userData.tip !== 'ground') return false;
      return true;
    });
    if (!hits.length) return null;
    // Đường (Line/Line2) được ưu tiên hơn mặt (Mesh) vì mảnh và khó trỏ trúng hơn.
    hits.sort((a, b) => rank(a.object) - rank(b.object) || a.distance - b.distance);
    return { kind: 'tip', tip: hits[0].object.userData.tip as string };
  }

  protected hoverTargets(): THREE.Object3D[] {
    return [...this.sky.hoverTargets(), ...this.horizon.hoverTargets()];
  }
}

function isShown(o: THREE.Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function rank(o: THREE.Object3D): number {
  if ((o as Line2).isLine2 || (o as THREE.Line).isLine) return 0;
  const tip = o.userData.tip as string;
  if (tip?.startsWith('zone_')) return 3;
  if (tip === 'ground' || tip === 'equatorPlane' || tip === 'skyDome') return 2;
  return 1;
}
