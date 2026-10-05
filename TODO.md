# TODO

Kết quả rà soát mã nguồn ngày 2026-10-04. Mỗi mục ghi vị trí, lỗi và cách tái hiện.
Đánh dấu `[x]` khi đã sửa và ghi commit tương ứng.

Code review of 2026-10-04. Each item lists location, defect and how to reproduce it.

## Trung bình / Medium

- [x] **Per-frame line rebuild during playback** (22784f7) — `src/scene/horizonLayer.ts:196-208` (`updateVertical`) → `src/scene/geom.ts:57` (`setFatLinePoints`).
  Each call allocates a new `LineGeometry` and disposes the old one; with defaults (vertical circle on, Polaris selected) that is 6 rebuilds per frame across both views.
  Fix: update fixed-size buffers in place, or skip when alt/az changed less than an epsilon.
- [x] **Hint after solving lowers the score** (1203fa0) — `src/ui/learning.ts:129-135`, `points()` at `:33-35`.
  Solve a task on the first try (2 pts), then click "Gợi ý" → score drops to 1 and is persisted.
  Fix: don't set `hinted` when the task is already correct.
- [x] **Negative declination cannot be typed on iOS** (630e419) — `src/ui/starPanel.ts:54-55` (`inputmode: 'decimal'`).
  iOS decimal keypad has no minus sign, so southern stars (placeholder `−16,7`) can't be entered; `6h45m` RA form also impossible.
  Fix: `inputmode="text"` (or a ± toggle).

## Thấp / Low

- [x] **Corrupted saved progress blanks the app** (1203fa0) — `src/ui/learning.ts:18`.
  `localStorage['thien-cau.hoc-tap.v1'] = 'null'` → `progress[task.id]` throws during `learningDrawer()` at `src/main.ts:27`; nothing renders.
  Fix: validate the parsed value is a plain object.
- [x] **Esc handled before the "typing" check** (dcc6d77) — `src/main.ts:244-246`. Esc in the latitude/RA field deselects the star or closes the drawer.
- [x] **Space toggles play on `<summary>` / links** (dcc6d77) — `src/main.ts:251`. Only `BUTTON` is excluded; keyboard users can't open "Hiển thị" sections.
- [x] **Arrow keys on `role="tab"` step the clock** (dcc6d77) — `src/main.ts:254-259`. Tabs lack their own arrow-key handling.
- [x] **Focus lost when the learning drawer closes** (1203fa0, f4f0be7) — `src/ui/learning.ts:169-174`. Return focus to the "Học tập" button.
- [x] **Raw i18n key at the poles** (bb1bab2) — `src/ui/infoCard.ts:178,180` with `src/astro/visibility.ts:69`.
  At |φ| = 90 a δ = 0 star is "rise/set" but its rise azimuth is NaN → shows `A = —° (compass.undefined)`.
- [ ] **Hover tooltip ignores Earth occlusion** — `src/scene/view.ts:208-215`, `src/scene/celestialSphere.ts:116-118`. Hovering Earth names a sky line behind it.
- [ ] **Selection ring draws through Earth** — `src/scene/skyLayer.ts:188` (`depthTest: false`).
- [ ] **Horizon ring half-hidden by the ground disc** — `src/scene/horizonDiagram.ts:150-153` vs `src/scene/horizonLayer.ts:171`. Lift ring ~0.01 or disable depth test.
- [x] **devicePixelRatio read only once** (906399a) — `src/scene/view.ts:51,73`. Moving to a 2× screen leaves the canvas blurry and star sizes wrong.
- [x] **Per-frame allocations in label occlusion** (5fcc197) — `src/scene/celestialSphere.ts:109,112` (`clone()` / `new Vector3`); also `hoverAt` rebuilding targets, `src/scene/horizonDiagram.ts:203,216,219`.

## Phản biện thiết kế (deferred) / Design objections deferred

- [ ] **Offline use for club sessions** (spec K3). Add a service worker that precaches the hashed assets, star data and constellation data; test with the network off; plan cache invalidation for GitHub Pages deploys.
- [x] **Thicker lines in presentation mode** (spec K7). Add `View.setLineScale(k)` that scales `LineMaterial.linewidth` and label size when `body.present` is on. Done in a597273 (lines ×2, scene labels ×1,8, emphasis composes with the scale).

## Kho mã / Repository

- [x] Delete unused 624 KB `src/whiteUSAC (1).png` (not referenced, not shipped). (c18ce19)
- [x] Main bundle 878 kB (258 kB gzip); `vite.config.ts` raises `chunkSizeWarningLimit` to hide the warning. Split Three.js / lazy-load data. (5c51d6f; entry JS now 64 kB gzip, see `docs/redesign/perf.md`)
- [ ] Use descriptive commit messages (recent history: "f", "y", "d").
