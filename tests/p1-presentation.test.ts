import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveCharacterIdlePose,
  V2_IDLE_PROFILES,
} from "../src/adapters/phaser/characterIdlePose";
import { V2_CHARACTER_SKINS } from "../src/adapters/phaser/v2CharacterPresentation";
import { matchStatsColumns } from "../src/matchStatsPresentation";
import { V2_PLAYER_SKINS } from "../src/v2Route";

test("legacy idle poses remain episodic while AX-9 stays neutral", () => {
  const legacyPoseSkins = V2_PLAYER_SKINS.filter((skinId) =>
    skinId !== "ax9-mantis"
  );
  assert.deepEqual(Object.keys(V2_IDLE_PROFILES).sort(), [...legacyPoseSkins].sort());
  for (const skinId of legacyPoseSkins) {
    const neutral = resolveCharacterIdlePose(skinId, 500, 0);
    assert.equal(neutral.active, false, `${skinId} should rest before its gag`);
    const gag = resolveCharacterIdlePose(skinId, 3_900, 0);
    assert.equal(gag.active, true, `${skinId} should enter its authored idle gag`);
    assert.ok(
      gag.x !== 0 || gag.y !== 0 || gag.rotation !== 0 ||
        gag.scaleX !== 1 || gag.scaleY !== 1,
      `${skinId} idle must visibly differ from a static breath`,
    );
  }
  assert.equal(resolveCharacterIdlePose("ax9-mantis", 3_900, 0).active, false);
  assert.equal(V2_CHARACTER_SKINS["ax9-mantis"].id, "ax9-mantis");
});

test("scoreboard columns only show objective stats in objective modes", () => {
  assert.deepEqual(
    matchStatsColumns("team-deathmatch").map((column) => column.label),
    ["Player", "K", "D", "K/D", "Impact"],
  );
  for (const modeId of ["classic-ctf", "one-flag"] as const) {
    assert.deepEqual(
      matchStatsColumns(modeId).map((column) => column.label),
      ["Player", "K", "D", "K/D", "Cap", "Ret", "Impact"],
    );
  }
});

test("fighter size differences remain presentation-only and tightly bounded", () => {
  const scales = Object.values(V2_CHARACTER_SKINS).map((skin) => skin.scale);
  assert.equal(scales.length, V2_PLAYER_SKINS.length);
  assert.ok(Math.max(...scales) - Math.min(...scales) <= .06);
});
