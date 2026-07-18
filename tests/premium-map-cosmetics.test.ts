import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
  HELIX_CANOPY_V2,
  measureWorldMapClearance,
  WORLD_MAP_ACTOR_RADIUS,
} from "../src/core";
import {
  advancePremiumMapCosmeticState,
  createPremiumMapCosmeticState,
  getPremiumMapCosmetic,
  PREMIUM_MAP_COSMETICS,
} from "../src/premiumMapCosmetics";

const PREMIUM_MAPS = [
  HELIX_CANOPY_V2,
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
] as const;

test("every premium arena has one selective cosmetic overlay", () => {
  assert.equal(PREMIUM_MAP_COSMETICS.length, PREMIUM_MAPS.length);
  assert.deepEqual(
    PREMIUM_MAP_COSMETICS.map((cosmetic) => cosmetic.mapId),
    PREMIUM_MAPS.map((map) => map.id),
  );
  assert.equal(
    new Set(PREMIUM_MAP_COSMETICS.map((cosmetic) => cosmetic.assetKey)).size,
    PREMIUM_MAP_COSMETICS.length,
  );
  assert.equal(getPremiumMapCosmetic("training-crossing-v2"), undefined);
});

test("premium cosmetics stay in blocked map-edge scenery", () => {
  for (const map of PREMIUM_MAPS) {
    const cosmetic = getPremiumMapCosmetic(map.id);
    assert.ok(cosmetic, `${map.displayName} needs a cosmetic config.`);
    const bounds = map.geometry.bounds;
    const edgeDistance = Math.min(
      cosmetic.position.x - bounds.minX,
      bounds.maxX - cosmetic.position.x,
      cosmetic.position.y - bounds.minY,
      bounds.maxY - cosmetic.position.y,
    );
    assert.ok(
      edgeDistance <= 115,
      `${map.displayName} cosmetic is ${edgeDistance}px from the edge.`,
    );
    const clearance = measureWorldMapClearance(map, cosmetic.position);
    assert.equal(clearance.obstacleKind, "solid");
    assert.ok(clearance.clearance < WORLD_MAP_ACTOR_RADIUS);
  }
});

test("premium cosmetic assets are compact RGBA PNG overlays", () => {
  for (const cosmetic of PREMIUM_MAP_COSMETICS) {
    const png = readFileSync(
      resolve("public/assets", cosmetic.assetFile),
    );
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png.readUInt32BE(16), 256);
    assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[25], 6, `${cosmetic.assetFile} must contain alpha.`);
    assert.ok(
      png.byteLength < 300_000,
      `${cosmetic.assetFile} should remain small enough for mobile preload.`,
    );
  }
});

test("cosmetic reactions are local, rate-limited, and resettable", () => {
  const config = PREMIUM_MAP_COSMETICS[0];
  const idle = createPremiumMapCosmeticState();
  const triggered = advancePremiumMapCosmeticState(
    idle,
    config,
    16,
    true,
  );
  assert.equal(triggered.reactionCount, 1);
  assert.equal(triggered.reactionRemainingMs, config.reactionDurationMs);
  assert.equal(triggered.rearmRemainingMs, config.rearmDelayMs);

  const clampedFrame = advancePremiumMapCosmeticState(
    triggered,
    config,
    1_000,
    true,
  );
  assert.equal(
    clampedFrame.reactionRemainingMs,
    config.reactionDurationMs - 100,
  );
  assert.equal(clampedFrame.reactionCount, 1);

  let cooledDown = clampedFrame;
  while (cooledDown.rearmRemainingMs > 0) {
    cooledDown = advancePremiumMapCosmeticState(
      cooledDown,
      config,
      100,
      false,
    );
  }
  const retriggered = advancePremiumMapCosmeticState(
    cooledDown,
    config,
    16,
    true,
  );
  assert.equal(retriggered.reactionCount, 2);
  assert.deepEqual(createPremiumMapCosmeticState(), idle);
});
