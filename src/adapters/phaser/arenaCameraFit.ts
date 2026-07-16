import type { WorldGeometry } from "../../core";

export const MINIMUM_ARENA_VIEW_WIDTH = 1280;
export const MINIMUM_ARENA_VIEW_HEIGHT = 720;
export const MAXIMUM_DESKTOP_ARENA_ZOOM = 1.15;

export function calculateArenaFitZoom(
  viewportWidth: number,
  viewportHeight: number,
  bounds: WorldGeometry["bounds"],
  requestedZoom = 1,
): number {
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const responsiveZoom = Math.min(
    requestedZoom,
    safeViewportWidth / Math.min(worldWidth, MINIMUM_ARENA_VIEW_WIDTH),
    safeViewportHeight / Math.min(worldHeight, MINIMUM_ARENA_VIEW_HEIGHT),
  );
  const fillZoom = Math.max(
    responsiveZoom,
    safeViewportWidth / worldWidth,
    safeViewportHeight / worldHeight,
  );
  const maximumZoom = requestedZoom < 1
    ? requestedZoom
    : MAXIMUM_DESKTOP_ARENA_ZOOM;
  return Math.min(fillZoom, maximumZoom);
}
