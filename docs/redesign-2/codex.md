# Codex (redesign-2 stream C, goal row R3)

**Status:** built on branch `redesign/codex`. **UAT:** `docs/redesign-2/uat/codex.mjs`. **Unit tests:** `src/codex/codex.test.ts`.

## What the owner asked for (2026-10-05)

- A codex "like Mass Effect where all these get explained".
- Every entry is always readable. Entries you meet in the simulation are marked discovered. Discovered entries you have not read yet are marked new, with a progress count.
- Every term in the app links to its entry.
- Not pushy: no popups, no toasts that steal focus. A quiet count on the Codex button is fine.

## What was built

| Part | File | Loads |
|---|---|---|
| Discovery rules, progress storage, Codex button with badge, `openCodex(id?)`, `termLink()` | `src/codex/triggers.ts` | entry chunk (about 2.5 kB gzip, total entry 76.0 kB of 90 kB) |
| Dialog UI | `src/codex/ui.ts` | lazy, on first open |
| "Xem trong mô phỏng" actions | `src/codex/sim.ts` | lazy |
| SVG diagrams | `src/codex/diagrams.ts` | lazy |
| Content: 7 categories, 44 entries | `src/i18n/codex.vi.json` | lazy (inside the codex chunk, 17.4 kB gzip) |
| Interface strings | `src/i18n/vi.json` → `codexUi` | entry |
| Styles | `src/styles.css`, last section `/* ===== Codex (redesign-2 C) ===== */` | entry CSS |

### Entries per category

| Category | Entries |
|---|---|
| Nền tảng | 7: thiên cầu, chân trời, thiên đỉnh/thiên để, thiên cực, xích đạo trời, kinh tuyến, chuyển động nhật động |
| Hệ tọa độ | 7: hệ chân trời, hệ xích đạo, điểm xuân phân γ, góc giờ H, LST/GST, độ cao thiên cực = vĩ độ, góc xích đạo – chân trời |
| Mọc – lặn | 5: sao cận cực, mọc và lặn, không bao giờ mọc, qua kinh tuyến, thời gian trên chân trời |
| Mở rộng | 4: hoàng đạo, Mặt Trời và mùa, ngày thiên văn, Ngân Hà |
| Sao sáng | 10: cấp sao, màu sao (B − V), Polaris, Sirius, Canopus, Vega, Betelgeuse, Rigel, Antares, Sun |
| Chòm sao | 7: chòm sao (88 IAU), Ursa Major, Ursa Minor, Cassiopeia, Orion, Scorpius, Crux |
| Thiên thể sâu | 4: thiên thể sâu (Messier, NGC), M31, M42, M45 |

### Discovery rules (`discover(s, prev, add)`)

The rules run in `store.subscribe`, but only when a relevant slice changes reference. During playback only `gst` changes, so the function returns without allocating.

| Trigger | Discovers |
|---|---|
| First visit (nothing stored) | `sphere`, `horizon`, `polaris`: what a newcomer already sees (the sky dome, the horizon, the preselected Polaris) |
| Selecting any object | `radec`, `altaz`, `hourAngle`, and its zone at the current latitude (`circumpolar` / `riseSetZone` / `neverRise`) |
| Selecting a catalog star | `magnitude`; `starColor` if B − V < 0 or > 1,3; its own entry (7 named stars); its constellation's entry |
| Selecting a constellation star | `magnitude`; its own entry and constellation entry if any |
| Selecting a deep-sky object | `deepSky`; `m31` / `m42` / `m45` |
| Selecting the Sun | `sun` |
| A display toggle switched **on** | its concept: ecliptic → `ecliptic`, zones → zone entries, galactic → `milkyWay`, sun → `seasons`, deepSky → `deepSky`, … (`TOGGLE_ENTRY`) |
| Latitude changes | `latPole`, plus the selected object's zone |
| Longitude changes, or time moved while paused | `lst` |
| Playback starts, or trails switched on | `diurnal` |
| Mode "1 ngày thiên văn" | `siderealDay` |
| Sun date changes | `seasons` |
| A constellation template is added | its entry (or `constellations`) |
| Hovering or focusing a linked number (`emphasis`) | pole → `latPole`, incl → `eqAngle`, meridian → `lst` and `transit`, A/h → `altaz` |

Opening an entry marks it **read**. The badge counts discovered-but-unread entries. Reading an undiscovered entry does not discover it: discovery means meeting it in the simulation.

## Design decisions, with the lessons applied

### Information architecture (ux)

- **Categories follow the concept order the app already teaches.** The order is: the sky turns, your horizon, two coordinate systems, rising and setting, extensions. It is the same order as the display groups and `help.body`. Objects come last. *ux, Stage 5: organize and label content so people can find it, considering context, content and users together (1490 · U6 · L21).*
- **The 17 objects were split into three categories, each opened by its concept entry.** "Sao sáng" opens with cấp sao and màu sao, "Chòm sao" with chòm sao, and "Thiên thể sâu" with thiên thể sâu. A list of 17 mixed objects is hard to scan; concept-then-examples matches how a 16-year-old builds the idea. *Same lesson, plus check findability in the sitemap (1490 · U6 · L22).*
- **The whole route is covered, not one screen.** The design maps every entry point to the dialog and back:
  - the top-bar button;
  - a "?" next to a term;
  - a related link.
  - It also maps the exit back into the simulation: "Xem trong mô phỏng" closes the codex and applies the change.
  - *ux, Stage 5: consider where someone came from and where the product sends them next (798 · U2 · L05).*

### Writing (ux)

- **Each entry starts with a one-line lede.** It holds the important information in its opening words. The body then splits into 2–4 short paragraphs and a formula card. *ux, Stage 7: put important information in headings and opening words, and split dense copy (798 · U3 · L08).*
- **The action label says what will happen.** The button is "Xem trong mô phỏng". Under it is the concrete effect, for example "Bật hoàng đạo." or "Thêm chòm Orion và chọn Betelgeuse." *ux, Stage 7: a short active label that names the action that will actually happen (798 · U4 · L12).*
- **An undiscovered entry is not an error and not a lock.** Its page says: "Chưa khám phá — bạn vẫn đọc được. Mục này sẽ được đánh dấu khi bạn gặp nó trong mô phỏng." It explains the state, what will change, and that nothing is blocked. *ux, Stage 7: empty and status states say where you are, why, and what comes next (798 · U4 · L11).*
- **Terminology is reused, not reinvented.** The codex uses the words already in `vi.json`: `help.body`, `toggleTip`, `tip.*`, `info.*`. Examples are "xích kinh α", "độ cao thiên cực", "vùng cận cực", and B/Đ/N/T. Object names stay in English, with the Vietnamese name in the `aka` line. *ux principle 7: domain and project conventions govern.*

### Composition and typography (visual-design)

- **One dominant element per screen.** In the reading pane that element is the entry title (26 px bold). The lede (17 px) comes second. The body (15 px, line-height 1.6) and the muted meta lines are tertiary. The list is quieter than the page. *visual-design principle 4: a dominant element, then subordinate elements; competing "number ones" make a message unclear (5642 · U4 · L55).*
- **The codex feel comes from typography and structure, not ornament.** Category labels are small uppercase with 0,09 em tracking. A thin rule sits under each category label and between the lede and the body. The reading width is held at 65ch. There is no texture, glow or sci-fi chrome. *visual-design anti-pattern: filling space with decoration that does not support the concept; type-and-system: adjust size, tracking and leading at the actual output size (5642 · U2 · L14).*
- **The system has named constants.** Orange (`--accent`) appears only on:
  - the selected entry (left bar plus a tint);
  - the "new" dot and label;
  - the progress fill;
  - the primary action, with `--on-accent` text;
  - the badge.
  - Everything else uses the existing grey surface tokens. *type-and-system: name the fixed elements and the permitted variables (5642 · U6 · L86–L87).*
- **The hardest application is the 375 px phone.** There the dialog is full screen and works as list then entry, with a "‹ Danh mục" back button. Every row and link is 44 px tall. The UAT measures no horizontal scroll. *visual-design principle 6: build the system for its hardest application.*
- **Undiscovered entries use dimmer text and a hollow marker.** Discovered entries have a filled grey dot. New entries have an orange dot with a halo and the word "MỚI". So the state does not depend on colour alone.

### Diagrams (information-design)

- Five small SVG diagrams appear on seven entries:
  - pole altitude = φ;
  - horizon coordinates (A, h);
  - equatorial coordinates (α, δ);
  - the three rise/set zones (shared by three entries);
  - the ecliptic against the equator.
- **Every mark has one explicit role and the scene's colour.** The axis is blue, the equator yellow, A cyan, h pink, the zones purple/teal/red, and the ecliptic orange dashed. A student who learns a colour in the codex sees the same meaning in the 3D view. *information-design principle 4: give every mark an explicit data role.* The colour meanings come from `scene/colors.ts`, which owns them.
- **The explanation sits next to the mark.** Labels such as "h = 21,03°", "A", "δ", "ε = 23,44°" and the zone names sit on or beside their mark. The `<figcaption>` is a full sentence key, and it also serves as the SVG's accessible name. *information-design principle 5: write the key for the reader, in the order marks are met (2495 · U4 · L15; 4217 · U4 · L17).*
- **The diagrams use live data where it teaches.** The pole-altitude and zone diagrams are drawn at the latitude currently selected in the simulation, so the codex and the sim show the same numbers.

### Implementation (frontend)

- **Native semantics.**
  - The codex is a modal `<dialog>`. That gives a focus trap and lets Esc close the codex first: main's key handler skips while `isCodexOpen()`.
  - Focus returns to the opener when the dialog closes.
  - The list is a `nav` of `ul` lists of buttons, with `aria-current` on the open entry.
  - The page is an `article` labelled by its title.
  - Opening from a "?" link moves focus to the entry title.
  - *frontend principle 2: prefer native semantics and controls.*
- **Term links.**
  - Each term link is a real `<button>`. Its accessible name, "Giải thích trong Codex: …", comes from visually hidden text, not `aria-label`, so the checkbox label stays the only element labelled "Kinh tuyến thiên cầu".
  - The visible mark is a 16 px "?". On phones a pseudo-element widens the hit area to 44 px.
  - The last word of the label and the "?" are kept on one line.
  - The links sit inside the existing `data-emphasis` rows and cells without replacing them. The linked-highlight hover still works, and the UAT checks it.
- **Performance budget.**
  - The content, the UI, the diagrams and KaTeX load only on first open.
  - The eager part is the rules table plus about 20 lines of DOM.
  - Nothing runs per frame.
  - *frontend principle 4.*
- **Reduced motion.** The codex has no animation. The global `prefers-reduced-motion` rule covers any hover transitions.

## Changes to shared files (all minimal and commented "Codex (redesign-2 C)")

| File | Change |
|---|---|
| `src/main.ts` | One import; `codexButton(store, actions)` in the top bar before Trợ giúp; `isCodexOpen()` in the Esc guard |
| `src/ui/infoCard.ts` | "?" next to α, δ, H, A, h and Trạng thái (status points at the current zone's entry); "?" next to φ, pole altitude, equator angle, LST and GST in the data bar |
| `src/ui/locationPanel.ts` | The pole line is wrapped in `.pole-row` with a "?" to `latPole` |
| `src/ui/displayPanel.ts` | Every concept toggle row gets a trailing "?" (`.check-row`) |
| `src/ui/dialogs.ts` | `renderLines` and `renderMath` are exported for reuse |
| `src/scenario.ts` | New shared helpers `selectCatalogHip`, `selectDso` |
| `src/styles.css` | One section at the end. At ≤ 480 px it also hides the "Ôn tập" icon and tightens top-bar gaps, because one more 44 px button otherwise broke the short app name into four lines |
| `src/i18n/vi.json` | New `codexUi` block |
| `AGENTS.md` | i18n section (the second locale file) and the storage table (`astrosphere.codex.v1`) |
| `docs/redesign/uat/ui.mjs` | The expected top-bar order now includes "Codex" before "Trợ giúp". This is a legitimate change caused by the feature |

## Review state

- **Measured (2026-10-05):**
  - `npm test`: 129 tests pass, 23 of them new in `src/codex/codex.test.ts`.
  - `npm run build`: passes.
  - Bundle: entry JS is 76,0 kB gzip, up from 73,4 kB; the budget is 90 kB.
  - `uat/codex.mjs`: 32/32 checks pass.
  - The existing UATs pass: smoke, ui 25/25, ux 37/37, highlight 25/25, and perf (a)–(c).
  - Under machine load (load average about 8, with parallel agents), single runs of the ux check "(i) Esc folds the card" and the highlight check "reverse hover of the pole axis" failed once each. Both passed on rerun. Both use fixed waits or pointer hit-tests. The highlight check failed the same way on the unmodified base during the investigation.
  - In the dev server, KaTeX font requests 403 inside a git worktree, because `node_modules` is a symlink outside Vite's `fs.allow`. This is an environment issue, not a product issue. The UAT was run with a local config that allows that path.
- **Vision:** the author read and fixed the screenshots `shots/codex-1440.png` and `shots/codex-375.png` and per-diagram crops. Fixes made after reading them:
  - label collisions in four diagrams;
  - a "?" orphaned on its own line;
  - the phone top bar.
- **Not judged:** no fresh-context reviewer has looked at the codex yet. That belongs to the coordinator's R8 review loop.
