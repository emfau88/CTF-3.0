export interface PickupConfig {
  readonly defaultRadius: number;
  readonly defaultRespawnDelayMs: number;
  readonly healthValue: number;
  readonly armorValue: number;
  readonly rocketValue: number;
  readonly railValue: number;
  readonly pulseValue: number;
  readonly discValue: number;
  readonly grenadeValue: number;
  readonly shardValue: number;
}

export const V2_DIAGNOSTIC_PICKUP_CONFIG: PickupConfig = {
  defaultRadius: 18,
  defaultRespawnDelayMs: 1800,
  healthValue: 30,
  armorValue: 20,
  rocketValue: 5,
  railValue: 5,
  pulseValue: 36,
  discValue: 8,
  grenadeValue: 3,
  shardValue: 18,
};

export const V2_ARENA_PICKUP_PARITY_CONFIG: PickupConfig = {
  defaultRadius: 22,
  defaultRespawnDelayMs: 12_000,
  healthValue: 35,
  armorValue: 25,
  rocketValue: 5,
  railValue: 4,
  pulseValue: 36,
  discValue: 8,
  grenadeValue: 3,
  shardValue: 18,
};
