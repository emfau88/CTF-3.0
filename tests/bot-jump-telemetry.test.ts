import assert from "node:assert/strict";
import test from "node:test";
import type { WorldJumpLink } from "../src/core";
import {
  captureJumpTelemetry,
  createJumpTelemetryMetric,
  type JumpTelemetryActorFrame,
} from "./bot-jump-telemetry";

const JUMP_LINK: WorldJumpLink = {
  id: "test-gap-west-east",
  from: { x: 100, y: 200 },
  to: { x: 220, y: 200 },
  activationRadius: 44,
};

test("jump telemetry attributes authored traversal and landing progress", () => {
  const metric = createJumpTelemetryMetric();
  captureJumpTelemetry(
    metric,
    frame(90, false),
    frame(132, true),
    [JUMP_LINK],
  );
  captureJumpTelemetry(
    metric,
    frame(198, true),
    frame(224, false),
    [JUMP_LINK],
  );

  assert.equal(metric.jumpStarts, 1);
  assert.equal(metric.jumpLandings, 1);
  assert.equal(metric.jumpFailures, 0);
  assert.equal(metric.unlinkedJumpStarts, 0);
  assert.equal(metric.activeJumpLinkId, null);
  assert.deepEqual(metric.jumpLinks.get(JUMP_LINK.id), {
    linkId: JUMP_LINK.id,
    starts: 1,
    landings: 1,
    failures: 0,
    bestProgress: 1,
    bestLandingProgress: 1,
  });
});

test("jump telemetry exposes starts outside authored jump links", () => {
  const metric = createJumpTelemetryMetric();
  captureJumpTelemetry(
    metric,
    frame(20, false),
    frame(24, true),
    [JUMP_LINK],
  );

  assert.equal(metric.jumpStarts, 1);
  assert.equal(metric.unlinkedJumpStarts, 1);
  assert.equal(metric.activeJumpLinkId, null);
  assert.equal(metric.jumpLinks.size, 0);
});

function frame(
  x: number,
  jumping: boolean,
): JumpTelemetryActorFrame {
  return {
    position: { x, y: 200 },
    lifeState: "active",
    overGap: false,
    jump: { active: jumping },
  };
}
