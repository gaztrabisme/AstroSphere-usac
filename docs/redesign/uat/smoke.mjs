// Kiểm tra nhanh: trang tải, cả hai canvas 3D được vẽ, không có lỗi console.
// Chạy: npx vite preview --port 4173 --strictPort (nền), rồi node docs/redesign/uat/smoke.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const URL = process.env.UAT_URL ?? 'http://localhost:4173/?quality=fixed';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(URL);
await page.waitForFunction(() => document.querySelectorAll('.view__canvas canvas').length >= 2, null, { timeout: 20000 });
await page.waitForTimeout(800);
const n = await page.evaluate(() => document.querySelectorAll('.view__canvas canvas').length);
await browser.close();
const ok = n >= 2 && errors.length === 0;
console.log(JSON.stringify({ canvases: n, errors }, null, 2));
console.log(ok ? 'SMOKE PASS' : 'SMOKE FAIL');
process.exit(ok ? 0 : 1);
