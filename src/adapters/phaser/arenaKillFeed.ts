import type { GameEvent } from "../../core";

export type ArenaKillCause =
  | "rocket"
  | "rail"
  | "whip"
  | "pulse"
  | "disc"
  | "grenade"
  | "shard"
  | "fall"
  | "suicide"
  | "unknown";

export interface ArenaKillNotice {
  readonly eventId: string;
  readonly killerActorId?: string;
  readonly victimActorId: string;
  readonly cause: ArenaKillCause;
}

export function readArenaKillNotice(
  event: GameEvent,
): ArenaKillNotice | null {
  if (event.type !== "actor.died" || !event.targetActorId) return null;
  const reason = readPayloadString(event.payload, "reason");
  const weaponId = readPayloadString(event.payload, "weaponId");
  const suicide = Boolean(
    event.sourceActorId && event.sourceActorId === event.targetActorId,
  );
  const cause: ArenaKillCause = suicide
    ? "suicide"
    : reason === "fall"
    ? "fall"
    : weaponId === "rocket" || weaponId === "rail" || weaponId === "whip" ||
        weaponId === "pulse" || weaponId === "disc" ||
        weaponId === "grenade" || weaponId === "shard" ||
        weaponId === "shard-resonance"
    ? weaponId === "shard-resonance" ? "shard" : weaponId
    : "unknown";
  return {
    eventId: event.id,
    killerActorId: event.sourceActorId,
    victimActorId: event.targetActorId,
    cause,
  };
}

function readPayloadString(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object" || !(key in payload)) {
    return undefined;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
