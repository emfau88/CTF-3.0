export type PremiumMapCosmeticKind =
  | "curious-bloom"
  | "grumpy-frog";

export interface PremiumMapCosmeticConfig {
  readonly mapId:
    | "helix-canopy-v2"
    | "drowned-sun-temple-v2"
    | "flow-circuit-v2";
  readonly kind: PremiumMapCosmeticKind;
  readonly assetKey: string;
  readonly assetFile: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly displaySize: number;
  readonly reactionRadius: number;
  readonly reactionDurationMs: number;
  readonly rearmDelayMs: number;
  readonly reactionReturnDelayMs?: number;
}

export interface PremiumMapCosmeticState {
  readonly elapsedMs: number;
  readonly reactionRemainingMs: number;
  readonly rearmRemainingMs: number;
  readonly reactionCount: number;
}

export const PREMIUM_MAP_COSMETICS = [
  {
    mapId: "drowned-sun-temple-v2",
    kind: "grumpy-frog",
    assetKey: "templeGrumpyFrog",
    assetFile: "premium-cosmetics/temple-grumpy-frog.png",
    position: { x: 52, y: 650 },
    displaySize: 66,
    reactionRadius: 150,
    reactionDurationMs: 12_000,
    rearmDelayMs: 14_000,
    reactionReturnDelayMs: 10_500,
  },
] as const satisfies readonly PremiumMapCosmeticConfig[];

export function getPremiumMapCosmetic(
  mapId: string | null | undefined,
): PremiumMapCosmeticConfig | undefined {
  return PREMIUM_MAP_COSMETICS.find((cosmetic) =>
    cosmetic.mapId === mapId
  );
}

export function createPremiumMapCosmeticState():
  PremiumMapCosmeticState {
  return {
    elapsedMs: 0,
    reactionRemainingMs: 0,
    rearmRemainingMs: 0,
    reactionCount: 0,
  };
}

export function advancePremiumMapCosmeticState(
  state: Readonly<PremiumMapCosmeticState>,
  config: Readonly<PremiumMapCosmeticConfig>,
  deltaMs: number,
  hasNearbyActivity: boolean,
): PremiumMapCosmeticState {
  const elapsedDeltaMs = Math.max(0, Math.min(deltaMs, 100));
  const reactionRemainingMs = Math.max(
    0,
    state.reactionRemainingMs - elapsedDeltaMs,
  );
  const rearmRemainingMs = Math.max(
    0,
    state.rearmRemainingMs - elapsedDeltaMs,
  );
  if (
    hasNearbyActivity &&
    reactionRemainingMs <= 0 &&
    rearmRemainingMs <= 0
  ) {
    return {
      elapsedMs: state.elapsedMs + elapsedDeltaMs,
      reactionRemainingMs: config.reactionDurationMs,
      rearmRemainingMs: config.rearmDelayMs,
      reactionCount: state.reactionCount + 1,
    };
  }
  return {
    elapsedMs: state.elapsedMs + elapsedDeltaMs,
    reactionRemainingMs,
    rearmRemainingMs,
    reactionCount: state.reactionCount,
  };
}
