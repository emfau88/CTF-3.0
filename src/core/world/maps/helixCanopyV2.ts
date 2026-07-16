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
  // The master art contains the complete oval dome. These boundary blocks keep
  // play inside the visible station shell without drawing a second frame over it.
  ...mirroredCover("dome-void", 0, 0, 170, DESIGN_HEIGHT),
  centeredCover("dome-rim-north", 170, 0, 112),
  centeredCover("dome-rim-south", 170, 848, 112),
  ...mirroredCover("dome-shoulder-north", 170, 112, 100, 92),
  ...mirroredCover("dome-shoulder-south", 170, 756, 100, 92),

  // Each collision rect stays inside a botanical island from the approved
  // target image. Compound pairs approximate its curved silhouette while the
  // authored art remains the single visual source of truth.
  ...mirroredCover("canopy-island-core", 520, 265, 155, 95),
  ...mirroredCover("canopy-island-tip", 495, 292, 55, 55),
  ...mirroredCover("exchange-island-core", 625, 390, 120, 105),
  ...mirroredCover("exchange-island-tip", 608, 420, 42, 52),
  ...mirroredCover("root-island-core", 520, 525, 145, 98),
  ...mirroredCover("root-island-tip", 492, 548, 52, 55),
  ...mirroredCover("helix-pod-upper", 755, 278, 65, 105),
  ...mirroredCover("helix-pod-lower", 750, 522, 70, 105),
] as const;

export const HELIX_CANOPY_V2: WorldMapData = {
  id: "helix-canopy-v2",
  displayName: "Helix Canopy",
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
    { id: "rocket-root-west", type: "rocket", position: point(675, 765) },
    { id: "rocket-root-east", type: "rocket", position: point(1245, 765) },
    { id: "rail-canopy-center", type: "rail", position: point(960, 175) },
    { id: "arc-lash-core-west", type: "whip", position: point(880, 480) },
    { id: "arc-lash-core-east", type: "whip", position: point(1040, 480) },
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
        point(300, 350), point(410, 300),
        point(460, 480), point(410, 660),
        point(300, 610),
      ],
    },
  },
  diagnosticSpawn: point(1640, 480),
};
