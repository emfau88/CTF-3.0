import type { GameModeId, MatchStatEntry } from "./core";

export type MatchStatsColumnId =
  | "player"
  | "kills"
  | "deaths"
  | "ratio"
  | "captures"
  | "returns"
  | "impact";

export interface MatchStatsColumn {
  readonly id: MatchStatsColumnId;
  readonly label: string;
  readonly title?: string;
  readonly value: (entry: MatchStatEntry) => string;
}

const PLAYER_COLUMN: MatchStatsColumn = {
  id: "player",
  label: "Player",
  value: () => "",
};
const COMBAT_COLUMNS: readonly MatchStatsColumn[] = [
  { id: "kills", label: "K", value: (entry) => String(entry.kills) },
  { id: "deaths", label: "D", value: (entry) => String(entry.deaths) },
  { id: "ratio", label: "K/D", value: formatKillDeathRatio },
];
const OBJECTIVE_COLUMNS: readonly MatchStatsColumn[] = [
  { id: "captures", label: "Cap", value: (entry) => String(entry.flagCaptures) },
  { id: "returns", label: "Ret", value: (entry) => String(entry.flagReturns) },
];
const IMPACT_COLUMN: MatchStatsColumn = {
  id: "impact",
  label: "Impact",
  title: "Kills and objective contribution, reduced by deaths",
  value: (entry) => String(calculateMatchImpact(entry)),
};

export function matchStatsColumns(modeId: GameModeId): readonly MatchStatsColumn[] {
  return modeId === "team-deathmatch"
    ? [PLAYER_COLUMN, ...COMBAT_COLUMNS, IMPACT_COLUMN]
    : [PLAYER_COLUMN, ...COMBAT_COLUMNS, ...OBJECTIVE_COLUMNS, IMPACT_COLUMN];
}

export function calculateMatchImpact(entry: MatchStatEntry): number {
  return Math.max(
    0,
    entry.kills * 100 +
      entry.flagCaptures * 350 +
      entry.flagReturns * 150 +
      entry.flagPickups * 25 -
      entry.deaths * 30,
  );
}

export function compareMatchImpact(a: MatchStatEntry, b: MatchStatEntry): number {
  return calculateMatchImpact(b) - calculateMatchImpact(a) ||
    b.kills - a.kills || a.deaths - b.deaths ||
    a.actorId.localeCompare(b.actorId);
}

export function formatKillDeathRatio(entry: MatchStatEntry): string {
  if (entry.deaths === 0) return entry.kills === 0 ? "0.0" : `${entry.kills}.0`;
  return (entry.kills / entry.deaths).toFixed(1);
}
