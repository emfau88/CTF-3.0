import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CURRENT_LEAGUE_CIRCUIT,
  LEAGUE_CIRCUITS,
} from "../src/meta/league";

test("career presentation exposes Proving and Contender while keeping Apex an honest preview", () => {
  assert.deepEqual(
    LEAGUE_CIRCUITS.map((circuit) => circuit.name),
    ["Proving Circuit", "Contender Circuit", "Apex Circuit"],
  );
  assert.deepEqual(
    LEAGUE_CIRCUITS.map((circuit) => circuit.levelLabel),
    ["ENTRY", "ADVANCED", "CHAMPIONSHIP · HIGHEST"],
  );
  assert.equal(CURRENT_LEAGUE_CIRCUIT.id, "proving");
  assert.equal(
    LEAGUE_CIRCUITS.filter((circuit) => circuit.availability === "current").length,
    2,
  );
  assert.equal(
    LEAGUE_CIRCUITS.filter((circuit) => circuit.availability === "coming-soon").length,
    1,
  );
});

test("league HQ keeps player identity, season progress and future-state language explicit", () => {
  const menu = readFileSync(new URL("../src/leagueMenu.ts", import.meta.url), "utf8");
  const locale = readFileSync(new URL("../src/uiLocale.ts", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(menu, /aria-current/);
  assert.match(menu, /league-you-badge/);
  assert.match(menu, /uiText\("league\.upNext"\)/);
  assert.match(menu, /uiText\("common\.locked"\)/);
  assert.match(menu, /uiText\("league\.matchProgress"/);
  assert.match(menu, /uiText\("common\.comingSoon"\)/);
  assert.match(menu, /uiText\("league\.youAreHere"\)/);
  assert.match(menu, /uiText\("league\.qualificationEarned"\)/);
  assert.match(locale, /"league\.upNext": "UP NEXT"/);
  assert.match(locale, /"league\.upNext": "ALS NÄCHSTES"/);
  assert.doesNotMatch(menu, /Promotion Secured|Challenger League|Core League/);
  assert.match(html, /id="league-season-command-status"/);
  assert.match(html, /id="league-standings-title"/);
  assert.match(html, /aria-label="Core Arena League circuit path"/);
});
