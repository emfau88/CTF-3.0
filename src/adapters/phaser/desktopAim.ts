import type { WorldPosition } from "../../core";

export function resolveDesktopAimDirection(
  actorPosition: WorldPosition,
  pointerWorldPosition: WorldPosition,
): WorldPosition {
  const x = pointerWorldPosition.x - actorPosition.x;
  const y = pointerWorldPosition.y - actorPosition.y;
  const length = Math.hypot(x, y);

  return length > .0001
    ? { x: x / length, y: y / length }
    : { x: 0, y: 0 };
}
