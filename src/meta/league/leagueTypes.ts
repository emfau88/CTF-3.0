import type { V2PlayerSkinId } from "../../v2Route";

export const LEAGUE_SAVE_VERSION = 2 as const;

export type LeagueTeamId =
  | "iron-vanguard"
  | "crimson-jackals"
  | "neon-phantoms"
  | "grave-circuit"
  | "solar-wardens"
  | "void-runners";

export interface LeagueCharacterDefinition {
  readonly id: string;
  readonly name: string;
  readonly teamId: LeagueTeamId;
  readonly visualStyle: string;
  readonly personality: string;
  readonly skinId: V2PlayerSkinId;
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
