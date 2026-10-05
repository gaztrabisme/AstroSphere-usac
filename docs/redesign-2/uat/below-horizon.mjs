// UAT fix-1 #2: đối tượng chọn nằm dưới chân trời (Sirius, h ≈ −73°) phải thấy được trong giản đồ chân trời —
// dấu "bóng" vẽ xuyên qua mặt đất và nhãn "Sirius đang ở dưới chân trời (h = −73°)" (docs/redesign-2/fix-1-scene.md).
// Cần máy chủ DEV (window.__app, window.__perf, import '/src/…'):
//   npx vite --port 5196 --strictPort (nền), rồi
//   UAT_URL='http://localhost:5196/?quality=fixed' node docs/redesign-2/uat/below-horizon.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const URL = process.env.UAT_URL ?? 'http://localhost:5196/?quality=fixed';
const SIRIUS = 32349;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function open(width, height, seed = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await ctx.addInitScript((kv) => {
    try {
      localStorage.setItem('astrosphere.hint.v1', 'true');
      localStorage.setItem('astrosphere.guide.v1', JSON.stringify({ hello: true }));
      for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v);
    } catch {}
  }, seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => window.__app?.horizon && window.__perf, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  // Hà Nội, tạm dừng, chọn Sirius.
  await page.evaluate(async (hip) => {
    const { store, actions } = window.__app;
    actions.pause();
    actions.setLocation(21.03, 105.85);
    const { selectCatalogHip } = await import('/src/scenario.ts');
    selectCatalogHip({ store, actions }, hip);
  }, SIRIUS);
  return { ctx, page, errors };
}

/** Đặt LST, chờ vẽ, trả về h tính lại bằng astro (cùng công thức với cảnh) và trạng thái nhãn. */
async function at(page, lst) {
  await page.evaluate((lst) => window.__app.actions.setLst(lst), lst);
  await page.waitForTimeout(700);
  return page.evaluate(async () => {
    const { equatorialToHorizontal } = await import('/src/astro/index.ts');
    const { lstOf } = await import('/src/state.ts');
    const { catalogArrays } = await import('/src/data/catalog.ts');
    const s = window.__app.store.state;
    const cat = catalogArrays();
    const i = s.selected.index;
    const { alt } = equatorialToHorizontal(cat.ra[i], cat.dec[i], s.lat, lstOf(s));
    const el = document.querySelector('#view-horizon .lbl--under');
    const canvas = document.querySelector('#view-horizon .view__canvas').getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    const shown = !!el && el.style.display !== 'none' && r.width > 0;
    const inside = shown && r.left >= canvas.left && r.right <= canvas.right && r.top >= canvas.top && r.bottom <= canvas.bottom;
    return { alt, text: el?.textContent ?? '', shown, inside, ghost: window.__app.horizon.horizon.ghostOn };
  });
}

// --- 1440 × 900, chế độ Cơ bản -------------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open(1440, 900);
  // LST 264° → góc giờ của Sirius ≈ 162,6°, h ≈ −73°.
  const a = await at(page, 264);
  check('Sirius dưới chân trời ở LST 264°', a.alt < -70 && a.alt > -76, `h = ${a.alt.toFixed(2)}°`);
  check('nhãn dưới chân trời hiện trong giản đồ chân trời', a.shown && a.inside, a.text);
  const want = `Sirius đang ở dưới chân trời (h = −${Math.round(-a.alt)}°)`;
  check('nhãn đúng tên (tiếng Anh) và dấu âm U+2212', a.text === want, `"${a.text}" vs "${want}"`);
  check('lượt vẽ "bóng" đang bật (vòng đứt nét, cung h xuyên mặt đất)', a.ghost === true);

  // Không dựng lại chữ khi h đổi trong cùng một độ nguyên; không tạo LineGeometry mới khi đối tượng di chuyển.
  const mut = await page.evaluate(async () => {
    const el = document.querySelector('#view-horizon .lbl--under');
    let n = 0;
    const mo = new MutationObserver((recs) => (n += recs.length));
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    const g0 = window.__perf.geomStats.lineGeometries;
    const { actions } = window.__app;
    for (let k = 0; k < 10; k++) {
      actions.setLst(264 + k * 0.01);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    mo.disconnect();
    return { n, geoms: window.__perf.geomStats.lineGeometries - g0 };
  });
  check('chữ nhãn không đổi khi h đổi dưới 1° (10 bước LST 0,01°)', mut.n === 0, `${mut.n} lần ghi`);
  check('không tạo LineGeometry mới khi đối tượng dưới chân trời di chuyển', mut.geoms === 0, `${mut.geoms}`);

  // Sát chân trời: một chữ số thập phân, vẫn dấu âm.
  const near = await page.evaluate(async () => {
    const { equatorialToHorizontal } = await import('/src/astro/index.ts');
    const { catalogArrays } = await import('/src/data/catalog.ts');
    const s = window.__app.store.state;
    const cat = catalogArrays();
    const i = s.selected.index;
    // Tìm LST cho h ≈ −0,5° (phía Tây, sao vừa lặn): quét LST quanh lúc lặn.
    let best = 0;
    let bestErr = 1e9;
    for (let l = 160; l < 240; l += 0.01) {
      const { alt, az } = equatorialToHorizontal(cat.ra[i], cat.dec[i], s.lat, l);
      if (az > 180 && Math.abs(alt + 0.5) < bestErr) {
        bestErr = Math.abs(alt + 0.5);
        best = l;
      }
    }
    return best;
  });
  const n0 = await at(page, near);
  check('sát chân trời: "h = −0,5°" (một chữ số thập phân, dấu phẩy)', n0.shown && /\(h = −0,[45]°\)$/.test(n0.text), n0.text);

  // Sao mọc: nhãn và lượt vẽ "bóng" biến mất.
  const up = await at(page, 101.3);
  check('Sirius trên chân trời ở LST 101,3° (qua kinh tuyến)', up.alt > 50, `h = ${up.alt.toFixed(2)}°`);
  check('nhãn dưới chân trời biến mất khi sao mọc', !up.shown, up.text);
  check('lượt vẽ "bóng" tắt khi sao mọc', up.ghost === false);

  // Bật "nhìn mặt dưới": thấy sao qua mặt đất → không cần nhãn.
  await at(page, 264);
  await page.evaluate(() => window.__app.actions.setToggle('underside', true));
  const under = await at(page, 264.5);
  check('bật mặt dưới chân trời: không còn nhãn cảnh báo', !under.shown && under.ghost === false);
  await page.evaluate(() => window.__app.actions.setToggle('underside', false));

  // Bỏ chọn: không còn gì.
  await page.evaluate(() => window.__app.actions.select(null));
  await page.waitForTimeout(500);
  const none = await page.evaluate(() => {
    const el = document.querySelector('#view-horizon .lbl--under');
    return { shown: !!el && el.style.display !== 'none' && el.getBoundingClientRect().width > 0, ghost: window.__app.horizon.horizon.ghostOn };
  });
  check('bỏ chọn: không còn nhãn và dấu bóng', !none.shown && !none.ghost);
  check('không có lỗi trang (1440)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// --- 375 × 812 điện thoại, chế độ Cơ bản ----------------------------------------------------------------------
{
  const { ctx, page, errors } = await open(375, 812);
  const a = await at(page, 264);
  check('375: nhãn dưới chân trời hiện, nằm trọn trong khung', a.shown && a.inside, a.text);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check('375: không cuộn ngang', sw <= 375, `scrollWidth ${sw}`);
  check('không có lỗi trang (375)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// --- G1 (fix-1): 1920 × 1080 trình chiếu, Đầy đủ — các va chạm nhãn mà review-1 ghi nhận ở 08-present-1920 ---------
{
  const { ctx, page, errors } = await open(1920, 1080, { 'astrosphere.mode.v1': JSON.stringify('full') });
  await page.evaluate(() => {
    const { actions } = window.__app;
    actions.select(null);
    actions.setLst(264);
  });
  await page.evaluate(async () => {
    const { selectCatalogHip } = await import('/src/scenario.ts');
    selectCatalogHip({ store: window.__app.store, actions: window.__app.actions }, 11767); // Polaris
  });
  await page.keyboard.press('f');
  await page.waitForTimeout(2500);
  const g = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null);
    const box = (root, re) => {
      const el = [...document.querySelectorAll(`${root} .lbl`)].find((e) => re.test(e.textContent) && e.style.display !== 'none');
      return el ? el.getBoundingClientRect() : null;
    };
    // Vòng chọn trong khung thiên cầu: chiếu vị trí thế giới của vòng ra màn hình.
    const v = window.__app.sphere;
    const host = document.querySelector('#view-sphere .view__canvas').getBoundingClientRect();
    let ring = null;
    if (THREE) {
      const p = new THREE.Vector3();
      if (v.sky.selRingWorld(p)) {
        p.project(v.camera);
        ring = { x: host.left + ((p.x + 1) / 2) * host.width, y: host.top + ((1 - p.y) / 2) * host.height };
      }
    }
    return {
      ring,
      B: box('#view-sphere', /^B$/),
      T: box('#view-sphere', /^T$/),
      zen: box('#view-sphere', /^Thiên đỉnh$/),
      ncp: box('#view-sphere', /^Thiên cực Bắc$/),
      A: box('#view-horizon', /^A = /),
    };
  });
  const inter = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const near = (r, b, rad) => r && b && b.left < r.x + rad && b.right > r.x - rad && b.top < r.y + rad && b.bottom > r.y - rad;
  check('1920 trình chiếu: chữ B hiện và không chạm vòng chọn quanh Polaris (khung thiên cầu)', !!g.B && !!g.ring && !near(g.ring, g.B, 26), JSON.stringify({ ring: g.ring, B: g.B && [g.B.left, g.B.top] }));
  check('1920 trình chiếu: "Thiên cực Bắc" vẫn hiện', !!g.ncp);
  const gapTZ = g.T && g.zen ? Math.max(g.zen.left - g.T.right, g.T.left - g.zen.right, g.zen.top - g.T.bottom, g.T.top - g.zen.bottom) : -1;
  check('1920 trình chiếu: "Thiên đỉnh" cách "T" ≥ 24 px', !!g.zen && gapTZ >= 24, `${Math.round(gapTZ)} px`);
  const obs = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null);
    if (!THREE) return null;
    const v = window.__app.horizon;
    const host = document.querySelector('#view-horizon .view__canvas').getBoundingClientRect();
    const pr = (y) => {
      const p = new THREE.Vector3(0, y, 0).project(v.camera);
      return { x: host.left + ((p.x + 1) / 2) * host.width, y: host.top + ((1 - p.y) / 2) * host.height };
    };
    const foot = pr(0);
    const head = pr(2.1);
    const h = foot.y - head.y;
    return { left: foot.x - h * 0.2, right: foot.x + h * 0.2, top: head.y, bottom: foot.y };
  });
  check('1920 trình chiếu: nhãn "A = …" không nằm trên hình người quan sát', !!g.A && !!obs && !inter(g.A, obs), JSON.stringify({ A: g.A && [g.A.left, g.A.top, g.A.right, g.A.bottom], obs }));
  check('không có lỗi trang (1920)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} PASS`);
process.exit(pass === results.length ? 0 : 1);
