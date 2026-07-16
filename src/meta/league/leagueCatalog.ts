import type {
  LeagueCharacterDefinition,
  LeagueTeamDefinition,
  LeagueTeamId,
} from "./leagueTypes";
import type { V2ModeId } from "../../v2Route";

export const PLAYER_LEAGUE_TEAM_ID: LeagueTeamId = "iron-vanguard";
export const FOUNDERS_CIRCUIT_TEAM_IDS: readonly LeagueTeamId[] = [
  "iron-vanguard",
  "crimson-jackals",
  "neon-phantoms",
  "grave-circuit",
];
export const CHALLENGER_PREVIEW_TEAM_IDS: readonly LeagueTeamId[] = [
  "solar-wardens",
  "void-runners",
];
export const STARTER_WINGMAN_IDS = [
  "atlas-rho",
  "lyra-quell",
  "dax-ember",
] as const;

export interface LeagueDiscipline {
  readonly mode: V2ModeId;
  readonly modeLabel: string;
  readonly trialLabel: string;
  readonly mapId: string;
  readonly mapLabel: string;
  readonly scoreTarget: number;
}

export const FOUNDERS_CIRCUIT_DISCIPLINES: readonly LeagueDiscipline[] = [
  {
    mode: "tdm",
    modeLabel: "Team Deathmatch",
    trialLabel: "Canopy Skirmish",
    mapId: "helix-canopy-v2",
    mapLabel: "Helix Canopy",
    scoreTarget: 10,
  },
  {
    mode: "one-flag",
    modeLabel: "One Flag",
    trialLabel: "Drowned Sun Clash",
    mapId: "drowned-sun-temple-v2",
    mapLabel: "Temple of the Drowned Sun",
    scoreTarget: 3,
  },
  {
    mode: "ctf",
    modeLabel: "Classic CTF",
    trialLabel: "Drowned Sun Final",
    mapId: "drowned-sun-temple-v2",
    mapLabel: "Temple of the Drowned Sun",
    scoreTarget: 3,
  },
];

export function foundersCircuitDiscipline(roundIndex: number): LeagueDiscipline {
  return FOUNDERS_CIRCUIT_DISCIPLINES[
    Math.max(0, Math.min(FOUNDERS_CIRCUIT_DISCIPLINES.length - 1, roundIndex))
  ];
}

export const LEAGUE_TEAMS: readonly LeagueTeamDefinition[] = [
  {
    id: "iron-vanguard",
    name: "Iron Vanguard",
    shortName: "IV",
    motto: "Hold the line. Break theirs.",
    primaryColor: "#3c86d9",
    accentColor: "#90c8ff",
    characterIds: ["nova-vale", "atlas-rho"],
    simulationProfile: { attack: 70, defense: 72, objective: 71, consistency: 80 },
  },
  {
    id: "crimson-jackals",
    name: "Crimson Jackals",
    shortName: "CJ",
    motto: "Pressure creates openings.",
    primaryColor: "#c23c48",
    accentColor: "#ff9b8f",
    characterIds: ["kael-voss", "mara-hex"],
    simulationProfile: { attack: 76, defense: 64, objective: 68, consistency: 65 },
  },
  {
    id: "neon-phantoms",
    name: "Neon Phantoms",
    shortName: "NP",
    motto: "Seen once. Gone twice.",
    primaryColor: "#8d5bd6",
    accentColor: "#d6a7ff",
    characterIds: ["nyx-echo", "vektor-nine"],
    simulationProfile: { attack: 72, defense: 63, objective: 78, consistency: 61 },
  },
  {
    id: "grave-circuit",
    name: "Grave Circuit",
    shortName: "GC",
    motto: "Every route has an ending.",
    primaryColor: "#4f6f69",
    accentColor: "#a1c4b8",
    characterIds: ["rook-13", "sable-kern"],
    simulationProfile: { attack: 65, defense: 78, objective: 70, consistency: 83 },
  },
  {
    id: "solar-wardens",
    name: "Solar Wardens",
    shortName: "SW",
    motto: "Control the field.",
    primaryColor: "#c88b32",
    accentColor: "#ffd276",
    characterIds: ["orion-flare", "senna-ray"],
    simulationProfile: { attack: 79, defense: 74, objective: 78, consistency: 81 },
  },
  {
    id: "void-runners",
    name: "Void Runners",
    shortName: "VR",
    motto: "Speed is territory.",
    primaryColor: "#2ba8a0",
    accentColor: "#78f0df",
    characterIds: ["kestrel-void", "ion-drift"],
    simulationProfile: { attack: 77, defense: 66, objective: 81, consistency: 67 },
  },
];

export const LEAGUE_CHARACTERS: readonly LeagueCharacterDefinition[] = [
  {
    id: "nova-vale",
    name: "Nova Vale",
    teamId: "iron-vanguard",
    visualStyle: "Xeno Runner",
    personality: "Cool-headed when the arena gets loud",
    skinId: "alien-runner",
  },
  {
    id: "atlas-rho",
    name: "Atlas Rho",
    teamId: "iron-vanguard",
    visualStyle: "Aegis Vanguard",
    personality: "Steady, earnest and impossible to hurry",
    skinId: "aegis-vanguard",
  },
  {
    id: "lyra-quell",
    name: "Lyra Quell",
    teamId: "iron-vanguard",
    visualStyle: "Null Courier",
    personality: "Finds the quiet route through every firefight",
    skinId: "null-courier",
  },
  {
    id: "dax-ember",
    name: "Dax Ember",
    teamId: "iron-vanguard",
    visualStyle: "Volt Hound",
    personality: "Turns every opening into forward pressure",
    skinId: "volt-hound",
  },
  {
    id: "kael-voss",
    name: "Kael Voss",
    teamId: "crimson-jackals",
    visualStyle: "Mirejaw",
    personality: "Treats every match like a friendly grudge",
    skinId: "mirejaw",
  },
  {
    id: "mara-hex",
    name: "Mara Hex",
    teamId: "crimson-jackals",
    visualStyle: "Null Courier",
    personality: "Deadpan, precise and secretly competitive",
    skinId: "null-courier",
  },
  {
    id: "nyx-echo",
    name: "Nyx Echo",
    teamId: "neon-phantoms",
    visualStyle: "Scrapwing",
    personality: "Always has a shortcut and a bad joke",
    skinId: "scrapwing",
  },
  {
    id: "vektor-nine",
    name: "Vektor Nine",
    teamId: "neon-phantoms",
    visualStyle: "Prism Bastion",
    personality: "Makes dramatic entrances on purpose",
    skinId: "prism-bastion",
  },
  {
    id: "rook-13",
    name: "Rook-13",
    teamId: "grave-circuit",
    visualStyle: "AX-9 Mantis",
    personality: "Counts everything, including high-fives",
    skinId: "ax9-mantis",
  },
  {
    id: "sable-kern",
    name: "Sable Kern",
    teamId: "grave-circuit",
    visualStyle: "Aegis Vanguard",
    personality: "Quietly dependable with a dry sense of humor",
    skinId: "aegis-vanguard",
  },
  {
    id: "orion-flare",
    name: "Orion Flare",
    teamId: "solar-wardens",
    visualStyle: "Volt Hound",
    personality: "Celebrates every point like a championship",
    skinId: "volt-hound",
  },
  {
    id: "senna-ray",
    name: "Senna Ray",
    teamId: "solar-wardens",
    visualStyle: "Null Courier",
    personality: "Patient, observant and fond of long pauses",
    skinId: "null-courier",
  },
  {
    id: "kestrel-void",
    name: "Kestrel Void",
    teamId: "void-runners",
    visualStyle: "Xeno Runner",
    personality: "Cannot stand still while telling a story",
    skinId: "alien-runner",
  },
  {
    id: "ion-drift",
    name: "Ion Drift",
    teamId: "void-runners",
    visualStyle: "Briarhorn",
    personality: "Gentle off-field, gleefully chaotic on it",
    skinId: "briarhorn",
  },
];

export function leagueTeam(teamId: LeagueTeamId): LeagueTeamDefinition {
  const team = LEAGUE_TEAMS.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown league team: ${teamId}`);
  return team;
}

export function leagueCharacter(characterId: string): LeagueCharacterDefinition {
  const character = LEAGUE_CHARACTERS.find((candidate) =>
    candidate.id === characterId
  );
  if (!character) throw new Error(`Unknown league character: ${characterId}`);
  return character;
}
