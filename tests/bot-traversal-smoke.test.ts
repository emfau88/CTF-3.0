import assert from "node:assert/strict";
import test from "node:test";
import {
  createTeamDeathmatchWorldState,
  GameplayCoreRuntime,
  GridBotNavigator,
  TeamDeathmatchMode,
  WORLD_MAPS,
} from "../src/core";
import {
  BotTraversalSmokeController,
  configureBotTraversalSmokeWorld,
  createBotTraversalSmokeSetup,
} from "../src/adapters/phaser/BotTraversalSmoke";

test("diagnostic traversal smoke lands every authored jump on every map", () => {
  for (const map of WORLD_MAPS) {
    assert.ok(
      map.navigation.jumpLinks.length > 0,
      `${map.displayName} must provide an authored jump link.`,
    );
    for (const jumpLink of map.navigation.jumpLinks) {
      runTraversalSmoke(map, jumpLink.id);
    }
  }
});

function runTraversalSmoke(
  map: (typeof WORLD_MAPS)[number],
  jumpLinkId: string,
): void {
    const setup = createBotTraversalSmokeSetup(map, jumpLinkId);
    assert.ok(setup, `${map.displayName} must provide ${jumpLinkId}.`);
    const runtime = new GameplayCoreRuntime({
      mode: new TeamDeathmatchMode(),
      createWorld: () => configureBotTraversalSmokeWorld(
        createTeamDeathmatchWorldState(map, { teamSize: 1 }),
        setup,
      ),
      humanActorIds: [setup.cameraActorId],
      allowManualPrimaryFire: false,
    });
    runtime.initialize();
    const navigator = new GridBotNavigator();
    const controller = new BotTraversalSmokeController(setup, navigator);
    let jumped = false;
    let landed = false;
    let fell = false;
    let bestProgress = 0;
    let lastActorState = "not observed";
    let firstFallState = "not observed";

    const frameDeltaMs = 16;
    for (let sequence = 1; sequence <= 360; sequence += 1) {
      const before = runtime.snapshot;
      const previousBot = before.actors.find((actor) =>
        actor.id === setup.botActorId
      );
      const actions = controller.readActions(before, frameDeltaMs);
      assert.equal(
        actions.some((action) =>
          action.action === "primaryFire" ||
          action.action === "fireRocket" ||
          action.action === "fireRail" ||
          action.action === "fireWhip"
        ),
        false,
        "Traversal smoke must not introduce combat actions.",
      );
      const frame = runtime.advance({
        sequence,
        timeMs: sequence * frameDeltaMs,
        deltaMs: frameDeltaMs,
        actions,
      });
      jumped ||= frame.events.some((event) =>
        event.type === "actor.jumped" &&
        event.sourceActorId === setup.botActorId
      );
      const currentBot = frame.snapshot.actors.find((actor) =>
        actor.id === setup.botActorId
      );
      if (currentBot) {
        bestProgress = Math.max(
          bestProgress,
          progressAlongSegment(
            currentBot.position,
            setup.jumpLink.from,
            setup.jumpLink.to,
          ),
        );
      }
      lastActorState = JSON.stringify({
        position: currentBot?.position,
        lifeState: currentBot?.lifeState,
        overGap: currentBot?.overGap,
        jump: currentBot?.jump,
      });
      if (!fell && currentBot?.lifeState === "falling") {
        firstFallState = lastActorState;
      }
      fell ||= currentBot?.lifeState === "falling";
      landed ||= Boolean(
        previousBot?.jump.active &&
        !currentBot?.jump.active &&
        currentBot?.lifeState === "active" &&
        !currentBot.overGap,
      );
      if (jumped && landed && bestProgress >= .5) break;
    }

    assert.equal(setup.jumpLink.id, jumpLinkId);
    assert.ok(
      jumped,
      `${map.displayName} ${jumpLinkId} must start the authored jump.`,
    );
    assert.ok(
      landed,
      `${map.displayName} ${jumpLinkId} must land outside the gap; ${lastActorState}`,
    );
    assert.equal(
      fell,
      false,
      `${map.displayName} ${jumpLinkId} must not fall; first=${firstFallState}; last=${lastActorState}`,
    );
    assert.ok(
      bestProgress >= .5,
      `${map.displayName} ${jumpLinkId} must expose at least 50% link progress.`,
    );
}

function progressAlongSegment(
  position: { readonly x: number; readonly y: number },
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
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
