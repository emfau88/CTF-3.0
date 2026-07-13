import type { GameEvent } from "../events";
import type { GameMode } from "../modes";
import { updatePickups } from "../pickups";
import type { WorldState } from "../world";
import { dispatchModeEvents } from "./dispatchModeEvents";

export function updatePickupWorld(
  world: WorldState,
  mode: GameMode,
  deltaMs: number,
  events: GameEvent[],
  humanActorIds: readonly string[] = [],
): void {
  const pickups = updatePickups(
    world.pickups,
    world.actors,
    deltaMs,
    world.timeMs,
    humanActorIds,
  );
  dispatchModeEvents(mode, world, events, pickups.events);
}
