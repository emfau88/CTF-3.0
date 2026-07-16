import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const INTEGRATED_COVER = "temple-integrated-cover" as const;
const WORLD_WIDTH = 2280;
const WORLD_HEIGHT = 980;

// The arena gains native floor between architectural groups. Exact seam points
// use half of the inserted width so mirrored authored points stay mirrored.
const expandX = (x: number) => {
  if (x < 360) return x;
  if (x === 360) return x + 10;
  if (x < 800) return x + 20;
  if (x === 800) return x + 40;
  if (x < 1360) return x + 60;
  if (x === 1360) return x + 80;
  if (x < 1800) return x + 100;
  if (x === 1800) return x + 110;
  return x + 120;
};
const expandY = (y: number) => {
  if (y < 170) return y;
  if (y === 170) return y + 15;
  if (y < 570) return y + 30;
  if (y === 570) return y + 45;
  return y + 60;
};
const expandRectX = (x: number, width: number) =>
  expandX(x + width / 2) - width / 2;
const expandRectY = (y: number, height: number) =>
  expandY(y + height / 2) - height / 2;
const point = (x: number, y: number) => ({ x: expandX(x), y: expandY(y) });
const mirrorX = (x: number, width: number) => WORLD_WIDTH - x - width;
const mirroredCover = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  return [
    {
      id: `${id}-blue`,
      x,
      y,
      width,
      height,
      visual: INTEGRATED_COVER,
    },
    {
      id: `${id}-red`,
      x: mirrorX(x, width),
      y,
      width,
      height,
      visual: INTEGRATED_COVER,
    },
  ] as const;
};

const walls = [
  // Every interior solid traces a visible low planter or the central lion-head altar.
  ...mirroredCover("outer-north", 450, 225, 60, 115),
  ...mirroredCover("outer-south", 450, 595, 60, 115),
  ...mirroredCover("lane-north", 625, 345, 190, 42),
  ...mirroredCover("lane-south", 625, 575, 190, 45),
  ...mirroredCover("court-north", 900, 355, 55, 80),
  ...mirroredCover("court-south", 900, 525, 55, 80),
  ...mirroredCover("gallery-center", 965, 160, 125, 42),
  ...mirroredCover("roots-center", 965, 635, 120, 40),
  ...mirroredCover("roots-gallery", 960, 735, 125, 45),

  // L-shaped islands use two rectangles so their visible inner corners stay walkable.
  ...mirroredCover("gallery-elbow-vertical", 685, 155, 65, 105),
  ...mirroredCover("gallery-elbow-arm", 720, 205, 90, 55),
  ...mirroredCover("roots-elbow-vertical", 690, 730, 65, 55),
  ...mirroredCover("roots-elbow-arm", 710, 700, 70, 55),

  // The small central altar interrupts the rail-to-objective sight line.
  {
    id: "solar-sight-altar",
    x: 1105,
    y: 255,
    width: 70,
    height: 65,
    visual: INTEGRATED_COVER,
  },
] as const;

const gaps = [
  {
    id: "cenote-west",
    x: 975,
    y: 250,
    width: 110,
    height: 75,
    visual: "cenote-pilot",
  },
  {
    id: "cenote-east",
    x: mirrorX(975, 110),
    y: 250,
    width: 110,
    height: 75,
    visual: "cenote-pilot",
  },
] as const;

export const DROWNED_SUN_TEMPLE_V2: WorldMapData = {
  id: "drowned-sun-temple-v2",
  displayName: "Temple of the Drowned Sun",
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
        id: "cenote-west-north-south",
        from: { x: 1030, y: 205 },
        to: { x: 1030, y: 350 },
        activationRadius: 44,
      },
      {
        id: "cenote-west-south-north",
        from: { x: 1030, y: 350 },
        to: { x: 1030, y: 205 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-north-south",
        from: { x: 1250, y: 205 },
        to: { x: 1250, y: 350 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-south-north",
        from: { x: 1250, y: 350 },
        to: { x: 1250, y: 205 },
        activationRadius: 44,
      },
    ],
  },
  spawnPoints: [
    ...createTeamSpawnPoints({
      teamId: "blue",
      position: point(150, 460),
      facing: { x: 1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
    ...createTeamSpawnPoints({
      teamId: "red",
      position: point(2010, 460),
      facing: { x: -1, y: 0 },
      tags: ["player", "tdm", "featured"],
    }),
  ],
  pickupSpawns: [
    { id: "health-blue-upper-exit", type: "health", position: point(525, 220) },
    { id: "health-blue-lower-exit", type: "health", position: point(525, 700) },
    { id: "health-red-upper-exit", type: "health", position: point(1635, 220) },
    { id: "health-red-lower-exit", type: "health", position: point(1635, 700) },
    { id: "health-inner-west", type: "health", position: point(800, 460) },
    { id: "health-inner-east", type: "health", position: point(1360, 460) },
    { id: "armor-sun-west", type: "armor", position: point(980, 460) },
    { id: "armor-sun-east", type: "armor", position: point(1180, 460) },
    { id: "rocket-roots-west", type: "rocket", position: point(800, 800) },
    { id: "rocket-roots-east", type: "rocket", position: point(1360, 800) },
    { id: "rail-gallery-center", type: "rail", position: point(1080, 80) },
    { id: "arc-lash-west", type: "whip", position: point(815, 520) },
    { id: "arc-lash-east", type: "whip", position: point(1345, 520) },
  ],
  gameplay: {
    blueBase: {
      x: expandRectX(60, 240),
      y: expandRectY(310, 300),
      width: 240,
      height: 300,
    },
    redBase: {
      x: mirrorX(expandRectX(60, 240), 240),
      y: expandRectY(310, 300),
      width: 240,
      height: 300,
    },
    combatZone: {
      x: expandRectX(920, 320),
      y: expandRectY(330, 260),
      width: 320,
      height: 260,
    },
  },
  presentation: {
    theme: "jungle-temple",
    plan: "Three-route competitive temple: an exposed Sun Causeway, a precision Jaguar Gallery with optional Cenote jumps, and a covered Rootwater Run for rockets and flag returns.",
    walls,
    gaps,
    decorations: [],
    botRoutes: {
      attacker: [
        point(1980, 460), point(1740, 370),
        point(1500, 390), point(1360, 460),
        point(1240, 460), point(1080, 460),
        point(920, 460), point(800, 460),
        point(660, 390), point(420, 370),
        point(180, 460),
      ],
      defender: [
        point(180, 260), point(80, 340),
        point(80, 580), point(180, 660),
        point(360, 640), point(360, 280),
      ],
    },
  },
  diagnosticSpawn: point(2010, 460),
};
