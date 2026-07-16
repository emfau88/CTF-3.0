import type { WorldPosition } from "../../actors";
import type { WorldRect } from "../worldGeometry";
import type { WorldMapData } from "./worldMapData";

export const WORLD_MAP_ACTOR_RADIUS = 16;

export type WorldMapClearanceBand = "blocked" | "tight" | "open";
export type WorldMapClearanceObstacleKind = "bounds" | "solid" | "gap";

export interface WorldMapClearanceMeasurement {
  readonly clearance: number;
  readonly obstacleId: string;
  readonly obstacleKind: WorldMapClearanceObstacleKind;
}

export interface WorldMapClearanceSample
  extends WorldMapClearanceMeasurement {
  readonly position: WorldPosition;
  readonly band: WorldMapClearanceBand;
}

export interface WorldMapClearanceSampleOptions {
  readonly step?: number;
  readonly actorRadius?: number;
  readonly tightMargin?: number;
}

export function measureWorldMapClearance(
  map: WorldMapData,
  position: WorldPosition,
): WorldMapClearanceMeasurement {
  const bounds = map.geometry.bounds;
  let nearest: WorldMapClearanceMeasurement = {
    clearance: distanceToBounds(position, bounds),
    obstacleId: "world-bounds",
    obstacleKind: "bounds",
  };

  for (const solid of map.geometry.solids) {
    nearest = selectNearest(
      nearest,
      distanceToRect(position, solid),
      solid.id,
      "solid",
    );
  }
  for (const gap of map.geometry.gaps) {
    nearest = selectNearest(
      nearest,
      distanceToRect(position, gap),
      gap.id,
      "gap",
    );
  }
  return nearest;
}

export function sampleWorldMapClearance(
  map: WorldMapData,
  options: WorldMapClearanceSampleOptions = {},
): readonly WorldMapClearanceSample[] {
  const step = Math.max(4, options.step ?? 24);
  const actorRadius = Math.max(0, options.actorRadius ?? WORLD_MAP_ACTOR_RADIUS);
  const tightMargin = Math.max(0, options.tightMargin ?? actorRadius);
  const samples: WorldMapClearanceSample[] = [];
  const bounds = map.geometry.bounds;

  for (
    let y = bounds.minY + step / 2;
    y < bounds.maxY;
    y += step
  ) {
    for (
      let x = bounds.minX + step / 2;
      x < bounds.maxX;
      x += step
    ) {
      const measurement = measureWorldMapClearance(map, { x, y });
      samples.push({
        position: { x, y },
        ...measurement,
        band: measurement.clearance < actorRadius
          ? "blocked"
          : measurement.clearance < actorRadius + tightMargin
          ? "tight"
          : "open",
      });
    }
  }
  return samples;
}

function distanceToBounds(
  point: WorldPosition,
  bounds: WorldMapData["geometry"]["bounds"],
): number {
  return Math.min(
    point.x - bounds.minX,
    bounds.maxX - point.x,
    point.y - bounds.minY,
    bounds.maxY - point.y,
  );
}

function distanceToRect(
  point: WorldPosition,
  rect: WorldRect,
): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - rect.x - rect.width);
  const dy = Math.max(rect.y - point.y, 0, point.y - rect.y - rect.height);
  return Math.hypot(dx, dy);
}

function selectNearest(
  current: WorldMapClearanceMeasurement,
  clearance: number,
  obstacleId: string,
  obstacleKind: WorldMapClearanceObstacleKind,
): WorldMapClearanceMeasurement {
  return clearance < current.clearance
    ? { clearance, obstacleId, obstacleKind }
    : current;
}
