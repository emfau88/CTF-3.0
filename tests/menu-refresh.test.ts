import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { setUiLanguage, uiText } from "../src/uiLocale";
import { setupQuickPlayMapPicker } from "../src/v2Menu";

test("Arena Twilight menu switches static and dynamic copy between DE and EN", () => {
  document.body.innerHTML = `
    <button data-i18n="common.settings" data-i18n-aria-label="common.settings"></button>
    <button data-ui-language="de"></button>
    <button data-ui-language="en"></button>`;

  setUiLanguage("de");
  const translated = document.querySelector<HTMLElement>("[data-i18n]")!;
  assert.equal(document.documentElement.lang, "de");
  assert.equal(translated.textContent, "Einstellungen");
  assert.equal(translated.getAttribute("aria-label"), "Einstellungen");
  assert.equal(document.querySelector('[data-ui-language="de"]')!.getAttribute("aria-pressed"), "true");
  assert.equal(uiText("league.captainOf", { team: "Orion" }), "Kapitän von Orion");

  setUiLanguage("en");
  assert.equal(document.documentElement.lang, "en");
  assert.equal(translated.textContent, "Settings");
  assert.equal(document.querySelector('[data-ui-language="en"]')!.getAttribute("aria-pressed"), "true");
  assert.equal(uiText("league.captainOf", { team: "Orion" }), "Captain of Orion");
});

test("premium arena picker keeps native value, radio state and callback in sync", () => {
  document.body.innerHTML = `
    <select id="map">
      <option value="helix-canopy-v2">Helix Canopy</option>
      <option value="drowned-sun-temple-v2">Temple</option>
      <option value="flow-circuit-v2">Foundry</option>
    </select>
    <div id="picker">
      <button data-map="helix-canopy-v2" role="radio"></button>
      <button data-map="drowned-sun-temple-v2" role="radio"></button>
      <button data-map="flow-circuit-v2" role="radio"></button>
    </div>`;
  const select = document.getElementById("map") as HTMLSelectElement;
  const picker = document.getElementById("picker")!;
  let changes = 0;
  const choose = setupQuickPlayMapPicker(
    { select, picker },
    "helix-canopy-v2",
    () => { changes += 1; },
  );

  choose("flow-circuit-v2");
  assert.equal(select.value, "flow-circuit-v2");
  assert.equal(picker.querySelector('[data-map="flow-circuit-v2"]')!.getAttribute("aria-checked"), "true");
  assert.equal(picker.querySelector('[data-map="helix-canopy-v2"]')!.getAttribute("aria-checked"), "false");
  assert.equal(changes, 1);
});

test("Arena Twilight ships compact responsive backgrounds, action emblems and tier badges", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/menu-refresh.css", import.meta.url), "utf8");
  const fidelityCss = readFileSync(
    new URL("../src/styles/menu-fidelity.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /arena-twilight-desktop-v1\.webp/);
  assert.match(css, /arena-twilight-mobile-v1\.webp/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /orientation: landscape/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(fidelityCss, /league-matchup-stage-v1\.webp/);
  assert.match(fidelityCss, /\.v2-match-dock/);
  assert.match(fidelityCss, /@media \(max-width: 620px\)/);
  assert.match(fidelityCss, /data-setup-step="arena"/);

  for (const filename of [
    "home-career-icon-v1.webp",
    "home-quick-play-icon-v1.webp",
    "home-custom-match-icon-v1.webp",
  ]) {
    assert.match(html, new RegExp(filename.replaceAll(".", "\\.")));
    const webp = readFileSync(new URL(`../public/assets/ui/menu/${filename}`, import.meta.url));
    assert.equal(webp.toString("ascii", 0, 4), "RIFF", `${filename} RIFF signature`);
    assert.equal(webp.toString("ascii", 8, 12), "WEBP", `${filename} WEBP signature`);
    assert.ok(webp.includes(Buffer.from("ALPH")), `${filename} preserves real transparency`);
    assert.ok(webp.byteLength < 100_000, `${filename} stays compact`);
  }

  for (const filename of [
    "league-tier-proving-v1.png",
    "league-tier-contender-v1.png",
    "league-tier-apex-v1.png",
  ]) {
    const png = readFileSync(new URL(`../public/assets/ui/menu/${filename}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG", `${filename} signature`);
    assert.equal(png.readUInt32BE(16), 512, `${filename} width`);
    assert.equal(png.readUInt32BE(20), 512, `${filename} height`);
    assert.equal(png[25], 6, `${filename} RGBA color type`);
  }

  for (const filename of ["arena-twilight-desktop-v1.webp", "arena-twilight-mobile-v1.webp"]) {
    const webp = readFileSync(new URL(`../public/assets/ui/menu/${filename}`, import.meta.url));
    assert.equal(webp.toString("ascii", 0, 4), "RIFF", `${filename} RIFF signature`);
    assert.equal(webp.toString("ascii", 8, 12), "WEBP", `${filename} WEBP signature`);
    assert.ok(webp.byteLength < 250_000, `${filename} stays compact`);
  }

  const matchupStage = readFileSync(
    new URL(
      "../public/assets/ui/menu/league-matchup-stage-v1.webp",
      import.meta.url,
    ),
  );
  assert.equal(matchupStage.toString("ascii", 0, 4), "RIFF");
  assert.equal(matchupStage.toString("ascii", 8, 12), "WEBP");
  assert.ok(matchupStage.byteLength < 150_000, "matchup stage stays compact");
});
