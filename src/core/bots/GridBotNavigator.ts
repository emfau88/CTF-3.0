import type { WorldPosition } from "../actors";
import type {
  WorldJumpLink,
  WorldRect,
  WorldSnapshot,
} from "../world";
import {
  V2_BOT_NAVIGATION_CONFIG,
  type BotNavigationConfig,
} from "./BotNavigationConfig";

type NavigationSnapshot = Pick<WorldSnapshot, "geometry" | "navigation">;

interface GridCell {
  readonly x: number;
  readonly y: number;
}

interface PathEdge {
  readonly from: GridCell;
  readonly jumpLink?: WorldJumpLink;
}

interface PathWaypoint {
  readonly position: WorldPosition;
  readonly jumpLink?: WorldJumpLink;
}

interface OpenGridCell {
  readonly cell: GridCell;
  readonly score: number;
}

export interface GridCellCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface BotNavigationDecision {
  readonly direction: WorldPosition;
  readonly jump: boolean;
  readonly recoveryStage?: 0 | 1 | 2 | 3;
}

export type GridBotRepathReason =
  | "initial"
  | "interval"
  | "target-changed"
  | "path-exhausted"
  | "stuck"
  | "none";

export interface GridBotNavigatorDebugState {
  readonly from: WorldPosition | null;
  readonly target: WorldPosition | null;
  readonly projectedTarget: WorldPosition | null;
  readonly projectionApplied: boolean;
  readonly projectionDistance: number;
  readonly targetKey: string;
  readonly startCell: GridCellCoordinate | null;
  readonly goalCell: GridCellCoordinate | null;
  readonly currentWaypoint: WorldPosition | null;
  readonly currentWaypointIndex: number;
  readonly pathLength: number;
  readonly rawPathLength: number;
  readonly repathRemainingMs: number;
  readonly repathed: boolean;
  readonly repathReason: GridBotRepathReason;
  readonly traversingJump: boolean;
  readonly jumpLinkActive: boolean;
  readonly jumpLinkId: string | null;
  readonly jumpLinkProgress: number | null;
  readonly goalBlocked: boolean;
  readonly pathFound: boolean;
  readonly stationaryMs: number;
  readonly recoveryStage: 0 | 1 | 2 | 3;
}

export interface BotNavigator {
  navigate(
    from: WorldPosition,
    target: WorldPosition,
    targetKey: string,
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): BotNavigationDecision;
  reset(): void;
}

export class GridBotNavigator implements BotNavigator {
  private path: PathWaypoint[] = [];
  private pathIndex = 0;
  private repathRemainingMs = 0;
  private targetKey = "";
  private activeTarget: WorldPosition | null = null;
  private lastPosition: WorldPosition | null = null;
  private stationaryMs = 0;
  private recoveryStage: 0 | 1 | 2 | 3 = 0;
  private rawPathLength = 0;
  private lastDebugState: GridBotNavigatorDebugState = {
    from: null,
    target: null,
    projectedTarget: null,
    projectionApplied: false,
    projectionDistance: 0,
    targetKey: "",
    startCell: null,
    goalCell: null,
    currentWaypoint: null,
    currentWaypointIndex: 0,
    pathLength: 0,
    rawPathLength: 0,
    repathRemainingMs: 0,
    repathed: false,
    repathReason: "none",
    traversingJump: false,
    jumpLinkActive: false,
    jumpLinkId: null,
    jumpLinkProgress: null,
    goalBlocked: false,
    pathFound: false,
    stationaryMs: 0,
    recoveryStage: 0,
  };

  constructor(
    private readonly config: BotNavigationConfig =
      V2_BOT_NAVIGATION_CONFIG,
  ) {}

  navigate(
    from: WorldPosition,
    target: WorldPosition,
    targetKey: string,
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): BotNavigationDecision {
    this.repathRemainingMs -= Math.max(0, deltaMs);
    const bounds = snapshot.geometry.bounds;
    const startCell = cellFor(from, bounds.minX, bounds.minY, this.config.cellSize);
    const blockers = [
      ...snapshot.geometry.solids,
      ...snapshot.geometry.gaps,
    ];
    const targetChanged = targetKey !== this.targetKey;
    this.updateStationaryState(
      from,
      target,
      deltaMs,
    );
    const nextRecoveryStage = recoveryStageFor(
      this.stationaryMs,
      this.config,
    );
    const enteredSkipStage =
      nextRecoveryStage >= 2 && this.recoveryStage < 2;
    this.recoveryStage = nextRecoveryStage;
    const currentWaypoint = this.path[this.pathIndex];
    const traversingJump = Boolean(
      currentWaypoint?.jumpLink &&
        jumpTraversalIsPlausible(
          from,
          currentWaypoint.jumpLink,
          this.config.waypointReachDistance,
        ),
    );
    let repathed = false;
    let repathReason: GridBotRepathReason = "none";
    if (
      (!traversingJump || this.recoveryStage >= 1) &&
      (
        this.repathRemainingMs <= 0 ||
        this.pathIndex >= this.path.length ||
        targetChanged ||
        this.recoveryStage === 1
      )
    ) {
      repathReason = this.recoveryStage === 1
        ? "stuck"
        : targetChanged
        ? this.targetKey
          ? "target-changed"
          : "initial"
        : this.pathIndex >= this.path.length
        ? "path-exhausted"
        : "interval";
      const resolved = resolveNavigationPath(
        from,
        target,
        snapshot,
        this.config,
      );
      this.path = resolved.path;
      this.activeTarget = resolved.target;
      this.rawPathLength = resolved.rawPathLength;
      this.pathIndex = 0;
      this.repathRemainingMs = nextRepathInterval(
        this.config,
        targetKey,
        startCell,
      );
      this.targetKey = targetKey;
      repathed = true;
    }

    if (
      enteredSkipStage &&
      this.pathIndex < this.path.length - 1 &&
      !this.path[this.pathIndex]?.jumpLink &&
      this.canSkipToNextWaypoint(from)
    ) {
      this.pathIndex++;
    }
    while (
      this.pathIndex < this.path.length - 1 &&
      distance(from, this.path[this.pathIndex]!.position) <=
        this.config.waypointReachDistance
    ) {
      this.pathIndex++;
    }
    const waypoint = this.path[this.pathIndex];
    const jumpLink = waypoint?.jumpLink;
    const projectedTarget = this.activeTarget ?? target;
    const regularDirection = normalizedDirection(
      from,
      waypoint?.position ?? projectedTarget,
    );
    const decision = {
      direction: this.recoveryStage === 3
        ? recoveryEscapeDirection(
          from,
          waypoint?.position ?? projectedTarget,
          snapshot,
          targetKey,
          this.config.obstaclePadding,
        )
        : regularDirection,
      jump: Boolean(
        jumpLink &&
          distance(from, jumpLink.from) <= jumpLink.activationRadius,
      ),
      recoveryStage: this.recoveryStage,
    };
    const goalCell = cellFor(
      projectedTarget,
      bounds.minX,
      bounds.minY,
      this.config.cellSize,
    );
    const projectionDistance = distance(target, projectedTarget);
    this.lastDebugState = {
      from: { ...from },
      target: { ...target },
      projectedTarget: { ...projectedTarget },
      projectionApplied: projectionDistance > .001,
      projectionDistance,
      targetKey,
      startCell,
      goalCell,
      currentWaypoint: waypoint ? { ...waypoint.position } : null,
      currentWaypointIndex: this.pathIndex,
      pathLength: this.path.length,
      rawPathLength: this.rawPathLength,
      repathRemainingMs: this.repathRemainingMs,
      repathed,
      repathReason,
      traversingJump,
      jumpLinkActive: Boolean(jumpLink),
      jumpLinkId: jumpLink?.id ?? null,
      jumpLinkProgress: jumpLink
        ? progressAlongSegment(from, jumpLink.from, jumpLink.to)
        : null,
      goalBlocked: blocked(target, blockers, this.config.obstaclePadding),
      pathFound: this.path.length > 0 &&
        !positionsMatch(this.path[0]?.position, from),
      stationaryMs: this.stationaryMs,
      recoveryStage: this.recoveryStage,
    };
    this.lastPosition = { ...from };
    return decision;
  }

  reset(): void {
    this.path = [];
    this.pathIndex = 0;
    this.repathRemainingMs = 0;
    this.targetKey = "";
    this.activeTarget = null;
    this.lastPosition = null;
    this.stationaryMs = 0;
    this.recoveryStage = 0;
    this.rawPathLength = 0;
    this.lastDebugState = {
      from: null,
      target: null,
      projectedTarget: null,
      projectionApplied: false,
      projectionDistance: 0,
      targetKey: "",
      startCell: null,
      goalCell: null,
      currentWaypoint: null,
      currentWaypointIndex: 0,
      pathLength: 0,
      rawPathLength: 0,
      repathRemainingMs: 0,
      repathed: false,
      repathReason: "none",
      traversingJump: false,
      jumpLinkActive: false,
      jumpLinkId: null,
      jumpLinkProgress: null,
      goalBlocked: false,
      pathFound: false,
      stationaryMs: 0,
      recoveryStage: 0,
    };
  }

  debugSnapshot(): GridBotNavigatorDebugState {
    return {
      ...this.lastDebugState,
      from: this.lastDebugState.from ? { ...this.lastDebugState.from } : null,
      target: this.lastDebugState.target ? { ...this.lastDebugState.target } : null,
      projectedTarget: this.lastDebugState.projectedTarget
        ? { ...this.lastDebugState.projectedTarget }
        : null,
      startCell: this.lastDebugState.startCell
        ? { ...this.lastDebugState.startCell }
        : null,
      goalCell: this.lastDebugState.goalCell
        ? { ...this.lastDebugState.goalCell }
        : null,
      currentWaypoint: this.lastDebugState.currentWaypoint
        ? { ...this.lastDebugState.currentWaypoint }
        : null,
    };
  }

  private canSkipToNextWaypoint(from: WorldPosition): boolean {
    const nextWaypoint = this.path[this.pathIndex + 1];
    return !nextWaypoint?.jumpLink ||
      distance(from, nextWaypoint.jumpLink.from) <=
        nextWaypoint.jumpLink.activationRadius;
  }

  private updateStationaryState(
    position: WorldPosition,
    target: WorldPosition,
    deltaMs: number,
  ): void {
    if (
      !this.lastPosition ||
      distance(position, target) <= this.config.waypointReachDistance
    ) {
      this.stationaryMs = 0;
      this.recoveryStage = 0;
      return;
    }
    if (distance(position, this.lastPosition) <= 1.25) {
      this.stationaryMs += Math.max(0, deltaMs);
      return;
    }
    this.stationaryMs = 0;
    this.recoveryStage = 0;
  }
}

interface ResolvedNavigationPath {
  readonly target: WorldPosition;
  readonly path: PathWaypoint[];
  readonly rawPathLength: number;
}

function resolveNavigationPath(
  from: WorldPosition,
  requestedTarget: WorldPosition,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig,
): ResolvedNavigationPath {
  const blockers = [...snapshot.geometry.solids, ...snapshot.geometry.gaps];
  const candidates = navigationTargetCandidates(
    requestedTarget,
    snapshot,
    config,
  );
  let fallback: ResolvedNavigationPath | null = null;
  for (const target of candidates) {
    const rawPath = findPath(from, target, snapshot, config);
    const smoothed = smoothPath(
      from,
      rawPath,
      blockers,
      config.obstaclePadding,
    );
    const result = {
      target,
      path: smoothed,
      rawPathLength: rawPath.length,
    };
    fallback ??= result;
    if (pathRepresentsProgress(smoothed, from)) return result;
  }
  return fallback ?? {
    target: { ...requestedTarget },
    path: [{ position: { ...from } }],
    rawPathLength: 1,
  };
}

export function projectToNavigablePosition(
  from: WorldPosition,
  requestedTarget: WorldPosition,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig = V2_BOT_NAVIGATION_CONFIG,
): WorldPosition {
  return resolveNavigationPath(from, requestedTarget, snapshot, config).target;
}

export function navigationPathExists(
  from: WorldPosition,
  target: WorldPosition,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig = V2_BOT_NAVIGATION_CONFIG,
): boolean {
  const rawPath = findPath(from, target, snapshot, config);
  return pathRepresentsProgress(rawPath, from) ||
    distance(from, target) <= config.waypointReachDistance;
}

export function navigationJumpLinkHasApproach(
  jumpLink: WorldJumpLink,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig = V2_BOT_NAVIGATION_CONFIG,
): boolean {
  const bounds = snapshot.geometry.bounds;
  const cols = Math.max(
    1,
    Math.ceil((bounds.maxX - bounds.minX) / config.cellSize),
  );
  const rows = Math.max(
    1,
    Math.ceil((bounds.maxY - bounds.minY) / config.cellSize),
  );
  const blockers = [
    ...snapshot.geometry.solids,
    ...snapshot.geometry.gaps,
  ];
  const maximumApproachDistance =
    jumpLink.activationRadius + config.cellSize * .75;
  const minimum = cellFor({
    x: jumpLink.from.x - maximumApproachDistance,
    y: jumpLink.from.y - maximumApproachDistance,
  }, bounds.minX, bounds.minY, config.cellSize);
  const maximum = cellFor({
    x: jumpLink.from.x + maximumApproachDistance,
    y: jumpLink.from.y + maximumApproachDistance,
  }, bounds.minX, bounds.minY, config.cellSize);
  for (
    let cellY = minimum.y;
    cellY <= Math.min(rows - 1, maximum.y);
    cellY++
  ) {
    for (
      let cellX = minimum.x;
      cellX <= Math.min(cols - 1, maximum.x);
      cellX++
    ) {
      const center = centerFor(
        { x: cellX, y: cellY },
        bounds.minX,
        bounds.minY,
        config.cellSize,
      );
      if (
        !blocked(center, blockers, config.obstaclePadding) &&
        jumpLaunchReachableFrom(center, jumpLink, blockers, config)
      ) {
        return true;
      }
    }
  }
  return false;
}

function progressAlongSegment(
  position: WorldPosition,
  from: WorldPosition,
  to: WorldPosition,
): number {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= Number.EPSILON) return 0;
  const progress = (
    (position.x - from.x) * deltaX +
    (position.y - from.y) * deltaY
  ) / lengthSquared;
  return Math.max(0, Math.min(1, progress));
}

function jumpTraversalIsPlausible(
  position: WorldPosition,
  jumpLink: WorldJumpLink,
  waypointReachDistance: number,
): boolean {
  if (distance(position, jumpLink.to) <= waypointReachDistance) return false;
  const deltaX = jumpLink.to.x - jumpLink.from.x;
  const deltaY = jumpLink.to.y - jumpLink.from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= Number.EPSILON) return false;
  const relativeX = position.x - jumpLink.from.x;
  const relativeY = position.y - jumpLink.from.y;
  const progress = (
    relativeX * deltaX + relativeY * deltaY
  ) / lengthSquared;
  const perpendicularDistance = Math.abs(
    relativeX * deltaY - relativeY * deltaX
  ) / Math.sqrt(lengthSquared);
  return progress >= -.25 &&
    progress <= 1.25 &&
    perpendicularDistance <= Math.max(
      jumpLink.activationRadius,
      waypointReachDistance * 2,
    );
}

function findPath(
  from: WorldPosition,
  to: WorldPosition,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig,
): PathWaypoint[] {
  const bounds = snapshot.geometry.bounds;
  const cols = Math.max(
    1,
    Math.ceil((bounds.maxX - bounds.minX) / config.cellSize),
  );
  const rows = Math.max(
    1,
    Math.ceil((bounds.maxY - bounds.minY) / config.cellSize),
  );
  const start = cellFor(from, bounds.minX, bounds.minY, config.cellSize);
  const goal = cellFor(to, bounds.minX, bounds.minY, config.cellSize);
  const blockers = [
    ...snapshot.geometry.solids,
    ...snapshot.geometry.gaps,
  ];
  const startKey = key(start);
  const goalKey = key(goal);
  const open: OpenGridCell[] = [{
    cell: start,
    score: heuristic(start, goal),
  }];
  const cameFrom = new Map<string, PathEdge>();
  const costs = new Map<string, number>([[startKey, 0]]);
  const scores = new Map<string, number>([[
    startKey,
    heuristic(start, goal),
  ]]);

  while (open.length > 0) {
    const entry = popLowestScore(open)!;
    const current = entry.cell;
    if (entry.score > (scores.get(key(current)) ?? Infinity)) continue;
    if (key(current) === goalKey) {
      return appendExactDestination(
        reconstructPath(
          current,
          cameFrom,
          bounds.minX,
          bounds.minY,
          config.cellSize,
        ),
        from,
        to,
        blockers,
        config.obstaclePadding,
      );
    }
    for (const candidate of navigationEdges(
      current,
      cols,
      rows,
      snapshot.navigation.jumpLinks,
      blockers,
      bounds.minX,
      bounds.minY,
      config,
    )) {
      const neighbor = candidate.cell;
      if (
        !candidate.jumpLink &&
        (
          (
            key(neighbor) !== goalKey &&
            blocked(
              centerFor(neighbor, bounds.minX, bounds.minY, config.cellSize),
              blockers,
              config.obstaclePadding,
            )
          ) ||
          diagonalCutsCorner(
            current,
            neighbor,
            blockers,
            bounds.minX,
            bounds.minY,
            config,
          )
        )
      ) {
        continue;
      }
      const tentative = (costs.get(key(current)) ?? Infinity) +
        (candidate.jumpLink
          ? distance(candidate.jumpLink.from, candidate.jumpLink.to) /
            config.cellSize
          : stepCost(current, neighbor));
      if (tentative >= (costs.get(key(neighbor)) ?? Infinity)) continue;
      cameFrom.set(key(neighbor), {
        from: current,
        jumpLink: candidate.jumpLink,
      });
      costs.set(key(neighbor), tentative);
      const score = tentative + heuristic(neighbor, goal);
      scores.set(key(neighbor), score);
      pushByScore(open, { cell: neighbor, score });
    }
  }
  return [{ position: from }];
}

function appendExactDestination(
  path: readonly PathWaypoint[],
  from: WorldPosition,
  target: WorldPosition,
  blockers: readonly WorldRect[],
  padding: number,
): PathWaypoint[] {
  const result = path.map(cloneWaypoint);
  const anchor = result.at(-1)?.position ?? from;
  if (
    distance(anchor, target) > 1 &&
    !blocked(target, blockers, padding) &&
    segmentClear(anchor, target, blockers, padding)
  ) {
    result.push({ position: { ...target } });
  }
  return result;
}

function pushByScore(
  heap: OpenGridCell[],
  entry: OpenGridCell,
): void {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareOpenCells(heap[parent]!, entry) <= 0) break;
    heap[index] = heap[parent]!;
    index = parent;
  }
  heap[index] = entry;
}

function popLowestScore(
  heap: OpenGridCell[],
): OpenGridCell | undefined {
  const first = heap[0];
  const last = heap.pop();
  if (!first || !last || heap.length === 0) return first;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    if (left >= heap.length) break;
    const child = right < heap.length &&
        compareOpenCells(heap[right]!, heap[left]!) < 0
      ? right
      : left;
    if (compareOpenCells(last, heap[child]!) <= 0) break;
    heap[index] = heap[child]!;
    index = child;
  }
  heap[index] = last;
  return first;
}

function compareOpenCells(
  left: OpenGridCell,
  right: OpenGridCell,
): number {
  return left.score - right.score ||
    left.cell.y - right.cell.y ||
    left.cell.x - right.cell.x;
}

function navigationTargetCandidates(
  requestedTarget: WorldPosition,
  snapshot: NavigationSnapshot,
  config: BotNavigationConfig,
): WorldPosition[] {
  const blockers = [...snapshot.geometry.solids, ...snapshot.geometry.gaps];
  const bounds = snapshot.geometry.bounds;
  const result: WorldPosition[] = [];
  const append = (candidate: WorldPosition): void => {
    const clamped = {
      x: Math.max(bounds.minX + config.obstaclePadding, Math.min(
        bounds.maxX - config.obstaclePadding,
        candidate.x,
      )),
      y: Math.max(bounds.minY + config.obstaclePadding, Math.min(
        bounds.maxY - config.obstaclePadding,
        candidate.y,
      )),
    };
    if (
      !blocked(clamped, blockers, config.obstaclePadding) &&
      !result.some((existing) => distance(existing, clamped) < 4)
    ) {
      result.push(clamped);
    }
  };
  append(requestedTarget);
  const maximumRadius = config.projectionRadius ?? 280;
  const directions = 16;
  for (
    let radius = Math.max(16, config.cellSize * .5);
    radius <= maximumRadius;
    radius += Math.max(16, config.cellSize * .5)
  ) {
    for (let index = 0; index < directions; index += 1) {
      const angle = index / directions * Math.PI * 2;
      append({
        x: requestedTarget.x + Math.cos(angle) * radius,
        y: requestedTarget.y + Math.sin(angle) * radius,
      });
    }
  }
  return result.length > 0 ? result : [{ ...requestedTarget }];
}

function smoothPath(
  from: WorldPosition,
  path: readonly PathWaypoint[],
  blockers: readonly WorldRect[],
  padding: number,
): PathWaypoint[] {
  if (path.length <= 2) return path.map(cloneWaypoint);
  const result: PathWaypoint[] = [];
  let anchor = { ...from };
  let index = 0;
  while (index < path.length) {
    const immediate = path[index]!;
    if (immediate.jumpLink) {
      result.push(cloneWaypoint(immediate));
      anchor = { ...immediate.position };
      index += 1;
      continue;
    }
    let furthest = index;
    for (let candidate = index + 1; candidate < path.length; candidate += 1) {
      if (
        path.slice(index, candidate + 1).some((waypoint) => waypoint.jumpLink) ||
        !segmentClear(anchor, path[candidate]!.position, blockers, padding)
      ) {
        break;
      }
      furthest = candidate;
    }
    const selected = path[furthest]!;
    result.push(cloneWaypoint(selected));
    anchor = { ...selected.position };
    index = furthest + 1;
  }
  return result;
}

function cloneWaypoint(waypoint: PathWaypoint): PathWaypoint {
  return {
    position: { ...waypoint.position },
    jumpLink: waypoint.jumpLink,
  };
}

function segmentClear(
  from: WorldPosition,
  to: WorldPosition,
  blockers: readonly WorldRect[],
  padding: number,
): boolean {
  return !blockers.some((rect) =>
    lineIntersectsRect(from, to, {
      ...rect,
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  );
}

function pathRepresentsProgress(
  path: readonly PathWaypoint[],
  from: WorldPosition,
): boolean {
  return path.length > 0 &&
    path.some((waypoint) => distance(waypoint.position, from) > 1);
}

function recoveryStageFor(
  stationaryMs: number,
  config: BotNavigationConfig,
): 0 | 1 | 2 | 3 {
  if (stationaryMs >= (config.stuckEscapeMs ?? 1_800)) return 3;
  if (stationaryMs >= (config.stuckSkipWaypointMs ?? 1_100)) return 2;
  if (stationaryMs >= (config.stuckRepathMs ?? 650)) return 1;
  return 0;
}

function recoveryEscapeDirection(
  from: WorldPosition,
  desired: WorldPosition,
  snapshot: NavigationSnapshot,
  targetKey: string,
  padding: number,
): WorldPosition {
  const blockers = [...snapshot.geometry.solids, ...snapshot.geometry.gaps];
  const forward = normalizedDirection(from, desired);
  const handedness = deterministicSign(targetKey);
  const axes = [
    { x: -forward.y * handedness, y: forward.x * handedness },
    { x: forward.y * handedness, y: -forward.x * handedness },
    { x: -forward.x, y: -forward.y },
    forward,
  ];
  for (const axis of axes) {
    const candidate = {
      x: from.x + axis.x * 64,
      y: from.y + axis.y * 64,
    };
    if (!blocked(candidate, blockers, padding)) return axis;
  }
  return forward;
}

function deterministicSign(value: string): 1 | -1 {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return (hash & 1) === 0 ? 1 : -1;
}

function nextRepathInterval(
  config: BotNavigationConfig,
  targetKey: string,
  startCell: GridCell,
): number {
  const maximumJitter = Math.max(0, config.repathJitterMs ?? 0);
  if (maximumJitter <= 0) return config.repathIntervalMs;
  let hash = 2166136261;
  const value = `${targetKey}:${startCell.x}:${startCell.y}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return config.repathIntervalMs + (hash >>> 0) % (maximumJitter + 1);
}

function diagonalCutsCorner(
  current: GridCell,
  neighbor: GridCell,
  blockers: readonly WorldRect[],
  minX: number,
  minY: number,
  config: BotNavigationConfig,
): boolean {
  if (current.x === neighbor.x || current.y === neighbor.y) return false;
  return [
    { x: neighbor.x, y: current.y },
    { x: current.x, y: neighbor.y },
  ].some((cell) =>
    blocked(
      centerFor(cell, minX, minY, config.cellSize),
      blockers,
      config.obstaclePadding,
    )
  );
}

function lineIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: WorldRect,
): boolean {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  let near = 0;
  let far = 1;
  for (const [origin, direction, minimum, maximum] of [
    [from.x, deltaX, rect.x, rect.x + rect.width],
    [from.y, deltaY, rect.y, rect.y + rect.height],
  ] as const) {
    if (Math.abs(direction) < .0001) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const first = (minimum - origin) / direction;
    const second = (maximum - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return far >= 0 && near <= 1;
}

function navigationEdges(
  cell: GridCell,
  cols: number,
  rows: number,
  jumpLinks: readonly WorldJumpLink[],
  blockers: readonly WorldRect[],
  minX: number,
  minY: number,
  config: BotNavigationConfig,
): { readonly cell: GridCell; readonly jumpLink?: WorldJumpLink }[] {
  const result: {
    readonly cell: GridCell;
    readonly jumpLink?: WorldJumpLink;
  }[] = neighbors(cell, cols, rows).map((neighbor) => ({
    cell: neighbor,
  }));
  const center = centerFor(cell, minX, minY, config.cellSize);
  for (const jumpLink of jumpLinks) {
    if (!jumpLaunchReachableFrom(center, jumpLink, blockers, config)) continue;
    result.push({
      cell: cellFor(jumpLink.to, minX, minY, config.cellSize),
      jumpLink,
    });
  }
  return result;
}

function jumpLaunchReachableFrom(
  from: WorldPosition,
  jumpLink: WorldJumpLink,
  blockers: readonly WorldRect[],
  config: BotNavigationConfig,
): boolean {
  const approachDistance = distance(from, jumpLink.from);
  if (approachDistance <= jumpLink.activationRadius) return true;
  return approachDistance <=
      jumpLink.activationRadius + config.cellSize * .75 &&
    segmentClear(
      from,
      jumpLink.from,
      blockers,
      Math.max(4, config.obstaclePadding - 2),
    );
}

function reconstructPath(
  goal: GridCell,
  cameFrom: Map<string, PathEdge>,
  minX: number,
  minY: number,
  cellSize: number,
): PathWaypoint[] {
  const reversed: PathWaypoint[] = [];
  let current = goal;
  while (cameFrom.has(key(current))) {
    const edge = cameFrom.get(key(current))!;
    if (edge.jumpLink) {
      reversed.push({
        position: { ...edge.jumpLink.to },
        jumpLink: edge.jumpLink,
      });
      reversed.push({
        position: { ...edge.jumpLink.from },
      });
    } else {
      reversed.push({
        position: centerFor(current, minX, minY, cellSize),
      });
    }
    current = edge.from;
  }
  return reversed.reverse();
}

function neighbors(
  cell: GridCell,
  cols: number,
  rows: number,
): GridCell[] {
  const result: GridCell[] = [];
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      if (x === 0 && y === 0) continue;
      const next = { x: cell.x + x, y: cell.y + y };
      if (next.x >= 0 && next.y >= 0 && next.x < cols && next.y < rows) {
        result.push(next);
      }
    }
  }
  return result;
}

function blocked(
  point: WorldPosition,
  blockers: readonly WorldRect[],
  padding: number,
): boolean {
  return blockers.some((rect) =>
    point.x > rect.x - padding &&
    point.x < rect.x + rect.width + padding &&
    point.y > rect.y - padding &&
    point.y < rect.y + rect.height + padding
  );
}

function cellFor(
  point: WorldPosition,
  minX: number,
  minY: number,
  cellSize: number,
): GridCell {
  return {
    x: Math.max(0, Math.floor((point.x - minX) / cellSize)),
    y: Math.max(0, Math.floor((point.y - minY) / cellSize)),
  };
}

function centerFor(
  cell: GridCell,
  minX: number,
  minY: number,
  cellSize: number,
): WorldPosition {
  return {
    x: minX + cell.x * cellSize + cellSize / 2,
    y: minY + cell.y * cellSize + cellSize / 2,
  };
}

function normalizedDirection(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > .0001 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
}

function distance(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function positionsMatch(
  left: WorldPosition | undefined,
  right: WorldPosition,
): boolean {
  return !!left &&
    Math.abs(left.x - right.x) < .001 &&
    Math.abs(left.y - right.y) < .001;
}

function heuristic(a: GridCell, b: GridCell): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function stepCost(a: GridCell, b: GridCell): number {
  return a.x !== b.x && a.y !== b.y ? Math.SQRT2 : 1;
}

function key(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}
