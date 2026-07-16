import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeagueMatchSearch,
  createLeagueSeason,
  getPlayerOpponent,
  leagueCharacter,
  readLeagueMatchRosterPresentation,
  selectLeagueWingman,
} from "../src/meta/league";
import { createActorState } from "../src/core";
import { resolveV2CharacterPresentation } from "../src/adapters/phaser/v2CharacterPresentation";

test("league match routes carry captain, wingman, and expected opponent skins", () => {
  const season = createLeagueSeason(99, "lyra-quell");
  selectLeagueWingman(season, "rook-13");
  const opponentId = getPlayerOpponent(season)!;
  const expectedOpponentSkins = season.teamRosters[opponentId].map(
    (characterId) => leagueCharacter(characterId).skinId,
  );
  const search = new URLSearchParams(buildLeagueMatchSearch(season, {
    skin: "briarhorn",
  }));

  assert.deepEqual(readLeagueMatchRosterPresentation(search), {
    captainSkinId: "briarhorn",
    playerWingmanSkinId: "ax9-mantis",
    opponentSkinIds: expectedOpponentSkins,
  });

  search.delete("leagueWingmanSkin");
  assert.equal(readLeagueMatchRosterPresentation(search), null);
});

test("league roster skins override bots while Quick Play keeps fixed fallbacks", () => {
  const captain = createActorState({
    id: "blue-player",
    kind: "player",
    teamId: "blue",
    facing: { x: 0, y: 1 },
  });
  const wingman = createActorState({
    id: "blue-player-2",
    kind: "player",
    teamId: "blue",
    facing: { x: 0, y: 1 },
  });
  const opponentOne = createActorState({
    id: "red-player",
    kind: "player",
    teamId: "red",
    facing: { x: 0, y: 1 },
  });
  const opponentTwo = createActorState({
    id: "red-player-2",
    kind: "player",
    teamId: "red",
    facing: { x: 0, y: 1 },
  });
  const leagueRoster = {
    blueBotSkinIds: ["null-courier"],
    redSkinIds: ["aegis-vanguard", "volt-hound"],
  } as const;

  assert.equal(
    resolveV2CharacterPresentation(captain, "briarhorn", leagueRoster).skin?.id,
    "briarhorn",
  );
  assert.equal(
    resolveV2CharacterPresentation(wingman, "briarhorn", leagueRoster).skin?.id,
    "null-courier",
  );
  assert.equal(
    resolveV2CharacterPresentation(opponentOne, "briarhorn", leagueRoster).skin?.id,
    "aegis-vanguard",
  );
  assert.equal(
    resolveV2CharacterPresentation(opponentTwo, "briarhorn", leagueRoster).skin?.id,
    "volt-hound",
  );

  assert.equal(
    resolveV2CharacterPresentation(wingman, "briarhorn").skin?.id,
    "prism-bastion",
  );
  assert.equal(
    resolveV2CharacterPresentation(opponentOne, "briarhorn").skin?.id,
    "mirejaw",
  );
  assert.equal(
    resolveV2CharacterPresentation(opponentTwo, "briarhorn").skin?.id,
    "scrapwing",
  );
});
