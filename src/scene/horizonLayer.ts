// Lớp "chân trời": các đối tượng gắn với người quan sát (chân trời, kinh tuyến, thiên đỉnh/thiên để,
// lưới độ cao–phương vị, đường thẳng đứng qua sao đang chọn, các góc minh họa).
// Dựng trong khung chân trời 3D (X = Đông, Y = Thiên đỉnh, Z = Nam); ở khung thiên cầu được quay (90° − φ).

import * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';
import { equatorialToHorizontal, equatorInclination, fmtDeg, poleAltitude } from '../astro';
import { t } from '../i18n';
import { resolveSelection } from '../selection';
import { lstOf, type AppState } from '../state';
import { horizonFrameMatrix, horVec, type ViewKind } from './frames';
import { COLORS, fatLine, greatArc, polylineToSegments, sectorGeometry, setFatLinePoints, thinSegments, translucent } from './geom';
import { makeLabel, setLabelText, type Label } from './labels';

export class HorizonLayer {
  readonly group = new THREE.Group();
  private ring = new THREE.Group();
  private meridian = new THREE.Group();
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
    this.meridian.add(merLine);
    const merLbl = makeLabel(t('scene.meridian'), 'circles', { color: COLORS.meridian });
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
    this.verticalLine = fatLine([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], COLORS.vertical, { width: 1.6, opacity: 0.85, dashed: true, dashSize: R * 0.03, gapSize: R * 0.02 });
    this.verticalLine.userData.tip = 'vertical';
    this.altArc = fatLine([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], COLORS.vertical, { width: 4 });
    this.altArc.userData.tip = 'altitudeArc';
    this.azArc = fatLine([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], '#fbbf24', { width: 4 });
    this.azArc.userData.tip = 'azimuthArc';
    this.altLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: COLORS.vertical });
    this.azLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: '#fbbf24', hideBelowHorizon: false });
    this.azGroup.add(this.azArc, this.azLabel);
    this.azGroup.visible = view === 'horizon';
    this.vertical.add(this.verticalLine, this.altArc, this.altLabel, this.azGroup);
    this.group.add(this.vertical);

    // Góc giữa xích đạo trời và chân trời (trong mặt phẳng kinh tuyến)
    this.angleSector = new THREE.Mesh(new THREE.BufferGeometry(), translucent(COLORS.angle, 0.28));
    this.angleSector.userData.tip = 'angle';
    this.angleArc = fatLine([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], COLORS.angle, { width: 2.4 });
    this.angleLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: COLORS.angle, anchor: [-0.04, 0.5] });
    this.angle.add(this.angleSector, this.angleArc, this.angleLabel);
    this.group.add(this.angle);

    // Độ cao thiên cực = vĩ độ
    this.poleSector = new THREE.Mesh(new THREE.BufferGeometry(), translucent(COLORS.axis, 0.3));
    this.poleSector.userData.tip = 'poleAltitude';
    this.poleArc = fatLine([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], COLORS.axis, { width: 2.4 });
    this.poleLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: '#93c5fd', anchor: [1.04, 0.5] });
    this.poleAlt.add(this.poleSector, this.poleArc, this.poleLabel);
    this.group.add(this.poleAlt);
  }

  private rebuildAngles(lat: number): void {
    const R = this.R;
    const r = R * 0.55;
    const rp = R * 0.34;
    const north = lat >= 0;
    // Góc xích đạo – chân trời: từ điểm Nam (Bắc bán cầu) lên tới điểm cao nhất của xích đạo trời.
    const incl = equatorInclination(lat);
    const baseAz = north ? 180 : 0;
    const from = horVec(0, baseAz, 1);
    const to = horVec(incl, baseAz, 1);
    this.angleSector.geometry.dispose();
    this.angleSector.geometry = sectorGeometry(from, to, r);
    setFatLinePoints(this.angleArc, greatArc(from, to, r, 40));
    this.angleLabel.position.copy(horVec(incl * 0.6, baseAz, r * 1.08));
    setLabelText(this.angleLabel, `90° − |φ| = ${fmtDeg(incl)}`);

    // Độ cao thiên cực: từ điểm Bắc lên thiên cực Bắc (hoặc từ Nam lên thiên cực Nam).
    const pAlt = poleAltitude(lat);
    const pAz = north ? 0 : 180;
    const pf = horVec(0, pAz, 1);
    const pt = horVec(pAlt, pAz, 1);
    this.poleSector.geometry.dispose();
    this.poleSector.geometry = pAlt < 0.01 ? new THREE.BufferGeometry() : sectorGeometry(pf, pt, rp);
    setFatLinePoints(this.poleArc, pAlt < 0.01 ? [pf.clone().multiplyScalar(rp), pf.clone().multiplyScalar(rp * 1.001)] : greatArc(pf, pt, rp, 40));
    this.poleLabel.position.copy(horVec(Math.max(pAlt * 0.6, 4), pAz, rp * 1.08));
    setLabelText(this.poleLabel, `${t(north ? 'scene.ncpAltitude' : 'scene.scpAltitude')} = |φ| = ${fmtDeg(pAlt)}`);
  }

  update(s: AppState): void {
    const tg = s.toggles;
    const isHorizon = this.view === 'horizon';
    if (s.lat !== this.latKey) {
      this.latKey = s.lat;
      horizonFrameMatrix(this.view, s.lat, this.group.matrix);
      this.group.matrixWorldNeedsUpdate = true;
      this.rebuildAngles(s.lat);
    }
    this.ring.visible = isHorizon || tg.horizonOnSphere;
    this.meridian.visible = tg.meridian;
    this.zenith.visible = tg.zenithNadir;
    this.grid.visible = tg.altAzGrid;
    this.angle.visible = isHorizon && tg.angle;
    this.poleAlt.visible = isHorizon && tg.poleAltitude;
    this.updateVertical(s);
  }

  /** Cập nhật đường thẳng đứng theo vị trí hiện tại của đối tượng đang chọn. */
  updateVertical(s: AppState): void {
    const obj = s.toggles.verticalCircle ? resolveSelection(s) : null;
    this.vertical.visible = !!obj;
    if (!obj) return;
    const R = this.R;
    const { alt, az } = equatorialToHorizontal(obj.ra, obj.dec, s.lat, lstOf(s));
    const star = horVec(alt, az, 1);
    const foot = horVec(0, az, 1);
    const zen = new THREE.Vector3(0, alt >= 0 ? 1 : -1, 0);
    // Cung từ thiên đỉnh (hoặc thiên để) qua sao tới chân trời
    setFatLinePoints(this.verticalLine, greatArc(zen, foot, R * 1.001, 48));
    // Cung độ cao h (từ chân trời đến sao)
    setFatLinePoints(this.altArc, greatArc(foot, star, R * 1.002, Math.max(4, Math.ceil(Math.abs(alt) / 2))));
    this.altLabel.position.copy(horVec(alt / 2, az + 4, R * 1.04));
    setLabelText(this.altLabel, `h = ${fmtDeg(alt, 1)}`);
    // Cung phương vị A (dọc chân trời, từ Bắc qua Đông)
    const azPts: THREE.Vector3[] = [];
    const rr = this.view === 'horizon' ? R * 0.35 : R * 1.003;
    const steps = Math.max(2, Math.ceil(az / 3));
    for (let i = 0; i <= steps; i++) azPts.push(horVec(0, (az * i) / steps, rr));
    setFatLinePoints(this.azArc, azPts);
    this.azLabel.position.copy(horVec(0, az / 2, rr * (this.view === 'horizon' ? 1.25 : 1.05)));
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
