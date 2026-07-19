import type {
  ActorId,
  TeamId,
  WorldPosition,
  WorldVelocity,
} from "../actors";

export type ProjectileId = string;
export type ProjectileLifeState = "active" | "hit" | "expired";
export type ProjectileWeaponId =
  | "diagnostic-blaster"
  | "basic-autoshoot"
  | "rocket"
  | "pulse"
  | "disc"
  | "grenade"
  | "shard";

export interface LobProjectileState {
  readonly origin: WorldPosition;
  readonly target: WorldPosition;
  elapsedMs: number;
  readonly flightMs: number;
  readonly fuseMs: number;
  landed: boolean;
  readonly arcHeight: number;
}

export interface HomingProjectileState {
  readonly targetActorId: ActorId;
  readonly turnRateRadiansPerSecond: number;
}

export interface ProjectileState {
  readonly id: ProjectileId;
  readonly ownerActorId: ActorId;
  readonly teamId: TeamId | null;
  readonly weaponId: ProjectileWeaponId;
  position: WorldPosition;
  velocity: WorldVelocity;
  readonly damage: number;
  readonly radius: number;
  readonly splashRadius?: number;
  readonly knockback?: number;
  ricochetsRemaining?: number;
  ricochetCount?: number;
  readonly ricochetDamage?: number;
  lob?: LobProjectileState;
  homing?: HomingProjectileState;
  visualHeight?: number;
  remainingLifetimeMs: number;
  remainingRange: number;
  lifeState: ProjectileLifeState;
}
