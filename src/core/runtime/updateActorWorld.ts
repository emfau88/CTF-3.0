import {
  updateActorLifecycle,
  V2_ACTOR_LIFECYCLE_CONFIG,
} from "../actors";
import type { GameEvent } from "../events";
import type { GameMode } from "../modes";
import type { WorldState } from "../world";
import { V2_V1_WEAPON_PARITY_CONFIG } from "../combat";
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
    updateArcLashRecharge(actor, ms);
    const lifecycle = updateActorLifecycle(
      actor,
      ms,
      world.timeMs,
      V2_ACTOR_LIFECYCLE_CONFIG,
    );
    dispatchModeEvents(mode, world, events, lifecycle.events);
  }
}

function updateArcLashRecharge(
  actor: WorldState["actors"][number],
  deltaMs: number,
): void {
  const config = V2_V1_WEAPON_PARITY_CONFIG;
  if (
    actor.lifeState !== "active" ||
    actor.weapons.whipAmmo >= config.whipMaxCharges
  ) {
    actor.weapons.whipRechargeMs = 0;
    return;
  }
  actor.weapons.whipRechargeMs = actor.weapons.whipRechargeMs > 0
    ? actor.weapons.whipRechargeMs - deltaMs
    : config.whipRechargeMs - deltaMs;
  while (
    actor.weapons.whipRechargeMs <= 0 &&
    actor.weapons.whipAmmo < config.whipMaxCharges
  ) {
    actor.weapons.whipAmmo += 1;
    actor.weapons.whipRechargeMs += config.whipRechargeMs;
  }
  if (actor.weapons.whipAmmo >= config.whipMaxCharges) {
    actor.weapons.whipRechargeMs = 0;
  }
}
