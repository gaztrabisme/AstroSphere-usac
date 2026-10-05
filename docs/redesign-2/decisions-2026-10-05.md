# Owner decisions 2026-10-05: reward and polish

**Branch:** `redesign/reward`, 2026-10-05.
**Acceptance check:** `docs/redesign-2/uat/decisions.mjs` (dev server).
**Skills applied:** `ux` (task flow, interface words, recovery), `motion` (purpose, curve, choreography), `color-theory` (functional colour, OKLab ΔE, WCAG contrast) and `frontend` (native controls, accessibility, rendered verification).

How each check was done:
- **Measured:** browser checks in `decisions.mjs` and the existing UATs, unit tests, OKLab ΔE and WCAG ratios computed with the color-theory formulas.
- **Self-judged:** anything read from a render by me, the author. That is not a fresh-context review.

## 1. Quiet reward when a star is selected (review-2 A1)

**What changed:**
- When the selection changes to an object, the selection ring pulses once in both 3D views.
  - Scale 1 → 1,35 → 1 and opacity 1 → 0,5 → 1 over 300 ms.
  - The rise takes 90 ms and the settle takes 210 ms. Both are cubic ease-out, so the ring never overshoots its rest size and never bounces.
- The trigger is any change of `state.selected` to a non-null object: a click or tap, the search, a learning task, or a manual star being added. Selecting the same star again pulses again, which confirms the click.
- The first sync (the default Polaris selection when the page opens) does not pulse.
- Under `prefers-reduced-motion` the ring does not move.
- There are no popups and no sound.

**How:**
- `src/scene/selPulse.ts` is a pure amplitude function with unit tests (`selPulse.test.ts`): one peak, values stay in [0, 1], monotonic on each side, and the settle slows as it arrives.
- `SkyLayer.startSelPulse(now)` and `stepSelPulse(now)` write the sprite's scale and material opacity. There is no allocation and no new geometry.
- `View.update()` starts the pulse when the selection reference changes. `View.frame()` steps it and marks the view dirty only while it runs, just as the emphasis transition does.
- Label placement keeps using the ring's rest size, so names do not jitter during the pulse.
- **Measured:** with playback paused, the pulse rendered for about 300 ms. In the 500 ms after it, the loop rendered 0 frames, so a paused loop goes back to sleep.

**Lessons applied:**
- *Movement serves the message* (motion, 503 · U3 · L10 · 01:21–02:42). The pulse says "this one is selected" and nothing else. It is the ring that marks the selection, and nothing else in the scene moves.
- *A strong deformation or bounce makes a serious subject read as comic* (motion, 561 · U4 · L13 · 02:47–05:54). So the settle is ease-out with no overshoot, and the change is small (×1,35).
- *Ease to show acceleration and arrival* (motion, 503 · U2 · L08 · 06:22–09:12). The fast rise reads as a response to the click, and the slow settle reads as calm.
- *Honour user motion preferences* (frontend, accessibility). Under reduced motion there is no pulse, and the selection still shows through the ring and the info card.
- *Not pushy* (owner rule). The feedback is a quiet acknowledgement, not a celebration: there is no text, no counter and no sound.

**Left out:** below the horizon the horizon view draws the selection as the "ghost" marker (fix-1 #2), not the ring. The ghost does not pulse. The sphere view still pulses for such objects.
