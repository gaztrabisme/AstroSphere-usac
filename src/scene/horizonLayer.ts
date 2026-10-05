// Lớp "chân trời": các đối tượng gắn với người quan sát (chân trời, kinh tuyến, thiên đỉnh/thiên để,
// lưới độ cao–phương vị, đường thẳng đứng qua sao đang chọn, các góc minh họa).
// Dựng trong khung chân trời 3D (X = Đông, Y = Thiên đỉnh, Z = Nam); ở khung thiên cầu được quay (90° − φ).

import * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';
import { equatorialToHorizontal, equatorInclination, fmtDeg, poleAltitude, sunPosition } from '../astro';
import { t } from '../i18n';
import { catalogArrays } from '../data/catalog';
import { sunJd } from '../selection';
import { lstOf, type AppState, type Selection } from '../state';
import { horizonFrameMatrix, horVec, type ViewKind } from './frames';
import {
  COLORS,
  dynamicFatLine,
  fatLine,
  greatArcInto,
  polylineToSegments,
  sectorGeometry,
  thinSegments,
  translucent,
  writeFatLine,
} from './geom';
import type { EmphasisFx } from './emphasis';
import { makeLabel, setLabelText, type Label } from './labels';

/** Số điểm tối đa của các cung động (cung phương vị: 0…360° mỗi 3° → 121 điểm). */
const MAX_ARC_POINTS = 121;
const _pts = new Float32Array(MAX_ARC_POINTS * 3);
const _star = new THREE.Vector3();
const _foot = new THREE.Vector3();
const _zen = new THREE.Vector3();
const _a = new THREE.Vector3();
const _radec = { ra: 0, dec: 0 };

export class HorizonLayer {
  readonly group = new THREE.Group();
  /** Nhãn và đích rê chuột của lớp này cố định sau khi dựng (xem SkyLayer.structureVersion). */
  readonly structureVersion = 0;
  private ring = new THREE.Group();
  private meridian = new THREE.Group();
  private meridianLine: Line2;
  private zenith = new THREE.Group();
  private grid = new THREE.Group();
  private vertical = new THREE.Group();
  private azGroup = new THREE.Group();
  private verticalLine: Line2;
  private altArc: Line2;
  private azArc: Line2;
  private altLabel: Label;
  private azLabel: Label;
  private angle = new THREE.Group();
  private angleSector: THREE.Mesh;
  private angleArc: Line2;
  private angleLabel: Label;
  private poleAlt = new THREE.Group();
  private poleSector: THREE.Mesh;
  private poleArc: Line2;
  private poleLabel: Label;
  private latKey = NaN;
  /** Khóa của lần dựng đường thẳng đứng gần nhất (đối tượng chọn, h, A làm tròn 0,001°, bật/tắt). */
  private vKeySel: Selection | undefined = undefined;
  private vKeyStars: AppState['stars'] | null = null;
  private vKeyAlt = NaN;
  private vKeyAz = NaN;
  private vKeyOn = false;
  private sunKey = '';
  private sunRa = 0;
  private sunDec = 0;
  private readonly view: ViewKind;
  private readonly R: number;

  constructor(view: ViewKind, R: number) {
    this.view = view;
    this.R = R;
    this.group.matrixAutoUpdate = false;

    // Đường chân trời và các hướng
    const ringPts: THREE.Vector3[] = [];
    for (let a = 0; a <= 360; a += 2) ringPts.push(horVec(0, a, R));
    const ring = fatLine(ringPts, COLORS.horizon, { width: view === 'horizon' ? 2.6 : 2.2, opacity: view === 'horizon' ? 1 : 0.85 });
    ring.userData.tip = 'horizon';
    this.ring.add(ring);
    const dirs: [string, number][] = [
      ['scene.dirN', 0],
      ['scene.dirE', 90],
      ['scene.dirS', 180],
      ['scene.dirW', 270],
    ];
    for (const [key, az] of dirs) {
      const lbl = makeLabel(t(key), 'directions', { cls: 'lbl--dir', hideBelowHorizon: false });
      lbl.position.copy(horVec(0, az, R * (view === 'horizon' ? 1.1 : 1.07)));
      this.ring.add(lbl);
    }
    this.group.add(this.ring);

    // Kinh tuyến thiên cầu: vòng tròn lớn qua Bắc – Thiên đỉnh – Nam – Thiên để
    const mer: THREE.Vector3[] = [];
    for (let a = 0; a <= 360; a += 2) mer.push(new THREE.Vector3(0, Math.sin((a * Math.PI) / 180) * R, Math.cos((a * Math.PI) / 180) * R));
    const merLine = fatLine(mer, COLORS.meridian, { width: 1.6, opacity: 0.8 });
    merLine.userData.tip = 'meridian';
    this.meridianLine = merLine;
    this.meridian.add(merLine);
    const merLbl = makeLabel(t('scene.meridian'), 'circles', { color: COLORS.meridian, anchor: [0.5, 1.2] });
    merLbl.position.copy(horVec(62, 180, R * 1.03));
    this.meridian.add(merLbl);
    this.group.add(this.meridian);

    // Thiên đỉnh / Thiên để
    for (const sign of [1, -1]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.02, 14, 10), new THREE.MeshBasicMaterial({ color: COLORS.zenith }));
      dot.position.set(0, sign * R, 0);
      dot.userData.tip = sign > 0 ? 'zenith' : 'nadir';
      this.zenith.add(dot);
      const lbl = makeLabel(t(sign > 0 ? 'scene.zenith' : 'scene.nadir'), 'poles', { color: '#f8fafc' });
      lbl.position.set(0, sign * R * 1.07, 0);
      this.zenith.add(lbl);
    }
    const zLine = fatLine([new THREE.Vector3(0, view === 'horizon' ? 0 : 0.3 * R, 0), new THREE.Vector3(0, R, 0)], COLORS.zenith, {
      width: 1.2,
      opacity: 0.6,
      dashed: true,
      dashSize: R * 0.03,
      gapSize: R * 0.02,
    });
    zLine.userData.tip = 'zenithLine';
    this.zenith.add(zLine);
    this.group.add(this.zenith);

    // Lưới độ cao – phương vị
    const seg: number[] = [];
    for (const alt of [-60, -30, 30, 60]) {
      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 360; a += 4) pts.push(horVec(alt, a, R * 0.999));
      polylineToSegments(pts, seg);
    }
    for (let az = 0; az < 360; az += 30) {
      const pts: THREE.Vector3[] = [];
      for (let alt = -90; alt <= 90; alt += 3) pts.push(horVec(alt, az, R * 0.999));
      polylineToSegments(pts, seg);
    }
    const grid = thinSegments(seg, COLORS.altAzGrid, 0.35);
    grid.userData.tip = 'altAzGrid';
    this.grid.add(grid);
    for (const alt of [30, 60]) {
      const l = makeLabel(`${alt}°`, 'circles', { cls: 'lbl--small', color: '#a7f3d0' });
      l.position.copy(horVec(alt, 135, R * 1.01));
      this.grid.add(l);
    }
    this.group.add(this.grid);

    // Đường thẳng đứng qua đối tượng đang chọn + cung độ cao, cung phương vị
    const bounds = R * 1.01;
    this.verticalLine = dynamicFatLine(49, COLORS.vertical, { width: 1.6, opacity: 0.85, dashed: true, dashSize: R * 0.03, gapSize: R * 0.02, boundsRadius: bounds });
    this.verticalLine.userData.tip = 'vertical';
    this.altArc = dynamicFatLine(46, COLORS.vertical, { width: 4, boundsRadius: bounds });
    this.altArc.userData.tip = 'altitudeArc';
    this.azArc = dynamicFatLine(MAX_ARC_POINTS, COLORS.azimuth, { width: 4, boundsRadius: bounds });
    this.azArc.userData.tip = 'azimuthArc';
    this.altLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: COLORS.vertical });
    this.azLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: COLORS.azimuth, hideBelowHorizon: false });
    this.azGroup.add(this.azArc, this.azLabel);
    this.azGroup.visible = view === 'horizon';
    this.vertical.add(this.verticalLine, this.altArc, this.altLabel, this.azGroup);
    this.group.add(this.vertical);

    // Góc giữa xích đạo trời và chân trời (trong mặt phẳng kinh tuyến)
    this.angleSector = new THREE.Mesh(new THREE.BufferGeometry(), translucent(COLORS.angle, 0.28));
    this.angleSector.userData.tip = 'angle';
    this.angleArc = dynamicFatLine(41, COLORS.angle, { width: 2.4, boundsRadius: R * 0.6 });
    this.angleLabel = makeLabel('', 'angles', { cls: 'lbl--angle lbl--key', edge: COLORS.angle, anchor: [-0.04, 0.5], emph: 'incl' });
    this.angle.add(this.angleSector, this.angleArc, this.angleLabel);
    this.group.add(this.angle);

    // Độ cao thiên cực = vĩ độ
    this.poleSector = new THREE.Mesh(new THREE.BufferGeometry(), translucent(COLORS.axis, 0.35));
    this.poleSector.userData.tip = 'poleAltitude';
    this.poleArc = dynamicFatLine(41, COLORS.axis, { width: 3, boundsRadius: R * 0.6 });
    // Chip tối, chữ sáng, viền xanh của trục: không còn "xanh trên xanh trên xanh lá" (review-1 F2). Nhãn đặt ngay
    // ngoài trung điểm của cung, chữ chạy ra xa trục.
    this.poleLabel = makeLabel('', 'angles', { cls: 'lbl--angle lbl--key', edge: COLORS.axis, anchor: [-0.04, 0.5], emph: 'pole' });
    // Vị trí thay thế dọc theo cung (ghi lại khi vĩ độ đổi): nhãn nhường chỗ cho chữ hướng B/N thay vì che nó.
    this.poleLabel.userData.alts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.angleLabel.userData.alts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.poleAlt.add(this.poleSector, this.poleArc, this.poleLabel);
    this.group.add(this.poleAlt);
  }

  private rebuildAngles(lat: number): void {
    const R = this.R;
    const r = R * 0.55;
    const rp = R * 0.5;
    const north = lat >= 0;
    // Góc xích đạo – chân trời: từ điểm Nam (Bắc bán cầu) lên tới điểm cao nhất của xích đạo trời.
    const incl = equatorInclination(lat);
    const baseAz = north ? 180 : 0;
    const from = horVec(0, baseAz, 1);
    const to = horVec(incl, baseAz, 1);
    this.angleSector.geometry.dispose();
    this.angleSector.geometry = sectorGeometry(from, to, r);
    writeFatLine(this.angleArc, _pts, greatArcInto(from, to, r, 40, _pts));
    this.angleLabel.position.copy(horVec(incl * 0.6, baseAz, r * 1.08));
    const aAlts = this.angleLabel.userData.alts!;
    horVec(incl * 0.35, baseAz, r * 1.08, aAlts[0]);
    horVec(incl * 0.85, baseAz, r * 1.08, aAlts[1]);
    horVec(incl * 0.15, baseAz, r * 1.08, aAlts[2]);
    horVec(Math.min(incl + 8, 89), baseAz, r * 1.08, aAlts[3]);
    setLabelText(this.angleLabel, `90° − |φ| = ${fmtDeg(incl)}`);

    // Độ cao thiên cực: từ điểm Bắc lên thiên cực Bắc (hoặc từ Nam lên thiên cực Nam).
    const pAlt = poleAltitude(lat);
    const pAz = north ? 0 : 180;
    const pf = horVec(0, pAz, 1);
    const pt = horVec(pAlt, pAz, 1);
    this.poleSector.geometry.dispose();
    this.poleSector.geometry = pAlt < 0.01 ? new THREE.BufferGeometry() : sectorGeometry(pf, pt, rp);
    if (pAlt < 0.01) writeFatLine(this.poleArc, _pts, greatArcInto(pf, pf, rp, 1, _pts));
    else writeFatLine(this.poleArc, _pts, greatArcInto(pf, pt, rp, 40, _pts));
    this.poleLabel.position.copy(horVec(Math.max(pAlt / 2, 4), pAz, rp * 1.06));
    // Thứ tự thử: gần chân trời hơn, gần thiên cực hơn, sát chân trời, rồi vượt quá thiên cực.
    const pAlts = this.poleLabel.userData.alts!;
    horVec(Math.max(pAlt * 0.25, 2), pAz, rp * 1.06, pAlts[0]);
    horVec(Math.max(pAlt * 0.75, 6), pAz, rp * 1.06, pAlts[1]);
    horVec(1, pAz, rp * 1.06, pAlts[2]);
    horVec(Math.min(pAlt + 8, 89), pAz, rp * 1.06, pAlts[3]);
    horVec(Math.min(pAlt + 16, 89), pAz, rp * 1.06, pAlts[4]);
    setLabelText(this.poleLabel, `${t(north ? 'scene.ncpAltitude' : 'scene.scpAltitude')} = |φ| = ${fmtDeg(pAlt)}`);
  }

  /** Đăng ký các đối tượng của lớp này cho tô sáng liên kết (xem emphasis.ts). */
  registerEmphasis(fx: EmphasisFx): void {
    fx.add('pole', this.poleArc, this.poleSector);
    fx.add('incl', this.angleArc, this.angleSector);
    fx.add('az', this.azArc, this.verticalLine);
    fx.add('alt', this.altArc, this.verticalLine);
    fx.add('altaz', this.azArc, this.altArc, this.verticalLine);
    fx.add('meridian', this.meridianLine);
  }

  /** `emphasis`: nhóm đang tô sáng — các đối tượng của nhóm hiện ra kể cả khi hộp kiểm tắt (xem trước). */
  update(s: AppState, emphasis: string | null = null): void {
    const tg = s.toggles;
    const isHorizon = this.view === 'horizon';
    if (s.lat !== this.latKey) {
      this.latKey = s.lat;
      horizonFrameMatrix(this.view, s.lat, this.group.matrix);
      this.group.matrixWorldNeedsUpdate = true;
      this.rebuildAngles(s.lat);
    }
    this.ring.visible = isHorizon || tg.horizonOnSphere;
    this.meridian.visible = tg.meridian || emphasis === 'meridian';
    this.zenith.visible = tg.zenithNadir;
    this.grid.visible = tg.altAzGrid;
    this.angle.visible = isHorizon && (tg.angle || emphasis === 'incl');
    this.poleAlt.visible = isHorizon && (tg.poleAltitude || emphasis === 'pole');
    this.updateVertical(s, emphasis === 'az' || emphasis === 'alt' || emphasis === 'altaz');
  }

  /**
   * (α, δ) của đối tượng đang chọn, không cấp phát (khác resolveSelection: không dựng tên/mô tả).
   * Trả về null nếu không có đối tượng hợp lệ.
   */
  private selectedRaDec(s: AppState): { ra: number; dec: number } | null {
    const sel = s.selected;
    if (!sel) return null;
    if (sel.kind === 'user') {
      const stars = s.stars;
      for (let i = 0; i < stars.length; i++) {
        if (stars[i].id === sel.id) {
          _radec.ra = stars[i].ra;
          _radec.dec = stars[i].dec;
          return _radec;
        }
      }
      return null;
    }
    if (sel.kind === 'catalog') {
      const cat = catalogArrays();
      if (sel.index < 0 || sel.index >= cat.ra.length) return null;
      _radec.ra = cat.ra[sel.index];
      _radec.dec = cat.dec[sel.index];
      return _radec;
    }
    if (!s.toggles.sun) return null;
    if (s.sunDate !== this.sunKey) {
      this.sunKey = s.sunDate;
      const p = sunPosition(sunJd(s.sunDate));
      this.sunRa = p.ra;
      this.sunDec = p.dec;
    }
    _radec.ra = this.sunRa;
    _radec.dec = this.sunDec;
    return _radec;
  }

  /** Cập nhật đường thẳng đứng theo vị trí hiện tại của đối tượng đang chọn. */
  updateVertical(s: AppState, preview = false): void {
    const on = s.toggles.verticalCircle || preview;
    const obj = on ? this.selectedRaDec(s) : null;
    this.vertical.visible = !!obj;
    if (!obj) {
      this.vKeyOn = false;
      return;
    }
    const { alt, az } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lstOf(s));
    // Bỏ qua khi không có gì đổi đáng kể (0,001°): selection, danh sách sao, h, A, bật/tắt.
    const altK = Math.round(alt * 1000);
    const azK = Math.round(az * 1000);
    if (this.vKeyOn && s.selected === this.vKeySel && s.stars === this.vKeyStars && altK === this.vKeyAlt && azK === this.vKeyAz) return;
    this.vKeyOn = true;
    this.vKeySel = s.selected;
    this.vKeyStars = s.stars;
    this.vKeyAlt = altK;
    this.vKeyAz = azK;

    const R = this.R;
    const star = horVec(alt, az, 1, _star);
    const foot = horVec(0, az, 1, _foot);
    const zen = _zen.set(0, alt >= 0 ? 1 : -1, 0);
    // Cung từ thiên đỉnh (hoặc thiên để) qua sao tới chân trời
    writeFatLine(this.verticalLine, _pts, greatArcInto(zen, foot, R * 1.001, 48, _pts));
    // Cung độ cao h (từ chân trời đến sao)
    writeFatLine(this.altArc, _pts, greatArcInto(foot, star, R * 1.002, Math.max(4, Math.ceil(Math.abs(alt) / 2)), _pts));
    horVec(alt / 2, az + 4, R * 1.04, this.altLabel.position);
    setLabelText(this.altLabel, `h = ${fmtDeg(alt, 1)}`);
    // Cung phương vị A (dọc chân trời, từ Bắc qua Đông)
    const rr = this.view === 'horizon' ? R * 0.35 : R * 1.003;
    const steps = Math.min(MAX_ARC_POINTS - 1, Math.max(2, Math.ceil(az / 3)));
    for (let i = 0; i <= steps; i++) {
      horVec(0, (az * i) / steps, rr, _a);
      _pts[i * 3] = _a.x;
      _pts[i * 3 + 1] = _a.y;
      _pts[i * 3 + 2] = _a.z;
    }
    writeFatLine(this.azArc, _pts, steps + 1);
    horVec(0, az / 2, rr * (this.view === 'horizon' ? 1.25 : 1.05), this.azLabel.position);
    setLabelText(this.azLabel, `A = ${fmtDeg(az, 1)}`);
  }

  hoverTargets(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    this.group.traverse((o) => {
      if (o.userData.tip) out.push(o);
    });
    return out;
  }
}
