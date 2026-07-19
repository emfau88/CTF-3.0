import type { ActorState } from "../actors";
import type { WorldSnapshot } from "../world";
import { hasLineOfSight } from "./BotCombatOpportunity";
import type {
  BotDecisionTrace,
  BotUtilityCandidate,
} from "./BotDecisionUtility";
import { BotUtilityArbiter } from "./BotDecisionUtility";
import type {
  BotDifficultyProfile,
  BotPersonality,
} from "./BotDifficulty";

export interface BotTargetSelection {
  readonly target: Readonly<ActorState> | null;
  readonly trace: BotDecisionTrace<"combat-target"> | null;
  readonly targetPerceived: boolean;
  readonly perceptionReason:
    | "visible"
    | "proximity"
    | "recent-memory"
    | "objective-location"
    | "team-assignment"
    | "none";
}

export class BotTargetSelector {
  private readonly arbiter = new BotUtilityArbiter<"combat-target">();
  private readonly memories = new Map<string, {
    readonly position: { readonly x: number; readonly y: number };
    readonly seenAtMs: number;
  }>();

  constructor(
    private readonly difficulty: BotDifficultyProfile,
    private readonly personality: BotPersonality,
  ) {}

  select(
    actor: Readonly<ActorState>,
    snapshot: WorldSnapshot,
    deltaMs: number,
    preferredTargetActorId?: string | null,
  ): BotTargetSelection {
    const perceived = snapshot.actors
      .filter((candidate) =>
        candidate.lifeState === "active" &&
        candidate.teamId !== null &&
        candidate.teamId !== actor.teamId
      )
      .map((candidate) => this.perceiveTarget(actor, candidate, snapshot))
      .filter((candidate) => candidate !== null);
    const candidates = perceived
      .map((candidate) => ({
        perceived: candidate,
        utility: targetCandidate(
          actor,
          candidate.target,
          snapshot,
          this.personality,
          candidate.target.id === preferredTargetActorId,
          candidate.reason,
        ),
      }))
      .map(({ perceived, utility }) => ({
        perceived,
        utility,
      }))
      .filter(({ utility }) => utility.score > 0);
    if (
      preferredTargetActorId &&
      !candidates.some(({ perceived }) =>
        perceived.target.id === preferredTargetActorId
      )
    ) {
      const assigned = snapshot.actors.find((candidate) =>
        candidate.id === preferredTargetActorId &&
        candidate.lifeState === "active" &&
        candidate.teamId !== actor.teamId
      );
      if (assigned) {
        candidates.push({
          perceived: {
            target: assigned,
            targetPerceived: false,
            reason: "team-assignment",
          },
          utility: targetCandidate(
            actor,
            assigned,
            snapshot,
            this.personality,
            true,
            "team-assignment",
          ),
        });
      }
    }
    if (candidates.length === 0) {
      const strategicSearchTarget = snapshot.actors
        .filter((candidate) =>
          candidate.lifeState === "active" &&
          candidate.teamId !== null &&
          candidate.teamId !== actor.teamId
        )
        .sort((left, right) =>
          distanceBetweenActors(actor, left) -
            distanceBetweenActors(actor, right) ||
          left.id.localeCompare(right.id)
        )[0];
      if (strategicSearchTarget) {
        candidates.push({
          perceived: {
            target: strategicSearchTarget,
            targetPerceived: false,
            reason: "team-assignment",
          },
          utility: targetCandidate(
            actor,
            strategicSearchTarget,
            snapshot,
            this.personality,
            true,
            "team-assignment",
          ),
        });
      }
    }
    const utilities = candidates
      .map(({ utility }) => utility)
      .filter((candidate) => candidate.score > 0);
    if (utilities.length === 0) {
      this.arbiter.reset();
      return {
        target: null,
        trace: null,
        targetPerceived: false,
        perceptionReason: "none",
      };
    }
    const trace = this.arbiter.choose(
      utilities,
      deltaMs,
      this.difficulty.targetCommitMs,
    );
    const selected = candidates.find(({ perceived }) =>
      perceived.target.id === trace.selectedKey
    )?.perceived ?? null;
    return {
      target: selected?.target ?? null,
      trace,
      targetPerceived: selected?.targetPerceived ?? false,
      perceptionReason: selected?.reason ?? "none",
    };
  }

  reset(): void {
    this.arbiter.reset();
    this.memories.clear();
  }

  private perceiveTarget(
    actor: Readonly<ActorState>,
    target: Readonly<ActorState>,
    snapshot: WorldSnapshot,
  ): {
    readonly target: Readonly<ActorState>;
    readonly targetPerceived: boolean;
    readonly reason: BotTargetSelection["perceptionReason"];
  } | null {
    const distance = Math.hypot(
      target.position.x - actor.position.x,
      target.position.y - actor.position.y,
    );
    const lineOfSight = hasLineOfSight(
      actor.position,
      target.position,
      snapshot.geometry.solids,
    );
    const proximity = distance <= 165;
    const visible = distance <= this.difficulty.awarenessRange &&
      (lineOfSight || proximity);
    if (visible) {
      this.memories.set(target.id, {
        position: { ...target.position },
        seenAtMs: snapshot.timeMs,
      });
      return {
        target,
        targetPerceived: true,
        reason: proximity && !lineOfSight ? "proximity" : "visible",
      };
    }
    const memory = this.memories.get(target.id);
    if (memory && snapshot.timeMs - memory.seenAtMs <= 1_250) {
      return {
        target: {
          ...target,
          position: { ...memory.position },
        },
        targetPerceived: true,
        reason: "recent-memory",
      };
    }
    const objectiveCarrier = snapshot.objectives.some((objective) =>
      objective.state.status === "carried" &&
      objective.state.interactingActorId === target.id
    );
    return objectiveCarrier
      ? {
        target,
        targetPerceived: false,
        reason: "objective-location",
      }
      : null;
  }
}

function distanceBetweenActors(
  left: Readonly<ActorState>,
  right: Readonly<ActorState>,
): number {
  return Math.hypot(
    right.position.x - left.position.x,
    right.position.y - left.position.y,
  );
}

function targetCandidate(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  snapshot: WorldSnapshot,
  personality: BotPersonality,
  preferred: boolean,
  perceptionReason: BotTargetSelection["perceptionReason"],
): BotUtilityCandidate<"combat-target"> {
  const distance = Math.hypot(
    target.position.x - actor.position.x,
    target.position.y - actor.position.y,
  );
  const sight = hasLineOfSight(
    actor.position,
    target.position,
    snapshot.geometry.solids,
  );
  const healthPressure = 1 -
    Math.max(0, target.health) / Math.max(1, target.maxHealth);
  const objectiveCarrier = snapshot.objectives.some((objective) =>
    objective.state.status === "carried" &&
    objective.state.interactingActorId === target.id
  );
  const distanceScore = 1 - Math.min(1, distance / 1_200);
  const score = .2 +
    distanceScore * (.36 + personality.aggression * .12) +
    healthPressure * .16 +
    (sight ? .16 : -.08) +
    (objectiveCarrier ? .36 + personality.objectiveFocus * .12 : 0) +
    (preferred ? .2 : 0);
  return {
    key: target.id,
    kind: "combat-target",
    score,
    reason: objectiveCarrier
      ? "enemy-objective-carrier"
      : perceptionReason === "recent-memory"
      ? "recently-seen-threat"
      : perceptionReason === "team-assignment"
      ? "team-assigned-threat"
      : sight
      ? "visible-threat"
      : "nearby-last-known-threat",
    emergency: objectiveCarrier,
  };
}
