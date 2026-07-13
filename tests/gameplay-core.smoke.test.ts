import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runPhaserGameBridgeSmokeCheck } from "../src/adapters/phaser/PhaserGameBridge.smoke";
import {
  applyDamage,
  ClassicCtfBotController,
  ClassicCtfBotDecisionController,
  ClassicCtfMode,
  classicCtfRoleForSlot,
  createActorState,
  createArenaBotControllerGroup,
  createArenaRoster,
  createClassicCtfWorldState,
  createEmptyWorldState,
  createWorldSnapshot,
  createOneFlagWorldState,
  createTeamDeathmatchWorldState,
  fireV1Weapons,
  GameplayCoreRuntime,
  getWorldMap,
  OneFlagMode,
  OneFlagBotController,
  TeamDeathmatchMode,
  TdmBotController,
  TdmBotCombatController,
  toggleClassicCtfTeamCommand,
  TRAINING_CROSSING_V2,
  clampRuntimeDeltaMs,
  FLANK_SWITCH_V2,
  GRAND_ARCHIVE_V2,
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_GAMEPLAY_RUNTIME_TIMING_CONFIG,
  V2_BASIC_AUTOSHOOT_PARITY_CONFIG,
  V2_BOT_MOVEMENT_CONFIG,
  V2_BOT_NAVIGATION_CONFIG,
  V2_TEAM_DEATHMATCH_CONFIG,
  V2_V1_WEAPON_PARITY_CONFIG,
  validateWorldMapForMode,
  type BotCombatConfig,
  type ArenaTeamSize,
  type CoreActionIntent,
  type GameEvent,
  type MatchStatEntry,
} from "../src/core";
import { shouldUseGameplayV2Shell } from "../src/bootSceneSelection";
import { buildV2MatchSearch, readV2RouteState } from "../src/v2Route";
import { calculateV2TouchLayout } from "../src/adapters/phaser/v2TouchLayout";
import { resolveDesktopAimDirection } from "../src/adapters/phaser/desktopAim";
import { formatArenaObjectiveAlert } from "../src/adapters/phaser/PhaserArenaHudPort";
import { readArenaKillNotice } from "../src/adapters/phaser/arenaKillFeed";
import { calculateMatchImpact } from "../src/v2Menu";
import {
  calculateDesktopWeaponLayout,
  cooldownWipeState,
  formatCooldownSeconds,
} from "../src/adapters/phaser/weaponHudLayout";
import {
  V2_CHARACTER_SKINS,
  legacyArenaCharacterFrame,
  resolveV2CharacterPresentation,
  v2CharacterAnimationState,
  v2CharacterColumns,
  v2CharacterDirection,
  v2CharacterFrame,
} from "../src/adapters/phaser/v2CharacterPresentation";

test("gameplay core smoke passes the full phaser game bridge check", () => {
  assert.doesNotThrow(() => runPhaserGameBridgeSmokeCheck());
});

test("runtime timing hardening clamps negative and oversized frame deltas", () => {
  assert.equal(clampRuntimeDeltaMs(-10), 0);
  assert.equal(clampRuntimeDeltaMs(34), 34);
  assert.equal(
    clampRuntimeDeltaMs(999),
    V2_GAMEPLAY_RUNTIME_TIMING_CONFIG.maxFrameDeltaMs,
  );
});

test("v2 route validation rejects invalid match routes", () => {
  const state = readV2RouteState(new URLSearchParams(
    "scene=v2&mode=broken&map=training-crossing-v2&players=???&controls=bad",
  ));

  assert.equal(state.canStartMatch, false);
  assert.equal(state.route.menu, true);
  assert.deepEqual(state.issues, [
    "Unsupported V2 mode: broken.",
    "Unsupported V2 players mode: ???.",
    "Unsupported V2 controls mode: bad.",
  ]);
});

test("v2 routes preserve and validate arena team size", () => {
  const valid = readV2RouteState(new URLSearchParams(
    "scene=v2&mode=ctf&map=grand-archive-v2&players=bot&controls=keyboard&teamSize=4",
  ));
  assert.equal(valid.canStartMatch, true);
  assert.equal(valid.route.teamSize, 4);
  assert.equal(
    new URLSearchParams(buildV2MatchSearch(valid.route)).get("teamSize"),
    "4",
  );

  const legacy = readV2RouteState(new URLSearchParams(
    "scene=v2&mode=tdm&map=training-crossing-v2&players=bot&controls=keyboard&skin=space-marine-blue-rifle",
  ));
  assert.equal(legacy.canStartMatch, true);
  assert.equal(legacy.route.teamSize, 2);
  assert.equal(legacy.route.skin, "aegis-vanguard");

  const invalid = readV2RouteState(new URLSearchParams(
    "scene=v2&mode=one-flag&map=flank-switch-v2&players=bot&controls=touch&teamSize=5",
  ));
  assert.equal(invalid.canStartMatch, false);
  assert.equal(invalid.route.menu, true);
  assert.deepEqual(invalid.issues, ["Unsupported V2 team size: 5."]);
});

test("scene selection defaults to v2 and keeps explicit v1 available", () => {
  assert.equal(shouldUseGameplayV2Shell({
    pathname: "/CTF/",
    search: "",
  }), true);
  assert.equal(shouldUseGameplayV2Shell({
    pathname: "/CTF-3.0/",
    search: "",
  }), true);
  assert.equal(shouldUseGameplayV2Shell({
    pathname: "/CTF-3.0/",
    search: "?scene=v1",
  }), false);
  assert.equal(shouldUseGameplayV2Shell({
    pathname: "/CTF/",
    search: "?scene=v2",
  }), true);
});

test("v2 menu defaults to the 2v2 Foundry Circuit CTF hero slice", () => {
  const state = readV2RouteState(new URLSearchParams());

  assert.equal(state.route.mode, "ctf");
  assert.equal(state.route.map, "flow-circuit-v2");
  assert.equal(state.route.teamSize, 2);
  assert.equal(state.route.players, "bot");
  assert.equal(state.route.menu, true);
});

test("competitive arena set keeps skill shortcuts and contested rail control", () => {
  const arenas = [
    { id: "flow-lab-v2", name: "Sunken Court", gaps: 1 },
    { id: "grand-archive-v2", name: "Grand Archive", gaps: 4 },
    { id: "flank-switch-v2", name: "Flank Switch", gaps: 4 },
  ] as const;

  for (const expected of arenas) {
    const map = getWorldMap(expected.id)!;
    assert.equal(map.displayName, expected.name);
    assert.equal(map.geometry.gaps.length, expected.gaps);
    assert.ok(map.navigation.jumpLinks.length >= 4);
    const rails = map.pickupSpawns.filter((pickup) => pickup.type === "rail");
    assert.ok(rails.length >= 1);
    for (const rail of rails) {
      for (const base of [map.gameplay.blueBase, map.gameplay.redBase]) {
        assert.equal(
          rail.position.x >= base.x &&
            rail.position.x <= base.x + base.width &&
            rail.position.y >= base.y &&
            rail.position.y <= base.y + base.height,
          false,
          `${map.displayName} rail pickup must be contested outside a base`,
        );
      }
    }
  }
});

test("desktop aim uses the actor and pointer world positions", () => {
  const direction = resolveDesktopAimDirection(
    { x: 120, y: 240 },
    { x: 420, y: 140 },
  );

  assert.ok(Math.abs(direction.x - .9486832981) < .000001);
  assert.ok(Math.abs(direction.y + .316227766) < .000001);
  assert.deepEqual(
    resolveDesktopAimDirection({ x: 12, y: 34 }, { x: 12, y: 34 }),
    { x: 0, y: 0 },
  );
});

test("v2 character presentation animates team actors and keeps a legacy fallback", () => {
  const blue = createActorState({
    id: "blue-player",
    kind: "player",
    teamId: "blue",
    facing: { x: 1, y: 0 },
  });
  const red = createActorState({
    id: "red-player",
    kind: "player",
    teamId: "red",
    facing: { x: 0, y: 1 },
  });
  const neutral = createActorState({
    id: "neutral-diagnostic",
    kind: "diagnostic-target",
    teamId: null,
    facing: { x: 0, y: -1 },
  });

  const blueSkin = resolveV2CharacterPresentation(blue, "alien-runner");
  assert.equal(blueSkin.kind, "animated-skin");
  assert.equal(blueSkin.texture, "xenoRunner");
  assert.equal(blueSkin.initialFrame, 6);
  assert.deepEqual(blueSkin.origin, { x: .5, y: .5 });

  const redSkin = resolveV2CharacterPresentation(red, "alien-runner");
  assert.equal(redSkin.kind, "animated-skin");
  assert.equal(redSkin.texture, "mirejawRunner");
  assert.equal(redSkin.initialFrame, 0);
  assert.deepEqual(redSkin.origin, { x: .5, y: .5 });

  const vanguardSkin = resolveV2CharacterPresentation(
    blue,
    "aegis-vanguard",
  );
  assert.equal(vanguardSkin.kind, "animated-skin");
  assert.equal(vanguardSkin.texture, "aegisVanguardRunner");
  assert.equal(vanguardSkin.initialFrame, 6);
  assert.deepEqual(vanguardSkin.origin, { x: .5, y: .5 });

  const fallback = resolveV2CharacterPresentation(neutral, "volt-hound");
  assert.equal(fallback.kind, "legacy-arena-character");
  assert.equal(fallback.texture, "arenaCharacters");
  assert.equal(fallback.initialFrame, legacyArenaCharacterFrame(neutral));
  assert.deepEqual(fallback.origin, { x: .5, y: .5 });

  assert.equal(v2CharacterAnimationState(blue), "idle");
  blue.velocity = { x: 80, y: 0 };
  assert.equal(v2CharacterAnimationState(blue), "walk");
  blue.jump.height = 18;
  assert.equal(v2CharacterAnimationState(blue), "jump");
  assert.equal(v2CharacterFrame(blueSkin.skin!, blue, "jump"), 11);

  for (const skinId of [
    "briarhorn",
    "ax9-mantis",
    "null-courier",
    "aegis-vanguard",
    "alien-runner",
    "volt-hound",
    "mirejaw",
    "scrapwing",
    "prism-bastion",
  ] as const) {
    const presentation = resolveV2CharacterPresentation(blue, skinId);
    assert.equal(presentation.kind, "animated-skin");
    assert.equal(presentation.skin?.columns, 6);
    assert.deepEqual(presentation.skin?.walkColumns, [1, 2, 3, 4]);
    assert.deepEqual(presentation.skin?.jumpColumns, [5]);
    assert.equal(v2CharacterFrame(V2_CHARACTER_SKINS[skinId], blue, "jump"), 11);
  }

  blue.lastMoveDirection = { x: -1, y: 1 };
  assert.equal(v2CharacterDirection(blue), "left");
  assert.equal(v2CharacterFrame(V2_CHARACTER_SKINS["volt-hound"], blue, "jump"), 23);
  assert.equal(v2CharacterFrame(V2_CHARACTER_SKINS["alien-runner"], blue, "jump"), 23);

  blue.lastMoveDirection = { x: 0, y: -1 };
  assert.equal(v2CharacterDirection(blue), "up");
  assert.equal(v2CharacterFrame(V2_CHARACTER_SKINS["alien-runner"], blue, "walk"), 13);
  assert.deepEqual(
    v2CharacterColumns(V2_CHARACTER_SKINS["null-courier"], "walk", "down"),
    [1, 2, 3, 2],
  );
});

test("new character sheets expose an exact transparent 6x4 frame grid", () => {
  for (const filename of [
    "briarhorn-spritesheet-6x4.png",
    "ax9-mantis-spritesheet-6x4.png",
    "null-courier-spritesheet-6x4.png",
    "aegis-vanguard-spritesheet-6x4.png",
    "xeno-runner-spritesheet-6x4.png",
    "volt-hound-spritesheet-6x4.png",
    "mirejaw-spritesheet-6x4.png",
    "scrapwing-spritesheet-6x4.png",
    "prism-bastion-spritesheet-6x4.png",
  ]) {
    const png = readFileSync(new URL(`../public/assets/${filename}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    assert.equal(png.readUInt32BE(16), 768);
    assert.equal(png.readUInt32BE(20), 512);
    assert.equal(png[25], 6, `${filename} must use RGBA color type`);
  }
});

test("production arena modes do not emit diagnostic movement events", () => {
  const runtimes = [
    new GameplayCoreRuntime({
      mode: new TeamDeathmatchMode(),
      createWorld: () => createTeamDeathmatchWorldState(TRAINING_CROSSING_V2),
    }),
    new GameplayCoreRuntime({
      mode: new ClassicCtfMode(TRAINING_CROSSING_V2),
      createWorld: () => createClassicCtfWorldState(TRAINING_CROSSING_V2),
    }),
    new GameplayCoreRuntime({
      mode: new OneFlagMode(TRAINING_CROSSING_V2),
      createWorld: () => createOneFlagWorldState(TRAINING_CROSSING_V2),
    }),
  ];

  for (const runtime of runtimes) {
    runtime.initialize();
    const result = runtime.advance({
      sequence: 1,
      timeMs: 16,
      deltaMs: 16,
      actions: [{
        action: "move",
        phase: "held",
        actorId: "blue-player",
        direction: { x: 1, y: 0 },
        magnitude: 1,
      }, {
        action: "aim",
        phase: "held",
        actorId: "blue-player",
        direction: { x: 1, y: 0 },
      }],
    });
    assert.equal(
      result.events.some((event) => event.type === "diagnostic.actorMoved"),
      false,
    );
  }
});

test("default TDM matches require ten kills", () => {
  const world = createTeamDeathmatchWorldState(TRAINING_CROSSING_V2);
  const mode = new TeamDeathmatchMode();
  const events = mode.initialize(world);

  assert.equal(V2_TEAM_DEATHMATCH_CONFIG.scoreLimit, 10);
  assert.equal(mode.getHudState(createWorldSnapshot(world)).notices[0], "First to 10");
  assert.equal(
    (events[0]?.payload as { scoreLimit?: unknown } | undefined)?.scoreLimit,
    10,
  );
});

test("rocket cooldown blocks repeated fire until the cooldown expires", () => {
  const runtime = new GameplayCoreRuntime({
    mode: new TeamDeathmatchMode(),
    createWorld: () => {
      const world = createEmptyWorldState("team-deathmatch");
      world.actors.push(
        createActorState({
          id: "blue-player",
          kind: "player",
          teamId: "blue",
          position: { x: 100, y: 100 },
          radius: 16,
          maxHealth: 100,
          maxArmor: 0,
          weapons: { rocketAmmo: 2 },
        }),
        createActorState({
          id: "red-player",
          kind: "player",
          teamId: "red",
          position: { x: 260, y: 100 },
          radius: 16,
          maxHealth: 100,
          maxArmor: 0,
        }),
      );
      return world;
    },
  });
  runtime.initialize();

  const readFireFrame = (sequence: number, timeMs: number, deltaMs: number) =>
    runtime.advance({
      sequence,
      timeMs,
      deltaMs,
      actions: [{
        action: "aim",
        phase: "held",
        actorId: "blue-player",
        direction: { x: 1, y: 0 },
      }, {
        action: "fireWeapon",
        phase: "pressed",
        actorId: "blue-player",
        direction: { x: 1, y: 0 },
        payload: { weaponId: "rocket" },
      }],
    });

  const first = readFireFrame(1, 34, 34);
  assert.equal(
    first.events.filter((event) => event.type === "weapon.rocketFired").length,
    1,
  );
  assert.equal(
    first.snapshot.actors.find((actor) => actor.id === "blue-player")?.weapons
      .rocketCooldownMs,
    V2_V1_WEAPON_PARITY_CONFIG.rocketCooldownMs,
  );

  const blocked = readFireFrame(2, 68, 34);
  assert.equal(
    blocked.events.some((event) => event.type === "weapon.rocketFired"),
    false,
  );
  assert.equal(
    blocked.snapshot.actors.find((actor) => actor.id === "blue-player")?.weapons
      .rocketAmmo,
    1,
  );

  let timeMs = 68;
  let sequence = 2;
  while (
    (runtime.snapshot.actors.find((actor) => actor.id === "blue-player")?.weapons
      .rocketCooldownMs ?? 0) > 0
  ) {
    sequence += 1;
    timeMs += 34;
    runtime.advance({
      sequence,
      timeMs,
      deltaMs: 34,
      actions: [],
    });
  }

  const readyAgain = readFireFrame(sequence + 1, timeMs + 34, 34);
  assert.equal(
    readyAgain.events.filter((event) => event.type === "weapon.rocketFired")
      .length,
    1,
  );
  assert.equal(
    readyAgain.snapshot.actors.find((actor) => actor.id === "blue-player")
      ?.weapons.rocketAmmo,
    0,
  );
});

test("classic ctf bot holds combat standoff while chasing a flag carrier", () => {
  const world = createClassicCtfWorldState(TRAINING_CROSSING_V2);
  new ClassicCtfMode(TRAINING_CROSSING_V2).initialize(world);
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 1200, maxY: 600 },
    solids: [],
    gaps: [],
  };
  const red = world.actors.find((actor) => actor.id === "red-player");
  const blue = world.actors.find((actor) => actor.id === "blue-player");
  const redFlag = mutable(world.objectives.find((objective) => objective.id === "red-flag")!);
  assert.ok(red);
  assert.ok(blue);
  assert.ok(redFlag);
  red.position = { x: 100, y: 100 };
  blue.position = { x: 220, y: 100 };
  redFlag.state.status = "carried";
  redFlag.state.interactingActorId = blue.id;

  const controller = new ClassicCtfBotController(
    "red-player",
    "attacker",
    TRAINING_CROSSING_V2,
    V2_BOT_MOVEMENT_CONFIG,
    {
      navigate: () => ({ direction: { x: 1, y: 0 }, jump: false }),
      reset: () => {},
    },
  );
  const actions = controller.readActions(createWorldSnapshot(world), 34);
  const move = actions.find((action) => action.action === "move");
  const aim = actions.find((action) => action.action === "aim");
  assert.equal(move?.magnitude, 0);
  assert.deepEqual(move?.direction, { x: 0, y: 0 });
  assert.deepEqual(aim?.direction, { x: 1, y: 0 });
});

test("one flag bot still approaches the neutral flag directly", () => {
  const world = createOneFlagWorldState(GRAND_ARCHIVE_V2);
  new OneFlagMode(GRAND_ARCHIVE_V2).initialize(world);
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 2500, maxY: 820 },
    solids: [],
    gaps: [],
  };
  const red = world.actors.find((actor) => actor.id === "red-player");
  const blue = world.actors.find((actor) => actor.id === "blue-player");
  const flag = mutable(world.objectives.find((objective) => objective.kind === "neutral-flag")!);
  assert.ok(red);
  assert.ok(blue);
  assert.ok(flag);
  red.position = { x: 100, y: 100 };
  blue.position = { x: 180, y: 100 };
  flag.position = { x: 600, y: 320 };
  flag.state.status = "home";
  flag.state.interactingActorId = null;

  let capturedTarget: { x: number; y: number } | null = null;
  const controller = new OneFlagBotController(
    "red-player",
    GRAND_ARCHIVE_V2,
    V2_BOT_MOVEMENT_CONFIG,
    {
      navigate: (_from, target) => {
        capturedTarget = { ...target };
        return { direction: { x: 1, y: 0 }, jump: false };
      },
      reset: () => {},
    },
  );
  const actions = controller.readActions(createWorldSnapshot(world), 34);
  const move = actions.find((action) => action.action === "move");
  assert.equal(move?.magnitude, 1);
  assert.deepEqual(capturedTarget, flag.position);
});

test("one flag bot projects blocked carrier chase targets to a reachable point", () => {
  const world = createOneFlagWorldState(GRAND_ARCHIVE_V2);
  new OneFlagMode(GRAND_ARCHIVE_V2).initialize(world);
  const red = world.actors.find((actor) => actor.id === "red-player");
  const blue = world.actors.find((actor) => actor.id === "blue-player");
  const flag = mutable(world.objectives.find((objective) => objective.kind === "neutral-flag")!);
  assert.ok(red);
  assert.ok(blue);
  assert.ok(flag);
  red.position = { x: 760, y: 410 };
  blue.position = { x: 860, y: 330 };
  flag.state.status = "carried";
  flag.state.interactingActorId = blue.id;

  let capturedTarget: { x: number; y: number } | null = null;
  const controller = new OneFlagBotController(
    "red-player",
    GRAND_ARCHIVE_V2,
    V2_BOT_MOVEMENT_CONFIG,
    {
      navigate: (_from, target) => {
        capturedTarget = { ...target };
        return { direction: { x: 1, y: 0 }, jump: false };
      },
      reset: () => {},
    },
  );

  controller.readActions(createWorldSnapshot(world), 34);

  assert.ok(capturedTarget);
  assert.notDeepEqual(capturedTarget, blue.position);
  assert.equal(
    GRAND_ARCHIVE_V2.geometry.solids.some((rect) =>
      capturedTarget!.x >= rect.x - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.x <= rect.x + rect.width + V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.y >= rect.y - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.y <= rect.y + rect.height + V2_BOT_NAVIGATION_CONFIG.obstaclePadding
    ),
    false,
  );
});

test("one flag bot projects blocked escort targets to a reachable point", () => {
  const world = createOneFlagWorldState(GRAND_ARCHIVE_V2, { teamSize: 2 });
  new OneFlagMode(GRAND_ARCHIVE_V2).initialize(world);
  const escort = world.actors.find((actor) => actor.id === "red-player");
  const carrier = world.actors.find((actor) => actor.id === "red-player-2");
  const flag = mutable(world.objectives.find((objective) => objective.kind === "neutral-flag")!);
  assert.ok(escort);
  assert.ok(carrier);
  assert.ok(flag);
  escort.position = { x: 400, y: 410 };
  carrier.position = { x: 553, y: 324 };
  flag.state.status = "carried";
  flag.state.interactingActorId = carrier.id;

  let capturedTarget: { x: number; y: number } | null = null;
  const controller = new OneFlagBotController(
    escort.id,
    GRAND_ARCHIVE_V2,
    V2_BOT_MOVEMENT_CONFIG,
    {
      navigate: (_from, target) => {
        capturedTarget = { ...target };
        return { direction: { x: 1, y: 0 }, jump: false };
      },
      reset: () => {},
    },
  );

  controller.readActions(createWorldSnapshot(world), 34);

  assert.ok(capturedTarget);
  assert.equal(controller.debugSnapshot().goalKind, "escort-carrier");
  assert.equal(controller.debugSnapshot().projectionApplied, true);
  assert.equal(
    [
      ...GRAND_ARCHIVE_V2.geometry.solids,
      ...GRAND_ARCHIVE_V2.geometry.gaps,
    ].some((rect) =>
      capturedTarget!.x >= rect.x - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.x <= rect.x + rect.width + V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.y >= rect.y - V2_BOT_NAVIGATION_CONFIG.obstaclePadding &&
      capturedTarget!.y <= rect.y + rect.height + V2_BOT_NAVIGATION_CONFIG.obstaclePadding
    ),
    false,
  );
});

test("rail bot waits for target acquisition and applies deterministic spread", () => {
  const world = createEmptyWorldState("rail-bot-balance");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 1200, maxY: 600 },
    solids: [],
    gaps: [],
  };
  const bot = createActorState({
    id: "rail-bot",
    kind: "bot",
    teamId: "red",
    position: { x: 100, y: 100 },
    radius: 16,
    maxHealth: 100,
    maxArmor: 0,
    weapons: { railAmmo: 2 },
  });
  const target = createActorState({
    id: "rail-target",
    kind: "player",
    teamId: "blue",
    position: { x: 700, y: 100 },
    radius: 16,
    maxHealth: 100,
    maxArmor: 0,
  });
  world.actors.push(bot, target);
  const config: BotCombatConfig = {
    rocketMinRange: 190,
    rocketMaxRange: 700,
    rocketDecisionCooldownMs: 3000,
    railReactionMs: 320,
    railAimJitterRadians: .04,
    railLongRangeJitterMultiplier: 2.5,
    railPreferredMinRange: 300,
    railRange: 1100,
    whipRange: 100,
  };
  const combat = new TdmBotCombatController(config);
  const snapshot = createWorldSnapshot(world);

  assert.equal(combat.readAction(bot, target, snapshot, 16), null);
  assert.equal(combat.readAction(bot, target, snapshot, 319), null);
  const shot = combat.readAction(bot, target, snapshot, 1);

  assert.equal(actionWeaponId(shot), "rail");
  assert.ok(shot?.direction);
  assert.ok(Math.abs(shot.direction.y) > .0001);
  assert.ok(Math.abs(Math.hypot(shot.direction.x, shot.direction.y) - 1) < .0001);

  target.lifeId++;
  assert.equal(
    combat.readAction(bot, target, createWorldSnapshot(world), 34),
    null,
  );
});

test("basic fire remains an opt-in core capability", () => {
  const createWorld = () => {
    const world = createEmptyWorldState("manual-basic-fire");
    world.geometry = {
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 400 },
      solids: [],
      gaps: [],
    };
    world.actors.push(
      createActorState({
        id: "blue-player",
        kind: "player",
        teamId: "blue",
        position: { x: 100, y: 200 },
        radius: 16,
        maxHealth: 100,
        maxArmor: 0,
      }),
      createActorState({
        id: "red-player",
        kind: "player",
        teamId: "red",
        position: { x: 300, y: 200 },
        radius: 16,
        maxHealth: 100,
        maxArmor: 0,
      }),
    );
    return world;
  };
  const runtime = new GameplayCoreRuntime({
    mode: new TeamDeathmatchMode(),
    createWorld,
    basicAutoAttack: V2_BASIC_AUTOSHOOT_PARITY_CONFIG,
    manualBasicAttackActorIds: ["blue-player"],
    autoBasicAttackActorIds: ["red-player"],
    allowManualPrimaryFire: false,
  });
  runtime.initialize();

  const automatic = runtime.advance({
    sequence: 1,
    timeMs: 34,
    deltaMs: 34,
    actions: [],
  });
  assert.deepEqual(
    automatic.events
      .filter((event) => event.type === "projectile.spawned")
      .map((event) => event.sourceActorId),
    ["red-player"],
  );

  const manual = runtime.advance({
    sequence: 2,
    timeMs: 68,
    deltaMs: 34,
    actions: [{
      action: "firePrimary",
      phase: "held",
      actorId: "blue-player",
    }],
  });
  assert.equal(
    manual.events.some((event) =>
      event.type === "projectile.spawned" &&
      event.sourceActorId === "blue-player"
    ),
    true,
  );
});

test("v2 attack touch zones stay separated in compact and full layouts", () => {
  const distance = (
    left: { x: number; y: number },
    right: { x: number; y: number },
  ) => Math.hypot(left.x - right.x, left.y - right.y);
  const touchRadius = (id: string, radius: number) =>
    radius + (id === "jump" ? 10 : 8);

  for (const size of [
    { width: 667, height: 375 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    const layout = calculateV2TouchLayout(size.width, size.height);
    const controls = [
      { id: "jump", ...layout.jump },
      { id: "fire", ...layout.fire },
      { id: "rocket", ...layout.rocket },
      { id: "rail", ...layout.rail },
      { id: "whip", ...layout.whip },
    ];
    assert.ok(layout.jump.x > layout.fire.x, "jump stays on the thumb anchor");
    assert.ok(layout.rail.y < layout.jump.y, "rail stays above jump");
    assert.ok(layout.rocket.y < layout.jump.y, "rocket stays above jump");
    assert.ok(layout.whip.y < layout.jump.y, "whip stays above jump");
    assert.ok(layout.fire.x < layout.whip.x, "fire begins the ability arc");
    assert.ok(layout.whip.x < layout.rocket.x, "whip precedes rocket");
    assert.ok(layout.rocket.x < layout.rail.x, "rocket precedes rail");

    for (let index = 0; index < controls.length; index += 1) {
      const control = controls[index];
      assert.ok(control.x - control.r >= 12, `${control.id} left edge`);
      assert.ok(
        control.x + control.r <= size.width - 12,
        `${control.id} right edge`,
      );
      assert.ok(control.y - control.r >= 12, `${control.id} top edge`);
      assert.ok(
        control.y + control.r <= size.height - 28,
        `${control.id} bottom edge`,
      );
      for (const other of controls.slice(index + 1)) {
        assert.ok(
          distance(control, other) >
            touchRadius(control.id, control.r) +
              touchRadius(other.id, other.r) +
              12,
          `${control.id} overlaps ${other.id}`,
        );
      }
    }
  }
});

test("desktop weapon pickups use stable ordered slots", () => {
  for (const size of [
    { width: 800, height: 450 },
    { width: 1280, height: 720 },
  ]) {
    const layout = calculateDesktopWeaponLayout(size.width, size.height);
    assert.ok(layout.rocket.x < layout.rail.x);
    assert.ok(layout.rail.x < layout.whip.x);
    assert.equal(layout.rocket.y, layout.rail.y);
    assert.equal(layout.rail.y, layout.whip.y);
    assert.equal(layout.rail.x, size.width / 2);
    assert.ok(layout.rocket.x - layout.rocket.r >= 12);
    assert.ok(layout.whip.x + layout.whip.r <= size.width - 12);
    assert.ok(layout.rocket.r <= 29);
    assert.ok(
      layout.whip.x + layout.whip.r -
          (layout.rocket.x - layout.rocket.r) <= 202,
    );
    assert.ok(layout.rocket.y + layout.rocket.r <= size.height - 5);
  }
});

test("cooldown wipe reveals elapsed time clockwise", () => {
  const fresh = cooldownWipeState(2500, 2500);
  const half = cooldownWipeState(1250, 2500);
  const ready = cooldownWipeState(0, 2500);

  assert.equal(fresh.remainingRatio, 1);
  assert.equal(fresh.elapsedRatio, 0);
  assert.equal(fresh.boundaryAngle, -Math.PI / 2);
  assert.equal(half.remainingRatio, .5);
  assert.equal(half.elapsedRatio, .5);
  assert.ok(Math.abs(half.boundaryAngle - Math.PI / 2) < .000001);
  assert.equal(ready.remainingRatio, 0);
  assert.equal(ready.elapsedRatio, 1);
  assert.equal(formatCooldownSeconds(2431), "2.5");
});

test("rail bot becomes less precise toward maximum range", () => {
  const config: BotCombatConfig = {
    rocketMinRange: 190,
    rocketMaxRange: 700,
    rocketDecisionCooldownMs: 3000,
    railReactionMs: 0,
    railAimJitterRadians: .04,
    railLongRangeJitterMultiplier: 2.5,
    railPreferredMinRange: 300,
    railRange: 1100,
    whipRange: 100,
  };
  const createShot = (targetX: number) => {
    const world = createEmptyWorldState("rail-distance-balance");
    world.geometry = {
      bounds: { minX: 0, minY: 0, maxX: 1300, maxY: 600 },
      solids: [],
      gaps: [],
    };
    const bot = createActorState({
      id: "distance-rail-bot",
      kind: "bot",
      teamId: "red",
      position: { x: 100, y: 100 },
      radius: 16,
      maxHealth: 100,
      maxArmor: 0,
      weapons: { railAmmo: 1 },
    });
    const target = createActorState({
      id: "distance-rail-target",
      kind: "player",
      teamId: "blue",
      position: { x: targetX, y: 100 },
      radius: 16,
      maxHealth: 100,
      maxArmor: 0,
    });
    world.actors.push(bot, target);
    const combat = new TdmBotCombatController(config);
    combat.readAction(bot, target, createWorldSnapshot(world), 0);
    return combat.readAction(bot, target, createWorldSnapshot(world), 0);
  };

  const mediumShot = createShot(500);
  const longShot = createShot(1100);

  assert.equal(actionWeaponId(mediumShot), "rail");
  assert.equal(actionWeaponId(longShot), "rail");
  assert.ok(mediumShot?.direction && longShot?.direction);
  assert.ok(Math.abs(longShot.direction.y) > Math.abs(mediumShot.direction.y));
});

test("arena world factories support symmetric teams from 1v1 through 4v4", () => {
  const maps = [TRAINING_CROSSING_V2, GRAND_ARCHIVE_V2, FLANK_SWITCH_V2];
  const factories = [
    createTeamDeathmatchWorldState,
    createClassicCtfWorldState,
    createOneFlagWorldState,
  ];
  for (const map of maps) {
    for (
      const teamSize of [1, 2, 3, 4] as const satisfies
        readonly ArenaTeamSize[]
    ) {
      for (const factory of factories) {
        const world = factory(map, { teamSize });
        assert.equal(world.actors.length, teamSize * 2);
        assert.equal(
          world.actors.filter((actor) => actor.teamId === "blue").length,
          teamSize,
        );
        assert.equal(
          world.actors.filter((actor) => actor.teamId === "red").length,
          teamSize,
        );
        assert.equal(
          new Set(world.actors.map((actor) => actor.id)).size,
          world.actors.length,
        );
        assert.equal(
          new Set(world.actors.map((actor) => actor.spawnPointId)).size,
          world.actors.length,
        );
        for (const actor of world.actors) {
          const spawn = world.spawnPoints.find((candidate) =>
            candidate.id === actor.spawnPointId &&
            candidate.teamId === actor.teamId
          );
          assert.ok(spawn);
          assert.deepEqual(actor.position, spawn.position);
          assert.deepEqual(actor.spawnPosition, spawn.position);
          assert.equal(
            world.pickups.some((pickup) =>
              Math.hypot(
                pickup.position.x - actor.position.x,
                pickup.position.y - actor.position.y,
              ) <= pickup.radius + actor.radius
            ),
            false,
          );
          assert.equal(
            world.actors.some((other) =>
              other.id !== actor.id &&
              Math.hypot(
                other.position.x - actor.position.x,
                other.position.y - actor.position.y,
              ) < other.radius + actor.radius
            ),
            false,
          );
        }
      }
    }
  }
});

test("4v4 map validation rejects a missing team spawn slot", () => {
  const missingSlotMap = {
    ...TRAINING_CROSSING_V2,
    spawnPoints: TRAINING_CROSSING_V2.spawnPoints.filter((spawn) =>
      spawn.id !== "blue-player-spawn-4"
    ),
  };
  assert.equal(
    validateWorldMapForMode(missingSlotMap, "team-deathmatch", 4).some(
      (issue) => issue.code === "missing-team-spawn",
    ),
    true,
  );
});

test("default arena roster preserves the existing 1v1 actor ids", () => {
  const world = createTeamDeathmatchWorldState(TRAINING_CROSSING_V2);
  assert.deepEqual(world.actors.map((actor) => actor.id), [
    "blue-player",
    "red-player",
  ]);
});

test("arena bot groups control every non-human slot from 1v1 through 4v4", () => {
  const modes = [
    {
      id: "team-deathmatch" as const,
      createWorld: createTeamDeathmatchWorldState,
      createMode: () => new TeamDeathmatchMode(),
    },
    {
      id: "classic-ctf" as const,
      createWorld: createClassicCtfWorldState,
      createMode: () => new ClassicCtfMode(TRAINING_CROSSING_V2),
    },
    {
      id: "one-flag" as const,
      createWorld: createOneFlagWorldState,
      createMode: () => new OneFlagMode(TRAINING_CROSSING_V2),
    },
  ];
  for (const teamSize of [1, 2, 3, 4] as const) {
    const bots = createArenaRoster(teamSize).filter((participant) =>
      participant.actorId !== "blue-player"
    );
    for (const definition of modes) {
      const world = definition.createWorld(TRAINING_CROSSING_V2, { teamSize });
      definition.createMode().initialize(world);
      const group = createArenaBotControllerGroup(
        definition.id,
        TRAINING_CROSSING_V2,
        bots,
      );
      const actions = group.readActions(createWorldSnapshot(world), 34);
      const controlledActorIds = new Set(actions
        .filter((action) => action.action === "move")
        .map((action) => action.actorId));
      assert.equal(group.size, bots.length);
      assert.deepEqual(
        controlledActorIds,
        new Set(bots.map((participant) => participant.actorId)),
      );
      group.reset();
    }
  }
});

test("dynamic TDM bot targeting switches to the next active enemy", () => {
  const world = createTeamDeathmatchWorldState(TRAINING_CROSSING_V2, {
    teamSize: 2,
  });
  new TeamDeathmatchMode().initialize(world);
  const red = world.actors.find((actor) => actor.id === "red-player")!;
  const nearBlue = world.actors.find((actor) => actor.id === "blue-player-2")!;
  const farBlue = world.actors.find((actor) => actor.id === "blue-player")!;
  red.position = { x: 100, y: 100 };
  nearBlue.position = { x: 200, y: 100 };
  farBlue.position = { x: 500, y: 100 };
  const controller = new TdmBotController("red-player");

  let aim = controller.readActions(createWorldSnapshot(world), 34).find(
    (action) => action.action === "aim",
  );
  assert.deepEqual(aim?.direction, { x: 1, y: 0 });

  nearBlue.lifeState = "dead";
  farBlue.position = { x: 100, y: 400 };
  aim = controller.readActions(createWorldSnapshot(world), 34).find(
    (action) => action.action === "aim",
  );
  assert.deepEqual(aim?.direction, { x: 0, y: 1 });
});

test("classic CTF bot roles are stable for four team slots", () => {
  assert.deepEqual(
    ([1, 2, 3, 4] as const).map(classicCtfRoleForSlot),
    ["attacker", "defender", "support", "attacker"],
  );
});

test("2v2 CTF defender joins a safe human flag return after midfield", () => {
  const map = getWorldMap("flow-circuit-v2")!;
  const world = createClassicCtfWorldState(map, { teamSize: 2 });
  new ClassicCtfMode(map).initialize(world);
  const human = world.actors.find((actor) => actor.id === "blue-player")!;
  const defender = world.actors.find((actor) =>
    actor.id === "blue-player-2"
  )!;
  const enemyFlag = mutable(world.objectives.find((objective) =>
    objective.id === "red-flag"
  )!);
  const decision = new ClassicCtfBotDecisionController("defender", map);

  enemyFlag.state.status = "carried";
  enemyFlag.state.interactingActorId = human.id;
  human.position = { x: 850, y: 410 };

  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "escort-carrier",
  );
});

test("2v2 CTF defender anchors briefly, then sweeps midfield and secures a useful drop", () => {
  const map = getWorldMap("flow-circuit-v2")!;
  const world = createClassicCtfWorldState(map, { teamSize: 2 });
  new ClassicCtfMode(map).initialize(world);
  const human = world.actors.find((actor) => actor.id === "blue-player")!;
  const defender = world.actors.find((actor) =>
    actor.id === "blue-player-2"
  )!;
  const enemyFlag = mutable(world.objectives.find((objective) =>
    objective.id === "red-flag"
  )!);
  const decision = new ClassicCtfBotDecisionController("defender", map);

  enemyFlag.state.status = "home";
  enemyFlag.state.interactingActorId = null;
  human.position = { x: 1400, y: 410 };
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "patrol-base",
  );

  world.timeMs = 1_700;
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "support-mid",
  );

  enemyFlag.state.status = "dropped";
  enemyFlag.state.interactingActorId = null;
  enemyFlag.position = { x: 650, y: 410 };
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "attack-flag",
  );
});

test("CTF team commands toggle back to auto when selected twice", () => {
  assert.equal(toggleClassicCtfTeamCommand("auto", "follow"), "follow");
  assert.equal(toggleClassicCtfTeamCommand("follow", "follow"), "auto");
  assert.equal(toggleClassicCtfTeamCommand("defend", "attack"), "attack");
});

test("scoreboard impact prioritizes kills and objective contribution", () => {
  const entry = (changes: Partial<MatchStatEntry>): MatchStatEntry => ({
    actorId: "blue-player",
    teamId: "blue",
    kills: 0,
    deaths: 0,
    flagPickups: 0,
    flagCaptures: 0,
    flagReturns: 0,
    ...changes,
  });

  assert.equal(calculateMatchImpact(entry({ kills: 1 })), 100);
  assert.equal(calculateMatchImpact(entry({ kills: 1, deaths: 1 })), 70);
  assert.equal(calculateMatchImpact(entry({ flagCaptures: 1 })), 350);
  assert.equal(calculateMatchImpact(entry({ flagReturns: 1 })), 150);
});

test("kill feed distinguishes weapons, falls, and suicides", () => {
  const event = (
    id: string,
    payload: Record<string, unknown>,
    sourceActorId?: string,
  ): GameEvent => ({
    id,
    type: "actor.died",
    timeMs: 100,
    sourceActorId,
    targetActorId: "red-player",
    payload,
  });

  assert.equal(
    readArenaKillNotice(event("rocket-kill", { weaponId: "rocket" }, "blue-player"))
      ?.cause,
    "rocket",
  );
  assert.equal(
    readArenaKillNotice(event("fall", { reason: "fall" }))?.cause,
    "fall",
  );
  assert.equal(
    readArenaKillNotice(event("suicide", { weaponId: "rocket" }, "red-player"))
      ?.cause,
    "suicide",
  );
});

test("lethal combat damage forwards the weapon into the death event", () => {
  const victim = createActorState({
    id: "kill-feed-victim",
    kind: "player",
    teamId: "red",
    position: { x: 0, y: 0 },
    radius: 16,
    maxHealth: 100,
    maxArmor: 0,
  });
  const result = applyDamage(
    victim,
    100,
    200,
    V2_ACTOR_LIFECYCLE_CONFIG,
    "blue-player",
    "rail",
  );
  const death = result.events.find((candidate) => candidate.type === "actor.died");

  assert.equal(
    (death?.payload as { weaponId?: string } | undefined)?.weaponId,
    "rail",
  );
});

test("arena HUD hides home flags and only reports active CTF events", () => {
  const map = getWorldMap("flow-circuit-v2")!;
  const world = createClassicCtfWorldState(map, { teamSize: 2 });
  const mode = new ClassicCtfMode(map);
  mode.initialize(world);

  assert.equal(
    formatArenaObjectiveAlert(mode.getHudState(createWorldSnapshot(world)), false),
    "",
  );

  const redFlag = mutable(world.objectives.find((objective) =>
    objective.id === "red-flag"
  )!);
  redFlag.state.status = "carried";
  redFlag.state.interactingActorId = "blue-player";
  assert.equal(
    formatArenaObjectiveAlert(mode.getHudState(createWorldSnapshot(world)), false),
    "RED FLAG TAKEN",
  );
});

test("CTF team commands direct the teammate but preserve flag emergencies", () => {
  const map = getWorldMap("flow-circuit-v2")!;
  const world = createClassicCtfWorldState(map, { teamSize: 2 });
  new ClassicCtfMode(map).initialize(world);
  const human = world.actors.find((actor) => actor.id === "blue-player")!;
  const defender = world.actors.find((actor) =>
    actor.id === "blue-player-2"
  )!;
  const enemy = world.actors.find((actor) => actor.id === "red-player")!;
  const ownFlag = mutable(world.objectives.find((objective) =>
    objective.id === "blue-flag"
  )!);
  const decision = new ClassicCtfBotDecisionController("defender", map);

  human.position = { x: 800, y: 410 };
  defender.position = { x: 220, y: 410 };
  decision.setTeamCommand("blue", "follow");
  const follow = decision.chooseGoal(defender, createWorldSnapshot(world));
  assert.equal(follow.kind, "follow-player");
  assert.ok(Math.hypot(
    follow.position.x - human.position.x,
    follow.position.y - human.position.y,
  ) <= 106);

  decision.setTeamCommand("blue", "attack");
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "attack-flag",
  );

  decision.setTeamCommand("blue", "defend");
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "patrol-base",
  );

  decision.setTeamCommand("blue", "attack");
  ownFlag.state.status = "carried";
  ownFlag.state.interactingActorId = enemy.id;
  assert.equal(
    decision.chooseGoal(defender, createWorldSnapshot(world)).kind,
    "recover-own-flag",
  );
});

type DeepMutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends object
    ? DeepMutable<T[Key]>
    : T[Key];
};

function mutable<T>(value: T): DeepMutable<T> {
  return value as DeepMutable<T>;
}

function actionWeaponId(
  action: CoreActionIntent | null | undefined,
): string | null {
  const payload = action?.payload;
  if (!payload || typeof payload !== "object" || !("weaponId" in payload)) {
    return null;
  }
  const weaponId = (payload as { weaponId?: unknown }).weaponId;
  return typeof weaponId === "string" ? weaponId : null;
}
