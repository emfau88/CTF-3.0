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
    maxX: 2280,
    maxY: 980,
  });
  assert.equal(map?.geometry.solids.length, 53);
  assert.equal(map?.geometry.gaps.length, 2);
  assert.equal(map?.navigation.jumpLinks.length, 4);
  assert.equal(map?.spawnPoints.length, 8);
  assert.equal(map?.pickupSpawns.length, 13);
  assert.deepEqual(map?.weaponRoster, ["whip", "rocket", "grenade", "disc"]);
  assert.equal(map?.presentation.theme, "jungle-temple");
});

test("Temple gameplay art uses one universal low-cover visual language", () => {
  const visuals = DROWNED_SUN_TEMPLE_V2.presentation.walls.map((wall) => wall.visual);
  assert.equal(visuals.length, 53);
  assert.ok(visuals.every((visual) => visual === "temple-integrated-cover"));
  assert.ok(DROWNED_SUN_TEMPLE_V2.presentation.gaps.every((gap) => gap.visual === "cenote-pilot"));
});

test("Temple production art ships a cohesive wide master image", () => {
  const master = readFileSync(resolve("public/assets/jungle-temple/arena-master-v2.png"));
  assert.equal(master.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(master.readUInt32BE(16), 1913);
  assert.equal(master.readUInt32BE(20), 822);
  assert.equal(master[25], 2);
  const renderer = readFileSync(resolve("src/arenaRenderer.ts"), "utf8");
  assert.match(renderer, /level\.height \* \(1913 \/ 822\)/);
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
  assert.equal(overview.readUInt32BE(16), 2280);
  assert.equal(overview.readUInt32BE(20), 980);
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

test("Temple scenery rim is a closed collision mask around the playable court", () => {
  const map = DROWNED_SUN_TEMPLE_V2;
  const solids = new Map(map.geometry.solids.map((solid) => [solid.id, solid]));

  for (const id of [
    "temple-rim-north",
    "temple-rim-south",
    "temple-rim-side-blue",
    "temple-rim-side-red",
  ]) {
    assert.ok(solids.has(id), `${id} must close the decorative arena edge.`);
  }

  for (const side of ["blue", "red"] as const) {
    for (let step = 1; step <= 5; step += 1) {
      assert.ok(
        solids.has(`temple-rim-north-step-${step}-${side}`),
        `north ${side} corner step ${step} is missing.`,
      );
    }
    for (let step = 1; step <= 6; step += 1) {
      assert.ok(
        solids.has(`temple-rim-south-step-${step}-${side}`),
        `south ${side} corner step ${step} is missing.`,
      );
    }
  }

  const blockedScenerySamples = [
    { x: 1140, y: 40 },
    { x: 1140, y: 950 },
    { x: 55, y: 490 },
    { x: 2225, y: 490 },
    { x: 150, y: 115 },
    { x: 2130, y: 115 },
    { x: 150, y: 825 },
    { x: 2130, y: 825 },
  ];
  for (const sample of blockedScenerySamples) {
    const clearance = measureWorldMapClearance(map, sample);
    assert.ok(
      clearance.clearance <= 0,
      `decorative rim sample ${sample.x},${sample.y} must be blocked.`,
    );
  }

  const openCourtSamples = [
    { x: 1140, y: 90 },
    { x: 1140, y: 890 },
    { x: 150, y: 490 },
    { x: 2130, y: 490 },
    { x: 300, y: 185 },
    { x: 1980, y: 185 },
    { x: 360, y: 805 },
    { x: 1920, y: 805 },
  ];
  for (const sample of openCourtSamples) {
    const clearance = measureWorldMapClearance(map, sample);
    assert.ok(
      clearance.clearance >= WORLD_MAP_ACTOR_RADIUS,
      `visible court sample ${sample.x},${sample.y} is blocked by ${clearance.obstacleId}.`,
    );
  }
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
    clearPoints: [
      {
        id: "one-flag-center-rocket-clearance",
        position: { x: 1140, y: 490 },
        minimumClearance: 121,
      },
      {
        id: "gallery-cenote-passage",
        position: { x: 1025, y: 225 },
        minimumClearance: 20,
      },
      {
        id: "cenote-court-passage",
        position: { x: 930, y: 315 },
        minimumClearance: 38,
      },
      {
        id: "court-side-passage",
        position: { x: 930, y: 480 },
        minimumClearance: 42,
      },
      {
        id: "rootwater-row-passage",
        position: { x: 1025, y: 700 },
        minimumClearance: 22,
      },
    ],
    blockedSightLines: [
      {
        id: "rail-to-one-flag",
        from: { x: 1140, y: 80 },
        to: { x: 1140, y: 490 },
      },
      {
        id: "rail-to-blue-spawn",
        from: { x: 1140, y: 80 },
        to: { x: 150, y: 490 },
      },
      {
        id: "rail-to-red-spawn",
        from: { x: 1140, y: 80 },
        to: { x: 2130, y: 490 },
      },
    ],
  });
  assert.deepEqual(issues, []);
});

test("Temple routes preserve distinct speed, precision, and safety roles", () => {
  const main = measureWorldRouteLength([
    { x: 180, y: 490 }, { x: 440, y: 400 },
    { x: 670, y: 430 }, { x: 900, y: 490 },
    { x: 1140, y: 490 },
  ]);
  const north = measureWorldRouteLength([
    { x: 180, y: 490 }, { x: 420, y: 410 },
    { x: 520, y: 300 }, { x: 720, y: 240 },
    { x: 960, y: 230 }, { x: 1020, y: 230 },
    { x: 1020, y: 370 }, { x: 1140, y: 490 },
  ]);
  const south = measureWorldRouteLength([
    { x: 180, y: 490 }, { x: 420, y: 570 },
    { x: 520, y: 710 }, { x: 720, y: 770 },
    { x: 940, y: 700 }, { x: 1140, y: 700 },
    { x: 1140, y: 640 }, { x: 1140, y: 490 },
  ]);

  assert.ok(main >= 980 && main <= 990);
  assert.ok(north / main >= 1.23 && north / main <= 1.25);
  assert.ok(south / main >= 1.28 && south / main <= 1.31);
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
    ["health", "armor", "rocket", "disc", "grenade"].map((type) => [
      type,
      map.pickupSpawns.filter((pickup) => pickup.type === type).length,
    ]),
  );
  assert.deepEqual(counts, {
    health: 6,
    armor: 2,
    rocket: 2,
    disc: 1,
    grenade: 2,
  });
  for (const rocket of map.pickupSpawns.filter((pickup) =>
    pickup.type === "rocket"
  )) {
    assert.equal(
      hasWorldMapLineOfSight(map, rocket.position, { x: 1140, y: 490 }),
      false,
      `${rocket.id} must not have a direct One Flag spam line.`,
    );
  }
});
