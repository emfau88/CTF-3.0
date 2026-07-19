import type { ActorState, TeamId, WorldPosition } from "../actors";
import type { CoreActionIntent } from "../input";
import type { WorldMapData, WorldSnapshot } from "../world";
import {
  V2_BOT_MOVEMENT_CONFIG,
  type BotMovementConfig,
} from "./BotMovementConfig";
import {
  ClassicCtfBotDecisionController,
  type ClassicCtfBotGoal,
  type ClassicCtfBotRole,
  type ClassicCtfTeamCommand,
} from "./ClassicCtfBotDecisionController";
import {
  GridBotNavigator,
  type BotNavigator,
} from "./GridBotNavigator";
import { planWeaponAwareCombatStandoff } from "./BotCombatStandoff";
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

export interface ClassicCtfBotControllerDebugState {
  readonly actorId: string;
  readonly goalKind: ClassicCtfBotGoal["kind"] | null;
  readonly goalTarget: WorldPosition | null;
  readonly navigationTarget: WorldPosition | null;
  readonly navigationTargetKey: string;
  readonly combatTargetId: string | null;
  readonly standoffKey: string | null;
  readonly holdPosition: boolean;
  readonly combatAssessment: BotCombatAssessment | null;
  readonly targetTrace: BotDecisionTrace<"combat-target"> | null;
  readonly steering: BotLocalSteering;
  readonly teamAssignment: BotTeamAssignment | null;
}

export class ClassicCtfBotController {
  private jumpHeld = false;
  private readonly decision: ClassicCtfBotDecisionController;
  private lastDebugState: ClassicCtfBotControllerDebugState;
  private readonly targetSelector: BotTargetSelector;
  private readonly combat: TdmBotCombatController;

  constructor(
    private readonly actorId: string,
    role: ClassicCtfBotRole,
    map: WorldMapData,
    private readonly movement: BotMovementConfig =
      V2_BOT_MOVEMENT_CONFIG,
    private readonly navigator: BotNavigator = new GridBotNavigator(),
    combat: TdmBotCombatController | undefined = undefined,
    private readonly difficulty: BotDifficultyProfile =
      BOT_DIFFICULTY_PROFILES.normal,
    private readonly personality: BotPersonality =
      createBotPersonality(actorId),
    private readonly coordinator?: ArenaBotTeamCoordinator,
  ) {
    this.combat = combat ?? new TdmBotCombatController(undefined, difficulty);
    this.decision = new ClassicCtfBotDecisionController(role, map);
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
      teamAssignment?.classicCtfRole
        ? {
          role: teamAssignment.classicCtfRole,
          command: teamAssignment.classicCtfCommand,
          emergencyDuty: teamAssignment.classicCtfEmergencyDuty,
        }
        : undefined,
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
    const navigation = navigationTarget?.holdPosition
      ? {
        direction: { x: 0, y: 0 } as const,
        jump: false,
        recoveryStage: 0 as const,
      }
      : this.navigator.navigate(
        actor.position,
        navigationTarget?.targetPosition ?? goal.position,
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
      navigationTarget: {
        ...(navigationTarget?.targetPosition ?? goal.position),
      },
      navigationTargetKey: navigationTarget
        ? `${goal.targetKey}:${navigationTarget.key}`
        : goal.targetKey,
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

  setTeamCommand(teamId: TeamId, command: ClassicCtfTeamCommand): void {
    this.coordinator?.setTeamCommand(teamId, command);
    this.decision.setTeamCommand(teamId, command);
  }

  debugSnapshot(): ClassicCtfBotControllerDebugState {
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

function createEmptyDebugState(
  actorId: string,
): ClassicCtfBotControllerDebugState {
  return {
    actorId,
    goalKind: null,
    goalTarget: null,
    navigationTarget: null,
    navigationTargetKey: "",
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

function isCombatChaseGoal(kind: ClassicCtfBotGoal["kind"]): boolean {
  return kind === "recover-own-flag" || kind === "defend-base";
}

function positionsMatch(left: WorldPosition, right: WorldPosition): boolean {
  return Math.abs(left.x - right.x) < .001 && Math.abs(left.y - right.y) < .001;
}
