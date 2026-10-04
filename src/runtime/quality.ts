// Chất lượng hiển thị thích ứng: tự hạ độ phân giải / số sao nền khi khung hình chậm.
// (Khung API cố định; logic đo được hoàn thiện ở luồng hiệu năng.)

export type QualityLevel = 0 | 1 | 2;

export interface QualitySettings {
  /** Trần tỉ lệ điểm ảnh của renderer. */
  pixelRatioCap: number;
  /** Chỉ vẽ sao nền có cấp sao ≤ giá trị này; null = vẽ tất cả. */
  catalogMagLimit: number | null;
}

export interface QualityTarget {
  setQuality(q: QualitySettings): void;
}

export interface QualityController {
  readonly level: QualityLevel;
  readonly auto: boolean;
  /** Ghi nhận thời gian một khung hình đã vẽ (ms). */
  sample(frameMs: number): void;
  attach(targets: QualityTarget[]): void;
  /** Trở lại chất lượng đầy đủ; tắt tự động trong phiên này. */
  restore(): void;
  onChange(cb: (level: QualityLevel, cause: 'auto' | 'user') => void): () => void;
}

export const QUALITY_LEVELS: Record<QualityLevel, QualitySettings> = {
  0: { pixelRatioCap: 2, catalogMagLimit: null },
  1: { pixelRatioCap: 1, catalogMagLimit: null },
  2: { pixelRatioCap: 1, catalogMagLimit: 4.0 },
};

export function createQuality(_opts: { disabled?: boolean } = {}): QualityController {
  const listeners = new Set<(level: QualityLevel, cause: 'auto' | 'user') => void>();
  return {
    level: 0,
    auto: false,
    sample() {},
    attach() {},
    restore() {},
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
