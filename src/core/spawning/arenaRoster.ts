import type { ActorId, TeamId } from "../actors";

export type ArenaTeamId = "blue" | "red";
export type ArenaTeamSize = 1 | 2 | 3 | 4;
export type ArenaTeamSlot = 1 | 2 | 3 | 4;

export interface ArenaParticipant {
  readonly actorId: ActorId;
  readonly teamId: ArenaTeamId;
  readonly slot: ArenaTeamSlot;
  readonly spawnPointId: string;
}

export interface ArenaTeamSizes {
  readonly blue: ArenaTeamSize;
  readonly red: ArenaTeamSize;
}

export interface ArenaWorldOptions {
  readonly teamSize?: ArenaTeamSize;
  readonly teamSizes?: ArenaTeamSizes;
}

export const DEFAULT_ARENA_TEAM_SIZE: ArenaTeamSize = 1;
export const MAX_ARENA_TEAM_SIZE: ArenaTeamSize = 4;

export function createArenaRoster(
  teamSizeOrSizes: ArenaTeamSize | ArenaTeamSizes = DEFAULT_ARENA_TEAM_SIZE,
): readonly ArenaParticipant[] {
  const teamSizes = resolveArenaTeamSizes(teamSizeOrSizes);
  const participants: ArenaParticipant[] = [];
  for (const teamId of ["blue", "red"] as const) {
    for (let slot = 1; slot <= teamSizes[teamId]; slot++) {
      const teamSlot = slot as ArenaTeamSlot;
      participants.push({
        actorId: arenaActorId(teamId, teamSlot),
        teamId,
        slot: teamSlot,
        spawnPointId: arenaSpawnPointId(teamId, teamSlot),
      });
    }
  }
  return participants;
}

export function resolveArenaTeamSizes(
  teamSizeOrSizes: ArenaTeamSize | ArenaTeamSizes = DEFAULT_ARENA_TEAM_SIZE,
): ArenaTeamSizes {
  if (typeof teamSizeOrSizes === "number") {
    assertArenaTeamSize(teamSizeOrSizes);
    return { blue: teamSizeOrSizes, red: teamSizeOrSizes };
  }
  assertArenaTeamSize(teamSizeOrSizes.blue);
  assertArenaTeamSize(teamSizeOrSizes.red);
  return { blue: teamSizeOrSizes.blue, red: teamSizeOrSizes.red };
}

export function maximumArenaTeamSize(teamSizes: ArenaTeamSizes): ArenaTeamSize {
  return Math.max(teamSizes.blue, teamSizes.red) as ArenaTeamSize;
}

export function arenaActorId(
  teamId: ArenaTeamId,
  slot: ArenaTeamSlot,
): ActorId {
  return slot === 1 ? `${teamId}-player` : `${teamId}-player-${slot}`;
}

export function arenaSpawnPointId(
  teamId: ArenaTeamId,
  slot: ArenaTeamSlot,
): string {
  return slot === 1
    ? `${teamId}-player-spawn`
    : `${teamId}-player-spawn-${slot}`;
}

export function isArenaTeamSize(value: number): value is ArenaTeamSize {
  return Number.isInteger(value) && value >= 1 && value <= MAX_ARENA_TEAM_SIZE;
}

export function assertArenaTeamSize(value: number): asserts value is ArenaTeamSize {
  if (!isArenaTeamSize(value)) {
    throw new Error(`Arena team size must be between 1 and ${MAX_ARENA_TEAM_SIZE}.`);
  }
}

export function isArenaTeamId(teamId: TeamId): teamId is ArenaTeamId {
  return teamId === "blue" || teamId === "red";
}
