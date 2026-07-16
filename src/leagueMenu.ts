import {
  buildLeagueMatchSearch,
  acknowledgeLeagueProgression,
  CHALLENGER_PREVIEW_TEAM_IDS,
  CURRENT_LEAGUE_CIRCUIT,
  LEAGUE_CIRCUITS,
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  STARTER_WINGMAN_IDS,
  foundersCircuitDiscipline,
  createLeagueRepository,
  createLeagueSeason,
  getCurrentPlayerMatch,
  getPlayerOpponent,
  leagueCharacter,
  leagueCharacterStats,
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
  const progression = element("league-progression");
  const resetDialog = element("league-reset-confirm");
  const seasonTools = element("league-season-tools") as HTMLDetailsElement;
  let season = repository.load();
  let profile = profileRepository.load();
  let selectedTeamId: LeagueTeamId | null = null;
  let editingProfile = !profile;
  let profileReview = false;
  let profileDraft: CareerProfileDraft | null = null;
  let profileReturnFocusId: string | null = null;
  let activeModal: "progression" | "reset" | null = null;

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
    const resetOpen = !resetDialog.classList.contains("is-hidden");
    const nextModal = progressionOpen
      ? "progression"
      : resetOpen
      ? "reset"
      : null;
    const modalOpen = nextModal !== null;
    menuRoot.classList.toggle("has-modal-open", modalOpen);
    if (header) header.inert = modalOpen;
    empty.inert = modalOpen;
    dashboard.inert = modalOpen;
    profileSetup.inert = modalOpen;
    progression.setAttribute("aria-hidden", String(!progressionOpen));
    resetDialog.setAttribute("aria-hidden", String(!resetOpen));
    if (nextModal === activeModal) return;

    const previousModal = activeModal;
    activeModal = nextModal;
    if (nextModal === "progression") {
      requiredButton("league-progression-continue").focus({
        preventScroll: true,
      });
    } else if (nextModal === "reset") {
      requiredButton("league-reset-cancel").focus({
        preventScroll: true,
      });
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
    seasonTools.classList.toggle("is-hidden", editingProfile || !season);
    requiredButton("league-reset").classList.toggle("is-hidden", !season);
    if (editingProfile || !profile) {
      progression.classList.add("is-hidden");
      renderProfileSetup();
      syncModalState();
      return;
    }
    if (!season) {
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
    const returnFocusId = profileReturnFocusId;
    const wasExistingProfile = Boolean(profile);
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
      editingProfile = false;
      profileReview = false;
      profileDraft = null;
      profileReturnFocusId = null;
      render();
      resetMenuScroll();
      document.getElementById(
        wasExistingProfile ? returnFocusId ?? "league-manage-team" : "league-new-season",
      )?.focus({ preventScroll: true });
    } catch (error) {
      profileReview = false;
      renderProfileSetup(
        error instanceof Error ? error.message : "Review your selections.",
        "#league-profile-error",
      );
    }
  };

  const renderProfileSetup = (errorMessage = "", restoreFocusSelector = ""): void => {
    const draft = ensureProfileDraft();
    const availableWingmen = availableProfileWingmanIds();
    const lockedWingmen = foundersRecruitableWingmanIds().filter(
      (characterId) => !availableWingmen.includes(characterId),
    );
    if (profileReview) {
      const wingman = leagueCharacter(draft.selectedWingmanId);
      const reviewKicker = profile
        ? "FINAL REVIEW · CHANGES NOT SAVED"
        : "FINAL REVIEW · NOTHING SAVED YET";
      const reviewCopy = profile
        ? "Review the pending changes. You can return without saving or apply them as one update."
        : "Check every choice before founding the team. You can still return and correct anything now.";
      profileSetup.innerHTML = `
        <div class="league-profile-review">
          <span class="league-eyebrow">${reviewKicker}</span>
          <h3 id="league-profile-review-heading" tabindex="-1">${profile ? "Confirm team changes" : "Confirm your arena identity"}</h3>
          <p>${reviewCopy}</p>
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
        renderProfileSetup("", "#league-profile-callsign");
        resetMenuScroll();
      };
      requiredButton("league-profile-confirm").onclick = finishProfileSetup;
      if (restoreFocusSelector) {
        profileSetup.querySelector<HTMLElement>(restoreFocusSelector)?.focus({
          preventScroll: true,
        });
      }
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
          <h3>${profile ? "Manage your team" : "Register for the circuit"}</h3>
          <p>${profile ? "Manage identity, captain look and wingman in one place. Nothing changes until you review and save." : "Choose every detail yourself or use Random on any field. Random choices remain a preview until the final confirmation screen."}</p>
        </div>
        ${errorMessage ? `<p id="league-profile-error" class="league-profile-error" role="alert" tabindex="-1">${escapeHtml(errorMessage)}</p>` : ""}
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
        renderProfileSetup("", `[data-emblem-id="${draft.emblemId}"]`);
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-skin-id]").forEach((button) => {
      button.onclick = () => {
        draft.captainSkinId = button.dataset.skinId as V2PlayerSkinId;
        renderProfileSetup("", `[data-skin-id="${draft.captainSkinId}"]`);
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-wingman-id]").forEach((button) => {
      button.onclick = () => {
        draft.selectedWingmanId = button.dataset.wingmanId!;
        renderProfileSetup("", `[data-wingman-id="${draft.selectedWingmanId}"]`);
      };
    });
    profileSetup.querySelectorAll<HTMLButtonElement>("[data-random]").forEach((button) => {
      button.onclick = () => {
        if (button.dataset.random === "callsign" || button.dataset.random === "names") draft.callsign = randomCallsign();
        if (button.dataset.random === "team-name" || button.dataset.random === "names") draft.teamName = randomTeamName();
        if (button.dataset.random === "emblem") draft.emblemId = randomCareerEmblem();
        if (button.dataset.random === "skin") draft.captainSkinId = randomCareerChoice(V2_PLAYER_SKINS);
        if (button.dataset.random === "wingman") draft.selectedWingmanId = randomCareerChoice(availableWingmen);
        renderProfileSetup("", `[data-random="${button.dataset.random}"]`);
      };
    });
    requiredButton("league-profile-random-all").onclick = () => {
      draft.callsign = randomCallsign();
      draft.teamName = randomTeamName();
      draft.emblemId = randomCareerEmblem();
      draft.captainSkinId = randomCareerChoice(V2_PLAYER_SKINS);
      draft.selectedWingmanId = randomCareerChoice(availableWingmen);
      renderProfileSetup("", "#league-profile-random-all");
    };
    requiredButton("league-profile-review").onclick = () => {
      draft.callsign = callsign.value;
      draft.teamName = teamName.value;
      if (draft.callsign.trim().length < 2 || draft.teamName.trim().length < 2) {
        renderProfileSetup(
          "Callsign and team name need at least two characters.",
          draft.callsign.trim().length < 2
            ? "#league-profile-callsign"
            : "#league-profile-team-name",
        );
        return;
      }
      profileReview = true;
      renderProfileSetup("", "#league-profile-review-heading");
      resetMenuScroll();
    };
    const cancel = document.getElementById("league-profile-cancel") as HTMLButtonElement | null;
    if (cancel) cancel.onclick = () => {
      const returnFocusId = profileReturnFocusId;
      editingProfile = false;
      profileReview = false;
      profileDraft = null;
      profileReturnFocusId = null;
      render();
      resetMenuScroll();
      document.getElementById(returnFocusId ?? "league-manage-team")?.focus({
        preventScroll: true,
      });
    };
    if (restoreFocusSelector) {
      profileSetup.querySelector<HTMLElement>(restoreFocusSelector)?.focus({
        preventScroll: true,
      });
    }
  };

  const renderSeasonTrack = (active: LeagueSeasonState): string => {
    const stops = active.rounds.map((round) => {
      const discipline = foundersCircuitDiscipline(round.index);
      const modeLabel = discipline.mode === "tdm"
        ? "TDM"
        : discipline.mode === "one-flag"
          ? "ONE FLAG"
          : round.index === active.rounds.length - 1 ? "CTF FINAL" : "CTF";
      const fixture = round.matches.find((match) =>
        match.homeTeamId === active.playerTeamId ||
        match.awayTeamId === active.playerTeamId
      );
      const result = fixture?.result;
      let state = round.index === active.currentRound ? "is-current" : "is-locked";
      let resultLabel = round.index === active.currentRound ? "UP NEXT" : "LOCKED";
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
      return `<span class="league-season-stop ${state}"><i>0${round.index + 1}</i><span><small>${modeLabel}</small><b>${resultLabel}</b></span></span>`;
    }).join("");
    const completed = Math.min(active.currentRound, active.rounds.length);
    const remaining = Math.max(0, active.rounds.length - completed);
    return `<div class="league-season-track" aria-label="${completed} of ${active.rounds.length} matches complete, ${remaining} remaining">
      <div class="league-season-track-summary"><small>${CURRENT_LEAGUE_CIRCUIT.name.toUpperCase()}</small><strong>${completed} OF ${active.rounds.length} COMPLETE</strong><span>${remaining} ${remaining === 1 ? "MATCH" : "MATCHES"} REMAIN</span></div>
      <div>${stops}</div>
    </div>`;
  };

  const renderHeader = (hasSeason: boolean, isEditing: boolean): void => {
    element("league-header-kicker").textContent = isEditing
      ? profile ? "CAREER · TEAM MANAGEMENT" : "CAREER · TEAM REGISTRATION"
      : hasSeason
        ? `CAREER · ${CURRENT_LEAGUE_CIRCUIT.name.toUpperCase()}`
        : "CAREER · CONTRACT BRIEFING";
    element("league-header-title").textContent = isEditing
      ? profile ? "Team Manager" : "Found Your Team"
      : hasSeason
        ? "League HQ"
        : CURRENT_LEAGUE_CIRCUIT.name;
    const standingsTitle = document.getElementById("league-standings-title");
    if (standingsTitle) standingsTitle.textContent = `${CURRENT_LEAGUE_CIRCUIT.name} Standings`;
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
    const commandStatus = document.getElementById("league-season-command-status");
    if (commandStatus) {
      commandStatus.textContent = active.status === "completed"
        ? `${CURRENT_LEAGUE_CIRCUIT.name} · ${active.rounds.length} of ${active.rounds.length} complete`
        : `${CURRENT_LEAGUE_CIRCUIT.name} · Match ${active.currentRound + 1} of ${active.rounds.length}`;
    }
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
        </div>
        ${renderSeasonTrack(active)}`;
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
          active.playerTeamId,
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
  };

  const renderStandings = (active: LeagueSeasonState): void => {
    const target = element("league-standings");
    target.innerHTML = `<div class="league-table-row league-table-head"><span>#</span><span>TEAM</span><span>P</span><span>W</span><span>D</span><span>L</span><strong>PTS</strong></div>`;
    sortedLeagueStandings(active).forEach((standing, index) => {
      const team = leagueTeam(standing.teamId);
      const teamName = displayTeamName(standing.teamId);
      const isPlayerTeam = standing.teamId === active.playerTeamId;
      const row = document.createElement("button");
      row.type = "button";
      row.className = `league-table-row${isPlayerTeam ? " is-player-team" : ""}${standing.teamId === selectedTeamId ? " is-selected" : ""}`;
      row.style.setProperty("--team-color", team.primaryColor);
      row.setAttribute("aria-controls", "league-team-detail");
      row.setAttribute("aria-pressed", String(standing.teamId === selectedTeamId));
      if (isPlayerTeam) {
        row.setAttribute("aria-current", "true");
        row.setAttribute("aria-label", `${teamName}, your team, table position ${index + 1}, ${standing.points} points. Inspect team file.`);
      }
      row.title = `Inspect ${teamName} roster`;
      row.innerHTML = `<span>${index + 1}</span><span><img class="league-table-emblem" src="${displayTeamEmblemUrl(team.id)}" alt=""><span class="league-table-team-name">${escapeHtml(teamName)}</span>${isPlayerTeam ? '<em class="league-you-badge">YOU</em>' : ""}</span><span>${standing.played}</span><span>${standing.wins}</span><span>${standing.draws}</span><span>${standing.losses}</span><strong>${standing.points}</strong>`;
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
          <p>The next opponent's expected lineup is pinned in the match dossier above. Select any team in ${CURRENT_LEAGUE_CIRCUIT.name} Standings to inspect its full roster and recorded performance.</p>
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
    const isPlayerTeam = teamId === active.playerTeamId;
    target.innerHTML = `<div class="league-detail-heading"><img class="league-large-emblem" src="${displayTeamEmblemUrl(team.id)}" alt="${escapeHtml(teamName)} emblem"><div><small>${isPlayerTeam ? "TEAM FILE" : "SCOUTING FILE"}</small><h3>${escapeHtml(teamName)}</h3><p>${isPlayerTeam && profile ? `Captain ${escapeHtml(profile.callsign)} · ${team.motto}` : team.motto}</p></div>${isPlayerTeam ? '<button id="league-team-file-manage" class="league-team-file-manage" type="button">Manage Team</button>' : ""}</div><div class="league-detail-roster"></div>`;
    const roster = target.querySelector<HTMLElement>(".league-detail-roster")!;
    roster.replaceChildren(
      ...active.teamRosters[teamId].map((characterId, index) => characterCard(
        active,
        teamId,
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
    if (isPlayerTeam) {
      requiredButton("league-team-file-manage").onclick = () => {
        openTeamManager("league-team-file-manage");
      };
    }
  };

  const renderPyramid = (active: LeagueSeasonState): void => {
    const ownPosition = sortedLeagueStandings(active).findIndex(
      (row) => row.teamId === active.playerTeamId
    ) + 1;
    const futureTeams = CHALLENGER_PREVIEW_TEAM_IDS.map((teamId) => {
      const team = leagueTeam(teamId);
      return `<img src="${leagueTeamEmblemUrl(team.id)}" alt="${team.name}" title="${team.name}">`;
    }).join("");
    const proving = LEAGUE_CIRCUITS.find((circuit) => circuit.id === "proving")!;
    const contender = LEAGUE_CIRCUITS.find((circuit) => circuit.id === "contender")!;
    const apex = LEAGUE_CIRCUITS.find((circuit) => circuit.id === "apex")!;
    element("league-pyramid").innerHTML = `
      <div class="league-tier is-locked is-elite is-apex" role="listitem"><span>0${apex.tier}</span><div><small>${apex.levelLabel}</small><strong>${apex.name}</strong><p>${apex.description}</p></div><b>COMING SOON</b></div>
      <div class="league-tier-connector" aria-hidden="true"><span>↑</span><small>ADVANCE</small></div>
      <div class="league-tier is-locked is-contender" role="listitem"><span>0${contender.tier}</span><div><small>${contender.levelLabel}</small><strong>${contender.name}</strong><p>${contender.description}</p><div class="league-tier-rivals">${futureTeams}<i>+4</i></div></div><b>COMING SOON</b></div>
      <div class="league-tier-connector is-qualification" aria-hidden="true"><span>↑</span><small>TOP 2 QUALIFY</small></div>
      <div class="league-tier is-current is-proving" role="listitem"><span>0${proving.tier}</span><div><small>${proving.levelLabel} · CURRENT</small><strong>${proving.name}</strong><p>${proving.description}</p></div><b><span>YOU ARE HERE</span><small>TABLE #${ownPosition}</small></b></div>`;
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
    const rivalRosterNames = active.teamRosters[opponent.id]
      .map((characterId) => leagueCharacter(characterId).name)
      .join(" · ");
    const headline = event.promoted
      ? "Qualification Earned"
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
        ${won ? `<div class="league-unlock-note"><small>RIVAL ROSTER AVAILABLE</small><strong>${escapeHtml(rivalRosterNames)}</strong><span>Select either fighter in Team Manager.</span></div>` : ""}
        <p>${event.promoted ? `You reached a qualification place in the ${CURRENT_LEAGUE_CIRCUIT.name}. The ${LEAGUE_CIRCUITS.find((circuit) => circuit.id === "contender")!.name} is coming soon; review your final table and squad in League HQ.` : finalRound ? "Your first circuit is complete. Review the table, strengthen your squad and run it back." : rivalResultsShiftedTable ? `The other circuit result reshaped the table and moved you to #${event.newPosition}. ${active.rounds.length - active.currentRound} match${active.rounds.length - active.currentRound === 1 ? "" : "es"} remain.` : `${active.rounds.length - active.currentRound} match${active.rounds.length - active.currentRound === 1 ? "" : "es"} remain. Every result can reshape the table.`}</p>
        <button id="league-progression-continue" type="button">Return to League HQ</button>
      </div>`;
    requiredButton("league-progression-continue").onclick = () => {
      season = acknowledgeLeagueProgression(active);
      saveAndRender();
    };
    progression.classList.remove("is-hidden");
  };

  requiredButton("league-new-season").onclick = startSeason;
  const openTeamManager = (returnFocusId: string): void => {
    profileReturnFocusId = returnFocusId;
    editingProfile = true;
    profileReview = false;
    profileDraft = null;
    render();
    resetMenuScroll();
    document.getElementById("league-profile-callsign")?.focus({ preventScroll: true });
  };
  requiredButton("league-manage-team").onclick = () => {
    openTeamManager("league-manage-team");
  };
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
    requiredButton("league-new-season").focus({ preventScroll: true });
  };

  return {
    get hasSave() { return Boolean(season || profile); },
    get homeMeta() {
      if (!season) return profile
        ? `${profile.teamName} · contract ready`
        : "TDM · One Flag · CTF · promotion awaits";
      if (season.status === "completed") return `${CURRENT_LEAGUE_CIRCUIT.name} complete · review your run`;
      return `${CURRENT_LEAGUE_CIRCUIT.name} · Match ${season.currentRound + 1} of ${season.rounds.length}`;
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
    const stats = leagueCharacterStats(season, opponentId, characterId) ?? emptyStats(characterId);
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
  teamId: LeagueTeamId,
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
  const stats = leagueCharacterStats(season, teamId, characterId) ?? emptyStats(characterId);
  const currentTeam = leagueTeam(teamId);
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
