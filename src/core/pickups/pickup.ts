import type { WorldPosition } from "../actors";

export type PickupId = string;
export type PickupType =
  | "health"
  | "armor"
  | "rocket"
  | "rail"
  | "pulse"
  | "disc"
  | "grenade"
  | "shard";
export type PickupLifeState = "active" | "inactive";
export type PickupOrigin = "map" | "death-drop";

export interface PickupState {
  readonly id: PickupId;
  readonly type: PickupType;
  readonly position: WorldPosition;
  readonly radius: number;
  value: number;
  readonly respawnDelayMs: number;
  readonly origin: PickupOrigin;
  readonly expiresAfterMs: number | null;
  lifeState: PickupLifeState;
  respawnRemainingMs: number;
  expiresRemainingMs: number | null;
}
