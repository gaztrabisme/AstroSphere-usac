# Đặc tả thiết kế lại — AstroSphere

Run `redesign-2026-10-04`. Sources: `grounded.md`, `goal.md`, and the approved plan.

## Ai dùng và dùng ở đâu (requester answers, 2026-10-04)

- **Two settings.**
  - Students alone on a phone: the story is designed phone-first, as a single column.
  - Club presenters projecting in a session: free exploration is designed desktop/projector-first, with large views and readable labels.
- **First visit.** A hero screen offers two choices, "Bắt đầu hành trình" (guided story) and "Khám phá tự do" (free exploration). Returning visitors skip straight to exploration.
- **Club identity.** This is a standalone tool with a club signature: the logo, the slogan "khoa học cho mọi người", and exactly one link back to https://web-usac.vercel.app/.
- **Low-end machines.** Quality drops automatically when frames are slow. A short notice appears, with a button to restore full quality.

## Hệ thống thị giác (tokens)

- **Brand.** Orange `#F26522` is the only UI accent, on near-black and white, with Arial (no web font).
- **Scene colours are unchanged.** The 3D scene keeps its meaning-carrying colours (equator yellow, axis blue, three zone colours).

| Token | Value | Use / contrast |
|---|---|---|
| `--accent` | `#F26522` | Primary buttons, tab underline, focus. 6.28:1 on `--bg` |
| `--accent-hi` | `#FF8A4C` | Hover, links on dark |
| `--on-accent` | `#0a0a0a` | Text on orange. White on orange is only 3.15:1, so it is forbidden |
| `--bg` / `--surface` / `-2` / `-3` | `#0a0a0a` / `#141414` / `#1c1c1c` / `#242424` | |
| `--border` / `--border-control` | `#2e2e2e` / `#707070` | Separators / control outlines (≥ 3:1) |
| `--text` / `--muted` / `--subtle` | `#f2f2f2` / `#b3b3b3` / `#8c8c8c` | Smallest allowed: 4.62:1 |
| `--focus` | 2px `--bg` ring inside a 4px `--accent-hi` ring | Not yellow, because yellow means the equator |
| radius / spacing / tap | 6·10·16·999 / 4–32 / 44px | |

## Bố cục

- **Phone (≤ 900 px)**
  - Top bar shows icons only.
  - Tabs switch between the two views, and panels are tabbed and collapsible.
  - In story mode (`body.story-open`) the panels, data bar and legend are hidden. The step card is a bottom sheet (≤ 46dvh, collapsible), and the view fills the remaining height (`--sheet-h`).
- **Desktop**
  - Two views side by side, four panels below.
  - The story opens as a right-side drawer, like "Ôn tập". Only one drawer can be open at a time.
- **Projector (≥ 1600 px):** base text 15 px and larger data figures.
- **Top bar:** Câu chuyện · Ôn tập · Đặt lại · Trợ giúp · Giới thiệu.
- **Footer:** club signature, slogan, email, and the single club link.

## Màn hình mở đầu (hero)

- **Content:**
  - Logo, the kicker "CLB Thiên văn USAC", a headline, and a one-line lead.
  - Primary button "Bắt đầu hành trình", with the subline "3 chương ngắn · khoảng 10 phút".
  - Secondary button "Khám phá tự do".
  - The slogan.
- **Behaviour:**
  - The background is a static CSS starfield.
  - It is a dialog: focus lands on the primary button, and Esc means "explore freely".
  - `?intro=1` forces the hero; `?explore=1` skips it.
  - Choosing either option sets `astrosphere.seen.v1`.

## Kịch bản câu chuyện

Each step sets up the simulator, says what to notice, and shows live readouts. Some steps add "Thử" chips that change the setup.

### Chương 1 — Vì sao bầu trời quay?

1. **A night in Hà Nội.** Horizon view. Polaris (HIP 11767) sits low in the North, about 21° up, while Orion is high in the South.
2. **The sky turns.** Long trails. Every star circles one point near Polaris, rising in the East and setting in the West. One turn takes 23h 56m 04s.
3. **It is really the Earth turning.** Sphere view with the pole axis, celestial equator and horizon. The Earth spins west to east, so the sky appears to turn east to west.
4. **Pole altitude equals latitude.** `poleAltitude` is on. The celestial north pole is 21.03° up, which is exactly φ.
5. **Try another latitude.** Chips: Hà Nội, TP.HCM, 0°, 90°, Sydney.
6. **Quiz.** At Huế (φ ≈ 16.5° N), how high is the pole? Answer: 16.5°.

### Chương 2 — Hai hệ tọa độ

1. **Azimuth A and altitude h.** Betelgeuse (HIP 27989) with the vertical circle and the alt-az grid.
2. **Right ascension α and declination δ.** The equatorial grid and the 0h hour circle.
3. **While the sky turns.** Both grids on with live readouts: α and δ stay fixed while A, h and H change.
4. **H = LST − α.** The meridian is on. Chips: −2h, +2h, "move to the meridian". When H = 0 the star is at its highest.
5. **Same star, different place.** α and δ stay the same; A and h change.
6. **Quiz.** Which value stays the same as the sky turns? Answer: δ.

### Chương 3 — Mọc – lặn và sao cận cực

1. **Three zones.** Purple: never sets (δ > 68.97° at Hà Nội). Teal: rises and sets. Red: never rises.
2. **Seen from the ground.** Underside view with trails.
3. **At the equator.** No circumpolar stars; every star is up for 12 sidereal hours.
4. **At the North Pole.** Every star with δ > 0 is always up.
5. **The Southern Cross from Việt Nam.** Gacrux (HIP 61084) with chips TP.HCM, Hà Nội, Sydney. From Sydney it never sets.
6. **Wrap-up and quiz.** At φ = 40°, a star with δ = +60° is circumpolar. Then three next steps: "Ôn tập 12 nhiệm vụ", "Tự khám phá tiếp", "Xem lại".

### Áp dụng một bước

- **Order:** pause → location → constellations → toggles (base + preset) → LST → selected star → trails (then reset them) → view → motion.
- **Reduced motion:** advance by a fixed angle and draw static trails instead of autoplaying.
- **Exit:** leaving the story restores the snapshot taken when it opened. "Tự khám phá tiếp" keeps the current scene.

## Hiệu năng (xem `perf.md`)

- **Code splitting:** three.js and the scene load through `import('./scene/boot')`.
- **Lazy data:** land outlines and the 88 constellation figures load on demand.
- **No wasted rendering:** a hidden, off-screen or background view does not render, and playback creates no new line geometry.
- **DOM updates:** throttled to about 12.5 Hz, and only cells whose value changed are written.
- **Adaptive quality:**
  - Level 1: pixel ratio 1.
  - Level 2: only stars brighter than magnitude 4.0.

## Phản biện (persona) — objections and how each is handled

| # | Persona | Objection | Severity | Disposition |
|---|---|---|---|---|
