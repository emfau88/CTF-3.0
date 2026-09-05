import type { V2PlayerSkinId } from "../../v2Route";
import type { BotArchetypeId } from "../../core/bots";
import type { CareerProfile } from "../../careerProfile";

export const LEAGUE_SAVE_VERSION = 2 as const;
export const LEAGUE_CAREER_SAVE_VERSION = 3 as const;

export type LeagueTeamId =
  | "iron-vanguard"
  | "crimson-jackals"
  | "neon-phantoms"
  | "grave-circuit"
  | "solar-wardens"
  | "void-runners";

/**
 * A circuit identifies the fixed three-match season ruleset. It is optional
 * on persisted V2 saves so existing Proving saves remain loadable until the
 * career-save migration in the next bulk.
 */
export type LeagueCircuitId = "proving" | "contender" | "apex";
export type LeaguePlayableCircuitId = "proving" | "contender";

export interface LeagueCharacterDefinition {
  readonly id: string;
  readonly name: string;
  readonly teamId: LeagueTeamId;
  readonly visualStyle: string;
  readonly personality: string;
  readonly skinId: V2PlayerSkinId;
  readonly archetypeId: BotArchetypeId;
}

export interface LeagueTeamDefinition {
  readonly id: LeagueTeamId;
  readonly name: string;
  readonly shortName: string;
  readonly motto: string;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly characterIds: readonly [string, string];
  readonly simulationProfile: {
    readonly attack: number;
    readonly defense: number;
    readonly objective: number;
    readonly consistency: number;
  };
}

export interface LeagueProgressionEvent {
  readonly id: string;
  readonly roundIndex: number;
  readonly opponentId: LeagueTeamId;
  readonly blueScore: number;
  readonly redScore: number;
  readonly previousPosition: number;
  readonly newPosition: number;
  readonly previousPoints: number;
  readonly newPoints: number;
  readonly promoted: boolean;
  acknowledged: boolean;
}

export interface LeagueStanding {
  readonly teamId: LeagueTeamId;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  capturesFor: number;
  capturesAgainst: number;
}

export interface LeagueCharacterStats {
  readonly characterId: string;
  readonly teamId?: LeagueTeamId;
  matches: number;
  kills: number;
  deaths: number;
  flagPickups: number;
  flagCaptures: number;
  flagReturns: number;
}

export interface LeagueMatchResultRecord {
  readonly blueTeamId: LeagueTeamId;
  readonly redTeamId: LeagueTeamId;
  readonly blueScore: number;
  readonly redScore: number;
}

export interface LeagueScheduledMatch {
  readonly id: string;
  readonly roundIndex: number;
  readonly homeTeamId: LeagueTeamId;
  readonly awayTeamId: LeagueTeamId;
  result: LeagueMatchResultRecord | null;
}

export interface LeagueRound {
  readonly index: number;
  readonly matches: LeagueScheduledMatch[];
}

export interface LeagueRecruitmentState {
  status: "locked" | "pending" | "completed";
  candidateIds: string[];
  selectedCharacterId: string | null;
}

export interface LeagueSeasonState {
  readonly version: typeof LEAGUE_SAVE_VERSION;
  readonly seasonId: string;
  readonly simulationSeed: number;
  readonly circuitId?: LeagueCircuitId;
  status: "active" | "completed";
  currentRound: number;
  readonly playerTeamId: LeagueTeamId;
  readonly teamIds: LeagueTeamId[];
  teamRosters: Record<LeagueTeamId, string[]>;
  standings: Record<LeagueTeamId, LeagueStanding>;
  characterStats: Record<string, LeagueCharacterStats>;
  rounds: LeagueRound[];
  defeatedTeamIds: LeagueTeamId[];
  recruitment: LeagueRecruitmentState;
  lastProgression: LeagueProgressionEvent | null;
  updatedAt: string;
}

/**
 * The small V3 envelope keeps the active three-match season and the minimum
 * cross-circuit progress needed for Proving → Contender. Career identity and
 * unlocked fighters remain in the existing career profile.
 */
export interface LeagueCareerState {
  readonly version: typeof LEAGUE_CAREER_SAVE_VERSION;
  revision?: number;
  /** Committed together with the season; the separate profile key is a mirror. */
  profile?: CareerProfile;
  activeCircuitId: LeaguePlayableCircuitId;
  attempts: Record<LeaguePlayableCircuitId, number>;
  qualifiedCircuitIds: LeagueCircuitId[];
  season: LeagueSeasonState;
  updatedAt: string;
}

export interface LeagueMatchStatInput {
  readonly actorId: string;
  readonly kills: number;
  readonly deaths: number;
  readonly flagPickups: number;
  readonly flagCaptures: number;
  readonly flagReturns: number;
}

export interface CompleteLeagueMatchInput {
  readonly seasonId: string;
  readonly matchId: string;
  readonly roundIndex: number;
  readonly blueScore: number;
  readonly redScore: number;
  readonly stats: readonly LeagueMatchStatInput[];
}
