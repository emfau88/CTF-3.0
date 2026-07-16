import {
  buildV2MatchSearch,
  migrateV2PlayerSkinId,
  type V2ControlsMode,
  type V2PlayerSkinId,
  type V2SfxMode,
} from "../../v2Route";
import {
  foundersCircuitDiscipline,
  leagueCharacter,
  LEAGUE_TEAMS,
} from "./leagueCatalog";
import { getCurrentPlayerMatch, getPlayerOpponent } from "./leagueSeason";
import type { LeagueSeasonState, LeagueTeamId } from "./leagueTypes";

export interface LeagueMatchContext {
  readonly seasonId: string;
  readonly roundIndex: number;
  readonly matchId: string;
  readonly opponentId: LeagueTeamId;
}

export interface LeagueMatchRosterPresentation {
  readonly captainSkinId: V2PlayerSkinId;
  readonly playerWingmanSkinId: V2PlayerSkinId;
  readonly opponentSkinIds: readonly [V2PlayerSkinId, V2PlayerSkinId];
}

const LEAGUE_WINGMAN_SKIN_PARAM = "leagueWingmanSkin";
const LEAGUE_OPPONENT_ONE_SKIN_PARAM = "leagueOpponentSkin1";
const LEAGUE_OPPONENT_TWO_SKIN_PARAM = "leagueOpponentSkin2";

export function readLeagueMatchContext(search: URLSearchParams): LeagueMatchContext | null {
  const roundIndex = Number(search.get("leagueRound"));
  const opponentId = search.get("leagueOpponent") as LeagueTeamId | null;
  const seasonId = search.get("leagueSeason");
  const matchId = search.get("leagueMatch");
  if (
    search.get("league") !== "1" ||
    !seasonId ||
    !matchId ||
    !opponentId ||
    !LEAGUE_TEAMS.some((team) => team.id === opponentId) ||
    !Number.isInteger(roundIndex) ||
    roundIndex < 0
  ) return null;
  return { seasonId, roundIndex, matchId, opponentId };
}

export function readLeagueMatchRosterPresentation(
  search: URLSearchParams,
): LeagueMatchRosterPresentation | null {
  if (!readLeagueMatchContext(search)) return null;
  const captainSkinId = migrateV2PlayerSkinId(search.get("skin"));
  const playerWingmanSkinId = migrateV2PlayerSkinId(
    search.get(LEAGUE_WINGMAN_SKIN_PARAM),
  );
  const opponentOneSkinId = migrateV2PlayerSkinId(
    search.get(LEAGUE_OPPONENT_ONE_SKIN_PARAM),
  );
  const opponentTwoSkinId = migrateV2PlayerSkinId(
    search.get(LEAGUE_OPPONENT_TWO_SKIN_PARAM),
  );
  if (
    !captainSkinId ||
    !playerWingmanSkinId ||
    !opponentOneSkinId ||
    !opponentTwoSkinId
  ) return null;
  return {
    captainSkinId,
    playerWingmanSkinId,
    opponentSkinIds: [opponentOneSkinId, opponentTwoSkinId],
  };
}

export function buildLeagueMatchSearch(
  season: LeagueSeasonState,
  preferences: {
    controls?: V2ControlsMode;
    sfx?: V2SfxMode;
    skin?: V2PlayerSkinId;
  } = {}
): string {
  const match = getCurrentPlayerMatch(season);
  const opponentId = getPlayerOpponent(season, match);
  if (!match || !opponentId) throw new Error("No league fixture is ready to play.");
  const playerWingmanId = season.teamRosters[season.playerTeamId]?.[1];
  const opponentRoster = season.teamRosters[opponentId];
  if (!playerWingmanId || opponentRoster?.length !== 2) {
    throw new Error("League fixture has no complete cosmetic roster.");
  }
  const discipline = foundersCircuitDiscipline(season.currentRound);
  const params = new URLSearchParams(buildV2MatchSearch({
    mode: discipline.mode,
    map: discipline.mapId,
    players: "bot",
    teamSize: 2,
    controls: preferences.controls ?? "auto",
    skin: preferences.skin ?? "alien-runner",
    sfx: preferences.sfx ?? "on",
  }));
  params.set("league", "1");
  params.set("leagueSeason", season.seasonId);
  params.set("leagueRound", String(season.currentRound));
  params.set("leagueMatch", match.id);
  params.set("leagueOpponent", opponentId);
  params.set(
    LEAGUE_WINGMAN_SKIN_PARAM,
    leagueCharacter(playerWingmanId).skinId,
  );
  params.set(
    LEAGUE_OPPONENT_ONE_SKIN_PARAM,
    leagueCharacter(opponentRoster[0]).skinId,
  );
  params.set(
    LEAGUE_OPPONENT_TWO_SKIN_PARAM,
    leagueCharacter(opponentRoster[1]).skinId,
  );
  return params.toString();
}

export function buildLeagueHubSearch(): string {
  return new URLSearchParams({ scene: "v2", menu: "1", leagueHub: "1" }).toString();
}
