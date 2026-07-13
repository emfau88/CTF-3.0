import {
  buildLeagueMatchSearch,
  completeRecruitment,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  leagueCharacter,
  leagueTeam,
  sortedLeagueStandings,
  type LeagueCharacterStats,
  type LeagueSeasonState,
  type LeagueTeamId,
} from "./meta/league";
import {
  loadPlayerSkinPreference,
  playerSkinLabel,
  playerSkinSheetAssetStem,
  playerSkinSheetColumns,
  savePlayerSkinPreference,
} from "./playerSkinPreference";
import {
  V2_PLAYER_SKINS,
  readV2Route,
  type V2PlayerSkinId,
} from "./v2Route";

interface LeagueMenuController {
  readonly hasSave: boolean;
  open(): void;
}

export function leagueTeamEmblemUrl(teamId: LeagueTeamId): string {
  return `${import.meta.env?.BASE_URL ?? "/"}assets/league/teams/${teamId}-emblem.png`;
}

export function createLeagueMenuController(actions: {
  readonly onBack: () => void;
}): LeagueMenuController {
  const repository = createLeagueRepository(window.localStorage);
  const root = element("v2-league-hub");
  const empty = element("league-empty");
  const dashboard = element("league-dashboard");
  const recruitment = element("league-recruitment");
  let season = repository.load();
  let selectedTeamId: LeagueTeamId = season?.playerTeamId ?? "iron-vanguard";

  const saveAndRender = (): void => {
    if (season) repository.save(season);
    render();
  };

  const startSeason = (): void => {
    season = createLeagueSeason();
    selectedTeamId = season.playerTeamId;
    saveAndRender();
  };

  const render = (): void => {
    empty.classList.toggle("is-hidden", Boolean(season));
    dashboard.classList.toggle("is-hidden", !season);
    element("league-reset").classList.toggle("is-hidden", !season);
    if (!season) {
      recruitment.classList.add("is-hidden");
      return;
    }
    renderNextMatch(season);
    renderRoster(season);
    renderStandings(season);
    renderTeamDetail(season, selectedTeamId);
    renderRecruitment(season);
  };

  const renderNextMatch = (active: LeagueSeasonState): void => {
    const target = element("league-next-match");
    const table = sortedLeagueStandings(active);
    const ownPosition = table.findIndex((row) => row.teamId === active.playerTeamId) + 1;
    const match = getCurrentPlayerMatch(active);
    const opponentId = getPlayerOpponent(active, match);
    if (active.status === "completed" || !match || !opponentId) {
      const champion = leagueTeam(table[0].teamId);
      target.innerHTML = `
        <div class="league-season-complete">
          <img class="league-champion-emblem" src="${leagueTeamEmblemUrl(champion.id)}" alt="${champion.name} emblem">
          <div><span class="league-eyebrow">SEASON COMPLETE</span><h3>${champion.name} take the title</h3>
          <p>You finished <strong>#${ownPosition}</strong> with <strong>${active.standings[active.playerTeamId].points} points</strong>.</p></div>
          <button id="league-finish-new" type="button">Start New Season</button>
        </div>`;
      requiredButton("league-finish-new").onclick = () => {
        if (window.confirm("Replace this completed season with a new one?")) startSeason();
      };
      return;
    }
    const opponent = leagueTeam(opponentId);
    const ownTeam = leagueTeam(active.playerTeamId);
    const opponentStanding = active.standings[opponentId];
    target.style.setProperty("--opponent-color", opponent.primaryColor);
    target.innerHTML = `
      <div class="league-fixture-meta">
        <span class="league-eyebrow">NEXT FIXTURE · MATCH ${active.currentRound + 1} OF ${active.rounds.length}</span>
        <div class="league-fixture-title"><img class="league-mini-emblem" src="${leagueTeamEmblemUrl(ownTeam.id)}" alt="${ownTeam.name} emblem"><b>VS</b><img class="league-mini-emblem is-rival" src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name} emblem"></div>
      </div>
      <div class="league-opponent-copy">
        <small>OPPONENT</small><h3>${opponent.name}</h3><p>${opponent.motto}</p>
        <div class="league-opponent-form"><span>#${sortedLeagueStandings(active).findIndex((row) => row.teamId === opponentId) + 1} TABLE</span><span>${opponentStanding.points} PTS</span><span>${opponentStanding.wins}-${opponentStanding.draws}-${opponentStanding.losses}</span></div>
      </div>
      <button id="league-play-next" type="button"><small>FOUNDRY CIRCUIT · CTF 2V2</small><strong>Enter Arena</strong></button>`;
    requiredButton("league-play-next").onclick = () => {
      const route = readV2Route();
      window.location.search = buildLeagueMatchSearch(active, {
        controls: route.controls,
        sfx: route.sfx,
        skin: loadPlayerSkinPreference(),
      });
    };
  };

  const renderRoster = (active: LeagueSeasonState): void => {
    const standing = active.standings[active.playerTeamId];
    element("league-team-record").textContent =
      `${standing.wins}W · ${standing.draws}D · ${standing.losses}L · ${standing.points} PTS`;
    const roster = element("league-player-roster");
    roster.replaceChildren(
      ...active.teamRosters[active.playerTeamId].map((characterId, index) =>
        characterCard(active, characterId, index === 0 ? "CAPTAIN" : "WINGMATE")
      )
    );
    renderSkinPicker();
  };

  const renderSkinPicker = (): void => {
    const select = element("league-skin-select") as HTMLSelectElement;
    if (select.options.length !== V2_PLAYER_SKINS.length) {
      select.replaceChildren(
        ...V2_PLAYER_SKINS.map((skinId) => {
          const option = document.createElement("option");
          option.value = skinId;
          option.textContent = playerSkinLabel(skinId);
          return option;
        }),
      );
    }
    const syncPreview = (skinId: V2PlayerSkinId): void => {
      const preview = element("league-skin-preview");
      const columns = playerSkinSheetColumns(skinId);
      preview.style.setProperty(
        "--skin-sprite",
        `url('${import.meta.env?.BASE_URL ?? "/"}assets/${playerSkinSheetAssetStem(skinId)}-spritesheet-${columns}x4.png')`,
      );
      preview.style.setProperty("--skin-columns", String(columns));
    };
    select.value = loadPlayerSkinPreference();
    syncPreview(select.value as V2PlayerSkinId);
    select.onchange = () => {
      const skinId = select.value as V2PlayerSkinId;
      savePlayerSkinPreference(skinId);
      syncPreview(skinId);
    };
  };

  const renderStandings = (active: LeagueSeasonState): void => {
    const target = element("league-standings");
    target.innerHTML = `<div class="league-table-row league-table-head"><span>#</span><span>TEAM</span><span>P</span><span>W</span><span>DIFF</span><strong>PTS</strong></div>`;
    sortedLeagueStandings(active).forEach((standing, index) => {
      const team = leagueTeam(standing.teamId);
      const row = document.createElement("button");
      row.type = "button";
      row.className = `league-table-row${standing.teamId === active.playerTeamId ? " is-player-team" : ""}${standing.teamId === selectedTeamId ? " is-selected" : ""}`;
      row.style.setProperty("--team-color", team.primaryColor);
      const difference = standing.capturesFor - standing.capturesAgainst;
      row.innerHTML = `<span>${index + 1}</span><span><img class="league-table-emblem" src="${leagueTeamEmblemUrl(team.id)}" alt="">${team.name}</span><span>${standing.played}</span><span>${standing.wins}</span><span>${difference > 0 ? "+" : ""}${difference}</span><strong>${standing.points}</strong>`;
      row.onclick = () => {
        selectedTeamId = standing.teamId;
        renderStandings(active);
        renderTeamDetail(active, selectedTeamId);
      };
      target.append(row);
    });
  };

  const renderTeamDetail = (active: LeagueSeasonState, teamId: LeagueTeamId): void => {
    const team = leagueTeam(teamId);
    const target = element("league-team-detail");
    target.style.setProperty("--team-color", team.primaryColor);
    target.innerHTML = `<div class="league-detail-heading"><img class="league-large-emblem" src="${leagueTeamEmblemUrl(team.id)}" alt="${team.name} emblem"><div><small>TEAM FILE</small><h3>${team.name}</h3><p>${team.motto}</p></div></div><div class="league-detail-roster"></div>`;
    const roster = target.querySelector<HTMLElement>(".league-detail-roster")!;
    roster.replaceChildren(
      ...active.teamRosters[teamId].map((characterId) => characterCard(active, characterId))
    );
  };

  const renderRecruitment = (active: LeagueSeasonState): void => {
    if (active.recruitment.status !== "pending") {
      recruitment.classList.add("is-hidden");
      return;
    }
    recruitment.classList.remove("is-hidden");
    recruitment.innerHTML = `
      <div class="league-recruitment-card">
        <div class="v2-menu-kicker">MID-SEASON WINDOW · ONE DECISION</div>
        <h2>Recruit or stay loyal?</h2>
        <p>Replace your wingmate with one standout rival, or keep the squad together. This choice cannot be undone.</p>
        <div id="league-candidates" class="league-candidates"></div>
        <button id="league-keep-roster" class="league-keep-button" type="button">Keep Current Wingmate</button>
      </div>`;
    const candidates = element("league-candidates");
    for (const characterId of active.recruitment.candidateIds) {
      const character = leagueCharacter(characterId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "league-candidate";
      button.append(characterCard(active, characterId, `RECRUIT · ${character.rating} OVR`));
      button.onclick = () => {
        if (!window.confirm(`Recruit ${character.name} and release your current wingmate?`)) return;
        season = completeRecruitment(active, characterId);
        saveAndRender();
      };
      candidates.append(button);
    }
    requiredButton("league-keep-roster").onclick = () => {
      if (!window.confirm("Keep your current squad and close the only transfer window?")) return;
      season = completeRecruitment(active, null);
      saveAndRender();
    };
  };

  requiredButton("league-new-season").onclick = startSeason;
  requiredButton("league-back").onclick = actions.onBack;
  requiredButton("league-reset").onclick = () => {
    if (!window.confirm("Reset the current league season? All results will be lost.")) return;
    repository.clear();
    season = null;
    render();
  };

  return {
    get hasSave() { return Boolean(season); },
    open(): void {
      root.classList.remove("is-hidden");
      season = repository.load();
      selectedTeamId = season?.playerTeamId ?? "iron-vanguard";
      render();
    },
  };
}

function characterCard(
  season: LeagueSeasonState,
  characterId: string,
  badge?: string
): HTMLElement {
  const character = leagueCharacter(characterId);
  const stats = season.characterStats[characterId] ?? emptyStats(characterId);
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const card = document.createElement("article");
  card.className = "league-character";
  const sheetColumns = playerSkinSheetColumns(character.skinId);
  const sheetAssetStem = playerSkinSheetAssetStem(character.skinId);
  card.innerHTML = `
    <div class="league-character-portrait" style="--sprite:url('${assetBase}assets/${sheetAssetStem}-spritesheet-${sheetColumns}x4.png');--sprite-columns:${sheetColumns}"></div>
    <div class="league-character-info">
      <small>${badge ?? `${character.rating} OVR · ${character.role.toUpperCase()}`}</small>
      <strong>${character.name}</strong>
      <span>${character.trait}</span>
      <div class="league-character-stats"><b>${average(stats.kills, stats.matches)}<i>K/M</i></b><b>${average(stats.deaths, stats.matches)}<i>D/M</i></b><b>${stats.flagCaptures}<i>CAP</i></b></div>
    </div>`;
  return card;
}

function average(value: number, matches: number): string {
  return matches > 0 ? (value / matches).toFixed(1) : "–";
}

function emptyStats(characterId: string): LeagueCharacterStats {
  return { characterId, matches: 0, kills: 0, deaths: 0, flagPickups: 0, flagCaptures: 0, flagReturns: 0 };
}

function element(id: string): HTMLElement {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing league menu element: ${id}`);
  return result;
}

function requiredButton(id: string): HTMLButtonElement {
  return element(id) as HTMLButtonElement;
}
