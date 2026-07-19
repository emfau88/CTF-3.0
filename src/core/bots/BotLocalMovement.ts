import type { ActorState, WorldPosition } from "../actors";
import type { WorldSnapshot } from "../world";
import type { BotPersonality } from "./BotDifficulty";

export interface BotLocalSteering {
  readonly direction: WorldPosition;
  readonly overrideHold: boolean;
  readonly reason:
    | "none"
    | "avoid-ally"
    | "evade-projectile"
    | "stuck-recovery";
}

export function planLocalBotSteering(
  actor: Readonly<ActorState>,
  desiredDirection: WorldPosition,
  snapshot: WorldSnapshot,
  personality: BotPersonality,
): BotLocalSteering {
  const projectileEvasion = nearestProjectileEvasion(
    actor,
    snapshot,
    personality,
  );
  if (projectileEvasion) {
    return {
      direction: projectileEvasion,
      overrideHold: true,
      reason: "evade-projectile",
    };
  }
  const allyAvoidance = nearbyAllyAvoidance(actor, snapshot);
  if (!allyAvoidance) {
    return {
      direction: { ...desiredDirection },
      overrideHold: false,
      reason: "none",
    };
  }
  return {
    direction: normalize({
      x: desiredDirection.x * .72 + allyAvoidance.x * .78,
      y: desiredDirection.y * .72 + allyAvoidance.y * .78,
    }),
    overrideHold: true,
    reason: "avoid-ally",
  };
}

function nearestProjectileEvasion(
  actor: Readonly<ActorState>,
  snapshot: WorldSnapshot,
  personality: BotPersonality,
): WorldPosition | null {
  const threat = snapshot.projectiles
    .filter((projectile) =>
      projectile.lifeState === "active" &&
      projectile.teamId !== actor.teamId &&
      projectile.weaponId !== "basic-autoshoot" &&
      projectile.weaponId !== "diagnostic-blaster"
    )
    .map((projectile) => {
      const relative = {
        x: projectile.position.x - actor.position.x,
        y: projectile.position.y - actor.position.y,
      };
      const distance = Math.hypot(relative.x, relative.y);
      const approaching =
        relative.x * projectile.velocity.x +
          relative.y * projectile.velocity.y < 0;
      return { projectile, distance, approaching };
    })
    .filter((candidate) =>
      candidate.approaching &&
      candidate.distance <=
        Math.max(110, candidate.projectile.splashRadius ?? 0) + 70
    )
    .sort((left, right) =>
      left.distance - right.distance ||
      left.projectile.id.localeCompare(right.projectile.id)
    )[0];
  if (!threat) return null;
  const velocity = normalize(threat.projectile.velocity);
  const side = personality.lateralBias;
  const preferred = {
    x: -velocity.y * side,
    y: velocity.x * side,
  };
  const alternate = {
    x: -preferred.x,
    y: -preferred.y,
  };
  return [preferred, alternate].find((direction) =>
    directionHasClearance(actor, direction, snapshot)
  ) ?? null;
}

function directionHasClearance(
  actor: Readonly<ActorState>,
  direction: WorldPosition,
  snapshot: WorldSnapshot,
): boolean {
  const clearance = actor.radius + 6;
  const bounds = snapshot.geometry.bounds;
  const blockers = [
    ...snapshot.geometry.solids,
    ...snapshot.geometry.gaps,
  ];
  return [24, 48, 72].every((probeDistance) => {
    const point = {
      x: actor.position.x + direction.x * probeDistance,
      y: actor.position.y + direction.y * probeDistance,
    };
    return point.x >= bounds.minX + clearance &&
      point.x <= bounds.maxX - clearance &&
      point.y >= bounds.minY + clearance &&
      point.y <= bounds.maxY - clearance &&
      !blockers.some((rect) =>
        point.x > rect.x - clearance &&
        point.x < rect.x + rect.width + clearance &&
        point.y > rect.y - clearance &&
        point.y < rect.y + rect.height + clearance
      );
  });
}

function nearbyAllyAvoidance(
  actor: Readonly<ActorState>,
  snapshot: WorldSnapshot,
): WorldPosition | null {
  let x = 0;
  let y = 0;
  let weight = 0;
  for (const ally of snapshot.actors) {
    if (
      ally.id === actor.id ||
      ally.lifeState !== "active" ||
      ally.teamId !== actor.teamId
    ) {
      continue;
    }
    const deltaX = actor.position.x - ally.position.x;
    const deltaY = actor.position.y - ally.position.y;
    const distance = Math.hypot(deltaX, deltaY);
    const separationDistance = Math.max(64, actor.radius + ally.radius + 26);
    if (distance >= separationDistance) continue;
    const influence = 1 - distance / separationDistance;
    if (distance <= .001) {
      x += actor.id.localeCompare(ally.id) < 0 ? -1 : 1;
      weight += 1;
      continue;
    }
    x += deltaX / distance * influence;
    y += deltaY / distance * influence;
    weight += influence;
  }
  return weight > 0 ? normalize({ x, y }) : null;
}

function normalize(vector: WorldPosition): WorldPosition {
  const length = Math.hypot(vector.x, vector.y);
  return length > .0001
    ? { x: vector.x / length, y: vector.y / length }
    : { x: 0, y: 0 };
}
