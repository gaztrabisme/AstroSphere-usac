// Khung nhìn trái: thiên cầu với Trái Đất ở tâm và người quan sát trên bề mặt.

import * as THREE from 'three';
import type { Line2 } from 'three/addons/lines/Line2.js';
import { DEG, fmtDeg } from '../astro';
import { t } from '../i18n';
import type { AppState, Store } from '../state';
import { createEarthTexture } from './earth';
import { COLORS, dynamicFatLine, greatArcInto, sectorGeometry, translucent, writeFatLine } from './geom';
import { makeLabel, setLabelText, type Label } from './labels';
import { SKY_RADIUS, View } from './view';

const _arc = new Float32Array(41 * 3);
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();

export class CelestialSphereView extends View {
  private earth: THREE.Mesh;
  private earthR: number;
  private observer = new THREE.Group();
  private observerDot: THREE.Mesh;
  private tangent: THREE.Mesh;
  private latGroup = new THREE.Group();
  private latSector: THREE.Mesh;
  private latArc: Line2;
  private latLabel: Label;
  private lastLoc = '';
  private _ray = new THREE.Ray();
  private _sphere: THREE.Sphere;

  constructor(container: HTMLElement, store: Store) {
    const R = SKY_RADIUS;
    super(container, 'sphere', store, new THREE.Vector3(R * 1.05, R * 0.85, R * 2.75));
    this.scene.background = new THREE.Color('#04060d');
    this.earthR = this.R * 0.3;
    this._sphere = new THREE.Sphere(new THREE.Vector3(), this.earthR * 0.995);

    // Ánh sáng (để Trái Đất có khối), gắn theo camera
    this.scene.add(new THREE.AmbientLight('#ffffff', 1.4));
    const sun = new THREE.DirectionalLight('#ffffff', 1.8);
    sun.position.set(0.6, 0.8, 1);
    this.camera.add(sun);
    this.scene.add(this.camera);

    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthR, 96, 64),
      new THREE.MeshLambertMaterial({ map: createEarthTexture() }),
    );
    this.earth.userData.tip = 'earth';
    this.scene.add(this.earth);

    // Vỏ thiên cầu mờ để thấy rõ khối cầu
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(this.R, 64, 48),
      new THREE.MeshBasicMaterial({ color: '#2b4a8a', transparent: true, opacity: 0.07, side: THREE.BackSide, depthWrite: false }),
    );
    shell.renderOrder = -5;
    this.scene.add(shell);

    // Người quan sát + mặt phẳng chân trời tiếp xúc
    this.observerDot = new THREE.Mesh(new THREE.SphereGeometry(this.R * 0.028, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.observerDot.userData.tip = 'observer';
    this.observer.add(this.observerDot);
    this.tangent = new THREE.Mesh(new THREE.CircleGeometry(this.R * 0.17, 48), translucent(COLORS.horizon, 0.55));
    this.tangent.userData.tip = 'observerHorizon';
    this.observer.add(this.tangent);
    const obsLabel = makeLabel(t('scene.observer'), 'poles', { cls: 'lbl--small', color: '#ffffff', hideBelowHorizon: false });
    obsLabel.position.set(0, this.R * 0.06, 0);
    this.observerDot.add(obsLabel);
    this.scene.add(this.observer);

    // Góc vĩ độ φ ở tâm Trái Đất
    this.latSector = new THREE.Mesh(new THREE.BufferGeometry(), translucent(COLORS.latitude, 0.35));
    this.latSector.userData.tip = 'latitude';
    this.latArc = dynamicFatLine(41, COLORS.latitude, { width: 2.4, depthTest: false, boundsRadius: this.earthR * 1.7 });
    this.latLabel = makeLabel('', 'angles', { cls: 'lbl--angle', color: COLORS.latitude, hideBelowHorizon: false });
    this.latGroup.add(this.latSector, this.latArc, this.latLabel);
    this.scene.add(this.latGroup);

    this.update(store.state);
  }

  protected onUpdate(s: AppState): void {
    const key = `${s.lat},${s.lon}`;
    if (key !== this.lastLoc) {
      this.lastLoc = key;
      this.placeObserver(s.lat, s.lon);
    }
    this.latGroup.visible = s.toggles.poleAltitude;
  }

  private placeObserver(lat: number, lon: number): void {
    // Trái Đất đứng yên với kinh tuyến người quan sát hướng về +Z (xem frames.ts).
    this.earth.rotation.y = (-90 - lon) * DEG;
    const up = new THREE.Vector3(0, Math.sin(lat * DEG), Math.cos(lat * DEG));
    this.observerDot.position.copy(up).multiplyScalar(this.earthR * 1.01);
    this.tangent.position.copy(up).multiplyScalar(this.earthR * 1.02);
    this.tangent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);

    const eqDir = new THREE.Vector3(0, 0, 1);
    const r = this.earthR * 1.6;
    this.latSector.geometry.dispose();
    this.latSector.geometry = Math.abs(lat) < 0.01 ? new THREE.BufferGeometry() : sectorGeometry(eqDir, up, r);
    writeFatLine(this.latArc, _arc, Math.abs(lat) < 0.01 ? greatArcInto(eqDir, eqDir, r, 1, _arc) : greatArcInto(eqDir, up, r, 40, _arc));
    const mid = new THREE.Vector3(0, Math.sin((lat / 2) * DEG), Math.cos((lat / 2) * DEG));
    this.latLabel.position.copy(mid.multiplyScalar(r * 1.25));
    setLabelText(this.latLabel, `φ = ${fmtDeg(lat)}`);
  }

  protected isOccluded(world: THREE.Vector3): boolean {
    // Đoạn thẳng từ camera tới điểm có cắt Trái Đất không? (vectơ nháp, không cấp phát)
    const cam = this.camera.position;
    const dist = _dir.copy(world).sub(cam).length();
    if (dist < 1e-9) return false;
    this._ray.origin.copy(cam);
    this._ray.direction.copy(_dir).divideScalar(dist);
    const hit = this._ray.intersectSphere(this._sphere, _hit);
    return !!hit && hit.distanceTo(cam) < dist - 1e-3;
  }

  protected hoverTargets(): THREE.Object3D[] {
    return [...super.hoverTargets(), this.earth, this.observerDot, this.tangent, this.latSector];
  }
}

