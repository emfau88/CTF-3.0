import {
  buildLeagueMatchSearch,
  acknowledgeLeagueProgression,
  CHALLENGER_PREVIEW_TEAM_IDS,
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  STARTER_WINGMAN_IDS,
  foundersCircuitDiscipline,
  completeRecruitment,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  leagueCharacter,
  leagueTeam,
  selectLeagueWingman,
  sortedLeagueStandings,
  type LeagueCharacterStats,
  type LeagueSeasonState,
  type LeagueTeamId,
} from "./meta/league";
import {
  CAREER_PLAYER_EMBLEMS,
  createCareerProfile,
  createCareerProfileRepository,
  careerEmblemUrl,
  foundersRecruitableWingmanIds,
  randomCallsign,
  randomCareerEmblem,
  randomCareerChoice,
  randomStarterWingman,
  randomTeamName,
  syncCareerUnlocks,
  updateCareerProfile,
  wingmanUnlockTeamId,
  type CareerProfile,
  type CareerProfileDraft,
} from "./careerProfile";
import {
  loadPlayerSkinPreference,
  playerSkinLabel,
  playerSkinPortraitAssetStem,
  savePlayerSkinPreference,
} from "./playerSkinPreference";
import {
  V2_PLAYER_SKINS,
  readV2Route,
  type V2PlayerSkinId,
} from "./v2Route";

interface LeagueMenuController {
  readonly hasSave: boolean;
  readonly homeMeta: string;
  open(): void;
}

export function leagueTeamEmblemUrl(teamId: LeagueTeamId): string {
  return `${import.meta.env?.BASE_URL ?? "/"}assets/league/teams/${teamId}-emblem.png`;
}

export function createLeagueMenuController(actions: {
  readonly onBack: () => void;
}): LeagueMenuController {
  const repository = createLeagueRepository(window.localStorage);
  const profileRepository = createCareerProfileRepository(window.localStorage);
  const root = element("v2-league-hub");
  const menuRoot = document.getElementById("v2-main-menu") ?? root;
  const header = root.querySelector<HTMLElement>(".league-header");
  const empty = element("league-empty");
  const profileSetup = element("league-profile-setup");
  const dashboard = element("league-dashboard");
  const recruitment = element("league-recruitment");
  const progression = element("league-progression");
  const resetDialog = element("league-reset-confirm");
  const wingmanManager = element("league-wingman-manager");
  const seasonTools = element("league-season-tools") as HTMLDetailsElement;
  let season = repository.load();
  let profile = profileRepository.load();
  let selectedTeamId: LeagueTeamId | null = null;
  let editingProfile = !profile;
  let profileReview = false;
  let profileDraft: CareerProfileDraft | null = null;
  let pendingWingmanId: string | null = null;
  let activeModal: "progression" | "recruitment" | "reset" | "wingman" | null = null;

  const resetMenuScroll = (): void => {
    menuRoot.scrollTop = 0;
    menuRoot.scrollLeft = 0;
  };

  const displayTeamName = (teamId: LeagueTeamId): string =>
    teamId === PLAYER_LEAGUE_TEAM_ID && profile
      ? profile.teamName
      : leagueTeam(teamId).name;

  const displayTeamEmblemUrl = (teamId: LeagueTeamId): string =>
    teamId === PLAYER_LEAGUE_TEAM_ID && profile
      ? careerEmblemUrl(profile.emblemId)
      : leagueTeamEmblemUrl(teamId);

  const syncModalState = (): void => {
    const progressionOpen = !progression.classList.contains("is-hidden");
    const recruitmentOpen = !recruitment.classList.contains("is-hidden");
    const resetOpen = !resetDialog.classList.contains("is-hidden");
    const wingmanOpen = !wingmanManager.classList.contains("is-hidden");
    const nextModal = progressionOpen
      ? "progression"
      : recruitmentOpen
      ? "recruitment"
      : resetOpen
      ? "reset"
      : wingmanOpen
      ? "wingman"
      : null;
    const modalOpen = nextModal !== null;
    menuRoot.classList.toggle("has-modal-open", modalOpen);
    if (header) header.inert = modalOpen;
    empty.inert = modalOpen;
    dashboard.inert = modalOpen;
    profileSetup.inert = modalOpen;
    progression.setAttribute("aria-hidden", String(!progressionOpen));
    recruitment.setAttribute("aria-hidden", String(!recruitmentOpen));
    resetDialog.setAttribute("aria-hidden", String(!resetOpen));
    wingmanManager.setAttribute("aria-hidden", String(!wingmanOpen));
    if (nextModal === activeModal) return;

    const previousModal = activeModal;
    activeModal = nextModal;
    if (nextModal === "progression") {
      requiredButton("league-progression-continue").focus({
        preventScroll: true,
      });
    } else if (nextModal === "recruitment") {
      requiredButton("league-confirm-recruit").focus({
        preventScroll: true,
      });
    } else if (nextModal === "reset") {
      requiredButton("league-reset-cancel").focus({
        preventScroll: true,
      });
    } else if (nextModal === "wingman") {
      requiredButton("league-wingman-apply").focus({ preventScroll: true });
    } else if (previousModal === "reset") {
      document.getElementById("league-season-options")?.focus({
        preventScroll: true,
      });
    } else if (previousModal) {
      (
        document.getElementById("league-play-next") ??
        document.getElementById("league-finish-new") ??
        document.getElementById("league-back")
      )?.focus({ preventScroll: true });
    }
  };

  const saveAndRender = (): void => {
    if (season) repository.save(season);
    if (profile) profileRepository.save(profile);
    render();
  };

  const startSeason = (): void => {
    if (!profile) return;
    season = createLeagueSeason(Date.now(), profile.selectedWingmanId);
    selectedTeamId = null;
    saveAndRender();
    resetMenuScroll();
  };

  const render = (): void => {
    if (profile && season && syncCareerUnlocks(profile, season.defeatedTeamIds)) {
      profileRepository.save(profile);
    }
    renderHeader(Boolean(season), editingProfile);
    profileSetup.classList.toggle("is-hidden", !editingProfile);
    empty.classList.toggle("is-hidden", editingProfile || Boolean(season) || !profile);
    dashboard.classList.toggle("is-hidden", editingProfile || !season || !profile);
    dashboard.classList.toggle("has-progress", Boolean(season?.currentRound));
    seasonTools.classList.toggle("is-hidden", editingProfile || !profile);
    requiredButton("league-reset").classList.toggle("is-hidden", !season);
    if (editingProfile || !profile) {
      recruitment.classList.add("is-hidden");
      progression.classList.add("is-hidden");
      wingmanManager.classList.add("is-hidden");
      renderProfileSetup();
      syncModalState();
      return;
    }
    if (!season) {
      recruitment.classList.add("is-hidden");
      progression.classList.add("is-hidden");
      renderLeagueIntro();
      syncModalState();
      return;
    }
    renderNextMatch(season);
    renderRoster(season);
    renderStandings(season);
    renderTeamDetail(season, selectedTeamId);
    renderPyramid(season);
    renderProgression(season);
    renderRecruitment(season);
    syncModalState();
  };

  const availableProfileWingmanIds = (): string[] => {
    const available = new Set<string>(profile?.unlockedWingmanIds ?? STARTER_WINGMAN_IDS);
    const currentWingmanId = season?.teamRosters[PLAYER_LEAGUE_TEAM_ID]?.[1];
    if (!profile && currentWingmanId) available.add(currentWingmanId);
    for (const teamId of season?.defeatedTeamIds ?? []) {
      const team = LEAGUE_TEAMS.find((candidate) => candidate.id === teamId);
      for (const characterId of team?.characterIds ?? []) available.add(characterId);
    }
    return [...available];
  };

  const ensureProfileDraft = (): CareerProfileDraft => {
    if (profileDraft) return profileDraft;
    const availableWingmen = availableProfileWingmanIds();
    const currentWingmanId = season?.teamRosters[PLAYER_LEAGUE_TEAM_ID]?.[1];
    profileDraft = profile
      ? {
          callsign: profile.callsign,
          teamName: profile.teamName,
          emblemId: profile.emblemId,
          captainSkinId: profile.captainSkinId,
          selectedWingmanId: profile.selectedWingmanId,
        }
      : {
          callsign: randomCallsign(),
          teamName: randomTeamName(),
          emblemId: randomCareerEmblem(),
          captainSkinId: loadPlayerSkinPreference(),
          selectedWingmanId: currentWingmanId && availableWingmen.includes(currentWingmanId)
            ? currentWingmanId
            : randomStarterWingman(),
        };
    return profileDraft;
  };

  const finishProfileSetup = (): void => {
    const draft = ensureProfileDraft();
    try {
      if (profile) {
        profile = updateCareerProfile(profile, draft);
      } else {
        const starterId = STARTER_WINGMAN_IDS.includes(
          draft.selectedWingmanId as (typeof STARTER_WINGMAN_IDS)[number],
        ) ? draft.selectedWingmanId : STARTER_WINGMAN_IDS[0];
        profile = createCareerProfile({ ...draft, selectedWingmanId: starterId });
        if (season) syncCareerUnlocks(profile, season.defeatedTeamIds);
        const legacyWingmanId = season?.teamRosters[PLAYER_LEAGUE_TEAM_ID]?.[1];
        if (legacyWingmanId && !profile.unlockedWingmanIds.includes(legacyWingmanId)) {
          profile.unlockedWingmanIds.push(legacyWingmanId);
        }
        if (profile.unlockedWingmanIds.includes(draft.selectedWingmanId)) {
          profile = updateCareerProfile(profile, draft);
        }
      }
      if (season) {
        selectLeagueWingman(season, profile.selectedWingmanId);
        repository.save(season);
      }
      profileRepository.save(profile);
      savePlayerSkinPreference(profile.captainSkinId);
      editingProfile = false;
      profileReview = false;
      profileDraft = null;
      render();
      resetMenuScroll();
    } catch (error) {
      profileReview = false;
      renderProfileSetup(error instanceof Error ? error.message : "Review your selections.");
    }
  };

  const renderProfileSetup = (errorMessage = ""): void => {
    const draft = ensureProfileDraft();
    const availableWingmen = availableProfileWingmanIds();
    const lockedWingmen = foundersRecruitableWingmanIds().filter(
      (characterId) => !availableWingmen.includes(characterId),
    );
    if (profileReview) {
      const wingman = leagueCharacter(draft.selectedWingmanId);
      profileSetup.innerHTML = `
        <div class="league-profile-review">
          <span class="league-eyebrow">FINAL REVIEW · NOTHING SAVED YET</span>
          <h3>Confirm your arena identity</h3>
          <p>Check every choice before founding the team. You can still return and correct anything now, or edit the identity later from Season Options.</p>
          <div class="league-profile-lockup">
            <img src="${careerEmblemUrl(draft.emblemId)}" alt="${escapeHtml(draft.teamName)} emblem">
            <div><small>TEAM</small><strong>${escapeHtml(draft.teamName)}</strong><span>Captain ${escapeHtml(draft.callsign)}</span></div>
          </div>
          <div class="league-profile-review-squad">
            ${careerFighterOptionHtml("nova-vale", draft.captainSkinId, "CAPTAIN", true, draft.callsign)}
            ${careerFighterOptionHtml(wingman.id, wingman.skinId, "WINGMAN", true)}
          </div>
          <div class="league-profile-actions">
            <button id="league-profile-edit" class="league-profile-secondary" type="button">Edit Choices</button>
            <button id="league-profile-confirm" type="button">${profile ? "Save Changes" : "Found Team"}</button>
          </div>
        </div>`;
      requiredButton("league-profile-edit").onclick = () => {
        profileReview = false;
        renderProfileSetup();
        resetMenuScroll();
      };
      requiredButton("league-profile-confirm").onclick = finishProfileSetup;
      return;
    }

    const emblemOptions = CAREER_PLAYER_EMBLEMS.map((emblem) => `
      <button class="league-profile-emblem${emblem.id === draft.emblemId ? " is-selected" : ""}" type="button" data-emblem-id="${emblem.id}" aria-pressed="${emblem.id === draft.emblemId}">
        <img src="${careerEmblemUrl(emblem.id)}" alt=""><strong>${emblem.label}</strong><small>AVAILABLE</small>
      </button>`).join("");
    const skinOptions = V2_PLAYER_SKINS.map((skinId) =>
      careerFighterOptionHtml("nova-vale", skinId, "CAPTAIN SKIN", skinId === draft.captainSkinId, playerSkinLabel(skinId), "data-skin-id"),
    ).join("");
    const wingmanOptions = availableWingmen.map((characterId) => {
      const character = leagueCharacter(characterId);
      return careerFighterOptionHtml(characterId, character.skinId, "AVAILABLE", characterId === draft.selectedWingmanId, undefined, "data-wingman-id");
    }).join("");
    const lockedOptions = lockedWingmen.map((characterId) => {
      const character = leagueCharacter(characterId);
      const teamId = wingmanUnlockTeamId(characterId)!;
      const team = leagueTeam(teamId);
      return careerFighterOptionHtml(characterId, character.skinId, `LOCKED · DEFEAT ${team.shortName}`, false, undefined, "", true);
    }).join("");
    profileSetup.innerHTML = `
      <div class="league-profile-form">
        <div class="league-profile-intro">
          <span class="league-eyebrow">YOUR TEAM · YOUR CHOICE</span>
          <h3>${profile ? "Edit team identity" : "Register for the circuit"}</h3>
          <p>Choose every detail yourself or use Random on any field. Random choices remain a preview until the final confirmation screen.</p>
        </div>
        ${errorMessage ? `<p class="league-profile-error" role="alert">${escapeHtml(errorMessage)}</p>` : ""}
        <section class="league-profile-section league-profile-names">
          <div class="league-profile-section-heading"><div><small>01 · IDENTITY</small><h4>Names</h4></div><button type="button" data-random="names">Random Both</button></div>
          <label>Captain Callsign<div><input id="league-profile-callsign" maxlength="20" autocomplete="nickname"><button type="button" data-random="callsign">Random</button></div></label>
          <label>Team Name<div><input id="league-profile-team-name" maxlength="28" autocomplete="organization"><button type="button" data-random="team-name">Random</button></div></label>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>02 · CREST</small><h4>Team Emblem</h4></div><button type="button" data-random="emblem">Random</button></div>
          <div class="league-profile-emblems">${emblemOptions}</div>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>03 · CAPTAIN</small><h4>Arena Skin</h4></div><button type="button" data-random="skin">Random</button></div>
          <div class="league-profile-fighter-grid is-skins">${skinOptions}</div>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>04 · SQUAD</small><h4>Wingman</h4></div><button type="button" data-random="wingman">Random Available</button></div>
          <p class="league-profile-section-note">All fighters use identical gameplay rules. Three wingmen are free from the start; rival identities unlock when you defeat their team.</p>
          <div class="league-profile-fighter-grid">${wingmanOptions}</div>
          ${lockedOptions ? `<div class="league-profile-locked-heading"><small>SCOUTED · NOT YET UNLOCKED</small><span>Win league matches to expand the roster</span></div><div class="league-profile-fighter-grid is-locked">${lockedOptions}</div>` : ""}
        </section>
        <div class="league-profile-actions">
          ${profile ? `<button id="league-profile-cancel" class="league-profile-secondary" type="button">Cancel</button>` : ""}
          <button id="league-profile-random-all" class="league-profile-secondary" type="button">Randomize All</button>
          <button id="league-profile-review" type="button">Review Team</button>
        </div>
      </div>`;
    const callsign = element("league-profile-callsign") as HTMLInputElement;
    const teamName = element("league-profile-team-name") as HTMLInputElement;
    callsign.value = draft.callsign;
    teamName.value = draft.teamName;
    callsign.oninput = () => { draft.callsign = callsign.value; };
    teamName.oninput = () => { draft.teamName = teamName.value; };
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-emblem-id]").forEach((button) => {
      button.onclick = () => {
        draft.emblemId = button.dataset.emblemId as CareerProfileDraft["emblemId"];
        renderProfileSetup();
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-skin-id]").forEach((button) => {
      button.onclick = () => {
        draft.captainSkinId = button.dataset.skinId as V2PlayerSkinId;
        renderProfileSetup();
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-wingman-id]").forEach((button) => {
      button.onclick = () => {
        draft.selectedWingmanId = button.dataset.wingmanId!;
        renderProfileSetup();
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-random]").forEach((button) => {
      button.onclick = () => {
        if (button.dataset.random === "callsign" || button.dataset.random === "names") draft.callsign = randomCallsign();
        if (button.dataset.random === "team-name" || button.dataset.random === "names") draft.teamName = randomTeamName();
        if (button.dataset.random === "emblem") draft.emblemId = randomCareerEmblem();
        if (button.dataset.random === "skin") draft.captainSkinId = randomCareerChoice(V2_PLAYER_SKINS);
        if (button.dataset.random === "wingman") draft.selectedWingmanId = randomCareerChoice(availableWingmen);
        renderProfileSetup();
      };
    });
    requiredButton("league-profile-random-all").onclick = () => {
      draft.callsign = randomCallsign();
      draft.teamName = randomTeamName();
      draft.emblemId = randomCareerEmblem();
      draft.captainSkinId = randomCareerChoice(V2_PLAYER_SKINS);
      draft.selectedWingmanId = randomCareerChoice(availableWingmen);
      renderProfileSetup();
    };
    requiredButton("league-profile-review").onclick = () => {
      draft.callsign = callsign.value;
      draft.teamName = teamName.value;
      if (draft.callsign.trim().length < 2 || draft.teamName.trim().length < 2) {
        renderProfileSetup("Callsign and team name need at least two characters.");
        return;
      }
      profileReview = true;
      renderProfileSetup();
      resetMenuScroll();
    };
    const cancel = document.getElementById("league-profile-cancel") as HTMLButtonElement | null;
    if (cancel) cancel.onclick = () => {
      editingProfile = false;
      profileReview = false;
      profileDraft = null;
      render();
      resetMenuScroll();
    };
  };

  const renderSeasonTrack = (active: LeagueSeasonState): string => {
    const stops = active.rounds.map((round) => {
      const fixture = round.matches.find((match) =>
        match.homeTeamId === active.playerTeamId ||
        match.awayTeamId === active.playerTeamId
      );
      const result = fixture?.result;
      let state = round.index === active.currentRound ? "is-current" : "is-open";
      let resultLabel = round.index === active.currentRound ? "NEXT" : "OPEN";
      if (result) {
        const playerIsBlue = result.blueTeamId === active.playerTeamId;
        const playerScore = playerIsBlue ? result.blueScore : result.redScore;
        const rivalScore = playerIsBlue ? result.redScore : result.blueScore;
        const outcome = playerScore > rivalScore
          ? "W"
          : playerScore === rivalScore ? "D" : "L";
        state = outcome === "W"
          ? "is-win"
          : outcome === "D" ? "is-draw" : "is-loss";
        resultLabel = `${outcome} ${playerScore}:${rivalScore}`;
      }
      return `<span class="league-season-stop ${state}"><i>0${round.index + 1}</i><b>${resultLabel}</b></span>`;
    }).join("");
    return `<div class="league-season-track" aria-label="Three match season progress"><small>SEASON RUN</small><div>${stops}</div></div>`;
  };

  const renderHeader = (hasSeason: boolean, isEditing: boolean): void => {
    element("league-header-kicker").textContent = isEditing
      ? "CAREER · TEAM REGISTRATION"
      : hasSeason
        ? "CAREER · FOUNDERS SEASON"
        : "CAREER · CONTRACT BRIEFING";
    element("league-header-title").textContent = isEditing
      ? "Found Your Team"
      : hasSeason
        ? "League HQ"
        : "Founders Circuit";
  };

  const renderLeagueIntro = (): void => {
    if (!profile) return;
    element("league-intro-title").textContent = `Lead ${profile.teamName}`;
    const introEmblem = element("league-intro-emblem") as HTMLImageElement;
    introEmblem.src = careerEmblemUrl(profile.emblemId);
    introEmblem.alt = `${profile.teamName} emblem`;
    element("league-intro-team-name").textContent = profile.teamName.toUpperCase();
    const preview = createLeagueSeason(1, profile.selectedWingmanId);
    element("league-intro-route").innerHTML = preview.rounds.map((round) => {
      const match = round.matches.find((fixture) =>
        fixture.homeTeamId === preview.playerTeamId || fixture.awayTeamId === preview.playerTeamId
      )!;
      const opponentId = match.homeTeamId === preview.playerTeamId
        ? match.awayTeamId
        : match.homeTeamId;
      const opponent = leagueTeam(opponentId);
      const discipline = foundersCircuitDiscipline(round.index);
      return `<article class="league-intro-stop">
        <span>0${round.index + 1}</span>
        <img src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name}">
        <div><small>${discipline.trialLabel}</small><strong>${discipline.modeLabel}</strong><i>${discipline.mapLabel} · vs ${opponent.name}</i></div>
      </article>`;
    }).join("");
  };

  const renderNextMatch = (active: LeagueSeasonState): void => {
    const target = element("league-next-match");
    const table = sortedLeagueStandings(active);
    const ownPosition = table.findIndex((row) => row.teamId === active.playerTeamId) + 1;
    const match = getCurrentPlayerMatch(active);
    const opponentId = getPlayerOpponent(active, match);
    if (active.status === "completed" || !match || !opponentId) {
      const champion = leagueTeam(table[0].teamId);
      const championName = displayTeamName(champion.id);
      target.innerHTML = `
        <div class="league-season-complete">
          <img class="league-champion-emblem" src="${displayTeamEmblemUrl(champion.id)}" alt="${escapeHtml(championName)} emblem">
          <div><span class="league-eyebrow">SEASON COMPLETE</span><h3>${escapeHtml(championName)} take the title</h3>
          <p>You finished <strong>#${ownPosition}</strong> with <strong>${active.standings[active.playerTeamId].points} points</strong>.</p></div>
          <button id="league-finish-new" type="button">Start New Season</button>
        </div>`;
      requiredButton("league-finish-new").onclick = () => {
        if (window.confirm("Replace this completed season with a new one?")) startSeason();
      };
      return;
    }
    const opponent = leagueTeam(opponentId);
    const ownTeamName = displayTeamName(active.playerTeamId);
    const discipline = foundersCircuitDiscipline(active.currentRound);
    const opponentStanding = active.standings[opponentId];
    const opponentLineup = renderOpponentLineup(active, opponentId);
    target.style.setProperty("--opponent-color", opponent.primaryColor);
    target.innerHTML = `
      <div class="league-fixture-meta">
        <span class="league-eyebrow">${discipline.trialLabel.toUpperCase()} · MATCH ${active.currentRound + 1} OF ${active.rounds.length}</span>
        <div class="league-fixture-title">
          <img class="league-mini-emblem" src="${displayTeamEmblemUrl(active.playerTeamId)}" alt="${escapeHtml(ownTeamName)} emblem">
          <div class="league-fixture-team"><small>YOUR SQUAD</small><strong>${escapeHtml(ownTeamName)}</strong></div>
          <b>VS</b>
        </div>
      </div>
      <div class="league-opponent-copy">
        <div class="league-opponent-heading">
          <img class="league-opponent-emblem" src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name} emblem">
          <div><small>NEXT OPPONENT</small><h3>${opponent.name}</h3><p>${opponent.motto}</p></div>
        </div>
        <div class="league-opponent-form"><span>#${sortedLeagueStandings(active).findIndex((row) => row.teamId === opponentId) + 1} TABLE</span><span>${opponentStanding.points} PTS</span><span>${opponentStanding.wins}-${opponentStanding.draws}-${opponentStanding.losses}</span></div>
        <div class="league-opponent-lineup" aria-label="${opponent.name} expected lineup">
          <small class="league-opponent-lineup-label">EXPECTED LINEUP</small>
          ${opponentLineup}
        </div>
      </div>
      <button id="league-play-next" type="button"><small>${discipline.mapLabel.toUpperCase()} · ${discipline.modeLabel.toUpperCase()} 2V2</small><strong>Enter Arena</strong></button>
      ${renderSeasonTrack(active)}`;
    requiredButton("league-play-next").onclick = () => {
      const route = readV2Route();
      window.location.search = buildLeagueMatchSearch(active, {
        controls: route.controls,
        sfx: route.sfx,
        skin: profile?.captainSkinId ?? loadPlayerSkinPreference(),
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
        characterCard(
          active,
          characterId,
          index === 0 ? "CAPTAIN" : "WINGMATE",
          true,
          index === 0 && profile
            ? {
                name: profile.callsign,
                personality: `Captain of ${profile.teamName}`,
                visualStyle: playerSkinLabel(profile.captainSkinId),
                skinId: profile.captainSkinId,
              }
            : undefined,
        )
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
      preview.style.setProperty(
        "--skin-portrait",
        `url('${import.meta.env?.BASE_URL ?? "/"}assets/ui/portraits/${playerSkinPortraitAssetStem(skinId)}.png')`,
      );
    };
    select.value = profile?.captainSkinId ?? loadPlayerSkinPreference();
    syncPreview(select.value as V2PlayerSkinId);
    select.onchange = () => {
      const skinId = select.value as V2PlayerSkinId;
      savePlayerSkinPreference(skinId);
      if (profile) {
        profile = updateCareerProfile(profile, { ...profile, captainSkinId: skinId });
        profileRepository.save(profile);
        if (season) renderRoster(season);
      }
      syncPreview(skinId);
    };
  };

  const renderStandings = (active: LeagueSeasonState): void => {
    const target = element("league-standings");
    target.innerHTML = `<div class="league-table-row league-table-head"><span>#</span><span>TEAM</span><span>P</span><span>W</span><span>D</span><span>L</span><strong>PTS</strong></div>`;
    sortedLeagueStandings(active).forEach((standing, index) => {
      const team = leagueTeam(standing.teamId);
      const teamName = displayTeamName(standing.teamId);
      const row = document.createElement("button");
      row.type = "button";
      row.className = `league-table-row${standing.teamId === active.playerTeamId ? " is-player-team" : ""}${standing.teamId === selectedTeamId ? " is-selected" : ""}`;
      row.style.setProperty("--team-color", team.primaryColor);
      row.setAttribute("aria-controls", "league-team-detail");
      row.setAttribute("aria-pressed", String(standing.teamId === selectedTeamId));
      row.title = `Inspect ${teamName} roster`;
      row.innerHTML = `<span>${index + 1}</span><span><img class="league-table-emblem" src="${displayTeamEmblemUrl(team.id)}" alt="">${escapeHtml(teamName)}</span><span>${standing.played}</span><span>${standing.wins}</span><span>${standing.draws}</span><span>${standing.losses}</span><strong>${standing.points}</strong>`;
      row.onclick = () => {
        selectedTeamId = standing.teamId;
        renderStandings(active);
        renderTeamDetail(active, selectedTeamId);
      };
      target.append(row);
    });
  };

  const renderTeamDetail = (
    active: LeagueSeasonState,
    teamId: LeagueTeamId | null,
  ): void => {
    const target = element("league-team-detail");
    target.classList.toggle("is-scouting-index", teamId === null);
    if (!teamId) {
      target.style.removeProperty("--team-color");
      target.innerHTML = `
        <div class="league-scouting-index">
          <small>SCOUTING NETWORK</small>
          <h3>Choose a team file</h3>
          <p>The next opponent's expected lineup is pinned in the match dossier above. Select any team in Founders Standings to inspect its full roster and recorded performance.</p>
          <div class="league-scouting-index-points" aria-label="Available scouting information">
            <span><b>NEXT</b><i>Match dossier above</i></span>
            <span><b>ROSTER</b><i>Fighter identities</i></span>
            <span><b>FORM</b><i>Recorded career data</i></span>
          </div>
        </div>`;
      return;
    }
    const team = leagueTeam(teamId);
    const teamName = displayTeamName(teamId);
    target.style.setProperty("--team-color", team.primaryColor);
    target.innerHTML = `<div class="league-detail-heading"><img class="league-large-emblem" src="${displayTeamEmblemUrl(team.id)}" alt="${escapeHtml(teamName)} emblem"><div><small>${teamId === active.playerTeamId ? "TEAM FILE" : "SCOUTING FILE"}</small><h3>${escapeHtml(teamName)}</h3><p>${teamId === active.playerTeamId && profile ? `Captain ${escapeHtml(profile.callsign)} · ${team.motto}` : team.motto}</p></div></div><div class="league-detail-roster"></div>`;
    const roster = target.querySelector<HTMLElement>(".league-detail-roster")!;
    roster.replaceChildren(
      ...active.teamRosters[teamId].map((characterId, index) => characterCard(
        active,
        characterId,
        undefined,
        true,
        teamId === active.playerTeamId && index === 0 && profile
          ? {
              name: profile.callsign,
              personality: `Captain of ${profile.teamName}`,
              visualStyle: playerSkinLabel(profile.captainSkinId),
              skinId: profile.captainSkinId,
            }
          : undefined,
      ))
    );
  };

  const renderRecruitment = (active: LeagueSeasonState): void => {
    if (active.recruitment.status !== "pending" || active.lastProgression?.acknowledged === false) {
      recruitment.classList.add("is-hidden");
      return;
    }
    recruitment.classList.remove("is-hidden");
    const currentWingmateId = active.teamRosters[active.playerTeamId][1];
    const initialCandidateId = active.recruitment.candidateIds[0] ?? null;
    recruitment.innerHTML = `
      <div class="league-recruitment-card">
        <div class="v2-menu-kicker">CIRCUIT REWARD &middot; COSMETIC CHOICE</div>
        <h2>Recruit or stay loyal?</h2>
        <p class="league-cosmetic-contract"><strong>Identical arena stats.</strong> Recruitment changes the fighter's look, name and personality only. It never changes health, speed, damage, AI skill or match simulation.</p>
        <div id="league-recruitment-comparison" class="league-recruitment-comparison"></div>
        <div><small class="league-choice-label">AVAILABLE LOOKS</small><div id="league-candidates" class="league-candidates"></div></div>
        <div class="league-recruitment-actions">
          <button id="league-confirm-recruit" type="button">Recruit Selected Fighter</button>
          <button id="league-keep-roster" class="league-keep-button" type="button">Keep Current Wingmate</button>
        </div>
      </div>`;
    const candidates = element("league-candidates");
    let selectedCandidateId = initialCandidateId;
    const comparison = element("league-recruitment-comparison");
    const confirmButton = requiredButton("league-confirm-recruit");

    const renderComparison = (): void => {
      comparison.replaceChildren();
      const current = document.createElement("section");
      current.className = "league-recruitment-side is-current";
      current.innerHTML = "<small>CURRENT WINGMATE</small>";
      current.append(characterCard(active, currentWingmateId, "CURRENT LOOK", false));
      const divider = document.createElement("span");
      divider.className = "league-recruitment-swap";
      divider.setAttribute("aria-hidden", "true");
      divider.textContent = "OR";
      const candidate = document.createElement("section");
      candidate.className = "league-recruitment-side is-candidate";
      candidate.innerHTML = "<small>SELECTED RECRUIT</small>";
      if (selectedCandidateId) {
        candidate.append(characterCard(active, selectedCandidateId, "COSMETIC OPTION", false));
        confirmButton.disabled = false;
        confirmButton.textContent = `Recruit ${leagueCharacter(selectedCandidateId).name}`;
      } else {
        candidate.append("No recruit available");
        confirmButton.disabled = true;
      }
      comparison.append(current, divider, candidate);
    };

    for (const characterId of active.recruitment.candidateIds) {
      const character = leagueCharacter(characterId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `league-candidate${characterId === selectedCandidateId ? " is-selected" : ""}`;
      button.setAttribute("aria-pressed", String(characterId === selectedCandidateId));
      button.append(characterCard(active, characterId, "SELECT LOOK", false));
      button.onclick = () => {
        selectedCandidateId = characterId;
        for (const option of Array.from(
          candidates.querySelectorAll<HTMLButtonElement>(".league-candidate"),
        )) {
          const selected = option === button;
          option.classList.toggle("is-selected", selected);
          option.setAttribute("aria-pressed", String(selected));
        }
        renderComparison();
      };
      candidates.append(button);
    }
    confirmButton.onclick = () => {
      if (!selectedCandidateId) return;
      season = completeRecruitment(active, selectedCandidateId);
      if (profile) {
        if (!profile.unlockedWingmanIds.includes(selectedCandidateId)) {
          profile.unlockedWingmanIds.push(selectedCandidateId);
        }
        profile = updateCareerProfile(profile, {
          ...profile,
          selectedWingmanId: selectedCandidateId,
        });
      }
      saveAndRender();
    };
    requiredButton("league-keep-roster").onclick = () => {
      season = completeRecruitment(active, null);
      saveAndRender();
    };
    renderComparison();
  };

  const closeWingmanManager = (): void => {
    wingmanManager.classList.add("is-hidden");
    pendingWingmanId = null;
    syncModalState();
  };

  const renderWingmanManager = (): void => {
    if (!profile || !season) return;
    const available = new Set(profile.unlockedWingmanIds);
    const allWingmen = [...new Set([
      ...STARTER_WINGMAN_IDS,
      ...foundersRecruitableWingmanIds(),
    ])];
    pendingWingmanId = pendingWingmanId && available.has(pendingWingmanId)
      ? pendingWingmanId
      : profile.selectedWingmanId;
    const options = allWingmen.map((characterId) => {
      const character = leagueCharacter(characterId);
      const unlocked = available.has(characterId);
      const unlockTeamId = wingmanUnlockTeamId(characterId);
      const badge = unlocked
        ? characterId === profile!.selectedWingmanId ? "CURRENT WINGMAN" : "AVAILABLE"
        : `LOCKED · DEFEAT ${unlockTeamId ? leagueTeam(unlockTeamId).shortName : "RIVAL"}`;
      return careerFighterOptionHtml(
        characterId,
        character.skinId,
        badge,
        unlocked && characterId === pendingWingmanId,
        undefined,
        unlocked ? "data-manager-wingman-id" : "",
        !unlocked,
      );
    }).join("");
    wingmanManager.innerHTML = `
      <div class="league-wingman-card">
        <span class="league-eyebrow">SQUAD MANAGEMENT · COSMETIC ONLY</span>
        <h2 id="league-wingman-title">Choose your wingman</h2>
        <p>Every wingman follows the same bot rules and uses identical combat values. Locked rivals become selectable after you defeat their team.</p>
        <div class="league-wingman-toolbar"><small>${available.size} AVAILABLE</small><button id="league-wingman-random" type="button">Random Available</button></div>
        <div class="league-profile-fighter-grid">${options}</div>
        <div class="league-profile-actions">
          <button id="league-wingman-cancel" class="league-profile-secondary" type="button">Cancel</button>
          <button id="league-wingman-apply" type="button">Apply Wingman</button>
        </div>
      </div>`;
    wingmanManager.querySelectorAll<HTMLButtonElement>("[data-manager-wingman-id]").forEach((button) => {
      button.onclick = () => {
        pendingWingmanId = button.dataset.managerWingmanId!;
        renderWingmanManager();
      };
    });
    requiredButton("league-wingman-random").onclick = () => {
      pendingWingmanId = randomCareerChoice(profile!.unlockedWingmanIds);
      renderWingmanManager();
    };
    requiredButton("league-wingman-cancel").onclick = closeWingmanManager;
    requiredButton("league-wingman-apply").onclick = () => {
      if (!profile || !season || !pendingWingmanId) return;
      selectLeagueWingman(season, pendingWingmanId);
      profile = updateCareerProfile(profile, {
        ...profile,
        selectedWingmanId: pendingWingmanId,
      });
      wingmanManager.classList.add("is-hidden");
      pendingWingmanId = null;
      saveAndRender();
    };
    wingmanManager.onkeydown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeWingmanManager();
    };
  };

  const openWingmanManager = (): void => {
    pendingWingmanId = profile?.selectedWingmanId ?? null;
    wingmanManager.classList.remove("is-hidden");
    renderWingmanManager();
    syncModalState();
  };

  const renderPyramid = (active: LeagueSeasonState): void => {
    const ownPosition = sortedLeagueStandings(active).findIndex(
      (row) => row.teamId === active.playerTeamId
    ) + 1;
    const futureTeams = CHALLENGER_PREVIEW_TEAM_IDS.map((teamId) => {
      const team = leagueTeam(teamId);
      return `<img src="${leagueTeamEmblemUrl(team.id)}" alt="${team.name}" title="${team.name}">`;
    }).join("");
    element("league-pyramid").innerHTML = `
      <div class="league-tier is-locked is-elite"><span>03</span><div><small>ULTIMATE GOAL</small><strong>Core League</strong><p>The elite arena. Championship rivals and the final title.</p></div><b>LOCKED</b></div>
      <div class="league-tier is-locked"><span>02</span><div><small>NEXT CIRCUIT</small><strong>Challenger League</strong><p>Six rival teams and a longer season await.</p><div class="league-tier-rivals">${futureTeams}<i>+4</i></div></div><b>NEXT</b></div>
      <div class="league-tier is-current"><span>01</span><div><small>CURRENT CONTRACT</small><strong>Founders Circuit</strong><p>Three matches. Top two earn promotion.</p></div><b>#${ownPosition}</b></div>`;
  };

  const renderProgression = (active: LeagueSeasonState): void => {
    const event = active.lastProgression;
    if (!event || event.acknowledged) {
      progression.classList.add("is-hidden");
      return;
    }
    const opponent = leagueTeam(event.opponentId);
    const won = event.blueScore > event.redScore;
    const drawn = event.blueScore === event.redScore;
    const positionDelta = event.previousPosition - event.newPosition;
    const pointsGained = event.newPoints - event.previousPoints;
    const rivalResultsShiftedTable = !won && positionDelta !== 0;
    const finalRound = event.roundIndex === active.rounds.length - 1;
    const playerTeamName = displayTeamName(active.playerTeamId);
    const discipline = foundersCircuitDiscipline(event.roundIndex);
    const headline = event.promoted
      ? "Promotion Secured"
      : finalRound
        ? "Circuit Complete"
        : won && positionDelta > 0
          ? `Up ${positionDelta} Place${positionDelta === 1 ? "" : "s"}`
          : won ? "Momentum Built" : drawn ? "Point Secured" : "The Climb Continues";
    progression.innerHTML = `
      <div class="league-progression-card ${won ? "is-win" : drawn ? "is-draw" : "is-loss"}">
        <div class="league-progression-glow"></div>
        <span class="league-eyebrow">${discipline.modeLabel.toUpperCase()} COMPLETE · MATCH ${event.roundIndex + 1} OF ${active.rounds.length}</span>
        <h2>${headline}</h2>
        <div class="league-result-lockup">
          <div><img src="${displayTeamEmblemUrl(active.playerTeamId)}" alt="${escapeHtml(playerTeamName)}"><small>${escapeHtml(playerTeamName.toUpperCase())}</small></div>
          <strong>${event.blueScore}<i>:</i>${event.redScore}</strong>
          <div><img src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name}"><small>${opponent.name}</small></div>
        </div>
        <div class="league-rank-shift">
          <div><small>BEFORE</small><strong>#${event.previousPosition}</strong></div>
          <span>→</span>
          <div class="is-new"><small>NOW</small><strong>#${event.newPosition}</strong></div>
          <div class="league-points-earned${pointsGained === 0 ? " is-zero" : ""}"><small>LEAGUE POINTS</small><strong>${pointsGained > 0 ? `+${pointsGained}` : "0"}</strong><span>${event.newPoints} TOTAL</span></div>
        </div>
        <p>${event.promoted ? "The Challenger League is now within reach. Claim your circuit recruit and prepare for tougher rivals." : finalRound ? "Your first circuit is complete. Review the table, strengthen your squad and run it back." : rivalResultsShiftedTable ? `The other circuit result reshaped the table and moved you to #${event.newPosition}. ${active.rounds.length - active.currentRound} match${active.rounds.length - active.currentRound === 1 ? "" : "es"} remain.` : `${active.rounds.length - active.currentRound} match${active.rounds.length - active.currentRound === 1 ? "" : "es"} remain. Every result can reshape the table.`}</p>
        <button id="league-progression-continue" type="button">${active.recruitment.status === "pending" ? "Claim Circuit Reward" : "Return to League HQ"}</button>
      </div>`;
    requiredButton("league-progression-continue").onclick = () => {
      season = acknowledgeLeagueProgression(active);
      saveAndRender();
    };
    progression.classList.remove("is-hidden");
  };

  requiredButton("league-new-season").onclick = startSeason;
  requiredButton("league-edit-profile").onclick = () => {
    seasonTools.open = false;
    editingProfile = true;
    profileReview = false;
    profileDraft = null;
    render();
    resetMenuScroll();
  };
  requiredButton("league-manage-wingman").onclick = openWingmanManager;
  requiredButton("league-back").onclick = () => {
    menuRoot.classList.remove("has-modal-open");
    actions.onBack();
  };
  requiredButton("league-reset").onclick = () => {
    seasonTools.open = false;
    resetDialog.classList.remove("is-hidden");
    syncModalState();
  };
  const cancelReset = (): void => {
    resetDialog.classList.add("is-hidden");
    syncModalState();
  };
  requiredButton("league-reset-cancel").onclick = cancelReset;
  resetDialog.onkeydown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cancelReset();
  };
  requiredButton("league-reset-confirm-button").onclick = () => {
    resetDialog.classList.add("is-hidden");
    repository.clear();
    season = null;
    render();
    resetMenuScroll();
  };

  return {
    get hasSave() { return Boolean(season || profile); },
    get homeMeta() {
      if (!season) return profile
        ? `${profile.teamName} · contract ready`
        : "TDM · One Flag · CTF · promotion awaits";
      if (season.status === "completed") return "Founders Circuit complete · review your run";
      return `Founders Circuit · Match ${season.currentRound + 1} of ${season.rounds.length}`;
    },
    open(): void {
      root.classList.remove("is-hidden");
      season = repository.load();
      profile = profileRepository.load();
      editingProfile = !profile;
      profileReview = false;
      profileDraft = null;
      selectedTeamId = null;
      render();
      resetMenuScroll();
    },
  };
}

function renderOpponentLineup(
  season: LeagueSeasonState,
  opponentId: LeagueTeamId,
): string {
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  return season.teamRosters[opponentId].map((characterId, index) => {
    const character = leagueCharacter(characterId);
    const stats = season.characterStats[characterId] ?? emptyStats(characterId);
    const portraitAssetStem = playerSkinPortraitAssetStem(character.skinId);
    const performance = stats.matches > 0
      ? `<div class="league-opponent-member-stats" aria-label="${character.name} recorded career performance"><b>${average(stats.kills, stats.matches)}<i>K/M</i></b><b>${average(stats.deaths, stats.matches)}<i>D/M</i></b><b>${stats.flagCaptures}<i>CAP</i></b></div>`
      : `<span class="league-opponent-member-new">No season data</span>`;
    return `
      <article class="league-opponent-member">
        <div class="league-opponent-member-portrait" style="--skin-portrait:url('${assetBase}assets/ui/portraits/${portraitAssetStem}.png')" aria-hidden="true"></div>
        <div class="league-opponent-member-copy">
          <small>FIGHTER 0${index + 1}</small>
          <strong>${character.name}</strong>
          <span>${character.visualStyle}</span>
          ${performance}
        </div>
      </article>`;
  }).join("");
}

function characterCard(
  season: LeagueSeasonState,
  characterId: string,
  badge?: string,
  showStats = true,
  presentation?: {
    readonly name: string;
    readonly personality: string;
    readonly visualStyle: string;
    readonly skinId: V2PlayerSkinId;
  },
): HTMLElement {
  const character = leagueCharacter(characterId);
  const stats = season.characterStats[characterId] ?? emptyStats(characterId);
  const currentTeam = LEAGUE_TEAMS.find((team) =>
    season.teamRosters[team.id].includes(characterId)
  );
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const card = document.createElement("article");
  card.className = "league-character";
  const portraitAssetStem = playerSkinPortraitAssetStem(presentation?.skinId ?? character.skinId);
  card.innerHTML = `
    <div class="league-character-portrait" style="--skin-portrait:url('${assetBase}assets/ui/portraits/${portraitAssetStem}.png')"></div>
    <div class="league-character-info">
      <small>${badge ?? `${currentTeam?.shortName ?? "ARENA"} &middot; COSMETIC FIGHTER`}</small>
      <strong>${escapeHtml(presentation?.name ?? character.name)}</strong>
      <span>${escapeHtml(presentation?.personality ?? character.personality)}</span>
      <em>${escapeHtml(presentation?.visualStyle ?? character.visualStyle)}</em>
      ${showStats ? `<div class="league-character-stats" aria-label="Recorded career performance"><b>${average(stats.kills, stats.matches)}<i>K/M</i></b><b>${average(stats.deaths, stats.matches)}<i>D/M</i></b><b>${stats.flagCaptures}<i>CAP</i></b></div>` : ""}
    </div>`;
  return card;
}

function careerFighterOptionHtml(
  characterId: string,
  skinId: V2PlayerSkinId,
  badge: string,
  selected: boolean,
  displayName?: string,
  dataAttribute = "",
  locked = false,
): string {
  const character = leagueCharacter(characterId);
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const portrait = `${assetBase}assets/ui/portraits/${playerSkinPortraitAssetStem(skinId)}.png`;
  const tag = locked || !dataAttribute ? "article" : "button";
  const attribute = dataAttribute ? ` ${dataAttribute}="${characterId === "nova-vale" ? skinId : characterId}"` : "";
  const interaction = tag === "button"
    ? ` type="button" aria-pressed="${selected}"`
    : "";
  return `<${tag} class="league-profile-fighter${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}"${attribute}${interaction}>
    <span class="league-profile-fighter-portrait" style="--skin-portrait:url('${portrait}')" aria-hidden="true"></span>
    <span class="league-profile-fighter-copy"><small>${escapeHtml(badge)}</small><strong>${escapeHtml(displayName ?? character.name)}</strong><i>${escapeHtml(displayName ? playerSkinLabel(skinId) : character.visualStyle)}</i></span>
    ${locked ? '<b aria-hidden="true">LOCKED</b>' : ""}
  </${tag}>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);
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
