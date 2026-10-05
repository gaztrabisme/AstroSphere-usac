// Kiểm tra chấp nhận R4: người hướng dẫn Usui-chan (docs/redesign-2/goal.md › R4, docs/redesign-2/guide.md).
//
// Cần máy chủ DEV (window.__app):
//   npx vite --port 5194 --strictPort   (nền), rồi
//   UAT_URL='http://localhost:5194/?quality=fixed' node docs/redesign-2/uat/guide.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const URL = process.env.UAT_URL ?? 'http://localhost:5194/?quality=fixed';
const SHOTS = new globalThis.URL('../shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const VI = JSON.parse(readFileSync(new globalThis.URL('../../../src/i18n/vi.json', import.meta.url), 'utf8'));
const TIP = VI.guide.tip;
const KEY = 'astrosphere.guide.v1';

const results = [];
const errors = [];
const check = (name, ok, detail = '') => {
  results.push(!!ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

/** Ngữ cảnh mới (bộ nhớ trống = lần đầu vào trang). `init` chạy trước mọi trang. */
async function context({ width = 1440, height = 900, touch = false, init } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion: 'no-preference',
    ...(touch ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  if (init) await ctx.addInitScript(init);
  return ctx;
}
async function open(ctx, url = URL) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.__app?.horizon, null, { timeout: 30000 });
  return page;
}
/** Đợi lời chào hiện ra và hoạt ảnh vào chạy xong. */
async function waitHello(page) {
  await page.waitForSelector('.guide-hello', { timeout: 10000 });
  await page.waitForTimeout(1200);
}
/** Phần giải thích tải lười ở lần bấm đầu: đợi trạng thái bật/tắt. */
const waitExplain = (page, on) => page.waitForFunction((v) => document.body.classList.contains('guide-explain') === v, on, { timeout: 10000 });
const helloCount = (page) => page.locator('.guide-hello').count();
const st = (page) => page.evaluate(() => { const s = window.__app.store.state; return { playing: s.playing, rate: s.rate, selected: s.selected, uiMode: s.uiMode }; });
const tipText = (page) => page.evaluate(() => { const t = document.querySelector('.guide-tip'); return t && !t.hidden ? t.querySelector('.guide-tip__text').textContent : null; });
const explaining = (page) => page.evaluate(() => document.body.classList.contains('guide-explain'));
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, vis: getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && r.width > 0 }; }, sel);
const overlaps = (a, b) => !!a && !!b && a.vis && b.vis && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Chân dung không che công cụ khung nhìn, thẻ thông tin (thẻ Polaris) hay các nút của chế độ Cơ bản. */
async function avatarClear(page) {
  const av = await rect(page, '.guide-avatar');
  const others = await page.evaluate(() =>
    [...document.querySelectorAll('.view-tool, .infocard, .simple button, .simple input, .simple label')].map((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { x: r.x, y: r.y, w: r.width, h: r.height, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && !!e.offsetParent, cls: e.className };
    }),
  );
  return others.filter((o) => overlaps(av, o)).map((o) => o.cls);
}
const dragSky = async (page) => {
  const r = await rect(page, '#view-horizon .view__canvas');
  const x = r.x + r.w * 0.3;
  const y = r.y + r.h * 0.35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 20, { steps: 5 });
  await page.mouse.up();
};

// ================================================================== Máy tính 1440×900, lần đầu vào trang
{
  const ctx = await context();
  const page = await open(ctx);
  await waitHello(page);
  const hello = await page.evaluate(() => {
    const el = document.querySelector('.guide-hello');
    return {
      title: el.querySelector('.guide-hello__title').textContent,
      body: el.querySelector('.guide-hello__body').textContent,
      buttons: [...el.querySelectorAll('button')].map((b) => b.textContent),
      focus: document.activeElement === document.body || !el.contains(document.activeElement),
      stored: localStorage.getItem('astrosphere.guide.v1'),
      hint: (() => { const h = document.querySelector('.view__hint.is-new'); return h ? getComputedStyle(h).visibility : 'none'; })(),
    };
  });
  check('(hello) a fresh context shows the hello in Simple mode', (await helloCount(page)) === 1 && (await st(page)).uiMode === 'simple');
  check('(hello) title + body introduce Usui-chan as USAC mascot and explain mode', /Usui-chan/.test(hello.body) && /USAC/.test(hello.body) && /chế độ giải thích/.test(hello.body), `${hello.title} ${hello.body}`);
  check('(hello) two buttons: "Giải thích các nút" and "Để sau"', hello.buttons.join('|') === 'Giải thích các nút|Để sau', hello.buttons.join('|'));
  check('(hello) does not steal focus', hello.focus);
  check(`(hello) ${KEY} = {"hello":true} is stored as soon as it shows`, hello.stored === '{"hello":true}', hello.stored);
  check('(hello) the first-visit hint caption waits while the hello is open (one message at a time)', hello.hint === 'hidden' || hello.hint === 'none', hello.hint);
  const av = await page.evaluate(() => { const b = document.querySelector('.guide-avatar'); const r = b.getBoundingClientRect(); return { name: b.getAttribute('aria-label'), w: r.width, h: r.height }; });
  check('(avatar) accessible name "Usui-chan: giải thích các nút", ≥ 44 px', av.name === 'Usui-chan: giải thích các nút' && av.w >= 44 && av.h >= 44, JSON.stringify(av));
  check('(avatar) does not cover view tools, the info card (Polaris chip) or Simple controls', (await avatarClear(page)).length === 0, (await avatarClear(page)).join(', '));
  const hr = await rect(page, '.guide-hello');
  const sky = await rect(page, '#view-horizon .view__canvas');
  check('(hello) does not cover the horizon sky in Simple', !overlaps(hr, sky), JSON.stringify(hr));
  await page.screenshot({ path: `${SHOTS}guide-hello-1440.png` });

  // Tải lại: không chào nữa.
  await page.reload();
  await page.waitForFunction(() => window.__app?.horizon, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  check('(hello) after a reload there is no hello', (await helloCount(page)) === 0);
  await ctx.close();
}

// ------------------------------------------------------------------ "Để sau", rồi không có gì tự hiện
{
  const ctx = await context();
  const page = await open(ctx);
  await waitHello(page);
  await page.getByRole('button', { name: 'Để sau' }).click();
  check('(later) "Để sau" dismisses the hello', (await helloCount(page)) === 0);
  check('(later) focus returns to the avatar, not to <body>', await page.evaluate(() => document.activeElement?.classList.contains('guide-avatar')));
  await page.waitForTimeout(5000);
  await dragSky(page);
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({
    hello: !!document.querySelector('.guide-hello'),
    tip: !!document.querySelector('.guide-tip:not([hidden])'),
    banner: !!document.querySelector('.guide-banner:not([hidden])'),
    explain: document.body.classList.contains('guide-explain'),
  }));
  check('(later) nothing appears uninvited after 5 s and a sky drag', !after.hello && !after.tip && !after.banner && !after.explain, JSON.stringify(after));
  await ctx.close();
}

// ------------------------------------------------------------------ Lời chào tự đóng khi chạm bầu trời / Esc
{
  const ctx = await context();
  const page = await open(ctx);
  await waitHello(page);
  await dragSky(page);
  check('(hello) interacting with the sky dismisses the hello', (await helloCount(page)) === 0);
  await ctx.close();

  const ctx2 = await context();
  const page2 = await open(ctx2);
  await waitHello(page2);
  const sel0 = (await st(page2)).selected;
  await page2.keyboard.press('Escape');
  const s1 = await st(page2);
  check('(hello) Esc dismisses the hello and keeps the selection', (await helloCount(page2)) === 0 && JSON.stringify(s1.selected) === JSON.stringify(sel0) && !!sel0, JSON.stringify(s1.selected));
  // Nút "Giải thích các nút" của lời chào vào thẳng chế độ giải thích.
  await ctx2.close();
  const ctx3 = await context();
  const page3 = await open(ctx3);
  await waitHello(page3);
  await page3.getByRole('button', { name: 'Giải thích các nút', exact: true }).click();
  await waitExplain(page3, true).catch(() => {});
  check('(hello) "Giải thích các nút" enters explain mode', (await explaining(page3)) && (await helloCount(page3)) === 0);
  await ctx3.close();
}

// ------------------------------------------------------------------ Chế độ giải thích trên máy tính (Cơ bản rồi Đầy đủ)
const SEEN = () => localStorage.setItem('astrosphere.guide.v1', JSON.stringify({ hello: true }));
{
  const ctx = await context({ init: SEEN });
  const page = await open(ctx);
  await page.waitForTimeout(1500);
  check('(seen) with the key preset there is no hello', (await helloCount(page)) === 0);
  const sel0 = (await st(page)).selected;

  await page.getByRole('button', { name: 'Usui-chan: giải thích các nút' }).click();
  await waitExplain(page, true);
  const on = await page.evaluate(() => ({
    body: document.body.classList.contains('guide-explain'),
    pressed: document.querySelector('.guide-avatar').getAttribute('aria-pressed'),
    banner: document.querySelector('.guide-banner:not([hidden]) .guide-banner__text')?.textContent,
    ring: getComputedStyle(document.querySelector('.guide-avatar')).borderTopColor,
  }));
  check('(explain) clicking the avatar enters explain mode (aria-pressed, orange ring)', on.body && on.pressed === 'true' && on.ring === 'rgb(242, 101, 34)', JSON.stringify(on));
  check('(explain) banner reads "Chế độ giải thích — rê chuột hoặc chạm vào một nút · Esc để thoát"', on.banner === 'Chế độ giải thích — rê chuột hoặc chạm vào một nút · Esc để thoát', on.banner);

  await page.locator('.btn--codex').hover();
  await page.waitForTimeout(300);
  check('(explain) hovering the Codex button shows the Codex tip', (await tipText(page)) === TIP.codex, await tipText(page));
  const tipBox = await rect(page, '.guide-tip');
  const codexBox = await rect(page, '.btn--codex');
  check('(explain) the bubble is anchored next to the control, on screen', tipBox.y >= codexBox.y + codexBox.h && tipBox.y - (codexBox.y + codexBox.h) < 30 && tipBox.x >= 0 && tipBox.x + tipBox.w <= 1440, JSON.stringify(tipBox));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}guide-explain-1440.png` });

  await page.locator('.simple__play').hover();
  await page.waitForTimeout(200);
  check('(explain) hovering play shows its tip with a Codex link', (await tipText(page)) === TIP.simplePlay && (await page.locator('.guide-tip__codex').isVisible()));
  // Bàn phím: tiêu điểm vào điều khiển cũng hiện lời giải thích.
  await page.focus('.modeswitch input');
  await page.waitForTimeout(200);
  check('(explain) keyboard focus shows the tip too (mode switch)', (await tipText(page)) === TIP.mode, await tipText(page));
  // Chuột vẫn dùng nút như thường.
  const p0 = (await st(page)).playing;
  await page.locator('.simple__play').click();
  check('(explain) on desktop a mouse click still activates the control', (await st(page)).playing === !p0);
  // Khung nhìn 3D có lời giải thích và liên kết Codex mở đúng mục.
  const sky = await rect(page, '#view-horizon .view__canvas');
  await page.mouse.move(sky.x + 40, sky.y + sky.h - 40);
  await page.waitForTimeout(300);
  check('(explain) hovering the horizon view explains it', (await tipText(page)) === TIP.horizonView, await tipText(page));
  await page.locator('.guide-tip__codex').click();
  await page.waitForSelector('#dlg-codex[open] .cdx-page__title', { timeout: 10000 });
  const codexTitle = await page.locator('#dlg-codex .cdx-page__title').textContent();
  check('(explain) "Đọc thêm trong Codex" opens the matching entry', /chân trời/i.test(codexTitle), codexTitle);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('(esc) Esc closes the Codex dialog first; explain mode stays on', !(await page.evaluate(() => document.getElementById('dlg-codex').open)) && (await explaining(page)));
  await page.keyboard.press('Escape');
  const s1 = await st(page);
  check('(esc) next Esc exits explain mode without clearing the selection', !(await explaining(page)) && JSON.stringify(s1.selected) === JSON.stringify(sel0) && !!sel0, JSON.stringify(s1.selected));
  check('(esc) the bubble and banner are gone', (await tipText(page)) === null && !(await page.locator('.guide-banner').isVisible()));

  // Bấm lại chân dung: bật rồi tắt.
  await page.locator('.guide-avatar').click();
  await page.locator('.guide-avatar').click();
  check('(explain) clicking the avatar again exits', !(await explaining(page)));

  // ---- Đầy đủ
  await page.evaluate(() => window.__app.actions.setUiMode('full'));
  await page.waitForTimeout(500);
  check('(full) the avatar is present in Full', await page.locator('.guide-avatar').isVisible());
  check('(full) the avatar does not cover view tools or the Polaris chip', (await avatarClear(page)).length === 0, (await avatarClear(page)).join(', '));
  await page.locator('.guide-avatar').click();
  await waitExplain(page, true);
  await page.locator('.btn--top-present').hover();
  await page.waitForTimeout(200);
  check('(full) hovering Trình chiếu explains it', (await tipText(page)) === TIP.present, await tipText(page));
  await page.locator('.data__item[data-guide="dataPole"]').hover();
  await page.waitForTimeout(200);
  check('(full) hovering a data-bar cell explains it', (await tipText(page)) === TIP.dataPole, await tipText(page));
  await page.locator('#panel-display summary').first().hover();
  await page.waitForTimeout(200);
  check('(full) hovering a display group explains it', (await tipText(page)) === TIP.displayGroup, await tipText(page));
  await page.locator('#panel-display .term').first().hover();
  await page.waitForTimeout(200);
  check('(full) hovering a codex "?" term link explains it', (await tipText(page)) === TIP.term, await tipText(page));
  // Esc khi đang gõ trong ô nhập: không làm gì.
  await page.locator('#lat-input').click();
  await page.keyboard.press('Escape');
  check('(esc) Esc while typing in an input does not exit explain mode', await explaining(page));
  await page.locator('#lat-input').blur();
  // Trình chiếu: Usui-chan ẩn, chế độ giải thích tắt.
  await page.locator('.btn--top-present').click();
  await page.waitForTimeout(400);
  const pres = await page.evaluate(() => ({
    present: document.body.classList.contains('present'),
    avatar: getComputedStyle(document.querySelector('.guide-avatar')).display,
    explain: document.body.classList.contains('guide-explain'),
  }));
  check('(present) the avatar is hidden in presentation mode and explain mode is off', pres.present && pres.avatar === 'none' && !pres.explain, JSON.stringify(pres));
  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  check('(present) the avatar returns after presentation', await page.locator('.guide-avatar').isVisible());
  await ctx.close();
}

// ------------------------------------------------------------------ Hello trong Đầy đủ (người đã quen trang, chưa từng được chào)
{
  const ctx = await context({ init: () => localStorage.setItem('astrosphere.mode.v1', JSON.stringify('full')) });
  const page = await open(ctx);
  await waitHello(page);
  check('(full) the hello also shows once in Full', (await helloCount(page)) === 1);
  check('(full) no horizontal scroll at 1440 with the hello open', await noHScroll(page));
  const hr = await rect(page, '.guide-hello');
  const hit = [];
  for (const sel of ['#view-horizon .view__canvas', '#view-sphere .view__canvas', '.infocard', '.view-tool']) if (overlaps(hr, await rect(page, sel))) hit.push(sel);
  check('(full) the wide hello covers neither sky nor the Polaris chip', hit.length === 0, hit.join(', ') || JSON.stringify(hr));
  await ctx.close();
}

// ------------------------------------------------------------------ Giảm chuyển động: mọi thứ hiện ngay
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await open(ctx);
  await page.waitForSelector('.guide-hello', { timeout: 10000 });
  const anim = await page.evaluate(() => ({
    hello: getComputedStyle(document.querySelector('.guide-hello')).animationName,
    avatar: getComputedStyle(document.querySelector('.guide-avatar')).animationName,
    opacity: getComputedStyle(document.querySelector('.guide-hello')).opacity,
  }));
  check('(reduced motion) the hello and the avatar do not animate; the hello is fully visible at once', anim.hello === 'none' && anim.avatar === 'none' && anim.opacity === '1', JSON.stringify(anim));
  await page.getByRole('button', { name: 'Giải thích các nút', exact: true }).click();
  await waitExplain(page, true);
  await page.locator('.btn--codex').hover();
  await page.waitForTimeout(200);
  const tipAnim = await page.evaluate(() => getComputedStyle(document.querySelector('.guide-tip')).animationName);
  check('(reduced motion) the explain bubble appears without animation', tipAnim === 'none', tipAnim);
  await ctx.close();
}

// ================================================================== Điện thoại 375×812, cảm ứng
{
  const ctx = await context({ width: 375, height: 812, touch: true });
  const page = await open(ctx);
  await waitHello(page);
  const hr = await rect(page, '.guide-hello');
  const sky = await rect(page, '#view-horizon .view__canvas');
  check('(375) the hello fits on screen as a bottom sheet', hr.x >= 0 && hr.x + hr.w <= 375 && hr.y >= 0 && hr.y + hr.h <= 812, JSON.stringify(hr));
  check('(375) the hello does not cover the sky', !overlaps(hr, sky), JSON.stringify({ hr, sky }));
  const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.guide-hello__body')).fontSize));
  check('(375) hello text is ≥ 16 px on phones', fs >= 16, `${fs}px`);
  check('(375) no horizontal scroll with the hello open', await noHScroll(page));
  const btnH = await page.evaluate(() => [...document.querySelectorAll('.guide-hello button')].map((b) => b.getBoundingClientRect().height));
  check('(375) hello buttons are ≥ 44 px', btnH.every((x) => x >= 44), btnH.join(','));
  await page.getByRole('button', { name: 'Để sau' }).tap();

  const av = await rect(page, '.guide-avatar');
  check('(375) avatar ≥ 44 px, inside the viewport', av.w >= 44 && av.h >= 44 && av.x >= 0 && av.x + av.w <= 375, JSON.stringify(av));
  check('(375) the avatar does not cover view tools, the info card or controls', (await avatarClear(page)).length === 0, (await avatarClear(page)).join(', '));

  await page.locator('.guide-avatar').tap();
  await waitExplain(page, true).catch(() => {});
  check('(375) tapping the avatar enters explain mode', await explaining(page));
  await page.evaluate(() => window.__app.actions.play());
  const p0 = (await st(page)).playing;
  await page.locator('.simple__play').tap();
  await page.waitForTimeout(300);
  check('(touch) first tap on play shows its tip', (await tipText(page)) === TIP.simplePlay, await tipText(page));
  check('(touch) first tap does NOT toggle playing', (await st(page)).playing === p0, `playing=${(await st(page)).playing}`);
  const tb = await rect(page, '.guide-tip');
  check('(375) the tip fits on screen', tb.x >= 0 && tb.x + tb.w <= 375 && tb.y >= 0 && tb.y + tb.h <= 812, JSON.stringify(tb));
  check('(375) no horizontal scroll in explain mode', await noHScroll(page));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}guide-375.png` });
  await page.locator('.simple__play').tap();
  await page.waitForTimeout(200);
  check('(touch) second tap on the same control activates it', (await st(page)).playing === !p0);

  // "Dùng nút này" trên một điều khiển khác (Nhanh).
  const r0 = (await st(page)).rate;
  await page.locator('.simple__seg', { hasText: 'Nhanh' }).tap();
  await page.waitForTimeout(200);
  check('(touch) first tap on "Nhanh" shows the speed tip and does not change the rate', (await tipText(page)) === TIP.simpleSpeed && (await st(page)).rate === r0, `rate=${(await st(page)).rate}`);
  await page.getByRole('button', { name: 'Dùng nút này' }).tap();
  await page.waitForTimeout(200);
  check('(touch) "Dùng nút này" activates it', (await st(page)).rate === 15, `rate=${(await st(page)).rate}`);
  const useH = await page.evaluate(() => document.querySelector('.guide-tip__use').getBoundingClientRect().height);
  check('(375) "Dùng nút này" is ≥ 44 px', useH >= 44, `${useH}`);

  // Bầu trời: chạm vẫn kéo/chọn sao (không bị chặn) và hiện lời giải thích.
  await page.evaluate(() => window.scrollTo(0, 0));
  const skyR = await rect(page, '#view-horizon .view__canvas');
  await page.touchscreen.tap(skyR.x + skyR.w * 0.5, skyR.y + skyR.h * 0.15);
  await page.waitForTimeout(300);
  check('(touch) tapping the sky explains the view (the sky is never blocked)', (await tipText(page)) === TIP.horizonView, await tipText(page));

  // Đầy đủ trên điện thoại.
  await page.evaluate(() => window.__app.actions.setUiMode('full'));
  await page.waitForTimeout(400);
  check('(375 full) the avatar is present in Full', await page.locator('.guide-avatar').isVisible());
  const active0 = await page.evaluate(() => document.querySelector('.panels').dataset.active);
  await page.locator('.paneltabs .tab[data-panel="stars"]').tap();
  await page.waitForTimeout(200);
  const active1 = await page.evaluate(() => document.querySelector('.panels').dataset.active);
  check('(375 full) first tap on a panel tab explains instead of switching', (await tipText(page)) === TIP.panelTabs && active1 === active0, `${active0}→${active1}`);
  check('(375 full) no horizontal scroll', await noHScroll(page));
  await page.getByRole('button', { name: 'Thoát chế độ giải thích' }).tap();
  check('(375) the banner close button exits explain mode', !(await explaining(page)));
  await ctx.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
