import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 960;
const INTEGRATED_COVER = "helix-integrated-cover" as const;

const mirroredCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ([
  {
    id: `${id}-west`,
    x,
    y,
    width,
    height,
    visual: INTEGRATED_COVER,
  },
  {
    id: `${id}-east`,
    x: WORLD_WIDTH - x - width,
    y,
    width,
    height,
    visual: INTEGRATED_COVER,
  },
] as const);

const walls = [
  // The master art contains the complete oval dome. These boundary blocks keep
  // play inside the visible station shell without drawing a second frame over it.
  { id: "dome-void-west", x: 0, y: 0, width: 170, height: WORLD_HEIGHT, visual: INTEGRATED_COVER },
  { id: "dome-void-east", x: 1750, y: 0, width: 170, height: WORLD_HEIGHT, visual: INTEGRATED_COVER },
  { id: "dome-rim-north", x: 170, y: 0, width: 1580, height: 112, visual: INTEGRATED_COVER },
  { id: "dome-rim-south", x: 170, y: 848, width: 1580, height: 112, visual: INTEGRATED_COVER },
  ...mirroredCover("dome-shoulder-north", 170, 112, 100, 92),
  ...mirroredCover("dome-shoulder-south", 170, 756, 100, 92),

  // Each collision rect stays inside a botanical island from the approved
  // target image. Compound pairs approximate its curved silhouette while the
  // authored art remains the single visual source of truth.
  ...mirroredCover("canopy-island-core", 520, 250, 175, 72),
  ...mirroredCover("canopy-island-tip", 485, 282, 62, 48),
  ...mirroredCover("exchange-island-core", 540, 404, 170, 108),
  ...mirroredCover("exchange-island-tip", 505, 438, 58, 64),
  ...mirroredCover("root-island-core", 520, 638, 175, 72),
  ...mirroredCover("root-island-tip", 485, 654, 62, 48),
  ...mirroredCover("helix-pod-upper", 765, 266, 58, 116),
  ...mirroredCover("helix-pod-lower", 765, 578, 58, 116),
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
        from: { x: 735, y: 324 },
        to: { x: 853, y: 324 },
        activationRadius: 44,
      },
      {
        id: "helix-pod-west-canopy-vault",
        from: { x: 853, y: 324 },
        to: { x: 735, y: 324 },
        activationRadius: 44,
      },
      {
        id: "helix-pod-east-core-vault",
        from: { x: 1185, y: 324 },
        to: { x: 1067, y: 324 },
        activationRadius: 44,
      },
      {
        id: "helix-pod-east-canopy-vault",
        from: { x: 1067, y: 324 },
        to: { x: 1185, y: 324 },
        activationRadius: 44,
      },
    ],
  },
  spawnPoints: [
    ...createTeamSpawnPoints({
      teamId: "blue",
      position: { x: 280, y: 480 },
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: { x: 1640, y: 480 },
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-canopy-exit", type: "health", position: { x: 425, y: 350 } },
    { id: "health-red-canopy-exit", type: "health", position: { x: 1495, y: 350 } },
    { id: "health-blue-root-exit", type: "health", position: { x: 425, y: 610 } },
    { id: "health-red-root-exit", type: "health", position: { x: 1495, y: 610 } },
    { id: "armor-exchange-west", type: "armor", position: { x: 740, y: 480 } },
    { id: "armor-exchange-east", type: "armor", position: { x: 1180, y: 480 } },
    { id: "rocket-root-west", type: "rocket", position: { x: 675, y: 765 } },
    { id: "rocket-root-east", type: "rocket", position: { x: 1245, y: 765 } },
    { id: "rail-canopy-center", type: "rail", position: { x: 960, y: 175 } },
    { id: "arc-lash-core-west", type: "whip", position: { x: 880, y: 480 } },
    { id: "arc-lash-core-east", type: "whip", position: { x: 1040, y: 480 } },
  ],
  gameplay: {
    blueBase: { x: 180, y: 350, width: 200, height: 260 },
    redBase: { x: 1540, y: 350, width: 200, height: 260 },
    combatZone: { x: 880, y: 400, width: 160, height: 160 },
  },
  presentation: {
    theme: "helix-canopy",
    plan: "A coherent orbital biodome whose integrated botanical islands form three readable routes around a luminous vertical helix.",
    walls,
    gaps: [],
    botRoutes: {
      attacker: [
        { x: 1620, y: 480 }, { x: 1450, y: 570 },
        { x: 1300, y: 570 }, { x: 1165, y: 535 },
        { x: 1050, y: 500 }, { x: 960, y: 480 },
        { x: 870, y: 500 }, { x: 755, y: 535 },
        { x: 620, y: 570 }, { x: 470, y: 570 },
        { x: 300, y: 480 },
      ],
      defender: [
        { x: 300, y: 350 }, { x: 410, y: 300 },
        { x: 460, y: 480 }, { x: 410, y: 660 },
        { x: 300, y: 610 },
      ],
    },
  },
  diagnosticSpawn: { x: 1640, y: 480 },
};
