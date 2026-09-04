import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceLeagueCareer,
  canAdvanceLeagueCareer,
  canRetryLeagueCareerCircuit,
  completeLeagueRound,
  createLeagueCareer,
  createLeagueCareerRepository,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  LEAGUE_CAREER_STORAGE_KEY,
  LEAGUE_STORAGE_KEY,
  retryLeagueCareerCircuit,
} from "../src/meta/league";
import type { LeagueSeasonState } from "../src/meta/league";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }
}

function completeCurrent(season: LeagueSeasonState, blueScore: number, redScore: number): void {
  const match = getCurrentPlayerMatch(season)!;
  completeLeagueRound(season, {
    seasonId: season.seasonId,
    matchId: match.id,
    roundIndex: season.currentRound,
    blueScore,
    redScore,
    stats: [],
  });
  if (season.recruitment.status === "pending") {
    season.recruitment.status = "completed";
  }
}

test("career save migrates an existing V2 Proving season without removing it", () => {
  const storage = new MemoryStorage();
  const legacy = createLeagueSeason(44, "lyra-quell");
  createLeagueRepository(storage).save(legacy);

  const career = createLeagueCareerRepository(storage).load()!;
  assert.equal(career.activeCircuitId, "proving");
  assert.equal(career.season.seasonId, legacy.seasonId);
  assert.equal(career.season.teamRosters[career.season.playerTeamId][1], "lyra-quell");
  assert.equal(storage.has(LEAGUE_STORAGE_KEY), true);
  assert.equal(storage.has(LEAGUE_CAREER_STORAGE_KEY), true);
});

test("qualified Proving advances once into a fresh Contender season", () => {
  const career = createLeagueCareer(71, "atlas-rho");
  for (let round = 0; round < 3; round += 1) {
    completeCurrent(career.season, 3, 0);
  }
  assert.equal(canAdvanceLeagueCareer(career), true);
  const provingSeasonId = career.season.seasonId;
  advanceLeagueCareer(career, 72, "atlas-rho");
  assert.equal(career.activeCircuitId, "contender");
  assert.equal(career.season.circuitId, "contender");
  assert.notEqual(career.season.seasonId, provingSeasonId);
  assert.equal(career.attempts.contender, 1);
  assert.deepEqual(career.qualifiedCircuitIds, ["proving"]);
  assert.equal(career.season.currentRound, 0);
  assert.deepEqual(career.season.teamIds, [
    "iron-vanguard", "void-runners", "grave-circuit", "solar-wardens",
  ]);
});

test("a non-qualifying circuit can retry without losing the chosen wingman", () => {
  const career = createLeagueCareer(91, "lyra-quell");
  for (let round = 0; round < 3; round += 1) {
    completeCurrent(career.season, 0, 3);
  }
  assert.equal(canRetryLeagueCareerCircuit(career), true);
  retryLeagueCareerCircuit(career, 92, "lyra-quell");
  assert.equal(career.activeCircuitId, "proving");
  assert.equal(career.attempts.proving, 2);
  assert.equal(career.season.currentRound, 0);
  assert.equal(career.season.teamRosters[career.season.playerTeamId][1], "lyra-quell");
});
