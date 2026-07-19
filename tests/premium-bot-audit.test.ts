import assert from "node:assert/strict";
import test from "node:test";
import {
  createPremiumBotAuditRunProfiles,
  PREMIUM_BOT_AUDIT_MAPS,
  PREMIUM_BOT_AUDIT_MODES,
  runPremiumBotAudit,
  runPremiumBotAuditScenario,
} from "./premium-bot-audit";

test("premium bot audit covers every premium map and mode deterministically", () => {
  const report = runPremiumBotAudit({
    runsPerMapMode: 1,
    durationMs: 1_200,
    teamSize: 2,
  });
  assert.equal(
    report.runs.length,
    PREMIUM_BOT_AUDIT_MAPS.length * PREMIUM_BOT_AUDIT_MODES.length,
  );
  assert.deepEqual(
    new Set(report.runs.map((run) => run.mapId)),
    new Set(PREMIUM_BOT_AUDIT_MAPS.map((map) => map.id)),
  );
  assert.deepEqual(
    new Set(report.runs.map((run) => run.modeId)),
    new Set(PREMIUM_BOT_AUDIT_MODES),
  );
  assert.equal(
    report.runs.every((run) => run.invalidPositionFrames === 0),
    true,
  );
  assert.equal(
    report.findings.some((finding) => finding.severity === "critical"),
    false,
  );
  assert.equal(report.aggregates.length, 9);
});

test("classic CTF audit profiles compare every human squad command", () => {
  const profiles = createPremiumBotAuditRunProfiles(
    "classic-ctf",
    PREMIUM_BOT_AUDIT_MAPS[0].id,
    6,
  );
  assert.deepEqual(
    profiles.map((profile) => profile.commandProfile),
    ["auto", "defend", "follow", "attack", "cycle", "auto"],
  );
  const defend = runPremiumBotAuditScenario({
    map: PREMIUM_BOT_AUDIT_MAPS[0],
    modeId: "classic-ctf",
    teamSize: 2,
    durationMs: 2_000,
    profile: profiles[1]!,
  });
  const commandedTeammate = defend.actors.find((actor) =>
    actor.actorId === "blue-player-2"
  );
  assert.ok(commandedTeammate);
  assert.equal(commandedTeammate.commandMeasuredFrames > 0, true);
  assert.equal(
    commandedTeammate.commandCompliantFrames +
      commandedTeammate.commandEmergencyOverrideFrames +
      commandedTeammate.commandConflictFrames,
    commandedTeammate.commandMeasuredFrames,
  );
});
