export interface ActorLifecycleConfig {
  readonly respawnDelayMs: number;
  readonly respawnArmor: number;
  readonly spawnProtectionMs: number;
  readonly diagnosticDamage: number;
}

export const V2_ACTOR_LIFECYCLE_CONFIG: ActorLifecycleConfig = {
  respawnDelayMs: 4_000,
  respawnArmor: 0,
  spawnProtectionMs: 2_000,
  diagnosticDamage: 35,
};
