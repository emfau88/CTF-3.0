import type { ActorState } from "../../core";
import type { V2PlayerSkinId } from "../../v2Route";

export type V2CharacterDirection = "down" | "right" | "up" | "left";
export type V2CharacterAnimationState = "idle" | "walk" | "jump";

export interface V2CharacterOrigin {
  readonly x: number;
  readonly y: number;
}

export interface V2CharacterPresentation {
  readonly kind: "animated-skin" | "legacy-arena-character";
  readonly texture: string;
  readonly initialFrame: number;
  readonly scale: number;
  readonly origin: V2CharacterOrigin;
  readonly skin?: V2CharacterSkinConfig;
}

export interface V2CharacterSkinConfig {
  readonly id: V2PlayerSkinId;
  readonly texture: string;
  readonly scale: number;
  readonly columns: number;
  readonly origin: V2CharacterOrigin;
  readonly syntheticIdleMotion: boolean;
  readonly idleColumns: readonly number[];
  readonly walkColumns: readonly number[];
  readonly jumpColumns: readonly number[];
  readonly idleFrameRate: number;
  readonly walkFrameRate: number;
  readonly jumpFrameRate: number;
}

export const V2_CHARACTER_DIRECTIONS: readonly V2CharacterDirection[] = [
  "down",
  "right",
  "up",
  "left",
];

export const V2_CHARACTER_SKINS: Record<V2PlayerSkinId, V2CharacterSkinConfig> = {
  "alien-runner": {
    id: "alien-runner",
    texture: "alienRunner",
    scale: .64,
    columns: 4,
    origin: { x: .5, y: .5 },
    syntheticIdleMotion: true,
    idleColumns: [0],
    walkColumns: [1, 2, 3],
    jumpColumns: [0],
    idleFrameRate: 1,
    walkFrameRate: 9,
    jumpFrameRate: 1,
  },
  "riot-droid": {
    id: "riot-droid",
    texture: "riotDroidRunner",
    scale: .64,
    columns: 6,
    origin: { x: .5, y: .5 },
    syntheticIdleMotion: false,
    idleColumns: [0, 1, 2],
    walkColumns: [3, 4, 5],
    jumpColumns: [0],
    idleFrameRate: 3,
    walkFrameRate: 9,
    jumpFrameRate: 1,
  },
  "space-marine-red-rifle": marineSkin(
    "space-marine-red-rifle",
    "spaceMarineRedRifle",
  ),
  "space-marine-red-heavy": marineSkin(
    "space-marine-red-heavy",
    "spaceMarineRedHeavy",
  ),
  "space-marine-red-scout": marineSkin(
    "space-marine-red-scout",
    "spaceMarineRedScout",
  ),
  "space-marine-red-medic": marineSkin(
    "space-marine-red-medic",
    "spaceMarineRedMedic",
  ),
  "space-marine-blue-rifle": marineSkin(
    "space-marine-blue-rifle",
    "spaceMarineBlueRifle",
  ),
  "space-marine-blue-heavy": marineSkin(
    "space-marine-blue-heavy",
    "spaceMarineBlueHeavy",
  ),
  "space-marine-blue-scout": marineSkin(
    "space-marine-blue-scout",
    "spaceMarineBlueScout",
  ),
  "space-marine-blue-medic": marineSkin(
    "space-marine-blue-medic",
    "spaceMarineBlueMedic",
  ),
};

export const V2_LEGACY_ARENA_CHARACTER_ORIGIN: V2CharacterOrigin = {
  x: .5,
  y: .5,
};

function marineSkin(
  id: V2PlayerSkinId,
  texture: string,
): V2CharacterSkinConfig {
  return {
    id,
    texture,
    scale: .42,
    columns: 4,
    origin: { x: .5, y: .5 },
    syntheticIdleMotion: false,
    idleColumns: [0],
    walkColumns: [0, 1, 2, 3],
    jumpColumns: [0],
    idleFrameRate: 1,
    walkFrameRate: 7,
    jumpFrameRate: 1,
  };
}

export function resolveV2CharacterPresentation(
  actor: Readonly<ActorState>,
  playerSkinId: V2PlayerSkinId,
): V2CharacterPresentation {
  const skinId = resolveV2CharacterSkinId(actor, playerSkinId);
  if (skinId) {
    const skin = V2_CHARACTER_SKINS[skinId];
    return {
      kind: "animated-skin",
      texture: skin.texture,
      initialFrame: v2CharacterFrame(skin, actor, "idle"),
      scale: skin.scale,
      origin: skin.origin,
      skin,
    };
  }

  return {
    kind: "legacy-arena-character",
    texture: "arenaCharacters",
    initialFrame: legacyArenaCharacterFrame(actor),
    scale: .42,
    origin: V2_LEGACY_ARENA_CHARACTER_ORIGIN,
  };
}

function resolveV2CharacterSkinId(
  actor: Readonly<ActorState>,
  playerSkinId: V2PlayerSkinId,
): V2PlayerSkinId | null {
  if (actor.id === "blue-player") {
    return playerSkinId;
  }
  if (actor.teamId === "blue") {
    return "alien-runner";
  }
  if (actor.teamId === "red") {
    return "riot-droid";
  }
  return null;
}

export function v2CharacterAnimationState(
  actor: Readonly<ActorState>,
): V2CharacterAnimationState {
  if (actor.lifeState === "active" && actor.jump.height > 1) {
    return "jump";
  }
  return actor.lifeState === "active" &&
      Math.hypot(actor.velocity.x, actor.velocity.y) > 8
    ? "walk"
    : "idle";
}

export function v2CharacterFrame(
  skin: V2CharacterSkinConfig,
  actor: Readonly<ActorState>,
  state: V2CharacterAnimationState,
): number {
  const columns = v2CharacterColumns(skin, state);
  return v2CharacterDirectionRow(v2CharacterDirection(actor)) * skin.columns +
    (columns[0] ?? 0);
}

export function v2CharacterAnimationKey(
  skin: V2CharacterSkinConfig,
  direction: V2CharacterDirection,
  state: V2CharacterAnimationState,
): string {
  return `${skin.id}-${direction}-${state}`;
}

export function v2CharacterColumns(
  skin: V2CharacterSkinConfig,
  state: V2CharacterAnimationState,
): readonly number[] {
  if (state === "walk") return skin.walkColumns;
  if (state === "jump") return skin.jumpColumns;
  return skin.idleColumns;
}

export function v2CharacterDirection(
  actor: Readonly<ActorState>,
): V2CharacterDirection {
  return Math.abs(actor.facing.x) > Math.abs(actor.facing.y)
    ? actor.facing.x >= 0 ? "right" : "left"
    : actor.facing.y >= 0 ? "down" : "up";
}

export function v2CharacterDirectionRow(
  direction: V2CharacterDirection,
): number {
  return V2_CHARACTER_DIRECTIONS.indexOf(direction);
}

export function legacyArenaCharacterFrame(actor: Readonly<ActorState>): number {
  const row = actor.teamId === "blue" ? 4 : 0;
  const direction = Math.abs(actor.facing.x) > Math.abs(actor.facing.y)
    ? actor.facing.x >= 0 ? 1 : 3
    : actor.facing.y >= 0 ? 2 : 0;
  return row * 4 + direction;
}
