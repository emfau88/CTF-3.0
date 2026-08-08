import type { ActorState, WorldPosition } from "../actors";
import type { PickupState } from "../pickups";
import type { ArenaTeamSlot } from "../spawning";
import {
  ARENA_WEAPON_CATALOG,
  DEFAULT_ARENA_WEAPON_ROSTER,
  isAmmoWeaponId,
  weaponAmmo,
  type AmmoWeaponId,
} from "../weapons";
import type {
  WorldMapData,
  WorldMapLandmark,
  WorldSnapshot,
} from "../world";
import type { BotDifficultyProfile } from "./BotDifficulty";

export interface BotStrategicPickupOptions {
  readonly map: Pick<WorldMapData, "weaponRoster" | "registration">;
  readonly snapshot: WorldSnapshot;
  readonly actor: Readonly<ActorState>;
  readonly slot: ArenaTeamSlot;
  readonly difficulty: BotDifficultyProfile;
  readonly preferredPickupId?: string | null;
  readonly excludedPickupIds?: ReadonlySet<string>;
  readonly humanActorIds?: readonly string[];
}

export interface BotLandmarkRoutePlan {
  readonly position: WorldPosition;
  readonly targetKey: string;
  readonly landmarkId: string | null;
}

export class BotLandmarkRoutePlanner {
  private activeKey = "";
  private landmarkCompleted = false;

  plan(
    from: WorldPosition,
    destination: WorldPosition,
    targetKey: string,
    map: WorldMapData,
    landmarkId: string | null | undefined,
    difficulty: BotDifficultyProfile,
    allowRoute = true,
  ): BotLandmarkRoutePlan {
    const activeKey = `${targetKey}:${landmarkId ?? "direct"}`;
    if (activeKey !== this.activeKey) {
      this.activeKey = activeKey;
      this.landmarkCompleted = false;
    }
    const landmark = allowRoute && difficulty.landmarkRouteMode !== "none"
      ? map.registration?.landmarks.find((candidate) =>
        candidate.id === landmarkId && candidate.traversal === "walkable"
      )
      : undefined;
    if (!landmark || this.landmarkCompleted) {
      return directRoute(destination, targetKey);
    }
    if (distance(from, landmark.position) <= 92) {
      this.landmarkCompleted = true;
      return directRoute(destination, targetKey);
    }
    const directDistance = distance(from, destination);
    const detour = distance(from, landmark.position) +
      distance(landmark.position, destination) - directDistance;
    const maximumDetour = difficulty.landmarkRouteMode === "distributed"
      ? 520
      : 240;
    if (directDistance < 520 || detour > maximumDetour) {
      return directRoute(destination, targetKey);
    }
    return {
      position: { ...landmark.position },
      targetKey: `landmark:${landmark.id}:${targetKey}`,
      landmarkId: landmark.id,
    };
  }

  reset(): void {
    this.activeKey = "";
    this.landmarkCompleted = false;
  }
}

export function selectBotStrategicPickup(
  options: BotStrategicPickupOptions,
): Readonly<PickupState> | null {
  const {
    map,
    snapshot,
    actor,
    slot,
    difficulty,
    preferredPickupId = null,
    excludedPickupIds = new Set<string>(),
    humanActorIds = [],
  } = options;
  const landmarkByPickupId = new Map(
    (map.registration?.landmarks ?? [])
      .filter((landmark) => landmark.pickupId)
      .map((landmark) => [landmark.pickupId!, landmark]),
  );
  const candidates = snapshot.pickups
    .filter((pickup) =>
      pickup.lifeState === "active" &&
      !excludedPickupIds.has(pickup.id) &&
      !weaponPickupReservedForHuman(
        pickup,
        actor,
        snapshot,
        humanActorIds,
      )
    )
    .map((pickup) => ({
      pickup,
      distance: distance(actor.position, pickup.position),
      landmark: landmarkByPickupId.get(pickup.id),
      need: pickupNeed(actor, pickup, difficulty, map),
    }))
    .filter((candidate) =>
      candidate.need > 0 &&
      candidate.distance <= difficulty.pickupAwarenessRange
    )
    .map((candidate) => ({
      ...candidate,
      score: strategicPickupScore(
        candidate.need,
        candidate.distance,
        candidate.landmark,
        actor,
        slot,
        difficulty,
        candidate.pickup.id === preferredPickupId,
      ),
    }))
    .sort((left, right) =>
      right.score - left.score ||
      left.distance - right.distance ||
      left.pickup.id.localeCompare(right.pickup.id)
    );
  return candidates[0]?.pickup ?? null;
}

export function selectBotRouteLandmark(
  map: WorldMapData,
  actor: Readonly<ActorState>,
  slot: ArenaTeamSlot,
  difficulty: BotDifficultyProfile,
): WorldMapLandmark | null {
  if (difficulty.landmarkRouteMode === "none") return null;
  const candidates = (map.registration?.landmarks ?? []).filter((landmark) =>
    landmark.traversal === "walkable" &&
    landmark.kind !== "base" &&
    landmark.kind !== "cover"
  );
  if (difficulty.landmarkRouteMode === "central") {
    return candidates.find((landmark) => landmark.kind === "objective") ??
      candidates.find((landmark) => landmark.routeTags.includes("middle")) ??
      null;
  }
  const preferredTag = slot === 2
    ? "north"
    : slot === 3
    ? "south"
    : slot === 4
    ? actor.teamId === "blue" ? "south" : "north"
    : "middle";
  return candidates.find((landmark) =>
    landmark.routeTags.includes(preferredTag) &&
    (landmark.kind === "route" || landmark.kind === "objective")
  ) ?? candidates.find((landmark) =>
    landmark.routeTags.includes(preferredTag)
  ) ?? candidates.find((landmark) => landmark.kind === "objective") ?? null;
}

function pickupNeed(
  actor: Readonly<ActorState>,
  pickup: Readonly<PickupState>,
  difficulty: BotDifficultyProfile,
  map: Pick<WorldMapData, "weaponRoster">,
): number {
  if (pickup.type === "health") {
    const ratio = actor.health / Math.max(1, actor.maxHealth);
    return resourceNeed(ratio, difficulty.healthSeekRatio);
  }
  if (pickup.type === "armor") {
    const ratio = actor.maxArmor > 0 ? actor.armor / actor.maxArmor : 1;
    return resourceNeed(ratio, difficulty.armorSeekRatio) * .86;
  }
  const weaponId = pickup.type as AmmoWeaponId;
  if (!isAmmoWeaponId(weaponId)) return 0;
  if (!(map.weaponRoster ?? DEFAULT_ARENA_WEAPON_ROSTER).includes(weaponId)) {
    return 0;
  }
  const maximum = ARENA_WEAPON_CATALOG[weaponId].maxAmmo ?? 0;
  const current = weaponAmmo(actor.weapons, weaponId) ?? maximum;
  return resourceNeed(
    maximum > 0 ? current / maximum : 1,
    difficulty.weaponReserveRatio,
  ) * .78;
}

function resourceNeed(currentRatio: number, seekRatio: number): number {
  if (seekRatio <= 0 || currentRatio > seekRatio) return 0;
  return .35 + (seekRatio - currentRatio) / Math.max(.01, seekRatio);
}

function strategicPickupScore(
  need: number,
  pickupDistance: number,
  landmark: WorldMapLandmark | undefined,
  actor: Readonly<ActorState>,
  slot: ArenaTeamSlot,
  difficulty: BotDifficultyProfile,
  preferred: boolean,
): number {
  const distancePenalty = pickupDistance /
    Math.max(1, difficulty.pickupAwarenessRange) * .68;
  const preferredTag = slot === 2 ? "north" : slot === 3 ? "south" : "middle";
  const laneAffinity = landmark?.routeTags.includes(preferredTag) ? .09 : 0;
  const teamAffinity = actor.teamId && landmark?.routeTags.includes(actor.teamId)
    ? .08
    : 0;
  return need * difficulty.resourceDiscipline - distancePenalty +
    (landmark ? .06 : 0) + laneAffinity + teamAffinity +
    (preferred ? .72 : 0);
}

function weaponPickupReservedForHuman(
  pickup: Readonly<PickupState>,
  actor: Readonly<ActorState>,
  snapshot: WorldSnapshot,
  humanActorIds: readonly string[],
): boolean {
  const weaponId = pickup.type as AmmoWeaponId;
  if (!isAmmoWeaponId(weaponId)) return false;
  const humans = new Set(humanActorIds);
  const actorAmmo = weaponAmmo(actor.weapons, weaponId) ?? 0;
  return snapshot.actors.some((candidate) =>
    humans.has(candidate.id) &&
    candidate.teamId === actor.teamId &&
    candidate.lifeState === "active" &&
    distance(candidate.position, pickup.position) <= 240 &&
    (weaponAmmo(candidate.weapons, weaponId) ?? 0) <= actorAmmo
  );
}

function directRoute(
  destination: WorldPosition,
  targetKey: string,
): BotLandmarkRoutePlan {
  return {
    position: { ...destination },
    targetKey,
    landmarkId: null,
  };
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}
