import type {
  WorldJumpLink,
  WorldPosition,
} from "../src/core";

export interface JumpTelemetryActorFrame {
  readonly position: WorldPosition;
  readonly lifeState: string;
  readonly overGap: boolean;
  readonly jump: {
    readonly active: boolean;
  };
}

export interface JumpLinkTraversalMetric {
  readonly linkId: string;
  starts: number;
  landings: number;
  failures: number;
  bestProgress: number;
  bestLandingProgress: number | null;
}

export interface JumpTelemetryMetric {
  jumpStarts: number;
  jumpLandings: number;
  jumpFailures: number;
  unlinkedJumpStarts: number;
  activeJumpLinkId: string | null;
  readonly jumpLinks: Map<string, JumpLinkTraversalMetric>;
}

export function createJumpTelemetryMetric(): JumpTelemetryMetric {
  return {
    jumpStarts: 0,
    jumpLandings: 0,
    jumpFailures: 0,
    unlinkedJumpStarts: 0,
    activeJumpLinkId: null,
    jumpLinks: new Map(),
  };
}

export function captureJumpTelemetry(
  metric: JumpTelemetryMetric,
  previous: JumpTelemetryActorFrame,
  current: JumpTelemetryActorFrame,
  jumpLinks: readonly WorldJumpLink[],
): void {
  if (!previous.jump.active && current.jump.active) {
    metric.jumpStarts += 1;
    const jumpLink = findActivatedJumpLink(previous.position, jumpLinks);
    metric.activeJumpLinkId = jumpLink?.id ?? null;
    if (!jumpLink) {
      metric.unlinkedJumpStarts += 1;
    } else {
      const linkMetric = getJumpLinkMetric(metric, jumpLink.id);
      linkMetric.starts += 1;
      linkMetric.bestProgress = Math.max(
        linkMetric.bestProgress,
        progressAlongJumpLink(current.position, jumpLink),
      );
    }
  }

  const activeLink = metric.activeJumpLinkId
    ? jumpLinks.find((jumpLink) => jumpLink.id === metric.activeJumpLinkId)
    : undefined;
  if (activeLink) {
    const linkMetric = getJumpLinkMetric(metric, activeLink.id);
    linkMetric.bestProgress = Math.max(
      linkMetric.bestProgress,
      progressAlongJumpLink(current.position, activeLink),
    );
  }

  if (previous.jump.active && !current.jump.active) {
    const successfulLanding = current.lifeState === "active" && !current.overGap;
    if (successfulLanding) {
      metric.jumpLandings += 1;
    } else {
      metric.jumpFailures += 1;
    }
    if (activeLink) {
      const linkMetric = getJumpLinkMetric(metric, activeLink.id);
      const landingProgress = progressAlongJumpLink(current.position, activeLink);
      linkMetric.bestProgress = Math.max(linkMetric.bestProgress, landingProgress);
      if (successfulLanding) {
        linkMetric.landings += 1;
        linkMetric.bestLandingProgress = Math.max(
          linkMetric.bestLandingProgress ?? 0,
          landingProgress,
        );
      } else {
        linkMetric.failures += 1;
      }
    }
    metric.activeJumpLinkId = null;
  }
}

function getJumpLinkMetric(
  metric: JumpTelemetryMetric,
  linkId: string,
): JumpLinkTraversalMetric {
  const existing = metric.jumpLinks.get(linkId);
  if (existing) return existing;
  const created: JumpLinkTraversalMetric = {
    linkId,
    starts: 0,
    landings: 0,
    failures: 0,
    bestProgress: 0,
    bestLandingProgress: null,
  };
  metric.jumpLinks.set(linkId, created);
  return created;
}

function findActivatedJumpLink(
  position: WorldPosition,
  jumpLinks: readonly WorldJumpLink[],
): WorldJumpLink | undefined {
  return jumpLinks
    .map((jumpLink) => ({
      jumpLink,
      distance: distance(position, jumpLink.from),
    }))
    .filter(({ jumpLink, distance: linkDistance }) =>
      linkDistance <= jumpLink.activationRadius + .001
    )
    .sort((left, right) =>
      left.distance - right.distance ||
      left.jumpLink.id.localeCompare(right.jumpLink.id)
    )[0]?.jumpLink;
}

function progressAlongJumpLink(
  position: WorldPosition,
  jumpLink: WorldJumpLink,
): number {
  const deltaX = jumpLink.to.x - jumpLink.from.x;
  const deltaY = jumpLink.to.y - jumpLink.from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= Number.EPSILON) return 0;
  const progress = (
    (position.x - jumpLink.from.x) * deltaX +
    (position.y - jumpLink.from.y) * deltaY
  ) / lengthSquared;
  return Math.max(0, Math.min(1, progress));
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
