// Khung nhìn 3D cơ sở: renderer WebGL + nhãn CSS2D + OrbitControls (chuột và cảm ứng), chọn sao, chú thích khi rê chuột.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Line2 } from 'three/addons/lines/Line2.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { emphasisGroup } from '../emphasis';
import type { QualitySettings, QualityTarget } from '../runtime/quality';
import { lstOf, type AppState, type Selection, type Store } from '../state';
import { EmphasisFx } from './emphasis';
import type { ViewKind } from './frames';
import { setFatLineStyle } from './geom';
import { HorizonLayer } from './horizonLayer';
import { declutter, LabelBoxes } from './declutter';
import type { Label, LabelData } from './labels';
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
const _ndc = new THREE.Vector2();
const _local = { x: 0, y: 0 };

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
  /** Tô sáng liên kết (độ dày/độ mờ của các đường và mặt được đăng ký bởi hai lớp). */
  readonly emphasis = new EmphasisFx();
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
  /** Danh sách nhãn CSS2D giữ sẵn; dựng lại khi structureVersion() đổi. */
  private labelList: Label[] = [];
  private labelKey = -1;
  /** Hộp màn hình của các nhãn đang hiện (gỡ chồng chéo) và nhãn tương ứng với từng hộp — cấp phát sẵn. */
  private boxes = new LabelBoxes();
  private boxLabel: Label[] = [];
  private needMeasure = true;
  /** Hệ số độ dày đường hiện tại và độ dày gốc của từng đường (ghi lần đầu đổi hệ số). */
  private lineScale = 1;
  private baseWidths = new WeakMap<Line2, number>();
  private hoverList: THREE.Object3D[] = [];
  private hoverKey = -1;
  /** Khóa của lần tính nhóm tô sáng gần nhất (chỉ tính lại khi khóa, đối tượng chọn, vĩ độ hoặc danh sách sao đổi). */
  private emKey: AppState['emphasis'] | undefined = undefined;
  private emSel: AppState['selected'] | undefined = undefined;
  private emLat = NaN;
  private emStars: AppState['stars'] | null = null;
  private emSun = false;
  private emSunDate = '';
  private emGroup: string | null = null;
  private reducedMotion: MediaQueryList | null = null;
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
    this.raycaster.params.Line = { threshold: this.R * 0.012 };
    (this.raycaster.params as unknown as Record<string, unknown>).Line2 = { threshold: 5 };

    this.sky = new SkyLayer(kind, this.R);
    this.sky.setPixelRatio(this.renderer.getPixelRatio());
    this.sky.onAsyncChange = () => (this.dirty = true);
    this.horizon = new HorizonLayer(kind, this.R);
    this.trails = new TrailLayer(this.R);
    this.sky.registerEmphasis(this.emphasis);
    this.horizon.registerEmphasis(this.emphasis);
    try {
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    } catch {
      this.reducedMotion = null;
    }
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
    const group = this.resolveEmphasis(s);
    this.sky.update(s, group);
    this.sky.setTime(s.lat, lstOf(s));
    this.horizon.update(s, group);
    this.trails.update(s);
    this.onUpdate(s);
    this.dirty = true;
  }

  protected abstract onUpdate(s: AppState): void;

  /**
   * Nhóm đối tượng cần tô sáng. Chỉ tính lại khi khóa tô sáng, đối tượng chọn, vĩ độ, danh sách sao hoặc
   * Mặt Trời (bật/tắt, ngày) đổi — không làm gì mỗi khung hình khi bầu trời đang quay.
   */
  private resolveEmphasis(s: AppState): string | null {
    if (s.emphasis === this.emKey && s.selected === this.emSel && s.lat === this.emLat && s.stars === this.emStars && s.toggles.sun === this.emSun && s.sunDate === this.emSunDate) {
      return this.emGroup;
    }
    this.emKey = s.emphasis;
    this.emSel = s.selected;
    this.emLat = s.lat;
    this.emStars = s.stars;
    this.emSun = s.toggles.sun;
    this.emSunDate = s.sunDate;
    const group = emphasisGroup(s);
    if (group !== this.emGroup) {
      this.emGroup = group;
      this.emphasis.setTarget(group, performance.now(), this.reducedMotion?.matches ?? false);
    }
    return group;
  }

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
    // Chuyển tô sáng: chỉ vẽ lại liên tục trong ~150 ms của lần chuyển.
    if (this.emphasis.running) {
      this.emphasis.step(performance.now());
      this.dirty = true;
    }
    if (!this.dirty || this.width === 0 || this.height === 0 || !this.onScreen || this.suspended) return false;
    const s = this.store.state;
    this.scene.updateMatrixWorld();
    this.updateLabels(s);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.dirty = false;
    this.measureLabels();
    return true;
  }

  /**
   * Phiên bản cấu trúc của cảnh (thêm/bớt nhãn hoặc đích rê chuột). Các lớp con thêm đối tượng
   * sau khi dựng phải cộng phần của mình vào đây.
   */
  protected structureVersion(): number {
    return this.sky.structureVersion + this.horizon.structureVersion;
  }

  /**
   * Hiện/ẩn nhãn theo hộp kiểm, chân trời và Trái Đất che khuất, rồi gỡ chồng chéo trong không gian màn hình
   * (review-1 D2): nhãn của đối tượng đang chọn trước, sau đó theo hạng ưu tiên tĩnh (labels.ts). Không cấp phát:
   * danh sách nhãn được sắp một lần khi cấu trúc cảnh đổi; hộp nằm trong mảng cấp phát sẵn (declutter.ts).
   */
  private updateLabels(s: AppState): void {
    const version = this.structureVersion();
    if (version !== this.labelKey) {
      this.labelKey = version;
      const list = this.labelList;
      list.length = 0;
      this.scene.traverse((o) => {
        if (o instanceof CSS2DObject) list.push(o as Label);
      });
      list.sort((a, b) => a.userData.rank - b.userData.rank);
      this.boxLabel.length = list.length;
      this.boxes.ensure(list.length);
    }
    const lt = s.labels;
    const clip = this.clipBelow(s);
    const list = this.labelList;
    const W = this.width;
    const H = this.height;
    const cam = this.camera;
    cam.updateMatrixWorld();
    const boxes = this.boxes;
    boxes.reset();
    let sel: Label | null = null;
    for (let i = 0; i < list.length; i++) {
      const lbl = list[i];
      const ud = lbl.userData;
      lbl.center.set(ud.cx0, ud.cy0);
      // Nhóm cha bị ẩn: CSS2DRenderer tự ẩn cả nhánh, không cần tính vị trí/che khuất.
      if (!ancestorsVisible(lbl)) continue;
      let vis = lt.all && lt[ud.group];
      if (vis) {
        // matrixWorld đã cập nhật trong frame() (scene.updateMatrixWorld) — không gọi getWorldPosition.
        _v.setFromMatrixPosition(lbl.matrixWorld);
        if (clip && ud.hideBelowHorizon && _v.y < -0.03 * this.R) vis = false;
        else if (this.isOccluded(_v)) vis = false;
      }
      lbl.visible = vis;
      if (vis && sel === null && isSelectedLabel(ud, s.selected)) sel = lbl;
    }
    // Đối tượng đang chọn được giữ chỗ đầu tiên, rồi tới các nhãn khác theo hạng.
    if (sel) this.pushBox(sel, W, H, true);
    for (let i = 0; i < list.length; i++) {
      const lbl = list[i];
      if (lbl === sel || !lbl.visible || !ancestorsVisible(lbl)) continue;
      this.pushBox(lbl, W, H, lbl.userData.rank < 20);
    }
    declutter(boxes, W, H);
    for (let k = 0; k < boxes.n; k++) {
      const lbl = this.boxLabel[k];
      if (!boxes.keep[k]) {
        lbl.visible = false;
        continue;
      }
      const ud = lbl.userData;
      const w = ud.w || estimateWidth(lbl);
      const h = ud.h || EST_H;
      if (boxes.dx[k] !== 0) lbl.center.x = ud.cx0 - boxes.dx[k] / w;
      if (boxes.dy[k] !== 0) lbl.center.y = ud.cy0 - boxes.dy[k] / h;
    }
  }

  /** Chiếu nhãn ra hộp màn hình và đưa vào danh sách gỡ chồng chéo (bỏ qua nhãn nằm sau camera). */
  private pushBox(lbl: Label, W: number, H: number, canNudge: boolean): void {
    _p.setFromMatrixPosition(lbl.matrixWorld).project(this.camera);
    if (_p.z < -1 || _p.z > 1) return;
    const ud = lbl.userData;
    if (ud.w === 0) this.needMeasure = true;
    const w = ud.w || estimateWidth(lbl);
    const h = ud.h || EST_H;
    const sx = ((_p.x + 1) / 2) * W;
    const sy = ((1 - _p.y) / 2) * H;
    // Chỉ đẩy vào trong khi điểm neo còn nằm trong khung; điểm ở ngoài khung thì nhãn bị ẩn.
    const inside = sx >= 0 && sx <= W && sy >= 0 && sy <= H;
    this.boxLabel[this.boxes.n] = lbl;
    this.boxes.push(sx - ud.cx0 * w, sy - ud.cy0 * h, w, h, canNudge && inside);
  }

  /** Đo hộp của nhãn vừa hiện mà chưa có kích thước (một lần mỗi khi chữ đổi độ dài hoặc cỡ chữ đổi). */
  private measureLabels(): void {
    if (!this.needMeasure) return;
    this.needMeasure = false;
    const list = this.labelList;
    for (let i = 0; i < list.length; i++) {
      const lbl = list[i];
      const ud = lbl.userData;
      if (ud.w !== 0 || !lbl.visible || lbl.element.style.display === 'none' || !lbl.element.isConnected) continue;
      const w = lbl.element.offsetWidth;
      if (w > 0) {
        ud.w = w;
        ud.h = lbl.element.offsetHeight;
        // Gỡ chồng chéo lại ở khung hình sau với kích thước thật.
        this.dirty = true;
      }
    }
  }

  /**
   * Hệ số độ dày mọi đường Line2 (chế độ trình chiếu: ×2 để đọc được trên máy chiếu, review-1 H1). Chỉ đổi uniform
   * qua setFatLineStyle — không dựng hình học. Tô sáng liên kết nhân thêm trên hệ số này (EmphasisFx.setScale).
   */
  setLineScale(k: number): void {
    if (k === this.lineScale) return;
    this.lineScale = k;
    this.scene.traverse((o) => {
      if (!(o as Line2).isLine2) return;
      const line = o as Line2;
      const m = line.material as LineMaterial;
      let w0 = this.baseWidths.get(line);
      if (w0 === undefined) {
        w0 = m.linewidth;
        this.baseWidths.set(line, w0);
      }
      setFatLineStyle(line, { width: w0 * k });
    });
    this.emphasis.setScale(k);
    this.invalidateLabelSizes();
  }

  /** Cỡ chữ nhãn đổi (chế độ trình chiếu): đo lại mọi nhãn ở lần vẽ tới. */
  invalidateLabelSizes(): void {
    for (const lbl of this.labelList) lbl.userData.w = 0;
    this.needMeasure = true;
    this.dirty = true;
  }

  resetCamera(): void {
    this.camera.position.copy(this.defaultCamera);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.dirty = true;
  }

  private toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.renderer.domElement.getBoundingClientRect();
    _local.x = clientX - r.left;
    _local.y = clientY - r.top;
    return _local;
  }

  /** Tìm sao / Mặt Trời gần vị trí con trỏ nhất (theo pixel trên màn hình). */
  pickAt(clientX: number, clientY: number): NonNullable<Selection> | null {
    const s = this.store.state;
    const { x, y } = this.toLocal(clientX, clientY);
    this.scene.updateMatrixWorld();
    const m = this.sky.rot.matrixWorld;
    const clip = this.clipBelow(s);
    const w = this.width;
    const h = this.height;
    return this.sky.pickBest(s, (local, tolerancePx, priority) => {
      _v.copy(local).applyMatrix4(m);
      if (clip && _v.y < -0.02 * this.R) return Infinity;
      _p.copy(_v).project(this.camera);
      if (_p.z > 1) return Infinity;
      const sx = ((_p.x + 1) / 2) * w;
      const sy = ((1 - _p.y) / 2) * h;
      const d = Math.hypot(sx - x, sy - y);
      if (d > tolerancePx) return Infinity;
      // Kiểm tra che khuất sau cùng (tốn nhất) — chỉ cho điểm đã nằm gần con trỏ.
      if (this.isOccluded(_v)) return Infinity;
      return d - priority * 3;
    });
  }

  /** Đối tượng dưới con trỏ: ưu tiên sao, sau đó tới các đường/mặt có chú thích. */
  hoverAt(clientX: number, clientY: number): HoverInfo | null {
    const sel = this.pickAt(clientX, clientY);
    if (sel) return { kind: 'object', sel };
    const s = this.store.state;
    const { x, y } = this.toLocal(clientX, clientY);
    _ndc.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(_ndc, this.camera);
    const version = this.structureVersion();
    if (version !== this.hoverKey) {
      this.hoverKey = version;
      this.hoverList = this.hoverTargets();
    }
    const clip = this.clipBelow(s);
    const hits = this.raycaster.intersectObjects(this.hoverList, false).filter((h) => {
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

/** Chiều cao ước lượng của nhãn chưa đo (px). */
const EST_H = 16;

/** Bề rộng ước lượng của nhãn chưa đo (px) — chỉ dùng cho khung hình đầu tiên trước khi đo. */
function estimateWidth(lbl: Label): number {
  return (lbl.element.textContent?.length ?? 0) * 7 + 6;
}

function isSelectedLabel(ud: LabelData, sel: Selection): boolean {
  if (!sel || ud.selKind !== sel.kind) return false;
  if (sel.kind === 'user') return ud.selId === sel.id;
  if (sel.kind === 'catalog') return ud.selIdx === sel.index;
  return true;
}

function ancestorsVisible(o: THREE.Object3D): boolean {
  let p = o.parent;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
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
