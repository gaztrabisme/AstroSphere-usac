# Design review round 2 (2026-10-04)

Reviewed by a new fresh-context agent that saw neither round 1 nor the brief. It used the renders in `review-2/` and the same questions as round 1.

## Measured

| Check | Round 1 | Round 2 |
|---|---|---|
| color-theory T1 value focal (horizon card) | 0.76× (FAIL) | 0.81× (**FAIL**, default ≥ 2×) |
| color-theory T5 chroma focal | PASS | PASS (focal C 0.035 vs ring 0.007) |
| Contrast: captions / star labels / Orion | ~10 px grey, low | 8.13–8.79:1 / 13.43:1 on sky (5.26:1 on ground) / 9.99:1 |
| declutter.mjs (no label overlap > 2 px, none clipped) | n/a | PASS (17) |
| render-kit | skipped | skipped (not installed) |

## Vision-judged: change from round 1

| Question | Round 1 | Round 2 | Remaining issue |
|---|---|---|---|
| A2 first idea | partly | partly | The φ = pole-altitude sentence has the same weight as the gesture hint |
| B2/B3 one focal, path | no | **no** | The info card and the numbers strip compete; the path stalls in the info card |
| B4 phone first view | no | yes, with caveats | A collapsed info card takes space |
| C1 grouping | yes | yes | |
| C2 crowding | no | **no** (less) | The info card is dense; the "Kinh độ" caption wraps to 3 lines; card heights are uneven |
| D2 collisions | no | **no** (less) | Label-on-label overlaps are gone. Labels still sit on top of lines and textures with no halo. The info card is clipped. Spelling is inconsistent ("toạ" vs "tọa") |
| E2 captions | mixed | helpful, borderline cluttered | |
| E3 pushy | no | **yes (not pushy)** | |
| F2 link obvious | no | partly | The wedge is still thin, and the change is far from the cursor |
| G1 accent discipline | no | **yes** | |
| G2 colour confusion | no | minor | The amber "A =" label reads close to the equator yellow |
| H1 projector | no | **no** (better) | Desktop-size chrome remains (info card about 13 px, subtitles, legend); faint lines |
