import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDamage,
  createActorState,
  createEmptyWorldState,
  createOneFlagWorldState,
  createPickupState,
  fireV1Weapons,
  GameplayCoreRuntime,
  GRAND_ARCHIVE_V2,
  OneFlagMode,
  resolveNearestValidEnemy,
  updateActorLifecycle,
  updatePickups,
  updateProjectiles,
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_ARENA_PICKUP_PARITY_CONFIG,
  V2_DIAGNOSTIC_BLASTER_CONFIG,
  V2_V1_WEAPON_PARITY_CONFIG,
  type ProjectileState,
} from "../src/core";

test("spawn protection blocks direct and splash damage including knockback", () => {
  const target = actor("target", "red", 100, 100);
  target.spawnProtectionRemainingMs = 2_000;
  const direct = applyDamage(
    target,
    45,
    100,
    V2_ACTOR_LIFECYCLE_CONFIG,
    "attacker",
    "rail",
  );
  assert.equal(direct.applied, false);
  assert.equal(direct.blockedBySpawnProtection, true);
  assert.equal(target.health, 100);
  assert.equal(direct.events[0]?.type, "actor.damageBlocked");

  const projectile: ProjectileState = {
    id: "shield-test-rocket",
    ownerActorId: "attacker",
    teamId: "blue",
    weaponId: "rocket",
    position: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
    damage: 45,
    radius: 14,
    splashRadius: 105,
    knockback: 230,
    remainingLifetimeMs: 1_000,
    remainingRange: 1_000,
    lifeState: "active" as const,
  };
  updateProjectiles(
    [projectile],
    [target],
    { bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 }, solids: [], gaps: [] },
    16,
    116,
    V2_DIAGNOSTIC_BLASTER_CONFIG,
    V2_ACTOR_LIFECYCLE_CONFIG,
  );
  assert.deepEqual(target.velocity, { x: 0, y: 0 });
  assert.deepEqual(target.position, { x: 100, y: 100 });
});

test("Rocket direct hits deal 45 once while nearby enemies receive falloff", () => {
  const direct = actor("direct", "red", 200, 100);
  const splash = actor("splash", "red", 250, 100);
  const projectile: ProjectileState = {
    id: "direct-hit-rocket",
    ownerActorId: "owner",
    teamId: "blue",
    weaponId: "rocket",
    position: { x: 100, y: 100 },
    velocity: { x: 4_000, y: 0 },
    damage: 45,
    radius: 14,
    splashRadius: 105,
    knockback: 230,
    remainingLifetimeMs: 1_000,
    remainingRange: 1_000,
    lifeState: "active",
  };
  const result = updateProjectiles(
    [projectile],
    [direct, splash],
    { bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 }, solids: [], gaps: [] },
    34,
    34,
    V2_DIAGNOSTIC_BLASTER_CONFIG,
    V2_ACTOR_LIFECYCLE_CONFIG,
  );

  assert.equal(direct.health, 55);
  assert.ok(splash.health < 100 && splash.health > 55);
  assert.equal(
    result.events.filter((event) =>
      event.type === "actor.damaged" && event.targetActorId === direct.id
    ).length,
    1,
  );
  assert.equal(
    result.events.filter((event) => event.type === "weapon.rocketExploded")
      .length,
    1,
  );
});

test("Rocket sweep catches thin solids and explodes at range or lifetime end", () => {
  const makeRocket = (
    id: string,
    remainingLifetimeMs: number,
    remainingRange: number,
  ): ProjectileState => ({
    id,
    ownerActorId: "owner",
    teamId: "blue",
    weaponId: "rocket",
    position: { x: 100, y: 100 },
    velocity: { x: 5_000, y: 0 },
    damage: 45,
    radius: 14,
    splashRadius: 105,
    knockback: 230,
    remainingLifetimeMs,
    remainingRange,
    lifeState: "active",
  });
  const geometry = {
    bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 },
    solids: [{ id: "thin-wall", x: 180, y: 80, width: 1, height: 40 }],
    gaps: [],
  };
  const wallResult = updateProjectiles(
    [makeRocket("wall-sweep", 1_000, 1_000)],
    [],
    geometry,
    34,
    34,
    V2_DIAGNOSTIC_BLASTER_CONFIG,
    V2_ACTOR_LIFECYCLE_CONFIG,
  );
  assert.ok(wallResult.events.some((event) =>
    event.type === "projectile.expired" &&
    (event.payload as { reason?: string }).reason === "solid"
  ));
  assert.equal(
    wallResult.events.filter((event) => event.type === "weapon.rocketExploded")
      .length,
    1,
  );

  for (const [id, lifetime, range, reason] of [
    ["range-end", 1_000, 10, "range"],
    ["lifetime-end", 10, 1_000, "lifetime"],
  ] as const) {
    const result = updateProjectiles(
      [makeRocket(id, lifetime, range)],
      [],
      { ...geometry, solids: [] },
      34,
      68,
      V2_DIAGNOSTIC_BLASTER_CONFIG,
      V2_ACTOR_LIFECYCLE_CONFIG,
    );
    assert.equal(
      result.events.filter((event) => event.type === "weapon.rocketExploded")
        .length,
      1,
    );
    assert.ok(result.events.some((event) =>
      event.type === "projectile.expired" &&
      (event.payload as { reason?: string }).reason === reason
    ));
  }
});

test("death respawn grants protection and resets the Arc Lash cooldown", () => {
  const target = actor("target", "red", 100, 100);
  target.lifeState = "dead";
  target.health = 0;
  target.spawnProtectionRemainingMs = 0;
  target.weapons.whipCooldownMs = 400;
  target.respawn = { reason: "death", remainingMs: 1 };
  const respawn = updateActorLifecycle(
    target,
    1,
    500,
    V2_ACTOR_LIFECYCLE_CONFIG,
  );
  assert.equal(respawn.respawned, true);
  assert.equal(
    target.spawnProtectionRemainingMs,
    V2_ACTOR_LIFECYCLE_CONFIG.spawnProtectionMs,
  );
  assert.equal(target.weapons.whipCooldownMs, 0);
  target.spawnProtectionRemainingMs = 0;
  const firstUnprotectedHit = applyDamage(
    target,
    10,
    2_501,
    V2_ACTOR_LIFECYCLE_CONFIG,
  );
  assert.equal(firstUnprotectedHit.applied, true);
  assert.equal(target.health, 90);
});

test("Arc Lash ignores manual aim, is unlimited, and preserves cooldown without target", () => {
  const world = createEmptyWorldState("team-deathmatch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 },
    solids: [],
    gaps: [],
  };
  const owner = actor("owner", "blue", 100, 100);
  const targetB = actor("target-b", "red", 200, 100);
  const targetA = actor("target-a", "red", 100, 200);
  owner.spawnProtectionRemainingMs = 1_000;
  world.actors.push(owner, targetB, targetA);
  const resolved = resolveNearestValidEnemy(
    owner,
    world.actors,
    world.geometry,
    V2_V1_WEAPON_PARITY_CONFIG.whipRange,
  );
  assert.equal(resolved?.target.id, "target-a");
  const events = fireV1Weapons(world, owner, weaponInput("whip", { x: -1, y: 0 }));
  assert.equal(targetA.health, 65);
  assert.equal(targetB.health, 100);
  assert.equal(owner.spawnProtectionRemainingMs, 0);
  assert.ok(events.some((event) =>
    event.type === "weapon.whipFired" && event.targetActorId === "target-a"
  ));
  owner.weapons.whipCooldownMs = 0;
  fireV1Weapons(world, owner, weaponInput("whip", { x: 1, y: 0 }));
  assert.equal(targetA.health, 30);

  targetA.lifeState = "inactive";
  targetB.lifeState = "inactive";
  owner.weapons.whipCooldownMs = 0;
  owner.spawnProtectionRemainingMs = 900;
  const noTarget = fireV1Weapons(world, owner, weaponInput("whip", { x: 1, y: 0 }));
  assert.equal(noTarget[0]?.type, "weapon.whipTargetUnavailable");
  assert.equal(owner.weapons.whipCooldownMs, 0);
  assert.equal(owner.spawnProtectionRemainingMs, 900);
});

test("objective interaction ends spawn protection immediately", () => {
  let world = createOneFlagWorldState(GRAND_ARCHIVE_V2);
  const runtime = new GameplayCoreRuntime({
    mode: new OneFlagMode(GRAND_ARCHIVE_V2),
    createWorld: () => {
      world = createOneFlagWorldState(GRAND_ARCHIVE_V2);
      return world;
    },
  });
  runtime.initialize();
  const blue = world.actors.find((candidate) => candidate.id === "blue-player")!;
  const flag = world.objectives[0]!;
  blue.position = { ...flag.position };
  const frame = runtime.advance({
    sequence: 1,
    timeMs: 34,
    deltaMs: 34,
    actions: [],
  });
  assert.ok(frame.events.some((event) => event.type === "objective.flagPickedUp"));
  assert.ok(frame.events.some((event) =>
    event.type === "actor.spawnProtectionEnded" &&
    (event.payload as { reason?: string }).reason === "objective"
  ));
  assert.equal(
    frame.snapshot.actors.find((candidate) => candidate.id === blue.id)
      ?.spawnProtectionRemainingMs,
    0,
  );
});

test("simultaneous pickup overlap explicitly favors the human teammate", () => {
  const bot = actor("blue-bot", "blue", 100, 100);
  const human = actor("blue-player", "blue", 100, 100);
  const pickup = createPickupState({
    id: "rail-human-courtesy",
    type: "rail",
    position: { x: 100, y: 100 },
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  const result = updatePickups([pickup], [bot, human], 16, 100, [human.id]);
  assert.equal(result.events[0]?.targetActorId, human.id);
  assert.equal(human.weapons.railAmmo, V2_ARENA_PICKUP_PARITY_CONFIG.railValue);
  assert.equal(bot.weapons.railAmmo, 0);
});

test("weapon pickups clamp Rocket to 15 and Rail to 8", () => {
  const collector = actor("collector", "blue", 100, 100);
  collector.weapons.rocketAmmo = 13;
  const rocket = createPickupState({
    id: "rocket-cap",
    type: "rocket",
    position: { x: 100, y: 100 },
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  const rocketResult = updatePickups([rocket], [collector], 16, 100);
  assert.equal(collector.weapons.rocketAmmo, 15);
  assert.equal(
    (rocketResult.events[0]?.payload as { appliedValue?: number }).appliedValue,
    2,
  );

  collector.weapons.railAmmo = 6;
  const rail = createPickupState({
    id: "rail-cap",
    type: "rail",
    position: { x: 100, y: 100 },
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  const railResult = updatePickups([rail], [collector], 16, 116);
  assert.equal(collector.weapons.railAmmo, 8);
  assert.equal(
    (railResult.events[0]?.payload as { appliedValue?: number }).appliedValue,
    2,
  );

  const full = createPickupState({
    id: "full-rocket",
    type: "rocket",
    position: { x: 100, y: 100 },
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  assert.equal(updatePickups([full], [collector], 16, 132).events.length, 0);
  assert.equal(full.lifeState, "active");
});

test("Rail deals fixed 85 damage and distinguishes actor, wall, and range ends", () => {
  const world = createEmptyWorldState("rail-impact-kinds");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 1_500, maxY: 500 },
    solids: [],
    gaps: [],
  };
  const owner = actor("owner", "blue", 100, 100);
  const target = actor("target", "red", 400, 100);
  target.armor = 20;
  owner.weapons.railAmmo = 1;
  world.actors.push(owner, target);
  const actorEvents = fireV1Weapons(
    world,
    owner,
    weaponInput("rail", { x: 1, y: 0 }),
  );
  assert.equal(target.armor, 0);
  assert.equal(target.health, 35);
  assert.equal(
    (actorEvents.find((event) => event.type === "weapon.railFired")?.payload as {
      impactKind?: string;
    }).impactKind,
    "actor",
  );

  owner.weapons.railAmmo = 1;
  owner.weapons.railCooldownMs = 0;
  world.geometry = {
    ...world.geometry,
    solids: [{ id: "rail-wall", x: 200, y: 80, width: 20, height: 40 }],
  };
  const wallEvents = fireV1Weapons(
    world,
    owner,
    weaponInput("rail", { x: 1, y: 0 }),
  );
  assert.equal(
    (wallEvents.find((event) => event.type === "weapon.railFired")?.payload as {
      impactKind?: string;
    }).impactKind,
    "solid",
  );
  assert.equal(target.health, 35);

  owner.weapons.railAmmo = 1;
  owner.weapons.railCooldownMs = 0;
  target.lifeState = "inactive";
  world.geometry = { ...world.geometry, solids: [] };
  const rangeEvents = fireV1Weapons(
    world,
    owner,
    weaponInput("rail", { x: 1, y: 0 }),
  );
  assert.equal(
    (rangeEvents.find((event) => event.type === "weapon.railFired")?.payload as {
      impactKind?: string;
    }).impactKind,
    "range",
  );
});

function actor(id: string, teamId: string, x: number, y: number) {
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
  weaponId: "rocket" | "rail" | "whip",
  direction: { x: number; y: number },
) {
  return {
    sequence: 1,
    timeMs: 0,
    deltaMs: 16,
    actions: [{
      action: "fireWeapon",
      phase: "pressed" as const,
      actorId: "owner",
      direction,
      payload: { weaponId },
    }],
  };
}
