import type { CoreActionIntent } from "../input";
import type { TeamId } from "../actors";
import type { GameModeId } from "../modes";
import type {
  ArenaParticipant,
  ArenaTeamId,
  ArenaTeamSlot,
} from "../spawning";
import type { WorldMapData, WorldSnapshot } from "../world";
import {
  ClassicCtfBotController,
} from "./ClassicCtfBotController";
import type {
  ClassicCtfBotRole,
  ClassicCtfTeamCommand,
} from "./ClassicCtfBotDecisionController";
import { OneFlagBotController } from "./OneFlagBotController";
import { TdmBotController } from "./TdmBotController";
import { ArenaBotTeamCoordinator } from "./BotTeamCoordinator";
import {
  BOT_DIFFICULTY_PROFILES,
  type BotDifficultyId,
} from "./BotDifficulty";

export interface ArenaBotControllerGroupOptions {
  readonly modeId: GameModeId;
  readonly map: WorldMapData;
  readonly participants: readonly ArenaParticipant[];
  readonly humanActorIds?: readonly string[];
  readonly difficultyByTeam?: Readonly<
    Partial<Record<ArenaTeamId, BotDifficultyId>>
  >;
  readonly difficultyByActorId?: Readonly<Record<string, BotDifficultyId>>;
}

export interface ArenaBotDifficultyAssignment {
  readonly actorId: string;
  readonly difficultyId: BotDifficultyId;
}

export interface BotActionSource {
  readActions(
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): readonly CoreActionIntent[];
  reset(): void;
  setTeamCommand?(
    teamId: TeamId,
    command: ClassicCtfTeamCommand,
  ): void;
}

export class ArenaBotControllerGroup implements BotActionSource {
  constructor(
    private readonly controllers: readonly BotActionSource[],
    private readonly coordinator?: ArenaBotTeamCoordinator,
    readonly difficultyAssignments: readonly ArenaBotDifficultyAssignment[] = [],
  ) {}

  get size(): number {
    return this.controllers.length;
  }

  readActions(
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): readonly CoreActionIntent[] {
    return this.controllers.flatMap((controller) =>
      controller.readActions(snapshot, deltaMs)
    );
  }

  reset(): void {
    this.coordinator?.reset();
    for (const controller of this.controllers) controller.reset();
  }

  setTeamCommand(teamId: TeamId, command: ClassicCtfTeamCommand): void {
    this.coordinator?.setTeamCommand(teamId, command);
    if (this.coordinator) return;
    for (const controller of this.controllers) {
      controller.setTeamCommand?.(teamId, command);
    }
  }
}

export function createArenaBotControllerGroup(
  options: ArenaBotControllerGroupOptions,
): ArenaBotControllerGroup {
  const {
    modeId,
    map,
    participants,
    humanActorIds = [],
    difficultyByTeam = {},
    difficultyByActorId = {},
  } = options;
  const coordinator = new ArenaBotTeamCoordinator(
    modeId,
    map,
    participants,
    humanActorIds,
  );
  const difficultyAssignments = participants.map((participant) => ({
    actorId: participant.actorId,
    difficultyId: difficultyByActorId[participant.actorId] ??
      difficultyByTeam[participant.teamId] ??
      "normal",
  }));
  const assignmentByActorId = new Map(
    difficultyAssignments.map((assignment) => [
      assignment.actorId,
      assignment.difficultyId,
    ]),
  );
  const controllers = participants.map((participant) => {
    const difficultyId = assignmentByActorId.get(participant.actorId) ??
      "normal";
    const difficulty = BOT_DIFFICULTY_PROFILES[difficultyId];
    if (modeId === "team-deathmatch") {
      return new TdmBotController(
        participant.actorId,
        undefined,
        undefined,
        undefined,
        undefined,
        participant.slot,
        humanActorIds,
        difficulty,
        undefined,
        coordinator,
      );
    }
    if (modeId === "classic-ctf") {
      return new ClassicCtfBotController(
        participant.actorId,
        classicCtfRoleForSlot(participant.slot),
        map,
        undefined,
        undefined,
        undefined,
        difficulty,
        undefined,
        coordinator,
      );
    }
    if (modeId === "one-flag") {
      return new OneFlagBotController(
        participant.actorId,
        map,
        undefined,
        undefined,
        undefined,
        difficulty,
        undefined,
        coordinator,
      );
    }
    throw new Error(`Unsupported arena bot mode: ${modeId}.`);
  });
  return new ArenaBotControllerGroup(
    controllers,
    coordinator,
    difficultyAssignments,
  );
}

export function classicCtfRoleForSlot(
  slot: ArenaTeamSlot,
): ClassicCtfBotRole {
  if (slot === 2) return "defender";
  if (slot === 3) return "support";
  return "attacker";
}
