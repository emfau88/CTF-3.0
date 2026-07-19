import type { ActorWeaponState } from "../actors";

export const ARENA_WEAPON_IDS = [
  "rocket",
  "rail",
  "whip",
  "pulse",
  "disc",
  "grenade",
  "shard",
] as const;

export type ArenaWeaponId = typeof ARENA_WEAPON_IDS[number];
export type AmmoWeaponId = Exclude<ArenaWeaponId, "whip">;

export interface ArenaWeaponDefinition {
  readonly id: ArenaWeaponId;
  readonly visibleName: string;
  readonly inputKey: string;
  readonly hudTexture: string;
  readonly pickupTexture: string | null;
  readonly pickupValue: number | null;
  readonly maxAmmo: number | null;
  readonly cooldownMs: number;
  readonly range: number;
  readonly damage: number;
}

export const ARENA_WEAPON_CATALOG: Readonly<
  Record<ArenaWeaponId, ArenaWeaponDefinition>
> = {
  rocket: {
    id: "rocket",
    visibleName: "Rocket Launcher",
    inputKey: "Q",
    hudTexture: "uiRocketButton",
    pickupTexture: "pickupRocket",
    pickupValue: 5,
    maxAmmo: 15,
    cooldownMs: 1_000,
    range: 965,
    damage: 45,
  },
  rail: {
    id: "rail",
    visibleName: "Railgun",
    inputKey: "E",
    hudTexture: "uiRailButton",
    pickupTexture: "pickupRail",
    pickupValue: 4,
    maxAmmo: 8,
    cooldownMs: 2_500,
    range: 1_100,
    damage: 85,
  },
  whip: {
    id: "whip",
    visibleName: "Arc Lash",
    inputKey: "F",
    hudTexture: "uiWhipButton",
    pickupTexture: null,
    pickupValue: null,
    maxAmmo: null,
    cooldownMs: 800,
    range: 120,
    damage: 35,
  },
  pulse: {
    id: "pulse",
    visibleName: "Pulse Repeater",
    inputKey: "R",
    hudTexture: "uiPulseButton",
    pickupTexture: "pickupPulse",
    pickupValue: 36,
    maxAmmo: 54,
    cooldownMs: 160,
    range: 640,
    damage: 10,
  },
  disc: {
    id: "disc",
    visibleName: "Ricochet Disc",
    inputKey: "C",
    hudTexture: "uiDiscButton",
    pickupTexture: "pickupDisc",
    pickupValue: 8,
    maxAmmo: 12,
    cooldownMs: 850,
    range: 900,
    damage: 38,
  },
  grenade: {
    id: "grenade",
    visibleName: "Lob Grenade",
    inputKey: "G",
    hudTexture: "uiGrenadeButton",
    pickupTexture: "pickupGrenade",
    pickupValue: 3,
    maxAmmo: 9,
    cooldownMs: 1_100,
    range: 850,
    damage: 60,
  },
  shard: {
    id: "shard",
    visibleName: "Shardcaster",
    inputKey: "X",
    hudTexture: "uiShardButton",
    pickupTexture: "pickupShard",
    pickupValue: 18,
    maxAmmo: 54,
    cooldownMs: 190,
    range: 700,
    damage: 5,
  },
};

export const DEFAULT_ARENA_WEAPON_ROSTER: readonly ArenaWeaponId[] = [
  "whip",
  "rocket",
  "rail",
];

export function isArenaWeaponId(value: unknown): value is ArenaWeaponId {
  return typeof value === "string" &&
    (ARENA_WEAPON_IDS as readonly string[]).includes(value);
}

export function isAmmoWeaponId(value: ArenaWeaponId): value is AmmoWeaponId {
  return value !== "whip";
}

export function weaponAmmo(
  weapons: Readonly<ActorWeaponState>,
  weaponId: ArenaWeaponId,
): number | null {
  switch (weaponId) {
    case "rocket": return weapons.rocketAmmo;
    case "rail": return weapons.railAmmo;
    case "whip": return null;
    case "pulse": return weapons.pulseAmmo;
    case "disc": return weapons.discAmmo;
    case "grenade": return weapons.grenadeAmmo;
    case "shard": return weapons.shardAmmo;
  }
}

export function setWeaponAmmo(
  weapons: ActorWeaponState,
  weaponId: AmmoWeaponId,
  value: number,
): void {
  switch (weaponId) {
    case "rocket": weapons.rocketAmmo = value; break;
    case "rail": weapons.railAmmo = value; break;
    case "pulse": weapons.pulseAmmo = value; break;
    case "disc": weapons.discAmmo = value; break;
    case "grenade": weapons.grenadeAmmo = value; break;
    case "shard": weapons.shardAmmo = value; break;
  }
}

export function weaponCooldown(
  weapons: Readonly<ActorWeaponState>,
  weaponId: ArenaWeaponId,
): number {
  switch (weaponId) {
    case "rocket": return weapons.rocketCooldownMs;
    case "rail": return weapons.railCooldownMs;
    case "whip": return weapons.whipCooldownMs;
    case "pulse": return weapons.pulseCooldownMs;
    case "disc": return weapons.discCooldownMs;
    case "grenade": return weapons.grenadeCooldownMs;
    case "shard": return weapons.shardCooldownMs;
  }
}

export function setWeaponCooldown(
  weapons: ActorWeaponState,
  weaponId: ArenaWeaponId,
  value: number,
): void {
  switch (weaponId) {
    case "rocket": weapons.rocketCooldownMs = value; break;
    case "rail": weapons.railCooldownMs = value; break;
    case "whip": weapons.whipCooldownMs = value; break;
    case "pulse": weapons.pulseCooldownMs = value; break;
    case "disc": weapons.discCooldownMs = value; break;
    case "grenade": weapons.grenadeCooldownMs = value; break;
    case "shard": weapons.shardCooldownMs = value; break;
  }
}
