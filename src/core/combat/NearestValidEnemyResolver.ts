import type { ActorState, WorldPosition } from "../actors";
import type { WorldGeometry, WorldRect } from "../world";

export interface NearestValidEnemyResult {
  readonly target: ActorState;
  readonly direction: WorldPosition;
  readonly distance: number;
}

export function resolveNearestValidEnemy(
  owner: ActorState,
  actors: readonly ActorState[],
  geometry: WorldGeometry,
  range: number,
): NearestValidEnemyResult | null {
  let best: NearestValidEnemyResult | null = null;
  for (const target of actors) {
    if (
      target.id === owner.id ||
      target.lifeState !== "active" ||
      !owner.teamId ||
      !target.teamId ||
      target.teamId === owner.teamId
    ) {
      continue;
    }
    const dx = target.position.x - owner.position.x;
    const dy = target.position.y - owner.position.y;
    const distance = Math.hypot(dx, dy);
    if (
      distance > range + target.radius ||
      geometry.solids.some((solid) =>
        lineIntersectsRect(owner.position, target.position, solid)
      )
    ) {
      continue;
    }
    if (
      best &&
      (distance > best.distance ||
        (distance === best.distance && target.id.localeCompare(best.target.id) > 0))
    ) {
      continue;
    }
    const normal: number = distance || 1;
    best = {
      target,
      direction: { x: dx / normal, y: dy / normal },
      distance,
    };
  }
  return best;
}

function lineIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: WorldRect,
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let near = 0;
  let far = 1;
  for (const [origin, direction, min, max] of [
    [from.x, dx, rect.x, rect.x + rect.width],
    [from.y, dy, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(direction) < .0001) {
      if (origin < min || origin > max) return false;
      continue;
    }
    const first = (min - origin) / direction;
    const second = (max - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return far >= 0 && near <= 1;
}
