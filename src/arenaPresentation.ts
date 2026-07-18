import type { PickupType } from "./core/pickups";
import type {
  WorldMapDecorationKind,
  WorldMapGapVisual,
  WorldMapTheme,
  WorldMapWallVisual,
} from "./core/world/maps";

export interface ArenaPresentationRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type ArenaPresentationWall = ArenaPresentationRect & {
  readonly visual?: WorldMapWallVisual;
};
export type ArenaPresentationGap = ArenaPresentationRect & {
  readonly visual?: WorldMapGapVisual;
};
export type ArenaPresentationDecoration = ArenaPresentationRect & {
  readonly kind: WorldMapDecorationKind;
};

export interface ArenaPresentationData {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly theme: WorldMapTheme;
  readonly width: number;
  readonly height: number;
  readonly redSpawn: { readonly x: number; readonly y: number };
  readonly blueSpawn: { readonly x: number; readonly y: number };
  readonly redBase: ArenaPresentationRect;
  readonly blueBase: ArenaPresentationRect;
  readonly walls: readonly ArenaPresentationWall[];
  readonly gaps: readonly ArenaPresentationGap[];
  readonly decorations?: readonly ArenaPresentationDecoration[];
  readonly combatZone?: ArenaPresentationRect;
  readonly pickups: readonly {
    readonly kind: PickupType;
    readonly x: number;
    readonly y: number;
  }[];
  readonly botRoutes: {
    readonly attacker: readonly { readonly x: number; readonly y: number }[];
    readonly defender: readonly { readonly x: number; readonly y: number }[];
  };
}

export const ARENA_THEME_VISUALS = {
  ruins: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  library: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  industrial: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  "jungle-temple": { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  "helix-canopy": { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  "foundry-circuit": { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
} as const;

export const JUNGLE_TEMPLE_GREYBOX_PALETTE = {
  floor: 0x17221f,
  floorGrid: 0x2c4039,
  wall: 0x293431,
  wallTop: 0x4a5b52,
  wallEdge: 0x8fa996,
  gap: 0x07191d,
  gapEdge: 0x35bfd0,
  objective: 0xd9a934,
} as const;

export const HELIX_CANOPY_PALETTE = {
  objective: 0x3ee7ee,
} as const;

export const ARENA_TEAM_PALETTE = {
  red: { color: 0xe45151, dark: 0xb7272d, base: 0xffd7d3 },
  blue: { color: 0x3777e6, dark: 0x255ec8, base: 0xd7e5ff },
} as const;
