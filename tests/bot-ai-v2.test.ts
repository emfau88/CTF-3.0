import assert from "node:assert/strict";
import test from "node:test";
import {
  ArenaBotTeamCoordinator,
  assessCombatOpportunity,
  BOT_DIFFICULTY_PROFILES,
  BotTargetSelector,
  BotUtilityArbiter,
  createActorState,
  createArenaRoster,
  createBotPersonality,
  createClassicCtfWorldState,
  createEmptyWorldState,
  createOneFlagWorldState,
  createTeamDeathmatchWorldState,
  createWorldSnapshot,
  DROWNED_SUN_TEMPLE_V2,
  GridBotNavigator,
  HELIX_CANOPY_V2,
  OneFlagMode,
  planLocalBotSteering,
  TdmBotCombatController,
  TdmBotController,
  validateWorldMapBotSupport,
  WORLD_MAPS,
  type BotNavigator,
} from "../src/core";
import {
  PREMIUM_BOT_AUDIT_MAPS,
  PREMIUM_BOT_AUDIT_MODES,
  runPremiumBotAudit,
} from "./premium-bot-audit";

test("combat opportunity and movement agree on the weapon that is actually usable", () => {
  const world = createEmptyWorldState("team-deathmatch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 1_000, maxY: 600 },
    solids: [],
    gaps: [],
  };
  world.map = {
    id: "combat-opportunity",
    displayName: "Combat Opportunity",
    weaponRoster: ["whip", "rocket"],
  };
  const bot = createActorState({
    id: "bot",
    kind: "bot",
    teamId: "red",
    position: { x: 200, y: 300 },
    radius: 16,
  });
  const target = createActorState({
    id: "target",
    kind: "player",
    teamId: "blue",
    position: { x: 360, y: 300 },
    radius: 16,
  });
  world.actors.push(bot, target);

  const weaponless = assessCombatOpportunity(
    bot,
    target,
    createWorldSnapshot(world),
  );
  assert.equal(weaponless.canAttackAtCurrentRange, false);
  assert.equal(weaponless.movementWeaponId, "whip");
  assert.equal(weaponless.posture, "close");

  bot.weapons.rocketAmmo = 1;
  target.position.x = 540;
  const armed = assessCombatOpportunity(
    bot,
    target,
    createWorldSnapshot(world),
  );
  assert.equal(armed.canAttackAtCurrentRange, true);
  assert.equal(armed.movementWeaponId, "rocket");
  assert.equal(armed.posture, "hold");
});

test("utility arbitration keeps a plausible intention but yields to emergencies", () => {
  const arbiter = new BotUtilityArbiter<"fight" | "pickup" | "survive">();
  const first = arbiter.choose([
    { key: "fight", kind: "fight", score: .72, reason: "visible-enemy" },
    { key: "pickup", kind: "pickup", score: .68, reason: "ammo" },
  ], 0, 700);
  assert.equal(first.selectedKind, "fight");

  const committed = arbiter.choose([
    { key: "fight", kind: "fight", score: .65, reason: "visible-enemy" },
    { key: "pickup", kind: "pickup", score: .76, reason: "ammo" },
  ], 100, 700);
  assert.equal(committed.selectedKind, "fight");

  const emergency = arbiter.choose([
    { key: "fight", kind: "fight", score: .7, reason: "visible-enemy" },
    {
      key: "survive",
      kind: "survive",
      score: .62,
      reason: "critical-health",
      emergency: true,
    },
  ], 100, 700);
  assert.equal(emergency.selectedKind, "survive");
});

test("team coordinator assigns dynamic CTF roles and distributes commands", () => {
  const oneWorld = createClassicCtfWorldState(HELIX_CANOPY_V2, {
    teamSize: 1,
  });
  const oneRoster = createArenaRoster(1);
  const oneCoordinator = new ArenaBotTeamCoordinator(
    "classic-ctf",
    HELIX_CANOPY_V2,
    oneRoster,
  );
  for (const participant of oneRoster) {
    assert.equal(
      oneCoordinator.assignmentFor(
        participant.actorId,
        createWorldSnapshot(oneWorld),
      )?.classicCtfRole,
      "attacker",
    );
  }

  const fourWorld = createClassicCtfWorldState(HELIX_CANOPY_V2, {
    teamSize: 4,
  });
  const fourRoster = createArenaRoster(4);
  const coordinator = new ArenaBotTeamCoordinator(
    "classic-ctf",
    HELIX_CANOPY_V2,
    fourRoster,
  );
  const snapshot = createWorldSnapshot(fourWorld);
  const blueAssignments = fourRoster
    .filter((participant) => participant.teamId === "blue")
    .map((participant) =>
      coordinator.assignmentFor(participant.actorId, snapshot)!
    );
  assert.equal(
    blueAssignments.filter((assignment) =>
      assignment.classicCtfRole === "defender"
    ).length,
    1,
  );
  assert.equal(
    blueAssignments.filter((assignment) =>
      assignment.classicCtfRole === "support"
    ).length,
    1,
  );
  assert.equal(
    blueAssignments.filter((assignment) =>
      assignment.classicCtfRole === "attacker"
    ).length,
    2,
  );
  const initialDefenderId = blueAssignments.find((assignment) =>
    assignment.classicCtfRole === "defender"
  )!.actorId;
  const replacement = fourWorld.actors.find((actor) =>
    actor.teamId === "blue" && actor.id !== initialDefenderId
  )!;
  fourWorld.actors.find((actor) => actor.id === initialDefenderId)!.position = {
    x: HELIX_CANOPY_V2.geometry.bounds.maxX / 2,
    y: HELIX_CANOPY_V2.geometry.bounds.maxY / 2,
  };
  replacement.position = {
    x: HELIX_CANOPY_V2.gameplay.blueBase.x +
      HELIX_CANOPY_V2.gameplay.blueBase.width / 2,
    y: HELIX_CANOPY_V2.gameplay.blueBase.y +
      HELIX_CANOPY_V2.gameplay.blueBase.height / 2,
  };
  fourWorld.timeMs = 100;
  assert.equal(
    coordinator.assignmentFor(
      initialDefenderId,
      createWorldSnapshot(fourWorld),
    )?.classicCtfRole,
    "defender",
    "A plausible role remains committed instead of swapping every frame.",
  );

  coordinator.setTeamCommand("blue", "follow");
  const commanded = blueAssignments.map((assignment) =>
    coordinator.assignmentFor(assignment.actorId, snapshot)!
  );
  assert.equal(
    commanded.filter((assignment) =>
      assignment.classicCtfCommand === "follow"
    ).length,
    0,
    "Follow only applies when a human teammate exists.",
  );
});

test("CTF commands reach only the useful subset of bots around a human", () => {
  const world = createClassicCtfWorldState(HELIX_CANOPY_V2, {
    teamSize: 4,
  });
  const roster = createArenaRoster(4);
  const bots = roster.filter((participant) =>
    participant.actorId !== "blue-player"
  );
  const coordinator = new ArenaBotTeamCoordinator(
    "classic-ctf",
    HELIX_CANOPY_V2,
    bots,
    ["blue-player"],
  );
  const snapshot = createWorldSnapshot(world);
  const blueBots = bots.filter((participant) =>
    participant.teamId === "blue"
  );

  coordinator.setTeamCommand("blue", "follow");
  const following = blueBots.map((participant) =>
    coordinator.assignmentFor(participant.actorId, snapshot)!
  );
  assert.equal(
    following.filter((assignment) =>
      assignment.classicCtfCommand === "follow"
    ).length,
    1,
  );

  coordinator.setTeamCommand("blue", "defend");
  const defending = blueBots.map((participant) =>
    coordinator.assignmentFor(participant.actorId, snapshot)!
  );
  assert.equal(
    defending.filter((assignment) =>
      assignment.classicCtfCommand === "defend"
    ).length,
    2,
  );

  coordinator.setTeamCommand("blue", "attack");
  const attacking = blueBots.map((participant) =>
    coordinator.assignmentFor(participant.actorId, snapshot)!
  );
  assert.equal(
    attacking.filter((assignment) =>
      assignment.classicCtfCommand === "attack"
    ).length,
    2,
  );
});

test("One Flag coordinator sends one runner while teammates control space", () => {
  const world = createOneFlagWorldState(DROWNED_SUN_TEMPLE_V2, {
    teamSize: 4,
  });
  new OneFlagMode(DROWNED_SUN_TEMPLE_V2).initialize(world);
  const roster = createArenaRoster(4);
  const coordinator = new ArenaBotTeamCoordinator(
    "one-flag",
    DROWNED_SUN_TEMPLE_V2,
    roster,
  );
  const snapshot = createWorldSnapshot(world);
  const roles = roster
    .filter((participant) => participant.teamId === "blue")
    .map((participant) =>
      coordinator.assignmentFor(participant.actorId, snapshot)?.oneFlagRole
    );
  assert.equal(roles.filter((role) => role === "runner").length, 1);
  assert.equal(roles.filter((role) => role === "controller").length, 3);
});

test("One Flag coordinator creates escort and interception formations", () => {
  const world = createOneFlagWorldState(DROWNED_SUN_TEMPLE_V2, {
    teamSize: 4,
  });
  new OneFlagMode(DROWNED_SUN_TEMPLE_V2).initialize(world);
  const roster = createArenaRoster(4);
  const coordinator = new ArenaBotTeamCoordinator(
    "one-flag",
    DROWNED_SUN_TEMPLE_V2,
    roster,
  );
  const flag = world.objectives.find((objective) =>
    objective.kind === "neutral-flag"
  )!;
  const mutableFlagState = flag.state as {
    status: string;
    interactingActorId: string | null;
  };

  mutableFlagState.status = "carried";
  mutableFlagState.interactingActorId = "blue-player";
  world.timeMs += 1;
  const blueRoles = roster
    .filter((participant) => participant.teamId === "blue")
    .map((participant) =>
      coordinator.assignmentFor(
        participant.actorId,
        createWorldSnapshot(world),
      )?.oneFlagRole
    );
  assert.equal(blueRoles.filter((role) => role === "carrier").length, 1);
  assert.equal(blueRoles.filter((role) => role === "escort").length, 1);
  assert.equal(blueRoles.filter((role) => role === "screen").length, 1);

  const redRoles = roster
    .filter((participant) => participant.teamId === "red")
    .map((participant) =>
      coordinator.assignmentFor(
        participant.actorId,
        createWorldSnapshot(world),
      )?.oneFlagRole
    );
  assert.equal(redRoles.filter((role) => role === "interceptor").length, 1);
  assert.equal(redRoles.filter((role) => role === "cutoff").length, 1);
});

test("perception remembers a seen target briefly but never fires on pure team knowledge", () => {
  const world = createEmptyWorldState("team-deathmatch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 800, maxY: 500 },
    solids: [{ id: "wall", x: 240, y: 80, width: 60, height: 340 }],
    gaps: [],
  };
  world.map = {
    id: "perception-test",
    displayName: "Perception Test",
    weaponRoster: ["whip", "rocket"],
  };
  const bot = createActorState({
    id: "perception-bot",
    kind: "bot",
    teamId: "blue",
    position: { x: 120, y: 250 },
    radius: 16,
  });
  const target = createActorState({
    id: "hidden-target",
    kind: "player",
    teamId: "red",
    position: { x: 430, y: 250 },
    radius: 16,
  });
  bot.weapons.rocketAmmo = 3;
  world.actors.push(bot, target);
  const selector = new BotTargetSelector(
    BOT_DIFFICULTY_PROFILES.normal,
    createBotPersonality(bot.id),
  );
  const combat = new TdmBotCombatController();

  const hidden = selector.select(
    bot,
    createWorldSnapshot(world),
    34,
    target.id,
  );
  assert.equal(hidden.perceptionReason, "team-assignment");
  assert.equal(hidden.targetPerceived, false);
  assert.equal(
    combat.readAction(
      bot,
      hidden.target!,
      createWorldSnapshot(world),
      34,
      hidden.targetPerceived,
    ),
    null,
  );

  world.geometry = { ...world.geometry, solids: [] };
  world.timeMs = 100;
  const visible = selector.select(
    bot,
    createWorldSnapshot(world),
    100,
    target.id,
  );
  assert.equal(visible.perceptionReason, "visible");
  assert.equal(visible.targetPerceived, true);

  world.geometry = {
    ...world.geometry,
    solids: [{ id: "wall", x: 240, y: 80, width: 60, height: 340 }],
  };
  world.timeMs = 1_000;
  const remembered = selector.select(
    bot,
    createWorldSnapshot(world),
    900,
    target.id,
  );
  assert.equal(remembered.perceptionReason, "recent-memory");
  assert.equal(remembered.targetPerceived, true);

  world.timeMs = 2_000;
  const forgotten = selector.select(
    bot,
    createWorldSnapshot(world),
    1_000,
    target.id,
  );
  assert.equal(forgotten.perceptionReason, "team-assignment");
  assert.equal(forgotten.targetPerceived, false);

  world.map = {
    id: "team-search",
    displayName: "Team Search",
    weaponRoster: ["whip", "grenade"],
  };
  bot.weapons.grenadeAmmo = 3;
  const controller = new TdmBotController(bot.id, target.id);
  const searchActions = controller.readActions(
    createWorldSnapshot(world),
    34,
  );
  assert.equal(controller.debugSnapshot().holdPosition, false);
  assert.equal(
    searchActions.some((action) =>
      action.action === "move" && (action.magnitude ?? 0) > 0
    ),
    true,
  );
  assert.equal(
    searchActions.some((action) => action.action === "fireWeapon"),
    false,
  );
});

test("local steering separates teammates and sidesteps incoming projectiles", () => {
  const world = createEmptyWorldState("team-deathmatch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 500, maxY: 400 },
    solids: [],
    gaps: [],
  };
  const bot = createActorState({
    id: "steering-bot",
    kind: "bot",
    teamId: "blue",
    position: { x: 200, y: 200 },
    radius: 16,
  });
  const ally = createActorState({
    id: "steering-ally",
    kind: "bot",
    teamId: "blue",
    position: { x: 215, y: 200 },
    radius: 16,
  });
  world.actors.push(bot, ally);
  const personality = createBotPersonality(bot.id);
  const separation = planLocalBotSteering(
    bot,
    { x: 1, y: 0 },
    createWorldSnapshot(world),
    personality,
  );
  assert.equal(separation.reason, "avoid-ally");
  assert.ok(separation.direction.x < 1);

  world.projectiles.push({
    id: "incoming-rocket",
    ownerActorId: "enemy",
    teamId: "red",
    weaponId: "rocket",
    position: { x: 310, y: 200 },
    velocity: { x: -500, y: 0 },
    damage: 75,
    radius: 10,
    splashRadius: 100,
    remainingLifetimeMs: 1_000,
    remainingRange: 800,
    lifeState: "active",
  });
  const evasion = planLocalBotSteering(
    bot,
    { x: 1, y: 0 },
    createWorldSnapshot(world),
    personality,
  );
  assert.equal(evasion.reason, "evade-projectile");
  assert.equal(Math.abs(evasion.direction.y), 1);

  world.geometry = {
    ...world.geometry,
    solids: [{
      id: "blocked-preferred-dodge",
      x: 100,
      y: evasion.direction.y > 0 ? 240 : 80,
      width: 200,
      height: 80,
    }],
  };
  const redirectedEvasion = planLocalBotSteering(
    bot,
    { x: 1, y: 0 },
    createWorldSnapshot(world),
    personality,
  );
  assert.equal(redirectedEvasion.reason, "evade-projectile");
  assert.equal(redirectedEvasion.direction.y, -evasion.direction.y);
});

test("navigator projects blocked goals and escalates deterministic stuck recovery", () => {
  const world = createEmptyWorldState("bot-navigation-v2");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 600, maxY: 400 },
    solids: [{ id: "center-block", x: 270, y: 150, width: 80, height: 100 }],
    gaps: [],
  };
  const navigator = new GridBotNavigator();
  const snapshot = createWorldSnapshot(world);
  for (let elapsed = 0; elapsed < 2_100; elapsed += 100) {
    navigator.navigate(
      { x: 100, y: 200 },
      { x: 300, y: 200 },
      "blocked-goal",
      snapshot,
      100,
    );
  }
  const debug = navigator.debugSnapshot();
  assert.equal(debug.projectionApplied, true);
  assert.ok(debug.projectedTarget);
  assert.equal(debug.goalBlocked, true);
  assert.equal(debug.recoveryStage, 3);
});

test("changing tactical targets cannot hide a physically stuck bot", () => {
  const world = createEmptyWorldState("bot-navigation-target-switch");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 600, maxY: 400 },
    solids: [],
    gaps: [],
  };
  const navigator = new GridBotNavigator();
  const snapshot = createWorldSnapshot(world);
  for (let elapsed = 0; elapsed < 2_100; elapsed += 100) {
    const variant = Math.floor(elapsed / 100) % 2;
    navigator.navigate(
      { x: 100, y: 200 },
      { x: 480, y: 160 + variant * 80 },
      `moving-target-${variant}`,
      snapshot,
      100,
    );
  }
  assert.equal(navigator.debugSnapshot().recoveryStage, 3);
});

test("navigator finishes at the exact target instead of only its grid cell", () => {
  const world = createEmptyWorldState("bot-navigation-exact-target");
  world.geometry = {
    bounds: { minX: 0, minY: 0, maxX: 700, maxY: 500 },
    solids: [],
    gaps: [],
  };
  const navigator = new GridBotNavigator();
  const target = { x: 520, y: 410 };
  navigator.navigate(
    { x: 100, y: 100 },
    target,
    "exact-pickup",
    createWorldSnapshot(world),
    34,
  );
  assert.deepEqual(navigator.debugSnapshot().currentWaypoint, target);
});

test("controller clears its navigation path while its bot is inactive", () => {
  class ResetTrackingNavigator implements BotNavigator {
    resetCount = 0;

    navigate() {
      return {
        direction: { x: 1, y: 0 },
        jump: false,
      };
    }

    reset(): void {
      this.resetCount += 1;
    }
  }

  const world = createTeamDeathmatchWorldState(HELIX_CANOPY_V2);
  const actor = world.actors.find((candidate) =>
    candidate.id === "blue-player"
  )!;
  actor.lifeState = "dead";
  const navigator = new ResetTrackingNavigator();
  const controller = new TdmBotController(
    actor.id,
    undefined,
    undefined,
    navigator,
  );
  controller.readActions(createWorldSnapshot(world), 34);
  assert.equal(navigator.resetCount, 1);
});

test("navigator approaches an authored jump before aiming at its landing point", () => {
  const navigator = new GridBotNavigator();
  const jump = HELIX_CANOPY_V2.navigation.jumpLinks[0]!;
  const world = createTeamDeathmatchWorldState(HELIX_CANOPY_V2);
  const snapshot = createWorldSnapshot(world);
  const target = { x: jump.to.x + 120, y: jump.to.y + 180 };
  let decision = navigator.navigate(
    { x: jump.from.x - 180, y: jump.from.y - 70 },
    target,
    "jump-approach",
    snapshot,
    34,
  );
  let approachedLaunch = false;
  for (let step = 0; step < 8 && !decision.jump; step += 1) {
    const waypoint = navigator.debugSnapshot().currentWaypoint!;
    if (
      Math.hypot(
        waypoint.x - jump.from.x,
        waypoint.y - jump.from.y,
      ) < 1
    ) {
      approachedLaunch = true;
    }
    decision = navigator.navigate(
      waypoint,
      target,
      "jump-approach",
      snapshot,
      34,
    );
  }
  assert.equal(approachedLaunch, true);
  assert.equal(decision.jump, true);
  assert.deepEqual(
    navigator.debugSnapshot().currentWaypoint,
    jump.to,
  );
});

test("every current map satisfies the reusable bot authoring contract", () => {
  for (const map of WORLD_MAPS) {
    assert.deepEqual(
      validateWorldMapBotSupport(map),
      [],
      `${map.id} must keep all bot-critical targets reachable.`,
    );
  }
});

test("bot map contract rejects jump endpoints without actor clearance", () => {
  const blockedJumpMap = {
    ...HELIX_CANOPY_V2,
    navigation: {
      jumpLinks: HELIX_CANOPY_V2.navigation.jumpLinks.map((link, index) =>
        index === 0
          ? {
            ...link,
            from: {
              x: HELIX_CANOPY_V2.geometry.solids[0]!.x +
                HELIX_CANOPY_V2.geometry.solids[0]!.width / 2,
              y: HELIX_CANOPY_V2.geometry.solids[0]!.y +
                HELIX_CANOPY_V2.geometry.solids[0]!.height / 2,
            },
          }
          : link
      ),
    },
  };
  assert.equal(
    validateWorldMapBotSupport(blockedJumpMap).some((issue) =>
      issue.code === "invalid-jump-link"
    ),
    true,
  );
});

test("premium audit can compare several team sizes in one deterministic report", () => {
  const report = runPremiumBotAudit({
    runsPerMapMode: 1,
    durationMs: 1_000,
    teamSizes: [1, 4],
  });
  assert.equal(
    report.runs.length,
    PREMIUM_BOT_AUDIT_MAPS.length *
      PREMIUM_BOT_AUDIT_MODES.length *
      2,
  );
  assert.deepEqual(report.config.teamSizes, [1, 4]);
  assert.equal(report.aggregates.length, 18);
  assert.equal(
    report.runs.every((run) =>
      run.averageDecisionCpuMsPerFrame >= 0 &&
      run.p95DecisionCpuMsPerFrame >= 0
    ),
    true,
  );
});

test("TDM coordinator spreads a four-bot squad across available threats", () => {
  const world = createTeamDeathmatchWorldState(HELIX_CANOPY_V2, {
    teamSize: 4,
  });
  const roster = createArenaRoster(4);
  const coordinator = new ArenaBotTeamCoordinator(
    "team-deathmatch",
    HELIX_CANOPY_V2,
    roster,
  );
  const snapshot = createWorldSnapshot(world);
  const targets = roster
    .filter((participant) => participant.teamId === "blue")
    .map((participant) =>
      coordinator.assignmentFor(participant.actorId, snapshot)
        ?.combatTargetActorId
    )
    .filter((target): target is string => Boolean(target));
  assert.ok(new Set(targets).size >= 2);
});
