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
  FOUNDERS_CIRCUIT_TEAM_IDS,
  buildLeagueMatchSearch,
  acknowledgeLeagueProgression,
  completeLeagueRound,
  completeRecruitment,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  leagueCharacter,
  readLeagueMatchContext,
  simulateLeagueMatch,
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

function leagueMenuFixture(): string {
  return `
    <div id="v2-league-hub" class="is-hidden">
      <div id="league-header-kicker"></div><div id="league-header-title"></div>
      <div id="league-empty"><button id="league-new-season"></button></div>
      <div id="league-intro-route"></div>
      <div id="league-dashboard" class="is-hidden">
        <section id="league-next-match"></section>
        <span id="league-team-record"></span>
        <div id="league-player-roster"></div>
        <div id="league-skin-preview"></div>
        <select id="league-skin-select"></select>
        <div id="league-standings"></div>
        <div id="league-team-detail"></div>
        <div id="league-pyramid"></div>
      </div>
      <button id="league-back"></button><button id="league-reset"></button>
      <div id="league-progression" class="is-hidden"></div>
      <div id="league-recruitment" class="is-hidden"></div>
    </div>`;
}

test("opening circuit creates a complete three-match single round robin", () => {
  const season = createLeagueSeason(1234);
  assert.deepEqual(season.teamIds, FOUNDERS_CIRCUIT_TEAM_IDS);
  assert.equal(season.rounds.length, 3);
  assert.ok(season.rounds.every((round) => round.matches.length === 2));
  for (const teamId of FOUNDERS_CIRCUIT_TEAM_IDS) {
    const fixtures = season.rounds.flatMap((round) => round.matches).filter(
      (match) => match.homeTeamId === teamId || match.awayTeamId === teamId
    );
    assert.equal(fixtures.length, 3);
  }
  const opponents = season.rounds.map((round) => {
    const match = round.matches.find((item) =>
      item.homeTeamId === season.playerTeamId || item.awayTeamId === season.playerTeamId
    )!;
    return match.homeTeamId === season.playerTeamId ? match.awayTeamId : match.homeTeamId;
  });
  for (const rival of FOUNDERS_CIRCUIT_TEAM_IDS.filter((teamId) => teamId !== season.playerTeamId)) {
    assert.equal(opponents.filter((id) => id === rival).length, 1);
  }
  assert.ok(season.teamRosters["solar-wardens"]);
  assert.ok(season.teamRosters["void-runners"]);
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
  assert.equal(Object.values(season.standings).reduce((sum, row) => sum + row.played, 0), 4);
  assert.equal(season.lastProgression?.newPoints, 3);
  completeLeagueRound(season, input);
  assert.equal(season.currentRound, 1);
  assert.equal(season.standings[season.playerTeamId].played, 1);
});

test("one recruitment choice opens after the three-match circuit and swaps one wingmate", () => {
  const season = createLeagueSeason(42);
  for (let round = 0; round < 3; round += 1) completeCurrent(season);
  assert.equal(season.currentRound, 3);
  assert.equal(season.status, "completed");
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

test("opponent simulation is deterministic and uses stable team profiles", () => {
  const first = createLeagueSeason(818);
  const second = createLeagueSeason(818);
  const firstAiMatch = first.rounds[0].matches.find((match) =>
    match.homeTeamId !== first.playerTeamId && match.awayTeamId !== first.playerTeamId
  )!;
  const secondAiMatch = second.rounds[0].matches.find((match) => match.id === firstAiMatch.id)!;
  const firstResult = simulateLeagueMatch(first, firstAiMatch);
  assert.deepEqual(firstResult, simulateLeagueMatch(second, secondAiMatch));
  assert.ok(firstResult.blueScore <= 10 && firstResult.redScore <= 10);
  const objectiveAiMatch = first.rounds[1].matches.find((match) =>
    match.homeTeamId !== first.playerTeamId && match.awayTeamId !== first.playerTeamId
  )!;
  const objectiveResult = simulateLeagueMatch(first, objectiveAiMatch);
  assert.ok(objectiveResult.blueScore <= 3 && objectiveResult.redScore <= 3);
});

test("character recruitment is cosmetic and cannot alter simulated results", () => {
  const baseline = createLeagueSeason(1818);
  const swapped = createLeagueSeason(1818);
  const match = baseline.rounds[0].matches.find((candidate) =>
    candidate.homeTeamId !== baseline.playerTeamId &&
    candidate.awayTeamId !== baseline.playerTeamId
  )!;
  const swappedMatch = swapped.rounds[0].matches.find((candidate) =>
    candidate.id === match.id
  )!;
  const homeRoster = [...swapped.teamRosters[match.homeTeamId]];
  swapped.teamRosters[match.homeTeamId] = [
    ...swapped.teamRosters[match.awayTeamId],
  ];
  swapped.teamRosters[match.awayTeamId] = homeRoster;
  assert.deepEqual(
    simulateLeagueMatch(baseline, match),
    simulateLeagueMatch(swapped, swappedMatch),
  );
});

test("league character catalog exposes cosmetic identity without power ratings", () => {
  for (const team of LEAGUE_TEAMS) {
    for (const characterId of team.characterIds) {
      const character = leagueCharacter(characterId);
      assert.equal("rating" in character, false);
      assert.equal("role" in character, false);
      assert.ok(character.visualStyle.length > 0);
      assert.ok(character.personality.length > 0);
    }
  }
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
  assert.equal(new URLSearchParams(search).get("mode"), "tdm");
  assert.equal(new URLSearchParams(search).get("map"), "training-crossing-v2");
  assert.match(search, /teamSize=2/);
  assert.equal(new URLSearchParams(search).get("skin"), "briarhorn");
  completeCurrent(season);
  const secondSearch = new URLSearchParams(buildLeagueMatchSearch(season));
  assert.equal(secondSearch.get("mode"), "one-flag");
  assert.equal(secondSearch.get("map"), "grand-archive-v2");
  completeCurrent(season);
  const finalSearch = new URLSearchParams(buildLeagueMatchSearch(season));
  assert.equal(finalSearch.get("mode"), "ctf");
  assert.equal(finalSearch.get("map"), "flow-circuit-v2");
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
  assert.match(html, /Master every arena/);
  assert.match(html, /id="league-intro-route"/);
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
  document.body.innerHTML = leagueMenuFixture();
  const controller = createLeagueMenuController({ onBack: () => {} });
  assert.equal(controller.hasSave, false);
  controller.open();
  assert.equal(document.querySelectorAll(".league-intro-stop").length, 3);
  assert.equal(document.getElementById("league-header-title")!.textContent, "Founders Circuit");
  document.getElementById("league-new-season")!.click();
  assert.equal(document.getElementById("league-header-title")!.textContent, "League HQ");
  assert.equal(document.getElementById("league-dashboard")!.classList.contains("is-hidden"), false);
  assert.equal(document.querySelectorAll(".league-table-row").length, 5);
  assert.equal(document.querySelectorAll(".league-table-emblem").length, 4);
  assert.equal(document.querySelectorAll(".league-mini-emblem").length, 2);
  assert.ok(document.querySelector(".league-large-emblem"));
  assert.match(leagueTeamEmblemUrl("crimson-jackals"), /league\/teams\/crimson-jackals-emblem\.png$/);
  assert.equal(document.querySelectorAll("#league-player-roster .league-character").length, 2);
  const skinSelect = document.getElementById("league-skin-select") as HTMLSelectElement;
  assert.equal(skinSelect.options.length, 9);
  skinSelect.value = "ax9-mantis";
  skinSelect.dispatchEvent(new Event("change"));
  assert.equal(window.localStorage.getItem(PLAYER_SKIN_STORAGE_KEY), "ax9-mantis");
  assert.match(document.getElementById("league-next-match")!.textContent ?? "", /MATCH 1 OF 3/);
  assert.match(document.getElementById("league-next-match")!.textContent ?? "", /TEAM DEATHMATCH 2V2/);
  assert.equal(document.querySelectorAll(".league-season-stop").length, 3);
  assert.equal(document.querySelectorAll(".league-season-stop.is-current").length, 1);
  assert.match(document.getElementById("league-pyramid")!.textContent ?? "", /Challenger League/);
  assert.ok(window.localStorage.getItem(LEAGUE_STORAGE_KEY));
  const repository = createLeagueRepository(window.localStorage);
  const savedSeason = repository.load()!;
  completeCurrent(savedSeason);
  repository.save(savedSeason);
  controller.open();
  assert.equal(document.getElementById("league-progression")!.classList.contains("is-hidden"), false);
  assert.match(document.getElementById("league-progression")!.textContent ?? "", /LEAGUE POINTS/);
  document.getElementById("league-progression-continue")!.click();
  assert.equal(document.getElementById("league-progression")!.classList.contains("is-hidden"), true);
  window.localStorage.clear();
});

test("league progression separates match outcome from rival-driven table movement", () => {
  window.localStorage.clear();
  document.body.innerHTML = leagueMenuFixture();
  const repository = createLeagueRepository(window.localStorage);
  const season = createLeagueSeason(88);
  season.lastProgression = {
    id: "rival-shift",
    roundIndex: 0,
    opponentId: "crimson-jackals",
    blueScore: 0,
    redScore: 1,
    previousPosition: 3,
    newPosition: 2,
    previousPoints: 0,
    newPoints: 0,
    promoted: false,
    acknowledged: false,
  };
  repository.save(season);

  createLeagueMenuController({ onBack: () => {} }).open();
  const progression = document.getElementById("league-progression")!;
  assert.match(progression.textContent ?? "", /The Climb Continues/);
  assert.doesNotMatch(progression.textContent ?? "", /Up 1 Place/);
  assert.match(progression.textContent ?? "", /other circuit result reshaped the table/);
  assert.ok(progression.querySelector(".league-points-earned.is-zero"));
  window.localStorage.clear();
});

test("recruitment UI compares cosmetic identities and uses explicit Recruit/Keep actions", () => {
  window.localStorage.clear();
  document.body.innerHTML = leagueMenuFixture();
  const repository = createLeagueRepository(window.localStorage);
  const season = createLeagueSeason(4242);
  for (let round = 0; round < 3; round += 1) completeCurrent(season);
  acknowledgeLeagueProgression(season);
  repository.save(season);

  const controller = createLeagueMenuController({ onBack: () => {} });
  controller.open();
  const recruitment = document.getElementById("league-recruitment")!;
  assert.equal(recruitment.classList.contains("is-hidden"), false);
  assert.match(recruitment.textContent ?? "", /Identical arena stats/);
  assert.doesNotMatch(recruitment.textContent ?? "", /OVR|ATTACKER|DEFENDER/);
  assert.equal(recruitment.querySelectorAll(".league-recruitment-side .league-character").length, 2);
  assert.ok(recruitment.querySelector("#league-confirm-recruit"));
  assert.ok(recruitment.querySelector("#league-keep-roster"));

  const option = recruitment.querySelector<HTMLButtonElement>(".league-candidate")!;
  option.click();
  const confirm = recruitment.querySelector<HTMLButtonElement>("#league-confirm-recruit")!;
  assert.match(confirm.textContent ?? "", /^Recruit /);
  confirm.click();
  assert.equal(repository.load()?.recruitment.status, "completed");
  window.localStorage.clear();
});
