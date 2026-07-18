import {
  applyDamage,
  type ActorLifecycleConfig,
  type ActorState,
} from "../actors";
import type { GameEvent } from "../events";
import type { WorldGeometry, WorldRect } from "../world";
import type { DiagnosticWeaponConfig } from "./DiagnosticWeaponConfig";
import type { ProjectileState } from "./projectile";

export interface ProjectileUpdateResult {
  readonly events: readonly GameEvent[];
}

type ProjectileCollision =
  | {
    readonly kind: "solid" | "bounds";
    readonly ratio: number;
  }
  | {
    readonly kind: "actor";
    readonly ratio: number;
    readonly actor: ActorState;
  };

export function updateProjectiles(
  projectiles: ProjectileState[],
  actors: ActorState[],
  geometry: WorldGeometry,
  deltaMs: number,
  timeMs: number,
  weaponConfig: DiagnosticWeaponConfig,
  lifecycleConfig: ActorLifecycleConfig,
): ProjectileUpdateResult {
  const events: GameEvent[] = [];
  const ms = Math.min(Math.max(0, deltaMs), weaponConfig.maxDeltaMs);
  const dt = ms / 1000;

  for (const projectile of projectiles) {
    if (projectile.lifeState !== "active") {
      continue;
    }

    const start = { ...projectile.position };
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y);
    const requestedDistance = speed * dt;
    const lifetimeRatio = ms > 0
      ? Math.min(1, projectile.remainingLifetimeMs / ms)
      : 1;
    const rangeRatio = requestedDistance > 0
      ? Math.min(1, projectile.remainingRange / requestedDistance)
      : 1;
    const terminalRatio = Math.max(
      0,
      Math.min(1, lifetimeRatio, rangeRatio),
    );
    const end = {
      x: start.x + projectile.velocity.x * dt * terminalRatio,
      y: start.y + projectile.velocity.y * dt * terminalRatio,
    };
    const collision = findEarliestCollision(
      projectile,
      start,
      end,
      actors,
      geometry,
    );
    const collisionRatio = collision?.ratio ?? 1;
    const traveledDistance = requestedDistance * terminalRatio *
      collisionRatio;
    const elapsedMs = ms * terminalRatio * collisionRatio;
    projectile.position.x = start.x + (end.x - start.x) * collisionRatio;
    projectile.position.y = start.y + (end.y - start.y) * collisionRatio;
    projectile.remainingLifetimeMs = Math.max(
      0,
      projectile.remainingLifetimeMs - elapsedMs,
    );
    projectile.remainingRange = Math.max(
      0,
      projectile.remainingRange - traveledDistance,
    );

    if (collision?.kind === "solid" || collision?.kind === "bounds") {
      if (projectile.weaponId === "rocket") {
        explodeRocket(projectile, actors, geometry, timeMs, events, lifecycleConfig);
      }
      expireProjectile(projectile, timeMs, events, collision.kind);
      continue;
    }

    const target = collision?.kind === "actor" ? collision.actor : null;
    if (target) {
      projectile.lifeState = "hit";
      events.push({
        id: `projectile-hit-${projectile.id}-${timeMs}`,
        type: "projectile.hit",
        timeMs,
        sourceActorId: projectile.ownerActorId,
        targetActorId: target.id,
        teamId: projectile.teamId ?? undefined,
        payload: {
          projectileId: projectile.id,
          weaponId: projectile.weaponId,
          position: { ...projectile.position },
          damage: projectile.damage,
        },
      });
      if (projectile.weaponId === "rocket") {
        explodeRocket(
          projectile,
          actors,
          geometry,
          timeMs,
          events,
          lifecycleConfig,
          target.id,
        );
      } else {
        const damage = applyDamage(
          target,
          projectile.damage,
          timeMs,
          lifecycleConfig,
          projectile.ownerActorId,
          projectile.weaponId,
        );
        events.push(...damage.events);
      }
      continue;
    }

    if (
      projectile.remainingLifetimeMs <= 0 ||
      projectile.remainingRange <= 0
    ) {
      if (projectile.weaponId === "rocket") {
        explodeRocket(
          projectile,
          actors,
          geometry,
          timeMs,
          events,
          lifecycleConfig,
        );
      }
      expireProjectile(
        projectile,
        timeMs,
        events,
        projectile.remainingLifetimeMs <= 0 ? "lifetime" : "range",
      );
    }
  }

  for (let index = projectiles.length - 1; index >= 0; index--) {
    if (projectiles[index]?.lifeState !== "active") {
      projectiles.splice(index, 1);
    }
  }

  return { events };
}

function expireProjectile(
  projectile: ProjectileState,
  timeMs: number,
  events: GameEvent[],
  reason: string,
): void {
  projectile.lifeState = "expired";
  events.push({
    id: `projectile-expired-${projectile.id}-${timeMs}`,
    type: "projectile.expired",
    timeMs,
    sourceActorId: projectile.ownerActorId,
    teamId: projectile.teamId ?? undefined,
    payload: {
      projectileId: projectile.id,
      weaponId: projectile.weaponId,
      position: { ...projectile.position },
      reason,
    },
  });
}

function explodeRocket(
  projectile: ProjectileState,
  actors: ActorState[],
  geometry: WorldGeometry,
  timeMs: number,
  events: GameEvent[],
  lifecycleConfig: ActorLifecycleConfig,
  directTargetId?: string,
): void {
  const splashRadius = projectile.splashRadius ?? 0;
  const knockback = projectile.knockback ?? 0;
  events.push({
    id: `weapon-rocket-exploded-${projectile.id}-${timeMs}`,
    type: "weapon.rocketExploded",
    timeMs,
    sourceActorId: projectile.ownerActorId,
    teamId: projectile.teamId ?? undefined,
    payload: {
      projectileId: projectile.id,
      position: { ...projectile.position },
      splashRadius,
    },
  });
  for (const actor of actors) {
    const directHit = actor.id === directTargetId;
    if (
      actor.lifeState !== "active" ||
      actor.teamId === projectile.teamId
    ) {
      continue;
    }
    const dx = actor.position.x - projectile.position.x;
    const dy = actor.position.y - projectile.position.y;
    const distance = Math.hypot(dx, dy);
    if (
      !directHit &&
      (distance > splashRadius + actor.radius ||
      geometry.solids.some((solid) =>
        lineIntersectsRect(projectile.position, actor.position, solid)
      ))
    ) {
      continue;
    }
    const falloff = clamp(1 - distance / splashRadius, .35, 1);
    const damage = applyDamage(
      actor,
      directHit ? projectile.damage : projectile.damage * falloff,
      timeMs,
      lifecycleConfig,
      projectile.ownerActorId,
      projectile.weaponId,
    );
    events.push(...damage.events);
    if (damage.blockedBySpawnProtection) {
      continue;
    }
    const normal = distance || 1;
    actor.velocity.x += dx / normal * knockback * falloff;
    actor.velocity.y += dy / normal * knockback * falloff;
    actor.position.x += dx / normal * 18 * falloff;
    actor.position.y += dy / normal * 18 * falloff;
  }
}

function findEarliestCollision(
  projectile: ProjectileState,
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  actors: ActorState[],
  geometry: WorldGeometry,
): ProjectileCollision | null {
  let earliest: ProjectileCollision | null = null;
  const consider = (candidate: ProjectileCollision | null): void => {
    if (
      candidate &&
      (!earliest || candidate.ratio < earliest.ratio - .000001)
    ) {
      earliest = candidate;
    }
  };

  for (const solid of geometry.solids) {
    const ratio = segmentRectIntersectionRatio(start, end, {
      id: solid.id,
      x: solid.x - projectile.radius,
      y: solid.y - projectile.radius,
      width: solid.width + projectile.radius * 2,
      height: solid.height + projectile.radius * 2,
    });
    consider(ratio === null ? null : { kind: "solid", ratio });
  }

  const boundsRatio = segmentBoundsExitRatio(start, end, {
    minX: geometry.bounds.minX + projectile.radius,
    minY: geometry.bounds.minY + projectile.radius,
    maxX: geometry.bounds.maxX - projectile.radius,
    maxY: geometry.bounds.maxY - projectile.radius,
  });
  consider(boundsRatio === null
    ? null
    : { kind: "bounds", ratio: boundsRatio });

  for (const actor of actors) {
    if (
      actor.id === projectile.ownerActorId ||
      actor.lifeState !== "active" ||
      (projectile.teamId !== null && actor.teamId === projectile.teamId)
    ) {
      continue;
    }
    const ratio = segmentCircleIntersectionRatio(
      start,
      end,
      actor.position,
      projectile.radius + actor.radius,
    );
    consider(ratio === null
      ? null
      : { kind: "actor", ratio, actor });
  }

  return earliest;
}

function segmentRectIntersectionRatio(
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  rect: WorldRect,
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let near = 0;
  let far = 1;
  for (const [origin, delta, min, max] of [
    [start.x, dx, rect.x, rect.x + rect.width],
    [start.y, dy, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(delta) < .000001) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  return far >= 0 && near <= 1 ? clamp(near, 0, 1) : null;
}

function segmentCircleIntersectionRatio(
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  center: Readonly<{ x: number; y: number }>,
  radius: number,
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mx = start.x - center.x;
  const my = start.y - center.y;
  const c = mx * mx + my * my - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a <= .000001) return null;
  const b = mx * dx + my * dy;
  if (b > 0) return null;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const ratio = (-b - Math.sqrt(discriminant)) / a;
  return ratio >= 0 && ratio <= 1 ? ratio : null;
}

function segmentBoundsExitRatio(
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  bounds: Readonly<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }>,
): number | null {
  if (
    start.x < bounds.minX ||
    start.x > bounds.maxX ||
    start.y < bounds.minY ||
    start.y > bounds.maxY
  ) {
    return 0;
  }
  let ratio: number | null = null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (end.x < bounds.minX && dx < 0) {
    ratio = (bounds.minX - start.x) / dx;
  } else if (end.x > bounds.maxX && dx > 0) {
    ratio = (bounds.maxX - start.x) / dx;
  }
  if (end.y < bounds.minY && dy < 0) {
    const yRatio = (bounds.minY - start.y) / dy;
    ratio = ratio === null ? yRatio : Math.min(ratio, yRatio);
  } else if (end.y > bounds.maxY && dy > 0) {
    const yRatio = (bounds.maxY - start.y) / dy;
    ratio = ratio === null ? yRatio : Math.min(ratio, yRatio);
  }
  return ratio === null ? null : clamp(ratio, 0, 1);
}

function lineIntersectsRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
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
      if (origin < min || origin > max) {
        return false;
      }
      continue;
    }
    const first = (min - origin) / direction;
    const second = (max - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) {
      return false;
    }
  }
  return far >= 0 && near <= 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
