import type { ArenaTeamSlot } from "../spawning";

export type BotDifficultyId = "casual" | "normal" | "strong";

export interface BotDifficultyProfile {
  readonly id: BotDifficultyId;
  readonly reactionMs: number;
  readonly intentCommitMs: number;
  readonly targetCommitMs: number;
  readonly aimJitterMultiplier: number;
  readonly predictionMultiplier: number;
  readonly awarenessRange: number;
}

export interface BotPersonality {
  readonly aggression: number;
  readonly objectiveFocus: number;
  readonly selfPreservation: number;
  readonly teamwork: number;
  readonly lateralBias: number;
}

export const BOT_DIFFICULTY_PROFILES: Readonly<
  Record<BotDifficultyId, BotDifficultyProfile>
> = {
  casual: {
    id: "casual",
    reactionMs: 480,
    intentCommitMs: 900,
    targetCommitMs: 1_150,
    aimJitterMultiplier: 1.65,
    predictionMultiplier: .55,
    awarenessRange: 780,
  },
  normal: {
    id: "normal",
    reactionMs: 300,
    intentCommitMs: 700,
    targetCommitMs: 950,
    aimJitterMultiplier: 1,
    predictionMultiplier: .82,
    awarenessRange: 940,
  },
  strong: {
    id: "strong",
    reactionMs: 180,
    intentCommitMs: 520,
    targetCommitMs: 720,
    aimJitterMultiplier: .62,
    predictionMultiplier: 1,
    awarenessRange: 1_150,
  },
};

export function createBotPersonality(
  actorId: string,
  slot: ArenaTeamSlot = 1,
): BotPersonality {
  return {
    aggression: trait(actorId, "aggression", .42, .76),
    objectiveFocus: trait(actorId, "objective", .5, .86),
    selfPreservation: trait(actorId, "survival", .38, .74),
    teamwork: trait(actorId, "teamwork", .48, .88),
    lateralBias: slot % 2 === 0 ? 1 : -1,
  };
}

function trait(
  actorId: string,
  key: string,
  minimum: number,
  maximum: number,
): number {
  return minimum + deterministicUnit(`${actorId}:${key}`) *
    (maximum - minimum);
}

function deterministicUnit(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
