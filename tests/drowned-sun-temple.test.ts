import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DROWNED_SUN_TEMPLE_V2,
  getWorldMap,
  hasWorldMapLineOfSight,
  measureWorldMapClearance,
  measureWorldRouteLength,
  sampleWorldMapClearance,
  validateWorldMapForMode,
  validateWorldMapQuality,
  WORLD_MAP_ACTOR_RADIUS,
} from "../src/core";

test("Temple of the Drowned Sun registers its complete gameplay contract", () => {
  const map = getWorldMap("drowned-sun-temple-v2");
  assert.equal(map, DROWNED_SUN_TEMPLE_V2);
  assert.equal(map?.displayName, "Temple of the Drowned Sun");
  assert.deepEqual(map?.geometry.bounds, {
    minX: 0,
    minY: 0,
    maxX: 2160,
    maxY: 920,
  });
  assert.equal(map?.geometry.solids.length, 27);
  assert.equal(map?.geometry.gaps.length, 2);
  assert.equal(map?.navigation.jumpLinks.length, 4);
  assert.equal(map?.spawnPoints.length, 8);
  assert.equal(map?.pickupSpawns.length, 13);
  assert.equal(map?.presentation.theme, "jungle-temple");
});

test("Temple gameplay art uses one universal low-cover visual language", () => {
  const visuals = DROWNED_SUN_TEMPLE_V2.presentation.walls.map((wall) => wall.visual);
  assert.equal(visuals.length, 27);
  assert.ok(visuals.every((visual) => visual === "temple-integrated-cover"));
  assert.ok(DROWNED_SUN_TEMPLE_V2.presentation.gaps.every((gap) => gap.visual === "cenote-pilot"));
});

test("Temple production art ships a cohesive wide master image", () => {
  const master = readFileSync(resolve("public/assets/jungle-temple/arena-master-v2.png"));
  assert.equal(master.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(master.readUInt32BE(16), 1921);
  assert.equal(master.readUInt32BE(20), 819);
  assert.equal(master[25], 2);
  const renderer = readFileSync(resolve("src/arenaRenderer.ts"), "utf8");
  assert.match(renderer, /level\.height \* \(1921 \/ 819\)/);
});

test("Temple legacy production art kit remains available for rollback", () => {
  const expected = {
    "floor-basalt-pilot.png": [1254, 1254, 2],
    "wall-horizontal-pilot.png": [1983, 793, 6],
    "wall-vertical-pilot.png": [887, 1774, 6],
    "sun-court-pilot.png": [1254, 1254, 2],
    "cenote-pilot.png": [1254, 1254, 2],
    "jaguar-root-relief-pilot.png": [1254, 1254, 6],
    "floor-gallery.png": [1254, 1254, 2],
    "floor-rootwater.png": [1254, 1254, 2],
    "base-blue.png": [1003, 1568, 2],
    "base-red.png": [1003, 1568, 2],
    "wall-divider.png": [1774, 887, 6],
    "wall-cap.png": [1254, 1254, 6],
    "cover-pylon.png": [1391, 1131, 6],
    "court-corner.png": [1254, 1254, 6],
    "cenote-traversal-rim.png": [1536, 1024, 6],
    "temple-core.png": [1254, 1254, 6],
    "roots-border.png": [1983, 793, 6],
    "vegetation-cluster.png": [1536, 1024, 6],
    "glyph-inlay.png": [1983, 793, 6],
    "jaguar-sculpture.png": [1024, 1536, 6],
    "canopy-edge.png": [1774, 887, 6],
    "water-light.png": [1536, 1024, 6],
  } as const;
  for (const [file, [width, height, colorType]] of Object.entries(expected)) {
    const png = readFileSync(resolve("public/assets/jungle-temple", file));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${file} signature`);
    assert.equal(png.readUInt32BE(16), width, `${file} width`);
    assert.equal(png.readUInt32BE(20), height, `${file} height`);
    assert.equal(png[25], colorType, `${file} color type`);
  }
});

test("Temple ships a full clean overview at native world dimensions", () => {
  const overview = readFileSync(
    resolve("public/assets/map-previews/drowned-sun-temple-v2-overview.png"),
  );
  assert.equal(overview.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(overview.readUInt32BE(16), 2160);
  assert.equal(overview.readUInt32BE(20), 920);
});

test("Temple master art does not layer ambiguous decorations over gameplay", () => {
  const map = DROWNED_SUN_TEMPLE_V2;
  const decorations = map.presentation.decorations ?? [];
  assert.deepEqual(decorations, []);
});

test("Temple collision follows visible cover and keeps authored routes clear", () => {
  const map = DROWNED_SUN_TEMPLE_V2;
  const worldWidth = map.geometry.bounds.maxX;
  for (const solid of map.geometry.solids) {
    const mirror = map.geometry.solids.find((candidate) =>
      candidate.x === worldWidth - solid.x - solid.width &&
      candidate.y === solid.y &&
      candidate.width === solid.width &&
      candidate.height === solid.height
    );
    assert.ok(
      solid.id === "solar-sight-altar" || mirror,
      `${solid.id} needs mirrored collision geometry.`,
    );
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

test("projectile impacts teach the low-cover rule with neutral feedback", () => {
  const effects = readFileSync(
    resolve("src/adapters/phaser/PhaserWeaponEffectsPort.ts"),
    "utf8",
  );
  assert.match(effects, /event\.type === "projectile\.expired"/);
  assert.match(effects, /readString\(event\.payload, "reason"\) === "solid"/);
  assert.match(effects, /addCoverImpact/);
});

test("Temple of the Drowned Sun supports every mode from 1v1 through 4v4", () => {
  for (const mode of [
    "team-deathmatch",
    "classic-ctf",
    "one-flag",
  ] as const) {
    for (const teamSize of [1, 2, 3, 4] as const) {
      assert.deepEqual(
        validateWorldMapForMode(
          DROWNED_SUN_TEMPLE_V2,
          mode,
          teamSize,
        ),
        [],
      );
    }
  }
});

test("Temple of the Drowned Sun passes structural and weapon-safety gates", () => {
  const issues = validateWorldMapQuality(DROWNED_SUN_TEMPLE_V2, {
    clearPoints: [{
      id: "one-flag-center-rocket-clearance",
      position: { x: 1080, y: 460 },
      minimumClearance: 121,
    }],
    blockedSightLines: [
      {
        id: "rail-to-one-flag",
        from: { x: 1080, y: 80 },
        to: { x: 1080, y: 460 },
      },
      {
        id: "rail-to-blue-spawn",
        from: { x: 1080, y: 80 },
        to: { x: 150, y: 460 },
      },
      {
        id: "rail-to-red-spawn",
        from: { x: 1080, y: 80 },
        to: { x: 2010, y: 460 },
      },
    ],
  });
  assert.deepEqual(issues, []);
});

test("Temple routes preserve distinct speed, precision, and safety roles", () => {
  const main = measureWorldRouteLength([
    { x: 180, y: 460 }, { x: 420, y: 370 },
    { x: 650, y: 400 }, { x: 840, y: 460 },
    { x: 1080, y: 460 },
  ]);
  const north = measureWorldRouteLength([
    { x: 180, y: 460 }, { x: 400, y: 380 },
    { x: 500, y: 270 }, { x: 700, y: 210 },
    { x: 900, y: 200 }, { x: 960, y: 200 },
    { x: 960, y: 340 }, { x: 1080, y: 460 },
  ]);
  const south = measureWorldRouteLength([
    { x: 180, y: 460 }, { x: 400, y: 540 },
    { x: 500, y: 650 }, { x: 700, y: 710 },
    { x: 880, y: 640 }, { x: 1080, y: 640 },
    { x: 1080, y: 580 }, { x: 1080, y: 460 },
  ]);

  assert.ok(main >= 920 && main <= 940);
  assert.ok(north / main >= 1.24 && north / main <= 1.27);
  assert.ok(south / main >= 1.24 && south / main <= 1.27);
});

test("Temple pickup economy is mirrored and blocks objective weapon spam", () => {
  const map = DROWNED_SUN_TEMPLE_V2;
  const worldWidth = map.geometry.bounds.maxX;
  for (const pickup of map.pickupSpawns) {
    const mirror = map.pickupSpawns.find((candidate) =>
      candidate.type === pickup.type &&
      candidate.position.x === worldWidth - pickup.position.x &&
      candidate.position.y === pickup.position.y
    );
    assert.ok(mirror, `${pickup.id} needs a same-type mirrored pickup.`);
  }

  const counts = Object.fromEntries(
    ["health", "armor", "rocket", "rail", "whip"].map((type) => [
      type,
      map.pickupSpawns.filter((pickup) => pickup.type === type).length,
    ]),
  );
  assert.deepEqual(counts, {
    health: 6,
    armor: 2,
    rocket: 2,
    rail: 1,
    whip: 2,
  });
  for (const rocket of map.pickupSpawns.filter((pickup) =>
    pickup.type === "rocket"
  )) {
    assert.equal(
      hasWorldMapLineOfSight(map, rocket.position, { x: 1080, y: 460 }),
      false,
      `${rocket.id} must not have a direct One Flag spam line.`,
    );
  }
});
