import {
  assertWorldMapSupportsMode,
  type WorldMapData,
  type WorldState,
} from "../world";
import {
  DEFAULT_ARENA_TEAM_SIZE,
  maximumArenaTeamSize,
  resolveArenaTeamSizes,
  type ArenaWorldOptions,
} from "../spawning/arenaRoster";
import { createTeamDeathmatchWorldState } from "./createTeamDeathmatchWorldState";

export function createClassicCtfWorldState(
  map: WorldMapData,
  options: ArenaWorldOptions = {},
): WorldState {
  const teamSizes = resolveArenaTeamSizes(
    options.teamSizes ?? options.teamSize ?? DEFAULT_ARENA_TEAM_SIZE,
  );
  assertWorldMapSupportsMode(
    map,
    "classic-ctf",
    maximumArenaTeamSize(teamSizes),
  );
  const world = createTeamDeathmatchWorldState(map, options);
  world.modeId = "classic-ctf";
  return world;
}
