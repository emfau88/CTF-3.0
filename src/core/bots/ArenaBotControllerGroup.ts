import type { CoreActionIntent } from "../input";
import type { TeamId } from "../actors";
import type { GameModeId } from "../modes";
import type { ArenaParticipant, ArenaTeamSlot } from "../spawning";
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
  modeId: GameModeId,
  map: WorldMapData,
  participants: readonly ArenaParticipant[],
  humanActorIds: readonly string[] = [],
): ArenaBotControllerGroup {
  const coordinator = new ArenaBotTeamCoordinator(
    modeId,
    map,
    participants,
    humanActorIds,
  );
  return new ArenaBotControllerGroup(participants.map((participant) => {
    if (modeId === "team-deathmatch") {
      return new TdmBotController(
        participant.actorId,
        undefined,
        undefined,
        undefined,
        undefined,
        participant.slot,
        humanActorIds,
        undefined,
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
        undefined,
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
        undefined,
        undefined,
        coordinator,
      );
    }
    throw new Error(`Unsupported arena bot mode: ${modeId}.`);
  }), coordinator);
}

export function classicCtfRoleForSlot(
  slot: ArenaTeamSlot,
): ClassicCtfBotRole {
  if (slot === 2) return "defender";
  if (slot === 3) return "support";
  return "attacker";
}
