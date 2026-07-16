export interface FighterOutlineOffset {
  readonly x: number;
  readonly y: number;
}

export interface FighterRingSegment {
  readonly start: number;
  readonly end: number;
}

export const PRIMARY_CONTROLLED_ACTOR_ID = "blue-player";
export const TEAM_RING_GROUND_OFFSET_Y = 18;

export const FIGHTER_OUTLINE_OFFSETS: readonly FighterOutlineOffset[] = [
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -2 },
  { x: 0, y: 2 },
  { x: -1.4, y: -1.4 },
  { x: 1.4, y: -1.4 },
  { x: -1.4, y: 1.4 },
  { x: 1.4, y: 1.4 },
];

const BLUE_RING_GAP = .16;
const RED_RING_STEP = Math.PI / 3;
const RED_RING_ARC = .68;

const BLUE_RING_SEGMENTS: readonly FighterRingSegment[] = [
  { start: BLUE_RING_GAP, end: Math.PI - BLUE_RING_GAP },
  { start: Math.PI + BLUE_RING_GAP, end: Math.PI * 2 - BLUE_RING_GAP },
];

const RED_RING_SEGMENTS: readonly FighterRingSegment[] = Array.from(
  { length: 6 },
  (_, index) => {
    const center = -Math.PI / 2 + RED_RING_STEP * index;
    return {
      start: center - RED_RING_ARC / 2,
      end: center + RED_RING_ARC / 2,
    };
  },
);

export const FIGHTER_READABILITY_OBJECTS_PER_TEAM_ACTOR =
  FIGHTER_OUTLINE_OFFSETS.length + 1;
export const FIGHTER_READABILITY_OBJECTS_FOR_CONTROLLED_ACTOR =
  FIGHTER_READABILITY_OBJECTS_PER_TEAM_ACTOR + 1;
export const MAX_FIGHTER_READABILITY_OBJECTS_IN_4V4 =
  FIGHTER_READABILITY_OBJECTS_PER_TEAM_ACTOR * 8 + 1;

export function fighterRingSegments(
  teamId: string | null,
): readonly FighterRingSegment[] {
  return teamId === "red" ? RED_RING_SEGMENTS : BLUE_RING_SEGMENTS;
}
