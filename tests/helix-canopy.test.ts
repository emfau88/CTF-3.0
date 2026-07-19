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
  WORLD_MAPS,
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
  assert.equal(map?.geometry.solids.length, 50);
  assert.equal(map?.geometry.gaps.length, 0);
  assert.equal(map?.navigation.jumpLinks.length, 4);
  assert.equal(map?.spawnPoints.length, 8);
  assert.equal(map?.pickupSpawns.length, 11);
  assert.deepEqual(map?.weaponRoster, ["whip", "rail", "pulse", "shard"]);
  assert.equal(map?.presentation.theme, "helix-canopy");
});

test("premium arenas lead the shared and Quick Play map order", () => {
  assert.deepEqual(
    WORLD_MAPS.slice(0, 3).map((map) => map.id),
    ["helix-canopy-v2", "drowned-sun-temple-v2", "flow-circuit-v2"],
  );
  const html = readFileSync(resolve("index.html"), "utf8");
  assert.match(
    html,
    /id="v2-menu-map"[\s\S]*<option value="helix-canopy-v2">Helix Canopy<\/option>\s*<option value="drowned-sun-temple-v2">Temple of the Drowned Sun<\/option>\s*<option value="flow-circuit-v2">Foundry Circuit<\/option>/,
  );
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

test("Helix Canopy keeps every marked dome garden outside the playable arena", () => {
  const map = HELIX_CANOPY_V2;
  const westSamples = [
    { id: "north outer garden", position: point(313, 217) },
    { id: "south outer garden", position: point(313, 739) },
    { id: "north inner planter", position: point(739, 174) },
    { id: "south inner planter", position: point(739, 739) },
  ];

  for (const sample of westSamples) {
    for (const [side, x] of [
      ["west", sample.position.x],
      ["east", map.geometry.bounds.maxX - sample.position.x],
    ] as const) {
      const clearance = measureWorldMapClearance(map, {
        x,
        y: sample.position.y,
      });
      assert.equal(clearance.obstacleKind, "solid");
      assert.ok(
        clearance.clearance < WORLD_MAP_ACTOR_RADIUS,
        `${sample.id} ${side} must be outside the actor-safe arena.`,
      );
    }
  }
});

test("Helix Canopy exposes no actor-sized opening through the stepped outer mask", () => {
  const map = HELIX_CANOPY_V2;
  const boundarySamples = [
    { id: "west side", position: point(220, 480) },
    { id: "east side", position: point(1700, 480) },
    { id: "north west", position: point(480, 120) },
    { id: "north center", position: point(960, 120) },
    { id: "north east", position: point(1440, 120) },
    { id: "south west", position: point(480, 840) },
    { id: "south center", position: point(960, 840) },
    { id: "south east", position: point(1440, 840) },
    { id: "blue upper recess", position: point(325, 250) },
    { id: "red upper recess", position: point(1595, 250) },
    { id: "blue lower recess", position: point(325, 700) },
    { id: "red lower recess", position: point(1595, 700) },
  ];

  for (const sample of boundarySamples) {
    const clearance = measureWorldMapClearance(map, sample.position);
    assert.equal(clearance.obstacleKind, "solid", sample.id);
    assert.ok(
      clearance.clearance < WORLD_MAP_ACTOR_RADIUS,
      `${sample.id} must remain outside the actor-safe arena.`,
    );
  }
});

test("Helix Canopy preserves forgiving diagonal passages around the exchange", () => {
  const map = HELIX_CANOPY_V2;
  const minimumRawPassage = WORLD_MAP_ACTOR_RADIUS * 4;
  const passagePairs = [
    ["canopy-island", "exchange-island"],
    ["exchange-island", "root-island"],
    ["exchange-island", "helix-pod-upper"],
    ["exchange-island", "helix-pod-lower"],
  ] as const;

  const rectGap = (
    left: (typeof map.geometry.solids)[number],
    right: (typeof map.geometry.solids)[number],
  ) =>
    Math.hypot(
      Math.max(
        left.x - right.x - right.width,
        right.x - left.x - left.width,
        0,
      ),
      Math.max(
        left.y - right.y - right.height,
        right.y - left.y - left.height,
        0,
      ),
    );

  for (const side of ["west", "east"] as const) {
    for (const [firstPrefix, secondPrefix] of passagePairs) {
      const first = map.geometry.solids.filter((solid) =>
        solid.id.startsWith(firstPrefix) && solid.id.endsWith(`-${side}`)
      );
      const second = map.geometry.solids.filter((solid) =>
        solid.id.startsWith(secondPrefix) && solid.id.endsWith(`-${side}`)
      );
      assert.ok(first.length > 0 && second.length > 0);
      const rawPassage = Math.min(
        ...first.flatMap((left) => second.map((right) => rectGap(left, right))),
      );
      assert.ok(
        rawPassage >= minimumRawPassage,
        `${firstPrefix}/${secondPrefix} ${side} leaves only ${rawPassage.toFixed(1)}px raw clearance.`,
      );
    }
  }
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

test("static overview routes omit gameplay and collision overlays", () => {
  const scene = readFileSync(
    resolve("src/adapters/phaser/scenes/GameplayV2Scene.ts"),
    "utf8",
  );
  assert.match(scene, /search\.get\("mapPreview"\) === "1"/);
  assert.match(scene, /createMapPreview\(selectedMap, route\.skin\)/);
  const overview = readFileSync(
    resolve("public/assets/map-previews/helix-canopy-v2-overview.png"),
  );
  assert.equal(overview.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(overview.readUInt32BE(16), 2208);
  assert.equal(overview.readUInt32BE(20), 1104);
});
