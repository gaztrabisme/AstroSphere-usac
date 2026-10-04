// Tiện ích dựng tình huống trên mô phỏng — dùng cho các nhiệm vụ Ôn tập.

import type { Actions, Store } from './state';

export interface ScenarioContext {
  store: Store;
  actions: Actions;
}

/** Một số địa điểm hay dùng trong bài học. */
export const PLACES = {
  hanoi: { lat: 21.03, lon: 105.85 },
  hcm: { lat: 10.82, lon: 106.63 },
} as const;

export type PlaceKey = keyof typeof PLACES;

/** Thêm mẫu chòm sao nếu chưa có. */
export function ensureConstellation(ctx: ScenarioContext, id: string): void {
  if (!ctx.actions.hasConstellation(id)) ctx.actions.addConstellation(id);
}

/** Chọn sao (đã có trong danh sách sao người dùng) theo số Hipparcos. */
export function selectHip(ctx: ScenarioContext, hip: number): boolean {
  const star = ctx.store.state.stars.find((x) => x.hip === hip);
  if (star) ctx.actions.select({ kind: 'user', id: star.id });
  return !!star;
}

/** Bật/tắt cả ba vùng tô màu (cận cực, mọc – lặn, không mọc). */
export function zones(ctx: ScenarioContext, on: boolean): void {
  ctx.actions.setToggle('zoneCircumpolar', on);
  ctx.actions.setToggle('zoneRiseSet', on);
  ctx.actions.setToggle('zoneNeverRise', on);
}
