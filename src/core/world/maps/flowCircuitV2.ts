import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const WORLD_WIDTH = 2440;
const WORLD_HEIGHT = 1046;
const MASTER_WIDTH = 1915;
const MASTER_HEIGHT = 821;
const MASTER_SCALE = WORLD_HEIGHT / MASTER_HEIGHT;
const MASTER_OFFSET_X = (WORLD_WIDTH - MASTER_WIDTH * MASTER_SCALE) / 2;
const INTEGRATED_COVER = "foundry-integrated-cover" as const;

const masterRect = (
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  x: Math.round(MASTER_OFFSET_X + x * MASTER_SCALE),
  y: Math.round(y * MASTER_SCALE),
  width: Math.round(width * MASTER_SCALE),
  height: Math.round(height * MASTER_SCALE),
});

const cover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id,
  x,
  y,
  width,
  height,
  visual: INTEGRATED_COVER,
} as const);

const mirroredCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const west = cover(`${id}-west`, x, y, width, height);
  return [
    west,
    {
      ...west,
      id: `${id}-east`,
      x: WORLD_WIDTH - x - width,
    },
  ] as const;
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
  return [
    west,
    {
      ...west,
      id: `${id}-east`,
      x: WORLD_WIDTH - west.x - west.width,
    },
  ] as const;
};

const walls = [
  // The approved master contains the complete foundry shell. These two strips
  // keep actors out of the decorative furnace machinery without drawing a
  // second border over the integrated art.
  cover("foundry-rim-north", 0, 0, WORLD_WIDTH, 110),
  cover("foundry-rim-south", 0, 936, WORLD_WIDTH, 110),

  // Upper precision lane. The gaps between these low shields preserve the
  // long route while repeatedly breaking Rail sight lines. These raw boxes are
  // inset in master-image space so their actor-expanded collision follows the
  // visible metal body rather than extending onto open floor.
  ...mirroredMasterCover("precision-outer", 390, 180, 89, 28),
  ...mirroredMasterCover("precision-inner", 747, 168, 86, 27),
  ...mirroredMasterCover("upper-exchange", 375, 316, 95, 31),

  // The Forge Heart remains a flat floor landmark. Four surrounding shields
  // block direct spawn and objective fire while leaving four broad entries.
  ...mirroredMasterCover("forge-side", 733, 366, 27, 86),
  masterCover("forge-north", 898, 263, 119, 25),
  masterCover("forge-south", 898, 533, 119, 25),

  // Lower coolant route. Staggered cover creates wide splash-combat bays and
  // safe rotations instead of a single enclosed corridor.
  ...mirroredMasterCover("lower-exchange", 375, 474, 95, 34),
  ...mirroredMasterCover("coolant-mid", 579, 564, 93, 30),
  ...mirroredMasterCover("coolant-outer", 373, 613, 93, 32),
  ...mirroredMasterCover("coolant-inner", 746, 613, 86, 28),
] as const;

const maintenancePitWest = {
  id: "maintenance-pit-west",
  ...masterRect(584, 180, 78, 68),
  visual: "maintenance-pit",
} as const;

const gaps = [
  maintenancePitWest,
  {
    id: "maintenance-pit-east",
    x: WORLD_WIDTH - maintenancePitWest.x - maintenancePitWest.width,
    y: maintenancePitWest.y,
    width: maintenancePitWest.width,
    height: maintenancePitWest.height,
    visual: "maintenance-pit",
  },
] as const;

const maintenancePitWestCenterX = Math.round(
  maintenancePitWest.x + maintenancePitWest.width / 2,
);
const maintenancePitEastCenterX = WORLD_WIDTH - maintenancePitWestCenterX;

export const FLOW_CIRCUIT_V2: WorldMapData = {
  id: "flow-circuit-v2",
  displayName: "Foundry Circuit",
  weaponRoster: ["whip", "rocket", "rail", "disc"],
  geometry: {
    bounds: { minX: 0, minY: 0, maxX: WORLD_WIDTH, maxY: WORLD_HEIGHT },
    solids: walls.map((wall) => ({
      id: wall.id,
      x: wall.x,
      y: wall.y,
      width: wall.width,
      height: wall.height,
    })),
    gaps: gaps.map((gap) => ({
      id: gap.id,
      x: gap.x,
      y: gap.y,
      width: gap.width,
      height: gap.height,
    })),
  },
  navigation: {
    jumpLinks: [
      {
        id: "maintenance-west-north-south",
        from: { x: maintenancePitWestCenterX, y: 200 },
        to: { x: maintenancePitWestCenterX, y: 340 },
        activationRadius: 44,
      },
      {
        id: "maintenance-west-south-north",
        from: { x: maintenancePitWestCenterX, y: 340 },
        to: { x: maintenancePitWestCenterX, y: 200 },
        activationRadius: 44,
      },
      {
        id: "maintenance-east-north-south",
        from: { x: maintenancePitEastCenterX, y: 200 },
        to: { x: maintenancePitEastCenterX, y: 340 },
        activationRadius: 44,
      },
      {
        id: "maintenance-east-south-north",
        from: { x: maintenancePitEastCenterX, y: 340 },
        to: { x: maintenancePitEastCenterX, y: 200 },
        activationRadius: 44,
      },
    ],
  },
  spawnPoints: [
    ...createTeamSpawnPoints({
      teamId: "blue",
      position: { x: 190, y: 523 },
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: { x: 2250, y: 523 },
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-upper-exit", type: "health", position: { x: 360, y: 275 } },
    { id: "health-red-upper-exit", type: "health", position: { x: 2080, y: 275 } },
    { id: "health-blue-lower-exit", type: "health", position: { x: 360, y: 770 } },
    { id: "health-red-lower-exit", type: "health", position: { x: 2080, y: 770 } },
    { id: "health-inner-west", type: "health", position: { x: 865, y: 523 } },
    { id: "health-inner-east", type: "health", position: { x: 1575, y: 523 } },
    { id: "armor-exchange-west", type: "armor", position: { x: 1000, y: 620 } },
    { id: "armor-exchange-east", type: "armor", position: { x: 1440, y: 620 } },
    { id: "rocket-coolant-west", type: "rocket", position: { x: 660, y: 800 } },
    { id: "rocket-coolant-east", type: "rocket", position: { x: 1780, y: 800 } },
    { id: "rail-precision-center", type: "rail", position: { x: 1220, y: 145 } },
    { id: "disc-forge-west", type: "disc", position: { x: 1040, y: 523 } },
    { id: "disc-forge-east", type: "disc", position: { x: 1400, y: 523 } },
  ],
  gameplay: {
    blueBase: { x: 45, y: 245, width: 260, height: 556 },
    redBase: { x: 2135, y: 245, width: 260, height: 556 },
    combatZone: { x: 1040, y: 393, width: 360, height: 260 },
  },
  botProfile: {
    version: 1,
    navigation: "auto-grid",
    tacticalZones: [
      { id: "forge-heart", kind: "control", position: { x: 1220, y: 523 }, radius: 180 },
      { id: "precision-deck", kind: "flank", position: { x: 1220, y: 205 }, radius: 120 },
      { id: "coolant-route", kind: "flank", position: { x: 1220, y: 835 }, radius: 120 },
    ],
  },
  presentation: {
    theme: "foundry-circuit",
    plan: "A rebuilt premium steelworks arena with an exposed precision deck, a four-entry Forge Heart and a wide coolant route for protected splash rotations.",
    walls,
    gaps,
    decorations: [],
    botRoutes: {
      attacker: [
        { x: 2250, y: 523 }, { x: 2080, y: 690 },
        { x: 1880, y: 760 }, { x: 1660, y: 820 },
        { x: 1450, y: 750 }, { x: 1220, y: 760 },
        { x: 990, y: 750 }, { x: 780, y: 820 },
        { x: 560, y: 760 }, { x: 360, y: 690 },
        { x: 190, y: 523 },
      ],
      defender: [
        { x: 190, y: 300 }, { x: 310, y: 350 },
        { x: 360, y: 523 }, { x: 310, y: 696 },
        { x: 190, y: 746 },
      ],
    },
  },
  diagnosticSpawn: { x: 2250, y: 523 },
};
