import type { WorldGeometry } from "../../core";

export function calculateArenaFitZoom(
  viewportWidth: number,
  viewportHeight: number,
  bounds: WorldGeometry["bounds"],
  requestedZoom = 1,
): number {
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  return Math.max(
    requestedZoom,
    Math.max(1, viewportWidth) / worldWidth,
    Math.max(1, viewportHeight) / worldHeight,
  );
}
