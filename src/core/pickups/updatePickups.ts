import type { ActorState } from "../actors";
import type { GameEvent } from "../events";
import type { PickupState } from "./pickup";
import {
  ARENA_WEAPON_CATALOG,
  isAmmoWeaponId,
  setWeaponAmmo,
  weaponAmmo,
  type ArenaWeaponId,
} from "../weapons";

export interface PickupUpdateResult {
  readonly events: readonly GameEvent[];
}

export function updatePickups(
  pickups: PickupState[],
  actors: ActorState[],
  deltaMs: number,
  timeMs: number,
  humanActorIds: readonly string[] = [],
): PickupUpdateResult {
  const events: GameEvent[] = [];
  const ms = Math.max(0, deltaMs);
  const humans = new Set(humanActorIds);

  for (const pickup of pickups) {
    if (pickup.lifeState === "inactive") {
      pickup.respawnRemainingMs = Math.max(
        0,
        pickup.respawnRemainingMs - ms,
      );
      if (pickup.respawnRemainingMs <= 0) {
        pickup.lifeState = "active";
        events.push({
          id: `pickup-respawned-${pickup.id}-${timeMs}`,
          type: "pickup.respawned",
          timeMs,
          payload: {
            pickupId: pickup.id,
            pickupType: pickup.type,
            position: { ...pickup.position },
          },
        });
      }
      continue;
    }

    const collector = actors
      .filter((actor) =>
        actor.lifeState === "active" &&
        circlesOverlap(actor, pickup) &&
        canApplyPickup(actor, pickup)
      )
      .sort((left, right) =>
        Number(humans.has(right.id)) - Number(humans.has(left.id))
      )[0];
    if (!collector) {
      continue;
    }

    const appliedValue = applyPickup(collector, pickup);
    pickup.lifeState = "inactive";
    pickup.respawnRemainingMs = pickup.respawnDelayMs;
    events.push({
      id: `pickup-collected-${pickup.id}-${timeMs}`,
      type: "pickup.collected",
      timeMs,
      targetActorId: collector.id,
      teamId: collector.teamId ?? undefined,
      payload: {
        pickupId: pickup.id,
        pickupType: pickup.type,
        appliedValue,
        respawnDelayMs: pickup.respawnDelayMs,
      },
    });
  }

  return { events };
}

function canApplyPickup(actor: ActorState, pickup: PickupState): boolean {
  if (pickup.type === "health") {
    return actor.health < actor.maxHealth;
  }
  if (pickup.type === "armor") {
    return actor.armor < actor.maxArmor;
  }
  const weaponId = pickup.type as ArenaWeaponId;
  if (!isAmmoWeaponId(weaponId)) return false;
  return (weaponAmmo(actor.weapons, weaponId) ?? 0) <
    ARENA_WEAPON_CATALOG[weaponId].maxAmmo!;
}

function applyPickup(actor: ActorState, pickup: PickupState): number {
  if (pickup.type === "health") {
    const before = actor.health;
    actor.health = Math.min(actor.maxHealth, actor.health + pickup.value);
    return actor.health - before;
  }

  if (pickup.type === "armor") {
    const before = actor.armor;
    actor.armor = Math.min(actor.maxArmor, actor.armor + pickup.value);
    return actor.armor - before;
  }
  const weaponId = pickup.type as ArenaWeaponId;
  if (!isAmmoWeaponId(weaponId)) return 0;
  const before = weaponAmmo(actor.weapons, weaponId) ?? 0;
  const after = Math.min(
    ARENA_WEAPON_CATALOG[weaponId].maxAmmo!,
    before + pickup.value,
  );
  setWeaponAmmo(actor.weapons, weaponId, after);
  return after - before;
}

function circlesOverlap(actor: ActorState, pickup: PickupState): boolean {
  const radius = actor.radius + pickup.radius;
  return (actor.position.x - pickup.position.x) ** 2 +
      (actor.position.y - pickup.position.y) ** 2 <=
    radius ** 2;
}
