import type { Rect } from "./math";

export type PickupKind = "health" | "armor" | "rocket" | "rail" | "whip";
export type PickupSpawn = { kind: PickupKind; x: number; y: number };
export type LevelTheme =
  | "ruins"
  | "library"
  | "industrial"
  | "jungle-temple"
  | "helix-canopy";
export type WallVisual =
  | "stone-wall"
  | "bookshelf"
  | "bookshelf-damaged"
  | "reading-table"
  | "industrial-barrier"
  | "temple-basalt"
  | "temple-basalt-pilot-horizontal"
  | "temple-basalt-pilot-vertical"
  | "temple-wall-divider"
  | "temple-cover-pylon"
  | "temple-court-corner-north-west"
  | "temple-court-corner-north-east"
  | "temple-court-corner-south-west"
  | "temple-court-corner-south-east"
  | "temple-jaguar-root-pilot"
  | "temple-integrated-cover"
  | "helix-integrated-cover";
export type GapVisual =
  | "chasm"
  | "collapsed-floor"
  | "maintenance-pit"
  | "cenote"
  | "cenote-pilot";
export type DecorationKind =
  | "rug"
  | "book-pile"
  | "reading-lamp"
  | "cobweb-spider"
  | "field-marking"
  | "ruins-column"
  | "ruins-overgrowth"
  | "ruins-banner-red"
  | "ruins-banner-blue"
  | "industrial-energy-red"
  | "industrial-energy-blue"
  | "industrial-switch-gate"
  | "industrial-edge-pipes"
  | "industrial-edge-tank"
  | "industrial-edge-turbine"
  | "temple-roots-border"
  | "temple-vegetation"
  | "temple-glyph-inlay"
  | "temple-jaguar-sculpture"
  | "temple-canopy-edge"
  | "temple-water-light";
export type LevelWall = Rect & { visual?: WallVisual };
export type LevelGap = Rect & { visual?: GapVisual };
export type LevelDecoration = Rect & { kind: DecorationKind };

export const LEVEL_THEME_VISUALS = {
  ruins: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  library: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  industrial: { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  "jungle-temple": { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
  "helix-canopy": { floorPrimary: 0, floorAccent: 1, redBase: 2, blueBase: 3, wallHorizontal: 4, wallVertical: 5, gap: 8 },
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

export type LevelData = {
  id: string;
  name: string;
  plan: string;
  theme: LevelTheme;
  width: number;
  height: number;
  redSpawn: { x: number; y: number };
  blueSpawn: { x: number; y: number };
  redBase: Rect;
  blueBase: Rect;
  walls: LevelWall[];
  gaps: LevelGap[];
  decorations?: LevelDecoration[];
  combatZone?: Rect;
  pickups: PickupSpawn[];
  botRoutes: {
    attacker: { x: number; y: number }[];
    defender: { x: number; y: number }[];
  };
};

const trainingCrossing: LevelData = {
  id: "training-crossing",
  name: "Training Crossing",
  plan: "Balanced starter arena with a contested central power-up court and clear jump flanks.",
  theme: "ruins",
  width: 1500,
  height: 820,
  redSpawn: { x: 150, y: 410 },
  blueSpawn: { x: 1350, y: 410 },
  redBase: { x: 70, y: 280, w: 190, h: 260 },
  blueBase: { x: 1240, y: 280, w: 190, h: 260 },
  walls: [
    { x: 320, y: 112, w: 60, h: 194 }, { x: 320, y: 514, w: 60, h: 194 },
    { x: 1120, y: 112, w: 60, h: 194 }, { x: 1120, y: 514, w: 60, h: 194 },
    { x: 458, y: 328, w: 60, h: 164 }, { x: 982, y: 328, w: 60, h: 164 },
    { x: 620, y: 88, w: 260, h: 52 }, { x: 620, y: 680, w: 260, h: 52 },
    { x: 612, y: 306, w: 64, h: 64 }, { x: 824, y: 450, w: 64, h: 64 },
  ] satisfies Rect[],
  gaps: [
    { x: 548, y: 214, w: 128, h: 72 }, { x: 824, y: 534, w: 128, h: 72 },
  ] satisfies Rect[],
  decorations: [
    { kind: "ruins-banner-red", x: 0, y: 358, w: 64, h: 104 },
    { kind: "ruins-banner-blue", x: 1436, y: 358, w: 64, h: 104 },
    { kind: "ruins-column", x: 8, y: 8, w: 112, h: 112 },
    { kind: "ruins-column", x: 1380, y: 700, w: 112, h: 112 },
    { kind: "ruins-overgrowth", x: 390, y: 0, w: 176, h: 74 },
    { kind: "ruins-overgrowth", x: 934, y: 746, w: 176, h: 74 },
    { kind: "ruins-overgrowth", x: 390, y: 746, w: 176, h: 74 },
    { kind: "ruins-overgrowth", x: 934, y: 0, w: 176, h: 74 },
  ],
  combatZone: { x: 600, y: 288, w: 300, h: 244 },
  pickups: [
    { kind: "health", x: 120, y: 320 }, { kind: "armor", x: 220, y: 320 }, { kind: "rocket", x: 130, y: 500 }, { kind: "rail", x: 215, y: 500 },
    { kind: "health", x: 1290, y: 320 }, { kind: "armor", x: 1390, y: 320 }, { kind: "rocket", x: 1370, y: 500 }, { kind: "rail", x: 1285, y: 500 },
    { kind: "whip", x: 285, y: 410 }, { kind: "whip", x: 1215, y: 410 },
    { kind: "armor", x: 750, y: 410 },
  ],
  botRoutes: {
    attacker: [{ x: 1160, y: 72 }, { x: 900, y: 62 }, { x: 600, y: 62 }, { x: 340, y: 72 }, { x: 150, y: 410 }],
    defender: [{ x: 1180, y: 280 }, { x: 1340, y: 280 }, { x: 1340, y: 540 }, { x: 1180, y: 540 }],
  },
};

const midlineRush: LevelData = {
  id: "midline-rush",
  name: "Grand Archive",
  plan: "A wide library arena with long gallery lanes, an open central reading hall, and simple collapsed-floor shortcuts.",
  theme: "library",
  width: 2500,
  height: 820,
  redSpawn: { x: 145, y: 410 },
  blueSpawn: { x: 2355, y: 410 },
  redBase: { x: 65, y: 285, w: 195, h: 250 },
  blueBase: { x: 2240, y: 285, w: 195, h: 250 },
  walls: [
    { x: 330, y: 92, w: 58, h: 188, visual: "bookshelf" },
    { x: 330, y: 540, w: 58, h: 188, visual: "bookshelf" },
    { x: 2112, y: 92, w: 58, h: 188, visual: "bookshelf" },
    { x: 2112, y: 540, w: 58, h: 188, visual: "bookshelf" },
    { x: 500, y: 176, w: 230, h: 52, visual: "bookshelf-damaged" },
    { x: 780, y: 176, w: 210, h: 52, visual: "bookshelf" },
    { x: 1510, y: 176, w: 210, h: 52, visual: "bookshelf" },
    { x: 1770, y: 176, w: 230, h: 52, visual: "bookshelf-damaged" },
    { x: 500, y: 592, w: 230, h: 52, visual: "bookshelf" },
    { x: 780, y: 592, w: 210, h: 52, visual: "bookshelf-damaged" },
    { x: 1510, y: 592, w: 210, h: 52, visual: "bookshelf-damaged" },
    { x: 1770, y: 592, w: 230, h: 52, visual: "bookshelf" },
    { x: 850, y: 278, w: 52, h: 128, visual: "bookshelf" },
    { x: 850, y: 444, w: 52, h: 128, visual: "bookshelf" },
    { x: 1598, y: 278, w: 52, h: 128, visual: "bookshelf" },
    { x: 1598, y: 444, w: 52, h: 128, visual: "bookshelf" },
    { x: 1050, y: 314, w: 76, h: 76, visual: "reading-table" },
    { x: 1184, y: 430, w: 76, h: 76, visual: "reading-table" },
    { x: 1318, y: 314, w: 76, h: 76, visual: "reading-table" },
    { x: 1452, y: 430, w: 76, h: 76, visual: "reading-table" },
  ],
  gaps: [
    { x: 1010, y: 190, w: 124, h: 66, visual: "collapsed-floor" },
    { x: 1366, y: 190, w: 124, h: 66, visual: "collapsed-floor" },
    { x: 1010, y: 564, w: 124, h: 66, visual: "collapsed-floor" },
    { x: 1366, y: 564, w: 124, h: 66, visual: "collapsed-floor" },
  ],
  decorations: [
    { kind: "rug", x: 982, y: 292, w: 172, h: 120 },
    { kind: "rug", x: 1170, y: 408, w: 172, h: 120 },
    { kind: "rug", x: 1358, y: 292, w: 172, h: 120 },
    { kind: "book-pile", x: 430, y: 322, w: 38, h: 38 },
    { kind: "book-pile", x: 810, y: 458, w: 38, h: 38 },
    { kind: "book-pile", x: 1652, y: 322, w: 38, h: 38 },
    { kind: "book-pile", x: 2032, y: 458, w: 38, h: 38 },
    { kind: "cobweb-spider", x: 392, y: 96, w: 72, h: 58 },
    { kind: "cobweb-spider", x: 2036, y: 666, w: 72, h: 58 },
  ],
  combatZone: { x: 970, y: 270, w: 560, h: 280 },
  pickups: [
    { kind: "health", x: 112, y: 325 }, { kind: "armor", x: 215, y: 325 }, { kind: "rocket", x: 125, y: 500 }, { kind: "rail", x: 215, y: 500 },
    { kind: "health", x: 2285, y: 325 }, { kind: "armor", x: 2388, y: 325 }, { kind: "rocket", x: 2375, y: 500 }, { kind: "rail", x: 2285, y: 500 },
    { kind: "whip", x: 285, y: 410 }, { kind: "whip", x: 2215, y: 410 },
    { kind: "health", x: 760, y: 410 }, { kind: "health", x: 1740, y: 410 },
    { kind: "rail", x: 1250, y: 105 }, { kind: "rocket", x: 1250, y: 715 },
    { kind: "armor", x: 1250, y: 410 },
  ],
  botRoutes: {
    attacker: [
      { x: 2150, y: 752 }, { x: 1850, y: 752 }, { x: 1550, y: 752 },
      { x: 1250, y: 752 }, { x: 950, y: 752 }, { x: 650, y: 752 },
      { x: 350, y: 752 }, { x: 145, y: 410 },
    ],
    defender: [
      { x: 2210, y: 285 }, { x: 2380, y: 300 },
      { x: 2380, y: 520 }, { x: 2210, y: 535 },
    ],
  },
};

const flankSwitch: LevelData = {
  id: "flank-switch",
  name: "Flank Switch",
  plan: "A wide industrial switchyard with three distinct routes, cross-lane switches, and longer flag runs.",
  theme: "industrial",
  width: 2500,
  height: 820,
  redSpawn: { x: 150, y: 410 },
  blueSpawn: { x: 2350, y: 410 },
  redBase: { x: 75, y: 275, w: 190, h: 270 },
  blueBase: { x: 2235, y: 275, w: 190, h: 270 },
  walls: [
    { x: 330, y: 92, w: 52, h: 228, visual: "industrial-barrier" },
    { x: 330, y: 500, w: 52, h: 228, visual: "industrial-barrier" },
    { x: 2118, y: 92, w: 52, h: 228, visual: "industrial-barrier" },
    { x: 2118, y: 500, w: 52, h: 228, visual: "industrial-barrier" },

    { x: 530, y: 270, w: 310, h: 44, visual: "industrial-barrier" },
    { x: 530, y: 506, w: 310, h: 44, visual: "industrial-barrier" },
    { x: 1660, y: 270, w: 310, h: 44, visual: "industrial-barrier" },
    { x: 1660, y: 506, w: 310, h: 44, visual: "industrial-barrier" },

    { x: 920, y: 88, w: 48, h: 180, visual: "industrial-barrier" },
    { x: 920, y: 552, w: 48, h: 180, visual: "industrial-barrier" },
    { x: 1532, y: 88, w: 48, h: 180, visual: "industrial-barrier" },
    { x: 1532, y: 552, w: 48, h: 180, visual: "industrial-barrier" },

    { x: 1080, y: 334, w: 150, h: 42, visual: "industrial-barrier" },
    { x: 1270, y: 444, w: 150, h: 42, visual: "industrial-barrier" },
  ],
  gaps: [
    { x: 1015, y: 150, w: 130, h: 68, visual: "maintenance-pit" },
    { x: 1355, y: 150, w: 130, h: 68, visual: "maintenance-pit" },
    { x: 1015, y: 602, w: 130, h: 68, visual: "maintenance-pit" },
    { x: 1355, y: 602, w: 130, h: 68, visual: "maintenance-pit" },
  ],
  decorations: [
    { kind: "industrial-energy-red", x: 280, y: 388, w: 780, h: 44 },
    { kind: "industrial-energy-blue", x: 1440, y: 388, w: 780, h: 44 },
    { kind: "industrial-edge-pipes", x: 410, y: -12, w: 620, h: 94 },
    { kind: "industrial-edge-pipes", x: 1470, y: 738, w: 620, h: 94 },
    { kind: "industrial-edge-tank", x: 60, y: -34, w: 128, h: 160 },
    { kind: "industrial-edge-tank", x: 2312, y: 694, w: 128, h: 160 },
    { kind: "industrial-edge-turbine", x: 1168, y: -42, w: 164, h: 164 },
    { kind: "industrial-edge-turbine", x: 1168, y: 698, w: 164, h: 164 },
  ],
  combatZone: { x: 1050, y: 274, w: 400, h: 272 },
  pickups: [
    { kind: "health", x: 125, y: 315 }, { kind: "armor", x: 220, y: 315 }, { kind: "rocket", x: 125, y: 505 }, { kind: "rail", x: 215, y: 505 },
    { kind: "health", x: 2280, y: 315 }, { kind: "armor", x: 2375, y: 315 }, { kind: "rocket", x: 2375, y: 505 }, { kind: "rail", x: 2285, y: 505 },
    { kind: "whip", x: 285, y: 410 }, { kind: "whip", x: 2215, y: 410 },
    { kind: "health", x: 820, y: 410 }, { kind: "health", x: 1680, y: 410 },
    { kind: "rail", x: 1250, y: 105 }, { kind: "rocket", x: 1250, y: 715 },
    { kind: "armor", x: 1250, y: 410 },
  ],
  botRoutes: {
    attacker: [
      { x: 2150, y: 690 }, { x: 1880, y: 690 }, { x: 1580, y: 690 },
      { x: 1250, y: 690 }, { x: 920, y: 690 }, { x: 620, y: 690 },
      { x: 350, y: 690 }, { x: 150, y: 410 },
    ],
    defender: [
      { x: 2185, y: 250 }, { x: 2390, y: 310 },
      { x: 2390, y: 510 }, { x: 2185, y: 570 },
    ],
  },
};

export const LEVELS = [trainingCrossing, midlineRush, flankSwitch] as const;
export type LevelId = typeof LEVELS[number]["id"];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((level) => [level.id, level])) as Record<LevelId, LevelData>;
export const LEVEL = trainingCrossing;
