import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const INTEGRATED_COVER = "temple-integrated-cover" as const;
const mirrorX = (x: number, width: number) => 2160 - x - width;
const mirroredCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => [
  { id: `${id}-blue`, x, y, width, height, visual: INTEGRATED_COVER },
  {
    id: `${id}-red`,
    x: mirrorX(x, width),
    y,
    width,
    height,
    visual: INTEGRATED_COVER,
  },
] as const;

const walls = [
  // Every interior solid traces a visible low planter or the central lion-head altar.
  ...mirroredCover("outer-north", 430, 175, 70, 125),
  ...mirroredCover("outer-south", 430, 555, 70, 130),
  ...mirroredCover("lane-north", 540, 280, 240, 55),
  ...mirroredCover("lane-south", 540, 520, 240, 55),
  ...mirroredCover("court-north", 845, 305, 60, 75),
  ...mirroredCover("court-south", 845, 480, 60, 75),
  ...mirroredCover("gallery-center", 910, 100, 120, 50),
  ...mirroredCover("roots-center", 890, 580, 140, 50),
  ...mirroredCover("roots-gallery", 890, 665, 140, 55),

  // L-shaped islands use two rectangles so their visible inner corners stay walkable.
  ...mirroredCover("gallery-elbow-vertical", 650, 100, 55, 100),
  ...mirroredCover("gallery-elbow-arm", 680, 160, 80, 55),
  ...mirroredCover("roots-elbow-vertical", 700, 630, 55, 85),
  ...mirroredCover("roots-elbow-arm", 645, 655, 90, 55),

  // The small central altar interrupts the rail-to-objective sight line.
  { id: "solar-sight-altar", x: 1045, y: 215, width: 70, height: 65, visual: INTEGRATED_COVER },
] as const;

const gaps = [
  { id: "cenote-west", x: 900, y: 205, width: 125, height: 85, visual: "cenote-pilot" },
  { id: "cenote-east", x: 1135, y: 205, width: 125, height: 85, visual: "cenote-pilot" },
] as const;

export const DROWNED_SUN_TEMPLE_V2: WorldMapData = {
  id: "drowned-sun-temple-v2",
  displayName: "Temple of the Drowned Sun",
  geometry: {
    bounds: { minX: 0, minY: 0, maxX: 2160, maxY: 920 },
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
        id: "cenote-west-north-south",
        from: { x: 962, y: 175 },
        to: { x: 962, y: 320 },
        activationRadius: 44,
      },
      {
        id: "cenote-west-south-north",
        from: { x: 962, y: 320 },
        to: { x: 962, y: 175 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-north-south",
        from: { x: 1198, y: 175 },
        to: { x: 1198, y: 320 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-south-north",
        from: { x: 1198, y: 320 },
        to: { x: 1198, y: 175 },
        activationRadius: 44,
      },
    ],
  },
  spawnPoints: [
    ...createTeamSpawnPoints({
      teamId: "blue",
      position: { x: 150, y: 460 },
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: { x: 2010, y: 460 },
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-upper-exit", type: "health", position: { x: 525, y: 220 } },
    { id: "health-blue-lower-exit", type: "health", position: { x: 525, y: 700 } },
    { id: "health-red-upper-exit", type: "health", position: { x: 1635, y: 220 } },
    { id: "health-red-lower-exit", type: "health", position: { x: 1635, y: 700 } },
    { id: "health-inner-west", type: "health", position: { x: 800, y: 460 } },
    { id: "health-inner-east", type: "health", position: { x: 1360, y: 460 } },
    { id: "armor-sun-west", type: "armor", position: { x: 980, y: 460 } },
    { id: "armor-sun-east", type: "armor", position: { x: 1180, y: 460 } },
    { id: "rocket-roots-west", type: "rocket", position: { x: 800, y: 800 } },
    { id: "rocket-roots-east", type: "rocket", position: { x: 1360, y: 800 } },
    { id: "rail-gallery-center", type: "rail", position: { x: 1080, y: 80 } },
    { id: "arc-lash-west", type: "whip", position: { x: 815, y: 520 } },
    { id: "arc-lash-east", type: "whip", position: { x: 1345, y: 520 } },
  ],
  gameplay: {
    blueBase: { x: 60, y: 310, width: 240, height: 300 },
    redBase: { x: 1860, y: 310, width: 240, height: 300 },
    combatZone: { x: 920, y: 330, width: 320, height: 260 },
  },
  presentation: {
    theme: "jungle-temple",
    plan: "Three-route competitive temple: an exposed Sun Causeway, a precision Jaguar Gallery with optional Cenote jumps, and a covered Rootwater Run for rockets and flag returns.",
    walls,
    gaps,
    decorations: [],
    botRoutes: {
      attacker: [
        { x: 1980, y: 460 }, { x: 1740, y: 370 },
        { x: 1500, y: 390 }, { x: 1360, y: 460 },
        { x: 1240, y: 460 }, { x: 1080, y: 460 },
        { x: 920, y: 460 }, { x: 800, y: 460 },
        { x: 660, y: 390 }, { x: 420, y: 370 },
        { x: 180, y: 460 },
      ],
      defender: [
        { x: 180, y: 260 }, { x: 80, y: 340 },
        { x: 80, y: 580 }, { x: 180, y: 660 },
        { x: 360, y: 640 }, { x: 360, y: 280 },
      ],
    },
  },
  diagnosticSpawn: { x: 2010, y: 460 },
};
