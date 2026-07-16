import {
  FOUNDERS_CIRCUIT_TEAM_IDS,
  LEAGUE_CHARACTERS,
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  STARTER_WINGMAN_IDS,
  type LeagueTeamId,
} from "./meta/league";
import { isPlayerSkinId } from "./playerSkinPreference";
import type { V2PlayerSkinId } from "./v2Route";

export const CAREER_PROFILE_VERSION = 1 as const;
export const CAREER_PROFILE_STORAGE_KEY = "core-arena.career-profile.v1";

export const CAREER_PLAYER_EMBLEMS = [
  { id: "comet-lance", label: "Comet Lance" },
  { id: "orbit-talon", label: "Orbit Talon" },
  { id: "rift-crown", label: "Rift Crown" },
] as const;

export type CareerEmblemId = (typeof CAREER_PLAYER_EMBLEMS)[number]["id"];

export interface CareerProfileDraft {
  callsign: string;
  teamName: string;
  emblemId: CareerEmblemId;
  captainSkinId: V2PlayerSkinId;
  selectedWingmanId: string;
}

export interface CareerProfile extends CareerProfileDraft {
  readonly version: typeof CAREER_PROFILE_VERSION;
  unlockedEmblemIds: CareerEmblemId[];
  unlockedWingmanIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CareerProfileStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const RANDOM_CALLSIGNS = [
  "Axiom",
  "Cipher",
  "Echo",
  "Morrow",
  "Rift",
  "Valkyr",
] as const;

const RANDOM_TEAM_NAMES = [
  "Apex Nomads",
  "Cinder Pact",
  "Echo Division",
  "Nova Coalition",
  "Rift Sentinels",
  "Steel Tempest",
] as const;

export function careerEmblemUrl(emblemId: CareerEmblemId): string {
  return `${import.meta.env?.BASE_URL ?? "/"}assets/league/player-emblems/${emblemId}-emblem.png`;
}

export function isCareerEmblemId(value: unknown): value is CareerEmblemId {
  return CAREER_PLAYER_EMBLEMS.some((emblem) => emblem.id === value);
}

export function normalizeCareerText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function randomCareerChoice<T>(
  choices: readonly T[],
  random: () => number = Math.random,
): T {
  const index = Math.min(
    choices.length - 1,
    Math.max(0, Math.floor(random() * choices.length)),
  );
  return choices[index];
}

export function randomCallsign(random: () => number = Math.random): string {
  return randomCareerChoice(RANDOM_CALLSIGNS, random);
}

export function randomTeamName(random: () => number = Math.random): string {
  return randomCareerChoice(RANDOM_TEAM_NAMES, random);
}

export function randomCareerEmblem(random: () => number = Math.random): CareerEmblemId {
  return randomCareerChoice(CAREER_PLAYER_EMBLEMS, random).id;
}

export function randomStarterWingman(random: () => number = Math.random): string {
  return randomCareerChoice(STARTER_WINGMAN_IDS, random);
}

export function createCareerProfile(
  draft: CareerProfileDraft,
  now = new Date().toISOString(),
): CareerProfile {
  const callsign = normalizeCareerText(draft.callsign, 20);
  const teamName = normalizeCareerText(draft.teamName, 28);
  if (callsign.length < 2 || teamName.length < 2) {
    throw new Error("Callsign and team name must contain at least two characters.");
  }
  if (!isCareerEmblemId(draft.emblemId)) {
    throw new Error("Unknown career emblem.");
  }
  if (!isPlayerSkinId(draft.captainSkinId)) {
    throw new Error("Unknown captain skin.");
  }
  if (!STARTER_WINGMAN_IDS.includes(
    draft.selectedWingmanId as (typeof STARTER_WINGMAN_IDS)[number],
  )) {
    throw new Error("The selected starter wingman is unavailable.");
  }
  return {
    version: CAREER_PROFILE_VERSION,
    callsign,
    teamName,
    emblemId: draft.emblemId,
    captainSkinId: draft.captainSkinId,
    selectedWingmanId: draft.selectedWingmanId,
    unlockedEmblemIds: CAREER_PLAYER_EMBLEMS.map((emblem) => emblem.id),
    unlockedWingmanIds: [...STARTER_WINGMAN_IDS],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateCareerProfile(
  current: CareerProfile,
  draft: CareerProfileDraft,
  now = new Date().toISOString(),
): CareerProfile {
  const callsign = normalizeCareerText(draft.callsign, 20);
  const teamName = normalizeCareerText(draft.teamName, 28);
  if (callsign.length < 2 || teamName.length < 2) {
    throw new Error("Callsign and team name must contain at least two characters.");
  }
  if (!current.unlockedEmblemIds.includes(draft.emblemId)) {
    throw new Error("That emblem is still locked.");
  }
  if (!isPlayerSkinId(draft.captainSkinId)) {
    throw new Error("Unknown captain skin.");
  }
  if (!current.unlockedWingmanIds.includes(draft.selectedWingmanId)) {
    throw new Error("That wingman is still locked.");
  }
  return {
    ...current,
    callsign,
    teamName,
    emblemId: draft.emblemId,
    captainSkinId: draft.captainSkinId,
    selectedWingmanId: draft.selectedWingmanId,
    updatedAt: now,
  };
}

export function syncCareerUnlocks(
  profile: CareerProfile,
  defeatedTeamIds: readonly LeagueTeamId[],
  now = new Date().toISOString(),
): boolean {
  const unlocked = new Set(profile.unlockedWingmanIds);
  for (const starterId of STARTER_WINGMAN_IDS) unlocked.add(starterId);
  for (const teamId of defeatedTeamIds) {
    if (teamId === PLAYER_LEAGUE_TEAM_ID) continue;
    const team = LEAGUE_TEAMS.find((candidate) => candidate.id === teamId);
    for (const characterId of team?.characterIds ?? []) unlocked.add(characterId);
  }
  const next = [...unlocked];
  if (
    next.length === profile.unlockedWingmanIds.length &&
    next.every((id) => profile.unlockedWingmanIds.includes(id))
  ) return false;
  profile.unlockedWingmanIds = next;
  profile.updatedAt = now;
  return true;
}

export function foundersRecruitableWingmanIds(): string[] {
  return FOUNDERS_CIRCUIT_TEAM_IDS
    .filter((teamId) => teamId !== PLAYER_LEAGUE_TEAM_ID)
    .flatMap((teamId) => [...LEAGUE_TEAMS.find((team) => team.id === teamId)!.characterIds]);
}

export function wingmanUnlockTeamId(characterId: string): LeagueTeamId | null {
  const character = LEAGUE_CHARACTERS.find((candidate) => candidate.id === characterId);
  if (!character || character.teamId === PLAYER_LEAGUE_TEAM_ID) return null;
  return character.teamId;
}

function isCareerProfile(value: unknown): value is CareerProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<CareerProfile>;
  const knownCharacters = new Set(LEAGUE_CHARACTERS.map((character) => character.id));
  return profile.version === CAREER_PROFILE_VERSION &&
    typeof profile.callsign === "string" &&
    normalizeCareerText(profile.callsign, 20) === profile.callsign &&
    profile.callsign.length >= 2 &&
    typeof profile.teamName === "string" &&
    normalizeCareerText(profile.teamName, 28) === profile.teamName &&
    profile.teamName.length >= 2 &&
    isCareerEmblemId(profile.emblemId) &&
    typeof profile.captainSkinId === "string" &&
    isPlayerSkinId(profile.captainSkinId) &&
    typeof profile.selectedWingmanId === "string" &&
    Array.isArray(profile.unlockedEmblemIds) &&
    profile.unlockedEmblemIds.every(isCareerEmblemId) &&
    Array.isArray(profile.unlockedWingmanIds) &&
    profile.unlockedWingmanIds.every((id) => knownCharacters.has(id)) &&
    profile.unlockedWingmanIds.includes(profile.selectedWingmanId) &&
    typeof profile.createdAt === "string" &&
    typeof profile.updatedAt === "string";
}

export function createCareerProfileRepository(storage: CareerProfileStoragePort) {
  return {
    load(): CareerProfile | null {
      try {
        const raw = storage.getItem(CAREER_PROFILE_STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isCareerProfile(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(profile: CareerProfile): void {
      storage.setItem(CAREER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    },
  };
}
