// Bảng chuỗi giao diện. Toàn bộ chữ hiển thị lấy từ vi.json.

import vi from './vi.json';

type Dict = { [k: string]: string | string[] | Dict };

const dict = vi as unknown as Dict;

function lookup(key: string): string | string[] | Dict | undefined {
  let cur: string | string[] | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = cur[part];
    else return undefined;
  }
  return cur;
}

/** Lấy chuỗi theo khóa, thay thế {tham_số}. */
export function t(key: string, params?: Record<string, string | number>): string {
  const v = lookup(key);
  if (typeof v !== 'string') {
    if (import.meta.env?.DEV) console.warn(`[i18n] thiếu khóa: ${key}`);
    return key;
  }
  return params ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : v;
}

/** Lấy mảng chuỗi (ví dụ các đoạn hướng dẫn). */
export function tList(key: string): string[] {
  const v = lookup(key);
  return Array.isArray(v) ? v : [];
}
