import type {
  ActorState,
} from "../actors";
import type { CoreActionIntent } from "../input";
import type { PickupState } from "../pickups";
import type { ArenaTeamSlot } from "../spawning";
import type { WorldRect, WorldSnapshot } from "../world";
import {
  V2_BOT_MOVEMENT_CONFIG,
  type BotMovementConfig,
} from "./BotMovementConfig";
import {
  GridBotNavigator,
  type BotNavigator,
} from "./GridBotNavigator";
import {
  directionBetween,
  TdmBotCombatController,
} from "./TdmBotCombatController";
import { planWeaponAwareCombatStandoff } from "./BotCombatStandoff";
import {
  isAmmoWeaponId,
  weaponAmmo,
  type AmmoWeaponId,
  type ArenaWeaponId,
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

  constructor(
    private readonly actorId: string,
    private readonly targetActorId?: string,
    private readonly movement: BotMovementConfig =
      V2_BOT_MOVEMENT_CONFIG,
    private readonly navigator: BotNavigator = new GridBotNavigator(),
    combat: TdmBotCombatController | undefined = undefined,
    private readonly slot: ArenaTeamSlot = 1,
    private readonly humanActorIds: readonly string[] = [],
    private readonly difficulty: BotDifficultyProfile =
      BOT_DIFFICULTY_PROFILES.normal,
    private readonly personality: BotPersonality =
      createBotPersonality(actorId, slot),
    private readonly coordinator?: ArenaBotTeamCoordinator,
  ) {
    this.combat = combat ?? new TdmBotCombatController(undefined, difficulty);
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
      this.lastDebugState = createEmptyDebugState(this.actorId);
      return [this.stopIntent()];
    }

    this.stickyPickupRemainingMs = Math.max(
      0,
      this.stickyPickupRemainingMs - Math.max(0, deltaMs),
    );
    const enemyDistance = distance(actor.position, target.position);
    const combatAssessment = assessCombatOpportunity(actor, target, snapshot);
    const pickup = selectPickupGoal(
      snapshot,
      actor,
      this.slot,
      enemyDistance,
      combatAssessment.canAttackAtCurrentRange,
      this.stickyPickupRemainingMs > 0 ? this.stickyPickupId : null,
      this.humanActorIds,
    );
    const intentTrace = this.intentArbiter.choose(
      createIntentCandidates(
        actor,
        target,
        pickup,
        combatAssessment,
        this.personality,
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
    const navigationTarget = selectedPickup?.position ?? separationTarget ?? laneBiasedTarget(
      snapshot,
      actor,
      target,
      this.slot,
      engagement.targetPosition,
    );
    const holdPosition = !selectedPickup &&
      !separationTarget &&
      engagement.holdPosition;
    const navigationTargetKey = selectedPickup
      ? `pickup:${selectedPickup.id}`
      : separationTarget
      ? `spread:${actor.lifeId}:lane-${this.slot}`
      : `${target.id}:${target.lifeId}:${engagement.key}:lane-${this.slot}`;
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
    const continueHeldJump = this.jumpHeld && !actor.jump.grounded;
    if (navigation.jump || continueHeldJump) {
      let requestedJumpStart = false;
      if (
        navigation.jump &&
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

function selectPickupGoal(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
  slot: ArenaTeamSlot,
  enemyDistance: number,
  canAttackAtCurrentRange: boolean,
  preferredPickupId: string | null,
  humanActorIds: readonly string[],
): Readonly<PickupState> | null {
  const active = snapshot.pickups.filter((pickup) => pickup.lifeState === "active");
  const urgentType = actor.health <= actor.maxHealth * .55
    ? "health"
    : slot === 4 && actor.armor <= actor.maxArmor * .5
    ? "armor"
    : null;
  const preferredWeapon = preferredWeaponForSlot(
    slot,
    snapshot.map?.weaponRoster ?? ["whip", "rocket", "rail"],
  );
  const needsPreferredWeapon = preferredWeapon !== null &&
    (weaponAmmo(actor.weapons, preferredWeapon) ?? 0) <= 0;
  const desiredTypes = [
    urgentType,
    needsPreferredWeapon ? preferredWeapon : null,
  ].filter((type): type is PickupState["type"] => type !== null);
  if (desiredTypes.length === 0) {
    return null;
  }
  if (
    !preferredPickupId &&
    enemyDistance < 230 &&
    actor.health > 25 &&
    canAttackAtCurrentRange
  ) {
    return null;
  }
  const candidates = active
    .filter((pickup) => desiredTypes.includes(pickup.type))
    .filter((pickup) =>
      !isWeaponPickupReservedForHuman(
        snapshot,
        actor,
        pickup,
        humanActorIds,
      )
    )
    .map((pickup) => ({
      pickup,
      distance: distance(actor.position, pickup.position),
    }))
    .filter((candidate) => candidate.distance <= 720)
    .sort((left, right) =>
      left.distance - right.distance || left.pickup.id.localeCompare(right.pickup.id)
    );
  return candidates.find((candidate) =>
    candidate.pickup.id === preferredPickupId
  )?.pickup ?? candidates[0]?.pickup ?? null;
}

function preferredWeaponForSlot(
  slot: ArenaTeamSlot,
  roster: readonly ArenaWeaponId[],
): AmmoWeaponId | null {
  const pickupWeapons = roster.filter((weaponId): weaponId is AmmoWeaponId =>
    isAmmoWeaponId(weaponId)
  );
  return pickupWeapons[(slot - 1) % Math.max(1, pickupWeapons.length)] ?? null;
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
  const score = isHealth
    ? .46 + (1 - healthRatio) * .82 * personality.selfPreservation
    : isArmor
    ? .56 +
      (1 - armorRatio) * .4 +
      personality.selfPreservation * .12
    : .5 +
      (assessment.canAttackAtCurrentRange ? 0 : .3) +
      personality.selfPreservation * .08;
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

function isWeaponPickupReservedForHuman(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
  pickup: Readonly<PickupState>,
  humanActorIds: readonly string[],
): boolean {
  if (
    pickup.type === "health" ||
    pickup.type === "armor"
  ) {
    return false;
  }
  const weapon = pickup.type as AmmoWeaponId;
  const actorAmmo = ammoFor(actor, weapon);
  const humans = new Set(humanActorIds);
  return snapshot.actors.some((candidate) =>
    humans.has(candidate.id) &&
    candidate.teamId === actor.teamId &&
    candidate.lifeState === "active" &&
    distance(candidate.position, pickup.position) <= 240 &&
    ammoFor(candidate, weapon) <= actorAmmo
  );
}

function ammoFor(
  actor: Readonly<ActorState>,
  weapon: AmmoWeaponId,
): number {
  return weaponAmmo(actor.weapons, weapon) ?? 0;
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
