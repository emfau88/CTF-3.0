import assert from "node:assert/strict";
import test from "node:test";
import {
  hasWorldMapLineOfSight,
  measureWorldRouteLength,
  TRAINING_CROSSING_V2,
  validateWorldMapQuality,
  WORLD_MAPS,
} from "../src/core";
import {
  JUNGLE_TEMPLE_GREYBOX_PALETTE,
} from "../src/arenaPresentation";
import type { WorldMapTheme } from "../src/core/world/maps";

test("registered maps have no blocking structural quality issues", () => {
  const pickupClearanceWarnings: string[] = [];
  for (const map of WORLD_MAPS) {
    const issues = validateWorldMapQuality(map);
    pickupClearanceWarnings.push(...issues
      .filter((issue) => issue.code === "invalid-pickup-clearance")
      .map((issue) => `${map.id}:${issue.code}`));
    assert.deepEqual(
      issues.filter((issue) => issue.code !== "invalid-pickup-clearance"),
      [],
      `${map.displayName}: ${issues.map((issue) => issue.message).join(" ")}`,
    );
  }
  assert.deepEqual(pickupClearanceWarnings, [
    "grand-archive-v2:invalid-pickup-clearance",
    "flow-lab-v2:invalid-pickup-clearance",
  ]);
});

test("quality gate rejects clipped pickups and decorative jump links", () => {
  const pickup = TRAINING_CROSSING_V2.pickupSpawns[0]!;
  const brokenMap = {
    ...TRAINING_CROSSING_V2,
    pickupSpawns: [
      ...TRAINING_CROSSING_V2.pickupSpawns,
      {
        ...pickup,
        position: { x: 350, y: 200 },
      },
    ],
    navigation: {
      jumpLinks: [
        ...TRAINING_CROSSING_V2.navigation.jumpLinks,
        {
          id: "decorative-hop",
          from: { x: 700, y: 410 },
          to: { x: 760, y: 410 },
          activationRadius: 44,
        },
      ],
    },
  };

  const codes = new Set(
    validateWorldMapQuality(brokenMap).map((issue) => issue.code),
  );
  assert.equal(codes.has("duplicate-pickup-id"), true);
  assert.equal(codes.has("invalid-pickup-clearance"), true);
  assert.equal(codes.has("jump-link-misses-traversal"), true);
});

test("quality contracts verify required clearance and blocked sight lines", () => {
  const issues = validateWorldMapQuality(TRAINING_CROSSING_V2, {
    clearPoints: [{
      id: "unsafe-objective",
      position: { x: 350, y: 200 },
      minimumClearance: 121,
    }],
    blockedSightLines: [{
      id: "intentionally-open-test-line",
      from: { x: 650, y: 60 },
      to: { x: 850, y: 60 },
    }],
  });
  const codes = new Set(issues.map((issue) => issue.code));
  assert.equal(codes.has("unsafe-required-point"), true);
  assert.equal(codes.has("unblocked-required-sight-line"), true);

  assert.equal(
    hasWorldMapLineOfSight(
      TRAINING_CROSSING_V2,
      { x: 150, y: 410 },
      { x: 1350, y: 410 },
    ),
    false,
  );
  assert.equal(
    hasWorldMapLineOfSight(
      TRAINING_CROSSING_V2,
      { x: 650, y: 60 },
      { x: 850, y: 60 },
    ),
    true,
  );
});

test("route measurement and temple greybox theme stay deterministic", () => {
  assert.equal(
    measureWorldRouteLength([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 9, y: 12 },
    ]),
    15,
  );
  const theme: WorldMapTheme = "jungle-temple";
  assert.equal(theme, "jungle-temple");
  assert.notEqual(
    JUNGLE_TEMPLE_GREYBOX_PALETTE.floor,
    JUNGLE_TEMPLE_GREYBOX_PALETTE.wall,
  );
  assert.notEqual(
    JUNGLE_TEMPLE_GREYBOX_PALETTE.gap,
    JUNGLE_TEMPLE_GREYBOX_PALETTE.floor,
  );
});
