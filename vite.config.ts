import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Đường dẫn tương đối để có thể triển khai trên bất kỳ máy chủ tĩnh nào.
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
