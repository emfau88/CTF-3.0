export interface BotNavigationConfig {
  readonly cellSize: number;
  readonly repathIntervalMs: number;
  readonly repathJitterMs?: number;
  readonly waypointReachDistance: number;
  readonly obstaclePadding: number;
  readonly stuckRepathMs?: number;
  readonly stuckSkipWaypointMs?: number;
  readonly stuckEscapeMs?: number;
  readonly projectionRadius?: number;
}

export const V2_BOT_NAVIGATION_CONFIG: BotNavigationConfig = {
  cellSize: 40,
  repathIntervalMs: 420,
  repathJitterMs: 180,
  waypointReachDistance: 24,
  obstaclePadding: 18,
  stuckRepathMs: 650,
  stuckSkipWaypointMs: 1_100,
  stuckEscapeMs: 1_800,
  projectionRadius: 280,
};
