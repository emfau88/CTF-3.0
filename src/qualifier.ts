import type { GameEvent, CoreInputFrame, WorldState } from "./core";
import {
  createPickupState,
  createTeamDeathmatchWorldState,
  V2_ARENA_PICKUP_PARITY_CONFIG,
  type TeamDeathmatchModeConfig,
  type WorldMapData,
} from "./core";
import type { ArenaTeamSizes } from "./core/spawning";
import type { SavePort, TutorialAction } from "./platform";
import {
  withMatchEntryPoint,
} from "./platform";
import {
  buildV2MatchSearch,
  type V2PlayerSkinId,
  type V2SfxMode,
} from "./v2Route";

export const QUALIFIER_STORAGE_KEY = "core-arena.qualifier.v1";
export const QUALIFIER_ROUTE_PARAM = "qualifier";
export const QUALIFIER_TUTORIAL_EVENT = "core-arena-qualifier-action";
export const QUALIFIER_TUTORIAL_ACTIONS: readonly TutorialAction[] = [
  "move",
  "aim",
  "arc-lash",
  "pickup",
  "jump",
];

export const QUALIFIER_TDM_CONFIG: TeamDeathmatchModeConfig = {
  durationMs: 90_000,
  scoreLimit: 20,
  initialScores: [
    { id: "blue", teamId: "blue", score: 0 },
    { id: "red", teamId: "red", score: 0 },
  ],
};

export type QualifierAttemptKind = "first-run" | "training";
export type QualifierExitReason = "menu" | "restart" | "reload" | "closed";

export interface QualifierAttempt {
  readonly id: string;
  readonly kind: QualifierAttemptKind;
  readonly startedAt: string;
  completedActions: TutorialAction[];
}

export interface QualifierState {
  readonly version: 1;
  status: "not-started" | "in-progress" | "qualified";
  attemptCount: number;
  activeAttempt: QualifierAttempt | null;
  qualifiedAt: string | null;
  lastExitReason: QualifierExitReason | null;
  updatedAt: string;
}

export interface QualifierStartResult {
  readonly state: QualifierState;
  readonly started: boolean;
}

export interface QualifierActionResult {
  readonly state: QualifierState;
  readonly recorded: boolean;
}

export interface QualifierRepositoryOptions {
  readonly now?: () => string;
  readonly createAttemptId?: () => string;
}

export function createQualifierRepository(
  storage: SavePort,
  options: QualifierRepositoryOptions = {},
) {
  const now = options.now ?? (() => new Date().toISOString());
  const createAttemptId = options.createAttemptId ?? (() =>
    globalThis.crypto?.randomUUID?.() ??
    `qualifier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
  const save = (state: QualifierState): QualifierState => {
    storage.setItem(QUALIFIER_STORAGE_KEY, JSON.stringify(state));
    return state;
  };
  const load = (): QualifierState => {
    try {
      const raw = storage.getItem(QUALIFIER_STORAGE_KEY);
      if (!raw) return createEmptyQualifierState(now());
      const parsed: unknown = JSON.parse(raw);
      return isQualifierState(parsed) ? parsed : createEmptyQualifierState(now());
    } catch {
      return createEmptyQualifierState(now());
    }
  };
  return {
    load,
    start(kind: QualifierAttemptKind): QualifierStartResult {
      const state = load();
      if (state.activeAttempt?.kind === kind) return { state, started: false };
      const timestamp = now();
      state.attemptCount += 1;
      state.activeAttempt = {
        id: createAttemptId(),
        kind,
        startedAt: timestamp,
        completedActions: [],
      };
      if (state.status !== "qualified") state.status = "in-progress";
      state.lastExitReason = null;
      state.updatedAt = timestamp;
      return { state: save(state), started: true };
    },
    recordAction(action: TutorialAction): QualifierActionResult {
      const state = load();
      if (!state.activeAttempt || state.activeAttempt.completedActions.includes(action)) {
        return { state, recorded: false };
      }
      state.activeAttempt.completedActions.push(action);
      state.updatedAt = now();
      return { state: save(state), recorded: true };
    },
    complete(): QualifierState {
      const state = load();
      const timestamp = now();
      state.status = "qualified";
      state.qualifiedAt ??= timestamp;
      state.activeAttempt = null;
      state.lastExitReason = null;
      state.updatedAt = timestamp;
      return save(state);
    },
    abandon(reason: QualifierExitReason): QualifierState {
      const state = load();
      if (!state.activeAttempt) return state;
      state.activeAttempt = null;
      if (state.status !== "qualified") state.status = "not-started";
      state.lastExitReason = reason;
      state.updatedAt = now();
      return save(state);
    },
    clear(): void {
      storage.removeItem(QUALIFIER_STORAGE_KEY);
    },
  };
}

export function buildQualifierMatchSearch(options: {
  readonly kind?: QualifierAttemptKind;
  readonly skin: V2PlayerSkinId;
  readonly sfx: V2SfxMode;
}): string {
  const params = new URLSearchParams(withMatchEntryPoint(buildV2MatchSearch({
    mode: "tdm",
    map: "helix-canopy-v2",
    players: "bot",
    teamSize: 2,
    blueBots: 1,
    redBots: 2,
    blueBotDifficulty: "casual",
    redBotDifficulty: "casual",
    controls: "keyboard",
    skin: options.skin,
    sfx: options.sfx,
  }), "qualifier"));
  params.set(QUALIFIER_ROUTE_PARAM, "1");
  if (options.kind === "training") params.set("training", "1");
  return params.toString();
}

export function readQualifierAttemptKind(
  search: URLSearchParams,
): QualifierAttemptKind {
  return search.get("training") === "1" ? "training" : "first-run";
}

export function isQualifierMatch(search: URLSearchParams): boolean {
  return search.get(QUALIFIER_ROUTE_PARAM) === "1";
}

export function createQualifierWorld(
  map: WorldMapData,
  teamSizes: ArenaTeamSizes,
): WorldState {
  const world = createTeamDeathmatchWorldState(map, { teamSizes });
  if (world.map) world.map = {
    ...world.map,
    weaponRoster: ["whip", "pulse", "rocket"],
  };
  world.pickups = world.pickups.filter((pickup) =>
    pickup.type === "health" || pickup.type === "armor" || pickup.type === "pulse"
  );
  world.pickups.push(
    createPickupState({
      id: "qualifier-rocket-blue-base",
      type: "rocket",
      position: qualifierBaseFrontRocketPosition(map.gameplay.blueBase, "blue"),
    }, V2_ARENA_PICKUP_PARITY_CONFIG),
    createPickupState({
      id: "qualifier-rocket-red-base",
      type: "rocket",
      position: qualifierBaseFrontRocketPosition(map.gameplay.redBase, "red"),
    }, V2_ARENA_PICKUP_PARITY_CONFIG),
  );
  return world;
}

function qualifierBaseFrontRocketPosition(
  base: WorldMapData["gameplay"]["blueBase"],
  teamId: "blue" | "red",
): {
  x: number;
  y: number;
} {
  return {
    x: teamId === "blue"
      ? base.x + base.width + 80
      : base.x - 80,
    y: base.y + base.height / 2,
  };
}

export function detectQualifierTutorialActions(input: {
  readonly frame: CoreInputFrame;
  readonly events: readonly GameEvent[];
  readonly aimMoved: boolean;
}): readonly TutorialAction[] {
  const detected = new Set<TutorialAction>();
  if (input.frame.actions.some((action) =>
    action.action === "move" && (action.magnitude ?? 0) >= .35
  )) detected.add("move");
  if (input.aimMoved) detected.add("aim");
  if (input.frame.actions.some((action) => {
    if (action.action !== "fireWeapon" || action.phase !== "pressed") return false;
    const payload = action.payload as { weaponId?: unknown } | undefined;
    return payload?.weaponId === "whip";
  })) detected.add("arc-lash");
  if (input.frame.actions.some((action) =>
    action.action === "jump" && action.phase === "pressed"
  )) detected.add("jump");
  if (input.events.some((event) => {
    if (event.type !== "pickup.collected" || event.targetActorId !== "blue-player") {
      return false;
    }
    const payload = event.payload as { pickupType?: unknown } | undefined;
    return payload?.pickupType === "pulse";
  })) detected.add("pickup");
  return QUALIFIER_TUTORIAL_ACTIONS.filter((action) => detected.has(action));
}

function createEmptyQualifierState(timestamp: string): QualifierState {
  return {
    version: 1,
    status: "not-started",
    attemptCount: 0,
    activeAttempt: null,
    qualifiedAt: null,
    lastExitReason: null,
    updatedAt: timestamp,
  };
}

function isQualifierState(value: unknown): value is QualifierState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<QualifierState>;
  if (
    state.version !== 1 ||
    !["not-started", "in-progress", "qualified"].includes(state.status ?? "") ||
    !Number.isSafeInteger(state.attemptCount) ||
    state.attemptCount! < 0 ||
    typeof state.updatedAt !== "string" ||
    (state.qualifiedAt !== null && typeof state.qualifiedAt !== "string") ||
    ![null, "menu", "restart", "reload", "closed"].includes(state.lastExitReason ?? null)
  ) return false;
  if (state.activeAttempt === null) return true;
  if (!state.activeAttempt || typeof state.activeAttempt !== "object") return false;
  return typeof state.activeAttempt.id === "string" &&
    (state.activeAttempt.kind === "first-run" || state.activeAttempt.kind === "training") &&
    typeof state.activeAttempt.startedAt === "string" &&
    Array.isArray(state.activeAttempt.completedActions) &&
    state.activeAttempt.completedActions.every((action) =>
      QUALIFIER_TUTORIAL_ACTIONS.includes(action)
    );
}
