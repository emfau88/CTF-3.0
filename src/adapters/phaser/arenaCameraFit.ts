import type { WorldGeometry } from "../../core";

export const MINIMUM_ARENA_VIEW_WIDTH = 1280;
export const MINIMUM_ARENA_VIEW_HEIGHT = 720;
export const MINIMUM_MOBILE_ARENA_VIEW_WIDTH = 1120;
export const MINIMUM_MOBILE_ARENA_VIEW_HEIGHT = 640;
export const MAXIMUM_DESKTOP_ARENA_ZOOM = 1.05;
export const MAXIMUM_MOBILE_ARENA_ZOOM = .9;

export type ArenaCameraMode = "desktop" | "mobile";

export function calculateArenaFitZoom(
  viewportWidth: number,
  viewportHeight: number,
  bounds: WorldGeometry["bounds"],
  requestedZoom = 1,
  mode: ArenaCameraMode = "desktop",
): number {
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const minimumViewWidth = mode === "mobile"
    ? MINIMUM_MOBILE_ARENA_VIEW_WIDTH
    : MINIMUM_ARENA_VIEW_WIDTH;
  const minimumViewHeight = mode === "mobile"
    ? MINIMUM_MOBILE_ARENA_VIEW_HEIGHT
    : MINIMUM_ARENA_VIEW_HEIGHT;
  const responsiveZoom = Math.min(
    requestedZoom,
    safeViewportWidth / Math.min(worldWidth, minimumViewWidth),
    safeViewportHeight / Math.min(worldHeight, minimumViewHeight),
  );
  const fillZoom = Math.max(
    responsiveZoom,
    safeViewportWidth / worldWidth,
    safeViewportHeight / worldHeight,
  );
  const maximumZoom = mode === "mobile"
    ? Math.min(requestedZoom, MAXIMUM_MOBILE_ARENA_ZOOM)
    : requestedZoom < 1
    ? requestedZoom
    : MAXIMUM_DESKTOP_ARENA_ZOOM;
  return Math.min(fillZoom, maximumZoom);
}

export function calculateArenaFollowAlpha(
  deltaMs: number,
  mode: ArenaCameraMode,
): number {
  const safeDeltaMs = Math.max(0, Math.min(100, deltaMs));
  if (safeDeltaMs === 0) return 0;
  const halfLifeMs = mode === "mobile" ? 45 : 90;
  return 1 - Math.pow(.5, safeDeltaMs / halfLifeMs);
}
