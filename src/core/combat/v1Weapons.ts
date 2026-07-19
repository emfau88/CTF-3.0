import {
  applyDamage,
  cancelSpawnProtection,
  V2_ACTOR_LIFECYCLE_CONFIG,
  type ActorState,
  type WorldPosition,
} from "../actors";
import type { GameEvent } from "../events";
import type { CoreInputFrame } from "../input";
import type { WorldRect, WorldState } from "../world";
import type { ProjectileState } from "./projectile";
import {
  V2_V1_WEAPON_PARITY_CONFIG,
  type V1WeaponConfig,
} from "./V1WeaponConfig";
import { resolveNearestValidEnemy } from "./NearestValidEnemyResolver";
import {
  ARENA_WEAPON_CATALOG,
  isAmmoWeaponId,
  isArenaWeaponId,
  setWeaponAmmo,
  setWeaponCooldown,
  weaponAmmo,
  weaponCooldown,
  type ArenaWeaponId,
} from "../weapons";

type V1WeaponId = ArenaWeaponId;

export function fireV1Weapons(
  world: WorldState,
  actor: ActorState,
  input: CoreInputFrame,
  config: V1WeaponConfig = V2_V1_WEAPON_PARITY_CONFIG,
): readonly GameEvent[] {
  const request = input.actions.find((intent) =>
    intent.action === "fireWeapon" &&
    intent.phase === "pressed" &&
    (!intent.actorId || intent.actorId === actor.id)
  );
  const weaponId = readWeaponId(request?.payload);
  if (!weaponId || actor.lifeState !== "active") {
    return [];
  }
  if (
    weaponId !== "whip" &&
    world.map &&
    !world.map.weaponRoster.includes(weaponId)
  ) {
    return [];
  }
  if (weaponId === "whip") {
    return fireWhip(world, actor, config);
  }
  const direction = normalizedDirection(
    request?.direction ?? readAimDirection(input) ?? actor.lastMoveDirection,
  );
  if (!direction) return [];
  if (weaponId === "rocket") {
    return fireRocket(world, actor, direction, config);
  }
  if (weaponId === "rail") {
    return fireRail(world, actor, direction, config);
  }
  if (weaponId === "grenade") {
    return fireGrenade(
      world,
      actor,
      direction,
      readTargetPosition(request?.payload),
    );
  }
  return fireArenaProjectile(world, actor, weaponId, direction);
}

function fireRocket(
  world: WorldState,
  actor: ActorState,
  direction: WorldPosition,
  config: V1WeaponConfig,
): readonly GameEvent[] {
  if (
    actor.weapons.rocketAmmo <= 0 ||
    actor.weapons.rocketCooldownMs > 0
  ) {
    return [];
  }
  actor.weapons.rocketAmmo--;
  actor.weapons.rocketCooldownMs = config.rocketCooldownMs;
  const protectionEnded = cancelSpawnProtection(
    actor,
    world.timeMs,
    "attack",
  );
  const offset = actor.radius + config.rocketRadius + 3;
  const projectile: ProjectileState = {
    id: `rocket-${actor.id}-${actor.lifeId}-${world.timeMs}`,
    ownerActorId: actor.id,
    teamId: actor.teamId,
    weaponId: "rocket",
    position: {
      x: actor.position.x + direction.x * offset,
      y: actor.position.y + direction.y * offset,
    },
    velocity: {
      x: direction.x * config.rocketSpeed,
      y: direction.y * config.rocketSpeed,
    },
    damage: config.rocketDamage,
    radius: config.rocketRadius,
    splashRadius: config.rocketSplashRadius,
    knockback: config.rocketKnockback,
    remainingLifetimeMs: config.projectileLifetimeMs,
    remainingRange: config.rocketSpeed * config.projectileLifetimeMs / 1000,
    lifeState: "active",
  };
  world.projectiles.push(projectile);
  return [
    ...(protectionEnded ? [protectionEnded] : []),
    {
    id: `weapon-rocket-fired-${projectile.id}`,
    type: "weapon.rocketFired",
    timeMs: world.timeMs,
    sourceActorId: actor.id,
    teamId: actor.teamId ?? undefined,
    payload: {
      projectileId: projectile.id,
      position: { ...projectile.position },
      direction,
      remainingAmmo: actor.weapons.rocketAmmo,
      cooldownMs: config.rocketCooldownMs,
    },
  }, {
    id: `projectile-spawned-${projectile.id}`,
    type: "projectile.spawned",
    timeMs: world.timeMs,
    sourceActorId: actor.id,
    teamId: actor.teamId ?? undefined,
    payload: {
      projectileId: projectile.id,
      weaponId: "rocket",
      position: { ...projectile.position },
      velocity: { ...projectile.velocity },
    },
  }];
}

function fireRail(
  world: WorldState,
  actor: ActorState,
  direction: WorldPosition,
  config: V1WeaponConfig,
): readonly GameEvent[] {
  if (
    actor.weapons.railAmmo <= 0 ||
    actor.weapons.railCooldownMs > 0
  ) {
    return [];
  }
  const start = {
    x: actor.position.x + direction.x * (actor.radius + 5),
    y: actor.position.y + direction.y * (actor.radius + 5),
  };
  let distance = config.railRange;
  let impactKind: "range" | "solid" | "actor" = "range";
  for (const solid of world.geometry.solids) {
    const solidDistance = rayRectDistance(start, direction, solid);
    if (solidDistance !== null && solidDistance < distance) {
      distance = solidDistance;
      impactKind = "solid";
    }
  }
  let target: ActorState | null = null;
  for (const candidate of world.actors) {
    if (!isEnemyTarget(actor, candidate)) {
      continue;
    }
    const targetDistance = rayCircleDistance(
      start,
      direction,
      candidate.position,
      candidate.radius + 5,
    );
    if (targetDistance !== null && targetDistance < distance) {
      distance = targetDistance;
      target = candidate;
      impactKind = "actor";
    }
  }
  const end = {
    x: start.x + direction.x * distance,
    y: start.y + direction.y * distance,
  };
  actor.weapons.railAmmo--;
  actor.weapons.railCooldownMs = config.railCooldownMs;
  const protectionEnded = cancelSpawnProtection(
    actor,
    world.timeMs,
    "attack",
  );
  const events: GameEvent[] = [
    ...(protectionEnded ? [protectionEnded] : []),
    {
    id: `weapon-rail-fired-${actor.id}-${world.timeMs}`,
    type: "weapon.railFired",
    timeMs: world.timeMs,
    sourceActorId: actor.id,
    targetActorId: target?.id,
    teamId: actor.teamId ?? undefined,
    payload: {
      start,
      end,
      hit: Boolean(target),
      impactKind,
      remainingAmmo: actor.weapons.railAmmo,
      cooldownMs: config.railCooldownMs,
    },
  }];
  if (target) {
    events.push(...applyDamage(
      target,
      config.railDamage,
      world.timeMs,
      V2_ACTOR_LIFECYCLE_CONFIG,
      actor.id,
      "rail",
    ).events);
  }
  return events;
}

function fireWhip(
  world: WorldState,
  actor: ActorState,
  config: V1WeaponConfig,
): readonly GameEvent[] {
  if (
    actor.weapons.whipCooldownMs > 0
  ) {
    return [];
  }
  const resolved = resolveNearestValidEnemy(
    actor,
    world.actors,
    world.geometry,
    config.whipRange,
  );
  if (!resolved) {
    return [{
      id: `weapon-whip-target-unavailable-${actor.id}-${world.timeMs}`,
      type: "weapon.whipTargetUnavailable",
      timeMs: world.timeMs,
      sourceActorId: actor.id,
      teamId: actor.teamId ?? undefined,
      payload: { range: config.whipRange },
    }];
  }
  const { target, direction } = resolved;
  actor.weapons.whipCooldownMs = config.whipCooldownMs;
  const protectionEnded = cancelSpawnProtection(
    actor,
    world.timeMs,
    "attack",
  );
  const events: GameEvent[] = [
    ...(protectionEnded ? [protectionEnded] : []),
    {
    id: `weapon-whip-fired-${actor.id}-${world.timeMs}`,
    type: "weapon.whipFired",
    timeMs: world.timeMs,
    sourceActorId: actor.id,
    targetActorId: target.id,
    teamId: actor.teamId ?? undefined,
    payload: {
      origin: { ...actor.position },
      direction,
      range: config.whipRange,
      halfAngle: config.whipHalfAngle,
      hit: true,
      targetPosition: { ...target.position },
      cooldownMs: config.whipCooldownMs,
    },
  }];
  events.push(...applyDamage(
    target,
    config.whipDamage,
    world.timeMs,
    V2_ACTOR_LIFECYCLE_CONFIG,
    actor.id,
    "whip",
  ).events);
  return events;
}

function fireArenaProjectile(
  world: WorldState,
  actor: ActorState,
  weaponId: "pulse" | "disc" | "shard",
  direction: WorldPosition,
): readonly GameEvent[] {
  const definition = ARENA_WEAPON_CATALOG[weaponId];
  const ammo = weaponAmmo(actor.weapons, weaponId) ?? 0;
  if (ammo <= 0 || weaponCooldown(actor.weapons, weaponId) > 0) {
    return [];
  }
  setWeaponAmmo(actor.weapons, weaponId, ammo - 1);
  setWeaponCooldown(actor.weapons, weaponId, definition.cooldownMs);
  const protectionEnded = cancelSpawnProtection(
    actor,
    world.timeMs,
    "attack",
  );
  const radius = weaponId === "disc" ? 14 : weaponId === "pulse" ? 6 : 5;
  const speed = weaponId === "pulse" ? 760 : weaponId === "disc" ? 620 : 560;
  const offset = actor.radius + radius + 3;
  const homingTarget = weaponId === "shard"
    ? selectShardTarget(world, actor, direction, definition.range)
    : null;
  const projectile: ProjectileState = {
    id: `${weaponId}-${actor.id}-${actor.lifeId}-${world.timeMs}`,
    ownerActorId: actor.id,
    teamId: actor.teamId,
    weaponId,
    position: {
      x: actor.position.x + direction.x * offset,
      y: actor.position.y + direction.y * offset,
    },
    velocity: {
      x: direction.x * speed,
      y: direction.y * speed,
    },
    damage: definition.damage,
    radius,
    remainingLifetimeMs: definition.range / speed * 1_000 + 80,
    remainingRange: definition.range,
    lifeState: "active",
    ...(weaponId === "disc"
      ? {
        ricochetsRemaining: 3,
        ricochetCount: 0,
        ricochetDamage: 50,
      }
      : {}),
    ...(homingTarget
      ? {
        homing: {
          targetActorId: homingTarget.id,
          turnRateRadiansPerSecond: 1.75,
        },
      }
      : {}),
  };
  world.projectiles.push(projectile);
  return [
    ...(protectionEnded ? [protectionEnded] : []),
    {
      id: `weapon-${weaponId}-fired-${projectile.id}`,
      type: `weapon.${weaponId}Fired`,
      timeMs: world.timeMs,
      sourceActorId: actor.id,
      teamId: actor.teamId ?? undefined,
      payload: {
        projectileId: projectile.id,
        position: { ...projectile.position },
        direction,
        targetActorId: homingTarget?.id,
        remainingAmmo: ammo - 1,
        cooldownMs: definition.cooldownMs,
      },
    },
    projectileSpawnedEvent(world, actor, projectile),
  ];
}

function fireGrenade(
  world: WorldState,
  actor: ActorState,
  direction: WorldPosition,
  requestedTarget: WorldPosition | null,
): readonly GameEvent[] {
  const weaponId = "grenade";
  const definition = ARENA_WEAPON_CATALOG[weaponId];
  const ammo = weaponAmmo(actor.weapons, weaponId) ?? 0;
  if (ammo <= 0 || weaponCooldown(actor.weapons, weaponId) > 0) {
    return [];
  }
  const target = resolveGrenadeTarget(
    world,
    actor.position,
    direction,
    requestedTarget,
    definition.range,
  );
  const distance = Math.hypot(
    target.x - actor.position.x,
    target.y - actor.position.y,
  );
  const flightMs = Math.max(480, Math.min(920, 360 + distance * .62));
  setWeaponAmmo(actor.weapons, weaponId, ammo - 1);
  setWeaponCooldown(actor.weapons, weaponId, definition.cooldownMs);
  const protectionEnded = cancelSpawnProtection(
    actor,
    world.timeMs,
    "attack",
  );
  const projectile: ProjectileState = {
    id: `grenade-${actor.id}-${actor.lifeId}-${world.timeMs}`,
    ownerActorId: actor.id,
    teamId: actor.teamId,
    weaponId,
    position: { ...actor.position },
    velocity: {
      x: (target.x - actor.position.x) / (flightMs / 1_000),
      y: (target.y - actor.position.y) / (flightMs / 1_000),
    },
    damage: definition.damage,
    radius: 11,
    splashRadius: 120,
    knockback: 135,
    remainingLifetimeMs: flightMs + 420,
    remainingRange: distance,
    lifeState: "active",
    visualHeight: 0,
    lob: {
      origin: { ...actor.position },
      target,
      elapsedMs: 0,
      flightMs,
      fuseMs: 320,
      landed: false,
      arcHeight: Math.max(90, Math.min(180, distance * .22)),
    },
  };
  world.projectiles.push(projectile);
  return [
    ...(protectionEnded ? [protectionEnded] : []),
    {
      id: `weapon-grenade-fired-${projectile.id}`,
      type: "weapon.grenadeFired",
      timeMs: world.timeMs,
      sourceActorId: actor.id,
      teamId: actor.teamId ?? undefined,
      payload: {
        projectileId: projectile.id,
        position: { ...projectile.position },
        target: { ...target },
        flightMs,
        remainingAmmo: ammo - 1,
        cooldownMs: definition.cooldownMs,
      },
    },
    projectileSpawnedEvent(world, actor, projectile),
  ];
}

function projectileSpawnedEvent(
  world: WorldState,
  actor: ActorState,
  projectile: ProjectileState,
): GameEvent {
  return {
    id: `projectile-spawned-${projectile.id}`,
    type: "projectile.spawned",
    timeMs: world.timeMs,
    sourceActorId: actor.id,
    teamId: actor.teamId ?? undefined,
    payload: {
      projectileId: projectile.id,
      weaponId: projectile.weaponId,
      position: { ...projectile.position },
      velocity: { ...projectile.velocity },
    },
  };
}

function selectShardTarget(
  world: WorldState,
  actor: ActorState,
  direction: WorldPosition,
  range: number,
): ActorState | null {
  const minimumDot = Math.cos(Math.PI * 28 / 180);
  return world.actors
    .filter((candidate) => isEnemyTarget(actor, candidate))
    .map((candidate) => {
      const dx = candidate.position.x - actor.position.x;
      const dy = candidate.position.y - actor.position.y;
      const distance = Math.hypot(dx, dy);
      const dot = distance > .0001
        ? (dx * direction.x + dy * direction.y) / distance
        : -1;
      return { candidate, distance, dot };
    })
    .filter(({ candidate, distance, dot }) =>
      distance <= range &&
      dot >= minimumDot &&
      !world.geometry.solids.some((solid) =>
        lineIntersectsRect(actor.position, candidate.position, solid)
      )
    )
    .sort((left, right) =>
      right.dot - left.dot ||
      left.distance - right.distance ||
      left.candidate.id.localeCompare(right.candidate.id)
    )[0]?.candidate ?? null;
}

function resolveGrenadeTarget(
  world: WorldState,
  origin: WorldPosition,
  direction: WorldPosition,
  requestedTarget: WorldPosition | null,
  range: number,
): WorldPosition {
  const raw = requestedTarget ?? {
    x: origin.x + direction.x * range,
    y: origin.y + direction.y * range,
  };
  const dx = raw.x - origin.x;
  const dy = raw.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const scale = distance > range ? range / distance : 1;
  const bounds = world.geometry.bounds;
  const target = {
    x: Math.max(bounds.minX + 16, Math.min(bounds.maxX - 16, origin.x + dx * scale)),
    y: Math.max(bounds.minY + 16, Math.min(bounds.maxY - 16, origin.y + dy * scale)),
  };
  const retreat = normalizedDirection({
    x: origin.x - target.x,
    y: origin.y - target.y,
  }) ?? { x: 0, y: 0 };
  for (let step = 0; step < 48 && pointBlocked(world, target); step++) {
    target.x += retreat.x * 14;
    target.y += retreat.y * 14;
  }
  return target;
}

function pointBlocked(world: WorldState, point: WorldPosition): boolean {
  return [...world.geometry.solids, ...world.geometry.gaps].some((rect) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function isEnemyTarget(owner: ActorState, target: ActorState): boolean {
  return target.id !== owner.id &&
    target.lifeState === "active" &&
    Boolean(owner.teamId) &&
    Boolean(target.teamId) &&
    owner.teamId !== target.teamId;
}

function readWeaponId(payload: unknown): V1WeaponId | null {
  if (!payload || typeof payload !== "object" || !("weaponId" in payload)) {
    return null;
  }
  const weaponId = (payload as { weaponId?: unknown }).weaponId;
  return isArenaWeaponId(weaponId) ? weaponId : null;
}

function readTargetPosition(payload: unknown): WorldPosition | null {
  if (!payload || typeof payload !== "object" || !("targetPosition" in payload)) {
    return null;
  }
  const value = (payload as { targetPosition?: unknown }).targetPosition;
  if (
    !value ||
    typeof value !== "object" ||
    !("x" in value) ||
    !("y" in value)
  ) {
    return null;
  }
  const { x, y } = value as { x?: unknown; y?: unknown };
  return typeof x === "number" && typeof y === "number" ? { x, y } : null;
}

function readAimDirection(input: CoreInputFrame): WorldPosition | null {
  return input.actions.find((intent) => intent.action === "aim")
    ?.direction ?? null;
}

function normalizedDirection(direction: WorldPosition): WorldPosition | null {
  const length = Math.hypot(direction.x, direction.y);
  return length > .0001
    ? { x: direction.x / length, y: direction.y / length }
    : null;
}

function rayRectDistance(
  origin: WorldPosition,
  direction: WorldPosition,
  rect: WorldRect,
): number | null {
  let near = 0;
  let far = Infinity;
  for (const [value, delta, min, max] of [
    [origin.x, direction.x, rect.x, rect.x + rect.width],
    [origin.y, direction.y, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(delta) < .0001) {
      if (value < min || value > max) {
        return null;
      }
      continue;
    }
    const first = (min - value) / delta;
    const second = (max - value) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) {
      return null;
    }
  }
  return far >= 0 ? Math.max(0, near) : null;
}

function rayCircleDistance(
  origin: WorldPosition,
  direction: WorldPosition,
  center: WorldPosition,
  radius: number,
): number | null {
  const dx = center.x - origin.x;
  const dy = center.y - origin.y;
  const projection = dx * direction.x + dy * direction.y;
  if (projection < 0) {
    return null;
  }
  const perpendicularSquared = dx * dx + dy * dy - projection * projection;
  const radiusSquared = radius * radius;
  if (perpendicularSquared > radiusSquared) {
    return null;
  }
  return projection - Math.sqrt(radiusSquared - perpendicularSquared);
}

function lineIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: WorldRect,
): boolean {
  const direction = { x: to.x - from.x, y: to.y - from.y };
  const distance = rayRectDistance(from, direction, rect);
  return distance !== null && distance <= 1;
}
