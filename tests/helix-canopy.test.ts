import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  getWorldMap,
  hasWorldMapLineOfSight,
  HELIX_CANOPY_V2,
  measureWorldMapClearance,
  measureWorldRouteLength,
  sampleWorldMapClearance,
  validateWorldMapForMode,
  validateWorldMapQuality,
  WORLD_MAP_ACTOR_RADIUS,
} from "../src/core";

const MAP_SCALE = 1.15;
const scale = (value: number) => Math.round(value * MAP_SCALE);
const point = (x: number, y: number) => ({ x: scale(x), y: scale(y) });

test("Helix Canopy registers its rebuilt gameplay contract", () => {
  const map = getWorldMap("helix-canopy-v2");
  assert.equal(map, HELIX_CANOPY_V2);
  assert.equal(map?.displayName, "Helix Canopy");
  assert.deepEqual(map?.geometry.bounds, {
    minX: 0,
    minY: 0,
    maxX: 2208,
    maxY: 1104,
  });
  assert.equal(map?.geometry.solids.length, 24);
  assert.equal(map?.geometry.gaps.length, 0);
  assert.equal(map?.navigation.jumpLinks.length, 4);
  assert.equal(map?.spawnPoints.length, 8);
  assert.equal(map?.pickupSpawns.length, 11);
  assert.equal(map?.presentation.theme, "helix-canopy");
});

test("Helix Canopy supports every mode while prioritizing smaller teams", () => {
  for (const mode of [
    "team-deathmatch",
    "classic-ctf",
    "one-flag",
  ] as const) {
    for (const teamSize of [1, 2, 3, 4] as const) {
      assert.deepEqual(
        validateWorldMapForMode(HELIX_CANOPY_V2, mode, teamSize),
        [],
      );
    }
  }
});

test("Helix Canopy passes structural and objective safety gates", () => {
  const issues = validateWorldMapQuality(HELIX_CANOPY_V2, {
    clearPoints: [{
      id: "neutral-helix-core",
      position: point(960, 480),
      minimumClearance: 105,
    }],
    blockedSightLines: [
      {
        id: "spawn-to-spawn",
        from: point(280, 480),
        to: point(1640, 480),
      },
      {
        id: "blue-spawn-to-objective",
        from: point(280, 480),
        to: point(960, 480),
      },
      {
        id: "red-spawn-to-objective",
        from: point(1640, 480),
        to: point(960, 480),
      },
    ],
  });
  assert.deepEqual(issues, []);
});

test("Helix Canopy retains distinct direct, canopy, and root route roles", () => {
  const direct = measureWorldRouteLength([
    point(280, 480), point(450, 370),
    point(730, 360), point(850, 440),
    point(960, 480),
  ]);
  const canopy = measureWorldRouteLength([
    point(280, 480), point(400, 260),
    point(660, 170), point(960, 175),
    point(960, 480),
  ]);
  const root = measureWorldRouteLength([
    point(280, 480), point(400, 690),
    point(675, 765), point(870, 720),
    point(960, 480),
  ]);

  assert.ok(canopy > direct * 1.08 && canopy < direct * 1.55);
  assert.ok(root > direct * 1.08 && root < direct * 1.55);
});

test("Helix Canopy pickup economy is mirrored and keeps rockets off the core", () => {
  const map = HELIX_CANOPY_V2;
  const worldWidth = map.geometry.bounds.maxX;
  for (const pickup of map.pickupSpawns) {
    const mirror = map.pickupSpawns.find((candidate) =>
      candidate.type === pickup.type &&
      candidate.position.x === worldWidth - pickup.position.x &&
      candidate.position.y === pickup.position.y
    );
    assert.ok(mirror, `${pickup.id} needs a same-type mirrored pickup.`);
  }
  for (const rocket of map.pickupSpawns.filter((pickup) =>
    pickup.type === "rocket"
  )) {
    assert.equal(
      hasWorldMapLineOfSight(map, rocket.position, point(960, 480)),
      false,
      `${rocket.id} must not have a direct One Flag spam line.`,
    );
  }
});

test("Helix Canopy collision is traced from the integrated master art", () => {
  const visuals = HELIX_CANOPY_V2.presentation.walls.map((wall) => wall.visual);
  assert.equal(visuals.length, HELIX_CANOPY_V2.geometry.solids.length);
  assert.ok(visuals.every((visual) => visual === "helix-integrated-cover"));
  assert.deepEqual(HELIX_CANOPY_V2.presentation.gaps, []);
  assert.deepEqual(HELIX_CANOPY_V2.presentation.decorations, undefined);
});

test("Helix Canopy exposes actor-accurate collision diagnostics", () => {
  const center = measureWorldMapClearance(
    HELIX_CANOPY_V2,
    point(960, 480),
  );
  assert.ok(center.clearance >= 105);

  const samples = sampleWorldMapClearance(HELIX_CANOPY_V2, {
    step: 22,
    actorRadius: WORLD_MAP_ACTOR_RADIUS,
  });
  assert.ok(samples.some((sample) => sample.band === "blocked"));
  assert.ok(samples.some((sample) => sample.band === "tight"));
  assert.ok(samples.some((sample) => sample.band === "open"));

  const scene = readFileSync(
    resolve("src/adapters/phaser/scenes/GameplayV2Scene.ts"),
    "utf8",
  );
  assert.match(scene, /search\.get\("collisionDebug"\) === "1"/);
  assert.match(scene, /search\.get\("clearanceHeatmap"\) === "1"/);
});

test("Helix Canopy collision and authored bot routes remain mirrored and clear", () => {
  const map = HELIX_CANOPY_V2;
  const worldWidth = map.geometry.bounds.maxX;
  for (const solid of map.geometry.solids) {
    const mirror = map.geometry.solids.find((candidate) =>
      candidate.x === worldWidth - solid.x - solid.width &&
      candidate.y === solid.y &&
      candidate.width === solid.width &&
      candidate.height === solid.height
    );
    assert.ok(mirror, `${solid.id} needs mirrored collision geometry.`);
  }
  for (const [routeId, route] of Object.entries(map.presentation.botRoutes)) {
    for (const [index, routePoint] of route.entries()) {
      const clearance = measureWorldMapClearance(map, routePoint);
      assert.ok(
        clearance.clearance >= WORLD_MAP_ACTOR_RADIUS,
        `${routeId} route point ${index} is blocked by ${clearance.obstacleId}.`,
      );
    }
  }
});

test("Helix Canopy ships the approved undistorted arena master", () => {
  const png = readFileSync(resolve("public/assets/helix-canopy/arena-master.png"));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1647);
  assert.equal(png.readUInt32BE(20), 955);
  assert.equal(png[25], 2);
  const renderer = readFileSync(resolve("src/arenaRenderer.ts"), "utf8");
  assert.match(renderer, /level\.height \* \(1647 \/ 955\)/);
  assert.doesNotMatch(renderer, /helixFloorCanopy/);
  assert.doesNotMatch(renderer, /helixCoreInlay/);
});

test("Quick Play exposes Helix Canopy", () => {
  const html = readFileSync(resolve("index.html"), "utf8");
  assert.match(html, /<option value="helix-canopy-v2">Helix Canopy<\/option>/);
});
