export type PremiumMapLightKind =
  | "helix-grow-lamp"
  | "temple-sun-brazier"
  | "foundry-service-lamp";

export interface PremiumMapLightingConfig {
  readonly mapId:
    | "helix-canopy-v2"
    | "drowned-sun-temple-v2"
    | "flow-circuit-v2";
  readonly kind: PremiumMapLightKind;
  readonly assetKey: string;
  readonly assetFile: string;
  readonly displaySize: number;
  readonly glowColor: number;
  readonly glowRadius: number;
  readonly interactionRadius: number;
  readonly positions: readonly Readonly<{ x: number; y: number }>[];
}

export interface PremiumMapLightState {
  readonly dimRemainingMs: number;
  readonly rearmRemainingMs: number;
  readonly reactionCount: number;
}

export const PREMIUM_MAP_LIGHTING = [
  {
    mapId: "helix-canopy-v2",
    kind: "helix-grow-lamp",
    assetKey: "helixGrowLamp",
    assetFile: "premium-cosmetics/helix-grow-lamp.png",
    displaySize: 74,
    glowColor: 0xb8ffe2,
    glowRadius: 52,
    interactionRadius: 100,
    positions: [
      { x: 220, y: 220 },
      { x: 220, y: 410 },
      { x: 220, y: 690 },
      { x: 220, y: 880 },
      { x: 1_988, y: 220 },
      { x: 1_988, y: 410 },
      { x: 1_988, y: 690 },
      { x: 1_988, y: 880 },
    ],
  },
  {
    mapId: "drowned-sun-temple-v2",
    kind: "temple-sun-brazier",
    assetKey: "templeSunBrazier",
    assetFile: "premium-cosmetics/temple-sun-brazier.png",
    displaySize: 76,
    glowColor: 0xffc55f,
    glowRadius: 54,
    interactionRadius: 92,
    positions: [
      { x: 420, y: 42 },
      { x: 900, y: 42 },
      { x: 1_380, y: 42 },
      { x: 1_860, y: 42 },
      { x: 420, y: 938 },
      { x: 900, y: 938 },
      { x: 1_380, y: 938 },
      { x: 1_860, y: 938 },
    ],
  },
  {
    mapId: "flow-circuit-v2",
    kind: "foundry-service-lamp",
    assetKey: "foundryServiceLamp",
    assetFile: "premium-cosmetics/foundry-service-lamp.png",
    displaySize: 72,
    glowColor: 0xffb24d,
    glowRadius: 50,
    interactionRadius: 86,
    positions: [
      { x: 420, y: 55 },
      { x: 650, y: 55 },
      { x: 1_790, y: 55 },
      { x: 2_020, y: 55 },
      { x: 420, y: 991 },
      { x: 650, y: 991 },
      { x: 1_790, y: 991 },
      { x: 2_020, y: 991 },
    ],
  },
] as const satisfies readonly PremiumMapLightingConfig[];

export function getPremiumMapLighting(
  mapId: string | null | undefined,
): PremiumMapLightingConfig | undefined {
  return PREMIUM_MAP_LIGHTING.find((config) => config.mapId === mapId);
}

export function createPremiumMapLightState(): PremiumMapLightState {
  return {
    dimRemainingMs: 0,
    rearmRemainingMs: 0,
    reactionCount: 0,
  };
}

export function advancePremiumMapLightState(
  state: Readonly<PremiumMapLightState>,
  deltaMs: number,
  projectileNear: boolean,
): PremiumMapLightState {
  const ms = Math.max(0, Math.min(100, deltaMs));
  const dimRemainingMs = Math.max(0, state.dimRemainingMs - ms);
  const rearmRemainingMs = Math.max(0, state.rearmRemainingMs - ms);
  if (projectileNear && rearmRemainingMs <= 0) {
    return {
      dimRemainingMs: 1_150,
      rearmRemainingMs: 1_700,
      reactionCount: state.reactionCount + 1,
    };
  }
  return {
    dimRemainingMs,
    rearmRemainingMs,
    reactionCount: state.reactionCount,
  };
}
