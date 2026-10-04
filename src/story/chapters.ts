// Kịch bản hành trình có hướng dẫn: dữ liệu thuần (không DOM). Chữ hiển thị nằm trong vi.json → story.<chương>.<bước>.*

import type { PlaceKey } from '../scenario';
import { DEFAULT_TOGGLES, type Toggles, type TrailMode } from '../state';
import type { ViewKey } from './types';

/** Nhịp quay mặc định của câu chuyện: 40 giây thực cho một ngày thiên văn — đủ chậm để kể (K9). */
export const STORY_RATE = 40;

export type Motion = { rate: number; staticAdvanceDeg: number } | 'pause';

export interface StepPreset {
  place?: PlaceKey | { lat: number; lon?: number };
  lst?: number;
  /** Dịch LST tương đối (độ) — dùng cho các nút "−2 giờ" / "+2 giờ". */
  advanceDeg?: number;
  toggles?: Partial<Toggles>;
  trails?: TrailMode;
  resetTrails?: boolean;
  constellations?: string[];
  selectHip?: number;
  motion?: Motion;
  view?: ViewKey;
}

export type ReadoutKey = 'lat' | 'pole' | 'lst' | 'ra' | 'dec' | 'ha' | 'az' | 'alt' | 'status';

export interface StepAction {
  key: string;
  preset: StepPreset;
}

export interface StepDef {
  id: string;
  preset: StepPreset;
  readout?: ReadoutKey[];
  actions?: StepAction[];
  quiz?: { correct: number };
  /** Bước cuối của cả hành trình. */
  end?: boolean;
}

export type ChapterId = 'c1' | 'c2' | 'c3';

export interface ChapterDef {
  id: ChapterId;
  steps: StepDef[];
}

/** Bộ hiển thị nền của mọi bước: gọn, chỉ những gì cần cho câu chuyện. */
export const STORY_BASE_TOGGLES: Toggles = (() => {
  const off = Object.fromEntries(Object.keys(DEFAULT_TOGGLES).map((k) => [k, false])) as unknown as Toggles;
  return { ...off, equator: true, poleAxis: true, zenithNadir: true, horizonOnSphere: true, catalog: true };
})();

/** Tên tiếng Việt dùng trong câu chuyện (theo số Hipparcos — số này không bao giờ hiển thị). */
export const STORY_STARS = { polaris: 11767, betelgeuse: 27989, gacrux: 61084 } as const;

const SPIN: Motion = { rate: STORY_RATE, staticAdvanceDeg: 300 };
const ZONES: Partial<Toggles> = { zoneCircumpolar: true, zoneRiseSet: true, zoneNeverRise: true };

const LAT_CHIPS: StepAction[] = [
  { key: 'hanoi', preset: { place: 'hanoi' } },
  { key: 'hcm', preset: { place: 'hcm' } },
  { key: 'equator', preset: { place: { lat: 0 } } },
  { key: 'northpole', preset: { place: { lat: 90 } } },
  { key: 'sydney', preset: { place: 'sydney' } },
];

const PLACE_CHIPS = (keys: PlaceKey[]): StepAction[] => keys.map((k) => ({ key: k, preset: { place: k } }));

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'c1',
    steps: [
      {
        id: 'night',
        preset: {
          place: 'hanoi',
          constellations: ['UMi', 'Ori'],
          lst: 90,
          selectHip: STORY_STARS.polaris,
          trails: 'none',
          view: 'horizon',
          motion: 'pause',
        },
        readout: ['az', 'alt'],
      },
      {
        id: 'turns',
        preset: {
          place: 'hanoi',
          constellations: ['UMi', 'Ori'],
          lst: 90,
          selectHip: STORY_STARS.polaris,
          trails: 'long',
          resetTrails: true,
          view: 'horizon',
          motion: SPIN,
        },
        readout: ['lst'],
      },
      {
        id: 'earth',
        preset: {
          place: 'hanoi',
          constellations: ['UMi', 'Ori'],
          lst: 90,
          selectHip: STORY_STARS.polaris,
          trails: 'long',
          resetTrails: true,
          view: 'sphere',
          motion: SPIN,
        },
        readout: ['lst'],
      },
      {
        id: 'pole',
        preset: {
          place: 'hanoi',
          constellations: ['UMi'],
          lst: 90,
          selectHip: STORY_STARS.polaris,
          toggles: { poleAltitude: true },
          trails: 'none',
          view: 'sphere',
          motion: 'pause',
        },
        readout: ['lat', 'pole'],
      },
      {
        id: 'latitudes',
        preset: {
          place: 'hanoi',
          lst: 90,
          toggles: { poleAltitude: true },
          trails: 'none',
          view: 'sphere',
          motion: 'pause',
        },
        readout: ['lat', 'pole'],
        actions: LAT_CHIPS,
      },
      {
        id: 'quiz',
        preset: { place: 'hue', lst: 90, trails: 'none', view: 'sphere', motion: 'pause' },
        quiz: { correct: 1 },
      },
    ],
  },
  {
    id: 'c2',
    steps: [
      {
        id: 'altaz',
        preset: {
          place: 'hanoi',
          constellations: ['Ori'],
          lst: 45,
          selectHip: STORY_STARS.betelgeuse,
          toggles: { verticalCircle: true, altAzGrid: true },
          trails: 'none',
          view: 'horizon',
          motion: 'pause',
        },
        readout: ['az', 'alt'],
      },
      {
        id: 'radec',
        preset: {
          place: 'hanoi',
          constellations: ['Ori'],
          lst: 45,
          selectHip: STORY_STARS.betelgeuse,
          toggles: { eqGrid: true, hourCircle0: true },
          trails: 'none',
          view: 'sphere',
          motion: 'pause',
        },
        readout: ['ra', 'dec'],
      },
      {
        id: 'turning',
        preset: {
          place: 'hanoi',
          constellations: ['Ori'],
          lst: 45,
          selectHip: STORY_STARS.betelgeuse,
          toggles: { eqGrid: true, altAzGrid: true, verticalCircle: true },
          trails: 'short',
          resetTrails: true,
          view: 'sphere',
          motion: SPIN,
        },
        readout: ['ra', 'dec', 'az', 'alt'],
        actions: PLACE_CHIPS(['hcm', 'hanoi', 'sydney']),
      },
      {
        id: 'lst',
        preset: {
          place: 'hanoi',
          constellations: ['Ori'],
          lst: 45,
          selectHip: STORY_STARS.betelgeuse,
          toggles: { meridian: true, eqGrid: true },
          trails: 'none',
          view: 'sphere',
          motion: SPIN,
        },
        readout: ['lst'],
      },
      {
        id: 'hourangle',
        preset: {
          place: 'hanoi',
          constellations: ['Ori'],
          lst: 88.79,
          selectHip: STORY_STARS.betelgeuse,
          toggles: { meridian: true },
          trails: 'none',
          view: 'sphere',
          motion: 'pause',
        },
        readout: ['lst', 'ra', 'ha', 'alt'],
        actions: [
          { key: 'minus2', preset: { motion: 'pause', advanceDeg: -30 } },
          { key: 'plus2', preset: { motion: 'pause', advanceDeg: 30 } },
          { key: 'transit', preset: { motion: 'pause', lst: 88.79 } },
        ],
      },
      {
        id: 'quiz',
        preset: { place: 'hanoi', selectHip: STORY_STARS.betelgeuse, trails: 'none', view: 'sphere', motion: 'pause' },
        quiz: { correct: 2 },
      },
    ],
  },
  {
    id: 'c3',
    steps: [
      {
        id: 'zones',
        preset: { place: 'hanoi', lst: 90, toggles: ZONES, trails: 'none', view: 'sphere', motion: 'pause' },
        readout: ['lat'],
      },
      {
        id: 'ground',
        preset: {
          place: 'hanoi',
          lst: 90,
          toggles: { ...ZONES, underside: true },
          trails: 'long',
          resetTrails: true,
          view: 'horizon',
          motion: SPIN,
        },
      },
      {
        id: 'equator',
        preset: { place: { lat: 0 }, lst: 90, toggles: ZONES, trails: 'long', resetTrails: true, view: 'sphere', motion: SPIN },
        readout: ['lat'],
      },
      {
        id: 'pole',
        preset: { place: { lat: 90 }, lst: 90, toggles: ZONES, trails: 'long', resetTrails: true, view: 'sphere', motion: SPIN },
        readout: ['lat'],
      },
      {
        id: 'crux',
        preset: {
          place: 'hcm',
          constellations: ['Cru'],
          lst: 187.8,
          selectHip: STORY_STARS.gacrux,
          toggles: ZONES,
          trails: 'none',
          resetTrails: true,
          view: 'horizon',
          motion: 'pause',
        },
        readout: ['alt', 'status'],
        actions: [
          ...PLACE_CHIPS(['hcm', 'hanoi', 'sydney']),
          { key: 'spin', preset: { trails: 'long', resetTrails: true, motion: SPIN } },
        ],
      },
      {
        id: 'end',
        preset: { place: 'hanoi', lst: 90, toggles: ZONES, trails: 'none', view: 'sphere', motion: 'pause' },
        quiz: { correct: 0 },
        end: true,
      },
    ],
  },
];

/** Khóa chữ của một bước: story.<chương>.<bước>.<phần>. */
export const stepKey = (c: ChapterDef, s: StepDef, part: string) => `story.${c.id}.${s.id}.${part}`;
