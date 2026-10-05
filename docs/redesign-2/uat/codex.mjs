// Kiểm tra chấp nhận Codex (redesign-2 R3).
//
// Chạy trên máy chủ phát triển (cần window.__app):
//   npx vite --port 5192 --strictPort   (nền), rồi node docs/redesign-2/uat/codex.mjs
// Đổi địa chỉ bằng UAT_URL (mặc định http://localhost:5192/?quality=fixed).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const URL = process.env.UAT_URL ?? 'http://localhost:5192/?quality=fixed';
const SHOTS = new globalThis.URL('../shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function open(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => window.__app?.horizon, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__app.actions.pause());
  return page;
}

const newContext = (width, height) =>
  browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' }).then(async (ctx) => {
    // Không hiện gợi ý lần đầu (che khung nhìn trong ảnh chụp).
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('astrosphere.hint.v1', 'true');
        // redesign-2 R2: lần đầu vào là chế độ Cơ bản; các kiểm tra này dùng giao diện Đầy đủ (thẻ có đủ dòng α, δ, H).
        localStorage.setItem('astrosphere.mode.v1', JSON.stringify('full'));
      } catch {
        /* bỏ qua */
      }
    });
    return ctx;
  });

const badge = (page) => page.evaluate(() => { const b = document.querySelector('.codex-badge'); return b && !b.hidden ? Number(b.textContent) : 0; });
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('astrosphere.codex.v1') ?? 'null'));
const isOpen = (page) => page.evaluate(() => !!document.getElementById('dlg-codex')?.open);
const noHScroll = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
const SIRIUS = 32349;

// ------------------------------------------------------------------ Máy tính 1440×900
const ctx = await newContext(1440, 900);
{
  const page = await open(ctx);

  // (1) Nút Codex trên thanh trên cùng, trước Trợ giúp, có huy hiệu.
  const order = await page.locator('.topbar__actions .btn .btn__text').allTextContents();
  check('(1) Codex button in the top bar, before Trợ giúp', order.indexOf('Codex') >= 0 && order.indexOf('Codex') === order.indexOf('Trợ giúp') - 1, order.join(' | '));
  const b0 = await badge(page);
  check('(1) first visit: badge shows the 3 entries already on screen (sky dome, horizon, Polaris)', b0 === 3, `badge=${b0}`);
  const focusBefore = await page.evaluate(() => document.activeElement?.tagName);

  // (2) Mở hộp thoại; danh mục và mục hiện ra.
  await page.locator('.btn--codex').click();
  await page.waitForSelector('#dlg-codex[open] .cdx-page__title');
  const dom = await page.evaluate(() => ({
    modal: document.getElementById('dlg-codex').matches(':modal'),
    cats: [...document.querySelectorAll('.cdx-cat__title > span:first-child')].map((e) => e.textContent),
    items: document.querySelectorAll('.cdx-item').length,
    locked: document.querySelectorAll('.cdx-item.is-locked').length,
    progress: document.querySelector('.cdx-progress__text').textContent,
    title: document.querySelector('.cdx-page__title').textContent,
  }));
  check('(2) Codex opens as a modal <dialog>', dom.modal);
  check('(2) categories render', dom.cats.length >= 5, dom.cats.join(' · '));
  check('(2) 35–45 entries render, undiscovered ones dimmed', dom.items >= 35 && dom.items <= 45 && dom.locked === dom.items - 3, `items=${dom.items} locked=${dom.locked}`);
  check('(2) progress line "x/y đã khám phá"', /^3\/\d+ đã khám phá$/.test(dom.progress), dom.progress);
  check('(2) desktop opens on the first new entry', dom.title === 'Thiên cầu', dom.title);

  // (4) Mở một mục → đã đọc, huy hiệu giảm.
  const b1 = await badge(page);
  check('(4) showing an entry marks it read: badge 3 → 2', b1 === 2, `badge=${b1}`);
  await page.locator('.cdx-item[data-entry=horizon]').click();
  const b2 = await badge(page);
  const newLeft = await page.locator('.cdx-item.is-new').count();
  check('(4) opening another new entry: badge 2 → 1, one "mới" marker left', b2 === 1 && newLeft === 1, `badge=${b2} new=${newLeft}`);
  // Mục chưa khám phá vẫn đọc được, có ghi chú "chưa khám phá".
  await page.locator('.cdx-item[data-entry=ecliptic]').click();
  const lockedNote = await page.locator('.cdx-page__state.is-locked').textContent();
  check('undiscovered entry is readable, with a "chưa khám phá" note', /Chưa khám phá/.test(lockedNote ?? '') && (await page.locator('.cdx-page__body p').count()) > 1, lockedNote);
  // Công thức dựng bằng KaTeX.
  await page.locator('.cdx-item[data-entry=latPole]').click();
  await page.waitForSelector('.cdx-page .katex', { timeout: 10000 }).catch(() => {});
  check('formulas render with KaTeX; diagram present', (await page.locator('.cdx-page .katex').count()) > 0 && (await page.locator('.cdx-page svg.cdx-svg').count()) === 1);
  await page.screenshot({ path: `${SHOTS}codex-1440.png` });

  // (7) Esc đóng Codex trước, không bỏ chọn.
  await page.keyboard.press('Escape');
  const afterEsc = await page.evaluate(() => ({ open: document.getElementById('dlg-codex').open, sel: window.__app.store.state.selected }));
  check('(7) Esc closes the codex without clearing the selection', !afterEsc.open && afterEsc.sel !== null, JSON.stringify(afterEsc));
  const focusAfter = await page.evaluate(() => document.activeElement?.classList.contains('btn--codex'));
  check('focus returns to the Codex button', focusAfter, `before=${focusBefore}`);

  // (3) Chọn một sao mới → số mục khám phá tăng, huy hiệu tăng, dấu "mới".
  const d0 = (await stored(page)).discovered.length;
  await page.evaluate(async (hip) => {
    // Chọn Sirius qua tiện ích dùng chung của scenario.ts (máy chủ phát triển phục vụ mã nguồn).
    const { selectCatalogHip } = await import('/src/scenario.ts');
    selectCatalogHip({ store: window.__app.store, actions: window.__app.actions }, hip);
  }, SIRIUS);
  await page.waitForTimeout(150);
  const s1 = await stored(page);
  const b3 = await badge(page);
  check('(3) selecting a new star increments discovered', s1.discovered.length > d0 && s1.discovered.includes('sirius'), `${d0} → ${s1.discovered.length}: ${s1.discovered.join(',')}`);
  check('(3) …and the badge counts the new entries', b3 > 1, `badge=${b3}`);

  // (5) Liên kết "?" trong thẻ thông tin mở đúng mục.
  await page.waitForSelector('.infocard:not(.is-collapsed) .kv[data-emphasis=ha] .term');
  // Rê chuột lên dòng vẫn tô sáng liên kết (data-emphasis) như trước.
  await page.locator('.infocard .kv[data-emphasis=ha] dd').hover();
  const emph = await page.evaluate(() => window.__app.store.state.emphasis);
  check('term links keep the linked highlight: hovering the H row → emphasis "meridian"', emph === 'meridian', `emphasis=${emph}`);
  await page.locator('.infocard .kv[data-emphasis=ha] .term').click();
  await page.waitForSelector('#dlg-codex[open]');
  const fromTerm = await page.evaluate(() => ({ title: document.querySelector('.cdx-page__title').textContent, current: document.querySelector('.cdx-item[aria-current=true]')?.dataset.entry, focus: document.activeElement?.id }));
  check('(5) info-card "?" next to H opens the hour-angle entry', fromTerm.current === 'hourAngle' && fromTerm.title === 'Góc giờ H', JSON.stringify(fromTerm));
  check('(5) …and moves focus to the entry title', fromTerm.focus === 'cdx-page-title');
  const siriusNew = await page.locator('.cdx-item[data-entry=sirius].is-new').count();
  check('(3) Sirius carries the "mới" marker in the list', siriusNew === 1);

  // (6) "Xem trong mô phỏng" đổi store: bật hoàng đạo.
  await page.locator('.cdx-item[data-entry=ecliptic]').click();
  const eclBefore = await page.evaluate(() => window.__app.store.state.toggles.ecliptic);
  await page.getByRole('button', { name: /Xem trong mô phỏng/ }).click();
  const eclAfter = await page.evaluate(() => ({ on: window.__app.store.state.toggles.ecliptic, open: document.getElementById('dlg-codex').open }));
  check('(6) "Xem trong mô phỏng" turns on the ecliptic and closes the codex', !eclBefore && eclAfter.on && !eclAfter.open, JSON.stringify({ eclBefore, ...eclAfter }));

  // Liên kết "?" ở dải số liệu và bảng Hiển thị.
  await page.locator('.databar [data-emphasis=pole] .term').click();
  await page.waitForSelector('#dlg-codex[open]');
  const fromData = await page.evaluate(() => document.querySelector('.cdx-item[aria-current=true]')?.dataset.entry);
  check('data-bar "?" next to pole altitude opens φ = pole altitude', fromData === 'latPole', fromData);
  await page.keyboard.press('Escape');
  const termCount = await page.locator('.term').count();
  check('term links are present across the UI (info card, data bar, location, display)', termCount >= 25, `count=${termCount}`);

  // (8) Tải lại → tiến độ còn nguyên.
  const before = await stored(page);
  const badgeBefore = await badge(page);
  await page.reload();
  await page.waitForFunction(() => window.__app?.horizon, null, { timeout: 30000 });
  const after = await stored(page);
  const badgeAfter = await badge(page);
  check('(8) progress persists after reload', after.discovered.length === before.discovered.length && after.read.length === before.read.length && badgeAfter === badgeBefore, `discovered ${before.discovered.length}→${after.discovered.length}, read ${before.read.length}→${after.read.length}, badge ${badgeBefore}→${badgeAfter}`);
  await page.close();
}
await ctx.close();

// ------------------------------------------------------------------ Điện thoại 375×812
{
  const c = await newContext(375, 812);
  const page = await open(c);
  const top = await noHScroll(page);
  check('375: no horizontal scroll with the Codex button in the top bar', top.sw <= top.iw, JSON.stringify(top));
  const btn = await page.locator('.btn--codex').boundingBox();
  check('375: Codex button ≥ 44 × 44 px', btn.width >= 44 && btn.height >= 44, JSON.stringify(btn));
  await page.locator('.btn--codex').click();
  await page.waitForSelector('#dlg-codex[open]');
  const list = await page.evaluate(() => ({ nav: getComputedStyle(document.querySelector('.cdx-nav')).display, page: getComputedStyle(document.querySelector('.cdx-page')).display }));
  check('375: opens on the list (reading pane hidden)', list.nav !== 'none' && list.page === 'none', JSON.stringify(list));
  const items = await page.locator('.cdx-item').evaluateAll((els) => els.slice(0, 5).map((e) => e.getBoundingClientRect().height));
  check('375: list entries are ≥ 44 px tall', items.every((hh) => hh >= 44), items.join(','));
  const h1 = await noHScroll(page);
  check('375: no horizontal scroll with the codex list open', h1.sw <= h1.iw, JSON.stringify(h1));
  await page.locator('.cdx-item[data-entry=altaz]').click();
  await page.waitForTimeout(200);
  const reading = await page.evaluate(() => ({ nav: getComputedStyle(document.querySelector('.cdx-nav')).display, back: getComputedStyle(document.querySelector('.cdx-page__back')).display, pw: document.querySelector('.cdx-page').scrollWidth, cw: document.querySelector('.cdx-page').clientWidth }));
  check('375: entry replaces the list, with a back button', reading.nav === 'none' && reading.back !== 'none', JSON.stringify(reading));
  const h2 = await noHScroll(page);
  check('375: no horizontal scroll while reading an entry', h2.sw <= h2.iw && reading.pw <= reading.cw + 1, JSON.stringify({ ...h2, pw: reading.pw, cw: reading.cw }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}codex-375.png` });
  await page.locator('.cdx-page__back').click();
  const back = await page.evaluate(() => ({ nav: getComputedStyle(document.querySelector('.cdx-nav')).display, focus: document.activeElement?.dataset.entry }));
  check('375: back returns to the list and focuses the entry', back.nav !== 'none' && back.focus === 'altaz', JSON.stringify(back));
  await page.close();
  await c.close();
}

await browser.close();
const real = errors.filter((e) => !/favicon|WebGL|GPU stall|swiftshader/i.test(e));
check('no page errors', real.length === 0, real.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
