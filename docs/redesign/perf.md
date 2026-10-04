# Hiệu năng — trước và sau thiết kế lại

Every size is gzip at zlib's default level, the same as Vite's report. "Entry JS" means everything `dist/index.html` loads up front, through `<script>` and `modulepreload`.

## Trước (baseline, commit `3e5689e`, 2026-10-04)

| Chunk | Raw | Gzip |
|---|---|---|
| `index-*.js` (entry: app + three.js + data) | 878.15 kB | 257.81 kB |
| `katex-*.js` (lazy, help dialog only) | 259.28 kB | 77.76 kB |

| Metric | Value |
|---|---|
| (1) Entry JS | 257.81 kB |
| (2) JS before the first 3D frame | 257.81 kB |
| (3) Total JS, excluding KaTeX | 257.81 kB |

Runtime problems found in the review (see `TODO.md`):

- The hidden view on mobile keeps rendering every frame.
- During playback, each frame rebuilds 3 `LineGeometry` objects per view.
- Every render walks the whole scene to update labels.
- The DOM panels are written every frame.

## Sau wave 0 (khung tải động `scene/boot`)

| Chunk | Gzip |
|---|---|
| `index-*.js` (entry, without three.js) | 101.66 kB |
| `boot-*.js` (three.js + scene, loaded dynamically and in parallel) | 157.37 kB |

## Sau (điền ở wave 2)
