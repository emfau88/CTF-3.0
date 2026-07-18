import type { WorldPosition } from "../../core";

interface WorldRectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function worldLineIntersectsRect(
  from: WorldPosition,
  to: WorldPosition,
  rect: WorldRectLike,
): boolean {
  if (pointInRect(from, rect) || pointInRect(to, rect)) return true;
  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomRight = {
    x: rect.x + rect.width,
    y: rect.y + rect.height,
  };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };
  return segmentsIntersect(from, to, topLeft, topRight) ||
    segmentsIntersect(from, to, topRight, bottomRight) ||
    segmentsIntersect(from, to, bottomRight, bottomLeft) ||
    segmentsIntersect(from, to, bottomLeft, topLeft);
}

function pointInRect(point: WorldPosition, rect: WorldRectLike): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height;
}

function segmentsIntersect(
  firstStart: WorldPosition,
  firstEnd: WorldPosition,
  secondStart: WorldPosition,
  secondEnd: WorldPosition,
): boolean {
  const counterClockwise = (
    start: WorldPosition,
    middle: WorldPosition,
    end: WorldPosition,
  ) => (end.y - start.y) * (middle.x - start.x) >
    (middle.y - start.y) * (end.x - start.x);
  return counterClockwise(firstStart, secondStart, secondEnd) !==
      counterClockwise(firstEnd, secondStart, secondEnd) &&
    counterClockwise(firstStart, firstEnd, secondStart) !==
      counterClockwise(firstStart, firstEnd, secondEnd);
}
