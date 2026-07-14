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
