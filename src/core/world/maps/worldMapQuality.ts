import type { WorldPosition } from "../../actors";
import type { WorldRect } from "../worldGeometry";
import type { WorldMapData, WorldMapPresentationRect } from "./worldMapData";

const DEFAULT_ACTOR_RADIUS = 16;
const DEFAULT_PICKUP_RADIUS = 22;
const DEFAULT_MAXIMUM_JUMP_DISTANCE = 170;

export interface WorldMapClearPointRequirement {
  readonly id: string;
  readonly position: WorldPosition;
  readonly minimumClearance?: number;
}

export interface WorldMapBlockedSightLineRequirement {
  readonly id: string;
  readonly from: WorldPosition;
  readonly to: WorldPosition;
  readonly blockerPadding?: number;
}

export interface WorldMapQualityGateOptions {
  readonly actorRadius?: number;
  readonly pickupRadius?: number;
  readonly maximumJumpDistance?: number;
  readonly clearPoints?: readonly WorldMapClearPointRequirement[];
  readonly blockedSightLines?: readonly WorldMapBlockedSightLineRequirement[];
}

export interface WorldMapQualityIssue {
  readonly code:
    | "duplicate-geometry-id"
    | "invalid-geometry-rect"
    | "out-of-bounds-geometry"
    | "presentation-geometry-mismatch"
    | "invalid-gameplay-area"
    | "duplicate-spawn-id"
    | "invalid-spawn-clearance"
    | "duplicate-pickup-id"
    | "invalid-pickup-clearance"
    | "pickup-overlaps-spawn"
    | "duplicate-jump-link-id"
    | "invalid-jump-link"
    | "jump-link-too-long"
    | "jump-link-misses-traversal"
    | "invalid-diagnostic-spawn"
    | "unsafe-required-point"
    | "unblocked-required-sight-line";
  readonly message: string;
}

export function validateWorldMapQuality(
  map: WorldMapData,
  options: WorldMapQualityGateOptions = {},
): readonly WorldMapQualityIssue[] {
  const actorRadius = options.actorRadius ?? DEFAULT_ACTOR_RADIUS;
  const pickupRadius = options.pickupRadius ?? DEFAULT_PICKUP_RADIUS;
  const maximumJumpDistance = options.maximumJumpDistance ??
    DEFAULT_MAXIMUM_JUMP_DISTANCE;
  const issues: WorldMapQualityIssue[] = [];

  validateGeometry(map, issues);
  validateGameplayAreas(map, actorRadius, issues);
  validateSpawns(map, actorRadius, issues);
  validatePickups(map, actorRadius, pickupRadius, issues);
  validateJumpLinks(map, maximumJumpDistance, issues);

  if (!pointHasClearance(map, map.diagnosticSpawn, actorRadius)) {
    issues.push({
      code: "invalid-diagnostic-spawn",
      message: `${map.id} diagnostic spawn must have ${actorRadius}px of playable clearance.`,
    });
  }

  for (const requirement of options.clearPoints ?? []) {
    const clearance = requirement.minimumClearance ?? actorRadius;
    if (!pointHasClearance(map, requirement.position, clearance)) {
      issues.push({
        code: "unsafe-required-point",
        message: `${map.id} required point ${requirement.id} must have ${clearance}px of playable clearance.`,
      });
    }
  }

  for (const requirement of options.blockedSightLines ?? []) {
    if (
      hasWorldMapLineOfSight(
        map,
        requirement.from,
        requirement.to,
        requirement.blockerPadding ?? 0,
      )
    ) {
      issues.push({
        code: "unblocked-required-sight-line",
        message: `${map.id} sight line ${requirement.id} must be blocked by solid geometry.`,
      });
    }
  }

  return issues;
}

export function assertWorldMapQuality(
  map: WorldMapData,
  options: WorldMapQualityGateOptions = {},
): void {
  const issues = validateWorldMapQuality(map, options);
  if (issues.length === 0) return;
  throw new Error(
    `World map quality gate failed for ${map.id}: ${issues.map((issue) => issue.message).join(" ")}`,
  );
}

export function hasWorldMapLineOfSight(
  map: WorldMapData,
  from: WorldPosition,
  to: WorldPosition,
  blockerPadding = 0,
): boolean {
  return !map.geometry.solids.some((solid) =>
    segmentIntersectsRect(from, to, solid, blockerPadding)
  );
}

export function measureWorldRouteLength(
  points: readonly WorldPosition[],
): number {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return length;
}

function validateGeometry(
  map: WorldMapData,
  issues: WorldMapQualityIssue[],
): void {
  const geometry = [...map.geometry.solids, ...map.geometry.gaps];
  validateUniqueIds(
    geometry,
    "duplicate-geometry-id",
    map,
    issues,
  );

  for (const rect of geometry) {
    if (!isPositiveRect(rect)) {
      issues.push({
        code: "invalid-geometry-rect",
        message: `${map.id} geometry ${rect.id} must have positive dimensions.`,
      });
    } else if (!rectInsideBounds(rect, map)) {
      issues.push({
        code: "out-of-bounds-geometry",
        message: `${map.id} geometry ${rect.id} must stay inside world bounds.`,
      });
    }
  }

  if (
    !presentationMatchesGeometry(map.presentation.walls, map.geometry.solids) ||
    !presentationMatchesGeometry(map.presentation.gaps, map.geometry.gaps)
  ) {
    issues.push({
      code: "presentation-geometry-mismatch",
      message: `${map.id} presentation walls and gaps must exactly match gameplay geometry.`,
    });
  }
}

function validateGameplayAreas(
  map: WorldMapData,
  actorRadius: number,
  issues: WorldMapQualityIssue[],
): void {
  const areas = [
    { id: "blue-base", rect: map.gameplay.blueBase },
    { id: "red-base", rect: map.gameplay.redBase },
    ...(map.gameplay.combatZone
      ? [{ id: "combat-zone", rect: map.gameplay.combatZone }]
      : []),
  ];
  for (const area of areas) {
    const center = centerOf(area.rect);
    if (
      !isPositiveRect(area.rect) ||
      !rectInsideBounds(area.rect, map) ||
      !pointHasClearance(map, center, actorRadius)
    ) {
      issues.push({
        code: "invalid-gameplay-area",
        message: `${map.id} ${area.id} must be in bounds with a playable center.`,
      });
    }
  }
}

function validateSpawns(
  map: WorldMapData,
  actorRadius: number,
  issues: WorldMapQualityIssue[],
): void {
  validateUniqueIds(
    map.spawnPoints,
    "duplicate-spawn-id",
    map,
    issues,
  );
  for (const spawn of map.spawnPoints) {
    if (!pointHasClearance(map, spawn.position, actorRadius)) {
      issues.push({
        code: "invalid-spawn-clearance",
        message: `${map.id} spawn ${spawn.id} must have ${actorRadius}px of playable clearance.`,
      });
    }
  }
}

function validatePickups(
  map: WorldMapData,
  actorRadius: number,
  pickupRadius: number,
  issues: WorldMapQualityIssue[],
): void {
  validateUniqueIds(
    map.pickupSpawns,
    "duplicate-pickup-id",
    map,
    issues,
  );
  for (const pickup of map.pickupSpawns) {
    if (!pointHasClearance(map, pickup.position, pickupRadius)) {
      issues.push({
        code: "invalid-pickup-clearance",
        message: `${map.id} pickup ${pickup.id} must have ${pickupRadius}px of playable clearance.`,
      });
    }
    const overlappingSpawn = map.spawnPoints.find((spawn) =>
      isPlayerSpawn(spawn) &&
      distance(spawn.position, pickup.position) < actorRadius + pickupRadius
    );
    if (overlappingSpawn) {
      issues.push({
        code: "pickup-overlaps-spawn",
        message: `${map.id} pickup ${pickup.id} overlaps spawn ${overlappingSpawn.id}.`,
      });
    }
  }
}

function validateJumpLinks(
  map: WorldMapData,
  maximumJumpDistance: number,
  issues: WorldMapQualityIssue[],
): void {
  validateUniqueIds(
    map.navigation.jumpLinks,
    "duplicate-jump-link-id",
    map,
    issues,
  );
  const traversalRects = [...map.geometry.solids, ...map.geometry.gaps];
  for (const link of map.navigation.jumpLinks) {
    if (
      link.activationRadius <= 0 ||
      !jumpEndpointIsValid(map, link.from) ||
      !jumpEndpointIsValid(map, link.to) ||
      distance(link.from, link.to) <= 0
    ) {
      issues.push({
        code: "invalid-jump-link",
        message: `${map.id} jump link ${link.id} needs a positive radius, non-zero distance, and in-bounds endpoints.`,
      });
    }
    const jumpDistance = distance(link.from, link.to);
    if (jumpDistance > maximumJumpDistance) {
      issues.push({
        code: "jump-link-too-long",
        message: `${map.id} jump link ${link.id} is ${jumpDistance.toFixed(1)}px; maximum is ${maximumJumpDistance}px.`,
      });
    }
    if (
      !traversalRects.some((rect) =>
        segmentIntersectsRect(link.from, link.to, rect)
      )
    ) {
      issues.push({
        code: "jump-link-misses-traversal",
        message: `${map.id} jump link ${link.id} must cross a wall or gap.`,
      });
    }
  }
}

function jumpEndpointIsValid(
  map: WorldMapData,
  point: WorldPosition,
): boolean {
  const bounds = map.geometry.bounds;
  return Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= bounds.minX && point.x <= bounds.maxX &&
    point.y >= bounds.minY && point.y <= bounds.maxY;
}

function isPlayerSpawn(spawn: {
  readonly id: string;
  readonly tags?: readonly string[];
}): boolean {
  return spawn.tags?.includes("player") === true ||
    spawn.id.includes("player-spawn");
}

function validateUniqueIds<T extends { readonly id: string }>(
  values: readonly T[],
  code:
    | "duplicate-geometry-id"
    | "duplicate-spawn-id"
    | "duplicate-pickup-id"
    | "duplicate-jump-link-id",
  map: WorldMapData,
  issues: WorldMapQualityIssue[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      issues.push({
        code,
        message: `${map.id} uses duplicate id ${value.id}.`,
      });
    }
    seen.add(value.id);
  }
}

function presentationMatchesGeometry(
  presentation: readonly WorldMapPresentationRect[],
  geometry: readonly WorldRect[],
): boolean {
  return presentation.length === geometry.length &&
    presentation.every((rect, index) => {
      const gameplayRect = geometry[index];
      return gameplayRect !== undefined &&
        rect.x === gameplayRect.x &&
        rect.y === gameplayRect.y &&
        rect.width === gameplayRect.width &&
        rect.height === gameplayRect.height;
    });
}

function pointHasClearance(
  map: WorldMapData,
  point: WorldPosition,
  clearance: number,
): boolean {
  const bounds = map.geometry.bounds;
  if (
    point.x < bounds.minX + clearance ||
    point.x > bounds.maxX - clearance ||
    point.y < bounds.minY + clearance ||
    point.y > bounds.maxY - clearance
  ) {
    return false;
  }
  return ![...map.geometry.solids, ...map.geometry.gaps].some((rect) =>
    circleIntersectsRect(point, clearance, rect)
  );
}

function circleIntersectsRect(
  point: WorldPosition,
  radius: number,
  rect: WorldMapPresentationRect,
): boolean {
  const nearestX = clamp(point.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(point.y, rect.y, rect.y + rect.height);
  return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2 < radius ** 2;
}

function segmentIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: WorldMapPresentationRect,
  padding = 0,
): boolean {
  const minX = rect.x - padding;
  const maxX = rect.x + rect.width + padding;
  const minY = rect.y - padding;
  const maxY = rect.y + rect.height + padding;
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  let entry = 0;
  let exit = 1;

  for (const [start, delta, min, max] of [
    [from.x, deltaX, minX, maxX],
    [from.y, deltaY, minY, maxY],
  ] as const) {
    if (Math.abs(delta) < .000001) {
      if (start < min || start > max) return false;
      continue;
    }
    const first = (min - start) / delta;
    const second = (max - start) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return false;
  }
  return true;
}

function isPositiveRect(rect: WorldMapPresentationRect): boolean {
  return Number.isFinite(rect.x) && Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) && Number.isFinite(rect.height) &&
    rect.width > 0 && rect.height > 0;
}

function rectInsideBounds(
  rect: WorldMapPresentationRect,
  map: WorldMapData,
): boolean {
  const bounds = map.geometry.bounds;
  return rect.x >= bounds.minX && rect.y >= bounds.minY &&
    rect.x + rect.width <= bounds.maxX &&
    rect.y + rect.height <= bounds.maxY;
}

function centerOf(rect: WorldMapPresentationRect): WorldPosition {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
