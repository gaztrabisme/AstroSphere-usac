# Audit: redesign-2 (2026-10-05)

- **Scope:** every row of `docs/redesign-2/goal.md`, audited row by row on the final merge `ecaa974` (fix round 2), branch `claude/wonderful-lovelace-7sdyp0`.
- **Pushed to:** `gaztrabisme/AstroSphere-usac`.
- **Checks:** run by the coordinator, on dev `:5190` and preview `:4190` with `?quality=fixed`.

## Result

| ID | Criterion | Result | Evidence |
|---|---|---|---|
| R1 | Club `main` merged, nothing lost | **PASS** | Merge `f485d71`. 17 conflicting files resolved. Kept from club `main`: deep-sky objects, catalog dialog, 88 IAU names, far-side labels, the Usui-chan observer. Kept from this branch: lazy figures, declutter, emphasis. UAT expectations changed only where the new defaults made them stale; each change is listed in the merge commit. |
| R2 | Simple mode by default, one switch to Full, remembered | **PASS** | `uat/modes.mjs` passes 37/37. Design notes: `simple-mode.md`. |
| R3 | Mass Effect–style codex: discovery, term links, "Xem trong mô phỏng" | **PASS** | `uat/codex.mjs` passes 44/44. Unit tests cover triggers, storage and content. 44 entries in 7 categories, each with a visual. |
| R4 | Usui-chan says hello once, then explains only on demand | **PASS** | `uat/guide.mjs` passes 85/85. `guide.test.ts` covers all 51 `data-guide` keys in both directions. |
| R5 | Review-4 items fixed | **PASS** | All four marked `[x]` in `TODO.md` with commit hashes (`fbe876f`, `02c52b6`, `b664219`). |
| R6 | Budgets | **PASS** | Entry JS is **81.88 kB** gzip against a 90 kB limit. JS before the first 3D frame is 255.4 kB. The Usui-chan model, `GLTFLoader`, the codex and the guide all load lazily. `perf.mjs` (a)(b)(c) pass, with 0 `LineGeometry` during playback. |
| R7 | i18n and accessibility | **PASS** | `npm test` passes 165 tests: the banned-word check covers `vi.json` and `codex.vi.json`, and the KaTeX check passes. Esc priority is dialog → hello/explain → drawer → selection, as listed in AGENTS.md and tested in ui and guide. No horizontal scroll at 375 px in modes, codex and guide. |
| R8 | Design-skill review loop | **PASS, with a recorded fail inside** | Two fresh-context reviews, `review-1.md` and `review-2.md`, followed by two fix rounds (`fix-1*.md`, `fix-2.md`). Details below. |

Also passing on the same merge:
- smoke;
- ui 25/25;
- ux 37/37;
- highlight 25/25;
- declutter 21/21;
- `below-horizon.mjs` 30/30.

## R8 in detail: measured, judged, skipped

**Judged** by a fresh-context reviewer:

| Question | Review 1 | Review 2 |
|---|---|---|
| A1 "Does it look good?" | partly | **yes** |
| A2 Does a beginner know the first step? | partly | partly → fixed in round 2 (star invitation in the hello, outlined secondary button) |
| B2 Is Simple uncluttered? | yes | yes |
| C1 Is the mascot not pushy? | partly | yes, with a caveat → fixed in round 2 |
| C2 Is explain mode clear? | yes | yes |
| D1 Does the codex feel like a codex? | partly | partly (items left are in `TODO.md`) |
| E1 Is orange only on interactive elements? | partly | **yes** |
| High-severity problems | 3 | **0** |
| Ready to show the club? | — | **"It is ready to show to the club."** |

**Fixed after review 2** (round 2, not re-reviewed by a fresh reviewer; checked with UATs and coordinator renders in `review-3/`):
- the zenith label behind the view tools;
- the first-visit call to action;
- clutter in the sphere view on the projector;
- the chevron card toggle;
- the codex badge name;
- spacing on phones;
- the clamped below-horizon marker.

**Measured** with the color-theory and visual-design scripts:

| Check | Result |
|---|---|
| T1 focal value, horizon card | **FAIL**: 0.87× (Simple), 0.97× (Full), against the default of 2×. A focal box covering 43–66 % of the frame can reach at most 1.5–2.3×. This is a property of the layout, not of colour. The checklist's large-focal override applies, and both reviewers judged the view dominant in Simple. Recorded in `TODO.md`. |
| T5 chroma, horizon card | Full: PASS. Simple: CHECK, because the calmer ground (fix round 1) made the disc less chromatic, by design. |
| Ground disc chroma | Before: C 0.032, the most chromatic area. After: C 0.020. |
| Balance | 0.016–0.017 diagonal distance, so centred. |
| Text contrast | All sampled text passes WCAG AA (5.6–17:1). |

**Skipped:**
- render-kit, which is not installed.
- Screen-reader testing with real assistive technology.
- Testing with beginners. The value of Simple mode and the guide is an untested assumption; see `TODO.md`.

## Open after this run

All of these are listed in `TODO.md`.

**From review 2:**
- #4: the codex does not yet feel "collectible".
- #5: some teaching text is below a 12 px floor.
- #6: the phone header's reset button.
- #12: the status pill's colour.
- A1: nothing celebrates a star click. This needs an owner decision.

**Other:**
- Random and manual stars use colours that look like semantic colours.
- The T1 layout fail.
- Deferred from redesign-1: offline service worker, Earth-occlusion hover, selection ring, horizon ring.

## Addendum: owner decisions, 2026-10-05/06

The owner reviewed the small open decisions one by one, and all were built on this branch:

| # | Decision | Built in | Evidence |
|---|---|---|---|
| — | Rename Codex to **USACodex**. Only user-facing text changes; code and storage keys stay `codex`. | `22ee749` | Codex 68/68 and ui 25/25 assert the new name. |
| 1 | Quiet reward for selecting a star: the selection ring pulses once, about 300 ms, with no pulse under reduced motion. | `0eaba1c` | `uat/decisions.mjs` passes 60/60. |
| 2 | USACodex "full game feel": category tiles, a card grid of locked/new/read cards, a one-time unlock reveal, "x/44" in the title, and a glow on the badge. | `26ed361`, `4e246f1` | `uat/codex.mjs` passes 68/68. |
| 3 | Ask for confirmation before "Đặt lại". | `ad5a0ff` | decisions, ux |
| 4 | Neutral status pill with a zone-colour dot. | `fc88ae5` | decisions |
| 5 | Explanatory text no smaller than 13 px. | `d244f8b` | decisions, at 1440 and 375 px |
| 6 | User stars drawn in the neutral figure tone. | `4380492` | `userStarColor.test.ts`: ΔE ≥ 0,098 from every semantic colour |
| 7 | Try a focus layout, keep it, and drop the 2× T1 target. | `445f645` and the merge | `uat/focus.mjs` passes 35/35. T1 measured 0,87× against a 1,82× ceiling, recorded as not applicable (see `focus-layout.md`). |
| 8 | Test with beginners: not now. | — | Kept open in `TODO.md`. |

**Coordinator fixes made while merging.**
- **Collapsed data strip:** it no longer repeats φ and pole altitude, which already appear in the horizon caption. It now shows LST and the selected object.
- **Declutter in the shorter focus view with "Số liệu" open:**
  - The pole-altitude label gains two fallback positions, ±45° along the horizon (`MAX_ALTS` raised from 6 to 8).
  - The selected object's name gains two diagonal fallback positions, so it stays visible.
  - These fix a real label collision found by `declutter.mjs`.

**Final suite.** All checks pass on the merge:
- unit tests: `npm test`, 178;
- browser checks: focus 35, decisions 60, codex 68, guide 86, modes 37, below-horizon 30, smoke, ui 25, declutter 21, ux 38, highlight 25, perf (a–c);
- bundle: entry JS 83.22 kB gzip, within the 90 kB budget.

**Not reviewed by a fresh reviewer:** the USACodex grid and unlock, the selection pulse, and the focus layout. They have been checked only by their builders and the coordinator.
