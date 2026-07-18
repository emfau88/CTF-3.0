import type { ActorState } from "../actors";
import type { GameEvent } from "../events";
import type { PickupState } from "./pickup";
import { V2_V1_WEAPON_PARITY_CONFIG } from "../combat";

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
  if (pickup.type === "rocket") {
    return actor.weapons.rocketAmmo <
      V2_V1_WEAPON_PARITY_CONFIG.rocketMaxAmmo;
  }
  return actor.weapons.railAmmo <
    V2_V1_WEAPON_PARITY_CONFIG.railMaxAmmo;
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
  if (pickup.type === "rocket") {
    const before = actor.weapons.rocketAmmo;
    actor.weapons.rocketAmmo = Math.min(
      V2_V1_WEAPON_PARITY_CONFIG.rocketMaxAmmo,
      actor.weapons.rocketAmmo + pickup.value,
    );
    return actor.weapons.rocketAmmo - before;
  }
  const before = actor.weapons.railAmmo;
  actor.weapons.railAmmo = Math.min(
    V2_V1_WEAPON_PARITY_CONFIG.railMaxAmmo,
    actor.weapons.railAmmo + pickup.value,
  );
  return actor.weapons.railAmmo - before;
}

function circlesOverlap(actor: ActorState, pickup: PickupState): boolean {
  const radius = actor.radius + pickup.radius;
  return (actor.position.x - pickup.position.x) ** 2 +
      (actor.position.y - pickup.position.y) ** 2 <=
    radius ** 2;
}
