// Kiểm tra màn hình mở đầu và hành trình có hướng dẫn (luồng U2).
// Chạy: npm run build && npx vite preview --port 4175 --strictPort (nền) và npx vite --port 5175 --strictPort (nền, cho kiểm tra trạng thái),
// rồi node docs/redesign/uat/story.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = join(ROOT, 'docs/redesign/shots');
mkdirSync(SHOTS, { recursive: true });
const PREVIEW = process.env.UAT_URL ?? 'http://localhost:4175/';
const DEV = process.env.UAT_DEV_URL ?? 'http://localhost:5175/';
const vi = JSON.parse(readFileSync(join(ROOT, 'src/i18n/vi.json'), 'utf8'));

// Thứ tự bước theo vi.json (giống thứ tự trong chapters.ts).
const expected = ['c1', 'c2', 'c3'].flatMap((c, ci) =>
  Object.keys(vi.story[c])
    .filter((k) => k !== 'title')
    .map((s, si) => ({ c: ci + 1, s: si + 1, title: vi.story[c][s].title })),
);

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ` — ${info}` : ''}`);
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function ctx(opts = {}, init) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, ...opts });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { context, page };
}
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const progressOf = async (page) => {
  const txt = (await page.locator('.story__progress-text').textContent()) ?? '';
  const m = txt.match(/Chương (\d+) · (\d+)\/(\d+)/);
  return m ? { c: +m[1], s: +m[2], n: +m[3], txt } : { c: 0, s: 0, n: 0, txt };
};
const waitCanvases = (page) => page.waitForFunction(() => document.querySelectorAll('.view__canvas canvas').length >= 2, null, { timeout: 30000 });
/** Thẻ không che khung nhìn đang hiện. */
const viewCovered = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('.story')?.getBoundingClientRect();
    const views = [...document.querySelectorAll('.view')].filter((v) => v.offsetParent !== null).map((v) => v.getBoundingClientRect());
    if (!card || !views.length) return 'missing';
    const bad = views.filter((v) => v.bottom > card.top + 1 && v.right > card.left && v.left < card.right);
    return bad.length ? `views bottom ${Math.round(bad[0].bottom)} > card top ${Math.round(card.top)}` : '';
  });

// ------------------------------------------------------------ 1–2. Lần đầu ghé thăm trên điện thoại, đi hết hành trình
{
  const { context, page } = await ctx();
  await page.goto(`${PREVIEW}?quality=fixed`);
  const hero = page.locator('.hero[role=dialog]');
  await hero.waitFor({ state: 'visible', timeout: 10000 });
  const startBtn = page.getByRole('button', { name: /Bắt đầu hành trình/ });
  const exploreBtn = page.getByRole('button', { name: 'Khám phá tự do' });
  check('1. hero hiện với hai nút (375×812)', (await startBtn.isVisible()) && (await exploreBtn.isVisible()));
  check('1. hero: tiêu điểm ở nút chính', await page.evaluate(() => document.activeElement?.classList.contains('hero__cta--primary')));
  check('1. hero: không cuộn ngang', await noHScroll(page));
  await page.screenshot({ path: join(SHOTS, 'hero-375.png') });

  await startBtn.click();
  await page.locator('.story').waitFor({ state: 'visible' });
  await waitCanvases(page);
  check('2. đã đặt astrosphere.seen.v1', await page.evaluate(() => localStorage.getItem('astrosphere.seen.v1') !== null));
  check('2. hero đã đóng', (await hero.count()) === 0);

  let lastC = 0;
  let mono = true;
  let titlesOk = true;
  let hscrollOk = true;
  let coveredMsg = '';
  const shotAt = { '1.1': 'story-c1-375.png', '2.3': 'story-c2-375.png', '3.5': 'story-c3-375.png' };
  for (let i = 0; i < expected.length; i++) {
    const p = await progressOf(page);
    const title = (await page.locator('.story__title').textContent())?.trim();
    const exp = expected[i];
    if (p.c < lastC) mono = false;
    lastC = p.c;
    if (p.c !== exp.c || p.s !== exp.s || title !== exp.title) {
      titlesOk = false;
      console.log(`   bước ${i + 1}: thấy "${p.txt}" "${title}", chờ ${exp.c}.${exp.s} "${exp.title}"`);
    }
    if (!(await noHScroll(page))) hscrollOk = false;
    const cov = await viewCovered(page);
    if (cov && !coveredMsg) coveredMsg = `${exp.c}.${exp.s}: ${cov}`;
    const key = `${exp.c}.${exp.s}`;
    if (shotAt[key]) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(SHOTS, shotAt[key]) });
    }
    const next = page.getByRole('button', { name: 'Tiếp ›' });
    if (i < expected.length - 1) await next.click();
    else check('2. bước cuối: không còn nút "Tiếp", có ba nút kết thúc', !(await next.isVisible()) && (await page.locator('.story__end button').count()) === 3);
  }
  check('2. đi đủ 18 bước, số chương không giảm', mono && lastC === 3);
  check('2. tiêu đề mọi bước khớp vi.json', titlesOk);
  check('2. không cuộn ngang ở mọi bước', hscrollOk);
  check('2. thẻ không che khung nhìn (điện thoại)', !coveredMsg, coveredMsg);
  check('2. bảng số liệu bị ẩn trong chế độ kể chuyện', !(await page.locator('.databar').isVisible()));
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('astrosphere.story.v1') ?? 'null'));
  check('2. tiến độ đánh dấu đã xong', prog?.done?.includes('c3'), JSON.stringify(prog));
  // "Tự khám phá tiếp" giữ cảnh, đóng thẻ.
  await page.getByRole('button', { name: 'Tự khám phá tiếp' }).click();
  check('2. "Tự khám phá tiếp" đóng thẻ', (await page.locator('.story').count()) === 0 && !(await page.evaluate(() => document.body.classList.contains('story-open'))));
  await context.close();
}

// ------------------------------------------------------------ 3. Người quay lại, hành trình còn dở
{
  const { context, page } = await ctx({}, () => {
    localStorage.setItem('astrosphere.seen.v1', 'true');
    localStorage.setItem('astrosphere.story.v1', JSON.stringify({ c: 1, s: 2, done: ['c1'] }));
  });
  await page.goto(`${PREVIEW}?quality=fixed`);
  await waitCanvases(page);
  const chip = page.locator('.story-resume__go');
  check('3. người quay lại: không có hero', (await page.locator('.hero').count()) === 0);
  check('3. chip "Tiếp tục" hiện', await chip.isVisible(), (await chip.textContent()) ?? '');
  check('3. chip đúng nội dung', ((await chip.textContent()) ?? '').includes('Tiếp tục chương 2 · bước 3'));
  await page.screenshot({ path: join(SHOTS, 'resume-chip-375.png') });
  await chip.click();
  await page.locator('.story').waitFor({ state: 'visible' });
  const p = await progressOf(page);
  check('3. chip mở lại đúng bước', p.c === 2 && p.s === 3, p.txt);
  // Thoát → khôi phục, chip quay lại.
  await page.getByRole('button', { name: 'Thoát' }).click();
  check('3. thoát xong chip hiện lại', await page.locator('.story-resume__go').isVisible());
  await page.locator('.story-resume__close').click();
  check('3. nút × ẩn chip', (await page.locator('.story-resume').count()) === 0);
  await context.close();
}

// ------------------------------------------------------------ 4. Liên kết sâu ?story=2.4
{
  const { context, page } = await ctx();
  await page.goto(`${PREVIEW}?quality=fixed&story=2.4`);
  await page.locator('.story').waitFor({ state: 'visible' });
  const p = await progressOf(page);
  const title = (await page.locator('.story__title').textContent())?.trim();
  check('4. ?story=2.4 mở chương 2 bước 4, không có hero', p.c === 2 && p.s === 4 && title === vi.story.c2.lst.title && (await page.locator('.hero').count()) === 0, `${p.txt} · ${title}`);
  await context.close();
}

// ------------------------------------------------------------ 5–6. Máy tính 1440×900: thẻ gọn, không thu hẹp canvas; PageDown
{
  const { context, page } = await ctx({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${PREVIEW}?quality=fixed&story=1.1`);
  await page.locator('.story').waitFor({ state: 'visible' });
  await waitCanvases(page);
  await page.waitForTimeout(1200);
  const widths = await page.evaluate(() => [...document.querySelectorAll('.view__canvas canvas')].map((c) => Math.round(c.getBoundingClientRect().width)));
  check('5. 1440: cả hai canvas rộng ≥ 600 px', widths.length >= 2 && widths.every((w) => w >= 600), widths.join(', '));
  const cov = await viewCovered(page);
  check('5. 1440: thẻ không che khung nhìn', !cov, cov);
  const cardW = await page.evaluate(() => Math.round(document.querySelector('.story').getBoundingClientRect().width));
  check('5. 1440: thẻ gọn (≤ 760 px)', cardW <= 760, `${cardW}px`);
  await page.screenshot({ path: join(SHOTS, 'story-1440.png') });

  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.keyboard.press('PageDown');
  let p = await progressOf(page);
  check('6. PageDown sang bước tiếp', p.c === 1 && p.s === 2, p.txt);
  await page.keyboard.press('ArrowRight');
  p = await progressOf(page);
  check('6. → sang bước tiếp', p.c === 1 && p.s === 3, p.txt);
  await page.keyboard.press('PageUp');
  p = await progressOf(page);
  check('6. PageUp lùi một bước', p.c === 1 && p.s === 2, p.txt);
  // Thu gọn thành một dòng.
  await page.locator('.story__toggle').click();
  const h1 = await page.evaluate(() => Math.round(document.querySelector('.story').getBoundingClientRect().height));
  check('6. thu gọn còn một dòng', h1 <= 64, `${h1}px`);
  await page.screenshot({ path: join(SHOTS, 'story-1440-collapsed.png') });
  await context.close();
}

// ------------------------------------------------------------ 7. Trạng thái (máy chủ dev có window.__app): giảm chuyển động, LST, thoát khôi phục
{
  const { context, page } = await ctx({ reducedMotion: 'reduce' });
  await page.goto(`${DEV}?quality=fixed&story=1.2`);
  await page.locator('.story').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => {
    const s = window.__app?.store?.state;
    return s ? { playing: s.playing, trails: s.trails, lat: s.lat } : null;
  });
  check('7. giảm chuyển động ở c1 bước 2: không tự chạy', st && st.playing === false && st.trails === 'long', JSON.stringify(st));
  await context.close();
}
{
  const { context, page } = await ctx();
  await page.goto(`${DEV}?quality=fixed&explore=1`);
  await page.waitForFunction(() => !!window.__app?.store);
  const before = await page.evaluate(() => ({ lat: window.__app.store.state.lat, ecl: window.__app.store.state.toggles.ecliptic }));
  await page.evaluate(() => window.__app.actions.setToggle('ecliptic', true));
  await page.evaluate(() => window.__app.story.open(1));
  await page.locator('.story').waitFor({ state: 'visible' });
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Tiếp ›' }).click();
  const lst = await page.evaluate(() => {
    const s = window.__app.store.state;
    return (((s.gst + s.lon) % 360) + 360) % 360;
  });
  check('7. c2 bước 5: LST ≈ 88,79°', Math.abs(lst - 88.79) < 0.01, lst.toFixed(3));
  await page.getByRole('button', { name: 'Thoát' }).click();
  const after = await page.evaluate(() => ({ lat: window.__app.store.state.lat, ecl: window.__app.store.state.toggles.ecliptic }));
  check('7. Thoát khôi phục trạng thái trước khi mở', after.lat === before.lat && after.ecl === true, JSON.stringify(after));
  await context.close();
}

await browser.close();
const relevant = errors.filter((e) => !/WebGL|GPU stall|favicon/i.test(e));
check('không có lỗi trên console', relevant.length === 0, relevant.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `STORY UAT FAIL (${failed.length}/${results.length})` : `STORY UAT PASS (${results.length} checks)`);
process.exit(failed.length ? 1 : 0);
