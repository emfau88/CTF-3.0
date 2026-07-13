import {
  LEAGUE_CHARACTERS,
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  leagueCharacter,
} from "./leagueCatalog";
import {
  LEAGUE_SAVE_VERSION,
  type CompleteLeagueMatchInput,
  type LeagueCharacterStats,
  type LeagueMatchResultRecord,
  type LeagueScheduledMatch,
  type LeagueSeasonState,
  type LeagueStanding,
  type LeagueTeamId,
} from "./leagueTypes";

const RECRUITMENT_ROUND = 5;

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed: number): number {
  let value = seed >>> 0;
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function createSchedule(): LeagueSeasonState["rounds"] {
  const ids = LEAGUE_TEAMS.map((team) => team.id);
  const fixed = ids[0];
  let rotating = ids.slice(1);
  const firstLeg: LeagueSeasonState["rounds"] = [];

  for (let roundIndex = 0; roundIndex < ids.length - 1; roundIndex += 1) {
    const order = [fixed, ...rotating];
    const matches: LeagueScheduledMatch[] = [];
    for (let pair = 0; pair < ids.length / 2; pair += 1) {
      const first = order[pair];
      const second = order[order.length - 1 - pair];
      const swap = (roundIndex + pair) % 2 === 1;
      matches.push({
        id: `r${roundIndex + 1}-m${pair + 1}`,
        roundIndex,
        homeTeamId: swap ? second : first,
        awayTeamId: swap ? first : second,
        result: null,
      });
    }
    firstLeg.push({ index: roundIndex, matches });
    rotating = [rotating.at(-1)!, ...rotating.slice(0, -1)];
  }

  const secondLeg = firstLeg.map((round, index) => ({
    index: index + firstLeg.length,
    matches: round.matches.map((match, matchIndex) => ({
      id: `r${index + firstLeg.length + 1}-m${matchIndex + 1}`,
      roundIndex: index + firstLeg.length,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      result: null,
    })),
  }));
  return [...firstLeg, ...secondLeg];
}

function initialStanding(teamId: LeagueTeamId): LeagueStanding {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    capturesFor: 0,
    capturesAgainst: 0,
  };
}

function initialCharacterStats(characterId: string): LeagueCharacterStats {
  return {
    characterId,
    matches: 0,
    kills: 0,
    deaths: 0,
    flagPickups: 0,
    flagCaptures: 0,
    flagReturns: 0,
  };
}

export function createLeagueSeason(seed = Date.now()): LeagueSeasonState {
  const safeSeed = Math.abs(Math.trunc(seed)) || 1;
  const teamRosters = Object.fromEntries(
    LEAGUE_TEAMS.map((team) => [team.id, [...team.characterIds]])
  ) as LeagueSeasonState["teamRosters"];
  const standings = Object.fromEntries(
    LEAGUE_TEAMS.map((team) => [team.id, initialStanding(team.id)])
  ) as LeagueSeasonState["standings"];
  const characterStats = Object.fromEntries(
    LEAGUE_CHARACTERS.map((character) => [
      character.id,
      initialCharacterStats(character.id),
    ])
  );

  return {
    version: LEAGUE_SAVE_VERSION,
    seasonId: `season-${safeSeed.toString(36)}`,
    simulationSeed: safeSeed,
    status: "active",
    currentRound: 0,
    playerTeamId: PLAYER_LEAGUE_TEAM_ID,
    teamRosters,
    standings,
    characterStats,
    rounds: createSchedule(),
    defeatedTeamIds: [],
    recruitment: {
      status: "locked",
      candidateIds: [],
      selectedCharacterId: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentPlayerMatch(
  season: LeagueSeasonState
): LeagueScheduledMatch | null {
  const round = season.rounds[season.currentRound];
  return (
    round?.matches.find(
      (match) =>
        match.homeTeamId === season.playerTeamId ||
        match.awayTeamId === season.playerTeamId
    ) ?? null
  );
}

export function getPlayerOpponent(
  season: LeagueSeasonState,
  match = getCurrentPlayerMatch(season)
): LeagueTeamId | null {
  if (!match) return null;
  return match.homeTeamId === season.playerTeamId
    ? match.awayTeamId
    : match.homeTeamId;
}

export function sortedLeagueStandings(
  season: LeagueSeasonState
): LeagueStanding[] {
  return Object.values(season.standings).sort(
    (a, b) =>
      b.points - a.points ||
      b.capturesFor - b.capturesAgainst - (a.capturesFor - a.capturesAgainst) ||
      b.capturesFor - a.capturesFor ||
      a.teamId.localeCompare(b.teamId)
  );
}

function recordStanding(
  season: LeagueSeasonState,
  result: LeagueMatchResultRecord
): void {
  const blue = season.standings[result.blueTeamId];
  const red = season.standings[result.redTeamId];
  blue.played += 1;
  red.played += 1;
  blue.capturesFor += result.blueScore;
  blue.capturesAgainst += result.redScore;
  red.capturesFor += result.redScore;
  red.capturesAgainst += result.blueScore;
  if (result.blueScore > result.redScore) {
    blue.wins += 1;
    red.losses += 1;
    blue.points += 3;
  } else if (result.redScore > result.blueScore) {
    red.wins += 1;
    blue.losses += 1;
    red.points += 3;
  } else {
    blue.draws += 1;
    red.draws += 1;
    blue.points += 1;
    red.points += 1;
  }
}

function teamPower(season: LeagueSeasonState, teamId: LeagueTeamId): number {
  const roster = season.teamRosters[teamId];
  return roster.reduce((sum, id) => sum + leagueCharacter(id).rating, 0) / roster.length;
}

function addSimulatedCharacterStats(
  season: LeagueSeasonState,
  teamId: LeagueTeamId,
  goals: number,
  goalsAgainst: number,
  seed: number
): void {
  season.teamRosters[teamId].forEach((characterId, index) => {
    const stats = season.characterStats[characterId] ?? initialCharacterStats(characterId);
    const roll = random01(seed + index * 73);
    stats.matches += 1;
    stats.kills += Math.max(1, Math.round(3 + goals * 2 + roll * 5 - index));
    stats.deaths += Math.max(1, Math.round(3 + goalsAgainst * 2 + (1 - roll) * 4));
    stats.flagPickups += Math.max(goals, Math.round(goals + roll * 2));
    stats.flagCaptures += index === 0 ? Math.ceil(goals / 2) : Math.floor(goals / 2);
    stats.flagReturns += Math.round((1 - roll) * 2 + goalsAgainst * 0.5);
    season.characterStats[characterId] = stats;
  });
}

function simulateMatch(
  season: LeagueSeasonState,
  match: LeagueScheduledMatch
): LeagueMatchResultRecord {
  const seed = season.simulationSeed + hashText(match.id);
  const homePower = teamPower(season, match.homeTeamId);
  const awayPower = teamPower(season, match.awayTeamId);
  const homeRoll = random01(seed);
  const awayRoll = random01(seed + 991);
  const blueScore = Math.max(
    0,
    Math.min(3, Math.round(1.1 + (homePower - awayPower) / 13 + homeRoll * 1.8))
  );
  const redScore = Math.max(
    0,
    Math.min(3, Math.round(1.1 + (awayPower - homePower) / 13 + awayRoll * 1.8))
  );
  const result = {
    blueTeamId: match.homeTeamId,
    redTeamId: match.awayTeamId,
    blueScore,
    redScore,
  };
  addSimulatedCharacterStats(season, match.homeTeamId, blueScore, redScore, seed);
  addSimulatedCharacterStats(season, match.awayTeamId, redScore, blueScore, seed + 313);
  return result;
}

function recordPlayedCharacterStats(
  season: LeagueSeasonState,
  input: CompleteLeagueMatchInput,
  opponentId: LeagueTeamId
): void {
  const actorMap: Record<string, string | undefined> = {
    "blue-player": season.teamRosters[season.playerTeamId][0],
    "blue-player-2": season.teamRosters[season.playerTeamId][1],
    "red-player": season.teamRosters[opponentId][0],
    "red-player-2": season.teamRosters[opponentId][1],
  };
  const touched = new Set<string>();
  for (const row of input.stats) {
    const characterId = actorMap[row.actorId];
    if (!characterId) continue;
    const stats = season.characterStats[characterId] ?? initialCharacterStats(characterId);
    stats.matches += 1;
    stats.kills += row.kills;
    stats.deaths += row.deaths;
    stats.flagPickups += row.flagPickups;
    stats.flagCaptures += row.flagCaptures;
    stats.flagReturns += row.flagReturns;
    season.characterStats[characterId] = stats;
    touched.add(characterId);
  }
  for (const characterId of [
    ...season.teamRosters[season.playerTeamId],
    ...season.teamRosters[opponentId],
  ]) {
    if (touched.has(characterId)) continue;
    const stats = season.characterStats[characterId] ?? initialCharacterStats(characterId);
    stats.matches += 1;
    season.characterStats[characterId] = stats;
  }
}

function openRecruitment(season: LeagueSeasonState): void {
  const defeated = season.defeatedTeamIds;
  const fallbackOpponent = getPlayerOpponent({ ...season, currentRound: 0 });
  const sourceTeams = defeated.length > 0
    ? defeated
    : fallbackOpponent
      ? [fallbackOpponent]
      : [LEAGUE_TEAMS.find((team) => team.id !== season.playerTeamId)!.id];
  const candidateIds = sourceTeams
    .map((teamId) =>
      [...season.teamRosters[teamId]].sort(
        (a, b) => leagueCharacter(b).rating - leagueCharacter(a).rating
      )[0]
    )
    .filter((id): id is string => Boolean(id))
    .slice(0, 3);
  season.recruitment = {
    status: "pending",
    candidateIds: [...new Set(candidateIds)],
    selectedCharacterId: null,
  };
}

export function completeLeagueRound(
  season: LeagueSeasonState,
  input: CompleteLeagueMatchInput
): LeagueSeasonState {
  if (season.status !== "active") return season;
  if (input.seasonId !== season.seasonId) {
    throw new Error("League match context no longer matches the active season.");
  }
  const recordedMatch = season.rounds[input.roundIndex]?.matches.find(
    (match) => match.id === input.matchId
  );
  if (recordedMatch?.result) return season;
  if (input.roundIndex !== season.currentRound) {
    throw new Error("League match context no longer matches the active season.");
  }
  const round = season.rounds[season.currentRound];
  const playerMatch = getCurrentPlayerMatch(season);
  if (!round || !playerMatch || playerMatch.id !== input.matchId) {
    throw new Error("League match is not the current scheduled fixture.");
  }
  if (playerMatch.result) return season;

  const opponentId = getPlayerOpponent(season, playerMatch)!;
  const playerResult: LeagueMatchResultRecord = {
    blueTeamId: season.playerTeamId,
    redTeamId: opponentId,
    blueScore: Math.max(0, Math.trunc(input.blueScore)),
    redScore: Math.max(0, Math.trunc(input.redScore)),
  };
  playerMatch.result = playerResult;
  recordStanding(season, playerResult);
  recordPlayedCharacterStats(season, input, opponentId);
  if (
    playerResult.blueScore > playerResult.redScore &&
    !season.defeatedTeamIds.includes(opponentId)
  ) {
    season.defeatedTeamIds.push(opponentId);
  }

  for (const match of round.matches) {
    if (match.id === playerMatch.id || match.result) continue;
    match.result = simulateMatch(season, match);
    recordStanding(season, match.result);
  }

  season.currentRound += 1;
  if (season.currentRound === RECRUITMENT_ROUND) openRecruitment(season);
  if (season.currentRound >= season.rounds.length) season.status = "completed";
  season.updatedAt = new Date().toISOString();
  return season;
}

export function completeRecruitment(
  season: LeagueSeasonState,
  selectedCharacterId: string | null
): LeagueSeasonState {
  if (season.recruitment.status !== "pending") return season;
  if (selectedCharacterId !== null && !season.recruitment.candidateIds.includes(selectedCharacterId)) {
    throw new Error("Character is not available in this recruitment window.");
  }
  if (selectedCharacterId) {
    const currentCompanion = season.teamRosters[season.playerTeamId][1];
    const sourceTeam = LEAGUE_TEAMS.find((team) =>
      season.teamRosters[team.id].includes(selectedCharacterId)
    );
    if (!sourceTeam || sourceTeam.id === season.playerTeamId) {
      throw new Error("Recruitment candidate has no valid source team.");
    }
    const sourceIndex = season.teamRosters[sourceTeam.id].indexOf(selectedCharacterId);
    season.teamRosters[sourceTeam.id][sourceIndex] = currentCompanion;
    season.teamRosters[season.playerTeamId][1] = selectedCharacterId;
  }
  season.recruitment.status = "completed";
  season.recruitment.selectedCharacterId = selectedCharacterId;
  season.updatedAt = new Date().toISOString();
  return season;
}
