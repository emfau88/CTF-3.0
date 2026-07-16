import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateArenaFitZoom,
  MINIMUM_ARENA_VIEW_HEIGHT,
  MINIMUM_ARENA_VIEW_WIDTH,
} from "../src/adapters/phaser/arenaCameraFit";
import {
  DROWNED_SUN_TEMPLE_V2,
  GRAND_ARCHIVE_V2,
  TRAINING_CROSSING_V2,
  WORLD_MAPS,
} from "../src/core";

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

test("compact playtest viewports retain useful arena context", () => {
  const viewportWidth = 288;
  const viewportHeight = 180;
  for (const map of WORLD_MAPS) {
    const zoom = calculateArenaFitZoom(
      viewportWidth,
      viewportHeight,
      map.geometry.bounds,
      1,
    );
    const worldWidth = map.geometry.bounds.maxX - map.geometry.bounds.minX;
    const worldHeight = map.geometry.bounds.maxY - map.geometry.bounds.minY;
    assert.ok(viewportWidth / zoom >= MINIMUM_ARENA_VIEW_WIDTH);
    assert.ok(viewportHeight / zoom >= MINIMUM_ARENA_VIEW_HEIGHT);
    assert.ok(worldWidth * zoom >= viewportWidth);
    assert.ok(worldHeight * zoom >= viewportHeight);
  }
  assert.equal(
    calculateArenaFitZoom(
      viewportWidth,
      viewportHeight,
      DROWNED_SUN_TEMPLE_V2.geometry.bounds,
      1,
    ),
    viewportWidth / MINIMUM_ARENA_VIEW_WIDTH,
  );
});

test("desktop P0 UI contract keeps Career primary and uses one outer menu scroller", () => {
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
  const menuSource = readFileSync(
    new URL("../src/v2Menu.ts", import.meta.url),
    "utf8",
  );
  assert.match(html, /id="v2-menu-league" class="v2-home-action v2-home-action-primary"/);
  assert.match(html, /id="v2-main-menu"[^>]*tabindex="-1"/);
  assert.doesNotMatch(baseCss, /#v2-menu-play,\s*\n#v2-menu-start/);
  assert.match(baseCss, /\.v2-main-menu\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(baseCss, /#game\s*\{[\s\S]*position:\s*fixed[\s\S]*height:\s*100dvh[\s\S]*overflow:\s*hidden/);
  assert.match(baseCss, /\.v2-setup-view\s*\{[^}]*height:\s*auto[^}]*max-height:\s*none[^}]*overflow:\s*visible/);
  assert.match(baseCss, /\.league-dashboard\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(desktopCss, /\.v2-setup-view\s*>\s*\.v2-menu-section\s*\{[^}]*overflow-y:\s*auto/);
  assert.doesNotMatch(polishCss, /\.v2-league-hub\s*\{[^}]*height:\s*calc\([^}]*100vh/);
  assert.match(baseCss, /\.league-progression-card\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(baseCss, /\.league-recruitment-card\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(menuSource, /root\.onkeydown\s*=/);
  assert.match(menuSource, /event\.key === "PageDown"/);
  assert.match(menuSource, /event\.key === "PageUp"/);
  assert.match(menuSource, /event\.key === "Home"/);
  assert.match(menuSource, /event\.key === "End"/);
  assert.match(desktopCss, /#v2-pause-overlay \.v2-flow-card/);
  assert.match(desktopCss, /\.league-cosmetic-contract/);
  assert.match(desktopCss, /:focus-visible/);
  assert.match(polishCss, /@media \(min-width: 901px\) and \(max-height: 800px\)/);
  assert.match(polishCss, /grid-template-areas:[\s\S]*"next"[\s\S]*"squad"[\s\S]*"table"/);
  assert.match(polishCss, /prefers-reduced-motion/);
  assert.match(html, /id="v2-menu-mode-picker"[\s\S]*role="radiogroup"/);
  assert.equal((html.match(/class="v2-quick-mode-option"/g) ?? []).length, 3);
  assert.equal((html.match(/class="v2-quick-mode-art"/g) ?? []).length, 3);
  for (const filename of [
    "team-deathmatch.png",
    "classic-ctf.png",
    "one-flag.png",
  ]) {
    assert.match(html, new RegExp(`assets/ui/modes/${filename}`));
    const png = readFileSync(
      new URL(`../public/assets/ui/modes/${filename}`, import.meta.url),
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", `${filename} signature`);
    assert.equal(png.readUInt32BE(16), 256, `${filename} width`);
    assert.equal(png.readUInt32BE(20), 256, `${filename} height`);
  }
  assert.match(polishCss, /\.v2-quick-mode-picker/);
  assert.match(polishCss, /\.v2-quick-mode-option\.is-selected/);
  assert.match(polishCss, /\.v2-quick-mode-art/);
  assert.match(polishCss, /\.v2-subpage-title h2\s*\{[^}]*font-weight:\s*800[^}]*letter-spacing:\s*\.025em[^}]*word-spacing:\s*\.12em/);
  assert.match(polishCss, /\.league-character-info > span\s*\{[^}]*font-size:\s*11px[^}]*line-height:\s*1\.35/);
  assert.match(polishCss, /\.league-table-row\s*\{[^}]*font-size:\s*12px/);
  assert.match(polishCss, /\.league-tier p\s*\{[^}]*font-size:\s*9px[^}]*line-height:\s*1\.4/);
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
