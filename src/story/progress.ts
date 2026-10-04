// Tiến độ hành trình (localStorage, qua storage.ts). Nhẹ — được tải ngay từ đầu để hiện chip "Tiếp tục".

import { isPlainObject, readJson, writeJson } from '../ui/storage';

export const STORY_KEY = 'astrosphere.story.v1';
export const SEEN_KEY = 'astrosphere.seen.v1';

/** c, s: chỉ số chương / bước (bắt đầu từ 0). done: các chương đã đi hết (id chương). */
export interface StoryProgress {
  c: number;
  s: number;
  done: string[];
}

/** Hành trình đã xong khi bước cuối (cuối chương 3) đã tới. */
export const FINISHED_MARK = 'c3';

const isIndex = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 50;

export const isProgress = (v: unknown): v is StoryProgress =>
  isPlainObject(v) && isIndex(v.c) && isIndex(v.s) && Array.isArray(v.done) && v.done.every((x) => typeof x === 'string');

export function readProgress(): StoryProgress | null {
  return readJson<StoryProgress | null>(STORY_KEY, (v): v is StoryProgress | null => isProgress(v), null);
}

export function writeProgress(p: StoryProgress): void {
  writeJson(STORY_KEY, p);
}

export const isFinished = (p: StoryProgress | null) => !!p && p.done.includes(FINISHED_MARK);

/** Bất kỳ giá trị JSON "thật" nào (true, 1, "1"…) đều tính là đã xem. */
export function readSeen(): boolean {
  return !!readJson<unknown>(SEEN_KEY, (v): v is unknown => v !== null, null);
}

export function markSeen(): void {
  writeJson(SEEN_KEY, true);
}
