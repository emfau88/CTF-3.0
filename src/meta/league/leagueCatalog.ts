import type {
  LeagueCharacterDefinition,
  LeagueTeamDefinition,
  LeagueTeamId,
} from "./leagueTypes";

export const PLAYER_LEAGUE_TEAM_ID: LeagueTeamId = "iron-vanguard";

export const LEAGUE_TEAMS: readonly LeagueTeamDefinition[] = [
  {
    id: "iron-vanguard",
    name: "Iron Vanguard",
    shortName: "IV",
    motto: "Hold the line. Break theirs.",
    primaryColor: "#3c86d9",
    accentColor: "#90c8ff",
    characterIds: ["nova-vale", "atlas-rho"],
  },
  {
    id: "crimson-jackals",
    name: "Crimson Jackals",
    shortName: "CJ",
    motto: "Pressure creates openings.",
    primaryColor: "#c23c48",
    accentColor: "#ff9b8f",
    characterIds: ["kael-voss", "mara-hex"],
  },
  {
    id: "neon-phantoms",
    name: "Neon Phantoms",
    shortName: "NP",
    motto: "Seen once. Gone twice.",
    primaryColor: "#8d5bd6",
    accentColor: "#d6a7ff",
    characterIds: ["nyx-echo", "vektor-nine"],
  },
  {
    id: "grave-circuit",
    name: "Grave Circuit",
    shortName: "GC",
    motto: "Every route has an ending.",
    primaryColor: "#4f6f69",
    accentColor: "#a1c4b8",
    characterIds: ["rook-13", "sable-kern"],
  },
  {
    id: "solar-wardens",
    name: "Solar Wardens",
    shortName: "SW",
    motto: "Control the field.",
    primaryColor: "#c88b32",
    accentColor: "#ffd276",
    characterIds: ["orion-flare", "senna-ray"],
  },
  {
    id: "void-runners",
    name: "Void Runners",
    shortName: "VR",
    motto: "Speed is territory.",
    primaryColor: "#2ba8a0",
    accentColor: "#78f0df",
    characterIds: ["kestrel-void", "ion-drift"],
  },
];

export const LEAGUE_CHARACTERS: readonly LeagueCharacterDefinition[] = [
  {
    id: "nova-vale",
    name: "Nova Vale",
    teamId: "iron-vanguard",
    role: "allrounder",
    trait: "Calm under pressure",
    rating: 72,
    skinId: "alien-runner",
  },
  {
    id: "atlas-rho",
    name: "Atlas Rho",
    teamId: "iron-vanguard",
    role: "defender",
    trait: "Reliable flag control",
    rating: 65,
    skinId: "aegis-vanguard",
  },
  {
    id: "kael-voss",
    name: "Kael Voss",
    teamId: "crimson-jackals",
    role: "attacker",
    trait: "Aggressive route pressure",
    rating: 70,
    skinId: "mirejaw",
  },
  {
    id: "mara-hex",
    name: "Mara Hex",
    teamId: "crimson-jackals",
    role: "defender",
    trait: "Punishes overextension",
    rating: 67,
    skinId: "null-courier",
  },
  {
    id: "nyx-echo",
    name: "Nyx Echo",
    teamId: "neon-phantoms",
    role: "attacker",
    trait: "Fast flank timing",
    rating: 73,
    skinId: "scrapwing",
  },
  {
    id: "vektor-nine",
    name: "Vektor Nine",
    teamId: "neon-phantoms",
    role: "allrounder",
    trait: "Unpredictable rotations",
    rating: 69,
    skinId: "prism-bastion",
  },
  {
    id: "rook-13",
    name: "Rook-13",
    teamId: "grave-circuit",
    role: "defender",
    trait: "Locks down narrow lanes",
    rating: 74,
    skinId: "ax9-mantis",
  },
  {
    id: "sable-kern",
    name: "Sable Kern",
    teamId: "grave-circuit",
    role: "allrounder",
    trait: "Disciplined support fire",
    rating: 66,
    skinId: "aegis-vanguard",
  },
  {
    id: "orion-flare",
    name: "Orion Flare",
    teamId: "solar-wardens",
    role: "attacker",
    trait: "High capture conversion",
    rating: 75,
    skinId: "volt-hound",
  },
  {
    id: "senna-ray",
    name: "Senna Ray",
    teamId: "solar-wardens",
    role: "defender",
    trait: "Patient carrier recovery",
    rating: 71,
    skinId: "null-courier",
  },
  {
    id: "kestrel-void",
    name: "Kestrel Void",
    teamId: "void-runners",
    role: "attacker",
    trait: "Relentless movement",
    rating: 76,
    skinId: "alien-runner",
  },
  {
    id: "ion-drift",
    name: "Ion Drift",
    teamId: "void-runners",
    role: "allrounder",
    trait: "Strong mid-map control",
    rating: 68,
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
