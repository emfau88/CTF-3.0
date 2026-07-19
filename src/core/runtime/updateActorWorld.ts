import {
  updateActorLifecycle,
  V2_ACTOR_LIFECYCLE_CONFIG,
} from "../actors";
import type { GameEvent } from "../events";
import type { GameMode } from "../modes";
import type { WorldState } from "../world";
import { dispatchModeEvents } from "./dispatchModeEvents";

export function updateActorWorld(
  world: WorldState,
  mode: GameMode,
  deltaMs: number,
  events: GameEvent[],
): void {
  const ms = Math.max(0, deltaMs);
  for (const actor of world.actors) {
    actor.spawnProtectionRemainingMs = Math.max(
      0,
      actor.spawnProtectionRemainingMs - ms,
    );
    actor.primaryFireCooldownMs = Math.max(
      0,
      actor.primaryFireCooldownMs - ms,
    );
    actor.weapons.rocketCooldownMs = Math.max(
      0,
      actor.weapons.rocketCooldownMs - ms,
    );
    actor.weapons.railCooldownMs = Math.max(
      0,
      actor.weapons.railCooldownMs - ms,
    );
    actor.weapons.whipCooldownMs = Math.max(
      0,
      actor.weapons.whipCooldownMs - ms,
    );
    actor.weapons.pulseCooldownMs = Math.max(
      0,
      actor.weapons.pulseCooldownMs - ms,
    );
    actor.weapons.discCooldownMs = Math.max(
      0,
      actor.weapons.discCooldownMs - ms,
    );
    actor.weapons.grenadeCooldownMs = Math.max(
      0,
      actor.weapons.grenadeCooldownMs - ms,
    );
    actor.weapons.shardCooldownMs = Math.max(
      0,
      actor.weapons.shardCooldownMs - ms,
    );
    actor.weapons.shardStackRemainingMs = Math.max(
      0,
      actor.weapons.shardStackRemainingMs - ms,
    );
    if (actor.weapons.shardStackRemainingMs <= 0) {
      actor.weapons.shardStacks = 0;
      actor.weapons.shardStackSourceActorId = null;
    }
    const lifecycle = updateActorLifecycle(
      actor,
      ms,
      world.timeMs,
      V2_ACTOR_LIFECYCLE_CONFIG,
    );
    dispatchModeEvents(mode, world, events, lifecycle.events);
  }
}
