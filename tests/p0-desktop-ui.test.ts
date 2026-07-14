import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateArenaFitZoom } from "../src/adapters/phaser/arenaCameraFit";
import { GRAND_ARCHIVE_V2, TRAINING_CROSSING_V2 } from "../src/core";

test("desktop camera fit prevents short maps from exposing empty canvas bands", () => {
  for (const map of [TRAINING_CROSSING_V2, GRAND_ARCHIVE_V2]) {
    const zoom = calculateArenaFitZoom(1920, 1080, map.geometry.bounds, 1);
    const worldHeight = map.geometry.bounds.maxY - map.geometry.bounds.minY;
    assert.ok(worldHeight * zoom >= 1080);
    assert.ok(zoom >= 1);
  }
  assert.equal(
    calculateArenaFitZoom(1366, 768, TRAINING_CROSSING_V2.geometry.bounds, 1),
    1,
  );
});

test("desktop P0 UI contract keeps Career primary and Quick Play CTA pinned", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const baseCss = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const desktopCss = readFileSync(
    new URL("../src/styles/p0-desktop.css", import.meta.url),
    "utf8",
  );
  const polishCss = readFileSync(
    new URL("../src/styles/p1-visual-polish.css", import.meta.url),
    "utf8",
  );
  assert.match(html, /id="v2-menu-league" class="v2-home-action v2-home-action-primary"/);
  assert.doesNotMatch(baseCss, /#v2-menu-play,\s*\n#v2-menu-start/);
  assert.match(desktopCss, /\.v2-setup-view \.v2-menu-actions[\s\S]*border-top/);
  assert.match(desktopCss, /#v2-pause-overlay \.v2-flow-card/);
  assert.match(desktopCss, /\.league-cosmetic-contract/);
  assert.match(desktopCss, /:focus-visible/);
  assert.match(polishCss, /@media \(min-width: 901px\) and \(max-height: 800px\)/);
  assert.match(polishCss, /grid-template-areas:[\s\S]*"next"[\s\S]*"squad"[\s\S]*"table"/);
  assert.match(polishCss, /prefers-reduced-motion/);
  assert.match(html, /id="v2-menu-mode-picker"[\s\S]*role="radiogroup"/);
  assert.equal((html.match(/class="v2-quick-mode-option"/g) ?? []).length, 3);
  assert.match(polishCss, /\.v2-quick-mode-picker/);
  assert.match(polishCss, /\.v2-quick-mode-option\.is-selected/);
});

test("project typography uses central UI, display, and diagnostic font tokens", () => {
  const baseCss = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const polishCss = readFileSync(
    new URL("../src/styles/p1-visual-polish.css", import.meta.url),
    "utf8",
  );
  const typography = readFileSync(
    new URL("../src/uiTypography.ts", import.meta.url),
    "utf8",
  );
  const phaserTypographySources = [
    "../src/scenes/ArenaScene.ts",
    "../src/adapters/phaser/PhaserArenaActorRenderer.ts",
    "../src/adapters/phaser/PhaserArenaPickupRenderer.ts",
    "../src/adapters/phaser/PhaserArenaHudPort.ts",
    "../src/adapters/phaser/PhaserDiagnosticInputAdapter.ts",
    "../src/adapters/phaser/PhaserDiagnosticRendererPort.ts",
    "../src/adapters/phaser/PhaserBotTraversalSmokeOverlay.ts",
    "../src/adapters/phaser/PhaserMobileInputAdapter.ts",
    "../src/adapters/phaser/PhaserWeaponEffectsPort.ts",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  assert.match(baseCss, /--font-ui:/);
  assert.match(baseCss, /--font-display:/);
  assert.match(baseCss, /--font-mono:/);
  assert.match(baseCss, /font-family: var\(--font-ui\)/);
  assert.doesNotMatch(polishCss, /--font-ui:/);
  assert.match(typography, /export const UI_FONT_FAMILY/);
  assert.match(typography, /export const DISPLAY_FONT_FAMILY/);
  assert.match(typography, /export const MONO_FONT_FAMILY/);
  for (const source of phaserTypographySources) {
    assert.doesNotMatch(source, /fontFamily:\s*"Arial/);
    assert.doesNotMatch(source, /fontFamily:\s*"Consolas/);
  }
});

test("P1 motion remains short, one-shot, and reduced-motion safe", () => {
  const polishCss = readFileSync(
    new URL("../src/styles/p1-visual-polish.css", import.meta.url),
    "utf8",
  );

  assert.match(polishCss, /\.v2-quick-mode-option\.is-selected \.v2-quick-mode-icon[\s\S]*p1-selection-confirm/);
  assert.match(polishCss, /\.v2-result-card\.is-revealing \.v2-result-score[\s\S]*p1-score-reveal/);
  assert.match(polishCss, /\.league-rank-shift \.is-new strong,[\s\S]*p1-progress-pop/);
  assert.doesNotMatch(polishCss, /animation[^;]*(?:infinite|alternate)/i);
  assert.match(polishCss, /prefers-reduced-motion:[\s\S]*animation-duration: \.01ms !important/);
  assert.match(polishCss, /prefers-reduced-motion:[\s\S]*animation-delay: 0ms !important/);
  assert.match(polishCss, /prefers-reduced-motion:[\s\S]*animation-iteration-count: 1 !important/);
});
