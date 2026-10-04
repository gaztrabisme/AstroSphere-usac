# Goal — 2026-10-04 — redesign-2026-10-04

**Status:** DRAFT — not an active stop condition until the requester approves the Plan Block.
**Decision owner:** requester (repo owner). **Audited by:** coordinator at Close.

## Deliverable — redesigned AstroSphere on branch `claude/wonderful-lovelace-7sdyp0`

| ID | Source | Success criterion | Evidence | UAT |
|---|---|---|---|---|
| G1 | README criteria 1–7 | Existing behaviour preserved | test run | `npm test` exits 0 |
| G2 | build | Type-check and build succeed | `dist/` | `npm run build` exits 0 |
| G3 | request: brand | UI accent is the club orange; the old blue accent is gone from the UI | `src/styles.css` | `grep -ci f26522 src/styles.css` ≥ 1 and `grep -c 4f9dff src/styles.css` = 0 |
| G4 | request: storytelling | A first-time visitor sees a guided story covering the brief's 3 learning goals in order; a returning visitor lands straight in exploration | Playwright script `docs/redesign/uat/story.spec` | the script passes on a fresh context and on a context with the "seen" flag set |
| G5 | request: efficiency | Initial-load JS (gzip) is ≥ 30% smaller than baseline 258 kB, **or** (fork D6 branch B) the shortfall is reported with its cause | `docs/redesign/perf.md` before/after table | the build output's gzip numbers match the table |
| G6 | request: efficiency | No geometry allocation per frame while playing | perf note plus code | Playwright counts `LineGeometry` constructions over 120 frames of playback = 0 after warm-up |
| G7 | UX | Usable at 375×812 with no horizontal scroll; both views reachable | screenshots `docs/redesign/shots/` | Playwright: `scrollWidth <= innerWidth` at 375 px; screenshot files exist |
| G8 | TODO | Review items in scope of the redesign are marked `[x]` with a commit reference | `TODO.md` | grep for `[x]` lines cites commits that exist (`git cat-file -e`) |
| G9 | persona contest | Every persona objection has a disposition (fixed / deferred with reason) | `docs/redesign/spec.md` §Objections | every row has a non-empty disposition |

## Working pattern
- Claude Agent tool only (no external lanes in this container).
- At most 8 agents.
- The coordinator runs every UAT itself.

## Amendments
(none)

## Branch resolutions (before dispatch)
(pending go)
