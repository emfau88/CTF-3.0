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
  readonly idleColumns: readonly number[];
  readonly walkColumns: readonly number[];
  readonly walkColumnsByDirection?: Partial<
    Record<V2CharacterDirection, readonly number[]>
  >;
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
  "briarhorn": sixColumnSkin(
    "briarhorn",
    "briarhornRunner",
    .55,
  ),
  "ax9-mantis": sixColumnSkin(
    "ax9-mantis",
    "ax9MantisRunner",
    .56,
  ),
  "null-courier": sixColumnSkin(
    "null-courier",
    "nullCourierRunner",
    .56,
    { down: [1, 2, 3, 2] },
  ),
  "aegis-vanguard": sixColumnSkin(
    "aegis-vanguard",
    "aegisVanguardRunner",
    .55,
  ),
  "alien-runner": sixColumnSkin(
    "alien-runner",
    "xenoRunner",
    .58,
  ),
  "volt-hound": sixColumnSkin(
    "volt-hound",
    "voltHoundRunner",
    .55,
  ),
  "mirejaw": sixColumnSkin(
    "mirejaw",
    "mirejawRunner",
    .52,
  ),
  "scrapwing": sixColumnSkin(
    "scrapwing",
    "scrapwingRunner",
    .56,
  ),
  "prism-bastion": sixColumnSkin(
    "prism-bastion",
    "prismBastionRunner",
    .52,
  ),
};

export const V2_LEGACY_ARENA_CHARACTER_ORIGIN: V2CharacterOrigin = {
  x: .5,
  y: .5,
};

function sixColumnSkin(
  id: V2PlayerSkinId,
  texture: string,
  scale: number,
  walkColumnsByDirection?: Partial<
    Record<V2CharacterDirection, readonly number[]>
  >,
): V2CharacterSkinConfig {
  return {
    id,
    texture,
    scale,
    columns: 6,
    origin: { x: .5, y: .5 },
    idleColumns: [0],
    walkColumns: [1, 2, 3, 4],
    walkColumnsByDirection,
    jumpColumns: [5],
    idleFrameRate: 1,
    walkFrameRate: 9,
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
    const blueRoster: readonly V2PlayerSkinId[] = [
      "prism-bastion",
      "briarhorn",
      "null-courier",
    ];
    return blueRoster[Math.max(0, actorRosterSlot(actor.id) - 2) % blueRoster.length];
  }
  if (actor.teamId === "red") {
    const redRoster: readonly V2PlayerSkinId[] = [
      "mirejaw",
      "scrapwing",
      "volt-hound",
      "ax9-mantis",
    ];
    return redRoster[(actorRosterSlot(actor.id) - 1) % redRoster.length];
  }
  return null;
}

function actorRosterSlot(actorId: string): number {
  const match = actorId.match(/-(\d+)$/);
  return match ? Math.max(1, Number(match[1])) : 1;
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
  const direction = v2CharacterDirection(actor);
  const columns = v2CharacterColumns(skin, state, direction);
  return v2CharacterDirectionRow(direction) * skin.columns +
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
  direction?: V2CharacterDirection,
): readonly number[] {
  if (state === "walk") {
    return direction
      ? skin.walkColumnsByDirection?.[direction] ?? skin.walkColumns
      : skin.walkColumns;
  }
  if (state === "jump") return skin.jumpColumns;
  return skin.idleColumns;
}

export function v2CharacterDirection(
  actor: Readonly<ActorState>,
): V2CharacterDirection {
  const direction = actor.lastMoveDirection;
  return Math.abs(direction.x) >= Math.abs(direction.y)
    ? direction.x >= 0 ? "right" : "left"
    : direction.y >= 0 ? "down" : "up";
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
