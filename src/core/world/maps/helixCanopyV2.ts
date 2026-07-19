import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const MAP_SCALE = 1.15;
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 960;
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
const INTEGRATED_COVER = "helix-integrated-cover" as const;

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

const walls = [
  // The arena edge is one closed stepped mask: broad top/bottom bands, full
  // side voids, and the four gardens above and below the team bases. This keeps
  // the complete glass/decorative rim outside play instead of patching isolated
  // bushes while preserving the approved inner-arena collision unchanged.
  ...mirroredCover("dome-void", 0, 0, 250, DESIGN_HEIGHT),
  centeredCover("dome-rim-north", 250, 0, 135),
  centeredCover("dome-rim-south", 250, 800, 160),
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

  // Insets of roughly one actor radius make the effective collision, rather
  // than the raw AABB, follow each diagonal botanical silhouette. The stepped
  // groups preserve the four clearly visible passages around the exchange.
  ...mirroredCover("canopy-island-outer", 495, 300, 65, 50),
  ...mirroredCover("canopy-island-mid", 545, 285, 85, 55),
  ...mirroredCover("canopy-island-inner", 615, 270, 55, 50),
  ...mirroredCover("exchange-island-outer", 600, 405, 60, 50),
  ...mirroredCover("exchange-island-mid", 640, 420, 80, 60),
  ...mirroredCover("exchange-island-inner", 690, 445, 55, 45),
  ...mirroredCover("root-island-outer", 495, 540, 65, 50),
  ...mirroredCover("root-island-mid", 545, 555, 85, 55),
  ...mirroredCover("root-island-inner", 615, 575, 55, 50),
  ...mirroredCover("helix-pod-upper-cap", 782, 280, 30, 26),
  ...mirroredCover("helix-pod-upper-core", 768, 306, 46, 58),
  ...mirroredCover("helix-pod-upper-foot", 780, 364, 32, 18),
  ...mirroredCover("helix-pod-lower-cap", 785, 530, 30, 20),
  ...mirroredCover("helix-pod-lower-core", 770, 550, 45, 55),
  ...mirroredCover("helix-pod-lower-foot", 785, 605, 30, 20),
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
      position: point(280, 480),
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: point(1640, 480),
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-canopy-exit", type: "health", position: point(425, 350) },
    { id: "health-red-canopy-exit", type: "health", position: point(1495, 350) },
    { id: "health-blue-root-exit", type: "health", position: point(425, 610) },
    { id: "health-red-root-exit", type: "health", position: point(1495, 610) },
    { id: "armor-exchange-west", type: "armor", position: point(780, 480) },
    { id: "armor-exchange-east", type: "armor", position: point(1140, 480) },
    { id: "pulse-root-west", type: "pulse", position: point(675, 765) },
    { id: "pulse-root-east", type: "pulse", position: point(1245, 765) },
    { id: "rail-canopy-center", type: "rail", position: point(960, 175) },
    { id: "shard-exchange-west", type: "shard", position: point(880, 480) },
    { id: "shard-exchange-east", type: "shard", position: point(1040, 480) },
  ],
  gameplay: {
    blueBase: rect(180, 350, 200, 260),
    redBase: rect(1540, 350, 200, 260),
    combatZone: rect(880, 400, 160, 160),
  },
  presentation: {
    theme: "helix-canopy",
    plan: "A coherent orbital biodome whose integrated botanical islands form three readable routes around a luminous vertical helix.",
    walls,
    gaps: [],
    botRoutes: {
      attacker: [
        point(1620, 480), point(1450, 690),
        point(1300, 690), point(1185, 680),
        point(1050, 610), point(960, 550),
        point(870, 610), point(735, 680),
        point(620, 690), point(470, 690),
        point(300, 480),
      ],
      defender: [
        point(300, 350), point(430, 300),
        point(460, 480), point(430, 660),
        point(300, 610),
      ],
    },
  },
  diagnosticSpawn: point(1640, 480),
};
