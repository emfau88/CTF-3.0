import type { ActorState, WorldPosition } from "../actors";
import type { CoreActionIntent } from "../input";
import type { WorldRect, WorldSnapshot } from "../world";
import {
  V2_BOT_COMBAT_CONFIG,
  type BotCombatConfig,
} from "./BotCombatConfig";

type BotWeaponId = "rocket" | "rail" | "whip";

export class TdmBotCombatController {
  private rocketDecisionCooldownMs = 0;
  private railReactionRemainingMs = 0;
  private railTargetKey: string | null = null;
  private railShotSequence = 0;
  private rocketShotSequence = 0;

  constructor(
    private readonly config: BotCombatConfig = V2_BOT_COMBAT_CONFIG,
  ) {}

  readAction(
    actor: Readonly<ActorState>,
    target: Readonly<ActorState>,
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): CoreActionIntent | null {
    this.rocketDecisionCooldownMs = Math.max(
      0,
      this.rocketDecisionCooldownMs - Math.max(0, deltaMs),
    );
    if (
      actor.lifeState !== "active" ||
      target.lifeState !== "active" ||
      !actor.teamId ||
      !target.teamId ||
      actor.teamId === target.teamId ||
      !hasLineOfSight(actor.position, target.position, snapshot.geometry.solids)
    ) {
      this.resetRailTarget();
      return null;
    }

    this.updateRailTarget(target, deltaMs);
    const directAim = directionBetween(actor.position, target.position);
    const distance = distanceBetween(actor.position, target.position);
    const weaponId = this.chooseWeapon(actor, target, distance);
    if (!weaponId) {
      return null;
    }
    if (weaponId === "rocket") {
      this.rocketDecisionCooldownMs = this.config.rocketDecisionCooldownMs;
    }
    const direction = weaponId === "rail"
      ? this.createRailAim(actor, target, directAim, distance)
      : weaponId === "rocket"
      ? this.createRocketAim(actor, target, snapshot)
      : directAim;
    return {
      action: "fireWeapon",
      phase: "pressed",
      actorId: actor.id,
      direction,
      payload: { weaponId },
    };
  }

  reset(): void {
    this.rocketDecisionCooldownMs = 0;
    this.resetRailTarget();
    this.railShotSequence = 0;
    this.rocketShotSequence = 0;
  }

  private updateRailTarget(
    target: Readonly<ActorState>,
    deltaMs: number,
  ): void {
    const targetKey = `${target.id}:${target.lifeId}`;
    if (this.railTargetKey !== targetKey) {
      this.railTargetKey = targetKey;
      this.railReactionRemainingMs = this.config.railReactionMs;
      return;
    }
    this.railReactionRemainingMs = Math.max(
      0,
      this.railReactionRemainingMs - Math.max(0, deltaMs),
    );
  }

  private resetRailTarget(): void {
    this.railTargetKey = null;
    this.railReactionRemainingMs = 0;
  }

  private createRailAim(
    actor: Readonly<ActorState>,
    target: Readonly<ActorState>,
    directAim: WorldPosition,
    distance: number,
  ): WorldPosition {
    const sample = deterministicSignedUnit(
      `${actor.id}:${actor.lifeId}:${target.id}:${target.lifeId}:${this.railShotSequence}`,
    );
    this.railShotSequence++;
    const longRangeProgress = clamp01(
      (distance - this.config.railPreferredMinRange) /
        Math.max(1, this.config.railRange - this.config.railPreferredMinRange),
    );
    const jitterMultiplier = 1 + longRangeProgress *
      (this.config.railLongRangeJitterMultiplier - 1);
    return rotateDirection(
      directAim,
      sample * this.config.railAimJitterRadians * jitterMultiplier,
    );
  }

  private createRocketAim(
    actor: Readonly<ActorState>,
    target: Readonly<ActorState>,
    snapshot: WorldSnapshot,
  ): WorldPosition {
    const sequence = this.rocketShotSequence++;
    const leadSeconds = interceptTimeSeconds(
      actor.position,
      target.position,
      target.velocity,
      this.config.rocketProjectileSpeed,
      this.config.rocketMaxLeadMs / 1000,
    );
    const predictedTarget = {
      x: target.position.x + target.velocity.x * leadSeconds,
      y: target.position.y + target.velocity.y * leadSeconds,
    };
    const surfaceSample = deterministicSignedUnit(
      `${actor.id}:${actor.lifeId}:${target.id}:${target.lifeId}:${sequence}:surface`,
    );
    const surfaceTarget = surfaceSample >
        1 - this.config.rocketSurfaceAimChance * 2
      ? nearestRocketSurfacePoint(
        actor.position,
        predictedTarget,
        target.radius,
        snapshot.geometry.solids,
        this.config.rocketSplashRadius,
      )
      : null;
    const aim = directionBetween(
      actor.position,
      surfaceTarget ?? predictedTarget,
    );
    const jitterSample = deterministicSignedUnit(
      `${actor.id}:${actor.lifeId}:${target.id}:${target.lifeId}:${sequence}:jitter`,
    );
    return rotateDirection(
      aim,
      jitterSample * this.config.rocketAimJitterRadians,
    );
  }

  private chooseWeapon(
    actor: Readonly<ActorState>,
    target: Readonly<ActorState>,
    distance: number,
  ): BotWeaponId | null {
    if (
      actor.weapons.whipCooldownMs <= 0 &&
      distance <= this.config.whipRange + target.radius
    ) {
      return "whip";
    }
    const railAvailable =
      actor.weapons.railAmmo > 0 &&
      actor.weapons.railCooldownMs <= 0 &&
      distance <= this.config.railRange;
    if (railAvailable && distance >= this.config.railPreferredMinRange) {
      return this.railReactionRemainingMs <= 0 ? "rail" : null;
    }
    if (
      actor.weapons.rocketAmmo > 0 &&
      this.rocketDecisionCooldownMs <= 0 &&
      distance >= this.config.rocketMinRange &&
      distance <= this.config.rocketMaxRange
    ) {
      return "rocket";
    }
    if (
      railAvailable &&
      this.railReactionRemainingMs <= 0 &&
      distance < this.config.railPreferredMinRange
    ) {
      return "rail";
    }
    return null;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function interceptTimeSeconds(
  origin: WorldPosition,
  target: WorldPosition,
  velocity: WorldPosition,
  projectileSpeed: number,
  maximum: number,
): number {
  const rx = target.x - origin.x;
  const ry = target.y - origin.y;
  const a = velocity.x * velocity.x + velocity.y * velocity.y -
    projectileSpeed * projectileSpeed;
  const b = 2 * (rx * velocity.x + ry * velocity.y);
  const c = rx * rx + ry * ry;
  let time = Math.sqrt(c) / Math.max(1, projectileSpeed);
  if (Math.abs(a) < .000001) {
    if (Math.abs(b) > .000001) {
      const linear = -c / b;
      if (linear > 0) time = linear;
    }
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const first = (-b - root) / (2 * a);
      const second = (-b + root) / (2 * a);
      const positive = [first, second].filter((value) => value > 0);
      if (positive.length > 0) time = Math.min(...positive);
    }
  }
  return Math.max(0, Math.min(maximum, time));
}

function nearestRocketSurfacePoint(
  origin: WorldPosition,
  target: WorldPosition,
  targetRadius: number,
  solids: readonly WorldRect[],
  splashRadius: number,
): WorldPosition | null {
  const maximumSurfaceDistance = Math.max(
    0,
    splashRadius - targetRadius - 4,
  );
  let best: { readonly point: WorldPosition; readonly distance: number } | null =
    null;
  for (const solid of solids) {
    const point = {
      x: Math.max(solid.x, Math.min(solid.x + solid.width, target.x)),
      y: Math.max(solid.y, Math.min(solid.y + solid.height, target.y)),
    };
    const targetDistance = distanceBetween(point, target);
    if (
      targetDistance <= .0001 ||
      targetDistance > maximumSurfaceDistance ||
      solids.some((other) =>
        other.id !== solid.id &&
        lineIntersectsRect(origin, point, other)
      )
    ) {
      continue;
    }
    if (!best || targetDistance < best.distance) {
      best = { point, distance: targetDistance };
    }
  }
  return best?.point ?? null;
}

function deterministicSignedUnit(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff * 2 - 1;
}

function rotateDirection(
  direction: WorldPosition,
  angle: number,
): WorldPosition {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos,
  };
}

export function directionBetween(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > .0001 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

export function distanceBetween(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function hasLineOfSight(
  from: WorldPosition,
  to: WorldPosition,
  solids: readonly WorldRect[],
): boolean {
  return !solids.some((solid) => lineIntersectsRect(from, to, solid));
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
