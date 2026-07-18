import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  FLOW_CIRCUIT_V2,
  getWorldMap,
  hasWorldMapLineOfSight,
  measureWorldMapClearance,
  measureWorldRouteLength,
  sampleWorldMapClearance,
  validateWorldMapForMode,
  validateWorldMapQuality,
  WORLD_MAP_ACTOR_RADIUS,
  WORLD_MAPS,
} from "../src/core";

const CENTER = { x: 1220, y: 523 } as const;
const MASTER_WIDTH = 1915;
const MASTER_HEIGHT = 821;
const MASTER_SCALE = 1046 / MASTER_HEIGHT;
const MASTER_OFFSET_X = (2440 - MASTER_WIDTH * MASTER_SCALE) / 2;

const masterRect = (
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  x: Math.round(MASTER_OFFSET_X + x * MASTER_SCALE),
  y: Math.round(y * MASTER_SCALE),
  width: Math.round(width * MASTER_SCALE),
  height: Math.round(height * MASTER_SCALE),
});

test("Foundry Circuit registers its premium rebuild contract", () => {
  const map = getWorldMap("flow-circuit-v2");
  assert.equal(map, FLOW_CIRCUIT_V2);
  assert.equal(map?.displayName, "Foundry Circuit");
  assert.deepEqual(map?.geometry.bounds, {
    minX: 0,
    minY: 0,
    maxX: 2440,
    maxY: 1046,
  });
  assert.equal(map?.geometry.solids.length, 20);
  assert.equal(map?.geometry.gaps.length, 2);
  assert.equal(map?.navigation.jumpLinks.length, 4);
  assert.equal(map?.spawnPoints.length, 8);
  assert.equal(map?.pickupSpawns.length, 11);
  assert.equal(map?.presentation.theme, "foundry-circuit");
  assert.deepEqual(
    WORLD_MAPS.slice(0, 3).map((candidate) => candidate.id),
    ["helix-canopy-v2", "drowned-sun-temple-v2", "flow-circuit-v2"],
  );
});

test("Foundry Circuit supports every arena mode from 1v1 through 4v4", () => {
  for (const mode of ["team-deathmatch", "classic-ctf", "one-flag"] as const) {
    for (const teamSize of [1, 2, 3, 4] as const) {
      assert.deepEqual(
        validateWorldMapForMode(FLOW_CIRCUIT_V2, mode, teamSize),
        [],
      );
    }
  }
});

test("Foundry Circuit passes structural and weapon-safety gates", () => {
  const issues = validateWorldMapQuality(FLOW_CIRCUIT_V2, {
    clearPoints: [
      { id: "forge-heart-objective", position: CENTER, minimumClearance: 120 },
      { id: "precision-west-walkaround", position: { x: 700, y: 260 }, minimumClearance: 32 },
      { id: "precision-east-walkaround", position: { x: 1740, y: 260 }, minimumClearance: 32 },
      { id: "coolant-west-bay", position: { x: 900, y: 750 }, minimumClearance: 32 },
      { id: "coolant-east-bay", position: { x: 1540, y: 750 }, minimumClearance: 32 },
    ],
    blockedSightLines: [
      { id: "spawn-to-spawn", from: { x: 190, y: 523 }, to: { x: 2250, y: 523 } },
      { id: "blue-spawn-to-objective", from: { x: 190, y: 523 }, to: CENTER },
      { id: "red-spawn-to-objective", from: { x: 2250, y: 523 }, to: CENTER },
      { id: "rail-to-objective", from: { x: 1220, y: 145 }, to: CENTER },
    ],
  });
  assert.deepEqual(issues, []);
});

test("Foundry routes preserve direct, precision and coolant roles", () => {
  const direct = measureWorldRouteLength([
    { x: 190, y: 523 }, { x: 360, y: 523 },
    { x: 650, y: 470 }, { x: 860, y: 430 },
    { x: 1030, y: 420 }, CENTER,
  ]);
  const precision = measureWorldRouteLength([
    { x: 190, y: 523 }, { x: 360, y: 280 },
    { x: 650, y: 150 }, { x: 920, y: 140 },
    { x: 1220, y: 145 }, { x: 1080, y: 245 },
    { x: 1030, y: 390 }, { x: 1060, y: 523 }, CENTER,
  ]);
  const coolant = measureWorldRouteLength([
    { x: 190, y: 523 }, { x: 360, y: 760 },
    { x: 660, y: 870 }, { x: 900, y: 880 },
    { x: 920, y: 750 }, { x: 1080, y: 750 },
    { x: 1060, y: 650 }, CENTER,
  ]);

  assert.ok(precision > direct * 1.12 && precision < direct * 1.75);
  assert.ok(coolant > direct * 1.15 && coolant < direct * 1.7);
});

test("Foundry ships one undistorted master for gameplay and Quick Play", () => {
  const master = readFileSync(
    resolve("public/assets/foundry-circuit/arena-master-v2.png"),
  );
  const overview = readFileSync(
    resolve("public/assets/map-previews/flow-circuit-v2-overview.png"),
  );
  for (const image of [master, overview]) {
    assert.equal(image.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(image.readUInt32BE(16), 1915);
    assert.equal(image.readUInt32BE(20), 821);
    assert.equal(image[25], 2);
  }
  assert.equal(master.equals(overview), true);
  const renderer = readFileSync(resolve("src/arenaRenderer.ts"), "utf8");
  assert.match(renderer, /level\.height \* \(1915 \/ 821\)/);
  const menu = readFileSync(resolve("src/v2Menu.ts"), "utf8");
  assert.match(menu, /flow-circuit-v2-overview\.png/);
});

test("Foundry actor collision follows the visible master-image cover bounds", () => {
  const visibleMasterBounds = [
    ["precision-outer-west", 377, 167, 115, 54],
    ["precision-inner-west", 734, 155, 112, 53],
    ["upper-exchange-west", 362, 303, 121, 57],
    ["lower-exchange-west", 362, 461, 121, 60],
    ["coolant-mid-west", 566, 551, 119, 56],
    ["coolant-outer-west", 360, 600, 119, 58],
    ["coolant-inner-west", 733, 600, 112, 54],
    ["forge-side-west", 720, 353, 53, 112],
    ["forge-north", 885, 250, 145, 51],
    ["forge-south", 885, 520, 145, 51],
  ] as const;

  for (const [id, x, y, width, height] of visibleMasterBounds) {
    const solid = FLOW_CIRCUIT_V2.geometry.solids.find((candidate) =>
      candidate.id === id
    );
    assert.ok(solid, `${id} must expose collision geometry.`);
    const expected = masterRect(x, y, width, height);
    const effective = {
      x: solid.x - WORLD_MAP_ACTOR_RADIUS,
      y: solid.y - WORLD_MAP_ACTOR_RADIUS,
      width: solid.width + WORLD_MAP_ACTOR_RADIUS * 2,
      height: solid.height + WORLD_MAP_ACTOR_RADIUS * 2,
    };
    for (const edge of ["x", "y", "width", "height"] as const) {
      assert.ok(
        Math.abs(effective[edge] - expected[edge]) <= 5,
        `${id} effective ${edge} differs from its visible master bound.`,
      );
    }
  }
});

test("Foundry maintenance gaps and jump links align with the visible pit openings", () => {
  const west = FLOW_CIRCUIT_V2.geometry.gaps.find((gap) =>
    gap.id === "maintenance-pit-west"
  );
  const east = FLOW_CIRCUIT_V2.geometry.gaps.find((gap) =>
    gap.id === "maintenance-pit-east"
  );
  assert.ok(west && east);
  assert.deepEqual(west, {
    id: "maintenance-pit-west",
    ...masterRect(584, 180, 78, 68),
  });
  assert.deepEqual(east, {
    ...west,
    id: "maintenance-pit-east",
    x: 2440 - west.x - west.width,
  });

  const westCenter = Math.round(west.x + west.width / 2);
  const eastCenter = 2440 - westCenter;
  for (const link of FLOW_CIRCUIT_V2.navigation.jumpLinks) {
    const expectedX = link.id.includes("west") ? westCenter : eastCenter;
    assert.equal(link.from.x, expectedX);
    assert.equal(link.to.x, expectedX);
    assert.ok(link.from.y < west.y || link.from.y > west.y + west.height);
    assert.ok(link.to.y < west.y || link.to.y > west.y + west.height);
  }
});

test("Foundry pickup economy is mirrored and keeps rockets off the core", () => {
  const map = FLOW_CIRCUIT_V2;
  for (const pickup of map.pickupSpawns) {
    const mirror = map.pickupSpawns.find((candidate) =>
      candidate.type === pickup.type &&
      candidate.position.x === 2440 - pickup.position.x &&
      candidate.position.y === pickup.position.y
    );
    assert.ok(mirror, `${pickup.id} needs a same-type mirrored pickup.`);
  }
  for (const rocket of map.pickupSpawns.filter((pickup) => pickup.type === "rocket")) {
    assert.equal(
      hasWorldMapLineOfSight(map, rocket.position, CENTER),
      false,
      `${rocket.id} must not have a direct Forge Heart spam line.`,
    );
  }
});

test("Foundry integrated collision and bot routes remain mirrored and clear", () => {
  const map = FLOW_CIRCUIT_V2;
  assert.ok(
    map.presentation.walls.every((wall) => wall.visual === "foundry-integrated-cover"),
  );
  assert.deepEqual(map.presentation.decorations, []);
  for (const solid of map.geometry.solids) {
    const mirror = map.geometry.solids.find((candidate) =>
      candidate.x === 2440 - solid.x - solid.width &&
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
  const samples = sampleWorldMapClearance(map, {
    step: 22,
    actorRadius: WORLD_MAP_ACTOR_RADIUS,
  });
  assert.ok(samples.some((sample) => sample.band === "blocked"));
  assert.ok(samples.some((sample) => sample.band === "tight"));
  assert.ok(samples.some((sample) => sample.band === "open"));
});
