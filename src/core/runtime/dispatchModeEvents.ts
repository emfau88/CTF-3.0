import type { GameEvent } from "../events";
import type { GameMode } from "../modes";
import type { WorldState } from "../world";
import { cancelSpawnProtection } from "../actors";

export function dispatchModeEvents(
  mode: GameMode,
  world: WorldState,
  frameEvents: GameEvent[],
  gameplayEvents: readonly GameEvent[],
): void {
  for (const event of gameplayEvents) {
    frameEvents.push(event);
    if (
      (event.type === "objective.flagPickedUp" ||
        event.type === "objective.flagCaptured") &&
      event.sourceActorId
    ) {
      const actor = world.actors.find((candidate) =>
        candidate.id === event.sourceActorId
      );
      const protectionEnded = actor
        ? cancelSpawnProtection(actor, world.timeMs, "objective")
        : null;
      if (protectionEnded) frameEvents.push(protectionEnded);
    }
    frameEvents.push(...mode.handleEvent(event, world));
  }
}
