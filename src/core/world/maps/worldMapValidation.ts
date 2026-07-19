import type { GameModeId } from "../../modes";
import {
  arenaSpawnPointId,
  type ArenaTeamSize,
  type ArenaTeamSlot,
  DEFAULT_ARENA_TEAM_SIZE,
} from "../../spawning/arenaRoster";
import type { SpawnPoint } from "../../spawning/spawnProvider";
import {
  navigationJumpLinkHasApproach,
  navigationPathExists,
} from "../../bots/GridBotNavigator";
import type { WorldMapData, WorldMapPresentationRect } from "./worldMapData";

export interface WorldMapValidationIssue {
  readonly code:
    | "invalid-bounds"
    | "missing-red-base"
    | "missing-blue-base"
    | "missing-combat-zone"
    | "missing-red-player-spawn"
    | "missing-blue-player-spawn"
    | "missing-team-spawn"
    | "invalid-team-spawn"
    | "overlapping-team-spawns"
    | "missing-bot-profile"
    | "invalid-bot-zone"
    | "invalid-jump-link"
    | "unreachable-bot-target";
  readonly message: string;
}

export function validateWorldMapForMode(
  map: WorldMapData,
  modeId: GameModeId,
  teamSize: ArenaTeamSize = DEFAULT_ARENA_TEAM_SIZE,
): readonly WorldMapValidationIssue[] {
  const issues: WorldMapValidationIssue[] = [];
  const bounds = map.geometry.bounds;
  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    issues.push({
      code: "invalid-bounds",
      message: `${map.id} must define positive world bounds.`,
    });
  }
  if (!isValidRect(map.gameplay.redBase)) {
    issues.push({
      code: "missing-red-base",
      message: `${map.id} must define a red base area.`,
    });
  }
  if (!isValidRect(map.gameplay.blueBase)) {
    issues.push({
      code: "missing-blue-base",
      message: `${map.id} must define a blue base area.`,
    });
  }
  if (!hasTeamSpawn(map, "red", "red-player-spawn")) {
    issues.push({
      code: "missing-red-player-spawn",
      message: `${map.id} must define the red player spawn.`,
    });
  }
  if (!hasTeamSpawn(map, "blue", "blue-player-spawn")) {
    issues.push({
      code: "missing-blue-player-spawn",
      message: `${map.id} must define the blue player spawn.`,
    });
  }
  if (modeId === "one-flag" && !isValidRect(map.gameplay.combatZone)) {
    issues.push({
      code: "missing-combat-zone",
      message: `${map.id} must define a combat zone for One Flag.`,
    });
  }
  validateAdditionalTeamSpawns(map, teamSize, issues);
  validateBotProfileContract(map, issues);
  return issues;
}

export function validateWorldMapBotSupport(
  map: WorldMapData,
): readonly WorldMapValidationIssue[] {
  const issues: WorldMapValidationIssue[] = [];
  validateBotProfileContract(map, issues);
  const navigationSnapshot = {
    geometry: map.geometry,
    navigation: map.navigation,
  };
  const teamStarts = ["blue", "red"].map((teamId) =>
    map.spawnPoints.find((spawn) =>
      spawn.teamId === teamId && spawn.id === `${teamId}-player-spawn`
    )
  ).filter((spawn): spawn is SpawnPoint => spawn !== undefined);
  const targets = [
    ...map.pickupSpawns.map((pickup) => ({
      id: `pickup:${pickup.id}`,
      position: pickup.position,
    })),
    ...map.botProfile.tacticalZones.map((zone) => ({
      id: `zone:${zone.id}`,
      position: zone.position,
    })),
    {
      id: "base:blue",
      position: centerOf(map.gameplay.blueBase),
    },
    {
      id: "base:red",
      position: centerOf(map.gameplay.redBase),
    },
    ...(map.gameplay.combatZone
      ? [{
        id: "objective:combat-zone",
        position: centerOf(map.gameplay.combatZone),
      }]
      : []),
  ];
  for (const target of targets) {
    if (
      !pointInBounds(target.position, map) ||
      pointInRects(target.position, map.geometry.solids) ||
      pointInRects(target.position, map.geometry.gaps)
    ) {
      issues.push({
        code: "unreachable-bot-target",
        message: `${map.id} bot target ${target.id} is outside playable space.`,
      });
      continue;
    }
    for (const start of teamStarts) {
      if (
        !navigationPathExists(
          start.position,
          target.position,
          navigationSnapshot,
        )
      ) {
        issues.push({
          code: "unreachable-bot-target",
          message:
            `${map.id} bot target ${target.id} is unreachable from ${start.id}.`,
        });
      }
    }
  }
  return dedupeIssues(issues);
}

export function assertWorldMapSupportsMode(
  map: WorldMapData,
  modeId: GameModeId,
  teamSize: ArenaTeamSize = DEFAULT_ARENA_TEAM_SIZE,
): void {
  const issues = validateWorldMapForMode(map, modeId, teamSize);
  if (issues.length === 0) return;
  throw new Error(
    `Invalid ${modeId} map ${map.id}: ${issues.map((issue) => issue.message).join(" ")}`,
  );
}

function validateAdditionalTeamSpawns(
  map: WorldMapData,
  teamSize: ArenaTeamSize,
  issues: WorldMapValidationIssue[],
): void {
  for (const teamId of ["blue", "red"] as const) {
    const teamSpawns: SpawnPoint[] = [];
    for (let slot = 1; slot <= teamSize; slot++) {
      const spawnId = arenaSpawnPointId(teamId, slot as ArenaTeamSlot);
      const spawn = map.spawnPoints.find((candidate) =>
        candidate.id === spawnId && candidate.teamId === teamId
      );
      if (!spawn) {
        if (slot > 1) {
          issues.push({
            code: "missing-team-spawn",
            message: `${map.id} must define ${spawnId} for ${teamSize}v${teamSize}.`,
          });
        }
        continue;
      }
      teamSpawns.push(spawn);
      if (
        !pointInBounds(spawn.position, map) ||
        pointInRects(spawn.position, map.geometry.solids) ||
        pointInRects(spawn.position, map.geometry.gaps)
      ) {
        issues.push({
          code: "invalid-team-spawn",
          message: `${map.id} spawn ${spawnId} must be inside playable space.`,
        });
      }
    }
    for (let left = 0; left < teamSpawns.length; left++) {
      for (let right = left + 1; right < teamSpawns.length; right++) {
        const first = teamSpawns[left]!;
        const second = teamSpawns[right]!;
        if (distance(first.position, second.position) < 36) {
          issues.push({
            code: "overlapping-team-spawns",
            message: `${map.id} spawns ${first.id} and ${second.id} overlap.`,
          });
        }
      }
    }
  }
}

function validateBotProfileContract(
  map: WorldMapData,
  issues: WorldMapValidationIssue[],
): void {
  if (!map.botProfile || map.botProfile.version !== 1) {
    issues.push({
      code: "missing-bot-profile",
      message: `${map.id} must define botProfile version 1.`,
    });
    return;
  }
  const zoneIds = new Set<string>();
  for (const zone of map.botProfile.tacticalZones) {
    if (
      !zone.id ||
      zoneIds.has(zone.id) ||
      zone.radius <= 0 ||
      !pointInBounds(zone.position, map) ||
      pointInRects(zone.position, map.geometry.solids) ||
      pointInRects(zone.position, map.geometry.gaps)
    ) {
      issues.push({
        code: "invalid-bot-zone",
        message: `${map.id} bot zone ${zone.id || "<missing>"} must be unique and playable.`,
      });
    }
    zoneIds.add(zone.id);
  }
  const jumpIds = new Set<string>();
  for (const link of map.navigation.jumpLinks) {
    if (
      !link.id ||
      jumpIds.has(link.id) ||
      link.activationRadius <= 0 ||
      !pointInBounds(link.from, map) ||
      !pointInBounds(link.to, map) ||
      !navigationJumpLinkHasApproach(link, {
        geometry: map.geometry,
        navigation: map.navigation,
      })
    ) {
      issues.push({
        code: "invalid-jump-link",
        message: `${map.id} jump link ${link.id || "<missing>"} must have safe endpoints.`,
      });
    }
    jumpIds.add(link.id);
  }
}

function dedupeIssues(
  issues: readonly WorldMapValidationIssue[],
): WorldMapValidationIssue[] {
  const messages = new Set<string>();
  return issues.filter((issue) => {
    if (messages.has(issue.message)) return false;
    messages.add(issue.message);
    return true;
  });
}

function centerOf(rect: WorldMapPresentationRect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function hasTeamSpawn(
  map: WorldMapData,
  teamId: string,
  spawnId: string,
): boolean {
  return map.spawnPoints.some((spawn) =>
    spawn.id === spawnId && spawn.teamId === teamId
  );
}

function isValidRect(
  rect: WorldMapPresentationRect | undefined,
): rect is WorldMapPresentationRect {
  return rect !== undefined && rect.width > 0 && rect.height > 0;
}

function pointInBounds(
  point: { readonly x: number; readonly y: number },
  map: WorldMapData,
): boolean {
  const bounds = map.geometry.bounds;
  return point.x >= bounds.minX && point.x <= bounds.maxX &&
    point.y >= bounds.minY && point.y <= bounds.maxY;
}

function pointInRects(
  point: { readonly x: number; readonly y: number },
  rects: readonly WorldMapPresentationRect[],
): boolean {
  return rects.some((rect) =>
    point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height
  );
}

function distance(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
