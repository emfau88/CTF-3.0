import { createTeamSpawnPoints } from "./createTeamSpawnPoints";
import type { WorldMapData } from "./worldMapData";

const walls = [
  // Split base shields keep three departures open while blocking spawn-to-spawn fire.
  { id: "blue-shield-north", x: 300, y: 120, width: 60, height: 245, visual: "temple-basalt-pilot-vertical" },
  { id: "red-shield-north", x: 1800, y: 120, width: 60, height: 245, visual: "temple-basalt-pilot-vertical" },
  { id: "blue-shield-south", x: 300, y: 555, width: 60, height: 245, visual: "temple-basalt-pilot-vertical" },
  { id: "red-shield-south", x: 1800, y: 555, width: 60, height: 245, visual: "temple-basalt-pilot-vertical" },
  { id: "blue-sight-pylon", x: 470, y: 405, width: 90, height: 110, visual: "temple-cover-pylon" },
  { id: "red-sight-pylon", x: 1600, y: 405, width: 90, height: 110, visual: "temple-cover-pylon" },

  // Lane dividers preserve broad rotations instead of forming rigid corridors.
  { id: "blue-divider-north", x: 560, y: 300, width: 240, height: 50, visual: "temple-wall-divider" },
  { id: "red-divider-north", x: 1360, y: 300, width: 240, height: 50, visual: "temple-wall-divider" },
  { id: "blue-divider-south", x: 560, y: 570, width: 240, height: 50, visual: "temple-wall-divider" },
  { id: "red-divider-south", x: 1360, y: 570, width: 240, height: 50, visual: "temple-wall-divider" },

  // Four temple corners create 100px side entries and 340px north/south entries.
  { id: "sun-court-north-west", x: 840, y: 330, width: 70, height: 80, visual: "temple-court-corner-north-west" },
  { id: "sun-court-north-east", x: 1250, y: 330, width: 70, height: 80, visual: "temple-court-corner-north-east" },
  { id: "sun-court-south-west", x: 840, y: 510, width: 70, height: 80, visual: "temple-court-corner-south-west" },
  { id: "sun-court-south-east", x: 1250, y: 510, width: 70, height: 80, visual: "temple-court-corner-south-east" },

  // North gallery supports precision control; south roots create short splash pockets.
  { id: "gallery-blue", x: 650, y: 70, width: 70, height: 120, visual: "temple-basalt-pilot-vertical" },
  { id: "gallery-red", x: 1440, y: 70, width: 70, height: 120, visual: "temple-basalt-pilot-vertical" },
  { id: "roots-blue", x: 650, y: 730, width: 70, height: 120, visual: "temple-basalt-pilot-vertical" },
  { id: "roots-red", x: 1440, y: 730, width: 70, height: 120, visual: "temple-basalt-pilot-vertical" },
  { id: "gallery-center-west", x: 900, y: 130, width: 120, height: 45, visual: "temple-basalt-pilot-horizontal" },
  { id: "gallery-center-east", x: 1140, y: 130, width: 120, height: 45, visual: "temple-basalt-pilot-horizontal" },
  { id: "roots-center-west", x: 900, y: 660, width: 120, height: 45, visual: "temple-basalt-pilot-horizontal" },
  { id: "roots-center-east", x: 1140, y: 660, width: 120, height: 45, visual: "temple-basalt-pilot-horizontal" },

  // This bridge explicitly breaks the contested rail pad's line to One Flag.
  { id: "solar-sight-bridge", x: 1040, y: 230, width: 80, height: 80, visual: "temple-jaguar-root-pilot" },
] as const;

const gaps = [
  { id: "cenote-west", x: 900, y: 230, width: 120, height: 80, visual: "cenote-pilot" },
  { id: "cenote-east", x: 1140, y: 230, width: 120, height: 80, visual: "cenote-pilot" },
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
        from: { x: 960, y: 200 },
        to: { x: 960, y: 340 },
        activationRadius: 44,
      },
      {
        id: "cenote-west-south-north",
        from: { x: 960, y: 340 },
        to: { x: 960, y: 200 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-north-south",
        from: { x: 1200, y: 200 },
        to: { x: 1200, y: 340 },
        activationRadius: 44,
      },
      {
        id: "cenote-east-south-north",
        from: { x: 1200, y: 340 },
        to: { x: 1200, y: 200 },
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
    { id: "health-blue-upper-exit", type: "health", position: { x: 450, y: 280 } },
    { id: "health-blue-lower-exit", type: "health", position: { x: 450, y: 640 } },
    { id: "health-red-upper-exit", type: "health", position: { x: 1710, y: 280 } },
    { id: "health-red-lower-exit", type: "health", position: { x: 1710, y: 640 } },
    { id: "health-inner-west", type: "health", position: { x: 800, y: 460 } },
    { id: "health-inner-east", type: "health", position: { x: 1360, y: 460 } },
    { id: "armor-sun-west", type: "armor", position: { x: 980, y: 460 } },
    { id: "armor-sun-east", type: "armor", position: { x: 1180, y: 460 } },
    { id: "rocket-roots-west", type: "rocket", position: { x: 800, y: 800 } },
    { id: "rocket-roots-east", type: "rocket", position: { x: 1360, y: 800 } },
    { id: "rail-gallery-center", type: "rail", position: { x: 1080, y: 80 } },
    { id: "arc-lash-west", type: "whip", position: { x: 700, y: 520 } },
    { id: "arc-lash-east", type: "whip", position: { x: 1460, y: 520 } },
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
    decorations: [
      // Dense foliage is clipped by the world edge, never mistaken for interior cover.
      { kind: "temple-canopy-edge", x: 0, y: -65, width: 720, height: 100 },
      { kind: "temple-canopy-edge", x: 720, y: -65, width: 720, height: 100 },
      { kind: "temple-canopy-edge", x: 1440, y: -65, width: 720, height: 100 },
      { kind: "temple-canopy-edge", x: 0, y: 885, width: 720, height: 100 },
      { kind: "temple-canopy-edge", x: 720, y: 885, width: 720, height: 100 },
      { kind: "temple-canopy-edge", x: 1440, y: 885, width: 720, height: 100 },
      { kind: "temple-vegetation", x: -110, y: 90, width: 180, height: 300 },
      { kind: "temple-vegetation", x: -110, y: 530, width: 180, height: 300 },
      { kind: "temple-vegetation", x: 2090, y: 90, width: 180, height: 300 },
      { kind: "temple-vegetation", x: 2090, y: 530, width: 180, height: 300 },

      // Flat route dressing remains below actors, pickups, walls, and objectives.
      { kind: "temple-glyph-inlay", x: 780, y: 25, width: 600, height: 72 },
      { kind: "temple-roots-border", x: 360, y: 840, width: 600, height: 70 },
      { kind: "temple-roots-border", x: 1200, y: 840, width: 600, height: 70 },

      // Reliefs stay exactly on existing solids; water light stays exactly on gaps.
      { kind: "temple-jaguar-sculpture", x: 300, y: 120, width: 60, height: 245 },
      { kind: "temple-jaguar-sculpture", x: 1800, y: 120, width: 60, height: 245 },
      { kind: "temple-jaguar-sculpture", x: 300, y: 555, width: 60, height: 245 },
      { kind: "temple-jaguar-sculpture", x: 1800, y: 555, width: 60, height: 245 },
      { kind: "temple-water-light", x: 900, y: 230, width: 120, height: 80 },
      { kind: "temple-water-light", x: 1140, y: 230, width: 120, height: 80 },
    ],
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
        { x: 420, y: 640 }, { x: 420, y: 280 },
      ],
    },
  },
  diagnosticSpawn: { x: 2010, y: 460 },
};
