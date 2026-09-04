import { leagueCircuit } from "./leagueCatalog";
import { createLeagueSeason, sortedLeagueStandings } from "./leagueSeason";
import type {
  LeagueCareerState,
  LeaguePlayableCircuitId,
  LeagueSeasonState,
} from "./leagueTypes";
import { LEAGUE_CAREER_SAVE_VERSION } from "./leagueTypes";

function attemptSeed(
  seed: number,
  circuitId: LeaguePlayableCircuitId,
  attempt: number,
): number {
  const circuitOffset = circuitId === "proving" ? 0 : 10_007;
  return Math.abs(Math.trunc(seed)) + circuitOffset + attempt * 97;
}

function createAttempt(
  seed: number,
  wingmanId: string,
  circuitId: LeaguePlayableCircuitId,
  attempt: number,
): LeagueSeasonState {
  return createLeagueSeason(
    attemptSeed(seed, circuitId, attempt),
    wingmanId,
    circuitId,
  );
}

export function createLeagueCareer(
  seed: number,
  wingmanId: string,
): LeagueCareerState {
  const attempt = 1;
  return {
    version: LEAGUE_CAREER_SAVE_VERSION,
    activeCircuitId: "proving",
    attempts: { proving: attempt, contender: 0 },
    qualifiedCircuitIds: [],
    season: createAttempt(seed, wingmanId, "proving", attempt),
    updatedAt: new Date().toISOString(),
  };
}

export function migrateLeagueSeasonToCareer(
  season: LeagueSeasonState,
): LeagueCareerState {
  const circuitId = season.circuitId === "contender" ? "contender" : "proving";
  if (!season.circuitId) {
    (season as { circuitId?: LeaguePlayableCircuitId }).circuitId = circuitId;
  }
  return {
    version: LEAGUE_CAREER_SAVE_VERSION,
    activeCircuitId: circuitId,
    attempts: { proving: circuitId === "proving" ? 1 : 0, contender: circuitId === "contender" ? 1 : 0 },
    qualifiedCircuitIds: [],
    season,
    updatedAt: season.updatedAt,
  };
}

export function leagueCareerPosition(career: LeagueCareerState): number {
  return sortedLeagueStandings(career.season).findIndex(
    (standing) => standing.teamId === career.season.playerTeamId,
  ) + 1;
}

export function isLeagueCareerQualified(career: LeagueCareerState): boolean {
  if (career.season.status !== "completed" || career.season.recruitment.status === "pending") {
    return false;
  }
  const circuit = leagueCircuit(career.activeCircuitId);
  return circuit.advancementRule === "top-two" && leagueCareerPosition(career) <= 2;
}

export function canAdvanceLeagueCareer(career: LeagueCareerState): boolean {
  return career.activeCircuitId === "proving" && isLeagueCareerQualified(career);
}

export function advanceLeagueCareer(
  career: LeagueCareerState,
  seed: number,
  wingmanId: string,
): LeagueCareerState {
  if (!canAdvanceLeagueCareer(career)) {
    throw new Error("The current circuit has not qualified for Contender.");
  }
  if (!career.qualifiedCircuitIds.includes("proving")) {
    career.qualifiedCircuitIds.push("proving");
  }
  career.activeCircuitId = "contender";
  career.attempts.contender += 1;
  career.season = createAttempt(seed, wingmanId, "contender", career.attempts.contender);
  career.updatedAt = new Date().toISOString();
  return career;
}

export function canRetryLeagueCareerCircuit(career: LeagueCareerState): boolean {
  return career.season.status === "completed" && !isLeagueCareerQualified(career);
}

export function retryLeagueCareerCircuit(
  career: LeagueCareerState,
  seed: number,
  wingmanId: string,
): LeagueCareerState {
  if (!canRetryLeagueCareerCircuit(career)) {
    throw new Error("The current circuit is not eligible for a retry.");
  }
  const circuitId = career.activeCircuitId;
  career.attempts[circuitId] += 1;
  career.season = createAttempt(seed, wingmanId, circuitId, career.attempts[circuitId]);
  career.updatedAt = new Date().toISOString();
  return career;
}
