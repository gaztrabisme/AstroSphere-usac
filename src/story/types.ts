// Hợp đồng giữa ứng dụng và phần "Câu chuyện" (màn hình mở đầu + hành trình có hướng dẫn).

import type { Actions, Store } from '../state';

export type ViewKey = 'sphere' | 'horizon';

/** Những gì ứng dụng cung cấp cho phần câu chuyện. */
export interface StoryHost {
  store: Store;
  actions: Actions;
  appRoot: HTMLElement;
  reducedMotion(): boolean;
  /** Điện thoại: chuyển tab khung nhìn; máy tính: làm nổi khung nhìn. */
  showView(k: ViewKey): void;
  /** Bật/tắt chế độ "nhìn từ người quan sát" (chờ cảnh 3D tải xong). */
  setFirstPerson(on: boolean): void;
  resetCameras(): void;
  /** Mở ngăn "Ôn tập" (12 nhiệm vụ). */
  openLearning(): void;
  /** Tạm dừng vẽ 3D (vd. khi màn hình mở đầu che khung nhìn). */
  suspendRender(reason: string, on: boolean): void;
}

export interface StoryHandle {
  /** Hiện màn hình mở đầu nếu là lần đầu ghé thăm. */
  maybeShowHero(): void;
  /** Mở hành trình (tùy chọn: từ chương nào, 0-based). */
  open(chapter?: number): void;
  isOpen(): boolean;
  /** Xử lý phím khi câu chuyện đang mở; trả về true nếu đã xử lý. */
  onKey(e: KeyboardEvent): boolean;
}
