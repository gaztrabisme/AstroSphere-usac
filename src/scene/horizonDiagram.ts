// Khung nhìn phải: giản đồ chân trời — người quan sát đứng ở tâm mặt phẳng chân trời.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { equatorialToHorizontal, sunPosition } from '../astro';
import { sunJd } from '../selection';
import { lstOf, type AppState, type Store } from '../state';
import { horVec } from './frames';
import { COLORS, polylineToSegments, thinSegments } from './geom';
import { SKY_RADIUS, View } from './view';

const NIGHT = new THREE.Color('#050913');
const TWILIGHT = new THREE.Color('#141f3d');
const DAY = new THREE.Color('#1d4374');
/** Độ đục của đĩa chân trời (review-3 B2: 0,92 → 0,55): mặt đất lùi về sau, thiên cực, trục, cung h/A nổi lên. */
const GROUND_OPACITY = 0.55;
/** Góc nhìn ngang (độ) của giản đồ chân trời trong khung dọc. */
const PORTRAIT_HFOV = 46;
/** Khung dọc: dời cảnh lên (tỉ lệ chiều cao khung). */
const PORTRAIT_SHIFT = 0.06;
const DEG = Math.PI / 180;

export class HorizonDiagramView extends View {
  private ground: THREE.Mesh;
  private groundMat: THREE.MeshBasicMaterial;
  private dome: THREE.Mesh;
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.02);
  private firstPerson = false;
  private person = new THREE.Group();
  private bg = new THREE.Color();
  /** Mảng mặt phẳng cắt cấp phát sẵn — gán lại cùng tham chiếu, không tạo mảng mới mỗi lần cập nhật. */
  private readonly noPlanes: THREE.Plane[] = [];
  private readonly clipPlanes: THREE.Plane[];
  private sunKey = '';
  private sunRa = 0;
  private sunDec = 0;

  constructor(container: HTMLElement, store: Store) {
    const R = SKY_RADIUS;
    // Nhìn vào điểm hơi cao hơn tâm (0,2 R): vòm trời và mặt phẳng chân trời lấp đầy khung, không để trống dải dưới
    // đĩa chân trời (khung chân trời là tiêu điểm của trang — review-1 B1, color-theory T1).
    const target = new THREE.Vector3(0, R * 0.2, 0);
    super(container, 'horizon', store, new THREE.Vector3(R * 1.17, R * 1.0, R * 2.42).add(target), target);
    this.clipPlanes = [this.clipPlane];
    this.scene.background = new THREE.Color().copy(NIGHT);

    // Mặt phẳng chân trời
    this.groundMat = new THREE.MeshBasicMaterial({ color: COLORS.ground, transparent: true, opacity: GROUND_OPACITY, side: THREE.DoubleSide });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(R, 128), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.renderOrder = -1;
    this.ground.userData.tip = 'ground';
    this.scene.add(this.ground);

    // Vạch trên mặt đất: trục Bắc–Nam, Đông–Tây, vạch phương vị mỗi 10°, vòng tròn đồng tâm
    const seg: number[] = [];
    seg.push(0, 0.01, -R, 0, 0.01, R, -R, 0.01, 0, R, 0.01, 0);
    for (let az = 0; az < 360; az += 10) {
      const inner = horVec(0, az, R * (az % 30 === 0 ? 0.92 : 0.96));
      const outer = horVec(0, az, R);
      seg.push(inner.x, 0.01, inner.z, outer.x, 0.01, outer.z);
    }
    for (const rr of [R / 3, (2 * R) / 3]) {
      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 360; a += 4) pts.push(horVec(0, a, rr).setY(0.01));
      polylineToSegments(pts, seg);
    }
    const marks = thinSegments(seg, '#a7d7a9', 0.32);
    this.scene.add(marks);

    // Người quan sát (hình nhân đơn giản)
    const person = this.person;
    const bodyMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.012, R * 0.018, R * 0.06, 12), bodyMat);
    body.position.y = R * 0.03;
    const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.016, 12, 10), bodyMat);
    head.position.y = R * 0.075;
    body.userData.tip = 'observer';
    head.userData.tip = 'observer';
    person.add(body, head);
    this.scene.add(person);

    // Vòm trời mờ giúp cảm nhận chiều sâu
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.995, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#4b6cb7', transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false }),
    );
    this.dome.renderOrder = -3;
    this.dome.userData.tip = 'skyDome';
    this.scene.add(this.dome);

    // Ánh sáng cho mô hình 3D người quan sát (các đối tượng khác dùng vật liệu không chịu sáng)
    this.scene.add(new THREE.HemisphereLight('#dbe6ff', '#2f4a2f', 2.2));
    // Đèn chính gắn theo camera: nhìn từ hướng nào mô hình cũng được chiếu sáng phía trước.
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(0.4, 0.8, 1);
    this.camera.add(key);
    this.scene.add(this.camera);
    this.loadObserverModel();

    this.update(store.state);
  }

  /**
   * Thay hình nhân mặc định bằng mô hình glTF (public/models/usui-chan.glb) nếu có.
   * Mô hình được co giãn về chiều cao cố định, đặt chân lên mặt phẳng chân trời; hướng mặt do onUpdate đặt
   * (luôn nhìn về thiên cực nằm trên chân trời).
   */
  private loadObserverModel(): void {
    const url = `${import.meta.env.BASE_URL}models/usui-chan.glb`;
    new GLTFLoader().load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const height = this.R * 0.2;
        const k = height / Math.max(size.y, 1e-6);
        model.scale.setScalar(k);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x * k, -box.min.y * k, -center.z * k);
        // Nâng nhẹ khỏi mặt đất để đáy bệ không trùng mặt phẳng chân trời (tránh nhấp nháy z-fighting).
        model.position.y += this.R * 0.004;
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.userData.tip = 'observer';
          // Lưới có xương (VRoid) có khối bao sai so với tư thế thật → bị loại khỏi khung nhìn ở vài góc. Tắt cắt xén.
          mesh.frustumCulled = false;
          // VRoid xuất mọi vật liệu ở chế độ BLEND (trong suốt, không ghi chiều sâu) nên khi xoay, các phần
          // tóc/mặt/thân đè nhau sai thứ tự. Chuyển sang chế độ cắt alpha: vẽ như vật đặc, vẫn giữ viền tóc, mi mắt.
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if (!m.transparent) continue;
            m.transparent = false;
            m.alphaTest = Math.max(m.alphaTest, 0.5);
            m.depthWrite = true;
            m.needsUpdate = true;
          }
        });
        this.person.clear();
        this.person.add(model);
        this.dirty = true;
      },
      undefined,
      () => {
        /* Chưa có mô hình: giữ hình nhân đơn giản */
      },
    );
  }

  protected clipBelow(s: AppState): boolean {
    return !s.toggles.underside;
  }

  protected onUpdate(s: AppState, _emphasis: string | null = null): void {
    // Mô hình glTF mặc định nhìn về +Z (Nam). Quay 180° để nhìn về Bắc (−Z) — nơi có thiên cực Bắc — khi ở Bắc bán cầu;
    // ở Nam bán cầu giữ hướng Nam để nhìn về thiên cực Nam.
    this.person.rotation.y = s.lat >= 0 ? Math.PI : 0;
    const under = s.toggles.underside;
    const planes = under ? this.noPlanes : this.clipPlanes;
    if (this.renderer.clippingPlanes !== planes) this.renderer.clippingPlanes = planes;
    this.groundMat.opacity = under ? 0.42 : this.firstPerson ? 1 : GROUND_OPACITY;
    this.groundMat.depthWrite = !under;
    this.sky.setBelowDim(under ? 0.45 : 1);

    // Màu nền theo độ cao Mặt Trời (khi bật Mặt Trời) — tính vào màu nháp `bg`, không clone.
    const bg = this.bg.copy(NIGHT);
    if (s.toggles.sun) {
      if (s.sunDate !== this.sunKey) {
        this.sunKey = s.sunDate;
        const p = sunPosition(sunJd(s.sunDate));
        this.sunRa = p.ra;
        this.sunDec = p.dec;
      }
      const alt = equatorialToHorizontal(this.sunRa, this.sunDec, s.lat, lstOf(s)).alt;
      if (alt > 0) bg.copy(DAY);
      else if (alt > -12) bg.copy(TWILIGHT).lerp(DAY, ((alt + 12) / 12) * 0.5);
      else if (alt > -18) bg.copy(NIGHT).lerp(TWILIGHT, (alt + 18) / 6);
    }
    (this.scene.background as THREE.Color).copy(bg);
  }

  protected preferredFov(aspect: number): number {
    // Khung ngang rộng (màn hình máy tính): thu hẹp góc nhìn để vòm trời và đĩa chân trời lấp khung — khung chân
    // trời là tiêu điểm của trang (review-2 B2, color-theory T1).
    if (this.firstPerson) return 75;
    if (aspect >= 1.2) return 37;
    // Khung dọc (điện thoại, review-3 B4): bề ngang là giới hạn — chọn góc nhìn dọc sao cho góc nhìn NGANG cố định
    // (~46°, vòm và đĩa lấp bề ngang, còn chỗ cho chữ T/Đ), thay vì góc dọc cố định để lại trời trống phía trên.
    return Math.min(62, Math.max(37, (2 * Math.atan(Math.tan((PORTRAIT_HFOV / 2) * DEG) / aspect)) / DEG));
  }

  /**
   * Khung dọc (điện thoại, review-4 B4): nút công cụ giờ là biểu tượng nổi ở góc, dải trời phía trên vòm không còn bị
   * hàng nút chiếm — đưa cảnh lên 6 % chiều cao để vòm bắt đầu cao hơn và đĩa chân trời cách xa thẻ thông tin hơn.
   */
  protected viewShiftY(aspect: number, h: number): number {
    return !this.firstPerson && aspect < 0.9 ? Math.round(h * PORTRAIT_SHIFT) : 0;
  }

  isFirstPerson(): boolean {
    return this.firstPerson;
  }

  /** Góc nhìn của người quan sát: đứng ở tâm, nhìn quanh bầu trời. */
  setFirstPerson(on: boolean): void {
    this.firstPerson = on;
    // Ở góc nhìn người quan sát, camera nằm đúng vị trí mắt nên ẩn mô hình đi.
    this.person.visible = !on;
    const R = this.R;
    if (on) {
      const eye = new THREE.Vector3(0, R * 0.06, 0);
      const lat = this.store.state.lat;
      // Nhìn về phía xích đạo trời (Nam nếu ở Bắc bán cầu), hơi ngước lên
      const dir = horVec(38, lat >= 0 ? 180 : 0, 1);
      this.controls.target.copy(eye).add(dir.clone().multiplyScalar(0.01));
      this.camera.position.copy(eye);
      this.controls.minDistance = 0.001;
      this.controls.maxDistance = 0.05;
      this.controls.enableZoom = false;
      this.controls.rotateSpeed = -0.35;
    } else {
      this.controls.minDistance = R * 1.25;
      this.controls.maxDistance = R * 7;
      this.controls.enableZoom = true;
      this.controls.rotateSpeed = 0.7;
      super.resetCamera();
    }
    this.camera.fov = this.preferredFov(this.camera.aspect);
    this.applyViewOffset();
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.onUpdate(this.store.state);
    this.dirty = true;
  }

  protected hoverTargets(): THREE.Object3D[] {
    return [...super.hoverTargets(), this.ground, this.dome, ...this.personMeshes()];
  }

  private personMeshes(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    this.person.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) out.push(o);
    });
    return out;
  }

  resetCamera(): void {
    if (this.firstPerson) this.setFirstPerson(true);
    else super.resetCamera();
  }
}
