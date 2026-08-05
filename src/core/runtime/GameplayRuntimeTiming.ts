export interface GameplayRuntimeTimingConfig {
  readonly maxFrameDeltaMs: number;
  readonly matchStartCountdownMs: number;
}

export const V2_GAMEPLAY_RUNTIME_TIMING_CONFIG: GameplayRuntimeTimingConfig = {
  maxFrameDeltaMs: 100,
  matchStartCountdownMs: 2_000,
};

export function clampRuntimeDeltaMs(
  deltaMs: number,
  config: GameplayRuntimeTimingConfig = V2_GAMEPLAY_RUNTIME_TIMING_CONFIG,
): number {
  return Math.min(Math.max(0, deltaMs), config.maxFrameDeltaMs);
}
