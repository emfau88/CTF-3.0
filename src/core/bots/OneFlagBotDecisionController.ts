import type {
  ActorState,
  TeamId,
  WorldPosition,
} from "../actors";
import type { Objective } from "../objectives";
import type {
  WorldMapData,
  WorldMapPresentationRect,
  WorldSnapshot,
} from "../world";
import type { OneFlagBotTacticalRole } from "./BotTeamCoordinator";

export type OneFlagBotGoalKind =
  | "capture-flag"
  | "chase-enemy-carrier"
  | "cutoff-enemy-carrier"
  | "escort-carrier"
  | "screen-carrier"
  | "take-center-flag"
  | "control-mid";

export interface OneFlagBotGoal {
  readonly kind: OneFlagBotGoalKind;
  readonly position: WorldPosition;
  readonly targetKey: string;
}

export class OneFlagBotDecisionController {
  constructor(private readonly map: WorldMapData) {}

  chooseGoal(
    actor: Readonly<ActorState>,
    snapshot: WorldSnapshot,
    tacticalRole?: OneFlagBotTacticalRole,
  ): OneFlagBotGoal {
    const flag = neutralFlag(snapshot);
    const ownCarry = carriedFlagBy(snapshot, actor.id);
    if (ownCarry) {
      return goal(
        "capture-flag",
        centerOf(captureBaseFor(this.map, actor.teamId)),
        `capture:${ownCarry.id}:${actor.lifeId}`,
      );
    }

    const enemyCarrier = activeEnemyCarrier(snapshot, actor);
    if (enemyCarrier) {
      if (tacticalRole === "cutoff") {
        return goal(
          "cutoff-enemy-carrier",
          pointAheadOfCarrier(
            enemyCarrier.position,
            centerOf(captureBaseFor(this.map, enemyCarrier.teamId)),
            .58,
          ),
          `cutoff:${enemyCarrier.id}:${enemyCarrier.lifeId}`,
        );
      }
      if (
        tacticalRole !== undefined &&
        tacticalRole !== "interceptor"
      ) {
        return controlMidGoal(this.map);
      }
      return goal(
        "chase-enemy-carrier",
        enemyCarrier.position,
        `chase:${enemyCarrier.id}:${enemyCarrier.lifeId}`,
      );
    }

    const alliedCarrier = activeAlliedCarrier(snapshot, actor);
    if (alliedCarrier) {
      if (tacticalRole === "screen") {
        return goal(
          "screen-carrier",
          screenPoint(
            actor.id,
            alliedCarrier.position,
            centerOf(captureBaseFor(this.map, alliedCarrier.teamId)),
          ),
          `screen:${alliedCarrier.id}:${alliedCarrier.lifeId}`,
        );
      }
      if (
        tacticalRole !== undefined &&
        tacticalRole !== "escort"
      ) {
        return controlMidGoal(this.map);
      }
      return goal(
        "escort-carrier",
        escortPoint(
          alliedCarrier.position,
          centerOf(captureBaseFor(this.map, alliedCarrier.teamId)),
        ),
        `escort:${alliedCarrier.id}:${alliedCarrier.lifeId}`,
      );
    }

    if (
      flag?.state.status === "home" &&
      (tacticalRole === undefined || tacticalRole === "runner")
    ) {
      return goal(
        "take-center-flag",
        flag.position,
        `pickup:${flag.id}`,
      );
    }

    return controlMidGoal(this.map);
  }

  reset(): void {}
}

function controlMidGoal(map: WorldMapData): OneFlagBotGoal {
  const controlZone = map.botProfile.tacticalZones.find((zone) =>
    zone.kind === "control"
  );
  return goal(
    "control-mid",
    controlZone?.position ??
      centerOf(map.gameplay.combatZone ?? boundsRect(map)),
    `mid:${map.id}`,
  );
}

function goal(
  kind: OneFlagBotGoalKind,
  position: WorldPosition,
  targetKey: string,
): OneFlagBotGoal {
  return {
    kind,
    position: { ...position },
    targetKey,
  };
}

function neutralFlag(
  snapshot: WorldSnapshot,
): Readonly<Objective> | undefined {
  return snapshot.objectives.find((objective) => objective.kind === "neutral-flag");
}

function carriedFlagBy(
  snapshot: WorldSnapshot,
  actorId: string,
): Readonly<Objective> | undefined {
  return snapshot.objectives.find((objective) =>
    objective.kind === "neutral-flag" &&
    objective.state.status === "carried" &&
    objective.state.interactingActorId === actorId
  );
}

function activeEnemyCarrier(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
): Readonly<ActorState> | null {
  const carrierId = neutralFlag(snapshot)?.state.interactingActorId;
  if (!carrierId) return null;
  const carrier = activeActor(snapshot, carrierId);
  return carrier && carrier.teamId !== actor.teamId ? carrier : null;
}

function activeAlliedCarrier(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
): Readonly<ActorState> | null {
  const carrierId = neutralFlag(snapshot)?.state.interactingActorId;
  if (!carrierId || carrierId === actor.id) return null;
  const carrier = activeActor(snapshot, carrierId);
  return carrier && carrier.teamId === actor.teamId ? carrier : null;
}

function activeActor(
  snapshot: WorldSnapshot,
  actorId: string | null | undefined,
): Readonly<ActorState> | null {
  if (!actorId) return null;
  return snapshot.actors.find((actor) =>
    actor.id === actorId && actor.lifeState === "active"
  ) ?? null;
}

function captureBaseFor(
  map: WorldMapData,
  teamId: TeamId | null,
): WorldMapPresentationRect {
  return teamId === "red"
    ? map.gameplay.blueBase
    : map.gameplay.redBase;
}

function escortPoint(
  carrier: WorldPosition,
  captureBase: WorldPosition,
): WorldPosition {
  return {
    x: carrier.x + (captureBase.x - carrier.x) * .3,
    y: carrier.y + (captureBase.y - carrier.y) * .3,
  };
}

function pointAheadOfCarrier(
  carrier: WorldPosition,
  captureBase: WorldPosition,
  progress: number,
): WorldPosition {
  return {
    x: carrier.x + (captureBase.x - carrier.x) * progress,
    y: carrier.y + (captureBase.y - carrier.y) * progress,
  };
}

function screenPoint(
  actorId: string,
  carrier: WorldPosition,
  captureBase: WorldPosition,
): WorldPosition {
  const forward = normalizedDirection(carrier, captureBase);
  const side = stableSide(actorId);
  return {
    x: carrier.x + forward.x * 120 - forward.y * side * 92,
    y: carrier.y + forward.y * 120 + forward.x * side * 92,
  };
}

function normalizedDirection(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  return length > .0001
    ? { x: deltaX / length, y: deltaY / length }
    : { x: 1, y: 0 };
}

function stableSide(actorId: string): 1 | -1 {
  let hash = 0;
  for (let index = 0; index < actorId.length; index += 1) {
    hash = Math.imul(hash ^ actorId.charCodeAt(index), 16777619);
  }
  return (hash & 1) === 0 ? 1 : -1;
}

function boundsRect(map: WorldMapData): WorldMapPresentationRect {
  const bounds = map.geometry.bounds;
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function centerOf(rect: WorldMapPresentationRect): WorldPosition {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}
