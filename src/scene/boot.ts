// Khởi tạo cảnh 3D — tải động (import()) để three.js nằm ngoài gói khởi động.

import type { Store } from '../state';
import { CelestialSphereView } from './celestialSphere';
import { HorizonDiagramView } from './horizonDiagram';

export interface SceneViews {
  sphere: CelestialSphereView;
  horizon: HorizonDiagramView;
}

/** Dựng hai khung nhìn. Ném lỗi nếu trình duyệt không hỗ trợ WebGL. */
export function bootScene(sphereHost: HTMLElement, horizonHost: HTMLElement, store: Store): SceneViews {
  const sphere = new CelestialSphereView(sphereHost, store);
  const horizon = new HorizonDiagramView(horizonHost, store);
  return { sphere, horizon };
}
