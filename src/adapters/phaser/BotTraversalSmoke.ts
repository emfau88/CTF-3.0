import {
  GridBotNavigator,
  V2_GROUND_PARITY_CONFIG,
  type BotActionSource,
  type BotNavigator,
  type CoreActionIntent,
  type WorldJumpLink,
  type WorldMapData,
  type WorldPosition,
  type WorldSnapshot,
  type WorldState,
} from "../../core";

const CAMERA_TARGET_OFFSET = 96;
const BOT_APPROACH_DISTANCE = 20;
const MAX_GAP_LAUNCH_DISTANCE = 8;
const MAX_WALL_LAUNCH_DISTANCE = 18;
const GAP_EDGE_CLEARANCE = 24;

export interface BotTraversalSmokeSetup {
  readonly mapId: string;
  readonly mapName: string;
  readonly botActorId: string;
  readonly cameraActorId: string;
  readonly jumpLink: WorldJumpLink;
  readonly launchPosition: WorldPosition;
  readonly landingPosition: WorldPosition;
}

export function createBotTraversalSmokeSetup(
  map: WorldMapData,
  jumpLinkId?: string,
): BotTraversalSmokeSetup | null {
  const jumpLink = jumpLinkId
    ? map.navigation.jumpLinks.find((link) => link.id === jumpLinkId)
    : map.navigation.jumpLinks[0];
  if (!jumpLink) return null;
  const traversalPositions = resolveTraversalPositions(
    jumpLink,
    map.geometry.gaps,
  );
  return {
    mapId: map.id,
    mapName: map.displayName,
    botActorId: "red-player",
    cameraActorId: "blue-player",
    jumpLink: {
      ...jumpLink,
      from: { ...jumpLink.from },
      to: { ...jumpLink.to },
    },
    ...traversalPositions,
  };
}

export function configureBotTraversalSmokeWorld(
  world: WorldState,
  setup: BotTraversalSmokeSetup,
): WorldState {
  const bot = world.actors.find((actor) => actor.id === setup.botActorId);
  const cameraActor = world.actors.find((actor) =>
    actor.id === setup.cameraActorId
  );
  if (!bot || !cameraActor) {
    throw new Error(
      `Traversal smoke requires ${setup.botActorId} and ${setup.cameraActorId}.`,
    );
  }

  const direction = normalizedDirection(
    setup.jumpLink.from,
    setup.jumpLink.to,
  );
  positionActor(
    bot,
    clampToBounds(
      offsetPosition(
        setup.launchPosition,
        direction,
        -BOT_APPROACH_DISTANCE,
      ),
      world,
    ),
    direction,
    V2_GROUND_PARITY_CONFIG.maxSpeed,
  );
  positionActor(
    cameraActor,
    clampToBounds(
      offsetPosition(
        setup.landingPosition,
        direction,
        CAMERA_TARGET_OFFSET,
      ),
      world,
    ),
    { x: -direction.x, y: -direction.y },
  );
  world.pickups = [];
  world.projectiles = [];
  return world;
}

export class BotTraversalSmokeController implements BotActionSource {
  private jumpHeld = false;
  private traversalStarted = false;
  private completed = false;

  constructor(
    readonly setup: BotTraversalSmokeSetup,
    readonly navigator: BotNavigator = new GridBotNavigator(),
  ) {}

  readActions(
    snapshot: WorldSnapshot,
    deltaMs: number,
  ): readonly CoreActionIntent[] {
    const actor = snapshot.actors.find((candidate) =>
      candidate.id === this.setup.botActorId
    );
    if (
      !actor ||
      actor.lifeState !== "active" ||
      snapshot.match?.phase === "ended"
    ) {
      this.jumpHeld = false;
      return [this.stopIntent()];
    }
    if (this.completed) {
      return [this.stopIntent()];
    }
    if (this.traversalStarted && this.jumpHeld && !actor.jump.active) {
      this.jumpHeld = false;
      this.completed = true;
      return [this.stopIntent(), {
        action: "jump",
        phase: "released",
        actorId: actor.id,
      }];
    }
    const distanceToLaunch = distance(
      actor.position,
      this.setup.launchPosition,
    );
    const maximumLaunchDistance = snapshot.geometry.gaps.some((gap) =>
        segmentIntersectsRect(
          this.setup.jumpLink.from,
          this.setup.jumpLink.to,
          gap,
        )
      )
      ? MAX_GAP_LAUNCH_DISTANCE
      : MAX_WALL_LAUNCH_DISTANCE;
    const committed = this.traversalStarted ||
      distanceToLaunch <= Math.min(
        this.setup.jumpLink.activationRadius,
        maximumLaunchDistance,
      );
    if (committed) {
      this.traversalStarted = true;
      const actions: CoreActionIntent[] = [{
        action: "move",
        phase: "held",
        actorId: actor.id,
        direction: normalizedDirection(
          actor.position,
          this.setup.landingPosition,
        ),
        magnitude: 1,
      }];
      if (!this.jumpHeld) {
        actions.push({
          action: "jump",
          phase: "pressed",
          actorId: actor.id,
        });
      }
      actions.push({
        action: "jump",
        phase: "held",
        actorId: actor.id,
      });
      this.jumpHeld = true;
      return actions;
    }
    const closeToLaunch = distanceToLaunch <=
      this.setup.jumpLink.activationRadius + BOT_APPROACH_DISTANCE;
    const navigation = closeToLaunch
      ? {
        direction: normalizedDirection(
          actor.position,
          this.setup.launchPosition,
        ),
      }
      : this.navigator.navigate(
        actor.position,
        this.setup.launchPosition,
        `traversal-smoke-approach:${this.setup.jumpLink.id}`,
        snapshot,
        deltaMs,
      );
    const actions: CoreActionIntent[] = [{
      action: "move",
      phase: "held",
      actorId: actor.id,
      direction: navigation.direction,
      magnitude: 1,
    }];
    return actions;
  }

  reset(): void {
    this.jumpHeld = false;
    this.traversalStarted = false;
    this.completed = false;
    this.navigator.reset();
  }

  private stopIntent(): CoreActionIntent {
    return {
      action: "move",
      phase: "held",
      actorId: this.setup.botActorId,
      direction: { x: 0, y: 0 },
      magnitude: 0,
    };
  }
}

function resolveTraversalPositions(
  jumpLink: WorldJumpLink,
  gaps: WorldMapData["geometry"]["gaps"],
): Pick<BotTraversalSmokeSetup, "launchPosition" | "landingPosition"> {
  const direction = normalizedDirection(jumpLink.from, jumpLink.to);
  let launchDistance = 0;
  let landingDistance = distance(jumpLink.from, jumpLink.to);
  let hasGapBounds = false;

  for (const gap of gaps) {
    if (!segmentIntersectsRect(jumpLink.from, jumpLink.to, gap)) continue;
    const projections = [
      { x: gap.x, y: gap.y },
      { x: gap.x + gap.width, y: gap.y },
      { x: gap.x, y: gap.y + gap.height },
      { x: gap.x + gap.width, y: gap.y + gap.height },
    ].map((corner) =>
      (corner.x - jumpLink.from.x) * direction.x +
      (corner.y - jumpLink.from.y) * direction.y
    );
    const gapLaunchDistance = Math.min(...projections) - GAP_EDGE_CLEARANCE;
    const gapLandingDistance = Math.max(...projections) + GAP_EDGE_CLEARANCE;
    if (!hasGapBounds) {
      launchDistance = gapLaunchDistance;
      landingDistance = gapLandingDistance;
      hasGapBounds = true;
    } else {
      launchDistance = Math.min(launchDistance, gapLaunchDistance);
      landingDistance = Math.max(landingDistance, gapLandingDistance);
    }
  }

  return {
    launchPosition: offsetPosition(
      jumpLink.from,
      direction,
      launchDistance,
    ),
    landingPosition: offsetPosition(
      jumpLink.from,
      direction,
      landingDistance,
    ),
  };
}

function positionActor(
  actor: WorldState["actors"][number],
  position: WorldPosition,
  facing: WorldPosition,
  speed = 0,
): void {
  actor.position = { ...position };
  actor.spawnPosition = { ...position };
  actor.lastSafePosition = { ...position };
  actor.velocity = { x: facing.x * speed, y: facing.y * speed };
  actor.facing = { ...facing };
  actor.lastMoveDirection = { ...facing };
  actor.jump = {
    active: false,
    held: false,
    grounded: true,
    phase: "ready",
    elapsedMs: 0,
    plannedDurationMs: actor.jump.plannedDurationMs,
    cooldownRemainingMs: 0,
    height: 0,
  };
  actor.overGap = false;
  actor.lifeState = "active";
  actor.respawn = null;
}

function normalizedDirection(
  from: WorldPosition,
  to: WorldPosition,
): WorldPosition {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  if (length <= Number.EPSILON) return { x: 1, y: 0 };
  return { x: deltaX / length, y: deltaY / length };
}

function distance(
  from: WorldPosition,
  to: WorldPosition,
): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function segmentIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  let entry = 0;
  let exit = 1;
  for (const [start, delta, min, max] of [
    [from.x, deltaX, rect.x, rect.x + rect.width],
    [from.y, deltaY, rect.y, rect.y + rect.height],
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

function offsetPosition(
  position: WorldPosition,
  direction: WorldPosition,
  distance: number,
): WorldPosition {
  return {
    x: position.x + direction.x * distance,
    y: position.y + direction.y * distance,
  };
}

function clampToBounds(
  position: WorldPosition,
  world: WorldState,
): WorldPosition {
  const bounds = world.geometry.bounds;
  return {
    x: Math.max(bounds.minX + 20, Math.min(bounds.maxX - 20, position.x)),
    y: Math.max(bounds.minY + 20, Math.min(bounds.maxY - 20, position.y)),
  };
}
