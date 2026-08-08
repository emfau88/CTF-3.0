import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import {
  createCenteredWorldMapMasterTransform,
  createWorldMapLandmark,
} from "./worldMapRegistration";
import type {
  WorldMapData,
  WorldMapLandmarkDefinition,
} from "./worldMapData";

const MAP_SCALE = 1.15;
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 960;
const MASTER_WIDTH = 1647;
const MASTER_HEIGHT = 955;
const scale = (value: number) => Math.round(value * MAP_SCALE);
const point = (x: number, y: number) => ({ x: scale(x), y: scale(y) });
const rect = (x: number, y: number, width: number, height: number) => ({
  x: scale(x),
  y: scale(y),
  width: scale(width),
  height: scale(height),
});
const WORLD_WIDTH = scale(DESIGN_WIDTH);
const WORLD_HEIGHT = scale(DESIGN_HEIGHT);
const MASTER_SCALE = WORLD_HEIGHT / MASTER_HEIGHT;
const MASTER_OFFSET_X = (WORLD_WIDTH - MASTER_WIDTH * MASTER_SCALE) / 2;
const MASTER_TRANSFORM = createCenteredWorldMapMasterTransform(
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MASTER_WIDTH,
  MASTER_HEIGHT,
);
const INTEGRATED_COVER = "helix-integrated-cover" as const;
const landmark = (definition: WorldMapLandmarkDefinition) =>
  createWorldMapLandmark(MASTER_TRANSFORM, definition);

const scaledCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id,
  ...rect(x, y, width, height),
  visual: INTEGRATED_COVER,
} as const);

const centeredCover = (
  id: string,
  horizontalInset: number,
  y: number,
  height: number,
) => {
  const inset = scale(horizontalInset);
  return {
    id,
    x: inset,
    y: scale(y),
    width: WORLD_WIDTH - inset * 2,
    height: scale(height),
    visual: INTEGRATED_COVER,
  } as const;
};

const mirroredCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const west = scaledCover(`${id}-west`, x, y, width, height);
  return ([
    west,
    {
      ...west,
      id: `${id}-east`,
      x: WORLD_WIDTH - west.x - west.width,
    },
  ] as const);
};

const masterRect = (
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const left = Math.round(MASTER_OFFSET_X + x * MASTER_SCALE);
  const top = Math.round(y * MASTER_SCALE);
  const right = Math.round(MASTER_OFFSET_X + (x + width) * MASTER_SCALE);
  const bottom = Math.round((y + height) * MASTER_SCALE);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

const masterCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id,
  ...masterRect(x, y, width, height),
  visual: INTEGRATED_COVER,
} as const);

const mirroredMasterCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const west = masterCover(`${id}-west`, x, y, width, height);
  return ([
    west,
    masterCover(
      `${id}-east`,
      MASTER_WIDTH - x - width,
      y,
      width,
      height,
    ),
  ] as const);
};

const walls = [
  // The arena edge is one closed stepped mask: broad top/bottom bands, full
  // side voids, and the four gardens above and below the team bases. This keeps
  // the complete glass/decorative rim outside play instead of patching isolated
  // bushes, while the interior planters keep their independent simple shapes.
  ...mirroredCover("dome-void", 0, 0, 250, DESIGN_HEIGHT),
  centeredCover("dome-rim-north", 250, 0, 170),
  centeredCover("dome-rim-south", 250, 750, 210),
  ...mirroredCover("dome-base-garden-north", 250, 135, 150, 180),
  ...mirroredCover("dome-base-garden-south", 250, 645, 150, 155),

  // These inset planter groups join the top/bottom bands and follow the two
  // mirrored botanical recesses closest to the central helix.
  ...mirroredCover("dome-planter-north-outer", 690, 135, 65, 55),
  ...mirroredCover("dome-planter-north-mid", 745, 115, 65, 55),
  ...mirroredCover("dome-planter-north-inner", 800, 105, 40, 45),
  ...mirroredCover("dome-planter-south-outer", 700, 735, 65, 65),
  ...mirroredCover("dome-planter-south-mid", 745, 770, 65, 55),
  ...mirroredCover("dome-planter-south-inner", 800, 810, 40, 45),

  // Helix v2.1 is authored gameplay-first. Every interior planter has one
  // simple rectangular foliage core in master-image pixels. Circle-vs-rect
  // collision expands that core by the actor radius until it meets the metal
  // curb, so the visible planter and the effective block zone share one truth.
  ...mirroredMasterCover("planter-north-outer", 469, 272, 96, 46),
  ...mirroredMasterCover("planter-north-inner", 652, 260, 40, 82),
  ...mirroredMasterCover("planter-mid", 528, 426, 109, 62),
  ...mirroredMasterCover("planter-south-outer", 461, 596, 104, 48),
  ...mirroredMasterCover("planter-south-inner", 650, 581, 42, 80),

  // The helix itself is a walkable under-glass floor feature. Only its visibly
  // raised terminal machinery joins the closed north/south arena shell.
  masterCover("helix-terminal-north", 770, 140, 107, 90),
  masterCover("helix-terminal-south", 770, 690, 107, 92),
] as const;

export const HELIX_CANOPY_V2: WorldMapData = {
  id: "helix-canopy-v2",
  displayName: "Helix Canopy",
  weaponRoster: ["whip", "rail", "pulse", "shard"],
  geometry: {
    bounds: { minX: 0, minY: 0, maxX: WORLD_WIDTH, maxY: WORLD_HEIGHT },
    solids: walls.map((wall) => ({
      id: wall.id,
      x: wall.x,
      y: wall.y,
      width: wall.width,
      height: wall.height,
    })),
    gaps: [],
  },
  navigation: {
    jumpLinks: [
      {
        id: "helix-pod-west-core-vault",
        from: point(735, 324),
        to: point(853, 324),
        activationRadius: scale(44),
      },
      {
        id: "helix-pod-west-canopy-vault",
        from: point(853, 324),
        to: point(735, 324),
        activationRadius: scale(44),
      },
      {
        id: "helix-pod-east-core-vault",
        from: point(1185, 324),
        to: point(1067, 324),
        activationRadius: scale(44),
      },
      {
        id: "helix-pod-east-canopy-vault",
        from: point(1067, 324),
        to: point(1185, 324),
        activationRadius: scale(44),
      },
    ],
  },
  spawnPoints: [
    ...createTeamSpawnPoints({
      teamId: "blue",
      position: point(350, 480),
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: point(1570, 480),
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-canopy-exit", type: "health", position: point(425, 350) },
    { id: "health-red-canopy-exit", type: "health", position: point(1495, 350) },
    { id: "armor-blue-root-exit", type: "armor", position: point(425, 610) },
    { id: "armor-red-root-exit", type: "armor", position: point(1495, 610) },
    { id: "health-inner-west", type: "health", position: point(820, 480) },
    { id: "health-inner-east", type: "health", position: point(1100, 480) },
    { id: "shard-canopy-west", type: "shard", position: point(675, 240) },
    { id: "shard-canopy-east", type: "shard", position: point(1245, 240) },
    { id: "pulse-root-west", type: "pulse", position: point(675, 700) },
    { id: "pulse-root-east", type: "pulse", position: point(1245, 700) },
    { id: "rail-canopy-center", type: "rail", position: point(960, 255) },
  ],
  gameplay: {
    blueBase: rect(250, 350, 200, 260),
    redBase: rect(1470, 350, 200, 260),
    combatZone: rect(880, 400, 160, 160),
  },
  botProfile: {
    version: 1,
    navigation: "auto-grid",
    tacticalZones: [
      { id: "helix-core", kind: "control", position: point(960, 480), radius: scale(150) },
      { id: "canopy-north", kind: "flank", position: point(960, 245), radius: scale(105) },
      { id: "canopy-south", kind: "flank", position: point(960, 650), radius: scale(105) },
    ],
  },
  presentation: {
    theme: "helix-canopy",
    plan: "A competitive orbital biodome whose rectangular botanical planters form three readable routes around a walkable under-glass helix.",
    walls,
    gaps: [],
    botRoutes: {
      attacker: [
        point(1570, 480), point(1450, 690),
        point(1300, 690), point(1185, 680),
        point(1050, 610), point(960, 550),
        point(870, 610), point(735, 680),
        point(620, 690), point(470, 690),
        point(350, 480),
      ],
      defender: [
        point(350, 350), point(430, 300),
        point(460, 480), point(430, 660),
        point(350, 610),
      ],
    },
  },
  registration: {
    version: 1,
    master: MASTER_TRANSFORM,
    landmarks: [
      landmark({ id: "blue-base", label: "Blue Base", kind: "base", masterPosition: { x: 217.11, y: 477.5 }, traversal: "walkable", cover: "open", routeTags: ["base", "blue", "middle"] }),
      landmark({ id: "red-base", label: "Red Base", kind: "base", masterPosition: { x: 1430.755, y: 477.5 }, traversal: "walkable", cover: "open", routeTags: ["base", "red", "middle"] }),
      landmark({ id: "helix-core", label: "Helix Core", kind: "objective", masterPosition: { x: 823.5, y: 477.5 }, traversal: "walkable", cover: "open", routeTags: ["objective", "middle"] }),
      landmark({ id: "canopy-center", label: "Canopy Rail", kind: "pickup", masterPosition: { x: 823.5, y: 253.456 }, traversal: "walkable", cover: "open", routeTags: ["north", "pickup"], pickupId: "rail-canopy-center" }),
      landmark({ id: "root-center", label: "Root Crossing", kind: "route", masterPosition: { x: 823.5, y: 647.047 }, traversal: "walkable", cover: "open", routeTags: ["south", "crossing"] }),
      landmark({ id: "blue-canopy-recovery", label: "Blue Canopy Health", kind: "pickup", masterPosition: { x: 291.503, y: 348.61 }, traversal: "walkable", cover: "open", routeTags: ["blue", "north", "recovery"], pickupId: "health-blue-canopy-exit" }),
      landmark({ id: "red-canopy-recovery", label: "Red Canopy Health", kind: "pickup", masterPosition: { x: 1355.497, y: 348.61 }, traversal: "walkable", cover: "open", routeTags: ["red", "north", "recovery"], pickupId: "health-red-canopy-exit" }),
      landmark({ id: "blue-root-armor", label: "Blue Root Armor", kind: "pickup", masterPosition: { x: 291.503, y: 607.255 }, traversal: "walkable", cover: "open", routeTags: ["blue", "south", "armor"], pickupId: "armor-blue-root-exit" }),
      landmark({ id: "red-root-armor", label: "Red Root Armor", kind: "pickup", masterPosition: { x: 1355.497, y: 607.255 }, traversal: "walkable", cover: "open", routeTags: ["red", "south", "armor"], pickupId: "armor-red-root-exit" }),
      landmark({ id: "inner-health-west", label: "Inner Health West", kind: "pickup", masterPosition: { x: 684.229, y: 477.5 }, traversal: "walkable", cover: "open", routeTags: ["west", "middle", "recovery"], pickupId: "health-inner-west" }),
      landmark({ id: "inner-health-east", label: "Inner Health East", kind: "pickup", masterPosition: { x: 962.771, y: 477.5 }, traversal: "walkable", cover: "open", routeTags: ["east", "middle", "recovery"], pickupId: "health-inner-east" }),
      landmark({ id: "north-terminal", label: "North Helix Terminal", kind: "cover", masterPosition: { x: 823.5, y: 185 }, traversal: "solid", cover: "low", routeTags: ["north", "cover"] }),
    ],
  },
  diagnosticSpawn: point(1570, 480),
};
