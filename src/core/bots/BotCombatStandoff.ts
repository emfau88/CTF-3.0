import type { ActorState, WorldPosition } from "../actors";
import type { WorldRect, WorldSnapshot } from "../world";
import {
  assessCombatOpportunity,
  directionBetween,
  distanceBetween,
  hasLineOfSight,
  type BotCombatAssessment,
} from "./BotCombatOpportunity";
import type { BotMovementConfig } from "./BotMovementConfig";

export interface CombatStandoffPlan {
  readonly holdPosition: boolean;
  readonly key: string;
  readonly targetPosition: WorldPosition;
  readonly assessment?: BotCombatAssessment;
}

export function planWeaponAwareCombatStandoff(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  snapshot: Pick<WorldSnapshot, "geometry" | "map">,
  movement: BotMovementConfig,
  targetPerceived = true,
): CombatStandoffPlan {
  const assessment = assessCombatOpportunity(actor, target, snapshot);
  if (!targetPerceived) {
    return {
      holdPosition: false,
      key: `search:${assessment.movementWeaponId ?? "none"}`,
      targetPosition: { ...target.position },
      assessment,
    };
  }
  const gapBetween = crossesGap(
    actor.position,
    target.position,
    snapshot.geometry.gaps,
    movement.standoffMinRange * .5,
  );
  if (assessment.posture === "pursue" || gapBetween) {
    return {
      holdPosition: false,
      key: `pursue:${assessment.movementWeaponId ?? "none"}`,
      targetPosition: { ...target.position },
      assessment,
    };
  }
  if (assessment.posture === "hold") {
    return {
      holdPosition: true,
      key: `hold:${assessment.movementWeaponId ?? "none"}`,
      targetPosition: { ...actor.position },
      assessment,
    };
  }
  const axis = directionBetween(actor.position, target.position);
  const fallbackAxis = axis.x === 0 && axis.y === 0 ? { x: -1, y: 0 } : axis;
  const desiredRange = assessment.desiredRange > 0
    ? assessment.desiredRange
    : movement.standoffDesiredRange;
  return {
    holdPosition: false,
    key: `${assessment.posture}:${assessment.movementWeaponId ?? "none"}`,
    targetPosition: {
      x: target.position.x - fallbackAxis.x * desiredRange,
      y: target.position.y - fallbackAxis.y * desiredRange,
    },
    assessment,
  };
}

export function planCombatStandoff(
  actor: WorldPosition,
  target: WorldPosition,
  snapshot: Pick<WorldSnapshot, "geometry">,
  movement: BotMovementConfig,
): CombatStandoffPlan {
  const lineOfSight = hasLineOfSight(
    actor,
    target,
    snapshot.geometry.solids,
  );
  const gapBetween = crossesGap(
    actor,
    target,
    snapshot.geometry.gaps,
    movement.standoffMinRange * .5,
  );
  if (!lineOfSight || gapBetween) {
    return {
      holdPosition: false,
      key: "pursue",
      targetPosition: target,
    };
  }
  const distance = distanceBetween(actor, target);
  if (
    distance >= movement.standoffMinRange &&
    distance <= movement.standoffMaxRange
  ) {
    return {
      holdPosition: true,
      key: "hold",
      targetPosition: actor,
    };
  }
  const axis = directionBetween(actor, target);
  const fallbackAxis = axis.x === 0 && axis.y === 0 ? { x: -1, y: 0 } : axis;
  return {
    holdPosition: false,
    key: distance < movement.standoffMinRange ? "retreat" : "close",
    targetPosition: {
      x: target.x - fallbackAxis.x * movement.standoffDesiredRange,
      y: target.y - fallbackAxis.y * movement.standoffDesiredRange,
    },
  };
}

function crossesGap(
  from: WorldPosition,
  to: WorldPosition,
  gaps: readonly WorldRect[],
  padding: number,
): boolean {
  return gaps.some((gap) =>
    lineIntersectsRect(from, to, {
      ...gap,
      x: gap.x - padding,
      y: gap.y - padding,
      width: gap.width + padding * 2,
      height: gap.height + padding * 2,
    })
  );
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
