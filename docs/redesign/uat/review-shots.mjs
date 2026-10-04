// Chụp sáu trạng thái của vòng duyệt thiết kế (docs/redesign/review-N/), cùng trạng thái với review-1.
// Chạy: npm run build && npx vite preview --port 4190 --strictPort (nền), rồi
//   OUT=docs/redesign/review-2 node docs/redesign/uat/review-shots.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const URL = process.env.UAT_URL ?? 'http://localhost:4190/?quality=fixed';
const OUT = process.env.OUT ?? 'docs/redesign/review-2';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => document.querySelectorAll('.view__canvas canvas').length >= 2, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page };
}

{
  const { ctx, page } = await open(1440, 900);
  await page.screenshot({ path: `${OUT}/01-first-visit-1440.png` });
  await ctx.close();
}
{
  const { ctx, page } = await open(375, 812);
  await page.screenshot({ path: `${OUT}/02-first-visit-375.png` });
  await ctx.close();
}
{
  const { ctx, page } = await open(1440, 1700);
  await page.screenshot({ path: `${OUT}/03-full-page-1440.png` });
  await ctx.close();
}
{
  const { ctx, page } = await open(1440, 900);
  await page.locator('.databar [data-emphasis=pole]').hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-hover-pole-1440.png` });
  await ctx.close();
}
{
  const { ctx, page } = await open(375, 812);
  await page.locator('.paneltabs [data-panel=display]').click();
  await page.locator('.paneltabs').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, document.querySelector('.databar').getBoundingClientRect().top - 60));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/05-display-panel-375.png` });
  await ctx.close();
}
{
  const { ctx, page } = await open(1920, 1080);
  await page.keyboard.press('f');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/06-present-1920.png` });
  await ctx.close();
}
await browser.close();
console.log(`wrote 6 renders to ${OUT}`);
