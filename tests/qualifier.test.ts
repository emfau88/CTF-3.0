import assert from "node:assert/strict";
import test from "node:test";
import {
  HELIX_CANOPY_V2,
  type CoreInputFrame,
  type GameEvent,
} from "../src/core";
import {
  QUALIFIER_TDM_CONFIG,
  buildQualifierMatchSearch,
  createQualifierRepository,
  createQualifierWorld,
  detectQualifierTutorialActions,
  isQualifierMatch,
  readQualifierAttemptKind,
} from "../src/qualifier";
import { createQualifierGuide } from "../src/qualifierGuide";
import { setUiLanguage } from "../src/uiLocale";
import { readV2RouteState } from "../src/v2Route";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test("qualifier state survives reloads, abandon and qualified training", () => {
  const storage = memoryStorage();
  let time = 0;
  let id = 0;
  const repository = createQualifierRepository(storage, {
    now: () => `2026-08-28T12:00:${String(time++).padStart(2, "0")}.000Z`,
    createAttemptId: () => `attempt-${++id}`,
  });
  const first = repository.start("first-run");
  assert.equal(first.started, true);
  assert.equal(first.state.status, "in-progress");
  assert.equal(repository.start("first-run").started, false, "reload reuses active attempt");
  assert.equal(repository.recordAction("move").recorded, true);
  assert.equal(repository.recordAction("move").recorded, false);
  assert.deepEqual(repository.load().activeAttempt?.completedActions, ["move"]);

  const abandoned = repository.abandon("menu");
  assert.equal(abandoned.status, "not-started");
  assert.equal(abandoned.activeAttempt, null);
  assert.equal(abandoned.lastExitReason, "menu");

  const retry = repository.start("first-run");
  assert.equal(retry.state.attemptCount, 2);
  const qualified = repository.complete();
  assert.equal(qualified.status, "qualified");
  assert.ok(qualified.qualifiedAt);

  repository.start("training");
  const trainingExit = repository.abandon("restart");
  assert.equal(trainingExit.status, "qualified", "training cannot revoke qualification");
});

test("qualifier route is one fixed desktop 2v2 Helix TDM slice", () => {
  const search = new URLSearchParams(buildQualifierMatchSearch({
    skin: "alien-runner",
    sfx: "off",
  }));
  const route = readV2RouteState(search);
  assert.equal(isQualifierMatch(search), true);
  assert.equal(readQualifierAttemptKind(search), "first-run");
  assert.equal(route.canStartMatch, true);
  assert.equal(route.route.mode, "tdm");
  assert.equal(route.route.map, "helix-canopy-v2");
  assert.equal(route.route.controls, "keyboard");
  assert.equal(route.route.blueBots, 1);
  assert.equal(route.route.redBots, 2);
  assert.equal(route.route.teamSize, 2);
  assert.equal(search.get("entryPoint"), "qualifier");
  assert.equal(QUALIFIER_TDM_CONFIG.durationMs, 90_000);
});

test("qualifier world exposes Arc Lash plus one pickup weapon without changing Helix", () => {
  const world = createQualifierWorld(HELIX_CANOPY_V2, { blue: 2, red: 2 });
  assert.equal(world.actors.length, 4);
  assert.deepEqual(world.map?.weaponRoster, ["whip", "pulse"]);
  assert.deepEqual(
    [...new Set(world.pickups
      .filter((pickup) => pickup.type !== "health" && pickup.type !== "armor")
      .map((pickup) => pickup.type))],
    ["pulse"],
  );
  assert.deepEqual(HELIX_CANOPY_V2.weaponRoster, ["whip", "rail", "pulse", "shard"]);
});

test("qualifier tutorial confirms real input and player pickup actions", () => {
  const frame: CoreInputFrame = {
    sequence: 1,
    timeMs: 10,
    deltaMs: 16,
    actions: [
      { action: "move", phase: "held", magnitude: 1 },
      { action: "fireWeapon", phase: "pressed", payload: { weaponId: "whip" } },
      { action: "jump", phase: "pressed" },
    ],
  };
  const events: GameEvent[] = [{
    id: "pickup",
    type: "pickup.collected",
    timeMs: 10,
    targetActorId: "blue-player",
    payload: { pickupType: "pulse" },
  }];
  assert.deepEqual(detectQualifierTutorialActions({
    frame,
    events,
    aimMoved: true,
  }), ["move", "aim", "arc-lash", "pickup", "jump"]);
});

test("qualifier guide renders action-confirmed hints in English and German", () => {
  document.body.innerHTML = '<aside id="v2-qualifier-guide" class="is-hidden"></aside>';
  setUiLanguage("en");
  const guide = createQualifierGuide(["move"]);
  const root = document.getElementById("v2-qualifier-guide")!;
  assert.match(root.textContent ?? "", /Aim/);
  assert.equal(root.querySelectorAll("li.is-complete").length, 1);
  setUiLanguage("de");
  assert.match(root.textContent ?? "", /Zielen/);
  guide.complete("aim");
  assert.equal(root.querySelectorAll("li.is-complete").length, 2);
  guide.dispose();
  assert.equal(root.classList.contains("is-hidden"), true);
});
