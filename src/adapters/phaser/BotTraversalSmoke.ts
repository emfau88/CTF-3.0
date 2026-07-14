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
const BOT_APPROACH_DISTANCE = 96;

export interface BotTraversalSmokeSetup {
  readonly mapId: string;
  readonly mapName: string;
  readonly botActorId: string;
  readonly cameraActorId: string;
  readonly jumpLink: WorldJumpLink;
}

export function createBotTraversalSmokeSetup(
  map: WorldMapData,
): BotTraversalSmokeSetup | null {
  const jumpLink = map.navigation.jumpLinks[0];
  if (!jumpLink) return null;
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
        setup.jumpLink.from,
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
        setup.jumpLink.to,
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
    const navigation = this.navigator.navigate(
      actor.position,
      this.setup.jumpLink.to,
      `traversal-smoke:${this.setup.jumpLink.id}`,
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
    const shouldHoldAuthoredJump = navigation.jump ||
      (this.jumpHeld && actor.jump.active);
    if (shouldHoldAuthoredJump) {
      if (
        !this.jumpHeld &&
        actor.jump.grounded &&
        actor.jump.cooldownRemainingMs <= 0
      ) {
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
    } else if (this.jumpHeld) {
      actions.push({
        action: "jump",
        phase: "released",
        actorId: actor.id,
      });
      this.jumpHeld = false;
    }
    return actions;
  }

  reset(): void {
    this.jumpHeld = false;
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
