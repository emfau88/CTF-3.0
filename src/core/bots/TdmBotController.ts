import type {
  ActorState,
} from "../actors";
import type { CoreActionIntent } from "../input";
import type { PickupState } from "../pickups";
import type { ArenaTeamSlot } from "../spawning";
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
import {
  directionBetween,
  TdmBotCombatController,
} from "./TdmBotCombatController";
import { planWeaponAwareCombatStandoff } from "./BotCombatStandoff";
import {
  DEFAULT_ARENA_WEAPON_ROSTER,
} from "../weapons";
import {
  BOT_DIFFICULTY_PROFILES,
  createBotPersonality,
  type BotDifficultyProfile,
  type BotPersonality,
} from "./BotDifficulty";
import {
  BotUtilityArbiter,
  type BotDecisionTrace,
  type BotUtilityCandidate,
} from "./BotDecisionUtility";
import {
  assessCombatOpportunity,
  type BotCombatAssessment,
} from "./BotCombatOpportunity";
import { BotTargetSelector } from "./BotTargetSelector";
import {
  planLocalBotSteering,
  type BotLocalSteering,
} from "./BotLocalMovement";
import {
  type ArenaBotTeamCoordinator,
  type BotTeamAssignment,
} from "./BotTeamCoordinator";
import {
  BotLandmarkRoutePlanner,
  selectBotStrategicPickup,
} from "./BotStrategicPlanning";

export type TdmBotIntent =
  | "fight-enemy"
  | "hold-standoff"
  | "seek-armor"
  | "seek-health"
  | "seek-weapon"
  | "idle";

export interface TdmBotControllerDebugState {
  readonly actorId: string;
  readonly intent: TdmBotIntent;
  readonly targetActorId: string | null;
  readonly pickupId: string | null;
  readonly routeLandmarkId: string | null;
  readonly navigationTargetKey: string;
  readonly standoffKey: string | null;
  readonly holdPosition: boolean;
  readonly combatAssessment: BotCombatAssessment | null;
  readonly intentTrace: BotDecisionTrace<TdmBotIntent> | null;
  readonly targetTrace: BotDecisionTrace<"combat-target"> | null;
  readonly steering: BotLocalSteering;
  readonly teamAssignment: BotTeamAssignment | null;
}

const PICKUP_TARGET_STICKINESS_MS = 850;

export class TdmBotController {
  private jumpHeld = false;
  private stickyPickupId: string | null = null;
  private stickyPickupRemainingMs = 0;
  private lastDebugState: TdmBotControllerDebugState;
  private readonly targetSelector: BotTargetSelector;
  private readonly intentArbiter = new BotUtilityArbiter<TdmBotIntent>();
  private readonly combat: TdmBotCombatController;
  private readonly navigator: BotNavigator;
  private readonly landmarkRoute = new BotLandmarkRoutePlanner();

  constructor(
    private readonly actorId: string,
    private readonly targetActorId?: string,
    private readonly movement: BotMovementConfig =
      V2_BOT_MOVEMENT_CONFIG,
    navigator: BotNavigator | undefined = undefined,
    combat: TdmBotCombatController | undefined = undefined,
    private readonly slot: ArenaTeamSlot = 1,
    private readonly humanActorIds: readonly string[] = [],
    private readonly difficulty: BotDifficultyProfile =
      BOT_DIFFICULTY_PROFILES.normal,
    private readonly personality: BotPersonality =
      createBotPersonality(actorId, slot),
    private readonly coordinator?: ArenaBotTeamCoordinator,
    private readonly map?: WorldMapData,
  ) {
    this.combat = combat ?? new TdmBotCombatController(undefined, difficulty);
    this.navigator = navigator ?? new GridBotNavigator(
      V2_BOT_NAVIGATION_CONFIG,
      {
        allowJumpLinks: difficulty.canUseJumpLinks,
        jumpCostMultiplier: difficulty.jumpCostMultiplier,
      },
    );
    this.lastDebugState = createEmptyDebugState(actorId);
    this.targetSelector = new BotTargetSelector(difficulty, personality);
  }

  readActions(
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): readonly CoreActionIntent[] {
    const actor = findActiveActor(snapshot, this.actorId);
    const teamAssignment = actor
      ? this.coordinator?.assignmentFor(actor.id, snapshot) ?? null
      : null;
    const requestedTargetId = this.targetActorId ??
      teamAssignment?.combatTargetActorId;
    const targetSelection = actor
      ? this.targetSelector.select(
        actor,
        snapshot,
        deltaMs,
        requestedTargetId,
      )
      : {
        target: null,
        trace: null,
        targetPerceived: false,
        perceptionReason: "none" as const,
      };
    const target = targetSelection.target;
    if (!actor || !target || snapshot.match?.phase === "ended") {
      this.navigator.reset();
      this.combat.reset();
      this.jumpHeld = false;
      this.stickyPickupId = null;
      this.stickyPickupRemainingMs = 0;
      this.targetSelector.reset();
      this.intentArbiter.reset();
      this.landmarkRoute.reset();
      this.lastDebugState = createEmptyDebugState(this.actorId);
      return [this.stopIntent()];
    }

    this.stickyPickupRemainingMs = Math.max(
      0,
      this.stickyPickupRemainingMs - Math.max(0, deltaMs),
    );
    const enemyDistance = distance(actor.position, target.position);
    const combatAssessment = assessCombatOpportunity(actor, target, snapshot);
    const stickyPreferredPickupId = this.stickyPickupRemainingMs > 0
      ? this.stickyPickupId
      : null;
    const preferredPickupId = teamAssignment?.reservedPickupId ??
      stickyPreferredPickupId;
    const strategicPickup = selectBotStrategicPickup({
      map: this.map ?? {
        weaponRoster: snapshot.map?.weaponRoster ??
          DEFAULT_ARENA_WEAPON_ROSTER,
      },
      snapshot,
      actor,
      slot: this.slot,
      difficulty: this.difficulty,
      preferredPickupId,
      humanActorIds: this.humanActorIds,
    });
    const pickup = enemyDistance < 230 &&
        actor.health > 25 &&
        strategicPickup?.type !== "health" &&
        stickyPreferredPickupId === null
      ? null
      : strategicPickup;
    const intentTrace = this.intentArbiter.choose(
      createIntentCandidates(
        actor,
        target,
        pickup,
        combatAssessment,
        this.personality,
        this.difficulty,
      ),
      deltaMs,
      this.difficulty.intentCommitMs,
    );
    const selectedPickup = pickup && intentTrace.selectedKey === `pickup:${pickup.id}`
      ? pickup
      : null;
    if (selectedPickup) {
      this.stickyPickupId = selectedPickup.id;
      this.stickyPickupRemainingMs = PICKUP_TARGET_STICKINESS_MS;
    } else {
      this.stickyPickupId = null;
      this.stickyPickupRemainingMs = 0;
    }
    const engagement = planWeaponAwareCombatStandoff(
      actor,
      target,
      snapshot,
      this.movement,
      targetSelection.targetPerceived,
    );
    const separationTarget = selectedPickup
      ? null
      : clusteredSeparationTarget(snapshot, actor, this.slot);
    const directNavigationTarget = selectedPickup?.position ?? separationTarget ?? laneBiasedTarget(
      snapshot,
      actor,
      target,
      this.slot,
      engagement.targetPosition,
    );
    const holdPosition = !selectedPickup &&
      !separationTarget &&
      engagement.holdPosition;
    const directNavigationTargetKey = selectedPickup
      ? `pickup:${selectedPickup.id}`
      : separationTarget
      ? `spread:${actor.lifeId}:lane-${this.slot}`
      : `${target.id}:${target.lifeId}:${engagement.key}:lane-${this.slot}`;
    const routePlan = this.map
      ? this.landmarkRoute.plan(
        actor.position,
        directNavigationTarget,
        directNavigationTargetKey,
        this.map,
        teamAssignment?.routeLandmarkId,
        this.difficulty,
        !selectedPickup && !separationTarget,
      )
      : {
        position: directNavigationTarget,
        targetKey: directNavigationTargetKey,
        landmarkId: null,
      };
    const navigationTarget = routePlan.position;
    const navigationTargetKey = routePlan.targetKey;
    const navigation = holdPosition
      ? {
        direction: { x: 0, y: 0 } as const,
        jump: false,
        recoveryStage: 0 as const,
      }
      : this.navigator.navigate(
        actor.position,
        navigationTarget,
        navigationTargetKey,
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
      intent: selectedPickup
        ? intentForPickup(selectedPickup)
        : holdPosition
        ? "hold-standoff"
        : "fight-enemy",
      targetActorId: target.id,
      pickupId: selectedPickup?.id ?? null,
      routeLandmarkId: routePlan.landmarkId,
      navigationTargetKey,
      standoffKey: selectedPickup ? null : engagement.key,
      holdPosition,
      combatAssessment,
      intentTrace,
      targetTrace: targetSelection.trace,
      steering,
      teamAssignment,
    };
    const actions: CoreActionIntent[] = [{
      action: "move",
      phase: "held",
      actorId: actor.id,
      direction: steering.direction,
      magnitude: holdPosition && !steering.overrideHold
        ? 0
        : this.movement.inputMagnitude,
    }, {
      action: "aim",
      phase: "held",
      actorId: actor.id,
      direction: directionBetween(actor.position, target.position),
    }];
    const weaponAction = this.combat.readAction(
      actor,
      target,
      snapshot,
      deltaMs,
      targetSelection.targetPerceived,
    );
    if (weaponAction) {
      actions.push(weaponAction);
    }
    const requestedNavigationJump = this.difficulty.canUseJumpLinks &&
      navigation.jump;
    const continueHeldJump = this.jumpHeld && !actor.jump.grounded;
    if (requestedNavigationJump || continueHeldJump) {
      let requestedJumpStart = false;
      if (
        requestedNavigationJump &&
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
    return actions;
  }

  debugSnapshot(): TdmBotControllerDebugState {
    return { ...this.lastDebugState };
  }

  reset(): void {
    this.navigator.reset();
    this.combat.reset();
    this.targetSelector.reset();
    this.intentArbiter.reset();
    this.landmarkRoute.reset();
    this.jumpHeld = false;
    this.stickyPickupId = null;
    this.stickyPickupRemainingMs = 0;
    this.lastDebugState = createEmptyDebugState(this.actorId);
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

function intentForPickup(pickup: Readonly<PickupState>): TdmBotIntent {
  if (pickup.type === "health") return "seek-health";
  if (pickup.type === "armor") return "seek-armor";
  return "seek-weapon";
}

function createEmptyDebugState(actorId: string): TdmBotControllerDebugState {
  return {
    actorId,
    intent: "idle",
    targetActorId: null,
    pickupId: null,
    routeLandmarkId: null,
    navigationTargetKey: "",
    standoffKey: null,
    holdPosition: false,
    combatAssessment: null,
    intentTrace: null,
    targetTrace: null,
    steering: {
      direction: { x: 0, y: 0 },
      overrideHold: false,
      reason: "none",
    },
    teamAssignment: null,
  };
}

function createIntentCandidates(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  pickup: Readonly<PickupState> | null,
  assessment: BotCombatAssessment,
  personality: BotPersonality,
  difficulty: BotDifficultyProfile,
): readonly BotUtilityCandidate<TdmBotIntent>[] {
  const healthRatio = actor.health / Math.max(1, actor.maxHealth);
  const candidates: BotUtilityCandidate<TdmBotIntent>[] = [{
    key: `fight:${target.id}:${target.lifeId}`,
    kind: assessment.canAttackAtCurrentRange ? "fight-enemy" : "fight-enemy",
    score: .42 +
      personality.aggression * .28 +
      (assessment.canAttackAtCurrentRange ? .24 : -.06) -
      Math.max(0, .45 - healthRatio) * personality.selfPreservation,
    reason: assessment.canAttackAtCurrentRange
      ? `usable-${assessment.movementWeaponId ?? "weapon"}`
      : `reposition-for-${assessment.movementWeaponId ?? "weapon"}`,
  }];
  if (!pickup) return candidates;
  const pickupDistance = distance(actor.position, pickup.position);
  const distancePenalty = Math.min(.28, pickupDistance / 2_800);
  const isHealth = pickup.type === "health";
  const isArmor = pickup.type === "armor";
  const armorRatio = actor.maxArmor > 0
    ? actor.armor / actor.maxArmor
    : 1;
  const baseScore = isHealth
    ? .46 + (1 - healthRatio) * .82 * personality.selfPreservation
    : isArmor
    ? .56 +
      (1 - armorRatio) * .4 +
      personality.selfPreservation * .12
    : .5 +
      (assessment.canAttackAtCurrentRange ? 0 : .3) +
      personality.selfPreservation * .08;
  const score = .42 + (baseScore - .42) * difficulty.resourceDiscipline;
  candidates.push({
    key: `pickup:${pickup.id}`,
    kind: intentForPickup(pickup),
    score: score - distancePenalty,
    reason: isHealth
      ? "restore-health"
      : isArmor
      ? "restore-armor"
      : assessment.canAttackAtCurrentRange
      ? "refill-preferred-weapon"
      : "obtain-usable-ranged-weapon",
    emergency: isHealth && actor.health <= 25,
  });
  return candidates;
}

function laneBiasedTarget(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  slot: ArenaTeamSlot,
  fallback: Readonly<{ x: number; y: number }>,
): { x: number; y: number } {
  const bounds = snapshot.geometry.bounds;
  const ratio = slot === 2
    ? .24
    : slot === 3
    ? .76
    : slot === 4
    ? actor.teamId === "blue" ? .38 : .62
    : .5;
  const laneY = bounds.minY + (bounds.maxY - bounds.minY) * ratio;
  if (Math.abs(target.position.x - actor.position.x) < 340) {
    if (slot === 1) return { ...fallback };
    const closeRangeSpread = Math.max(
      -120,
      Math.min(120, (laneY - fallback.y) * .45),
    );
    return {
      x: fallback.x,
      y: fallback.y + closeRangeSpread,
    };
  }
  return {
    x: fallback.x,
    y: laneY,
  };
}

function clusteredSeparationTarget(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
  slot: ArenaTeamSlot,
): { x: number; y: number } | null {
  const nearbyAllies = snapshot.actors.filter((candidate) =>
    candidate.id !== actor.id &&
    candidate.teamId === actor.teamId &&
    candidate.lifeState === "active" &&
    distance(candidate.position, actor.position) <= 170
  );
  if (nearbyAllies.length < 2) return null;
  const bounds = snapshot.geometry.bounds;
  const laneRatio = slot === 1 ? .15 : slot === 2 ? .36 : slot === 3 ? .64 : .85;
  const advance = actor.teamId === "blue" ? 100 : -100;
  return {
    x: Math.max(bounds.minX + actor.radius, Math.min(
      bounds.maxX - actor.radius,
      actor.position.x + advance,
    )),
    y: bounds.minY + (bounds.maxY - bounds.minY) * laneRatio,
  };
}

function distance(
  left: Readonly<{ x: number; y: number }>,
  right: Readonly<{ x: number; y: number }>,
): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}


function findActiveActor(
  snapshot: WorldSnapshot,
  actorId: string,
): Readonly<ActorState> | null {
  return snapshot.actors.find((actor) =>
    actor.id === actorId && actor.lifeState === "active"
  ) ?? null;
}
