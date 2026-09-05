import { LEAGUE_CHARACTERS, LEAGUE_CIRCUITS, LEAGUE_TEAMS } from "./leagueCatalog";
import { migrateLeagueSeasonToCareer } from "./leagueCareer";
import { CAREER_PROFILE_STORAGE_KEY, isCareerProfile, type CareerProfile } from "../../careerProfile";
import { CareerSaveError } from "../../careerSaveGuard";
import {
  LEAGUE_CAREER_SAVE_VERSION,
  LEAGUE_SAVE_VERSION,
  type LeagueCharacterStats,
  type LeagueCareerState,
  type LeagueSeasonState,
} from "./leagueTypes";

export const LEAGUE_STORAGE_KEY = "core-arena.league.v2";
export const LEAGUE_CAREER_STORAGE_KEY = "core-arena.league.v3";
export const LEAGUE_MIGRATION_PROFILE_BACKUP_KEY = `${CAREER_PROFILE_STORAGE_KEY}.pre-league-v3`;
export const LEAGUE_RESET_BACKUP_KEY = "core-arena.league.before-reset";

export interface LeagueStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isValidLeagueSeason(value: unknown): value is LeagueSeasonState {
  if (!value || typeof value !== "object") return false;
  const season = value as Partial<LeagueSeasonState>;
  if (
    season.version !== LEAGUE_SAVE_VERSION ||
    typeof season.seasonId !== "string" ||
    typeof season.simulationSeed !== "number" ||
    (season.circuitId !== undefined &&
      !LEAGUE_CIRCUITS.some((circuit) => circuit.id === season.circuitId)) ||
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
    !Array.isArray(season.defeatedTeamIds) ||
    !season.recruitment ||
    !LEAGUE_TEAMS.some((team) => team.id === season.playerTeamId) ||
    !["locked", "pending", "completed"].includes(season.recruitment.status) ||
    !Array.isArray(season.recruitment.candidateIds) ||
    season.recruitment.candidateIds.some((id) =>
      typeof id !== "string" ||
      !LEAGUE_CHARACTERS.some((character) => character.id === id)
    ) ||
    (
      season.recruitment.selectedCharacterId !== null &&
      typeof season.recruitment.selectedCharacterId !== "string"
    )
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
  const validDefeatedTeams = season.defeatedTeamIds.every((teamId) =>
    teamIds.has(teamId) && teamId !== season.playerTeamId
  );
  const validCharacterStats = Object.entries(season.characterStats).every(
    ([key, value]) => isValidCharacterStats(key, value, characterIds, teamIds),
  );
  return validTeams && validRounds && validProgression &&
    validDefeatedTeams && validCharacterStats;
}

function isValidCareer(value: unknown): value is LeagueCareerState {
  if (!value || typeof value !== "object") return false;
  const career = value as Partial<LeagueCareerState>;
  if (
    career.version !== LEAGUE_CAREER_SAVE_VERSION ||
    (career.revision !== undefined && (!Number.isSafeInteger(career.revision) || career.revision < 0)) ||
    (career.profile !== undefined && !isCareerProfile(career.profile)) ||
    (career.activeCircuitId !== "proving" && career.activeCircuitId !== "contender") ||
    !career.attempts ||
    !Number.isInteger(career.attempts.proving) || career.attempts.proving < 0 ||
    !Number.isInteger(career.attempts.contender) || career.attempts.contender < 0 ||
    !Array.isArray(career.qualifiedCircuitIds) ||
    career.qualifiedCircuitIds.some((id) =>
      !LEAGUE_CIRCUITS.some((circuit) => circuit.id === id)
    ) ||
    !isValidLeagueSeason(career.season) ||
    (career.season.circuitId ?? "proving") !== career.activeCircuitId ||
    typeof career.updatedAt !== "string"
  ) return false;
  return career.attempts[career.activeCircuitId] > 0;
}

function isValidCharacterStats(
  key: string,
  value: unknown,
  characterIds: ReadonlySet<string>,
  teamIds: ReadonlySet<string>,
): value is LeagueCharacterStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as Partial<LeagueCharacterStats>;
  if (
    typeof stats.characterId !== "string" ||
    !characterIds.has(stats.characterId) ||
    ![stats.matches, stats.kills, stats.deaths, stats.flagPickups,
      stats.flagCaptures, stats.flagReturns].every(Number.isFinite)
  ) return false;
  if (stats.teamId === undefined) return key === stats.characterId;
  return teamIds.has(stats.teamId) && key === `${stats.teamId}:${stats.characterId}`;
}

function normalizeRecruitment(season: LeagueSeasonState): LeagueSeasonState {
  if (season.recruitment.status !== "pending") return season;
  const candidateIds = [...new Set(season.recruitment.candidateIds)].filter(
    (characterId) => {
      const character = LEAGUE_CHARACTERS.find((entry) => entry.id === characterId);
      return Boolean(
        character &&
        character.teamId !== season.playerTeamId &&
        season.defeatedTeamIds.includes(character.teamId),
      );
    },
  );
  if (candidateIds.length > 0) {
    season.recruitment = {
      status: "pending",
      candidateIds,
      selectedCharacterId: null,
    };
    return season;
  }
  season.recruitment = {
    status: "completed",
    candidateIds: [],
    selectedCharacterId: null,
  };
  return season;
}

function normalizeRivalRosters(season: LeagueSeasonState): LeagueSeasonState {
  for (const team of LEAGUE_TEAMS) {
    if (team.id === season.playerTeamId) continue;
    season.teamRosters[team.id] = [...team.characterIds];
  }
  return season;
}

export function createLeagueRepository(storage: LeagueStoragePort) {
  return {
    load(): LeagueSeasonState | null {
      try {
        const raw = storage.getItem(LEAGUE_STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isValidLeagueSeason(parsed)
          ? normalizeRecruitment(normalizeRivalRosters(parsed))
          : null;
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

export function createLeagueCareerRepository(storage: LeagueStoragePort) {
  type Snapshot = { career: string | null; legacy: string | null; profile: string | null };
  let expected: Snapshot | undefined;
  const read = (): Snapshot => {
    try {
      return {
        career: storage.getItem(LEAGUE_CAREER_STORAGE_KEY),
        legacy: storage.getItem(LEAGUE_STORAGE_KEY),
        profile: storage.getItem(CAREER_PROFILE_STORAGE_KEY),
      };
    } catch { throw new CareerSaveError("read"); }
  };
  const parse = (raw: string): unknown => {
    try { return JSON.parse(raw); }
    catch { throw new CareerSaveError("corrupt"); }
  };
  const checkVersion = (value: unknown, version: number): void => {
    if (value && typeof value === "object" && "version" in value && value.version !== version) {
      throw new CareerSaveError("version");
    }
  };
  const assertCurrent = (): Snapshot => {
    const current = read();
    if (!expected) {
      if (current.career || current.legacy) throw new CareerSaveError("stale");
      expected = current;
    }
    if (Object.keys(current).some((key) => current[key as keyof Snapshot] !== expected![key as keyof Snapshot])) {
      throw new CareerSaveError("stale");
    }
    return current;
  };
  const write = (key: string, raw: string): void => {
    try { storage.setItem(key, raw); }
    catch { throw new CareerSaveError("write"); }
  };
  const profileFrom = (snapshot: Snapshot): CareerProfile | null => {
    if (snapshot.career) {
      const value = parse(snapshot.career) as { profile?: unknown } | null;
      if (value?.profile !== undefined && value.profile !== null) {
        if (!isCareerProfile(value.profile)) throw new CareerSaveError("corrupt");
        return value.profile;
      }
    }
    if (snapshot.profile === null) return null;
    const profile = parse(snapshot.profile);
    checkVersion(profile, 1);
    if (!isCareerProfile(profile)) throw new CareerSaveError("corrupt");
    return profile;
  };
  return {
    load(): LeagueCareerState | null {
      const snapshot = read();
      expected = undefined;
      let career: LeagueCareerState | null = null;
      if (snapshot.career !== null) {
        const parsed = parse(snapshot.career);
        checkVersion(parsed, LEAGUE_CAREER_SAVE_VERSION);
        if (isResetMarker(parsed)) {
          profileFrom(snapshot);
        } else {
          try {
            if (!isValidCareer(parsed)) throw new CareerSaveError("corrupt");
          } catch { throw new CareerSaveError("corrupt"); }
          career = normalizeCareer(parsed);
        }
      } else if (snapshot.legacy !== null) {
        const legacy = parse(snapshot.legacy);
        checkVersion(legacy, LEAGUE_SAVE_VERSION);
        try {
          if (!isValidLeagueSeason(legacy)) throw new CareerSaveError("corrupt");
        } catch { throw new CareerSaveError("corrupt"); }
        career = migrateLeagueSeasonToCareer(normalizeRecruitment(normalizeRivalRosters(legacy as LeagueSeasonState)));
      }
      const profile = profileFrom(snapshot);
      if (career && profile) career.profile = profile;
      expected = snapshot;
      return career;
    },
    loadProfile(): CareerProfile | null {
      return profileFrom(expected ?? read());
    },
    /** Production callers hold withCareerSaveLock across this synchronous transaction. */
    save(career: LeagueCareerState, profile = career.profile): void {
      const snapshot = assertCurrent();
      const next = { ...career, revision: (career.revision ?? 0) + 1, ...(profile ? { profile } : {}) };
      if (!isValidCareer(next)) throw new CareerSaveError("corrupt");
      if (snapshot.career === null && snapshot.legacy !== null && snapshot.profile !== null) {
        try {
          if (storage.getItem(LEAGUE_MIGRATION_PROFILE_BACKUP_KEY) === null) {
            write(LEAGUE_MIGRATION_PROFILE_BACKUP_KEY, snapshot.profile);
          }
        } catch { throw new CareerSaveError("write"); }
      }
      const raw = JSON.stringify(next);
      write(LEAGUE_CAREER_STORAGE_KEY, raw);
      expected = { ...snapshot, career: raw };
      Object.assign(career, next);
      // The V3 document is authoritative even if this compatibility mirror fails.
      if (profile) {
        const profileRaw = JSON.stringify(profile);
        try {
          storage.setItem(CAREER_PROFILE_STORAGE_KEY, profileRaw);
          expected.profile = profileRaw;
        } catch { /* Read the committed embedded profile on the next load. */ }
      }
    },
    saveProfile(profile: CareerProfile): void {
      const snapshot = assertCurrent();
      const reset = snapshot.career !== null && isResetMarker(parse(snapshot.career));
      if (!reset && (snapshot.career !== null || snapshot.legacy !== null)) {
        throw new CareerSaveError("stale");
      }
      if (!isCareerProfile(profile)) throw new CareerSaveError("corrupt");
      const raw = JSON.stringify(profile);
      if (reset) {
        const marker = JSON.stringify({ version: 3, reset: true, profile });
        write(LEAGUE_CAREER_STORAGE_KEY, marker);
        expected = { ...snapshot, career: marker };
        return;
      }
      write(CAREER_PROFILE_STORAGE_KEY, raw);
      expected = { ...snapshot, profile: raw };
    },
    clear(): void {
      const snapshot = assertCurrent();
      const profile = profileFrom(snapshot);
      write(LEAGUE_RESET_BACKUP_KEY, JSON.stringify(snapshot));
      // One atomic marker prevents an old V2 season resurfacing after a partial reset.
      const raw = JSON.stringify({ version: 3, reset: true, profile });
      write(LEAGUE_CAREER_STORAGE_KEY, raw);
      expected = { ...snapshot, career: raw };
    },
    exportBackup(): string {
      return JSON.stringify(read(), null, 2);
    },
  };
}

function isResetMarker(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "version" in value && value.version === 3 &&
    "reset" in value && value.reset === true && "profile" in value &&
    (value.profile === null || isCareerProfile(value.profile)));
}

function normalizeCareer(career: LeagueCareerState): LeagueCareerState {
  normalizeRecruitment(normalizeRivalRosters(career.season));
  return career;
}
