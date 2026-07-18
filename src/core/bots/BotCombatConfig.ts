import {
  V2_BASIC_AUTOSHOOT_PARITY_CONFIG,
  V2_V1_WEAPON_PARITY_CONFIG,
} from "../combat";

export interface BotCombatConfig {
  readonly rocketMinRange: number;
  readonly rocketMaxRange: number;
  readonly rocketDecisionCooldownMs: number;
  readonly rocketProjectileSpeed: number;
  readonly rocketSplashRadius: number;
  readonly rocketMaxLeadMs: number;
  readonly rocketAimJitterRadians: number;
  readonly rocketSurfaceAimChance: number;
  readonly railReactionMs: number;
  readonly railAimJitterRadians: number;
  readonly railLongRangeJitterMultiplier: number;
  readonly railPreferredMinRange: number;
  readonly railRange: number;
  readonly whipRange: number;
}

export const V2_BOT_COMBAT_CONFIG: BotCombatConfig = {
  rocketMinRange: 190,
  rocketMaxRange: 700,
  rocketDecisionCooldownMs: V2_BASIC_AUTOSHOOT_PARITY_CONFIG.cooldownMs,
  rocketProjectileSpeed: V2_V1_WEAPON_PARITY_CONFIG.rocketSpeed,
  rocketSplashRadius: V2_V1_WEAPON_PARITY_CONFIG.rocketSplashRadius,
  rocketMaxLeadMs: 900,
  rocketAimJitterRadians: .035,
  rocketSurfaceAimChance: .45,
  railReactionMs: 320,
  railAimJitterRadians: .04,
  railLongRangeJitterMultiplier: 2.5,
  railPreferredMinRange: V2_BASIC_AUTOSHOOT_PARITY_CONFIG.attackRange,
  railRange: V2_V1_WEAPON_PARITY_CONFIG.railRange,
  whipRange: V2_V1_WEAPON_PARITY_CONFIG.whipRange,
};
