// Kiểm tra tô sáng liên kết (ux-brief §6) và tên quốc tế của thiên thể (ux-brief §7).
//
// Chạy trên máy chủ phát triển (cần window.__app / window.__perf):
//   npx vite --port 5195 --strictPort   (nền), rồi node docs/redesign/uat/highlight.mjs
// Đổi địa chỉ bằng HL_URL (mặc định http://localhost:5195/?quality=fixed).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const URL = process.env.HL_URL ?? 'http://localhost:5195/?quality=fixed';
const SHOTS = new globalThis.URL('../shots/', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion ?? 'no-preference' });
  // Không hiện gợi ý lần đầu (che khung nhìn trong ảnh chụp).
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('astrosphere.hint.v1', 'true');
    } catch {
      /* bỏ qua */
    }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => window.__app?.horizon && window.__perf?.views, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  // Dừng hoạt ảnh để ảnh chụp và số đo ổn định.
  await page.evaluate(() => window.__app.actions.pause());
  return { ctx, page };
}

/** Trạng thái tô sáng đọc từ store và hai khung nhìn (qua hook DEV window.__perf.views). */
const probe = (page) =>
  page.evaluate(() => {
    const { horizon, sphere } = window.__perf.views;
    const s = window.__app.store.state;
    const cell = document.querySelector('.databar [data-emphasis=pole]');
    return {
      emphasis: s.emphasis,
      poleToggle: s.toggles.poleAltitude,
      poleAltVisible: horizon.horizon.poleAlt.visible,
      poleArcWidth: horizon.horizon.poleArc.material.linewidth,
      poleSectorOpacity: +horizon.horizon.poleSector.material.opacity.toFixed(3),
      sphereGroup: sphere.emphasis.current,
      horizonGroup: horizon.emphasis.current,
      level: horizon.emphasis.value,
      running: horizon.emphasis.running,
      cellLinked: cell.classList.contains('is-linked'),
      cellTabindex: cell.getAttribute('tabindex'),
      cellDescribedBy: cell.getAttribute('aria-describedby'),
    };
  });

const POLE_CELL = '.databar [data-emphasis=pole]';

// ------------------------------------------------------------------ 1–5: số → hình, bàn phím, tên
{
  const { ctx, page } = await open();
  const before = await probe(page);
  check('precondition: pole-altitude toggle off, geometry hidden, no emphasis', !before.poleToggle && !before.poleAltVisible && before.emphasis === null, JSON.stringify(before));

  // (1) Rê chuột lên ô "Độ cao thiên cực"
  await page.locator(POLE_CELL).hover();
  await page.waitForFunction(() => window.__perf.views.horizon.emphasis.value === 1, null, { timeout: 10000 }).catch(() => {});
  const hov = await probe(page);
  check("(1) hover pole cell → store.emphasis === 'pole'", hov.emphasis === 'pole', `emphasis=${hov.emphasis}`);
  check('(1) pole-altitude geometry visible although its toggle is off', hov.poleAltVisible && !hov.poleToggle, JSON.stringify({ visible: hov.poleAltVisible, toggle: hov.poleToggle }));
  // Fix round 1 (review-1 F2): base arc 3 px (was 2,4), sector 0,35 (was 0,3), mesh boost +0,3 (was +0,2).
  check('(1) arc width ×1.8 (3 → 5,4 px) and sector opacity +0,3 (0,35 → 0,65)', Math.abs(hov.poleArcWidth - 5.4) < 1e-6 && Math.abs(hov.poleSectorOpacity - 0.65) < 1e-3, `width=${hov.poleArcWidth} opacity=${hov.poleSectorOpacity}`);
  check('(1) both views emphasise the pole group', hov.sphereGroup === 'pole' && hov.horizonGroup === 'pole', `sphere=${hov.sphereGroup} horizon=${hov.horizonGroup}`);
  check('(4) cell has class is-linked while emphasised', hov.cellLinked);
  const style = await page.locator(`${POLE_CELL} .data__v`).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { weight: cs.fontWeight, line: cs.textDecorationLine, color: cs.textDecorationColor };
  });
  check('(4) linked value is bold with an orange (--accent) underline', Number(style.weight) >= 700 && style.line.includes('underline') && style.color === 'rgb(242, 101, 34)', JSON.stringify(style));
  await page.screenshot({ path: `${SHOTS}highlight-pole-1440.png` });

  // (2) Rời chuột → hết tô sáng
  await page.mouse.move(720, 20);
  await page.waitForFunction(() => window.__app.store.state.emphasis === null, null, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => !window.__perf.views.horizon.emphasis.running, null, { timeout: 5000 }).catch(() => {});
  const away = await probe(page);
  check('(2) pointer away clears emphasis, geometry hidden again, class removed', away.emphasis === null && !away.poleAltVisible && !away.cellLinked && away.poleArcWidth === 3, JSON.stringify(away));

  // (3) Bàn phím: Tab tới ô
  check('(3) cell is focusable (tabindex=0) and described', away.cellTabindex === '0' && /emphasis-hint/.test(away.cellDescribedBy ?? ''), `tabindex=${away.cellTabindex} describedby=${away.cellDescribedBy}`);
  await page.evaluate(() => document.activeElement?.blur());
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), POLE_CELL);
  }
  const kb = await probe(page);
  check("(3) keyboard Tab to the cell → emphasis 'pole' and is-linked", reached && kb.emphasis === 'pole' && kb.cellLinked, `reached=${reached} emphasis=${kb.emphasis} linked=${kb.cellLinked}`);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  const kbOut = await probe(page);
  check('(3) Tab away (blur) clears it', kbOut.emphasis !== 'pole', `emphasis=${kbOut.emphasis}`);
  // Bấm chuột vào ô không để lại tô sáng dính sau khi rời chuột (chỉ tiêu điểm bàn phím mới giữ).
  await page.locator(POLE_CELL).click();
  await page.mouse.move(720, 20);
  await page.waitForTimeout(100);
  const click = await probe(page);
  check('mouse click then leave: no sticky emphasis', click.emphasis === null, `emphasis=${click.emphasis}`);

  // Chiều ngược: rê chuột lên trục thiên cực trong khung thiên cầu → ô sáng lên.
  const target = await page.evaluate(() => {
    const view = window.__perf.views.sphere;
    let axis = null;
    view.sky.fixed.traverse((o) => {
      if (o.userData.tip === 'axis') axis = o;
    });
    const r = view.renderer.domElement.getBoundingClientRect();
    const pts = [];
    for (const f of [-0.75, -0.6, 0.6, 0.75, -0.9, 0.9]) {
      const v = axis.position.clone();
      v.set(0, 0, f * view.R * 1.15);
      axis.localToWorld(v);
      v.project(view.camera);
      pts.push({ x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height });
    }
    return pts;
  });
  let rev = null;
  for (const p of target) {
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(250);
    rev = await probe(page);
    if (rev.emphasis === 'pole') break;
  }
  check("reverse: hovering the pole axis in the 3D view sets 'pole' and lights the cell", rev?.emphasis === 'pole' && rev.cellLinked, JSON.stringify({ emphasis: rev?.emphasis, linked: rev?.cellLinked }));
  await page.mouse.move(720, 20);
  await page.waitForTimeout(250);
  const revOut = await probe(page);
  check('reverse: leaving the axis clears emphasis', revOut.emphasis === null, `emphasis=${revOut.emphasis}`);

  // (5) Tên: tiêu đề thẻ thông tin "Polaris", dòng phụ "Sao Bắc Cực"
  const names = await page.evaluate(() => ({
    title: document.querySelector('.infocard__title')?.textContent,
    vi: document.querySelector('.infocard__vi')?.textContent,
    viHidden: document.querySelector('.infocard__vi')?.hidden,
    kind: document.querySelector('.infocard__kind')?.textContent,
  }));
  check('(5) info-card title reads "Polaris"', names.title === 'Polaris', JSON.stringify(names));
  check('(5) secondary line reads "Sao Bắc Cực"', names.vi === 'Sao Bắc Cực' && !names.viHidden, JSON.stringify(names));
  check('(5) kind line keeps the designation and IAU constellation name', /α UMi/.test(names.kind ?? '') && /Ursa Minor/.test(names.kind ?? ''), names.kind ?? '');

  // (6) Bảng Sao: ô chọn mẫu hiện "Ursa Major"
  // Máy tính: bốn bảng nằm cạnh nhau (thanh thẻ chỉ có trên điện thoại) — cuộn tới bảng Sao.
  await page.locator('#tpl-select').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const tpl = await page.evaluate(() => {
    const sel = document.querySelector('#tpl-select');
    return { selected: sel.selectedOptions[0]?.textContent, options: [...sel.options].map((o) => o.textContent), note: document.querySelector('#panel-stars .hint')?.textContent };
  });
  check('(6) template select shows "Ursa Major"', tpl.selected === 'Ursa Major' && tpl.options.includes('Crux') && tpl.options.includes('Orion'), JSON.stringify(tpl.options.slice(0, 5)));
  check('(6) description puts the Vietnamese name second', /^Ursa Major — Đại Hùng \(Gấu Lớn\)\./.test(tpl.note ?? ''), tpl.note ?? '');
  const labels = await page.evaluate(() => [...document.querySelectorAll('.lbl--constellation, .lbl--star')].map((l) => l.textContent));
  check('3D labels use IAU / international names', labels.includes('Ursa Major') && labels.includes('Orion') && labels.includes('Polaris') && !labels.some((l) => /Bắc Cực|Đại Hùng|Thợ Săn/.test(l)), labels.slice(0, 12).join(', '));
  const chips = await page.locator('.figure-chip').allTextContents();
  check('figure chips use IAU names', chips.some((c) => c.startsWith('Ursa Major')) && chips.some((c) => c.startsWith('Ursa Minor')), chips.join(' | '));
  await page.screenshot({ path: `${SHOTS}names-1440.png` });
  await ctx.close();
}

// ------------------------------------------------------------------ 7: giảm chuyển động
{
  const { ctx, page } = await open({ reducedMotion: 'reduce' });
  await page.locator(POLE_CELL).hover();
  await page.waitForFunction(() => window.__app.store.state.emphasis === 'pole', null, { timeout: 5000 }).catch(() => {});
  const rm = await probe(page);
  check('(7) reduced motion: emphasis still works, applied instantly (no tween)', rm.emphasis === 'pole' && rm.poleAltVisible && rm.level === 1 && !rm.running && rm.cellLinked, JSON.stringify(rm));
  await page.mouse.move(720, 20);
  await page.waitForTimeout(150);
  const out = await probe(page);
  check('(7) reduced motion: leaving clears instantly', out.emphasis === null && out.level === 0 && !out.running, JSON.stringify({ emphasis: out.emphasis, level: out.level }));
  await ctx.close();
}

await browser.close();
check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `HIGHLIGHT FAIL (${failed.length}/${results.length})` : `HIGHLIGHT PASS (${results.length} checks)`);
process.exit(failed.length ? 1 : 0);
