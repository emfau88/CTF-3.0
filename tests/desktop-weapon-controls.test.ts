import assert from "node:assert/strict";
import test from "node:test";
import {
  cycleDesktopWeaponSelection,
  normalizeDesktopWeaponSelection,
  resolveDesktopWeaponFire,
  shouldFireDesktopWeapon,
} from "../src/adapters/phaser/desktopWeaponControls";
import type { ArenaWeaponId } from "../src/core";

const roster = ["whip", "rail", "pulse", "shard"] as const;

function availability(...weaponIds: ArenaWeaponId[]) {
  const available = new Set(weaponIds);
  return (weaponId: ArenaWeaponId) => available.has(weaponId);
}

test("mouse wheel cycles only through collected desktop weapons and wraps", () => {
  const available = availability("whip", "pulse");

  assert.equal(
    cycleDesktopWeaponSelection("whip", 1, roster, available),
    "pulse",
  );
  assert.equal(
    cycleDesktopWeaponSelection("pulse", 1, roster, available),
    "whip",
  );
  assert.equal(
    cycleDesktopWeaponSelection("whip", -1, roster, available),
    "pulse",
  );
});

test("pickups do not auto-switch, while empty selections fall back to Arc Lash", () => {
  assert.equal(
    normalizeDesktopWeaponSelection(
      "whip",
      roster,
      availability("whip", "pulse"),
    ),
    "whip",
  );
  assert.equal(
    normalizeDesktopWeaponSelection(
      "pulse",
      roster,
      availability("whip"),
    ),
    "whip",
  );
});

test("direct-fire shortcuts take priority, select their weapon, and emit one shot", () => {
  const result = resolveDesktopWeaponFire({
    selectedWeaponId: "whip",
    roster,
    available: availability("whip", "pulse"),
    directTriggers: [
      { weaponId: "pulse", held: true, wasHeld: false },
      { weaponId: "whip", held: true, wasHeld: false },
    ],
    pointerHeld: true,
    pointerWasHeld: false,
  });

  assert.deepEqual(result, {
    selectedWeaponId: "pulse",
    fireWeaponId: "pulse",
  });
});

test("an empty direct-fire shortcut does not replace the usable selection", () => {
  assert.deepEqual(
    resolveDesktopWeaponFire({
      selectedWeaponId: "whip",
      roster,
      available: availability("whip"),
      directTriggers: [
        { weaponId: "pulse", held: true, wasHeld: false },
      ],
      pointerHeld: false,
      pointerWasHeld: false,
    }),
    { selectedWeaponId: "whip", fireWeaponId: "pulse" },
  );
});

test("left click repeats automatic weapons but not semi-automatic weapons", () => {
  assert.equal(shouldFireDesktopWeapon("pulse", true, true), true);
  assert.equal(shouldFireDesktopWeapon("shard", true, true), true);
  assert.equal(shouldFireDesktopWeapon("rail", true, true), false);
  assert.equal(shouldFireDesktopWeapon("rail", true, false), true);

  assert.deepEqual(
    resolveDesktopWeaponFire({
      selectedWeaponId: "pulse",
      roster,
      available: availability("whip", "pulse"),
      directTriggers: [],
      pointerHeld: true,
      pointerWasHeld: true,
    }),
    { selectedWeaponId: "pulse", fireWeaponId: "pulse" },
  );
});
