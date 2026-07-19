import {
  ClassicCtfBotController,
  ClassicCtfMode,
  ArenaBotTeamCoordinator,
  assessCombatOpportunity,
  createArenaRoster,
  createClassicCtfWorldState,
  createOneFlagWorldState,
  createTeamDeathmatchWorldState,
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
  GameplayCoreRuntime,
  GridBotNavigator,
  HELIX_CANOPY_V2,
  measureWorldMapClearance,
  OneFlagBotController,
  OneFlagMode,
  TeamDeathmatchMode,
  TdmBotController,
  V2_BOT_NAVIGATION_CONFIG,
  V2_V1_WEAPON_PARITY_CONFIG,
  classicCtfRoleForSlot,
  type ArenaParticipant,
  type ArenaTeamId,
  type ArenaTeamSize,
  type ClassicCtfBotControllerDebugState,
  type ClassicCtfTeamCommand,
  type CoreActionIntent,
  type GameEvent,
  type GameModeId,
  type GridBotNavigatorDebugState,
  type OneFlagBotControllerDebugState,
  type TdmBotControllerDebugState,
  type WorldMapData,
  type WorldPosition,
  type WorldSnapshot,
  type WorldState,
} from "../src/core";

export const PREMIUM_BOT_AUDIT_FRAME_MS = 34;
export const PREMIUM_BOT_AUDIT_DEFAULT_RUNS = 10;
export const PREMIUM_BOT_AUDIT_DEFAULT_DURATION_MS = 60_000;
export const PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZE: ArenaTeamSize = 2;
export const PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZES =
  [1, 2, 4] as const satisfies readonly ArenaTeamSize[];
const SILENT_COMBAT_HOLD_WARNING_MS =
  V2_V1_WEAPON_PARITY_CONFIG.railCooldownMs + 1_000;

export const PREMIUM_BOT_AUDIT_MAPS = [
  HELIX_CANOPY_V2,
  DROWNED_SUN_TEMPLE_V2,
  FLOW_CIRCUIT_V2,
] as const;

export const PREMIUM_BOT_AUDIT_MODES = [
  "team-deathmatch",
  "classic-ctf",
  "one-flag",
] as const satisfies readonly GameModeId[];

type AuditModeId = (typeof PREMIUM_BOT_AUDIT_MODES)[number];
type AuditCommandProfile =
  | ClassicCtfTeamCommand
  | "cycle"
  | "not-applicable";
type AuditSeverity = "info" | "warning" | "critical";

export interface PremiumBotAuditOptions {
  readonly runsPerMapMode?: number;
  readonly durationMs?: number;
  readonly teamSize?: ArenaTeamSize;
  readonly teamSizes?: readonly ArenaTeamSize[];
}

export interface PremiumBotAuditRunProfile {
  readonly runIndex: number;
  readonly name: string;
  readonly seed: string;
  readonly commandProfile: AuditCommandProfile;
  readonly perturbationIndex: number;
  readonly usesHumanProxy: boolean;
}

export interface PremiumBotAuditIssue {
  readonly severity: AuditSeverity;
  readonly code: string;
  readonly mapId: string;
  readonly modeId: AuditModeId;
  readonly teamSize: ArenaTeamSize;
  readonly runIndex: number;
  readonly actorId?: string;
  readonly detail: string;
}

export interface PremiumBotAuditActorMetric {
  readonly actorId: string;
  readonly teamId: ArenaTeamId;
  readonly activeMs: number;
  readonly respawnInactiveMs: number;
  readonly travelDistance: number;
  readonly longestStationaryMs: number;
  readonly moveIntentMs: number;
  readonly longestMoveIntentStallMs: number;
  readonly intentionalHoldMs: number;
  readonly longestSilentHoldMs: number;
  readonly longestWeaponlessStandoffMs: number;
  readonly blockedGoalFrames: number;
  readonly pathMissFrames: number;
  readonly repathCount: number;
  readonly goalSwitches: number;
  readonly targetKeySwitches: number;
  readonly directionReversals: number;
  readonly shots: number;
  readonly pickups: number;
  readonly kills: number;
  readonly deaths: number;
  readonly damageEventsCaused: number;
  readonly decisionFrames: Readonly<Record<string, number>>;
  readonly commandMeasuredFrames: number;
  readonly commandCompliantFrames: number;
  readonly commandEmergencyOverrideFrames: number;
  readonly commandConflictFrames: number;
}

export interface PremiumBotAuditRunResult {
  readonly label: string;
  readonly mapId: string;
  readonly mapName: string;
  readonly modeId: AuditModeId;
  readonly teamSize: ArenaTeamSize;
  readonly runIndex: number;
  readonly profile: PremiumBotAuditRunProfile;
  readonly simulatedDurationMs: number;
  readonly matchEnded: boolean;
  readonly scoreEvents: number;
  readonly flagPickups: number;
  readonly flagCaptures: number;
  readonly noActionFrames: number;
  readonly invalidPositionFrames: number;
  readonly averageDecisionCpuMsPerFrame: number;
  readonly p95DecisionCpuMsPerFrame: number;
  readonly maximumDecisionCpuMsPerFrame: number;
  readonly decisionTrace: readonly PremiumBotDecisionTraceSample[];
  readonly actors: readonly PremiumBotAuditActorMetric[];
  readonly issues: readonly PremiumBotAuditIssue[];
}

export interface PremiumBotDecisionTraceSample {
  readonly timeMs: number;
  readonly actorId: string;
  readonly position: WorldPosition;
  readonly decisionKind: string;
  readonly targetKey: string;
  readonly holdPosition: boolean;
  readonly combatTargetId: string | null;
  readonly navigationTarget: WorldPosition | null;
  readonly waypoint: WorldPosition | null;
  readonly pathFound: boolean;
  readonly goalBlocked: boolean;
  readonly recoveryStage: 0 | 1 | 2 | 3;
  readonly selectedWeaponId: string | null;
  readonly decisionReason: string;
  readonly steeringReason: string;
  readonly teamReason: string;
}

export interface PremiumBotAuditAggregate {
  readonly mapId: string;
  readonly modeId: AuditModeId;
  readonly teamSize: ArenaTeamSize;
  readonly runCount: number;
  readonly criticalIssues: number;
  readonly warnings: number;
  readonly averageScoreEvents: number;
  readonly averageFlagPickups: number;
  readonly averageFlagCaptures: number;
  readonly averageTravelPerActiveSecond: number;
  readonly maximumMoveIntentStallMs: number;
  readonly maximumSilentHoldMs: number;
  readonly maximumWeaponlessStandoffMs: number;
  readonly blockedGoalFrameRatio: number;
  readonly pathMissFrameRatio: number;
  readonly maximumP95DecisionCpuMsPerFrame: number;
  readonly commandProfiles: Readonly<Record<string, {
    readonly runs: number;
    readonly measuredFrames: number;
    readonly complianceRatio: number;
    readonly emergencyOverrideRatio: number;
    readonly conflictRatio: number;
    readonly averageFlagPickups: number;
    readonly averageFlagCaptures: number;
  }>>;
}

export interface PremiumBotAuditReport {
  readonly schemaVersion: 2;
  readonly config: {
    readonly frameDeltaMs: number;
    readonly runsPerMapMode: number;
    readonly durationMs: number;
    readonly teamSize: ArenaTeamSize | null;
    readonly teamSizes: readonly ArenaTeamSize[];
    readonly maps: readonly string[];
    readonly modes: readonly AuditModeId[];
    readonly deterministicVariation: string;
  };
  readonly logicInventory: ReturnType<typeof createLogicInventory>;
  readonly runs: readonly PremiumBotAuditRunResult[];
  readonly aggregates: readonly PremiumBotAuditAggregate[];
  readonly findings: readonly PremiumBotAuditIssue[];
}

type BotController =
  | TdmBotController
  | ClassicCtfBotController
  | OneFlagBotController;

interface BotHarness {
  readonly participant: ArenaParticipant;
  readonly controller: BotController;
  readonly navigator: GridBotNavigator;
  readonly receivesHumanCommand: boolean;
}

interface NormalizedDecision {
  readonly kind: string;
  readonly targetKey: string;
  readonly holdPosition: boolean;
  readonly combatTargetId: string | null;
}

interface MutableActorMetric {
  readonly actorId: string;
  readonly teamId: ArenaTeamId;
  activeMs: number;
  respawnInactiveMs: number;
  travelDistance: number;
  longestStationaryMs: number;
  currentStationaryMs: number;
  moveIntentMs: number;
  longestMoveIntentStallMs: number;
  currentMoveIntentStallMs: number;
  intentionalHoldMs: number;
  longestSilentHoldMs: number;
  currentSilentHoldMs: number;
  longestWeaponlessStandoffMs: number;
  currentWeaponlessStandoffMs: number;
  blockedGoalFrames: number;
  pathMissFrames: number;
  repathCount: number;
  goalSwitches: number;
  targetKeySwitches: number;
  directionReversals: number;
  shots: number;
  pickups: number;
  kills: number;
  deaths: number;
  damageEventsCaused: number;
  readonly decisionFrames: Record<string, number>;
  commandMeasuredFrames: number;
  commandCompliantFrames: number;
  commandEmergencyOverrideFrames: number;
  commandConflictFrames: number;
  lastDecisionKind: string | null;
  lastTargetKey: string;
  lastMoveDirection: WorldPosition | null;
}

export function createPremiumBotAuditRunProfiles(
  modeId: AuditModeId,
  mapId: string,
  runCount: number,
): readonly PremiumBotAuditRunProfile[] {
  const safeCount = Math.max(1, Math.min(10, Math.floor(runCount)));
  const ctfCommands: readonly AuditCommandProfile[] = [
    "auto",
    "defend",
    "follow",
    "attack",
    "cycle",
    "auto",
  ];
  return Array.from({ length: safeCount }, (_, runIndex) => {
    const commandProfile = modeId === "classic-ctf"
      ? ctfCommands[runIndex % ctfCommands.length]!
      : "not-applicable";
    const perturbationIndex = modeId === "classic-ctf" && runIndex < 5
      ? 0
      : runIndex;
    return {
      runIndex,
      name: modeId === "classic-ctf"
        ? `${commandProfile}${perturbationIndex > 0 ? "-perturbed" : ""}`
        : runIndex === 0 ? "baseline" : `perturbation-${runIndex}`,
      seed: `${mapId}:${modeId}:run-${runIndex}`,
      commandProfile,
      perturbationIndex,
      usesHumanProxy: modeId === "classic-ctf",
    };
  });
}

export function runPremiumBotAudit(
  options: PremiumBotAuditOptions = {},
): PremiumBotAuditReport {
  const runsPerMapMode = Math.max(
    1,
    Math.min(
      10,
      Math.floor(options.runsPerMapMode ?? PREMIUM_BOT_AUDIT_DEFAULT_RUNS),
    ),
  );
  const durationMs = Math.max(
    1_000,
    Math.floor(options.durationMs ?? PREMIUM_BOT_AUDIT_DEFAULT_DURATION_MS),
  );
  const teamSizes = normalizeTeamSizes(
    options.teamSizes ??
      (options.teamSize ? [options.teamSize] : PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZES),
  );
  const runs = PREMIUM_BOT_AUDIT_MAPS.flatMap((map) =>
    PREMIUM_BOT_AUDIT_MODES.flatMap((modeId) =>
      teamSizes.flatMap((teamSize) =>
        createPremiumBotAuditRunProfiles(modeId, map.id, runsPerMapMode).map(
          (profile) =>
            runPremiumBotAuditScenario({
              map,
              modeId,
              teamSize,
              durationMs,
              profile: {
                ...profile,
                seed: `${profile.seed}:team-${teamSize}`,
              },
            }),
        )
      )
    )
  );
  return {
    schemaVersion: 2,
    config: {
      frameDeltaMs: PREMIUM_BOT_AUDIT_FRAME_MS,
      runsPerMapMode,
      durationMs,
      teamSize: teamSizes.length === 1 ? teamSizes[0]! : null,
      teamSizes,
      maps: PREMIUM_BOT_AUDIT_MAPS.map((map) => map.id),
      modes: PREMIUM_BOT_AUDIT_MODES,
      deterministicVariation:
        "Stable start-position perturbations; CTF compares auto, defend, follow, attack and a timed command cycle.",
    },
    logicInventory: createLogicInventory(),
    runs,
    aggregates: createAggregates(runs),
    findings: runs.flatMap((run) => run.issues),
  };
}

export function runPremiumBotAuditScenario(input: {
  readonly map: WorldMapData;
  readonly modeId: AuditModeId;
  readonly teamSize: ArenaTeamSize;
  readonly durationMs: number;
  readonly profile: PremiumBotAuditRunProfile;
}): PremiumBotAuditRunResult {
  const participants = createArenaRoster(input.teamSize);
  const runtime = new GameplayCoreRuntime({
    mode: createMode(input.modeId, input.map),
    createWorld: () => {
      const world = createWorld(
        input.modeId,
        input.map,
        input.teamSize,
      );
      applyDeterministicStartVariation(
        world,
        input.map,
        input.profile.perturbationIndex,
        input.profile.seed,
      );
      return world;
    },
  });
  runtime.initialize();
  const coordinatorParticipants = input.profile.usesHumanProxy
    ? participants.filter((participant) =>
      participant.actorId !== "blue-player"
    )
    : participants;
  const coordinator = new ArenaBotTeamCoordinator(
    input.modeId,
    input.map,
    coordinatorParticipants,
    input.profile.usesHumanProxy ? ["blue-player"] : [],
  );
  const harnesses = participants.map((participant) =>
    createHarness(
      input.modeId,
      input.map,
      participant,
      input.profile,
      input.profile.usesHumanProxy && participant.actorId === "blue-player"
        ? undefined
        : coordinator,
    )
  );
  const metrics = new Map(
    participants.map((participant) => [
      participant.actorId,
      createMutableMetric(participant),
    ]),
  );
  let activeCommand: ClassicCtfTeamCommand = "auto";
  let scoreEvents = 0;
  let flagPickups = 0;
  let flagCaptures = 0;
  let noActionFrames = 0;
  let invalidPositionFrames = 0;
  let simulatedDurationMs = 0;
  const decisionCpuMs: number[] = [];
  const decisionTraceSamples: PremiumBotDecisionTraceSample[] = [];
  const frameCount = Math.ceil(input.durationMs / PREMIUM_BOT_AUDIT_FRAME_MS);

  for (let frame = 1; frame <= frameCount; frame += 1) {
    const before = runtime.snapshot;
    activeCommand = commandAtTime(
      input.profile.commandProfile,
      (frame - 1) * PREMIUM_BOT_AUDIT_FRAME_MS,
      input.durationMs,
    );
    for (const harness of harnesses) {
      if (!harness.receivesHumanCommand) continue;
      (harness.controller as ClassicCtfBotController).setTeamCommand(
        "blue",
        activeCommand,
      );
    }
    const decisionStartedAt = performance.now();
    const actions = harnesses.flatMap((harness) =>
      harness.controller.readActions(before, PREMIUM_BOT_AUDIT_FRAME_MS)
    );
    decisionCpuMs.push(performance.now() - decisionStartedAt);
    if (actions.length === 0) noActionFrames += 1;
    const result = runtime.advance({
      sequence: frame,
      timeMs: frame * PREMIUM_BOT_AUDIT_FRAME_MS,
      deltaMs: PREMIUM_BOT_AUDIT_FRAME_MS,
      actions,
    });
    simulatedDurationMs = frame * PREMIUM_BOT_AUDIT_FRAME_MS;
    scoreEvents += countEvents(result.events, "score.awarded");
    flagPickups += countEvents(result.events, "objective.flagPickedUp");
    flagCaptures += countEvents(result.events, "objective.flagCaptured");
    captureEventMetrics(metrics, result.events);
    const moveByActor = new Map(
      actions.filter((action) => action.action === "move").map((action) => [
        action.actorId,
        action,
      ]),
    );
    const firedActors = new Set(
      actions.filter((action) => action.action === "fireWeapon")
        .map((action) => action.actorId),
    );

    for (const harness of harnesses) {
      const metric = metrics.get(harness.participant.actorId)!;
      const previous = actorFor(before, harness.participant.actorId);
      const current = actorFor(result.snapshot, harness.participant.actorId);
      if (!previous || !current) continue;
      if (
        !Number.isFinite(current.position.x) ||
        !Number.isFinite(current.position.y)
      ) {
        invalidPositionFrames += 1;
        continue;
      }
      captureFrameMetric({
        metric,
        previous,
        current,
        move: moveByActor.get(harness.participant.actorId),
        fired: firedActors.has(harness.participant.actorId),
        decision: normalizedDecision(harness.controller),
        navigator: harness.navigator.debugSnapshot(),
        snapshot: before,
        command: harness.receivesHumanCommand
          ? metricCommandFor(harness.controller, activeCommand)
          : null,
      });
      const navigatorDebug = harness.navigator.debugSnapshot();
      if (
        frame % Math.max(
          1,
          Math.round(1_000 / PREMIUM_BOT_AUDIT_FRAME_MS),
        ) === 0 ||
        navigatorDebug.recoveryStage > 0 ||
        metric.currentMoveIntentStallMs > 0
      ) {
        decisionTraceSamples.push(createDecisionTraceSample(
          simulatedDurationMs,
          current,
          harness.controller,
          navigatorDebug,
        ));
      }
    }
    if (result.snapshot.match?.phase === "ended") break;
  }

  const actors = [...metrics.values()].map(freezeMetric);
  const baseResult = {
    label:
      `${input.map.displayName} / ${labelForMode(input.modeId)} / ${input.profile.name}`,
    mapId: input.map.id,
    mapName: input.map.displayName,
    modeId: input.modeId,
    teamSize: input.teamSize,
    runIndex: input.profile.runIndex,
    profile: input.profile,
    simulatedDurationMs,
    matchEnded: runtime.snapshot.match?.phase === "ended",
    scoreEvents,
    flagPickups,
    flagCaptures,
    noActionFrames,
    invalidPositionFrames,
    averageDecisionCpuMsPerFrame: round(
      decisionCpuMs.reduce((sum, value) => sum + value, 0) /
        Math.max(1, decisionCpuMs.length),
      4,
    ),
    p95DecisionCpuMsPerFrame: round(percentile(decisionCpuMs, .95), 4),
    maximumDecisionCpuMsPerFrame: round(Math.max(0, ...decisionCpuMs), 4),
    actors,
  };
  const issues = detectRunIssues(baseResult);
  const actionableIssues = issues.filter((issue) =>
    issue.severity !== "info"
  );
  const actorIssues = new Set(
    actionableIssues.flatMap((issue) =>
      issue.actorId ? [issue.actorId] : actors.map((actor) => actor.actorId)
    ),
  );
  return {
    ...baseResult,
    decisionTrace: actionableIssues.length > 0
      ? decisionTraceSamples.filter((sample) =>
        actorIssues.has(sample.actorId)
      )
      : [],
    issues,
  };
}

function createHarness(
  modeId: AuditModeId,
  map: WorldMapData,
  participant: ArenaParticipant,
  profile: PremiumBotAuditRunProfile,
  coordinator?: ArenaBotTeamCoordinator,
): BotHarness {
  const navigator = new GridBotNavigator();
  if (modeId === "team-deathmatch") {
    return {
      participant,
      navigator,
      controller: new TdmBotController(
        participant.actorId,
        undefined,
        undefined,
        navigator,
        undefined,
        participant.slot,
        [],
        undefined,
        undefined,
        coordinator,
      ),
      receivesHumanCommand: false,
    };
  }
  if (modeId === "one-flag") {
    return {
      participant,
      navigator,
      controller: new OneFlagBotController(
        participant.actorId,
        map,
        undefined,
        navigator,
        undefined,
        undefined,
        undefined,
        coordinator,
      ),
      receivesHumanCommand: false,
    };
  }
  return {
    participant,
    navigator,
    controller: new ClassicCtfBotController(
      participant.actorId,
      classicCtfRoleForSlot(participant.slot),
      map,
      undefined,
      navigator,
      undefined,
      undefined,
      undefined,
      coordinator,
    ),
    receivesHumanCommand:
      profile.usesHumanProxy &&
      participant.teamId === "blue" &&
      participant.actorId !== "blue-player",
  };
}

function createMode(modeId: AuditModeId, map: WorldMapData) {
  if (modeId === "team-deathmatch") return new TeamDeathmatchMode();
  if (modeId === "classic-ctf") return new ClassicCtfMode(map);
  return new OneFlagMode(map);
}

function createWorld(
  modeId: AuditModeId,
  map: WorldMapData,
  teamSize: ArenaTeamSize,
): WorldState {
  if (modeId === "team-deathmatch") {
    return createTeamDeathmatchWorldState(map, { teamSize });
  }
  if (modeId === "classic-ctf") {
    return createClassicCtfWorldState(map, { teamSize });
  }
  return createOneFlagWorldState(map, { teamSize });
}

function createMutableMetric(
  participant: ArenaParticipant,
): MutableActorMetric {
  return {
    actorId: participant.actorId,
    teamId: participant.teamId,
    activeMs: 0,
    respawnInactiveMs: 0,
    travelDistance: 0,
    longestStationaryMs: 0,
    currentStationaryMs: 0,
    moveIntentMs: 0,
    longestMoveIntentStallMs: 0,
    currentMoveIntentStallMs: 0,
    intentionalHoldMs: 0,
    longestSilentHoldMs: 0,
    currentSilentHoldMs: 0,
    longestWeaponlessStandoffMs: 0,
    currentWeaponlessStandoffMs: 0,
    blockedGoalFrames: 0,
    pathMissFrames: 0,
    repathCount: 0,
    goalSwitches: 0,
    targetKeySwitches: 0,
    directionReversals: 0,
    shots: 0,
    pickups: 0,
    kills: 0,
    deaths: 0,
    damageEventsCaused: 0,
    decisionFrames: {},
    commandMeasuredFrames: 0,
    commandCompliantFrames: 0,
    commandEmergencyOverrideFrames: 0,
    commandConflictFrames: 0,
    lastDecisionKind: null,
    lastTargetKey: "",
    lastMoveDirection: null,
  };
}

function captureFrameMetric(input: {
  readonly metric: MutableActorMetric;
  readonly previous: NonNullable<ReturnType<typeof actorFor>>;
  readonly current: NonNullable<ReturnType<typeof actorFor>>;
  readonly move: CoreActionIntent | undefined;
  readonly fired: boolean;
  readonly decision: NormalizedDecision;
  readonly navigator: GridBotNavigatorDebugState;
  readonly snapshot: WorldSnapshot;
  readonly command: ClassicCtfTeamCommand | null;
}): void {
  const {
    metric,
    previous,
    current,
    move,
    fired,
    decision,
    navigator,
    snapshot,
    command,
  } = input;
  if (previous.lifeState !== "active") {
    metric.respawnInactiveMs += PREMIUM_BOT_AUDIT_FRAME_MS;
    resetTransientMetricStreaks(metric);
    return;
  }
  metric.activeMs += PREMIUM_BOT_AUDIT_FRAME_MS;
  const stepDistance = distance(previous.position, current.position);
  metric.travelDistance += stepDistance;
  const stationary = stepDistance < .75;
  if (stationary) {
    metric.currentStationaryMs += PREMIUM_BOT_AUDIT_FRAME_MS;
    metric.longestStationaryMs = Math.max(
      metric.longestStationaryMs,
      metric.currentStationaryMs,
    );
  } else {
    metric.currentStationaryMs = 0;
  }

  const moveMagnitude = move?.magnitude ?? 0;
  const direction = move?.direction ?? { x: 0, y: 0 };
  if (moveMagnitude > 0) {
    metric.moveIntentMs += PREMIUM_BOT_AUDIT_FRAME_MS;
    if (stationary) {
      metric.currentMoveIntentStallMs += PREMIUM_BOT_AUDIT_FRAME_MS;
      metric.longestMoveIntentStallMs = Math.max(
        metric.longestMoveIntentStallMs,
        metric.currentMoveIntentStallMs,
      );
    } else {
      metric.currentMoveIntentStallMs = 0;
    }
    if (
      metric.lastMoveDirection &&
      vectorLength(direction) > .5 &&
      dot(metric.lastMoveDirection, direction) < -.65
    ) {
      metric.directionReversals += 1;
    }
    metric.lastMoveDirection = vectorLength(direction) > .5
      ? normalized(direction)
      : metric.lastMoveDirection;
  } else {
    metric.intentionalHoldMs += PREMIUM_BOT_AUDIT_FRAME_MS;
    metric.currentMoveIntentStallMs = 0;
    if (!fired && decision.holdPosition) {
      metric.currentSilentHoldMs += PREMIUM_BOT_AUDIT_FRAME_MS;
      metric.longestSilentHoldMs = Math.max(
        metric.longestSilentHoldMs,
        metric.currentSilentHoldMs,
      );
      const combatTarget = decision.combatTargetId
        ? actorFor(snapshot, decision.combatTargetId)
        : null;
      if (!canPotentiallyAttack(previous, combatTarget, snapshot)) {
        metric.currentWeaponlessStandoffMs += PREMIUM_BOT_AUDIT_FRAME_MS;
        metric.longestWeaponlessStandoffMs = Math.max(
          metric.longestWeaponlessStandoffMs,
          metric.currentWeaponlessStandoffMs,
        );
      } else {
        metric.currentWeaponlessStandoffMs = 0;
      }
    } else {
      metric.currentSilentHoldMs = 0;
      metric.currentWeaponlessStandoffMs = 0;
    }
  }

  if (navigator.repathed) metric.repathCount += 1;
  if (navigator.goalBlocked) metric.blockedGoalFrames += 1;
  const targetDistance = navigator.target
    ? distance(current.position, navigator.target)
    : 0;
  if (
    moveMagnitude > 0 &&
    targetDistance > 48 &&
    !navigator.pathFound
  ) {
    metric.pathMissFrames += 1;
  }
  metric.decisionFrames[decision.kind] =
    (metric.decisionFrames[decision.kind] ?? 0) + 1;
  if (
    metric.lastDecisionKind &&
    metric.lastDecisionKind !== decision.kind
  ) {
    metric.goalSwitches += 1;
  }
  metric.lastDecisionKind = decision.kind;
  if (metric.lastTargetKey && metric.lastTargetKey !== decision.targetKey) {
    metric.targetKeySwitches += 1;
  }
  metric.lastTargetKey = decision.targetKey;
  captureCommandMetric(metric, command, decision.kind);
}

function captureCommandMetric(
  metric: MutableActorMetric,
  command: ClassicCtfTeamCommand | null,
  goalKind: string,
): void {
  if (!command || command === "auto") return;
  metric.commandMeasuredFrames += 1;
  if (goalKind === "return-flag" || goalKind === "recover-own-flag") {
    metric.commandEmergencyOverrideFrames += 1;
    return;
  }
  const compliant = command === "defend"
    ? goalKind === "defend-base" || goalKind === "patrol-base"
    : command === "follow"
    ? goalKind === "follow-player"
    : goalKind === "attack-flag" || goalKind === "escort-carrier";
  if (compliant) metric.commandCompliantFrames += 1;
  else metric.commandConflictFrames += 1;
}

function metricCommandFor(
  controller: BotController,
  fallback: ClassicCtfTeamCommand,
): ClassicCtfTeamCommand {
  if (!(controller instanceof ClassicCtfBotController)) return fallback;
  return controller.debugSnapshot().teamAssignment?.classicCtfCommand ??
    fallback;
}

function captureEventMetrics(
  metrics: ReadonlyMap<string, MutableActorMetric>,
  events: readonly GameEvent[],
): void {
  for (const event of events) {
    if (
      event.type.startsWith("weapon.") &&
      event.type.endsWith("Fired") &&
      event.sourceActorId
    ) {
      const metric = metrics.get(event.sourceActorId);
      if (metric) metric.shots += 1;
    }
    if (event.type === "pickup.collected" && event.targetActorId) {
      const metric = metrics.get(event.targetActorId);
      if (metric) metric.pickups += 1;
    }
    if (event.type === "actor.damaged" && event.sourceActorId) {
      const metric = metrics.get(event.sourceActorId);
      if (metric) metric.damageEventsCaused += 1;
    }
    if (event.type === "actor.died") {
      if (event.targetActorId) {
        const victim = metrics.get(event.targetActorId);
        if (victim) victim.deaths += 1;
      }
      if (event.sourceActorId && event.sourceActorId !== event.targetActorId) {
        const killer = metrics.get(event.sourceActorId);
        if (killer) killer.kills += 1;
      }
    }
  }
}

function normalizedDecision(controller: BotController): NormalizedDecision {
  if (controller instanceof TdmBotController) {
    const debug: TdmBotControllerDebugState = controller.debugSnapshot();
    return {
      kind: debug.intent,
      targetKey: debug.navigationTargetKey,
      holdPosition: debug.holdPosition,
      combatTargetId: debug.targetActorId,
    };
  }
  if (controller instanceof OneFlagBotController) {
    const debug: OneFlagBotControllerDebugState = controller.debugSnapshot();
    return {
      kind: debug.goalKind ?? "inactive",
      targetKey: debug.navigationTargetKey,
      holdPosition: debug.holdPosition,
      combatTargetId: debug.combatTargetId,
    };
  }
  const debug: ClassicCtfBotControllerDebugState =
    controller.debugSnapshot();
  return {
    kind: debug.goalKind ?? "inactive",
    targetKey: debug.navigationTargetKey,
    holdPosition: debug.holdPosition,
    combatTargetId: debug.combatTargetId,
  };
}

function createDecisionTraceSample(
  timeMs: number,
  actor: Readonly<{
    readonly id: string;
    readonly position: WorldPosition;
  }>,
  controller: BotController,
  navigator: GridBotNavigatorDebugState,
): PremiumBotDecisionTraceSample {
  const decision = normalizedDecision(controller);
  if (controller instanceof TdmBotController) {
    const debug = controller.debugSnapshot();
    return {
      timeMs,
      actorId: actor.id,
      position: { ...actor.position },
      decisionKind: decision.kind,
      targetKey: decision.targetKey,
      holdPosition: decision.holdPosition,
      combatTargetId: decision.combatTargetId,
      navigationTarget: navigator.projectedTarget
        ? { ...navigator.projectedTarget }
        : null,
      waypoint: navigator.currentWaypoint
        ? { ...navigator.currentWaypoint }
        : null,
      pathFound: navigator.pathFound,
      goalBlocked: navigator.goalBlocked,
      recoveryStage: navigator.recoveryStage,
      selectedWeaponId:
        debug.combatAssessment?.selectedWeaponId ??
        debug.combatAssessment?.movementWeaponId ??
        null,
      decisionReason: debug.intentTrace?.selectedReason ?? debug.intent,
      steeringReason: debug.steering.reason,
      teamReason: debug.teamAssignment?.reason ?? "individual",
    };
  }
  const debug = controller.debugSnapshot();
  return {
    timeMs,
    actorId: actor.id,
    position: { ...actor.position },
    decisionKind: decision.kind,
    targetKey: decision.targetKey,
    holdPosition: decision.holdPosition,
    combatTargetId: decision.combatTargetId,
    navigationTarget: navigator.projectedTarget
      ? { ...navigator.projectedTarget }
      : null,
    waypoint: navigator.currentWaypoint
      ? { ...navigator.currentWaypoint }
      : null,
    pathFound: navigator.pathFound,
    goalBlocked: navigator.goalBlocked,
    recoveryStage: navigator.recoveryStage,
    selectedWeaponId:
      debug.combatAssessment?.selectedWeaponId ??
      debug.combatAssessment?.movementWeaponId ??
      null,
    decisionReason: debug.targetTrace?.selectedReason ?? decision.kind,
    steeringReason: debug.steering.reason,
    teamReason: debug.teamAssignment?.reason ?? "individual",
  };
}

function commandAtTime(
  profile: AuditCommandProfile,
  timeMs: number,
  durationMs: number,
): ClassicCtfTeamCommand {
  if (profile === "not-applicable") return "auto";
  if (profile !== "cycle") return profile;
  const cycle: readonly ClassicCtfTeamCommand[] = [
    "defend",
    "follow",
    "attack",
    "auto",
  ];
  const segment = Math.min(
    cycle.length - 1,
    Math.floor(timeMs / Math.max(1, durationMs / cycle.length)),
  );
  return cycle[segment]!;
}

function applyDeterministicStartVariation(
  world: WorldState,
  map: WorldMapData,
  variation: number,
  seed: string,
): void {
  if (variation <= 0) return;
  for (const [index, actor] of world.actors.entries()) {
    const hash = hashText(`${seed}:${actor.id}:${index}`);
    const baseAngle = hash / 0xffffffff * Math.PI * 2;
    const preferredRadius = 28 + variation % 4 * 18;
    const candidate = findOpenStart(
      map,
      actor.position,
      actor.radius,
      baseAngle,
      preferredRadius,
    );
    actor.position = candidate;
  }
}

function findOpenStart(
  map: WorldMapData,
  origin: WorldPosition,
  actorRadius: number,
  baseAngle: number,
  preferredRadius: number,
): WorldPosition {
  for (const radius of [
    preferredRadius,
    preferredRadius + 24,
    Math.max(20, preferredRadius - 18),
    96,
  ]) {
    for (let step = 0; step < 12; step += 1) {
      const angle = baseAngle + step * Math.PI / 6;
      const candidate = {
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
      };
      if (measureWorldMapClearance(map, candidate).clearance >= actorRadius + 2) {
        return candidate;
      }
    }
  }
  return { ...origin };
}

function freezeMetric(
  metric: MutableActorMetric,
): PremiumBotAuditActorMetric {
  return {
    actorId: metric.actorId,
    teamId: metric.teamId,
    activeMs: metric.activeMs,
    respawnInactiveMs: metric.respawnInactiveMs,
    travelDistance: round(metric.travelDistance),
    longestStationaryMs: metric.longestStationaryMs,
    moveIntentMs: metric.moveIntentMs,
    longestMoveIntentStallMs: metric.longestMoveIntentStallMs,
    intentionalHoldMs: metric.intentionalHoldMs,
    longestSilentHoldMs: metric.longestSilentHoldMs,
    longestWeaponlessStandoffMs: metric.longestWeaponlessStandoffMs,
    blockedGoalFrames: metric.blockedGoalFrames,
    pathMissFrames: metric.pathMissFrames,
    repathCount: metric.repathCount,
    goalSwitches: metric.goalSwitches,
    targetKeySwitches: metric.targetKeySwitches,
    directionReversals: metric.directionReversals,
    shots: metric.shots,
    pickups: metric.pickups,
    kills: metric.kills,
    deaths: metric.deaths,
    damageEventsCaused: metric.damageEventsCaused,
    decisionFrames: { ...metric.decisionFrames },
    commandMeasuredFrames: metric.commandMeasuredFrames,
    commandCompliantFrames: metric.commandCompliantFrames,
    commandEmergencyOverrideFrames: metric.commandEmergencyOverrideFrames,
    commandConflictFrames: metric.commandConflictFrames,
  };
}

function detectRunIssues(
  run: Omit<PremiumBotAuditRunResult, "issues" | "decisionTrace">,
): readonly PremiumBotAuditIssue[] {
  const issues: PremiumBotAuditIssue[] = [];
  const add = (
    severity: AuditSeverity,
    code: string,
    detail: string,
    actorId?: string,
  ) => issues.push({
    severity,
    code,
    mapId: run.mapId,
    modeId: run.modeId,
    teamSize: run.teamSize,
    runIndex: run.runIndex,
    actorId,
    detail,
  });
  if (run.invalidPositionFrames > 0) {
    add(
      "critical",
      "invalid-position",
      `${run.invalidPositionFrames} Frames enthielten nicht-endliche Positionen.`,
    );
  }
  if (run.noActionFrames > 0) {
    add(
      "critical",
      "no-actions",
      `${run.noActionFrames} Frames hatten keinerlei Bot-Aktionen.`,
    );
  }
  if (run.p95DecisionCpuMsPerFrame > 4) {
    add(
      "warning",
      "decision-performance",
      `Die Botentscheidungen benoetigten im p95 ${run.p95DecisionCpuMsPerFrame} ms pro Frame.`,
    );
  }
  if (
    run.modeId !== "team-deathmatch" &&
    run.flagPickups === 0 &&
    run.simulatedDurationMs >= 12_000
  ) {
    add(
      "warning",
      "no-objective-contact",
      "Im gesamten Lauf wurde keine Flagge aufgenommen.",
    );
  }
  if (
    run.modeId === "team-deathmatch" &&
    run.actors.reduce((sum, actor) => sum + actor.shots, 0) === 0
  ) {
    add(
      "warning",
      "no-combat-fire",
      "Im gesamten TDM-Lauf wurde kein erfolgreicher Waffenschuss erzeugt.",
    );
  }
  if (
    run.modeId === "team-deathmatch" &&
    run.scoreEvents === 0 &&
    run.actors.filter((actor) =>
      actor.longestWeaponlessStandoffMs >= 4_000
    ).length >= Math.ceil(run.actors.length / 2)
  ) {
    add(
      "warning",
      "combat-deadlock",
      "Mindestens die Haelfte der Bots hielt ohne einsetzbare Waffe lange Abstand; der Lauf erzeugte keinen Score.",
    );
  }
  for (const actor of run.actors) {
    const activeFrames = Math.max(
      1,
      Math.round(actor.activeMs / PREMIUM_BOT_AUDIT_FRAME_MS),
    );
    const recoveryWarningThreshold =
      V2_BOT_NAVIGATION_CONFIG.stuckEscapeMs ?? 1_800;
    if (actor.longestMoveIntentStallMs >= recoveryWarningThreshold) {
      add(
        "warning",
        "move-intent-stall",
        `Trotz Bewegungsabsicht ${actor.longestMoveIntentStallMs} ms ohne Fortschritt.`,
        actor.actorId,
      );
    } else if (actor.longestMoveIntentStallMs >= 1_000) {
      add(
        "info",
        "transient-move-stall",
        `Kurzer, innerhalb der gestuften Recovery liegender Bewegungsstall von ${actor.longestMoveIntentStallMs} ms.`,
        actor.actorId,
      );
    }
    if (
      actor.longestSilentHoldMs >= SILENT_COMBAT_HOLD_WARNING_MS &&
      actor.longestWeaponlessStandoffMs < 1_500
    ) {
      add(
        "warning",
        "silent-combat-hold",
        `Combat-Standoff hielt ${actor.longestSilentHoldMs} ms ohne Schuss.`,
        actor.actorId,
      );
    }
    if (actor.longestWeaponlessStandoffMs >= 1_500) {
      add(
        actor.longestWeaponlessStandoffMs >= 2_500 ? "warning" : "info",
        "weaponless-standoff",
        `Standoff hielt ${actor.longestWeaponlessStandoffMs} ms, obwohl keine Roster-Waffe in Reichweite, bereit und mit Munition versehen war.`,
        actor.actorId,
      );
    }
    if (actor.pathMissFrames / activeFrames >= .08) {
      add(
        "warning",
        "path-miss-rate",
        `${percent(actor.pathMissFrames / activeFrames)} der aktiven Frames hatten Bewegungsabsicht, aber keinen Pfad.`,
        actor.actorId,
      );
    }
    if (actor.blockedGoalFrames / activeFrames >= .08) {
      const blockingHasConsequence =
        actor.longestMoveIntentStallMs >= recoveryWarningThreshold ||
        actor.pathMissFrames / activeFrames >= .08;
      add(
        blockingHasConsequence ? "warning" : "info",
        "blocked-goal-rate",
        `${percent(actor.blockedGoalFrames / activeFrames)} der aktiven Frames zielten auf eine blockierte Zelle.`,
        actor.actorId,
      );
    }
    if (
      actor.activeMs >= 10_000 &&
      actor.travelDistance / (actor.activeMs / 1_000) < 18
    ) {
      add(
        "warning",
        "low-activity",
        `Nur ${round(actor.travelDistance / (actor.activeMs / 1_000))} Weg-Einheiten pro aktiver Sekunde.`,
        actor.actorId,
      );
    }
    if (
      actor.commandMeasuredFrames > 0 &&
      actor.commandConflictFrames / actor.commandMeasuredFrames >= .03
    ) {
      add(
        "warning",
        "command-conflict",
        `${percent(actor.commandConflictFrames / actor.commandMeasuredFrames)} der messbaren Kommando-Frames widersprachen dem Kommando ohne Flaggen-Notfall.`,
        actor.actorId,
      );
    }
    if (actor.directionReversals > activeFrames / 12) {
      add(
        "info",
        "direction-oscillation",
        `${actor.directionReversals} starke Richtungswechsel in ${activeFrames} aktiven Frames.`,
        actor.actorId,
      );
    }
  }
  return issues;
}

function createAggregates(
  runs: readonly PremiumBotAuditRunResult[],
): readonly PremiumBotAuditAggregate[] {
  return PREMIUM_BOT_AUDIT_MAPS.flatMap((map) =>
    PREMIUM_BOT_AUDIT_MODES.flatMap((modeId) =>
      [...new Set(
        runs.filter((run) =>
          run.mapId === map.id && run.modeId === modeId
        ).map((run) => run.teamSize),
      )].sort().map((teamSize) => {
      const selected = runs.filter((run) =>
        run.mapId === map.id &&
        run.modeId === modeId &&
        run.teamSize === teamSize
      );
      const actors = selected.flatMap((run) => run.actors);
      const activeFrames = actors.reduce(
        (sum, actor) =>
          sum + Math.max(1, actor.activeMs / PREMIUM_BOT_AUDIT_FRAME_MS),
        0,
      );
      const commandProfiles: Record<string, {
        runs: number;
        measuredFrames: number;
        complianceRatio: number;
        emergencyOverrideRatio: number;
        conflictRatio: number;
        averageFlagPickups: number;
        averageFlagCaptures: number;
      }> = {};
      for (const profile of new Set(
        selected.map((run) => run.profile.commandProfile),
      )) {
        const profileRuns = selected.filter((run) =>
          run.profile.commandProfile === profile
        );
        const commanded = profileRuns.flatMap((run) => run.actors).filter(
          (actor) => actor.commandMeasuredFrames > 0,
        );
        const measured = commanded.reduce(
          (sum, actor) => sum + actor.commandMeasuredFrames,
          0,
        );
        commandProfiles[profile] = {
          runs: profileRuns.length,
          measuredFrames: measured,
          complianceRatio: ratio(
            commanded.reduce(
              (sum, actor) => sum + actor.commandCompliantFrames,
              0,
            ),
            measured,
          ),
          emergencyOverrideRatio: ratio(
            commanded.reduce(
              (sum, actor) => sum + actor.commandEmergencyOverrideFrames,
              0,
            ),
            measured,
          ),
          conflictRatio: ratio(
            commanded.reduce(
              (sum, actor) => sum + actor.commandConflictFrames,
              0,
            ),
            measured,
          ),
          averageFlagPickups: average(
            profileRuns.map((run) => run.flagPickups),
          ),
          averageFlagCaptures: average(
            profileRuns.map((run) => run.flagCaptures),
          ),
        };
      }
      return {
        mapId: map.id,
        modeId,
        teamSize,
        runCount: selected.length,
        criticalIssues: selected.flatMap((run) => run.issues).filter(
          (issue) => issue.severity === "critical",
        ).length,
        warnings: selected.flatMap((run) => run.issues).filter(
          (issue) => issue.severity === "warning",
        ).length,
        averageScoreEvents: average(
          selected.map((run) => run.scoreEvents),
        ),
        averageFlagPickups: average(
          selected.map((run) => run.flagPickups),
        ),
        averageFlagCaptures: average(
          selected.map((run) => run.flagCaptures),
        ),
        averageTravelPerActiveSecond: round(ratio(
          actors.reduce((sum, actor) => sum + actor.travelDistance, 0),
          actors.reduce((sum, actor) => sum + actor.activeMs / 1_000, 0),
        )),
        maximumMoveIntentStallMs: Math.max(
          0,
          ...actors.map((actor) => actor.longestMoveIntentStallMs),
        ),
        maximumSilentHoldMs: Math.max(
          0,
          ...actors.map((actor) => actor.longestSilentHoldMs),
        ),
        maximumWeaponlessStandoffMs: Math.max(
          0,
          ...actors.map((actor) => actor.longestWeaponlessStandoffMs),
        ),
        blockedGoalFrameRatio: round(ratio(
          actors.reduce((sum, actor) => sum + actor.blockedGoalFrames, 0),
          activeFrames,
        ), 4),
        pathMissFrameRatio: round(ratio(
          actors.reduce((sum, actor) => sum + actor.pathMissFrames, 0),
          activeFrames,
        ), 4),
        maximumP95DecisionCpuMsPerFrame: Math.max(
          0,
          ...selected.map((run) => run.p95DecisionCpuMsPerFrame),
        ),
        commandProfiles,
      };
    }))
  );
}

export function formatPremiumBotAuditMarkdown(
  report: PremiumBotAuditReport,
  metadata?: {
    readonly runId?: string;
    readonly timestamp?: string;
    readonly gitCommit?: string;
    readonly gitDirty?: boolean;
  },
): string {
  const warningCounts = countBy(report.findings, (issue) => issue.code);
  const lines = [
    "# Premium-Map Bot-Audit",
    "",
    `- Lauf: ${metadata?.runId ?? "in-memory"}`,
    `- Zeitpunkt: ${metadata?.timestamp ?? "nicht gespeichert"}`,
    `- Git: ${metadata?.gitCommit ?? "unbekannt"}${metadata?.gitDirty ? " (dirty)" : ""}`,
    `- Matrix: 3 Maps x 3 Modi x ${report.config.teamSizes.length} Teamgroessen x ${report.config.runsPerMapMode} Laeufe`,
    `- Teamgroessen: ${report.config.teamSizes.map((size) => `${size}v${size}`).join(", ")}`,
    `- Dauer je Lauf: ${report.config.durationMs} ms bei ${report.config.frameDeltaMs} ms/Frame`,
    "",
    "## Aggregierte Ergebnisse",
    "",
    "| Map | Modus | Team | Laeufe | Kritisch | Warnungen | Score Avg | Flag-Pickups Avg | Captures Avg | Weg/s | max. Move-Stall | max. stiller Hold | max. waffenloser Hold | blockierte Ziele | Pfadfehler | KI p95 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.aggregates.map((aggregate) => [
      aggregate.mapId,
      labelForMode(aggregate.modeId),
      `${aggregate.teamSize}v${aggregate.teamSize}`,
      aggregate.runCount,
      aggregate.criticalIssues,
      aggregate.warnings,
      aggregate.averageScoreEvents,
      aggregate.averageFlagPickups,
      aggregate.averageFlagCaptures,
      aggregate.averageTravelPerActiveSecond,
      `${aggregate.maximumMoveIntentStallMs} ms`,
      `${aggregate.maximumSilentHoldMs} ms`,
      `${aggregate.maximumWeaponlessStandoffMs} ms`,
      percent(aggregate.blockedGoalFrameRatio),
      percent(aggregate.pathMissFrameRatio),
      `${aggregate.maximumP95DecisionCpuMsPerFrame} ms`,
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |")),
    "",
    "## CTF-Kommandowirkung",
    "",
    "| Map | Team | Profil | Laeufe | Befolgt | Notfall-Override | Konflikt | Pickups Avg | Captures Avg |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.aggregates.filter((aggregate) =>
      aggregate.modeId === "classic-ctf"
    ).flatMap((aggregate) =>
      Object.entries(aggregate.commandProfiles).map(([profile, command]) =>
        [
          aggregate.mapId,
          `${aggregate.teamSize}v${aggregate.teamSize}`,
          profile,
          command.runs,
          command.measuredFrames > 0 ? percent(command.complianceRatio) : "n/a",
          command.measuredFrames > 0
            ? percent(command.emergencyOverrideRatio)
            : "n/a",
          command.measuredFrames > 0 ? percent(command.conflictRatio) : "n/a",
          command.averageFlagPickups,
          command.averageFlagCaptures,
        ].join(" | ").replace(/^/, "| ").replace(/$/, " |")
      )
    ),
    "",
    "## Automatische Befunde",
    "",
    report.findings.length === 0
      ? "- Keine Schwellwertverletzungen gefunden."
      : Object.entries(warningCounts)
        .sort((left, right) => right[1] - left[1])
        .map(([code, count]) => `- ${code}: ${count}`)
        .join("\n"),
    "",
    "## Wichtigste Einzelbefunde",
    "",
    ...report.findings.slice(0, 40).map((issue) =>
      `- **${issue.severity.toUpperCase()} ${issue.code}** · ${issue.mapId} · ${labelForMode(issue.modeId)} · Lauf ${issue.runIndex}${issue.actorId ? ` · ${issue.actorId}` : ""}: ${issue.detail}`
    ),
    ...(report.findings.length > 40
      ? [`- … ${report.findings.length - 40} weitere Befunde stehen in der JSON-Datei.`]
      : []),
    "",
    "## Einordnung",
    "",
    "- `intentionalHoldMs` ist eine bewusste Standoff-Entscheidung und kein Navigatorfehler.",
    `- \`silent-combat-hold\` markiert erst einen Standoff von mindestens ${SILENT_COMBAT_HOLD_WARNING_MS} ms ohne erfolgreichen Schuss; der normale Rail-Cooldown allein ist kein Fehler.`,
    "- `respawnInactiveMs` ist Tot-/Respawnzeit und wird nicht als Bot-Leerlauf gewertet.",
    "- CTF-Notfaelle (eigene Flagge verloren oder selbst Flagge getragen) duerfen menschliche Kommandos ueberstimmen.",
    "- Die Laeufe sind reproduzierbar, variieren aber kontrolliert die Startpositionen. Sie sind kein Ersatz fuer visuelles Spielgefuehl-QA.",
    "",
  ];
  return lines.join("\n");
}

function createLogicInventory() {
  return {
    shared: {
      navigation:
        "A* auf 40er Raster; 420 ms Basis-Repath plus deterministische Entzerrung; Zielprojektion, Pfadglaettung, Eckenregel, Jump-Anlauf und dreistufige Stuck-Recovery.",
      perception:
        "Begrenzte Sichtweite, 165er Nahwahrnehmung, 1.250 ms Erinnerung; reines Team- oder Objective-Wissen erlaubt Suche, aber keinen Schuss.",
      combat:
        "Gemeinsame Combat-Opportunity fuer Bewegung und Feuer nach Sicht, Distanz, Roster, Munition und Cooldown; Rocket-Vorhalt, Rail-Reaktion und waffenspezifische Distanzbaender.",
      standoff:
        "Halten nur mit einer an der aktuellen Distanz taktisch einsetzbaren Waffe; sonst Annaeherung, Verfolgung oder Rueckzug fuer die beste verfuegbare Waffe.",
      localMovement:
        "Lokale Team-Separation und deterministisches Seitwaertsausweichen vor gefaehrlichen gegnerischen Projektilen.",
    },
    teamDeathmatch: {
      target:
        "Utility-Zielwahl aus Sicht, Entfernung, Health und Gefahr; Teamkoordinator verteilt Reservierungen auf mehrere Gegner.",
      pickups:
        "Health, Armor und fehlende bevorzugte Roster-Waffe werden gegen die aktuelle Kampfoption bewertet; 850 ms Zielbindung; menschennaher Waffenpickup kann reserviert sein.",
      formation:
        "Slotbasierte Lane-Ziele, Team-Separation und verteilte Kampfziele; Standoff nur mit realer Waffenoption.",
    },
    classicCtf: {
      priority:
        "Selbst getragene Flagge heimbringen > zugewiesene Flaggen-Notfallreaktion > verteiltes Human-Kommando > Carrier/Drop > dynamische Rollenlogik.",
      roles:
        "Teamgroessenabhaengige Angreifer-, Verteidiger- und Supportrollen mit 3.000 ms Bindung; hoechstens ein beziehungsweise in 4v4 zwei Notfallhelfer.",
      commands:
        "Follow bindet genau einen Bot; Defend und Attack sinnvolle Rollengruppen. Flaggen-Notfaelle werden getrennt als erlaubter Override gemessen.",
    },
    oneFlag: {
      priority:
        "Ein Runner bei Home-Flag; Carrier mit Escort/Screen; Gegner-Carrier mit Interceptor/Cutoff; weitere Bots kontrollieren Raum.",
      dynamicTargets:
        "Carrier-/Escort-Ziele werden lokal auf freie Punkte projiziert; Formationen bleiben bei gleicher Situation 2.000 ms gebunden.",
    },
    knownConflictCandidates: [
      "Dynamische Carrier- oder Kampfziele koennen trotz Bindung zusaetzliche Repaths ausloesen.",
      "CTF-Kommandos werden absichtlich von zugewiesenen Flaggen-Notfaellen ueberstimmt.",
      "Ein erreichbarer Zielpunkt kann in der Navigator-Padding-Sicht blockiert sein, obwohl die Gameplay-Kollision ihn optisch zulaesst.",
      "Pickup- und Zielbindung koennen eine inzwischen knapp bessere Alternative kurzfristig ueberstimmen.",
      "Node-CPU-Messungen reagieren auf Systemlast und ersetzen kein Browserprofil auf dem Zielgeraet.",
    ],
  } as const;
}

function actorFor(snapshot: WorldSnapshot, actorId: string) {
  return snapshot.actors.find((actor) => actor.id === actorId) ?? null;
}

function countEvents(events: readonly GameEvent[], type: string): number {
  return events.filter((event) => event.type === type).length;
}

function resetTransientMetricStreaks(metric: MutableActorMetric): void {
  metric.currentStationaryMs = 0;
  metric.currentMoveIntentStallMs = 0;
  metric.currentSilentHoldMs = 0;
  metric.currentWeaponlessStandoffMs = 0;
  metric.lastMoveDirection = null;
}

function canPotentiallyAttack(
  actor: NonNullable<ReturnType<typeof actorFor>>,
  target: NonNullable<ReturnType<typeof actorFor>> | null,
  snapshot: WorldSnapshot,
): boolean {
  if (!target || target.lifeState !== "active") return false;
  return assessCombatOpportunity(
    actor,
    target,
    snapshot,
  ).canAttackAtCurrentRange;
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function vectorLength(value: WorldPosition): number {
  return Math.hypot(value.x, value.y);
}

function normalized(value: WorldPosition): WorldPosition {
  const length = vectorLength(value);
  return length > .0001
    ? { x: value.x / length, y: value.y / length }
    : { x: 0, y: 0 };
}

function dot(left: WorldPosition, right: WorldPosition): number {
  return left.x * right.x + left.y * right.y;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizeTeamSizes(
  values: readonly ArenaTeamSize[],
): readonly ArenaTeamSize[] {
  const normalized = [...new Set(values)].filter((value) =>
    value === 1 || value === 2 || value === 3 || value === 4
  ).sort() as ArenaTeamSize[];
  return normalized.length > 0
    ? normalized
    : [...PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZES];
}

function percentile(values: readonly number[], percentileRank: number): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(
      ordered.length - 1,
      Math.ceil(percentileRank * ordered.length) - 1,
    ),
  );
  return ordered[index] ?? 0;
}

function average(values: readonly number[]): number {
  return values.length > 0
    ? round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percent(value: number): string {
  return `${round(value * 100, 1)} %`;
}

function labelForMode(modeId: AuditModeId): string {
  if (modeId === "team-deathmatch") return "TDM";
  if (modeId === "classic-ctf") return "Classic CTF";
  return "One Flag";
}

function countBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyFor(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
