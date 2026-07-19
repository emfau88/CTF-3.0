import type {
  ActorState,
  TeamId,
  WorldPosition,
} from "../actors";
import type { GameModeId } from "../modes";
import type { ArenaParticipant } from "../spawning";
import type { WorldMapData, WorldSnapshot } from "../world";
import type {
  ClassicCtfBotRole,
  ClassicCtfTeamCommand,
} from "./ClassicCtfBotDecisionController";

export type OneFlagBotTacticalRole =
  | "runner"
  | "carrier"
  | "escort"
  | "screen"
  | "interceptor"
  | "cutoff"
  | "controller";

export interface BotTeamAssignment {
  readonly actorId: string;
  readonly combatTargetActorId: string | null;
  readonly classicCtfRole: ClassicCtfBotRole | null;
  readonly classicCtfCommand: ClassicCtfTeamCommand;
  readonly classicCtfEmergencyDuty: boolean;
  readonly oneFlagRole: OneFlagBotTacticalRole | null;
  readonly reason: string;
}

export class ArenaBotTeamCoordinator {
  private readonly commands = new Map<TeamId, ClassicCtfTeamCommand>();
  private readonly assignments = new Map<string, BotTeamAssignment>();
  private readonly classicRoleMemory = new Map<TeamId, {
    readonly defenderId: string | null;
    readonly supportId: string | null;
    readonly expiresAtMs: number;
  }>();
  private readonly oneFlagFormationMemory = new Map<TeamId, {
    readonly situationKey: string;
    readonly primaryId: string | null;
    readonly secondaryId: string | null;
    readonly expiresAtMs: number;
  }>();
  private lastSnapshotTimeMs = Number.NaN;

  constructor(
    private readonly modeId: GameModeId,
    private readonly map: WorldMapData,
    private readonly participants: readonly ArenaParticipant[],
    private readonly humanActorIds: readonly string[] = [],
  ) {}

  assignmentFor(
    actorId: string,
    snapshot: WorldSnapshot,
  ): BotTeamAssignment | null {
    if (snapshot.timeMs !== this.lastSnapshotTimeMs) {
      this.rebuildAssignments(snapshot);
    }
    return this.assignments.get(actorId) ?? null;
  }

  setTeamCommand(teamId: TeamId, command: ClassicCtfTeamCommand): void {
    this.commands.set(teamId, command);
    this.lastSnapshotTimeMs = Number.NaN;
  }

  reset(): void {
    this.commands.clear();
    this.assignments.clear();
    this.classicRoleMemory.clear();
    this.oneFlagFormationMemory.clear();
    this.lastSnapshotTimeMs = Number.NaN;
  }

  private rebuildAssignments(snapshot: WorldSnapshot): void {
    this.assignments.clear();
    this.lastSnapshotTimeMs = snapshot.timeMs;
    for (const teamId of ["blue", "red"] as const) {
      const teamParticipants = this.participants.filter((participant) =>
        participant.teamId === teamId
      );
      if (teamParticipants.length === 0) continue;
      const actors = teamParticipants
        .map((participant) =>
          snapshot.actors.find((actor) => actor.id === participant.actorId)
        )
        .filter((actor): actor is Readonly<ActorState> =>
          actor !== undefined && actor.lifeState === "active"
        );
      if (this.modeId === "team-deathmatch") {
        this.assignTdmTeam(actors, snapshot);
      } else if (this.modeId === "classic-ctf") {
        this.assignClassicCtfTeam(teamId, actors, snapshot);
      } else if (this.modeId === "one-flag") {
        this.assignOneFlagTeam(teamId, actors, snapshot);
      }
    }
  }

  private assignTdmTeam(
    actors: readonly Readonly<ActorState>[],
    snapshot: WorldSnapshot,
  ): void {
    const enemies = snapshot.actors.filter((candidate) =>
      candidate.lifeState === "active" &&
      candidate.teamId !== null &&
      candidate.teamId !== actors[0]?.teamId
    );
    const reservations = new Map<string, number>();
    for (const actor of [...actors].sort(actorIdOrder)) {
      const target = [...enemies].sort((left, right) =>
        coordinatedTargetCost(actor, left, snapshot, reservations) -
          coordinatedTargetCost(actor, right, snapshot, reservations) ||
        left.id.localeCompare(right.id)
      )[0] ?? null;
      if (target) {
        reservations.set(target.id, (reservations.get(target.id) ?? 0) + 1);
      }
      this.assignments.set(actor.id, baseAssignment(actor.id, {
        combatTargetActorId: target?.id ?? null,
        reason: target
          ? `tdm-distributed-target:${target.id}`
          : "tdm-no-active-target",
      }));
    }
  }

  private assignClassicCtfTeam(
    teamId: TeamId,
    actors: readonly Readonly<ActorState>[],
    snapshot: WorldSnapshot,
  ): void {
    const ownBase = centerOf(
      teamId === "red" ? this.map.gameplay.redBase : this.map.gameplay.blueBase,
    );
    const midpoint = this.map.botProfile.tacticalZones.find((zone) =>
      zone.kind === "control"
    )?.position ?? centerOf(
      this.map.gameplay.combatZone ?? boundsRect(this.map),
    );
    const orderedForDefense = [...actors].sort((left, right) =>
      distance(left.position, ownBase) - distance(right.position, ownBase) ||
      left.id.localeCompare(right.id)
    );
    const fullTeamSize = snapshot.actors.filter((actor) =>
      actor.teamId === teamId
    ).length;
    const rememberedRoles = this.classicRoleMemory.get(teamId);
    const canKeepRoles = rememberedRoles &&
      snapshot.timeMs < rememberedRoles.expiresAtMs &&
      rememberedRoles.defenderId !== rememberedRoles.supportId &&
      actorIsAvailable(actors, rememberedRoles.defenderId) &&
      actorIsAvailable(actors, rememberedRoles.supportId);
    const computedDefender = fullTeamSize >= 2
      ? orderedForDefense[0]?.id ?? null
      : null;
    const computedSupport = [...actors]
      .filter((actor) => actor.id !== computedDefender)
      .sort((left, right) =>
        distance(left.position, midpoint) - distance(right.position, midpoint) ||
        left.id.localeCompare(right.id)
      )[0]?.id ?? null;
    const defender = canKeepRoles
      ? rememberedRoles.defenderId
      : computedDefender;
    const activeSupport = fullTeamSize >= 3
      ? canKeepRoles
        ? rememberedRoles.supportId
        : computedSupport
      : null;
    if (!canKeepRoles) {
      this.classicRoleMemory.set(teamId, {
        defenderId: defender,
        supportId: activeSupport,
        expiresAtMs: snapshot.timeMs + 3_000,
      });
    }
    const emergencyActors = classicCtfEmergencyResponders(
      teamId,
      actors,
      snapshot,
      ownBase,
    );
    const command = this.commands.get(teamId) ?? "auto";
    const human = snapshot.actors.find((actor) =>
      this.humanActorIds.includes(actor.id) &&
      actor.teamId === teamId &&
      actor.lifeState === "active"
    );
    const followActorId = command === "follow" && human
      ? [...actors].sort((left, right) =>
        distance(left.position, human.position) -
          distance(right.position, human.position) ||
        left.id.localeCompare(right.id)
      )[0]?.id ?? null
      : null;
    for (const actor of actors) {
      const role: ClassicCtfBotRole = actor.id === defender
        ? "defender"
        : actor.id === activeSupport
        ? "support"
        : "attacker";
      const actorCommand = distributedClassicCtfCommand(
        command,
        actor.id,
        role,
        followActorId,
      );
      const target = coordinatedCombatTarget(actor, snapshot);
      this.assignments.set(actor.id, baseAssignment(actor.id, {
        combatTargetActorId: target?.id ?? null,
        classicCtfRole: role,
        classicCtfCommand: actorCommand,
        classicCtfEmergencyDuty:
          emergencyActors.size === 0 || emergencyActors.has(actor.id),
        reason: `ctf-${role}:${actorCommand}`,
      }));
    }
  }

  private assignOneFlagTeam(
    teamId: TeamId,
    actors: readonly Readonly<ActorState>[],
    snapshot: WorldSnapshot,
  ): void {
    const flag = snapshot.objectives.find((objective) =>
      objective.kind === "neutral-flag"
    );
    const carrier = flag?.state.interactingActorId
      ? snapshot.actors.find((actor) =>
        actor.id === flag.state.interactingActorId &&
        actor.lifeState === "active"
      ) ?? null
      : null;
    const orderedToFlag = [...actors].sort((left, right) =>
      distance(left.position, flag?.position ?? centerOf(boundsRect(this.map))) -
        distance(right.position, flag?.position ?? centerOf(boundsRect(this.map))) ||
      left.id.localeCompare(right.id)
    );
    const eligibleSupport = carrier?.teamId === teamId
      ? orderedToFlag.filter((actor) => actor.id !== carrier.id)
      : orderedToFlag;
    const situationKey = carrier
      ? `${carrier.teamId === teamId ? "ally" : "enemy"}:${carrier.id}:${carrier.lifeId}`
      : "flag-home";
    const rememberedFormation = this.oneFlagFormationMemory.get(teamId);
    const canKeepFormation = rememberedFormation &&
      rememberedFormation.situationKey === situationKey &&
      snapshot.timeMs < rememberedFormation.expiresAtMs &&
      rememberedFormation.primaryId !== rememberedFormation.secondaryId &&
      actorIsAvailable(eligibleSupport, rememberedFormation.primaryId) &&
      actorIsAvailable(eligibleSupport, rememberedFormation.secondaryId);
    const primary = canKeepFormation
      ? rememberedFormation.primaryId
      : eligibleSupport[0]?.id ?? null;
    const secondary = canKeepFormation
      ? rememberedFormation.secondaryId
      : eligibleSupport[1]?.id ?? null;
    if (!canKeepFormation) {
      this.oneFlagFormationMemory.set(teamId, {
        situationKey,
        primaryId: primary,
        secondaryId: secondary,
        expiresAtMs: snapshot.timeMs + 2_000,
      });
    }
    for (const actor of actors) {
      let role: OneFlagBotTacticalRole = "controller";
      if (carrier?.teamId === teamId) {
        if (actor.id === carrier.id) role = "carrier";
        else if (actor.id === primary) role = "escort";
        else if (actor.id === secondary) role = "screen";
      } else if (carrier && carrier.teamId !== teamId) {
        if (actor.id === primary) role = "interceptor";
        else if (actor.id === secondary) role = "cutoff";
      } else if (actor.id === primary) {
        role = "runner";
      }
      const target = coordinatedCombatTarget(actor, snapshot);
      this.assignments.set(actor.id, baseAssignment(actor.id, {
        combatTargetActorId: target?.id ?? null,
        oneFlagRole: role,
        reason: `one-flag-${role}`,
      }));
    }
  }
}

function actorIsAvailable(
  actors: readonly Readonly<ActorState>[],
  actorId: string | null,
): boolean {
  return actorId === null || actors.some((actor) => actor.id === actorId);
}

function baseAssignment(
  actorId: string,
  override: Partial<BotTeamAssignment>,
): BotTeamAssignment {
  return {
    actorId,
    combatTargetActorId: null,
    classicCtfRole: null,
    classicCtfCommand: "auto",
    classicCtfEmergencyDuty: true,
    oneFlagRole: null,
    reason: "unassigned",
    ...override,
  };
}

function coordinatedCombatTarget(
  actor: Readonly<ActorState>,
  snapshot: WorldSnapshot,
): Readonly<ActorState> | null {
  return snapshot.actors
    .filter((candidate) =>
      candidate.lifeState === "active" &&
      candidate.teamId !== null &&
      candidate.teamId !== actor.teamId
    )
    .sort((left, right) =>
      targetThreatScore(actor, right, snapshot) -
        targetThreatScore(actor, left, snapshot) ||
      left.id.localeCompare(right.id)
    )[0] ?? null;
}

function coordinatedTargetCost(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  snapshot: WorldSnapshot,
  reservations: ReadonlyMap<string, number>,
): number {
  const objectiveCarrier = snapshot.objectives.some((objective) =>
    objective.state.interactingActorId === target.id &&
    objective.state.status === "carried"
  );
  return distance(actor.position, target.position) / 1_000 +
    (reservations.get(target.id) ?? 0) * .42 -
    (1 - target.health / Math.max(1, target.maxHealth)) * .18 -
    (objectiveCarrier ? .55 : 0);
}

function targetThreatScore(
  actor: Readonly<ActorState>,
  target: Readonly<ActorState>,
  snapshot: WorldSnapshot,
): number {
  const objectiveCarrier = snapshot.objectives.some((objective) =>
    objective.state.interactingActorId === target.id &&
    objective.state.status === "carried"
  );
  return 1 - Math.min(1, distance(actor.position, target.position) / 1_200) +
    (objectiveCarrier ? .8 : 0) +
    (1 - target.health / Math.max(1, target.maxHealth)) * .2;
}

function classicCtfEmergencyResponders(
  teamId: TeamId,
  actors: readonly Readonly<ActorState>[],
  snapshot: WorldSnapshot,
  ownBase: WorldPosition,
): ReadonlySet<string> {
  const ownFlag = snapshot.objectives.find((objective) =>
    objective.kind === "team-flag" &&
    objective.state.controllingTeamId === teamId
  );
  if (!ownFlag || ownFlag.state.status === "home") return new Set();
  const emergencyPoint = ownFlag.state.interactingActorId
    ? snapshot.actors.find((actor) =>
      actor.id === ownFlag.state.interactingActorId
    )?.position ?? ownFlag.position
    : ownFlag.position;
  const responderCount = actors.length >= 4 ? 2 : 1;
  return new Set(
    [...actors]
      .sort((left, right) =>
        (
          distance(left.position, emergencyPoint) +
          distance(left.position, ownBase) * .15
        ) -
          (
            distance(right.position, emergencyPoint) +
            distance(right.position, ownBase) * .15
          ) ||
        left.id.localeCompare(right.id)
      )
      .slice(0, responderCount)
      .map((actor) => actor.id),
  );
}

function distributedClassicCtfCommand(
  command: ClassicCtfTeamCommand,
  actorId: string,
  role: ClassicCtfBotRole,
  followActorId: string | null,
): ClassicCtfTeamCommand {
  if (command === "auto") return "auto";
  if (command === "follow") {
    return actorId === followActorId ? "follow" : "auto";
  }
  if (command === "defend") {
    return role === "defender" || role === "support" ? "defend" : "auto";
  }
  return role === "attacker" || role === "support" ? "attack" : "auto";
}

function actorIdOrder(
  left: Readonly<ActorState>,
  right: Readonly<ActorState>,
): number {
  return left.id.localeCompare(right.id);
}

function boundsRect(map: WorldMapData) {
  const bounds = map.geometry.bounds;
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

function centerOf(rect: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): WorldPosition {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}
