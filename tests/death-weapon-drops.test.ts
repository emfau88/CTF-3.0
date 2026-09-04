import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDamage,
  ClassicCtfMode,
  createActorState,
  createClassicCtfWorldState,
  createEmptyWorldState,
  createPickupState,
  GameplayCoreRuntime,
  spawnWeaponDeathDrops,
  TeamDeathmatchMode,
  TRAINING_CROSSING_V2,
  updatePickups,
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_ARENA_PICKUP_PARITY_CONFIG,
  WEAPON_DEATH_DROP_LIFETIME_MS,
} from "../src/core";

test("combat deaths materialize every carried weapon with its exact remaining ammo", () => {
  const victim = createActorState({
    id: "victim",
    kind: "player",
    teamId: "red",
    position: { x: 320, y: 240 },
    weapons: { rocketAmmo: 7, railAmmo: 3, pulseAmmo: 17 },
  });
  const death = applyDamage(
    victim,
    100,
    500,
    V2_ACTOR_LIFECYCLE_CONFIG,
    "attacker",
    "rail",
  ).events.find((event) => event.type === "actor.died")!;
  const world = createEmptyWorldState("team-deathmatch");

  const spawned = spawnWeaponDeathDrops(world, death);

  assert.equal(victim.weapons.rocketAmmo, 0);
  assert.equal(victim.weapons.railAmmo, 0);
  assert.equal(victim.weapons.pulseAmmo, 0);
  assert.equal(spawned.filter((event) => event.type === "pickup.dropped").length, 3);
  assert.deepEqual(
    world.pickups.map((pickup) => ({
      type: pickup.type,
      value: pickup.value,
      origin: pickup.origin,
      expiresAfterMs: pickup.expiresAfterMs,
      position: pickup.position,
    })).sort((left, right) => left.type.localeCompare(right.type)),
    [
      { type: "pulse", value: 17, origin: "death-drop", expiresAfterMs: 4_000, position: { x: 320, y: 240 } },
      { type: "rail", value: 3, origin: "death-drop", expiresAfterMs: 4_000, position: { x: 320, y: 240 } },
      { type: "rocket", value: 7, origin: "death-drop", expiresAfterMs: 4_000, position: { x: 320, y: 240 } },
    ].sort((left, right) => left.type.localeCompare(right.type)),
  );
  assert.deepEqual(spawnWeaponDeathDrops(world, death), [], "one death cannot duplicate a drop");
});

test("a Death-Drop preserves uncollected ammo, then expires after four seconds", () => {
  const nearCap = createActorState({
    id: "near-cap",
    kind: "player",
    position: { x: 100, y: 100 },
    weapons: { rocketAmmo: 14 },
  });
  const collector = createActorState({
    id: "collector",
    kind: "player",
    position: { x: 100, y: 100 },
  });
  const drop = createPickupState({
    id: "exact-rocket-drop",
    type: "rocket",
    position: { x: 100, y: 100 },
    value: 7,
    origin: "death-drop",
    expiresAfterMs: WEAPON_DEATH_DROP_LIFETIME_MS,
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  const pickups = [drop];

  updatePickups(pickups, [nearCap], 16, 16);
  assert.equal(nearCap.weapons.rocketAmmo, 15);
  assert.equal(drop.value, 6, "partial pickup leaves its real remaining ammo");
  updatePickups(pickups, [nearCap, collector], 16, 32);
  assert.equal(collector.weapons.rocketAmmo, 6);
  assert.equal(pickups.length, 0);

  const expiryDrop = createPickupState({
    id: "expiry-rocket-drop",
    type: "rocket",
    position: { x: 500, y: 500 },
    value: 5,
    origin: "death-drop",
    expiresAfterMs: WEAPON_DEATH_DROP_LIFETIME_MS,
  }, V2_ARENA_PICKUP_PARITY_CONFIG);
  const expiryPickups = [expiryDrop];
  const expiry = updatePickups(
    expiryPickups,
    [],
    WEAPON_DEATH_DROP_LIFETIME_MS,
    WEAPON_DEATH_DROP_LIFETIME_MS,
  );
  assert.equal(expiryPickups.length, 0);
  assert.equal(expiry.events[0]?.type, "pickup.expired");
});

test("fall deaths do not create weapon drops", () => {
  const world = createEmptyWorldState("team-deathmatch");
  assert.deepEqual(spawnWeaponDeathDrops(world, {
    id: "fall-death",
    type: "actor.died",
    timeMs: 100,
    targetActorId: "victim",
    payload: {
      victimActorId: "victim",
      victimLifeId: 1,
      position: { x: 0, y: 0 },
      weaponDrops: [{ weaponId: "rocket", ammo: 5 }],
      reason: "fall",
    },
  }), []);
  assert.equal(world.pickups.length, 0);
});

test("the gameplay runtime places a combat Death-Drop in the same frame", () => {
  let world = createEmptyWorldState("team-deathmatch");
  const runtime = new GameplayCoreRuntime({
    mode: new class extends TeamDeathmatchMode {
      private emitted = false;

      override update(activeWorld: typeof world, deltaMs: number) {
        const events = super.update(activeWorld, deltaMs);
        if (this.emitted) return events;
        this.emitted = true;
        const victim = activeWorld.actors.find((actor) => actor.id === "victim")!;
        return [...events, ...applyDamage(
          victim,
          100,
          activeWorld.timeMs,
          V2_ACTOR_LIFECYCLE_CONFIG,
          "attacker",
          "rail",
        ).events];
      }
    }(),
    createWorld: () => {
      world = createEmptyWorldState("team-deathmatch");
      world.geometry = {
        ...world.geometry,
        bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 },
      };
      world.actors.push(
        createActorState({
          id: "attacker",
          kind: "player",
          teamId: "blue",
          position: { x: 80, y: 100 },
        }),
        createActorState({
          id: "victim",
          kind: "player",
          teamId: "red",
          position: { x: 320, y: 240 },
          weapons: { railAmmo: 4 },
        }),
      );
      return world;
    },
  });

  runtime.initialize();
  const frame = runtime.advance({
    sequence: 1,
    timeMs: 16,
    deltaMs: 16,
    actions: [],
  });

  assert.ok(frame.events.some((event) => event.type === "pickup.dropped"));
  assert.deepEqual(frame.snapshot.pickups.map((pickup) => ({
    type: pickup.type,
    value: pickup.value,
    origin: pickup.origin,
  })), [{ type: "rail", value: 4, origin: "death-drop" }]);
});

test("Classic CTF returns an own dropped flag to its home base on touch", () => {
  const world = createClassicCtfWorldState(TRAINING_CROSSING_V2, { teamSize: 2 });
  const mode = new ClassicCtfMode(TRAINING_CROSSING_V2);
  mode.initialize(world);
  const redCarrier = world.actors.find((actor) => actor.id === "red-player")!;
  const blueReturner = world.actors.find((actor) => actor.id === "blue-player")!;
  const blueFlag = world.objectives.find((objective) => objective.id === "blue-flag")!;

  redCarrier.position = { ...blueFlag.position };
  mode.update(world, 16);
  assert.equal(
    world.objectives.find((objective) => objective.id === "blue-flag")?.state.status,
    "carried",
  );
  redCarrier.position = { x: 760, y: 410 };
  const dropEvents = mode.handleEvent({
    id: "red-carrier-died",
    type: "actor.died",
    timeMs: 100,
    targetActorId: redCarrier.id,
    teamId: "red",
    payload: {},
  }, world);
  const dropped = world.objectives.find((objective) => objective.id === "blue-flag")!;
  assert.equal(dropped.state.status, "dropped");
  assert.deepEqual(dropEvents.map((event) => event.type), ["objective.flagDropped"]);

  redCarrier.lifeState = "dead";
  blueReturner.position = { ...dropped.position };
  const returnEvents = mode.update(world, 16);
  const returned = world.objectives.find((objective) => objective.id === "blue-flag")!;
  assert.equal(returned.state.status, "home");
  assert.deepEqual(returned.position, { x: 1335, y: 410 });
  assert.equal(
    (returnEvents.find((event) => event.type === "objective.flagReset")?.payload as {
      reason?: string;
    }).reason,
    "owner-return",
  );
});
