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

test("diagnostic traversal smoke lands one authored jump on every map", () => {
  for (const map of WORLD_MAPS) {
    const setup = createBotTraversalSmokeSetup(map);
    assert.ok(setup, `${map.displayName} must provide an authored jump link.`);
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
    let observedLinkId: string | null = null;
    let bestProgress = 0;
    let lastActorState = "not observed";

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
      const debug = navigator.debugSnapshot();
      if (debug.jumpLinkId) {
        observedLinkId ??= debug.jumpLinkId;
        if (debug.jumpLinkId === setup.jumpLink.id) {
          bestProgress = Math.max(bestProgress, debug.jumpLinkProgress ?? 0);
        }
      }
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
      lastActorState = JSON.stringify({
        position: currentBot?.position,
        lifeState: currentBot?.lifeState,
        overGap: currentBot?.overGap,
        jump: currentBot?.jump,
      });
      fell ||= currentBot?.lifeState === "falling";
      landed ||= Boolean(
        previousBot?.jump.active &&
        !currentBot?.jump.active &&
        currentBot?.lifeState === "active" &&
        !currentBot.overGap,
      );
      if (jumped && landed && bestProgress >= .5) break;
    }

    assert.equal(
      observedLinkId,
      setup.jumpLink.id,
      `${map.displayName} must use the selected authored link.`,
    );
    assert.ok(jumped, `${map.displayName} must start the authored jump.`);
    assert.ok(
      landed,
      `${map.displayName} must land outside the gap; ${lastActorState}`,
    );
    assert.equal(fell, false, `${map.displayName} must not fall.`);
    assert.ok(
      bestProgress >= .5,
      `${map.displayName} must expose at least 50% link progress.`,
    );
  }
});
