import type { ActorState, WorldPosition } from "../actors";
import {
  ARENA_WEAPON_CATALOG,
  weaponAmmo,
  weaponCooldown,
  type ArenaWeaponId,
} from "../weapons";
import type { WorldRect, WorldSnapshot } from "../world";
import type { BotCombatConfig } from "./BotCombatConfig";
import { V2_BOT_COMBAT_CONFIG } from "./BotCombatConfig";

export type BotCombatPosture =
  | "hold"
  | "close"
  | "retreat"
  | "pursue";

export interface BotWeaponOpportunity {
  readonly weaponId: ArenaWeaponId;
  readonly hasAmmo: boolean;
  readonly ready: boolean;
  readonly geometryAllowsShot: boolean;
  readonly inTacticalRange: boolean;
  readonly minimumRange: number;
  readonly preferredRange: number;
  readonly maximumRange: number;
  readonly score: number;
  readonly reason: string;
}

export interface BotCombatAssessment {
  readonly distance: number;
  readonly lineOfSight: boolean;
  readonly canAttackNow: boolean;
  readonly canAttackAtCurrentRange: boolean;
  readonly selectedWeaponId: ArenaWeaponId | null;
  readonly movementWeaponId: ArenaWeaponId | null;
  readonly posture: BotCombatPosture;
  readonly desiredRange: number;
  readonly opportunities: readonly BotWeaponOpportunity[];
}

interface TacticalRange {
  readonly minimum: number;
  readonly preferred: number;
  readonly maximum: number;
  readonly baseScore: number;
}

const WEAPON_TACTICS: Readonly<Record<ArenaWeaponId, TacticalRange>> = {
  whip: { minimum: 56, preferred: 96, maximum: 136, baseScore: .72 },
  rocket: { minimum: 190, preferred: 340, maximum: 700, baseScore: .86 },
  rail: { minimum: 300, preferred: 560, maximum: 1_100, baseScore: .82 },
  pulse: { minimum: 90, preferred: 280, maximum: 640, baseScore: .7 },
  disc: { minimum: 170, preferred: 380, maximum: 900, baseScore: .76 },
  grenade: { minimum: 220, preferred: 430, maximum: 850, baseScore: .68 },
  shard: { minimum: 70, preferred: 250, maximum: 700, baseScore: .74 },
};

export function assessCombatOpportunity(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  snapshot: Pick<WorldSnapshot, "geometry" | "map">,
  config: BotCombatConfig = V2_BOT_COMBAT_CONFIG,
): BotCombatAssessment {
  const distance = distanceBetween(actor.position, target.position);
  const lineOfSight = hasLineOfSight(
    actor.position,
    target.position,
    snapshot.geometry.solids,
  );
  const roster = snapshot.map?.weaponRoster ?? ["whip", "rocket", "rail"];
  const opportunities = roster.map((weaponId) =>
    evaluateWeapon(
      weaponId,
      actor,
      target,
      distance,
      lineOfSight,
      config,
    )
  ).sort((left, right) =>
    right.score - left.score || left.weaponId.localeCompare(right.weaponId)
  );
  const current = opportunities.find((opportunity) =>
    opportunity.hasAmmo &&
    opportunity.geometryAllowsShot &&
    opportunity.inTacticalRange
  ) ?? null;
  const ready = opportunities.find((opportunity) =>
    opportunity.hasAmmo &&
    opportunity.ready &&
    opportunity.geometryAllowsShot &&
    opportunity.inTacticalRange
  ) ?? null;
  const movement = current ?? nearestReachableOpportunity(opportunities, distance);
  const desiredRange = movement?.preferredRange ?? 0;
  const posture = !lineOfSight &&
      movement?.weaponId !== "grenade"
    ? "pursue"
    : current
    ? "hold"
    : distance < (movement?.minimumRange ?? 0)
    ? "retreat"
    : "close";
  return {
    distance,
    lineOfSight,
    canAttackNow: ready !== null,
    canAttackAtCurrentRange: current !== null,
    selectedWeaponId: ready?.weaponId ?? null,
    movementWeaponId: movement?.weaponId ?? null,
    posture,
    desiredRange,
    opportunities,
  };
}

export function hasUsableAmmoWeapon(
  actor: Readonly<ActorState>,
  roster: readonly ArenaWeaponId[],
): boolean {
  return roster.some((weaponId) =>
    weaponId !== "whip" && (weaponAmmo(actor.weapons, weaponId) ?? 0) > 0
  );
}

function evaluateWeapon(
  weaponId: ArenaWeaponId,
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  distance: number,
  lineOfSight: boolean,
  config: BotCombatConfig,
): BotWeaponOpportunity {
  const tactics = tacticalRange(weaponId, target.radius, config);
  const ammo = weaponAmmo(actor.weapons, weaponId);
  const hasAmmo = ammo === null || ammo > 0;
  const ready = hasAmmo && weaponCooldown(actor.weapons, weaponId) <= 0;
  const geometryAllowsShot = lineOfSight || weaponId === "grenade";
  const inTacticalRange =
    distance >= tactics.minimum && distance <= tactics.maximum;
  const rangeFit = 1 - Math.min(
    1,
    Math.abs(distance - tactics.preferred) /
      Math.max(1, tactics.maximum - tactics.minimum),
  );
  const score = hasAmmo
    ? tactics.baseScore + rangeFit * .22 +
      (ready ? .05 : 0) +
      (geometryAllowsShot ? .04 : -.35) +
      (inTacticalRange ? .08 : -.12)
    : -1;
  return {
    weaponId,
    hasAmmo,
    ready,
    geometryAllowsShot,
    inTacticalRange,
    minimumRange: tactics.minimum,
    preferredRange: tactics.preferred,
    maximumRange: Math.min(
      tactics.maximum,
      ARENA_WEAPON_CATALOG[weaponId].range,
    ),
    score,
    reason: !hasAmmo
      ? "no-ammo"
      : !geometryAllowsShot
      ? "no-line-of-sight"
      : !inTacticalRange
      ? distance < tactics.minimum ? "too-close" : "too-far"
      : !ready
      ? "cooldown"
      : "ready",
  };
}

function tacticalRange(
  weaponId: ArenaWeaponId,
  targetRadius: number,
  config: BotCombatConfig,
): TacticalRange {
  if (weaponId === "whip") {
    return {
      ...WEAPON_TACTICS.whip,
      maximum: config.whipRange + targetRadius,
    };
  }
  if (weaponId === "rocket") {
    return {
      ...WEAPON_TACTICS.rocket,
      minimum: config.rocketMinRange,
      maximum: config.rocketMaxRange,
    };
  }
  if (weaponId === "rail") {
    return {
      ...WEAPON_TACTICS.rail,
      minimum: config.railPreferredMinRange,
      maximum: config.railRange,
    };
  }
  return WEAPON_TACTICS[weaponId];
}

function nearestReachableOpportunity(
  opportunities: readonly BotWeaponOpportunity[],
  distance: number,
): BotWeaponOpportunity | null {
  return [...opportunities]
    .filter((opportunity) => opportunity.hasAmmo)
    .sort((left, right) => {
      const leftGap = rangeGap(left, distance);
      const rightGap = rangeGap(right, distance);
      return leftGap - rightGap ||
        right.score - left.score ||
        left.weaponId.localeCompare(right.weaponId);
    })[0] ?? null;
}

function rangeGap(
  opportunity: BotWeaponOpportunity,
  distance: number,
): number {
  if (distance < opportunity.minimumRange) {
    return opportunity.minimumRange - distance;
  }
  if (distance > opportunity.maximumRange) {
    return distance - opportunity.maximumRange;
  }
  return 0;
}

export function hasLineOfSight(
  from: WorldPosition,
  to: WorldPosition,
  solids: readonly WorldRect[],
): boolean {
  return !solids.some((solid) => lineIntersectsRect(from, to, solid));
}

export function distanceBetween(
  left: WorldPosition,
  right: WorldPosition,
): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export function directionBetween(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  return length > .0001
    ? { x: deltaX / length, y: deltaY / length }
    : { x: 0, y: 0 };
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
  for (const [origin, direction, minimum, maximum] of [
    [from.x, dx, rect.x, rect.x + rect.width],
    [from.y, dy, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(direction) < .0001) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return far >= 0 && near <= 1;
}
