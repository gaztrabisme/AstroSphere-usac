import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify, equatorialToHorizontal, fmtDeg, fmtNum, poleAltitude, riseSet } from '../astro';
import vi from '../i18n/vi.json';
import { PLACES } from '../scenario';
import { Actions, createInitialState, lstOf, Store } from '../state';
import { applyPreset, applyStep, type ApplyHost } from './apply';
import { CHAPTERS, STORY_BASE_TOGGLES, STORY_RATE, STORY_STARS, stepKey, type ReadoutKey } from './chapters';
import { isProgress } from './progress';
import type { ViewKey } from './types';

type Dict = { [k: string]: unknown };

function get(key: string): unknown {
  let cur: unknown = vi;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Dict)) cur = (cur as Dict)[part];
    else return undefined;
  }
  return cur;
}
const hasString = (key: string) => typeof get(key) === 'string' && (get(key) as string).length > 0;

function makeHost(reduced = false) {
  const store = new Store(createInitialState());
  const actions = new Actions(store);
  const views: ViewKey[] = [];
  const host: ApplyHost = { store, actions, reducedMotion: () => reduced, showView: (v) => views.push(v) };
  return { host, store, actions, views };
}

const step = (c: number, s: number) => CHAPTERS[c - 1].steps[s - 1];

function selectedHip(store: Store): number | undefined {
  const sel = store.state.selected;
  if (sel?.kind !== 'user') return undefined;
  return store.state.stars.find((x) => x.id === sel.id)?.hip;
}

describe('Kịch bản câu chuyện: dữ liệu', () => {
  it('ba chương, mỗi chương sáu bước, id bước không trùng trong chương', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    for (const ch of CHAPTERS) {
      expect(ch.steps).toHaveLength(6);
      expect(new Set(ch.steps.map((s) => s.id)).size).toBe(ch.steps.length);
    }
    const ends = CHAPTERS.flatMap((c) => c.steps).filter((s) => s.end);
    expect(ends).toHaveLength(1);
    expect(CHAPTERS[2].steps[5].end).toBe(true);
  });

  it('mọi bước có tiêu đề, nội dung; nút thử, câu hỏi, giải thích đều có chữ', () => {
    const missing: string[] = [];
    for (const ch of CHAPTERS) {
      if (!hasString(`story.${ch.id}.title`)) missing.push(`story.${ch.id}.title`);
      for (const s of ch.steps) {
        for (const part of ['title', 'body']) if (!hasString(stepKey(ch, s, part))) missing.push(stepKey(ch, s, part));
        for (const a of s.actions ?? []) if (!hasString(stepKey(ch, s, `try.${a.key}`))) missing.push(stepKey(ch, s, `try.${a.key}`));
        if (s.quiz) {
          const opts = get(stepKey(ch, s, 'options'));
          if (!Array.isArray(opts) || opts.length <= s.quiz.correct || opts.some((o) => typeof o !== 'string' || !o)) missing.push(stepKey(ch, s, 'options'));
          if (!hasString(stepKey(ch, s, 'explain'))) missing.push(stepKey(ch, s, 'explain'));
        }
        const notice = get(stepKey(ch, s, 'notice'));
        if (notice !== undefined && typeof notice !== 'string') missing.push(stepKey(ch, s, 'notice'));
      }
    }
    expect(missing).toEqual([]);
  });

  it('mọi khóa story.ui / hero / tên sao / nhãn số liệu dùng trong mã đều tồn tại', () => {
    const dir = __dirname;
    const code = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const keys = new Set<string>();
    for (const m of code.matchAll(/\bt\(\s*'((?:story|hero)\.[a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
    expect(keys.size).toBeGreaterThan(20);
    const readout = new Set<ReadoutKey>(CHAPTERS.flatMap((c) => c.steps.flatMap((s) => s.readout ?? [])));
    for (const k of readout) keys.add(`story.ui.readoutLabel.${k}`);
    for (const name of Object.keys(STORY_STARS)) keys.add(`story.stars.${name}`);
    for (const v of ['circumpolar', 'riseSet', 'neverRise']) keys.add(`visibility.${v}`);
    for (const d of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) keys.add(`compass.${d}`);
    expect([...keys].filter((k) => !hasString(k))).toEqual([]);
  });

  it('không lộ số HIP trong chữ của câu chuyện', () => {
    const text = JSON.stringify({ hero: get('hero'), story: get('story') });
    expect(/HIP|\b\d{4,6}\b/.test(text.replace(/\d{1,3},\d{1,2}/g, ''))).toBe(false);
  });

  it('bộ hiển thị nền đúng như đặc tả', () => {
    const on = Object.entries(STORY_BASE_TOGGLES)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort();
    expect(on).toEqual(['catalog', 'equator', 'horizonOnSphere', 'poleAxis', 'zenithNadir']);
    expect(STORY_RATE).toBe(40);
  });

  it('dạng tiến độ được kiểm tra chặt', () => {
    expect(isProgress({ c: 1, s: 2, done: ['c1'] })).toBe(true);
    expect(isProgress({ c: -1, s: 2, done: [] })).toBe(false);
    expect(isProgress({ c: 1, s: 2 })).toBe(false);
    expect(isProgress([1, 2])).toBe(false);
    expect(isProgress(null)).toBe(false);
  });
});

describe('Dựng bước lên mô phỏng (applyStep)', () => {
  it('c1 bước 4: Hà Nội, bật độ cao thiên cực', () => {
    const { host, store } = makeHost();
    applyStep(host, step(1, 4));
    expect(store.state.lat).toBe(21.03);
    expect(store.state.toggles.poleAltitude).toBe(true);
    expect(selectedHip(store)).toBe(STORY_STARS.polaris);
  });

  it('c1 bước 1: Sao Bắc Cực, LST 90°, giản đồ chân trời; các hộp kiểm ngoài bộ nền bị tắt', () => {
    const { host, store, views } = makeHost();
    host.actions.setToggle('ecliptic', true);
    applyStep(host, step(1, 1));
    expect(lstOf(store.state)).toBeCloseTo(90, 6);
    expect(selectedHip(store)).toBe(STORY_STARS.polaris);
    expect(views.at(-1)).toBe('horizon');
    expect(store.state.toggles).toEqual(STORY_BASE_TOGGLES);
  });

  it('c3 bước 3: xích đạo (giữ kinh độ)', () => {
    const { host, store } = makeHost();
    const lon = store.state.lon;
    applyStep(host, step(3, 3));
    expect(store.state.lat).toBe(0);
    expect(store.state.lon).toBe(lon);
  });

  it('c3 bước 4: Bắc Cực — sao δ = 10° là cận cực', () => {
    const { host, store } = makeHost();
    applyStep(host, step(3, 4));
    expect(store.state.lat).toBe(90);
    expect(classify(10, 90)).toBe('circumpolar');
  });

  it('c3 bước 5: Gacrux của Nam Thập Tự; ở Sydney không bao giờ lặn', () => {
    const { host, store } = makeHost();
    applyStep(host, step(3, 5));
    expect(selectedHip(store)).toBe(STORY_STARS.gacrux);
    expect(store.state.figures.some((f) => f.templateId === 'Cru')).toBe(true);
    expect(store.state.lat).toBe(PLACES.hcm.lat);
    expect(store.state.toggles.zoneCircumpolar && store.state.toggles.zoneRiseSet && store.state.toggles.zoneNeverRise).toBe(true);
    expect(classify(-57.11, -33.87)).toBe('circumpolar');
    const sydney = step(3, 5).actions!.find((a) => a.key === 'sydney')!;
    applyPreset(host, sydney.preset, null);
    expect(store.state.lat).toBe(PLACES.sydney.lat);
    expect(selectedHip(store)).toBe(STORY_STARS.gacrux);
  });

  it('c2 bước 5: LST ≈ 88,79° (Tham Tú trên kinh tuyến); nút ±2 giờ dịch 30°', () => {
    const { host, store } = makeHost();
    applyStep(host, step(2, 5));
    expect(lstOf(store.state)).toBeCloseTo(88.79, 6);
    expect(selectedHip(store)).toBe(STORY_STARS.betelgeuse);
    expect(store.state.toggles.meridian).toBe(true);
    const chip = (k: string) => step(2, 5).actions!.find((a) => a.key === k)!.preset;
    applyPreset(host, chip('plus2'), null);
    expect(lstOf(store.state)).toBeCloseTo(118.79, 6);
    applyPreset(host, chip('minus2'), null);
    applyPreset(host, chip('minus2'), null);
    expect(lstOf(store.state)).toBeCloseTo(58.79, 6);
    applyPreset(host, chip('transit'), null);
    expect(lstOf(store.state)).toBeCloseTo(88.79, 6);
  });

  it('c2 bước 1: Tham Tú, vòng thẳng đứng và lưới chân trời', () => {
    const { host, store } = makeHost();
    applyStep(host, step(2, 1));
    expect(selectedHip(store)).toBe(STORY_STARS.betelgeuse);
    expect(store.state.toggles.verticalCircle && store.state.toggles.altAzGrid).toBe(true);
    expect(store.state.toggles.hourCircle0).toBe(false);
    expect(lstOf(store.state)).toBeCloseTo(45, 6);
  });

  it('dựng lại một bước cho cùng kết quả (bất biến khi lặp)', () => {
    const { host, store } = makeHost(true);
    for (const ch of CHAPTERS) {
      for (const s of ch.steps) {
        applyStep(host, s);
        const a = store.state;
        applyStep(host, s);
        const b = store.state;
        expect([b.lat, b.lon, b.toggles, b.trails, b.selected, b.playing]).toEqual([a.lat, a.lon, a.toggles, a.trails, a.selected, a.playing]);
        expect(lstOf(b)).toBeCloseTo(lstOf(a), 6);
      }
    }
  });

  it('giảm chuyển động: không bao giờ tự chạy, vết sao vẽ tĩnh', () => {
    const { host, store } = makeHost(true);
    store.set({ playing: true });
    for (const ch of CHAPTERS) {
      for (const s of ch.steps) {
        applyStep(host, s);
        expect(store.state.playing, `${ch.id}.${s.id}`).toBe(false);
        for (const a of s.actions ?? []) {
          applyPreset(host, a.preset, null);
          expect(store.state.playing, `${ch.id}.${s.id}.${a.key}`).toBe(false);
        }
      }
    }
    applyStep(host, step(1, 2));
    // Vết dài đã có sẵn: LST hiện tại đi trước trailStart một đoạn bằng góc tĩnh.
    expect(store.state.trails).toBe('long');
    expect(lstOf(store.state) - 90).toBeCloseTo(300 - 360 * Math.floor((90 + 300) / 360), 6);
    expect(store.state.gst + store.state.lon - store.state.trailStart).toBeCloseTo(300, 6);
  });

  it('không giảm chuyển động: bước "bầu trời quay" chạy liên tục với nhịp 40 s', () => {
    const { host, store } = makeHost(false);
    applyStep(host, step(1, 2));
    expect(store.state.playing).toBe(true);
    expect(store.state.mode).toBe('continuous');
    expect(store.state.rate).toBe(STORY_RATE);
    applyStep(host, step(1, 4));
    expect(store.state.playing).toBe(false);
  });
});

describe('Đáp án câu hỏi khớp với phép tính thiên văn', () => {
  const opts = (c: number, s: number) => get(stepKey(CHAPTERS[c - 1], step(c, s), 'options')) as string[];

  it('c1: độ cao thiên cực ở Huế (φ ≈ 16,5°)', () => {
    const q = step(1, 6).quiz!;
    expect(opts(1, 6)[q.correct]).toBe(fmtDeg(poleAltitude(16.5), 1));
  });

  it('c2: khi bầu trời quay, A, h, H đổi còn α, δ giữ nguyên', () => {
    const q = step(2, 6).quiz!;
    expect(opts(2, 6)[q.correct]).toMatch(/α.*δ/);
    const [ra, dec, lat] = [88.79, 7.41, 21.03];
    const a = equatorialToHorizontal(ra, dec, lat, 45);
    const b = equatorialToHorizontal(ra, dec, lat, 75);
    expect(Math.abs(a.az - b.az)).toBeGreaterThan(1);
    expect(Math.abs(a.alt - b.alt)).toBeGreaterThan(1);
    expect(Math.abs(a.ha - b.ha)).toBeGreaterThan(1);
  });

  it('c3: ở φ = 40° B, sao δ = +60° là sao cận cực', () => {
    const q = step(3, 6).quiz!;
    const order = ['circumpolar', 'riseSet', 'neverRise'] as const;
    expect(opts(3, 6)).toHaveLength(3);
    expect(order[q.correct]).toBe(classify(60, 40));
  });

  it('các con số trong lời kể đúng với phép tính', () => {
    const zones = get('story.c3.zones.notice') as string;
    expect(zones).toContain(fmtNum(90 - PLACES.hanoi.lat));
    const crux = get('story.c3.crux.notice') as string;
    const gacrux = { ra: 187.79, dec: -57.11 };
    expect(crux).toContain(`${Math.round(riseSet(gacrux.ra, gacrux.dec, PLACES.hcm.lat).upperAlt)}°`);
    expect(crux).toContain(`${Math.round(riseSet(gacrux.ra, gacrux.dec, PLACES.hanoi.lat).upperAlt)}°`);
    expect(riseSet(gacrux.ra, gacrux.dec, PLACES.sydney.lat).visibility).toBe('circumpolar');
    expect(get('story.c1.pole.body') as string).toContain(fmtNum(poleAltitude(PLACES.hanoi.lat)));
    expect(get('story.c1.latitudes.notice') as string).toContain(fmtNum(poleAltitude(PLACES.sydney.lat)));
  });
});
