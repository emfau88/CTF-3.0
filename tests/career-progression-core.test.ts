import assert from "node:assert/strict";
import test from "node:test";
import {
  CAREER_PROFILE_STORAGE_KEY,
  createCareerProfile,
  createCareerProfileRepository,
  resolveCareerCaptainSkin,
  syncCareerUnlocks,
  updateCareerProfile,
} from "../src/careerProfile";
import {
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  STARTER_WINGMAN_IDS,
} from "../src/meta/league/leagueCatalog";
import {
  completeLeagueRound,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  leagueCharacterStats,
  leagueCharacterStatsKey,
  selectLeagueWingman,
} from "../src/meta/league/leagueSeason";
import {
  LEAGUE_STORAGE_KEY,
  createLeagueRepository,
} from "../src/meta/league/leagueStorage";
import type { LeagueSeasonState } from "../src/meta/league/leagueTypes";

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
}

test("an unlocked rival wingman survives season reset without moving rival rosters", () => {
  const storage = new MemoryStorage();
  const profiles = createCareerProfileRepository(storage);
  const seasons = createLeagueRepository(storage);
  let profile = createCareerProfile({
    callsign: "Axiom",
    teamName: "Rift Sentinels",
    emblemId: "comet-lance",
    captainSkinId: "ax9-mantis",
    selectedWingmanId: STARTER_WINGMAN_IDS[0],
  }, "2026-07-17T00:00:00.000Z");
  const rivalTeam = LEAGUE_TEAMS.find((team) => team.id === "crimson-jackals")!;
  const unlockedWingmanId = rivalTeam.characterIds[0];

  assert.equal(syncCareerUnlocks(profile, [rivalTeam.id]), true);
  profile = updateCareerProfile(profile, {
    ...profile,
    selectedWingmanId: unlockedWingmanId,
  }, "2026-07-17T00:01:00.000Z");
  profiles.save(profile);

  const firstSeason = createLeagueSeason(101, profile.selectedWingmanId);
  assert.equal(firstSeason.teamRosters[PLAYER_LEAGUE_TEAM_ID][1], unlockedWingmanId);
  assert.deepEqual(firstSeason.teamRosters[rivalTeam.id], [...rivalTeam.characterIds]);
  seasons.save(firstSeason);
  seasons.clear();

  const persistedProfile = profiles.load()!;
  assert.equal(persistedProfile.selectedWingmanId, unlockedWingmanId);
  assert.ok(persistedProfile.unlockedWingmanIds.includes(unlockedWingmanId));
  const resetSeason = createLeagueSeason(102, persistedProfile.selectedWingmanId);
  assert.equal(resetSeason.teamRosters[PLAYER_LEAGUE_TEAM_ID][1], unlockedWingmanId);
  assert.deepEqual(resetSeason.teamRosters[rivalTeam.id], [...rivalTeam.characterIds]);
  assert.throws(
    () => createLeagueSeason(103, "not-a-fighter"),
    /not a valid league fighter/i,
  );
});

test("wingman selection changes only the player roster", () => {
  const season = createLeagueSeason(201);
  const rivalSnapshots = Object.fromEntries(
    LEAGUE_TEAMS
      .filter((team) => team.id !== season.playerTeamId)
      .map((team) => [team.id, [...season.teamRosters[team.id]]]),
  );
  const selectedCharacterId = LEAGUE_TEAMS.find(
    (team) => team.id === "neon-phantoms",
  )!.characterIds[1];

  selectLeagueWingman(season, selectedCharacterId);

  assert.equal(season.teamRosters[season.playerTeamId][1], selectedCharacterId);
  for (const [teamId, roster] of Object.entries(rivalSnapshots)) {
    assert.deepEqual(
      season.teamRosters[teamId as keyof typeof season.teamRosters],
      roster,
      `${teamId} remains canonical`,
    );
  }
  assert.ok(
    season.characterStats[
      leagueCharacterStatsKey(season.playerTeamId, selectedCharacterId)
    ],
  );
});

test("team-scoped stats separate a duplicated player wingman from its rival original", () => {
  const season = createLeagueSeason(301);
  const match = getCurrentPlayerMatch(season)!;
  const opponentId = getPlayerOpponent(season, match)!;
  const duplicatedCharacterId = season.teamRosters[opponentId][0];
  const canonicalRivalRoster = [...season.teamRosters[opponentId]];
  selectLeagueWingman(season, duplicatedCharacterId);

  completeLeagueRound(season, {
    seasonId: season.seasonId,
    matchId: match.id,
    roundIndex: match.roundIndex,
    blueScore: 3,
    redScore: 1,
    stats: [
      {
        actorId: "blue-player-2",
        kills: 7,
        deaths: 1,
        flagPickups: 2,
        flagCaptures: 1,
        flagReturns: 0,
      },
      {
        actorId: "red-player",
        kills: 2,
        deaths: 4,
        flagPickups: 0,
        flagCaptures: 0,
        flagReturns: 1,
      },
    ],
  });

  const playerStats = leagueCharacterStats(
    season,
    season.playerTeamId,
    duplicatedCharacterId,
  )!;
  const rivalStats = leagueCharacterStats(
    season,
    opponentId,
    duplicatedCharacterId,
  )!;
  assert.notStrictEqual(playerStats, rivalStats);
  assert.equal(playerStats.teamId, season.playerTeamId);
  assert.equal(playerStats.kills, 7);
  assert.equal(rivalStats.kills, 2);
  assert.deepEqual(season.teamRosters[opponentId], canonicalRivalRoster);
});

test("a winless season grants no fallback recruit or profile unlock", () => {
  const season = createLeagueSeason(401);
  for (let round = 0; round < 3; round += 1) {
    completeCurrentLeagueMatch(season, 0, 3);
  }
  assert.equal(season.status, "completed");
  assert.deepEqual(season.defeatedTeamIds, []);
  assert.equal(season.recruitment.status, "completed");
  assert.deepEqual(season.recruitment.candidateIds, []);

  const profile = createCareerProfile({
    callsign: "Cipher",
    teamName: "Apex Nomads",
    emblemId: "orbit-talon",
    captainSkinId: "briarhorn",
    selectedWingmanId: STARTER_WINGMAN_IDS[1],
  });
  assert.equal(syncCareerUnlocks(profile, season.defeatedTeamIds), false);
  assert.deepEqual(profile.unlockedWingmanIds, [...STARTER_WINGMAN_IDS]);
});

test("v2 saves remain loadable while legacy fallback recruitment is neutralized", () => {
  const storage = new MemoryStorage();
  const repository = createLeagueRepository(storage);
  const legacy = createLeagueSeason(501);
  const fallbackCandidate = LEAGUE_TEAMS.find(
    (team) => team.id !== legacy.playerTeamId,
  )!.characterIds[0];
  legacy.characterStats[legacy.teamRosters[legacy.playerTeamId][1]].kills = 4;
  legacy.recruitment = {
    status: "pending",
    candidateIds: [fallbackCandidate],
    selectedCharacterId: null,
  };
  storage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(legacy));

  const loaded = repository.load();
  assert.ok(loaded);
  assert.equal(loaded.version, 2);
  assert.equal(loaded.recruitment.status, "completed");
  assert.deepEqual(loaded.recruitment.candidateIds, []);
  assert.equal(
    leagueCharacterStats(
      loaded,
      loaded.playerTeamId,
      loaded.teamRosters[loaded.playerTeamId][1],
    )?.kills,
    4,
  );

  const modern = createLeagueSeason(502, fallbackCandidate);
  const scopedKey = leagueCharacterStatsKey(modern.playerTeamId, fallbackCandidate);
  modern.characterStats[scopedKey].kills = 6;
  repository.save(modern);
  const modernReloaded = repository.load()!;
  assert.equal(modernReloaded.characterStats[scopedKey].kills, 6);
});

test("completed legacy recruitment restores canonical rival rosters", () => {
  const storage = new MemoryStorage();
  const repository = createLeagueRepository(storage);
  const legacy = createLeagueSeason(503);
  const sourceTeam = LEAGUE_TEAMS.find(
    (team) => team.id !== legacy.playerTeamId,
  )!;
  const recruitedWingmanId = sourceTeam.characterIds[0];
  const formerPlayerWingmanId = legacy.teamRosters[legacy.playerTeamId][1];

  legacy.teamRosters[legacy.playerTeamId][1] = recruitedWingmanId;
  legacy.teamRosters[sourceTeam.id] = [
    formerPlayerWingmanId,
    sourceTeam.characterIds[1],
  ];
  legacy.recruitment = {
    status: "completed",
    candidateIds: [...sourceTeam.characterIds],
    selectedCharacterId: recruitedWingmanId,
  };
  storage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(legacy));

  const loaded = repository.load();
  assert.ok(loaded);
  assert.equal(
    loaded.teamRosters[loaded.playerTeamId][1],
    recruitedWingmanId,
  );
  assert.deepEqual(
    loaded.teamRosters[sourceTeam.id],
    [...sourceTeam.characterIds],
  );
});

test("official league team names are reserved regardless of case or whitespace", () => {
  assert.throws(
    () => createCareerProfile({
      callsign: "Echo",
      teamName: "  crimson   JACKALS ",
      emblemId: "rift-crown",
      captainSkinId: "alien-runner",
      selectedWingmanId: STARTER_WINGMAN_IDS[0],
    }),
    /official league team/i,
  );

  const valid = createCareerProfile({
    callsign: "Echo",
    teamName: "Nova Coalition",
    emblemId: "rift-crown",
    captainSkinId: "alien-runner",
    selectedWingmanId: STARTER_WINGMAN_IDS[0],
  });
  assert.throws(
    () => updateCareerProfile(valid, { ...valid, teamName: "IRON VANGUARD" }),
    /official league team/i,
  );

  const storage = new MemoryStorage();
  storage.setItem(
    CAREER_PROFILE_STORAGE_KEY,
    JSON.stringify({ ...valid, teamName: "Grave Circuit" }),
  );
  const legacyProfile = createCareerProfileRepository(storage).load()!;
  assert.equal(legacyProfile.teamName, "Grave Circuit");
  assert.doesNotThrow(() => updateCareerProfile(legacyProfile, {
    ...legacyProfile,
    selectedWingmanId: STARTER_WINGMAN_IDS[1],
  }));
});

test("career captain skin overrides but does not rewrite a Quick Play fallback", () => {
  const profile = createCareerProfile({
    callsign: "Morrow",
    teamName: "Steel Tempest",
    emblemId: "comet-lance",
    captainSkinId: "ax9-mantis",
    selectedWingmanId: STARTER_WINGMAN_IDS[2],
  });
  const quickPlaySkin = "alien-runner" as const;
  assert.equal(resolveCareerCaptainSkin(profile, quickPlaySkin), "ax9-mantis");
  assert.equal(quickPlaySkin, "alien-runner");
  assert.equal(resolveCareerCaptainSkin(null, quickPlaySkin), quickPlaySkin);
});

function completeCurrentLeagueMatch(
  season: LeagueSeasonState,
  blueScore: number,
  redScore: number,
): void {
  const match = getCurrentPlayerMatch(season)!;
  completeLeagueRound(season, {
    seasonId: season.seasonId,
    matchId: match.id,
    roundIndex: match.roundIndex,
    blueScore,
    redScore,
    stats: [],
  });
}
