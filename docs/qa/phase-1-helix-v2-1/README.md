# Phase 1 — Helix Canopy v2.1

Status: implemented and technically accepted on 2026-08-05. The final subjective play-feel review remains a human gate.

## Decision

Helix was rebuilt as a versioned gameplay-first master instead of placing increasingly small collision rectangles over the previous irregular foliage. The new version deliberately preserves the original orbital biodome, blue/red team platforms, palette, symmetry, and central DNA identity while simplifying the playable court.

The production result has:

- five mirrored rectangular planter groups (ten interior planters total), each with one simple collision footprint;
- three broad readable routes across the north, middle, and south of the court;
- a luminous DNA helix visibly sealed below walkable glass;
- collision only on the visibly raised north/south helix terminals, not on the DNA floor strip;
- spawn, flag/base, route, and diagnostic coordinates aligned to the illustrated team platforms;
- a closed collision mask around the complete decorative dome edge.

The original asset remains available at `public/assets/helix-canopy/arena-master.png`. Runtime now uses `public/assets/helix-canopy/arena-master-v2.png`; Quick Play uses the matching undistorted `public/assets/map-previews/helix-canopy-v2-1-overview.png`.

## Visual iteration and provenance

- [User collision intent](intent-reference-user.jpg) — the supplied reference sketch.
- [Candidate 01](candidate-01-clearer-but-dense.png) — clearer shapes, but still too dense; rejected.
- [Candidate 02](candidate-02-selected-open.png) — fewer and smaller planters; selected as the production master.

The bitmap was produced with the built-in ImageGen editor in two controlled passes:

1. Precise-object edit of the original Helix master, preserving its dome, bases, palette, camera, and symmetry; replace irregular playable foliage with clean rectangular/chamfered planters; open three broad routes; render the DNA as a flat luminous motif below continuous walkable glass; add no actors, UI, labels, pickups, or collision markings.
2. Precise-object density correction of candidate 01: remove the isolated vertical planter closest to each base, shrink all remaining planters by about 15%, preserve five planters per half and bilateral symmetry, and keep the dome, bases, floor, under-glass DNA, and all non-planter pixels unchanged.

No generated image replaced the original source file. Both the rejected and selected generations are retained here for review history.

## Collision contract

Interior collision is authored in native master-image pixels and transformed through the same scale and horizontal offset as the rendered master. This avoids maintaining unrelated visual and gameplay coordinate systems.

- Previous Helix geometry: 50 rectangular solids.
- Helix v2.1: 32 rectangular solids, including the closed outer dome mask.
- Interior planters: ten solids, one foliage-core rectangle per visible planter.
- Helix: two terminal solids; the complete glass DNA lane between them is walkable.
- Actor-radius expansion is shown as translucent red in the collision diagnostics; cyan is the unexpanded authored rectangle.

## Verification

| Gate | Result |
| --- | --- |
| Unit, structural, navigation, simulation, and regression tests | 200/200 passed |
| TypeScript test typecheck | Passed |
| Production build | Passed |
| Premium-arena Playwright E2E | 3/3 passed |
| Browser capture diagnostics | 8/8 captures, zero console errors, page errors, or failed requests |
| Collision/image visual inspection | Planter footprints and terminals aligned; DNA glass lane clear; bases aligned |

Vite still reports the pre-existing warning that the Phaser production chunk is larger than 500 kB. It does not fail the build and is unrelated to the Helix redesign.

## Screenshot matrix

| View | Evidence |
| --- | --- |
| Clean overview | [1280×720](screenshots/overview-1280x720.jpg) · [1920×1080](screenshots/overview-1920x1080.jpg) |
| Full-map diagnostics | [Collision](screenshots/collision-full-map-1280x720.jpg) · [Clearance](screenshots/clearance-full-map-1280x720.jpg) |
| Live gameplay | [1024×768](screenshots/gameplay-1024x768.jpg) · [1280×720](screenshots/gameplay-1280x720.jpg) · [1920×1080](screenshots/gameplay-1920x1080.jpg) |
| Live collision overlay | [1280×720](screenshots/collision-gameplay-1280x720.jpg) |

Hashes, exact URLs, capture policy, and browser diagnostics are recorded in [manifest.json](manifest.json). Reproduce the set after `npm run build` and `npm run preview -- --host 127.0.0.1 --port 5188` with:

```powershell
node scripts/capture-phase-1-helix.mjs docs/qa/phase-1-helix-v2-1
```

## Review notes

- The empty band in the HUD-free 1280×720 overview is camera letterboxing: the arena world is 2:1 while the viewport is 16:9. It is not a blocked or missing gameplay area.
- Diagnostic labels intentionally overlap at full-map scale; the red fill and cyan outlines remain the source of truth. Improving label layout belongs to the debug tooling, not the arena.
- The compact 1024×768 gameplay view follows the player and therefore shows only the relevant half of the wide arena. The 1920×1080 view demonstrates the complete symmetrical layout.
- The technical gates prove clearance, route connectivity, loading, and deterministic bot operation. The next decision should come from a short human playtest focused on perceived density, route choice, and whether the DNA reads immediately as walkable.
