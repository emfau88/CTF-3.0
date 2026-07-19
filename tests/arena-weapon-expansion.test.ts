import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  ARENA_WEAPON_CATALOG,
  createActorState,
  createEmptyWorldState,
  fireV1Weapons,
  updateProjectiles,
  V2_ARENA_PICKUP_PARITY_CONFIG,
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_DIAGNOSTIC_PICKUP_CONFIG,
  V2_DIAGNOSTIC_BLASTER_CONFIG,
  type ArenaWeaponId,
  type CoreInputFrame,
  type WorldState,
} from "../src/core";
import { ARENA_CAMERA_RESET_KEY_CODE } from
  "../src/adapters/phaser/PhaserArenaCameraController";

test("Disc fire no longer shares its C key with the camera reset", () => {
  assert.equal(ARENA_WEAPON_CATALOG.disc.inputKey, "C");
  assert.notEqual(
    ARENA_CAMERA_RESET_KEY_CODE,
    67,
    "The camera reset must not consume the Disc's C key.",
  );
});

test("Pulse and Disc pickups grant doubled ammunition", () => {
  assert.equal(ARENA_WEAPON_CATALOG.pulse.pickupValue, 36);
  assert.equal(ARENA_WEAPON_CATALOG.disc.pickupValue, 8);
  assert.equal(ARENA_WEAPON_CATALOG.pulse.maxAmmo, 54);
  assert.equal(ARENA_WEAPON_CATALOG.disc.maxAmmo, 12);
  assert.equal(V2_ARENA_PICKUP_PARITY_CONFIG.pulseValue, 36);
  assert.equal(V2_ARENA_PICKUP_PARITY_CONFIG.discValue, 8);
  assert.equal(V2_DIAGNOSTIC_PICKUP_CONFIG.pulseValue, 36);
  assert.equal(V2_DIAGNOSTIC_PICKUP_CONFIG.discValue, 8);
});

test("new projectile identities ship as compact transparent art", () => {
  for (const asset of [
    "weapons/pulse-repeater.png",
    "weapons/pulse-bolt.png",
    "weapons/ricochet-disc-launcher.png",
    "weapons/ricochet-disc-projectile.png",
    "weapons/lob-energy-grenade.png",
  ]) {
    const png = readFileSync(resolve("public/assets", asset));
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(png.readUInt32BE(16), 256);
    assert.equal(png.readUInt32BE(20), 256);
    assert.equal(png[25], 6, `${asset} must contain alpha.`);
    assert.ok(png.byteLength < 200_000, `${asset} should stay compact.`);
  }
});

test("premium rosters expose Arc Lash plus at most three map pickups", async () => {
  const { HELIX_CANOPY_V2, DROWNED_SUN_TEMPLE_V2, FLOW_CIRCUIT_V2 } =
    await import("../src/core");
  for (const map of [
    HELIX_CANOPY_V2,
    DROWNED_SUN_TEMPLE_V2,
    FLOW_CIRCUIT_V2,
  ]) {
    assert.equal(map.weaponRoster?.length, 4);
    assert.equal(map.weaponRoster?.[0], "whip");
    const pickupWeapons = new Set(
      map.pickupSpawns
        .map((pickup) => pickup.type)
        .filter((type) => type !== "health" && type !== "armor"),
    );
    assert.deepEqual(
      [...pickupWeapons].sort(),
      [...(map.weaponRoster ?? [])].filter((id) => id !== "whip").sort(),
    );
  }
});

test("Pulse Repeater is a fast readable ten-damage projectile", () => {
  const { world, owner, target } = combatWorld(["whip", "pulse"]);
  owner.weapons.pulseAmmo = 1;
  const fired = fireV1Weapons(
    world,
    owner,
    weaponInput("pulse", { x: 1, y: 0 }),
  );
  assert.equal(fired.some((event) => event.type === "weapon.pulseFired"), true);
  assert.equal(owner.weapons.pulseAmmo, 0);
  stepProjectiles(world, 8);
  assert.equal(target.health, 90);
});

test("Ricochet Disc launches with three available ricochets", () => {
  const { world, owner } = combatWorld(["whip", "disc"]);
  owner.weapons.discAmmo = 1;
  fireV1Weapons(world, owner, weaponInput("disc", { x: 1, y: 0 }));
  assert.equal(world.projectiles[0]?.ricochetsRemaining, 3);
  assert.equal(world.projectiles[0]?.ricochetCount, 0);
});

test("Ricochet Disc stops on an opponent after a rewarding bank shot", () => {
  const { world, target } = combatWorld(["whip", "disc"]);
  target.position = { x: 40, y: 100 };
  world.geometry = {
    ...world.geometry,
    solids: [{
      id: "bank-wall",
      x: 205,
      y: 40,
      width: 12,
      height: 120,
    }],
  };
  world.projectiles.push({
    id: "disc-bank-test",
    ownerActorId: "owner",
    teamId: "blue",
    weaponId: "disc",
    position: { x: 120, y: 100 },
    velocity: { x: 620, y: 0 },
    damage: 38,
    radius: 14,
    ricochetsRemaining: 3,
    ricochetCount: 0,
    ricochetDamage: 50,
    remainingLifetimeMs: 2_000,
    remainingRange: 900,
    lifeState: "active",
  });
  const events = stepProjectiles(world, 18);
  assert.equal(
    events.some((event) => event.type === "weapon.discRicochet"),
    true,
  );
  assert.equal(target.health, 50);
  assert.equal(
    events.filter((event) => event.type === "weapon.discRicochet").length,
    1,
  );
  assert.equal(world.projectiles.length, 0);
});

test("Ricochet Disc can bounce exactly three times before cover stops it", () => {
  const { world, owner, target } = combatWorld(["whip", "disc"]);
  owner.position = { x: 100, y: 400 };
  target.position = { x: 200, y: 400 };
  world.geometry = {
    ...world.geometry,
    bounds: { minX: 0, minY: 0, maxX: 260, maxY: 500 },
  };
  world.projectiles.push({
    id: "disc-three-bounce-test",
    ownerActorId: "owner",
    teamId: "blue",
    weaponId: "disc",
    position: { x: 120, y: 100 },
    velocity: { x: 620, y: 0 },
    damage: 38,
    radius: 14,
    ricochetsRemaining: 3,
    ricochetCount: 0,
    ricochetDamage: 50,
    remainingLifetimeMs: 2_500,
    remainingRange: 1_500,
    lifeState: "active",
  });
  const events = stepProjectiles(world, 60);
  assert.equal(
    events.filter((event) => event.type === "weapon.discRicochet").length,
    3,
  );
  assert.equal(world.projectiles.length, 0);
});

test("Ricochet Disc ends immediately on a direct opponent hit", () => {
  const { world, owner, target } = combatWorld(["whip", "disc"]);
  owner.weapons.discAmmo = 1;
  fireV1Weapons(world, owner, weaponInput("disc", { x: 1, y: 0 }));
  const events = stepProjectiles(world, 8);
  assert.equal(target.health, 62);
  assert.equal(
    events.some((event) => event.type === "weapon.discRicochet"),
    false,
  );
  assert.equal(world.projectiles.length, 0);
});

test("Lob Grenade crosses a wall, lands, telegraphs, and detonates locally", () => {
  const { world, owner, target } = combatWorld(["whip", "grenade"]);
  owner.weapons.grenadeAmmo = 1;
  target.position = { x: 430, y: 100 };
  world.geometry = {
    ...world.geometry,
    solids: [{
      id: "lob-wall",
      x: 250,
      y: 20,
      width: 35,
      height: 160,
    }],
  };
  const fired = fireV1Weapons(
    world,
    owner,
    weaponInput(
      "grenade",
      { x: 1, y: 0 },
      { x: target.position.x, y: target.position.y },
    ),
  );
  assert.equal(
    fired.some((event) => event.type === "weapon.grenadeFired"),
    true,
  );
  const events = stepProjectiles(world, 55);
  assert.equal(
    events.some((event) => event.type === "weapon.grenadeLanded"),
    true,
  );
  assert.equal(
    events.some((event) => event.type === "weapon.grenadeExploded"),
    true,
  );
  assert.equal(target.health, 40);
});

test("Shardcaster resonates after six hits and never spreads bonus damage", () => {
  const { world, owner, target } = combatWorld(["whip", "shard"]);
  const bystander = fighter("bystander", "red", 205, 145);
  world.actors.push(bystander);
  owner.weapons.shardAmmo = 6;
  const events = [];
  for (let index = 0; index < 6; index += 1) {
    owner.weapons.shardCooldownMs = 0;
    world.timeMs = index * 220;
    events.push(...fireV1Weapons(
      world,
      owner,
      weaponInput("shard", { x: 1, y: 0 }),
    ));
    events.push(...stepProjectiles(world, 8));
  }
  assert.equal(target.health, 45);
  assert.equal(bystander.health, 100);
  assert.equal(target.weapons.shardStacks, 0);
  assert.equal(
    events.filter((event) => event.type === "weapon.shardResonance").length,
    1,
  );
});

test("map roster rejects a weapon that is not available in the arena", () => {
  const { world, owner } = combatWorld(["whip", "pulse"]);
  owner.weapons.rocketAmmo = 2;
  assert.deepEqual(
    fireV1Weapons(world, owner, weaponInput("rocket", { x: 1, y: 0 })),
    [],
  );
  assert.equal(owner.weapons.rocketAmmo, 2);
});

function combatWorld(roster: readonly ArenaWeaponId[]): {
  readonly world: WorldState;
  readonly owner: ReturnType<typeof fighter>;
  readonly target: ReturnType<typeof fighter>;
} {
  const world = createEmptyWorldState("team-deathmatch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 900, maxY: 500 },
    solids: [],
    gaps: [],
  };
  world.map = {
    id: "weapon-test",
    displayName: "Weapon Test",
    weaponRoster: [...roster],
  };
  const owner = fighter("owner", "blue", 100, 100);
  const target = fighter("target", "red", 200, 100);
  world.actors.push(owner, target);
  return { world, owner, target };
}

function fighter(id: string, teamId: string, x: number, y: number) {
  return createActorState({
    id,
    kind: "player",
    teamId,
    position: { x, y },
    spawnPosition: { x, y },
    radius: 16,
    maxHealth: 100,
    maxArmor: 100,
    armor: 0,
  });
}

function weaponInput(
  weaponId: ArenaWeaponId,
  direction: Readonly<{ x: number; y: number }>,
  targetPosition?: Readonly<{ x: number; y: number }>,
): CoreInputFrame {
  return {
    sequence: 1,
    timeMs: 0,
    deltaMs: 16,
    actions: [{
      action: "fireWeapon",
      phase: "pressed",
      actorId: "owner",
      direction: { ...direction },
      payload: {
        weaponId,
        ...(targetPosition ? { targetPosition: { ...targetPosition } } : {}),
      },
    }],
  };
}

function stepProjectiles(
  world: WorldState,
  frames: number,
): ReturnType<typeof updateProjectiles>["events"] {
  const events = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const result = updateProjectiles(
      world.projectiles,
      world.actors,
      world.geometry,
      34,
      world.timeMs + frame * 34,
      V2_DIAGNOSTIC_BLASTER_CONFIG,
      V2_ACTOR_LIFECYCLE_CONFIG,
    );
    events.push(...result.events);
  }
  return events;
}
