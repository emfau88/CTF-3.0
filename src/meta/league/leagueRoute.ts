import {
  buildV2MatchSearch,
  type V2ControlsMode,
  type V2PlayerSkinId,
  type V2SfxMode,
} from "../../v2Route";
import { LEAGUE_TEAMS } from "./leagueCatalog";
import { getCurrentPlayerMatch, getPlayerOpponent } from "./leagueSeason";
import type { LeagueSeasonState, LeagueTeamId } from "./leagueTypes";

export interface LeagueMatchContext {
  readonly seasonId: string;
  readonly roundIndex: number;
  readonly matchId: string;
  readonly opponentId: LeagueTeamId;
}

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
  const params = new URLSearchParams(buildV2MatchSearch({
    mode: "ctf",
    map: "flow-circuit-v2",
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
  return params.toString();
}

export function buildLeagueHubSearch(): string {
  return new URLSearchParams({ scene: "v2", menu: "1", leagueHub: "1" }).toString();
}
