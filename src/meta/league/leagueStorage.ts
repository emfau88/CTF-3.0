import { LEAGUE_CHARACTERS, LEAGUE_TEAMS } from "./leagueCatalog";
import { LEAGUE_SAVE_VERSION, type LeagueSeasonState } from "./leagueTypes";

export const LEAGUE_STORAGE_KEY = "core-arena.league.v2";

export interface LeagueStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isValidSeason(value: unknown): value is LeagueSeasonState {
  if (!value || typeof value !== "object") return false;
  const season = value as Partial<LeagueSeasonState>;
  if (
    season.version !== LEAGUE_SAVE_VERSION ||
    typeof season.seasonId !== "string" ||
    typeof season.simulationSeed !== "number" ||
    !Number.isInteger(season.currentRound) ||
    season.currentRound! < 0 ||
    season.currentRound! > 3 ||
    (season.status !== "active" && season.status !== "completed") ||
    !Array.isArray(season.rounds) ||
    season.rounds.length !== 3 ||
    !Array.isArray(season.teamIds) ||
    season.teamIds.length !== 4 ||
    !season.standings ||
    !season.teamRosters ||
    !season.characterStats ||
    !season.recruitment ||
    !LEAGUE_TEAMS.some((team) => team.id === season.playerTeamId) ||
    !["locked", "pending", "completed"].includes(season.recruitment.status) ||
    !Array.isArray(season.recruitment.candidateIds)
  ) return false;
  const characterIds = new Set(LEAGUE_CHARACTERS.map((character) => character.id));
  const teamIds = new Set(LEAGUE_TEAMS.map((team) => team.id));
  const validTeams = LEAGUE_TEAMS.every(
    (team) =>
      Array.isArray(season.teamRosters?.[team.id]) &&
      season.teamRosters![team.id].length === 2 &&
      season.teamRosters![team.id].every((id) => characterIds.has(id)) &&
      Boolean(season.standings?.[team.id]) &&
      Number.isFinite(season.standings![team.id].points) &&
      Number.isFinite(season.standings![team.id].played)
  );
  const validRounds = season.rounds.every((round, index) =>
    round.index === index &&
    Array.isArray(round.matches) &&
    round.matches.length === 2 &&
    round.matches.every((match) =>
      match.roundIndex === index &&
      teamIds.has(match.homeTeamId) &&
      teamIds.has(match.awayTeamId) &&
      season.teamIds!.includes(match.homeTeamId) &&
      season.teamIds!.includes(match.awayTeamId) &&
      match.homeTeamId !== match.awayTeamId
    )
  );
  const validProgression = season.lastProgression === null || (
    typeof season.lastProgression === "object" &&
    typeof season.lastProgression.acknowledged === "boolean"
  );
  return validTeams && validRounds && validProgression;
}

export function createLeagueRepository(storage: LeagueStoragePort) {
  return {
    load(): LeagueSeasonState | null {
      try {
        const raw = storage.getItem(LEAGUE_STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isValidSeason(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(season: LeagueSeasonState): void {
      storage.setItem(LEAGUE_STORAGE_KEY, JSON.stringify(season));
    },
    clear(): void {
      storage.removeItem(LEAGUE_STORAGE_KEY);
    },
  };
}
