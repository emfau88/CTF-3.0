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

export type ClassicCtfBotRole = "attacker" | "defender" | "support";
export type ClassicCtfTeamCommand = "auto" | "defend" | "follow" | "attack";
export type ClassicCtfManualTeamCommand = Exclude<
  ClassicCtfTeamCommand,
  "auto"
>;

export function toggleClassicCtfTeamCommand(
  current: ClassicCtfTeamCommand,
  selected: ClassicCtfManualTeamCommand,
): ClassicCtfTeamCommand {
  return current === selected ? "auto" : selected;
}

export type ClassicCtfBotGoalKind =
  | "return-flag"
  | "recover-own-flag"
  | "escort-carrier"
  | "follow-player"
  | "attack-flag"
  | "defend-base"
  | "patrol-base"
  | "support-mid";

export interface ClassicCtfBotGoal {
  readonly kind: ClassicCtfBotGoalKind;
  readonly position: WorldPosition;
  readonly targetKey: string;
}

export interface ClassicCtfBotTacticalAssignment {
  readonly role: ClassicCtfBotRole;
  readonly command: ClassicCtfTeamCommand;
  readonly emergencyDuty: boolean;
}

export class ClassicCtfBotDecisionController {
  private patrolIndex = 0;
  private command: ClassicCtfTeamCommand = "auto";
  private commandTeamId: TeamId | null = null;
  private defenderRoleInitialized = false;
  private defenderAnchorUntilMs = 0;

  constructor(
    private readonly role: ClassicCtfBotRole,
    private readonly map: WorldMapData,
  ) {}

  chooseGoal(
    actor: Readonly<ActorState>,
    snapshot: WorldSnapshot,
    tacticalAssignment?: ClassicCtfBotTacticalAssignment,
  ): ClassicCtfBotGoal {
    const activeRole = tacticalAssignment?.role ?? this.role;
    const emergencyDuty = tacticalAssignment?.emergencyDuty ?? true;
    const ownFlag = teamFlag(snapshot, actor.teamId);
    const enemyFlag = snapshot.objectives.find((objective) =>
      isTeamFlag(objective) &&
      objective.state.controllingTeamId !== actor.teamId
    );
    const carriedFlag = flagCarriedBy(snapshot, actor.id);
    if (carriedFlag) {
      return goal(
        "return-flag",
        centerOf(baseFor(this.map, actor.teamId)),
        `return:${carriedFlag.id}`,
      );
    }

    if (emergencyDuty && ownFlag?.state.status === "dropped") {
      return goal(
        "recover-own-flag",
        ownFlag.position,
        `recover-drop:${ownFlag.id}`,
      );
    }

    const ownFlagCarrier = activeActor(
      snapshot,
      ownFlag?.state.interactingActorId,
    );
    if (emergencyDuty && ownFlagCarrier) {
      return goal(
        "recover-own-flag",
        ownFlagCarrier.position,
        `recover:${ownFlagCarrier.id}:${ownFlagCarrier.lifeId}`,
      );
    }

    const activeCommand = tacticalAssignment?.command ??
      (
        actor.teamId === this.commandTeamId
          ? this.command
          : "auto"
      );
    if (activeCommand === "defend") {
      return this.chooseDefenseGoal(actor, snapshot);
    }

    const humanTeammate = activeActor(snapshot, `${actor.teamId}-player`);
    if (
      activeCommand === "follow" &&
      humanTeammate?.teamId === actor.teamId &&
      humanTeammate.id !== actor.id
    ) {
      return goal(
        "follow-player",
        followPoint(actor.position, humanTeammate.position),
        movingTargetKey("follow", humanTeammate),
      );
    }

    const alliedCarrier = activeActor(
      snapshot,
      enemyFlag?.state.interactingActorId,
    );
    const adaptiveTwoActorDefense = activeRole === "defender" &&
      isTwoActorTeam(snapshot, actor.teamId);
    const defenderJoinsReturn = activeRole === "defender" &&
      alliedCarrier?.teamId === actor.teamId &&
      flagReturnProgress(this.map, actor.teamId, alliedCarrier.position) >=
        (adaptiveTwoActorDefense ? .25 : .45);
    if (
      alliedCarrier?.teamId === actor.teamId &&
      (activeCommand === "attack" ||
        activeRole !== "defender" ||
        defenderJoinsReturn)
    ) {
      return goal(
        "escort-carrier",
        escortPoint(
          alliedCarrier.position,
          centerOf(baseFor(this.map, actor.teamId)),
        ),
        `escort:${alliedCarrier.id}:${alliedCarrier.lifeId}`,
      );
    }

    const defenderCanSecureDrop = activeRole === "defender" &&
      enemyFlag?.state.status === "dropped" &&
      flagReturnProgress(this.map, actor.teamId, enemyFlag.position) >= .55;
    if (
      enemyFlag?.state.status === "dropped" &&
      (activeCommand === "attack" ||
        activeRole !== "defender" ||
        defenderCanSecureDrop)
    ) {
      return goal(
        "attack-flag",
        enemyFlag.position,
        `continue:${enemyFlag.id}`,
      );
    }

    if (activeCommand === "attack" || activeRole === "attacker") {
      return goal(
        "attack-flag",
        enemyFlag?.position ??
          centerOf(baseFor(this.map, opposingTeam(actor.teamId))),
        `attack:${enemyFlag?.id ?? opposingTeam(actor.teamId)}`,
      );
    }

    if (activeRole === "defender") {
      return this.chooseAdaptiveDefenderGoal(actor, snapshot);
    }

    return goal(
      "support-mid",
      supportPoint(this.map, actor.teamId),
      `support:${actor.teamId}`,
    );
  }

  reset(): void {
    this.patrolIndex = 0;
    this.command = "auto";
    this.commandTeamId = null;
    this.defenderRoleInitialized = false;
    this.defenderAnchorUntilMs = 0;
  }

  setTeamCommand(teamId: TeamId, command: ClassicCtfTeamCommand): void {
    this.commandTeamId = teamId;
    this.command = command;
  }

  private chooseDefenseGoal(
    actor: Readonly<ActorState>,
    snapshot: WorldSnapshot,
  ): ClassicCtfBotGoal {
    const ownBase = centerOf(baseFor(this.map, actor.teamId));
    const invader = nearestEnemy(snapshot, actor, ownBase, 420);
    if (invader) {
      return goal(
        "defend-base",
        invader.position,
        `defend:${invader.id}:${invader.lifeId}`,
      );
    }
    const route = routeForTeam(
      this.map.presentation.botRoutes.defender,
      actor.teamId,
      this.map.geometry.bounds.maxX - this.map.geometry.bounds.minX,
    );
    const patrol = nextRoutePoint(route, actor.position, this.patrolIndex);
    this.patrolIndex = patrol.nextIndex;
    return goal(
      "patrol-base",
      patrol.position ?? ownBase,
      `patrol:${this.patrolIndex}`,
    );
  }

  private chooseAdaptiveDefenderGoal(
    actor: Readonly<ActorState>,
    snapshot: WorldSnapshot,
  ): ClassicCtfBotGoal {
    if (!isTwoActorTeam(snapshot, actor.teamId)) {
      return this.chooseDefenseGoal(actor, snapshot);
    }

    const ownBase = centerOf(baseFor(this.map, actor.teamId));
    const invader = nearestEnemy(snapshot, actor, ownBase, 460);
    if (invader) {
      this.defenderAnchorUntilMs = snapshot.timeMs + 2_500;
      return goal(
        "defend-base",
        invader.position,
        `defend:${invader.id}:${invader.lifeId}`,
      );
    }

    if (!this.defenderRoleInitialized) {
      this.defenderRoleInitialized = true;
      this.defenderAnchorUntilMs = snapshot.timeMs + 1_600;
    }
    if (snapshot.timeMs < this.defenderAnchorUntilMs) {
      return this.chooseDefenseGoal(actor, snapshot);
    }

    const teammate = snapshot.actors.find((candidate) =>
      candidate.id !== actor.id && candidate.teamId === actor.teamId &&
      candidate.lifeState === "active"
    );
    const midpoint = supportPoint(this.map, actor.teamId);
    const sweepTarget = teammate
      ? {
        x: midpoint.x + (teammate.position.x - midpoint.x) * .32,
        y: midpoint.y + (teammate.position.y - midpoint.y) * .32,
      }
      : midpoint;
    return goal(
      "support-mid",
      sweepTarget,
      `sweep:${actor.teamId}:${Math.round(sweepTarget.x / 80)}:${Math.round(sweepTarget.y / 80)}`,
    );
  }
}

function goal(
  kind: ClassicCtfBotGoalKind,
  position: WorldPosition,
  targetKey: string,
): ClassicCtfBotGoal {
  return {
    kind,
    position: { ...position },
    targetKey,
  };
}

function teamFlag(
  snapshot: WorldSnapshot,
  teamId: TeamId | null,
): Readonly<Objective> | undefined {
  return snapshot.objectives.find((objective) =>
    isTeamFlag(objective) &&
    objective.state.controllingTeamId === teamId
  );
}

function flagCarriedBy(
  snapshot: WorldSnapshot,
  actorId: string,
): Readonly<Objective> | undefined {
  return snapshot.objectives.find((objective) =>
    isTeamFlag(objective) &&
    objective.state.status === "carried" &&
    objective.state.interactingActorId === actorId
  );
}

function isTeamFlag(objective: Readonly<Objective>): boolean {
  return objective.kind === "team-flag";
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

function nearestEnemy(
  snapshot: WorldSnapshot,
  actor: Readonly<ActorState>,
  point: WorldPosition,
  maxDistance: number,
): Readonly<ActorState> | null {
  let best: Readonly<ActorState> | null = null;
  let bestDistance = maxDistance;
  for (const candidate of snapshot.actors) {
    if (
      candidate.lifeState !== "active" ||
      !candidate.teamId ||
      candidate.teamId === actor.teamId
    ) {
      continue;
    }
    const distance = distanceBetween(candidate.position, point);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function routeForTeam(
  route: readonly WorldPosition[],
  teamId: TeamId | null,
  worldWidth: number,
): readonly WorldPosition[] {
  return teamId === "red"
    ? route.map((point) => ({ x: worldWidth - point.x, y: point.y }))
    : route;
}

function nextRoutePoint(
  route: readonly WorldPosition[],
  actorPosition: WorldPosition,
  routeIndex: number,
): { readonly position: WorldPosition | null; readonly nextIndex: number } {
  if (route.length === 0) {
    return { position: null, nextIndex: 0 };
  }
  let nextIndex = Math.min(routeIndex, route.length - 1);
  const current = route[nextIndex]!;
  if (distanceBetween(actorPosition, current) < 30) {
    nextIndex = (nextIndex + 1) % route.length;
  }
  return {
    position: route[nextIndex] ?? current,
    nextIndex,
  };
}

function supportPoint(
  map: WorldMapData,
  teamId: TeamId | null,
): WorldPosition {
  const home = centerOf(baseFor(map, teamId));
  const enemy = centerOf(baseFor(map, opposingTeam(teamId)));
  return {
    x: home.x + (enemy.x - home.x) * .42,
    y: home.y + (enemy.y - home.y) * .42,
  };
}

function escortPoint(
  carrier: WorldPosition,
  home: WorldPosition,
): WorldPosition {
  return {
    x: carrier.x + (home.x - carrier.x) * .28,
    y: carrier.y + (home.y - carrier.y) * .28,
  };
}

function isTwoActorTeam(
  snapshot: WorldSnapshot,
  teamId: TeamId | null,
): boolean {
  return snapshot.actors.filter((actor) => actor.teamId === teamId).length === 2;
}

function followPoint(
  follower: WorldPosition,
  leader: WorldPosition,
): WorldPosition {
  const dx = follower.x - leader.x;
  const dy = follower.y - leader.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= 80 && distance <= 145) {
    return { ...follower };
  }
  const scale = distance > .001 ? 105 / distance : 0;
  return {
    x: leader.x + dx * scale,
    y: leader.y + dy * scale,
  };
}

function movingTargetKey(prefix: string, actor: Readonly<ActorState>): string {
  return `${prefix}:${actor.id}:${actor.lifeId}:` +
    `${Math.round(actor.position.x / 80)}:${Math.round(actor.position.y / 80)}`;
}

function flagReturnProgress(
  map: WorldMapData,
  teamId: TeamId | null,
  position: WorldPosition,
): number {
  const home = centerOf(baseFor(map, teamId));
  const enemy = centerOf(baseFor(map, opposingTeam(teamId)));
  const fullDistance = Math.max(1, distanceBetween(enemy, home));
  return Math.max(
    0,
    Math.min(1, 1 - distanceBetween(position, home) / fullDistance),
  );
}

function baseFor(
  map: WorldMapData,
  teamId: TeamId | null,
): WorldMapPresentationRect {
  return teamId === "red"
    ? map.gameplay.redBase
    : map.gameplay.blueBase;
}

function opposingTeam(teamId: TeamId | null): TeamId {
  return teamId === "red" ? "blue" : "red";
}

function centerOf(rect: WorldMapPresentationRect): WorldPosition {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function distanceBetween(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
