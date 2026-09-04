import type { ActorState, WorldPosition } from "../actors";
import type { GameEvent } from "../events";
import type { WorldState } from "../world";
import {
  ARENA_WEAPON_IDS,
  isAmmoWeaponId,
  weaponAmmo,
  type AmmoWeaponId,
} from "../weapons";
import { createPickupState } from "./createPickupState";
import { V2_ARENA_PICKUP_PARITY_CONFIG } from "./PickupConfig";

export const WEAPON_DEATH_DROP_LIFETIME_MS = 4_000;

export interface WeaponDeathDrop {
  readonly weaponId: AmmoWeaponId;
  readonly ammo: number;
}

interface ActorDiedWeaponDropPayload {
  readonly victimActorId?: unknown;
  readonly victimLifeId?: unknown;
  readonly position?: unknown;
  readonly weaponDrops?: unknown;
  readonly reason?: unknown;
}

export function captureWeaponDeathDrops(
  actor: ActorState,
): readonly WeaponDeathDrop[] {
  return ARENA_WEAPON_IDS
    .filter(isAmmoWeaponId)
    .map((weaponId) => ({
      weaponId,
      ammo: weaponAmmo(actor.weapons, weaponId) ?? 0,
    }))
    .filter((drop) => drop.ammo > 0);
}

export function spawnWeaponDeathDrops(
  world: WorldState,
  event: GameEvent,
): readonly GameEvent[] {
  if (event.type !== "actor.died") return [];
  const payload = readWeaponDropPayload(event.payload);
  if (!payload) return [];

  const created: GameEvent[] = [];
  for (const drop of payload.weaponDrops) {
    const pickupId = [
      "death-drop",
      payload.victimActorId,
      payload.victimLifeId,
      drop.weaponId,
    ].join("-");
    if (world.pickups.some((pickup) => pickup.id === pickupId)) continue;
    world.pickups.push(createPickupState({
      id: pickupId,
      type: drop.weaponId,
      position: payload.position,
      value: drop.ammo,
      origin: "death-drop",
      expiresAfterMs: WEAPON_DEATH_DROP_LIFETIME_MS,
    }, V2_ARENA_PICKUP_PARITY_CONFIG));
    created.push({
      id: `pickup-dropped-${pickupId}-${event.timeMs}`,
      type: "pickup.dropped",
      timeMs: event.timeMs,
      sourceActorId: event.targetActorId,
      teamId: event.teamId,
      payload: {
        pickupId,
        pickupType: drop.weaponId,
        pickupOrigin: "death-drop",
        value: drop.ammo,
        expiresAfterMs: WEAPON_DEATH_DROP_LIFETIME_MS,
        position: { ...payload.position },
      },
    });
  }
  return created;
}

function readWeaponDropPayload(
  value: unknown,
): {
  readonly victimActorId: string;
  readonly victimLifeId: number;
  readonly position: WorldPosition;
  readonly weaponDrops: readonly WeaponDeathDrop[];
} | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as ActorDiedWeaponDropPayload;
  if (payload.reason === "fall" ||
    typeof payload.victimActorId !== "string" ||
    typeof payload.victimLifeId !== "number" ||
    !Number.isSafeInteger(payload.victimLifeId) ||
    !isWorldPosition(payload.position) ||
    !Array.isArray(payload.weaponDrops)) return null;
  const weaponDrops = payload.weaponDrops.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const drop = candidate as Partial<WeaponDeathDrop>;
    if (
      typeof drop.weaponId !== "string" ||
      !isAmmoWeaponId(drop.weaponId as AmmoWeaponId) ||
      typeof drop.ammo !== "number" ||
      !Number.isSafeInteger(drop.ammo) ||
      drop.ammo <= 0
    ) return [];
    return [{ weaponId: drop.weaponId as AmmoWeaponId, ammo: drop.ammo }];
  });
  return weaponDrops.length > 0
    ? {
      victimActorId: payload.victimActorId,
      victimLifeId: payload.victimLifeId,
      position: { ...payload.position },
      weaponDrops,
    }
    : null;
}

function isWorldPosition(value: unknown): value is WorldPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<WorldPosition>;
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}
