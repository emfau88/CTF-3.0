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

test("death respawn grants exactly two seconds of protection and Arc Lash charges", () => {
  const target = actor("target", "red", 100, 100);
  target.lifeState = "dead";
  target.health = 0;
  target.spawnProtectionRemainingMs = 0;
  target.weapons.whipAmmo = 0;
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
  assert.equal(
    target.weapons.whipAmmo,
    V2_ACTOR_LIFECYCLE_CONFIG.respawnWhipCharges,
  );
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

test("Arc Lash ignores manual aim, selects deterministically, and preserves charge without target", () => {
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
  owner.weapons.whipAmmo = 1;
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
  assert.equal(owner.weapons.whipAmmo, 0);
  assert.equal(owner.spawnProtectionRemainingMs, 0);
  assert.ok(events.some((event) =>
    event.type === "weapon.whipFired" && event.targetActorId === "target-a"
  ));

  targetA.lifeState = "inactive";
  targetB.lifeState = "inactive";
  owner.weapons.whipAmmo = 1;
  owner.weapons.whipCooldownMs = 0;
  owner.weapons.whipRechargeMs = 0;
  owner.spawnProtectionRemainingMs = 900;
  const noTarget = fireV1Weapons(world, owner, weaponInput("whip", { x: 1, y: 0 }));
  assert.equal(noTarget[0]?.type, "weapon.whipTargetUnavailable");
  assert.equal(owner.weapons.whipAmmo, 1);
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
