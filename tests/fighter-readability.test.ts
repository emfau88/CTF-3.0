import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FIGHTER_OUTLINE_OFFSETS,
  FIGHTER_READABILITY_OBJECTS_FOR_CONTROLLED_ACTOR,
  FIGHTER_READABILITY_OBJECTS_PER_TEAM_ACTOR,
  fighterRingSegments,
  MAX_FIGHTER_READABILITY_OBJECTS_IN_4V4,
  PRIMARY_CONTROLLED_ACTOR_ID,
  TEAM_RING_GROUND_OFFSET_Y,
} from "../src/adapters/phaser/fighterReadability";

test("fighter team rings communicate teams through different shapes", () => {
  const blue = fighterRingSegments("blue");
  const red = fighterRingSegments("red");

  assert.equal(blue.length, 2, "blue should read as an almost continuous ring");
  assert.equal(red.length, 6, "red should read as clearly separated segments");
  assert.ok(
    coveredAngle(blue) > coveredAngle(red),
    "blue should cover more of its ellipse than red",
  );
  assert.equal(fighterRingSegments(null), blue);
});

test("fighter outline is symmetric and keeps the 4v4 object budget bounded", () => {
  assert.equal(FIGHTER_OUTLINE_OFFSETS.length, 8);
  for (const offset of FIGHTER_OUTLINE_OFFSETS) {
    assert.ok(
      FIGHTER_OUTLINE_OFFSETS.some((candidate) =>
        candidate.x === -offset.x && candidate.y === -offset.y
      ),
      `missing inverse outline offset for ${offset.x},${offset.y}`,
    );
  }
  assert.equal(FIGHTER_READABILITY_OBJECTS_PER_TEAM_ACTOR, 9);
  assert.equal(FIGHTER_READABILITY_OBJECTS_FOR_CONTROLLED_ACTOR, 10);
  assert.equal(MAX_FIGHTER_READABILITY_OBJECTS_IN_4V4, 73);
  assert.equal(PRIMARY_CONTROLLED_ACTOR_ID, "blue-player");
  assert.equal(TEAM_RING_GROUND_OFFSET_Y, 18);
});

test("actor readability visuals share the existing actor lifecycle", () => {
  const source = readFileSync(
    new URL(
      "../src/adapters/phaser/PhaserArenaActorRenderer.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /drawTeamRing\(teamRing, actor, controlled\)/);
  assert.match(source, /syncOutlineSprites\(view\.outlines, view\.sprite, active\)/);
  assert.match(source, /OBJECTIVE_CARRIER_MARKER_OFFSET_Y/);
  assert.match(source, /setVisible\(active && controlled\)/);
  assert.match(source, /view\.teamRing\.destroy\(\)/);
  assert.match(source, /view\.playerMarker\?\.destroy\(\)/);
  assert.match(source, /view\.container\.destroy\(\)/);
  assert.doesNotMatch(source, /scene\.tweens|addEvent|setInterval|setTimeout/);
});

function coveredAngle(
  segments: readonly { readonly start: number; readonly end: number }[],
): number {
  return segments.reduce(
    (total, segment) => total + segment.end - segment.start,
    0,
  );
}
