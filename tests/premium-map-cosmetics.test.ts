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
import {
  advancePremiumMapLightState,
  createPremiumMapLightState,
  getPremiumMapLighting,
  PREMIUM_MAP_LIGHTING,
} from "../src/premiumMapLighting";

const PREMIUM_MAPS = [
  HELIX_CANOPY_V2,
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
] as const;

const LIT_PREMIUM_MAPS = [
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
] as const;

test("only the approved premium arenas preload a creature overlay", () => {
  assert.equal(PREMIUM_MAP_COSMETICS.length, 1);
  assert.deepEqual(
    PREMIUM_MAP_COSMETICS.map((cosmetic) => cosmetic.mapId),
    [DROWNED_SUN_TEMPLE_V2.id],
  );
  assert.equal(
    new Set(PREMIUM_MAP_COSMETICS.map((cosmetic) => cosmetic.assetKey)).size,
    PREMIUM_MAP_COSMETICS.length,
  );
  assert.equal(getPremiumMapCosmetic("training-crossing-v2"), undefined);
  assert.equal(getPremiumMapCosmetic(HELIX_CANOPY_V2.id), undefined);
  assert.equal(getPremiumMapCosmetic(FLOW_CIRCUIT_V2.id), undefined);
});

test("premium cosmetics stay in blocked or immediately adjacent edge scenery", () => {
  for (const cosmetic of PREMIUM_MAP_COSMETICS) {
    const map = PREMIUM_MAPS.find((candidate) =>
      candidate.id === cosmetic.mapId
    );
    assert.ok(map, `${cosmetic.mapId} needs a premium map.`);
    const bounds = map.geometry.bounds;
    const edgeDistance = Math.min(
      cosmetic.position.x - bounds.minX,
      bounds.maxX - cosmetic.position.x,
      cosmetic.position.y - bounds.minY,
      bounds.maxY - cosmetic.position.y,
    );
    assert.ok(
      edgeDistance <= 260,
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

test("the temple frog is smaller and stays hidden for at least ten seconds", () => {
  const frog = getPremiumMapCosmetic(DROWNED_SUN_TEMPLE_V2.id);
  assert.ok(frog);
  assert.equal(frog.kind, "grumpy-frog");
  assert.equal(frog.displaySize, 66);
  assert.ok((frog.reactionReturnDelayMs ?? 0) >= 10_000);
  assert.ok(frog.reactionDurationMs > (frog.reactionReturnDelayMs ?? 0));
  assert.ok(frog.rearmDelayMs >= frog.reactionDurationMs);
});

test("approved premium edge lighting uses eight blocked, neutral fixtures", () => {
  assert.equal(PREMIUM_MAP_LIGHTING.length, LIT_PREMIUM_MAPS.length);
  assert.equal(getPremiumMapLighting(HELIX_CANOPY_V2.id), undefined);
  for (const map of LIT_PREMIUM_MAPS) {
    const lighting = PREMIUM_MAP_LIGHTING.find((entry) =>
      entry.mapId === map.id
    );
    assert.ok(lighting, `${map.displayName} needs an edge-light config.`);
    assert.equal(lighting.positions.length, 8);
    assert.notEqual(lighting.glowColor, 0xff0000);
    assert.notEqual(lighting.glowColor, 0x0000ff);
    for (const position of lighting.positions) {
      const bounds = map.geometry.bounds;
      const edgeDistance = Math.min(
        position.x - bounds.minX,
        bounds.maxX - position.x,
        position.y - bounds.minY,
        bounds.maxY - position.y,
      );
      assert.ok(edgeDistance <= 230);
      assert.equal(
        measureWorldMapClearance(map, position).obstacleKind,
        "solid",
      );
    }
    const png = readFileSync(resolve("public/assets", lighting.assetFile));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png.readUInt32BE(16), 256);
    assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[25], 6, `${lighting.assetFile} must contain alpha.`);
    assert.ok(png.byteLength < 120_000);
  }
});

test("projectile-dimmed premium lights recover and rearm locally", () => {
  const idle = createPremiumMapLightState();
  const dimmed = advancePremiumMapLightState(idle, 16, true);
  assert.equal(dimmed.dimRemainingMs, 1_150);
  assert.equal(dimmed.reactionCount, 1);
  const held = advancePremiumMapLightState(dimmed, 100, true);
  assert.equal(held.reactionCount, 1);
  let recovered = held;
  while (recovered.rearmRemainingMs > 0) {
    recovered = advancePremiumMapLightState(recovered, 100, false);
  }
  assert.equal(recovered.dimRemainingMs, 0);
  assert.equal(
    advancePremiumMapLightState(recovered, 16, true).reactionCount,
    2,
  );
});
