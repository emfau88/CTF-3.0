import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createLeagueMenuController,
  leagueTeamEmblemUrl,
} from "../src/leagueMenu";
import { setupQuickPlaySkinPicker } from "../src/v2Menu";
import {
  PLAYER_SKIN_STORAGE_KEY,
  loadPlayerSkinPreference,
  playerSkinSheetAssetStem,
  savePlayerSkinPreference,
} from "../src/playerSkinPreference";
import {
  LEAGUE_STORAGE_KEY,
  LEAGUE_TEAMS,
  buildLeagueMatchSearch,
  completeLeagueRound,
  completeRecruitment,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  readLeagueMatchContext,
} from "../src/meta/league";

function completeCurrent(season: ReturnType<typeof createLeagueSeason>, blue = 3, red = 1) {
  const match = getCurrentPlayerMatch(season)!;
  return completeLeagueRound(season, {
    seasonId: season.seasonId,
    matchId: match.id,
    roundIndex: season.currentRound,
    blueScore: blue,
    redScore: red,
    stats: [
      { actorId: "blue-player", kills: 8, deaths: 2, flagPickups: 3, flagCaptures: 2, flagReturns: 1 },
      { actorId: "blue-player-2", kills: 4, deaths: 3, flagPickups: 2, flagCaptures: 1, flagReturns: 2 },
      { actorId: "red-player", kills: 3, deaths: 6, flagPickups: 1, flagCaptures: 1, flagReturns: 0 },
      { actorId: "red-player-2", kills: 2, deaths: 5, flagPickups: 0, flagCaptures: 0, flagReturns: 1 },
    ],
  });
}

test("league creates a complete ten-round double round robin", () => {
  const season = createLeagueSeason(1234);
  assert.equal(season.rounds.length, 10);
  assert.ok(season.rounds.every((round) => round.matches.length === 3));
  for (const team of LEAGUE_TEAMS) {
    const fixtures = season.rounds.flatMap((round) => round.matches).filter(
      (match) => match.homeTeamId === team.id || match.awayTeamId === team.id
    );
    assert.equal(fixtures.length, 10);
  }
  const opponents = season.rounds.map((round) => {
    const match = round.matches.find((item) =>
      item.homeTeamId === season.playerTeamId || item.awayTeamId === season.playerTeamId
    )!;
    return match.homeTeamId === season.playerTeamId ? match.awayTeamId : match.homeTeamId;
  });
  for (const rival of LEAGUE_TEAMS.filter((team) => team.id !== season.playerTeamId)) {
    assert.equal(opponents.filter((id) => id === rival.id).length, 2);
  }
});

test("played result advances one round, updates points, and is idempotent", () => {
  const season = createLeagueSeason(22);
  const match = getCurrentPlayerMatch(season)!;
  const input = {
    seasonId: season.seasonId,
    matchId: match.id,
    roundIndex: season.currentRound,
    blueScore: 3,
    redScore: 1,
    stats: [],
  };
  completeLeagueRound(season, input);
  assert.equal(season.currentRound, 1);
  assert.equal(season.standings[season.playerTeamId].points, 3);
  assert.equal(Object.values(season.standings).reduce((sum, row) => sum + row.played, 0), 6);
  completeLeagueRound(season, input);
  assert.equal(season.currentRound, 1);
  assert.equal(season.standings[season.playerTeamId].played, 1);
});

test("one recruitment choice opens after match five and swaps exactly one wingmate", () => {
  const season = createLeagueSeason(42);
  for (let round = 0; round < 5; round += 1) completeCurrent(season);
  assert.equal(season.currentRound, 5);
  assert.equal(season.recruitment.status, "pending");
  assert.ok(season.recruitment.candidateIds.length >= 1);
  const oldWingmate = season.teamRosters[season.playerTeamId][1];
  const recruit = season.recruitment.candidateIds[0];
  const sourceTeam = LEAGUE_TEAMS.find((team) => season.teamRosters[team.id].includes(recruit))!;
  completeRecruitment(season, recruit);
  assert.equal(season.recruitment.status, "completed");
  assert.equal(season.teamRosters[season.playerTeamId][1], recruit);
  assert.ok(season.teamRosters[sourceTeam.id].includes(oldWingmate));
  const snapshot = JSON.stringify(season.teamRosters);
  completeRecruitment(season, null);
  assert.equal(JSON.stringify(season.teamRosters), snapshot);
});

test("league route carries the scheduled fixture context and cosmetic skin", () => {
  const season = createLeagueSeason(99);
  const search = buildLeagueMatchSearch(season, {
    controls: "keyboard",
    sfx: "off",
    skin: "briarhorn",
  });
  const context = readLeagueMatchContext(new URLSearchParams(search));
  assert.deepEqual(context, {
    seasonId: season.seasonId,
    roundIndex: 0,
    matchId: getCurrentPlayerMatch(season)!.id,
    opponentId: getPlayerOpponent(season),
  });
  assert.match(search, /mode=ctf/);
  assert.match(search, /teamSize=2/);
  assert.equal(new URLSearchParams(search).get("skin"), "briarhorn");
});

test("cosmetic skin preference accepts new skins and rejects invalid values", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  savePlayerSkinPreference("null-courier", storage);
  assert.equal(values.get(PLAYER_SKIN_STORAGE_KEY), "null-courier");
  assert.equal(loadPlayerSkinPreference(storage), "null-courier");
  values.set(PLAYER_SKIN_STORAGE_KEY, "space-marine-red-heavy");
  assert.equal(loadPlayerSkinPreference(storage), "aegis-vanguard");
  values.set(PLAYER_SKIN_STORAGE_KEY, "riot-droid");
  assert.equal(loadPlayerSkinPreference(storage), "ax9-mantis");
  assert.equal(playerSkinSheetAssetStem("alien-runner"), "xeno-runner");
  assert.equal(playerSkinSheetAssetStem("volt-hound"), "volt-hound");
  values.set(PLAYER_SKIN_STORAGE_KEY, "not-a-skin");
  assert.equal(loadPlayerSkinPreference(storage), "alien-runner");
});

test("versioned repository round-trips valid saves and rejects corrupt data", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const repository = createLeagueRepository(storage);
  const season = createLeagueSeason(7);
  repository.save(season);
  assert.deepEqual(repository.load(), season);
  values.set(LEAGUE_STORAGE_KEY, "{broken");
  assert.equal(repository.load(), null);
  values.set(LEAGUE_STORAGE_KEY, JSON.stringify({ ...season, version: 999 }));
  assert.equal(repository.load(), null);
  repository.clear();
  assert.equal(values.has(LEAGUE_STORAGE_KEY), false);
});

test("career and custom menus share the same primary navigation shell", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal((html.match(/<header class="v2-subpage-header/g) ?? []).length, 2);
  assert.match(html, /id="v2-menu-back" class="v2-subpage-back"/);
  assert.match(html, /id="league-back" class="v2-subpage-back"/);
  assert.match(html, /assets\/league\/arena-league-emblem\.png/);
});

test("result screen and league portraits use the current dark square presentation", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(html, /v2-flow-card v2-stats-card v2-result-card/);
  assert.match(css, /\.v2-result-card\s*\{/);
  assert.match(css, /--portrait-size:\s*112px/);
  assert.match(css, /height:\s*var\(--portrait-size\)/);
});

test("league branding assets expose normalized transparent square emblems", () => {
  for (const filename of [
    "teams/iron-vanguard-emblem.png",
    "teams/crimson-jackals-emblem.png",
    "teams/neon-phantoms-emblem.png",
    "teams/grave-circuit-emblem.png",
    "teams/solar-wardens-emblem.png",
    "teams/void-runners-emblem.png",
    "arena-league-emblem.png",
  ]) {
    const png = readFileSync(new URL(`../public/assets/league/${filename}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    assert.equal(png.readUInt32BE(16), 512, `${filename} width`);
    assert.equal(png.readUInt32BE(20), 512, `${filename} height`);
    assert.equal(png[25], 6, `${filename} must use RGBA color type`);
  }
});

test("quick play skin gallery renders and selects all playable fighters", () => {
  document.body.innerHTML = `
    <select id="skin-source"></select>
    <div id="skin-picker"></div>
    <div id="skin-preview"></div>
    <strong id="skin-name"></strong>`;
  const selected: string[] = [];
  const select = document.getElementById("skin-source") as HTMLSelectElement;
  setupQuickPlaySkinPicker({
    select,
    picker: document.getElementById("skin-picker")!,
    preview: document.getElementById("skin-preview")!,
    name: document.getElementById("skin-name")!,
  }, "mirejaw", (skinId) => selected.push(skinId));
  assert.equal(select.options.length, 9);
  assert.equal(document.querySelectorAll(".v2-quick-skin-option").length, 9);
  assert.equal(document.querySelector(".v2-quick-skin-option.is-selected")?.getAttribute("aria-label"), "Mirejaw");
  const prismButton = document.querySelector<HTMLButtonElement>('[data-skin-id="prism-bastion"]')!;
  prismButton.click();
  assert.equal(select.value, "prism-bastion");
  assert.equal(document.getElementById("skin-name")!.textContent, "Prism Bastion");
  assert.deepEqual(selected, ["prism-bastion"]);
  assert.match(document.getElementById("skin-preview")!.style.getPropertyValue("--skin-sprite"), /prism-bastion-spritesheet-6x4\.png/);
});

test("league menu starts a season and renders the actionable dashboard", () => {
  window.localStorage.clear();
  document.body.innerHTML = `
    <div id="v2-league-hub" class="is-hidden">
      <div id="league-empty"><button id="league-new-season"></button></div>
      <div id="league-dashboard" class="is-hidden">
        <section id="league-next-match"></section>
        <span id="league-team-record"></span>
        <div id="league-player-roster"></div>
        <div id="league-skin-preview"></div>
        <select id="league-skin-select"></select>
        <div id="league-standings"></div>
        <div id="league-team-detail"></div>
      </div>
      <button id="league-back"></button><button id="league-reset"></button>
      <div id="league-recruitment" class="is-hidden"></div>
    </div>`;
  const controller = createLeagueMenuController({ onBack: () => {} });
  assert.equal(controller.hasSave, false);
  controller.open();
  document.getElementById("league-new-season")!.click();
  assert.equal(document.getElementById("league-dashboard")!.classList.contains("is-hidden"), false);
  assert.equal(document.querySelectorAll(".league-table-row").length, 7);
  assert.equal(document.querySelectorAll(".league-table-emblem").length, 6);
  assert.equal(document.querySelectorAll(".league-mini-emblem").length, 2);
  assert.ok(document.querySelector(".league-large-emblem"));
  assert.match(leagueTeamEmblemUrl("crimson-jackals"), /league\/teams\/crimson-jackals-emblem\.png$/);
  assert.equal(document.querySelectorAll("#league-player-roster .league-character").length, 2);
  const skinSelect = document.getElementById("league-skin-select") as HTMLSelectElement;
  assert.equal(skinSelect.options.length, 9);
  skinSelect.value = "ax9-mantis";
  skinSelect.dispatchEvent(new Event("change"));
  assert.equal(window.localStorage.getItem(PLAYER_SKIN_STORAGE_KEY), "ax9-mantis");
  assert.match(document.getElementById("league-next-match")!.textContent ?? "", /MATCH 1 OF 10/);
  assert.ok(window.localStorage.getItem(LEAGUE_STORAGE_KEY));
  window.localStorage.clear();
});
