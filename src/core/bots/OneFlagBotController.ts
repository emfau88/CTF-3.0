import type { ActorState, WorldPosition } from "../actors";
import type { CoreActionIntent } from "../input";
import type { WorldMapData, WorldSnapshot } from "../world";
import {
  V2_BOT_MOVEMENT_CONFIG,
  type BotMovementConfig,
} from "./BotMovementConfig";
import {
  GridBotNavigator,
  type BotNavigator,
} from "./GridBotNavigator";
import { V2_BOT_NAVIGATION_CONFIG } from "./BotNavigationConfig";
import { planWeaponAwareCombatStandoff } from "./BotCombatStandoff";
import {
  OneFlagBotDecisionController,
  type OneFlagBotGoal,
} from "./OneFlagBotDecisionController";
import { TdmBotCombatController } from "./TdmBotCombatController";
import {
  BOT_DIFFICULTY_PROFILES,
  createBotPersonality,
  type BotDifficultyProfile,
  type BotPersonality,
} from "./BotDifficulty";
import type { BotDecisionTrace } from "./BotDecisionUtility";
import type { BotCombatAssessment } from "./BotCombatOpportunity";
import { BotTargetSelector } from "./BotTargetSelector";
import {
  planLocalBotSteering,
  type BotLocalSteering,
} from "./BotLocalMovement";
import {
  type ArenaBotTeamCoordinator,
  type BotTeamAssignment,
} from "./BotTeamCoordinator";

export interface OneFlagBotControllerDebugState {
  readonly actorId: string;
  readonly goalKind: OneFlagBotGoal["kind"] | null;
  readonly goalTarget: WorldPosition | null;
  readonly navigationTarget: WorldPosition | null;
  readonly navigationTargetKey: string;
  readonly projectionApplied: boolean;
  readonly projectionDistance: number;
  readonly combatTargetId: string | null;
  readonly standoffKey: string | null;
  readonly holdPosition: boolean;
  readonly combatAssessment: BotCombatAssessment | null;
  readonly targetTrace: BotDecisionTrace<"combat-target"> | null;
  readonly steering: BotLocalSteering;
  readonly teamAssignment: BotTeamAssignment | null;
}

export class OneFlagBotController {
  private jumpHeld = false;
  private readonly decision: OneFlagBotDecisionController;
  private lastDebugState: OneFlagBotControllerDebugState;
  private readonly targetSelector: BotTargetSelector;
  private readonly combat: TdmBotCombatController;

  constructor(
    private readonly actorId: string,
    map: WorldMapData,
    private readonly movement: BotMovementConfig = V2_BOT_MOVEMENT_CONFIG,
    private readonly navigator: BotNavigator = new GridBotNavigator(),
    combat: TdmBotCombatController | undefined = undefined,
    private readonly difficulty: BotDifficultyProfile =
      BOT_DIFFICULTY_PROFILES.normal,
    private readonly personality: BotPersonality =
      createBotPersonality(actorId),
    private readonly coordinator?: ArenaBotTeamCoordinator,
  ) {
    this.combat = combat ?? new TdmBotCombatController(undefined, difficulty);
    this.decision = new OneFlagBotDecisionController(map);
    this.targetSelector = new BotTargetSelector(difficulty, personality);
    this.lastDebugState = createEmptyDebugState(actorId);
  }

  readActions(
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): readonly CoreActionIntent[] {
    const actor = findActiveActor(snapshot, this.actorId);
    if (!actor || snapshot.match?.phase === "ended") {
      this.navigator.reset();
      this.resetTransientState();
      this.lastDebugState = createEmptyDebugState(this.actorId);
      return [this.stopIntent()];
    }

    const teamAssignment =
      this.coordinator?.assignmentFor(actor.id, snapshot) ?? null;
    const goal = this.decision.chooseGoal(
      actor,
      snapshot,
      teamAssignment?.oneFlagRole ?? undefined,
    );
    const targetSelection = this.targetSelector.select(
      actor,
      snapshot,
      deltaMs,
      teamAssignment?.combatTargetActorId,
    );
    const combatTarget = targetSelection.target;
    const shouldApplyStandoff = combatTarget &&
      isCombatChaseGoal(goal.kind) &&
      positionsMatch(goal.position, combatTarget.position);
    const navigationTarget = shouldApplyStandoff
      ? planWeaponAwareCombatStandoff(
        actor,
        combatTarget,
        snapshot,
        this.movement,
        targetSelection.targetPerceived,
      )
      : null;
    const desiredTarget = navigationTarget?.targetPosition ?? goal.position;
    const shouldProjectDynamicTarget = shouldApplyStandoff ||
      goal.kind === "escort-carrier";
    const projectedTarget = shouldProjectDynamicTarget
      ? projectDynamicCarrierTarget(
        actor.position,
        desiredTarget,
        snapshot,
      )
      : desiredTarget;
    const projectionDistance = distanceBetweenPoints(
      desiredTarget,
      projectedTarget,
    );
    const navigation = navigationTarget?.holdPosition
      ? {
        direction: { x: 0, y: 0 } as const,
        jump: false,
        recoveryStage: 0 as const,
      }
      : this.navigator.navigate(
        actor.position,
        projectedTarget,
        navigationTarget
          ? `${goal.targetKey}:${navigationTarget.key}`
          : goal.targetKey,
        snapshot,
        deltaMs,
      );
    const steering = navigation.recoveryStage
      ? {
        direction: navigation.direction,
        overrideHold: true,
        reason: "stuck-recovery" as const,
      }
      : planLocalBotSteering(
        actor,
        navigation.direction,
        snapshot,
        this.personality,
      );
    this.lastDebugState = {
      actorId: actor.id,
      goalKind: goal.kind,
      goalTarget: { ...goal.position },
      navigationTarget: { ...projectedTarget },
      navigationTargetKey: navigationTarget
        ? `${goal.targetKey}:${navigationTarget.key}`
        : goal.targetKey,
      projectionApplied: projectionDistance > .001,
      projectionDistance,
      combatTargetId: combatTarget?.id ?? null,
      standoffKey: navigationTarget?.key ?? null,
      holdPosition: navigationTarget?.holdPosition ?? false,
      combatAssessment: navigationTarget?.assessment ?? null,
      targetTrace: targetSelection.trace,
      steering,
      teamAssignment,
    };
    const aimDirection = combatTarget
      ? directionBetween(actor.position, combatTarget.position)
      : directionBetween(actor.position, goal.position);
    const actions: CoreActionIntent[] = [{
      action: "move",
      phase: "held",
      actorId: actor.id,
      direction: steering.direction,
      magnitude: navigationTarget?.holdPosition && !steering.overrideHold
        ? 0
        : this.movement.inputMagnitude,
    }, {
      action: "aim",
      phase: "held",
      actorId: actor.id,
      direction: aimDirection,
    }];
    if (combatTarget) {
      const weaponAction = this.combat.readAction(
        actor,
        combatTarget,
        snapshot,
        deltaMs,
        targetSelection.targetPerceived,
      );
      if (weaponAction) actions.push(weaponAction);
    }
    this.appendJumpActions(actions, actor, navigation.jump);
    return actions;
  }

  reset(): void {
    this.navigator.reset();
    this.decision.reset();
    this.resetTransientState();
    this.lastDebugState = createEmptyDebugState(this.actorId);
  }

  debugSnapshot(): OneFlagBotControllerDebugState {
    return {
      ...this.lastDebugState,
      goalTarget: this.lastDebugState.goalTarget
        ? { ...this.lastDebugState.goalTarget }
        : null,
      navigationTarget: this.lastDebugState.navigationTarget
        ? { ...this.lastDebugState.navigationTarget }
        : null,
    };
  }

  private resetTransientState(): void {
    this.combat.reset();
    this.targetSelector.reset();
    this.jumpHeld = false;
  }

  private appendJumpActions(
    actions: CoreActionIntent[],
    actor: Readonly<ActorState>,
    jump: boolean,
  ): void {
    const continueHeldJump = this.jumpHeld && !actor.jump.grounded;
    if (jump || continueHeldJump) {
      let requestedJumpStart = false;
      if (
        jump &&
        !this.jumpHeld &&
        actor.jump.grounded &&
        actor.jump.cooldownRemainingMs <= 0
      ) {
        actions.push({
          action: "jump",
          phase: "pressed",
          actorId: actor.id,
        });
        requestedJumpStart = true;
      }
      actions.push({
        action: "jump",
        phase: "held",
        actorId: actor.id,
      });
      this.jumpHeld = requestedJumpStart ||
        continueHeldJump;
    } else if (this.jumpHeld) {
      actions.push({
        action: "jump",
        phase: "released",
        actorId: actor.id,
      });
      this.jumpHeld = false;
    }
  }

  private stopIntent(): CoreActionIntent {
    return {
      action: "move",
      phase: "held",
      actorId: this.actorId,
      direction: { x: 0, y: 0 },
      magnitude: 0,
    };
  }
}

function findActiveActor(
  snapshot: WorldSnapshot,
  actorId: string,
): Readonly<ActorState> | null {
  return snapshot.actors.find((actor) =>
    actor.id === actorId && actor.lifeState === "active"
  ) ?? null;
}

function directionBetween(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > .0001 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

function isCombatChaseGoal(kind: OneFlagBotGoal["kind"]): boolean {
  return kind === "chase-enemy-carrier";
}

function positionsMatch(left: WorldPosition, right: WorldPosition): boolean {
  return Math.abs(left.x - right.x) < .001 && Math.abs(left.y - right.y) < .001;
}

function projectDynamicCarrierTarget(
  actor: WorldPosition,
  desiredTarget: WorldPosition,
  snapshot: Pick<WorldSnapshot, "geometry">,
): WorldPosition {
  if (!blocked(desiredTarget, snapshot)) {
    return desiredTarget;
  }
  const fallbackAxis = normalizedDirection(desiredTarget, actor);
  const axes = [
    fallbackAxis,
    { x: -fallbackAxis.y, y: fallbackAxis.x },
    { x: fallbackAxis.y, y: -fallbackAxis.x },
  ];
  for (const axis of axes) {
    for (let distance = 16; distance <= 240; distance += 16) {
      const candidate = clampToBounds({
        x: desiredTarget.x + axis.x * distance,
        y: desiredTarget.y + axis.y * distance,
      }, snapshot);
      if (!blocked(candidate, snapshot)) {
        return candidate;
      }
    }
  }
  return desiredTarget;
}

function normalizedDirection(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= .0001) {
    return { x: -1, y: 0 };
  }
  return { x: dx / length, y: dy / length };
}

function blocked(
  point: WorldPosition,
  snapshot: Pick<WorldSnapshot, "geometry">,
): boolean {
  return [...snapshot.geometry.solids, ...snapshot.geometry.gaps].some((rect) =>
    point.x >= rect.x - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
    point.x <= rect.x + rect.width + V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
    point.y >= rect.y - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
    point.y <= rect.y + rect.height + V2_BOT_NAVIGATION_CONFIG.obstaclePadding
  );
}

function clampToBounds(
  point: WorldPosition,
  snapshot: Pick<WorldSnapshot, "geometry">,
): WorldPosition {
  return {
    x: Math.min(
      snapshot.geometry.bounds.maxX,
      Math.max(snapshot.geometry.bounds.minX, point.x),
    ),
    y: Math.min(
      snapshot.geometry.bounds.maxY,
      Math.max(snapshot.geometry.bounds.minY, point.y),
    ),
  };
}

function createEmptyDebugState(actorId: string): OneFlagBotControllerDebugState {
  return {
    actorId,
    goalKind: null,
    goalTarget: null,
    navigationTarget: null,
    navigationTargetKey: "",
    projectionApplied: false,
    projectionDistance: 0,
    combatTargetId: null,
    standoffKey: null,
    holdPosition: false,
    combatAssessment: null,
    targetTrace: null,
    steering: {
      direction: { x: 0, y: 0 },
      overrideHold: false,
      reason: "none",
    },
    teamAssignment: null,
  };
}

function distanceBetweenPoints(
  left: WorldPosition,
  right: WorldPosition,
): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
