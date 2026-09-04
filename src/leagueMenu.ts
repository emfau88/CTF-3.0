import {
  buildLeagueMatchSearch,
  acknowledgeLeagueProgression,
  CHALLENGER_PREVIEW_TEAM_IDS,
  CURRENT_LEAGUE_CIRCUIT,
  LEAGUE_CIRCUITS,
  LEAGUE_TEAMS,
  PLAYER_LEAGUE_TEAM_ID,
  STARTER_WINGMAN_IDS,
  leagueCircuitDiscipline,
  completeRecruitment,
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
import type { BotArchetypeId } from "./core/bots";
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
import { applyUiTranslations, uiText, type UiCopyKey } from "./uiLocale";
import type { AnalyticsPort, SavePort } from "./platform";

interface LeagueMenuController {
  readonly hasSave: boolean;
  readonly homeMeta: string;
  open(): void;
  refresh(): void;
}

export function leagueTeamEmblemUrl(teamId: LeagueTeamId): string {
  return `${import.meta.env?.BASE_URL ?? "/"}assets/league/teams/${teamId}-emblem.png`;
}

const TEAM_MOTTO_KEYS: Readonly<Partial<Record<LeagueTeamId, UiCopyKey>>> = {
  "iron-vanguard": "league.mottoIronVanguard",
  "crimson-jackals": "league.mottoCrimsonJackals",
  "neon-phantoms": "league.mottoNeonPhantoms",
  "grave-circuit": "league.mottoGraveCircuit",
  "solar-wardens": "league.mottoSolarWardens",
  "void-runners": "league.mottoVoidRunners",
};

const CHARACTER_PERSONALITY_KEYS: Readonly<Record<string, UiCopyKey>> = {
  "nova-vale": "league.personalityNovaVale",
  "atlas-rho": "league.personalityAtlasRho",
  "lyra-quell": "league.personalityLyraQuell",
  "dax-ember": "league.personalityDaxEmber",
  "kael-voss": "league.personalityKaelVoss",
  "mara-hex": "league.personalityMaraHex",
  "nyx-echo": "league.personalityNyxEcho",
  "vektor-nine": "league.personalityVektorNine",
  "rook-13": "league.personalityRook13",
  "sable-kern": "league.personalitySableKern",
  "orion-flare": "league.personalityOrionFlare",
  "senna-ray": "league.personalitySennaRay",
  "kestrel-void": "league.personalityKestrelVoid",
  "ion-drift": "league.personalityIonDrift",
};

const ARCHETYPE_COPY_KEYS: Readonly<Record<BotArchetypeId, {
  readonly label: UiCopyKey;
  readonly description: UiCopyKey;
}>> = {
  assault: {
    label: "league.archetypeAssault",
    description: "league.archetypeAssaultCopy",
  },
  guardian: {
    label: "league.archetypeGuardian",
    description: "league.archetypeGuardianCopy",
  },
  objective: {
    label: "league.archetypeObjective",
    description: "league.archetypeObjectiveCopy",
  },
  "all-rounder": {
    label: "league.archetypeAllRounder",
    description: "league.archetypeAllRounderCopy",
  },
};

function localizedTeamMotto(teamId: LeagueTeamId, fallback: string): string {
  const key = TEAM_MOTTO_KEYS[teamId];
  return key ? uiText(key) : fallback;
}

function localizedCharacterPersonality(characterId: string, fallback: string): string {
  const key = CHARACTER_PERSONALITY_KEYS[characterId];
  return key ? uiText(key) : fallback;
}

function localizedArchetype(archetypeId: BotArchetypeId): {
  readonly label: string;
  readonly description: string;
} {
  const keys = ARCHETYPE_COPY_KEYS[archetypeId];
  return {
    label: uiText(keys.label),
    description: uiText(keys.description),
  };
}

function localizedDisciplineMode(mode: "tdm" | "ctf" | "one-flag"): string {
  return uiText(mode === "tdm" ? "custom.modeTdm" : mode === "ctf" ? "custom.modeCtf" : "custom.modeOneFlag");
}

function localizedTrialLabel(mode: "tdm" | "ctf" | "one-flag"): string {
  return uiText(mode === "tdm" ? "league.trialCanopy" : mode === "ctf" ? "league.trialFinal" : "league.trialClash");
}

export function createLeagueMenuController(actions: {
  readonly onBack: () => void;
  readonly storage?: SavePort;
  readonly analytics?: AnalyticsPort;
}): LeagueMenuController {
  const storage = actions.storage ?? window.localStorage;
  const repository = createLeagueRepository(storage);
  const profileRepository = createCareerProfileRepository(storage);
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
  let reportedRecruitmentSeasonId: string | null = null;

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
      const continueButton = requiredButton("league-progression-continue");
      const focusTarget = continueButton.disabled
        ? progression.querySelector<HTMLButtonElement>(
            "#league-recruitment-keep, [data-recruitment-choice]",
          ) ?? continueButton
        : continueButton;
      focusTarget.focus({
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
    actions.analytics?.track("league_started", { seasonId: season.seasonId });
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
      if (!wasExistingProfile) {
        actions.analytics?.track("team_created", {
          selectedWingmanId: profile.selectedWingmanId,
        });
      }
      actions.analytics?.track("wingman_selected", {
        characterId: profile.selectedWingmanId,
        source: "team-setup",
      });
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
        error instanceof Error ? error.message : uiText("league.reviewSelections"),
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
        ? uiText("league.profileReviewUnsaved")
        : uiText("league.profileReviewNew");
      const reviewCopy = uiText(profile
        ? "league.profileReviewChangesCopy"
        : "league.profileReviewIdentityCopy");
      profileSetup.innerHTML = `
        <div class="league-profile-review">
          <span class="league-eyebrow">${reviewKicker}</span>
          <h3 id="league-profile-review-heading" tabindex="-1">${uiText(profile ? "league.profileConfirmChanges" : "league.profileConfirmIdentity")}</h3>
          <p>${reviewCopy}</p>
          <div class="league-profile-lockup">
            <img src="${careerEmblemUrl(draft.emblemId)}" alt="${escapeHtml(draft.teamName)} emblem">
            <div><small>${uiText("common.team").toUpperCase()}</small><strong>${escapeHtml(draft.teamName)}</strong><span>${uiText("league.captain")} ${escapeHtml(draft.callsign)}</span></div>
          </div>
          <div class="league-profile-review-squad">
            ${careerFighterOptionHtml("nova-vale", draft.captainSkinId, uiText("league.captainBadge"), true, draft.callsign)}
            ${careerFighterOptionHtml(wingman.id, wingman.skinId, uiText("league.wingman"), true)}
          </div>
          <div class="league-profile-actions">
            <button id="league-profile-edit" class="league-profile-secondary" type="button">${uiText("league.profileEdit")}</button>
            <button id="league-profile-confirm" type="button">${uiText(profile ? "league.profileSave" : "league.profileFound")}</button>
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
        <img src="${careerEmblemUrl(emblem.id)}" alt=""><strong>${emblem.label}</strong><small>${uiText("league.available")}</small>
      </button>`).join("");
    const skinOptions = V2_PLAYER_SKINS.map((skinId) =>
      careerFighterOptionHtml("nova-vale", skinId, uiText("league.captainSkinBadge"), skinId === draft.captainSkinId, playerSkinLabel(skinId), "data-skin-id"),
    ).join("");
    const wingmanOptions = availableWingmen.map((characterId) => {
      const character = leagueCharacter(characterId);
      return careerFighterOptionHtml(characterId, character.skinId, uiText("league.available"), characterId === draft.selectedWingmanId, undefined, "data-wingman-id");
    }).join("");
    const lockedOptions = lockedWingmen.map((characterId) => {
      const character = leagueCharacter(characterId);
      const teamId = wingmanUnlockTeamId(characterId)!;
      const team = leagueTeam(teamId);
      return careerFighterOptionHtml(characterId, character.skinId, uiText("league.lockedDefeat", { team: team.shortName }), false, undefined, "", true);
    }).join("");
    profileSetup.innerHTML = `
      <div class="league-profile-form">
        <div class="league-profile-intro">
          <span class="league-eyebrow">${uiText("league.profileChoice")}</span>
          <h3>${uiText(profile ? "league.profileManage" : "league.profileRegister")}</h3>
          <p>${uiText(profile ? "league.profileManageCopy" : "league.profileRegisterCopy")}</p>
        </div>
        ${errorMessage ? `<p id="league-profile-error" class="league-profile-error" role="alert" tabindex="-1">${escapeHtml(errorMessage)}</p>` : ""}
        <section class="league-profile-section league-profile-names">
          <div class="league-profile-section-heading"><div><small>01 · ${uiText("league.identity").toUpperCase()}</small><h4>${uiText("league.names")}</h4></div><button type="button" data-random="names">${uiText("league.randomBoth")}</button></div>
          <label>${uiText("league.callsign")}<div><input id="league-profile-callsign" maxlength="20" autocomplete="nickname"><button type="button" data-random="callsign">${uiText("league.random")}</button></div></label>
          <label>${uiText("league.teamName")}<div><input id="league-profile-team-name" maxlength="28" autocomplete="organization"><button type="button" data-random="team-name">${uiText("league.random")}</button></div></label>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>02 · ${uiText("league.crest").toUpperCase()}</small><h4>${uiText("league.teamEmblem")}</h4></div><button type="button" data-random="emblem">${uiText("league.random")}</button></div>
          <div class="league-profile-emblems">${emblemOptions}</div>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>03 · ${uiText("league.captain").toUpperCase()}</small><h4>${uiText("league.arenaSkin")}</h4></div><button type="button" data-random="skin">${uiText("league.random")}</button></div>
          <div class="league-profile-fighter-grid is-skins">${skinOptions}</div>
        </section>
        <section class="league-profile-section">
          <div class="league-profile-section-heading"><div><small>04 · ${uiText("league.squad").toUpperCase()}</small><h4>${uiText("league.wingman")}</h4></div><button type="button" data-random="wingman">${uiText("league.randomAvailable")}</button></div>
          <p class="league-profile-section-note">${uiText("league.profileSquadCopy")}</p>
          <div class="league-profile-fighter-grid">${wingmanOptions}</div>
          ${lockedOptions ? `<div class="league-profile-locked-heading"><small>${uiText("league.scoutedLocked")}</small><span>${uiText("league.expandRoster")}</span></div><div class="league-profile-fighter-grid is-locked">${lockedOptions}</div>` : ""}
        </section>
        <div class="league-profile-actions">
          ${profile ? `<button id="league-profile-cancel" class="league-profile-secondary" type="button">${uiText("common.cancel")}</button>` : ""}
          <button id="league-profile-random-all" class="league-profile-secondary" type="button">${uiText("league.randomAll")}</button>
          <button id="league-profile-review" type="button">${uiText("league.reviewTeam")}</button>
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
          uiText("league.validationNames"),
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
      const discipline = leagueCircuitDiscipline(active.circuitId ?? "proving", round.index);
      const modeLabel = discipline.mode === "tdm"
        ? "TDM"
        : discipline.mode === "one-flag"
          ? "ONE FLAG"
          : round.index === active.rounds.length - 1 ? "CTF FINAL" : "CTF";
      const fixture = round.matches.find((match) =>
        match.homeTeamId === active.playerTeamId ||
        match.awayTeamId === active.playerTeamId
      );
      const opponentId = fixture
        ? fixture.homeTeamId === active.playerTeamId
          ? fixture.awayTeamId
          : fixture.homeTeamId
        : null;
      const opponentName = opponentId ? displayTeamName(opponentId) : modeLabel;
      const result = fixture?.result;
      let state = round.index === active.currentRound ? "is-current" : "is-locked";
      let resultLabel = round.index === active.currentRound
        ? uiText("league.upNext")
        : uiText("common.locked").toUpperCase();
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
        const localizedOutcome = uiText(outcome === "W"
          ? "league.winOutcomeShort"
          : outcome === "D"
            ? "league.drawOutcomeShort"
            : "league.lossOutcomeShort");
        resultLabel = `${localizedOutcome} ${playerScore}:${rivalScore}`;
      }
      return `<span class="league-season-stop ${state}">
        <i aria-hidden="true">0${round.index + 1}</i>
        ${opponentId ? `<img class="league-season-stop-emblem" src="${displayTeamEmblemUrl(opponentId)}" alt="">` : ""}
        <span><small>${modeLabel}</small><strong>${escapeHtml(opponentName)}</strong><b>${resultLabel}</b></span>
      </span>`;
    }).join("");
    const completed = Math.min(active.currentRound, active.rounds.length);
    const remaining = Math.max(0, active.rounds.length - completed);
    return `<div class="league-season-track" aria-label="${uiText("league.matchProgress", { complete: completed, total: active.rounds.length })}">
      <div class="league-season-track-summary"><small>${CURRENT_LEAGUE_CIRCUIT.name.toUpperCase()}</small><strong>${uiText("league.matchProgress", { complete: completed, total: active.rounds.length })}</strong><span>${uiText("league.matchesRemain", { count: remaining, matches: uiText(remaining === 1 ? "common.match" : "common.matches").toUpperCase() })}</span></div>
      <div>${stops}</div>
    </div>`;
  };

  const renderHeader = (hasSeason: boolean, isEditing: boolean): void => {
    element("league-header-kicker").textContent = isEditing
      ? profile ? uiText("league.careerTeamManagement") : uiText("league.careerRegistration")
      : hasSeason
        ? uiText("league.careerCircuit", { circuit: CURRENT_LEAGUE_CIRCUIT.name.toUpperCase() })
        : uiText("league.careerContract");
    element("league-header-title").textContent = isEditing
      ? profile ? uiText("league.teamManager") : uiText("league.foundTeamTitle")
      : hasSeason
        ? uiText("league.title")
        : CURRENT_LEAGUE_CIRCUIT.name;
    const standingsTitle = document.getElementById("league-standings-title");
    if (standingsTitle) {
      standingsTitle.textContent = uiText("league.standingsTitle", {
        circuit: CURRENT_LEAGUE_CIRCUIT.name,
      });
    }
  };

  const renderLeagueIntro = (): void => {
    if (!profile) return;
    element("league-intro-title").textContent = uiText("league.leadTeam", { team: profile.teamName });
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
      const discipline = leagueCircuitDiscipline(preview.circuitId ?? "proving", round.index);
      return `<article class="league-intro-stop">
        <span>0${round.index + 1}</span>
        <img src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name}">
        <div><small>${localizedTrialLabel(discipline.mode)}</small><strong>${localizedDisciplineMode(discipline.mode)}</strong><i>${discipline.mapLabel} · VS ${opponent.name}</i></div>
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
        ? uiText("league.reviewRun", { circuit: CURRENT_LEAGUE_CIRCUIT.name })
        : uiText("league.matchOf", {
            circuit: CURRENT_LEAGUE_CIRCUIT.name,
            match: active.currentRound + 1,
            total: active.rounds.length,
          });
    }
    const match = getCurrentPlayerMatch(active);
    const opponentId = getPlayerOpponent(active, match);
    if (active.status === "completed" || !match || !opponentId) {
      const champion = leagueTeam(table[0].teamId);
      const championName = displayTeamName(champion.id);
      target.innerHTML = `
        <div class="league-season-complete">
          <img class="league-champion-emblem" src="${displayTeamEmblemUrl(champion.id)}" alt="${escapeHtml(championName)} emblem">
          <div><span class="league-eyebrow">${uiText("league.seasonComplete")}</span><h3>${uiText("league.championTitle", { team: escapeHtml(championName) })}</h3>
          <p>${uiText("league.finishLine", { position: ownPosition, points: active.standings[active.playerTeamId].points })}</p></div>
          <button id="league-finish-new" type="button">${uiText("league.startNewSeason")}</button>
        </div>
        ${renderSeasonTrack(active)}`;
      requiredButton("league-finish-new").onclick = () => {
        if (window.confirm(uiText("league.replaceSeasonConfirm"))) startSeason();
      };
      return;
    }
    const opponent = leagueTeam(opponentId);
    const ownTeamName = displayTeamName(active.playerTeamId);
    const discipline = leagueCircuitDiscipline(active.circuitId ?? "proving", active.currentRound);
    const opponentStanding = active.standings[opponentId];
    const opponentLineup = renderOpponentLineup(active, opponentId);
    const assetBase = import.meta.env?.BASE_URL ?? "/";
    const ownCaptain = leagueCharacter(
      active.teamRosters[active.playerTeamId][0],
    );
    const opponentCaptain = leagueCharacter(active.teamRosters[opponentId][0]);
    const ownCaptainSkin = profile?.captainSkinId ?? ownCaptain.skinId;
    const ownPortrait = `${assetBase}assets/ui/portraits/${
      playerSkinPortraitAssetStem(ownCaptainSkin)
    }.png`;
    const opponentPortrait = `${assetBase}assets/ui/portraits/${
      playerSkinPortraitAssetStem(opponentCaptain.skinId)
    }.png`;
    target.style.setProperty("--opponent-color", opponent.primaryColor);
    target.innerHTML = `
      <div class="league-matchup-hero">
        <div class="league-matchup-stage" aria-hidden="true">
          <span class="is-player" style="--skin-portrait:url('${ownPortrait}')"></span>
          <b>VS</b>
          <span class="is-opponent" style="--skin-portrait:url('${opponentPortrait}')"></span>
        </div>
        <div class="league-fixture-meta">
          <span class="league-eyebrow">${localizedTrialLabel(discipline.mode).toUpperCase()} · ${uiText("common.match").toUpperCase()} ${active.currentRound + 1} / ${active.rounds.length}</span>
          <div class="league-fixture-title">
            <img class="league-mini-emblem" src="${displayTeamEmblemUrl(active.playerTeamId)}" alt="${escapeHtml(ownTeamName)} emblem">
            <div class="league-fixture-team"><small>${uiText("league.yourSquad")}</small><strong>${escapeHtml(ownTeamName)}</strong></div>
          </div>
        </div>
        <div class="league-opponent-copy">
          <div class="league-opponent-heading">
            <img class="league-opponent-emblem" src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name} emblem">
            <div><small>${uiText("league.nextOpponent")}</small><h3>${opponent.name}</h3><p>${localizedTeamMotto(opponent.id, opponent.motto)}</p></div>
          </div>
          <div class="league-opponent-form"><span>${uiText("league.tableRank", { position: sortedLeagueStandings(active).findIndex((row) => row.teamId === opponentId) + 1 })}</span><span>${uiText("league.pts", { points: opponentStanding.points })}</span><span>${opponentStanding.wins}-${opponentStanding.draws}-${opponentStanding.losses}</span></div>
        </div>
        <button id="league-play-next" type="button"><small>${discipline.mapLabel.toUpperCase()} · ${localizedDisciplineMode(discipline.mode).toUpperCase()} 2V2</small><strong>${uiText("league.enterArena")}</strong></button>
      </div>
      <div class="league-matchup-lower">
        ${renderSeasonTrack(active)}
        <div class="league-opponent-lineup" aria-label="${opponent.name} expected lineup">
          <small class="league-opponent-lineup-label">${uiText("league.expectedLineup")}</small>
          ${opponentLineup}
        </div>
      </div>`;
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
    element("league-team-record").textContent = uiText("league.record", {
      wins: standing.wins,
      draws: standing.draws,
      losses: standing.losses,
      points: standing.points,
    });
    const roster = element("league-player-roster");
    roster.replaceChildren(
      ...active.teamRosters[active.playerTeamId].map((characterId, index) =>
        characterCard(
          active,
          active.playerTeamId,
          characterId,
          index === 0 ? uiText("league.captainBadge") : uiText("league.wingmateBadge"),
          true,
          index === 0 && profile
            ? {
                name: profile.callsign,
                personality: uiText("league.captainOf", { team: profile.teamName }),
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
    target.innerHTML = `<div class="league-table-row league-table-head"><span>#</span><span>${uiText("common.team").toUpperCase()}</span><span>${uiText("league.playedShort")}</span><span>${uiText("league.winsShort")}</span><span>${uiText("league.drawsShort")}</span><span>${uiText("league.lossesShort")}</span><strong>${uiText("common.pts")}</strong></div>`;
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
        row.setAttribute("aria-label", uiText("league.yourTeamRow", {
          team: teamName,
          position: index + 1,
          points: standing.points,
        }));
      }
      row.title = uiText("league.inspectRoster", { team: teamName });
      row.innerHTML = `<span>${index + 1}</span><span><img class="league-table-emblem" src="${displayTeamEmblemUrl(team.id)}" alt=""><span class="league-table-team-name">${escapeHtml(teamName)}</span>${isPlayerTeam ? `<em class="league-you-badge">${uiText("common.you").toUpperCase()}</em>` : ""}</span><span>${standing.played}</span><span>${standing.wins}</span><span>${standing.draws}</span><span>${standing.losses}</span><strong>${standing.points}</strong>`;
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
          <small>${uiText("league.scouting").toUpperCase()}</small>
          <h3>${uiText("league.chooseTeam")}</h3>
          <p>${uiText("league.chooseTeamCopy")}</p>
        </div>`;
      return;
    }
    const team = leagueTeam(teamId);
    const teamName = displayTeamName(teamId);
    target.style.setProperty("--team-color", team.primaryColor);
    const isPlayerTeam = teamId === active.playerTeamId;
    const teamMotto = localizedTeamMotto(team.id, team.motto);
    target.innerHTML = `<div class="league-detail-heading"><img class="league-large-emblem" src="${displayTeamEmblemUrl(team.id)}" alt="${escapeHtml(teamName)} emblem"><div><small>${uiText(isPlayerTeam ? "league.teamFile" : "league.scoutingFile")}</small><h3>${escapeHtml(teamName)}</h3><p>${isPlayerTeam && profile ? `${uiText("league.captain")} ${escapeHtml(profile.callsign)} · ${teamMotto}` : teamMotto}</p></div>${isPlayerTeam ? `<button id="league-team-file-manage" class="league-team-file-manage" type="button">${uiText("league.manageTeam")}</button>` : ""}</div><div class="league-detail-roster"></div>`;
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
              personality: uiText("league.captainOf", { team: profile.teamName }),
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
    const assetBase = import.meta.env?.BASE_URL ?? "/";
    element("league-pyramid").innerHTML = `
      <div class="league-tier is-current is-proving" role="listitem"><img src="${assetBase}assets/ui/menu/league-tier-proving-v1.png" alt=""><div><small>${uiText("league.entry")} · ${uiText("league.current")}</small><strong>${proving.name}</strong><p>${uiText("league.provingDescription")}</p></div><b><span>${uiText("league.youAreHere")}</span><small>${uiText("league.tablePosition", { position: ownPosition })}</small></b></div>
      <div class="league-tier-connector is-qualification" aria-hidden="true"><span>↓</span><small>${uiText("league.qualify")}</small></div>
      <div class="league-tier is-locked is-contender" role="listitem"><img src="${assetBase}assets/ui/menu/league-tier-contender-v1.png" alt=""><div><small>${uiText("league.advanced")}</small><strong>${contender.name}</strong><p>${uiText("league.contenderDescription")}</p><div class="league-tier-rivals">${futureTeams}<i>+4</i></div></div><b>${uiText("common.comingSoon").toUpperCase()}</b></div>
      <div class="league-tier-connector" aria-hidden="true"><span>↓</span><small>${uiText("league.advance")}</small></div>
      <div class="league-tier is-locked is-elite is-apex" role="listitem"><img src="${assetBase}assets/ui/menu/league-tier-apex-v1.png" alt=""><div><small>${uiText("league.championship")}</small><strong>${apex.name}</strong><p>${uiText("league.apexDescription")}</p></div><b>${uiText("common.comingSoon").toUpperCase()}</b></div>
      <div class="league-path-reward"><img src="${assetBase}assets/league/arena-league-emblem.png" alt=""><div><small>${uiText("league.nextReward")}</small><strong>${uiText("league.rewardWingman")}</strong></div></div>`;
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
    const discipline = leagueCircuitDiscipline(active.circuitId ?? "proving", event.roundIndex);
    const rivalRosterNames = active.teamRosters[opponent.id]
      .map((characterId) => leagueCharacter(characterId).name)
      .join(" · ");
    const recruitmentPending = active.recruitment.status === "pending";
    if (recruitmentPending && reportedRecruitmentSeasonId !== active.seasonId) {
      reportedRecruitmentSeasonId = active.seasonId;
      actions.analytics?.track("recruitment_opened", {
        seasonId: active.seasonId,
      });
    }
    const headline = event.promoted
      ? uiText("league.qualificationEarned")
      : finalRound
        ? uiText("league.circuitComplete")
        : won && positionDelta > 0
          ? uiText("league.upPlaces", {
              count: positionDelta,
              places: uiText(positionDelta === 1 ? "league.place" : "league.places"),
            })
          : won
            ? uiText("league.momentum")
            : drawn
              ? uiText("league.pointSecured")
              : uiText("league.climbContinues");
    const remainingMatches = active.rounds.length - active.currentRound;
    const remainingLabel = uiText(remainingMatches === 1 ? "common.match" : "common.matches");
    const progressionCopy = event.promoted
      ? uiText("league.promotedCopy", {
          circuit: CURRENT_LEAGUE_CIRCUIT.name,
          next: LEAGUE_CIRCUITS.find((circuit) => circuit.id === "contender")!.name,
        })
      : finalRound
        ? uiText("league.finalRoundCopy")
        : rivalResultsShiftedTable
          ? uiText("league.tableShiftCopy", {
              position: event.newPosition,
              remaining: remainingMatches,
              matches: remainingLabel,
            })
          : uiText("league.remainingCopy", {
              remaining: remainingMatches,
              matches: remainingLabel,
            });
    progression.innerHTML = `
      <div class="league-progression-card ${won ? "is-win" : drawn ? "is-draw" : "is-loss"}">
        <div class="league-progression-glow"></div>
        <span class="league-eyebrow">${uiText("league.modeComplete", { mode: localizedDisciplineMode(discipline.mode).toUpperCase(), match: event.roundIndex + 1, total: active.rounds.length })}</span>
        <h2>${headline}</h2>
        <div class="league-result-lockup">
          <div><img src="${displayTeamEmblemUrl(active.playerTeamId)}" alt="${escapeHtml(playerTeamName)}"><small>${escapeHtml(playerTeamName.toUpperCase())}</small></div>
          <strong>${event.blueScore}<i>:</i>${event.redScore}</strong>
          <div><img src="${leagueTeamEmblemUrl(opponent.id)}" alt="${opponent.name}"><small>${opponent.name}</small></div>
        </div>
        <div class="league-rank-shift">
          <div><small>${uiText("league.before")}</small><strong>#${event.previousPosition}</strong></div>
          <span>→</span>
          <div class="is-new"><small>${uiText("league.now")}</small><strong>#${event.newPosition}</strong></div>
          <div class="league-points-earned${pointsGained === 0 ? " is-zero" : ""}"><small>${uiText("league.leaguePoints")}</small><strong>${pointsGained > 0 ? `+${pointsGained}` : "0"}</strong><span>${uiText("league.totalPoints", { points: event.newPoints })}</span></div>
        </div>
        ${recruitmentPending
          ? recruitmentDecisionHtml(active, opponent.id)
          : won
          ? `<div class="league-unlock-note"><small>${uiText("league.rivalRoster")}</small><strong>${escapeHtml(rivalRosterNames)}</strong><span>${uiText("league.selectRival")}</span></div>`
          : ""}
        <p>${progressionCopy}</p>
        <button id="league-progression-continue" type="button"${recruitmentPending ? " disabled" : ""}>${uiText("league.progressReturn")}</button>
      </div>`;
    const chooseRecruitment = (selectedCharacterId: string | null): void => {
      if (!profile || active.recruitment.status !== "pending") return;
      syncCareerUnlocks(profile, active.defeatedTeamIds);
      const selectedWingmanId = selectedCharacterId ?? profile.selectedWingmanId;
      season = completeRecruitment(active, selectedCharacterId);
      if (selectedCharacterId) {
        profile = updateCareerProfile(profile, {
          callsign: profile.callsign,
          teamName: profile.teamName,
          emblemId: profile.emblemId,
          captainSkinId: profile.captainSkinId,
          selectedWingmanId,
        });
      }
      actions.analytics?.track("wingman_selected", {
        characterId: selectedWingmanId,
        source: "recruitment",
      });
      saveAndRender();
      requiredButton("league-progression-continue").focus({
        preventScroll: true,
      });
    };
    document.getElementById("league-recruitment-keep")?.addEventListener(
      "click",
      () => chooseRecruitment(null),
    );
    progression.querySelectorAll<HTMLButtonElement>(
      "[data-recruitment-choice]",
    ).forEach((button) => {
      button.onclick = () => chooseRecruitment(
        button.dataset.recruitmentChoice ?? null,
      );
    });
    requiredButton("league-progression-continue").onclick = () => {
      if (active.recruitment.status === "pending") return;
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
        ? uiText("league.contractReady", { team: profile.teamName })
        : uiText("league.promotionAwaits");
      if (season.status === "completed") {
        return uiText("league.reviewRun", { circuit: CURRENT_LEAGUE_CIRCUIT.name });
      }
      return uiText("league.matchOf", {
        circuit: CURRENT_LEAGUE_CIRCUIT.name,
        match: season.currentRound + 1,
        total: season.rounds.length,
      });
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
    refresh(): void {
      applyUiTranslations(root);
      render();
    },
  };
}

function recruitmentDecisionHtml(
  season: LeagueSeasonState,
  opponentId: LeagueTeamId,
): string {
  const currentWingmanId = season.teamRosters[season.playerTeamId][1];
  const currentWingman = leagueCharacter(currentWingmanId);
  const opponent = leagueTeam(opponentId);
  const candidates = season.recruitment.candidateIds
    .map((characterId) => recruitmentChoiceHtml(characterId, false))
    .join("");
  return `
    <section class="league-recruitment-decision" aria-labelledby="league-recruitment-title">
      <small>${uiText("league.recruitmentKicker")}</small>
      <h3 id="league-recruitment-title">${uiText("league.recruitmentTitle")}</h3>
      <p>${uiText("league.recruitmentCopy", {
        team: opponent.name,
        current: currentWingman.name,
      })}</p>
      <div class="league-recruitment-choices">
        ${recruitmentChoiceHtml(currentWingmanId, true)}
        ${candidates}
      </div>
      <span>${uiText("league.recruitmentUnlocked")}</span>
    </section>`;
}

function recruitmentChoiceHtml(
  characterId: string,
  keepCurrent: boolean,
): string {
  const character = leagueCharacter(characterId);
  const archetype = localizedArchetype(character.archetypeId);
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const portrait = `${assetBase}assets/ui/portraits/${
    playerSkinPortraitAssetStem(character.skinId)
  }.png`;
  return `<button class="league-recruitment-choice" ${
    keepCurrent
      ? 'id="league-recruitment-keep"'
      : `data-recruitment-choice="${character.id}"`
  } type="button">
    <span class="league-recruitment-portrait" style="--skin-portrait:url('${portrait}')" aria-hidden="true"></span>
    <span><small>${uiText(
      keepCurrent ? "league.recruitmentKeep" : "league.recruitmentChoose",
      { name: character.name },
    )}</small><strong>${character.name}</strong><b>${archetype.label}</b><i>${archetype.description}</i></span>
  </button>`;
}

function renderOpponentLineup(
  season: LeagueSeasonState,
  opponentId: LeagueTeamId,
): string {
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  return season.teamRosters[opponentId].map((characterId, index) => {
    const character = leagueCharacter(characterId);
    const archetype = localizedArchetype(character.archetypeId);
    const stats = leagueCharacterStats(season, opponentId, characterId) ?? emptyStats(characterId);
    const portraitAssetStem = playerSkinPortraitAssetStem(character.skinId);
    const performance = stats.matches > 0
      ? `<div class="league-opponent-member-stats" aria-label="${character.name} ${uiText("league.recordedPerformance")}"><b>${average(stats.kills, stats.matches)}<i>${uiText("league.killsPerMatchShort")}</i></b><b>${average(stats.deaths, stats.matches)}<i>${uiText("league.deathsPerMatchShort")}</i></b><b>${stats.flagCaptures}<i>${uiText("league.capturesShort")}</i></b></div>`
      : `<span class="league-opponent-member-new">${uiText("league.noSeasonData")}</span>`;
    return `
      <article class="league-opponent-member">
        <div class="league-opponent-member-portrait" style="--skin-portrait:url('${assetBase}assets/ui/portraits/${portraitAssetStem}.png')" aria-hidden="true"></div>
        <div class="league-opponent-member-copy">
          <small>${uiText("league.fighter")} 0${index + 1}</small>
          <strong>${character.name}</strong>
          <span>${character.visualStyle}</span>
          <b class="league-archetype-label">${archetype.label}</b>
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
  const archetype = localizedArchetype(character.archetypeId);
  const stats = leagueCharacterStats(season, teamId, characterId) ?? emptyStats(characterId);
  const currentTeam = leagueTeam(teamId);
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const card = document.createElement("article");
  card.className = "league-character";
  const portraitAssetStem = playerSkinPortraitAssetStem(presentation?.skinId ?? character.skinId);
  card.innerHTML = `
    <div class="league-character-portrait" style="--skin-portrait:url('${assetBase}assets/ui/portraits/${portraitAssetStem}.png')"></div>
    <div class="league-character-info">
      <small>${badge ?? uiText("league.cosmeticFighter", { team: currentTeam?.shortName ?? "ARENA" })}</small>
      <strong>${escapeHtml(presentation?.name ?? character.name)}</strong>
      <span>${escapeHtml(presentation?.personality ?? localizedCharacterPersonality(character.id, character.personality))}</span>
      <em>${escapeHtml(presentation?.visualStyle ?? character.visualStyle)}</em>
      <b class="league-archetype-label">${archetype.label}</b>
      ${showStats ? `<div class="league-character-stats" aria-label="${uiText("league.recordedPerformance")}"><b>${average(stats.kills, stats.matches)}<i>${uiText("league.killsPerMatchShort")}</i></b><b>${average(stats.deaths, stats.matches)}<i>${uiText("league.deathsPerMatchShort")}</i></b><b>${stats.flagCaptures}<i>${uiText("league.capturesShort")}</i></b></div>` : ""}
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
  const archetype = localizedArchetype(character.archetypeId);
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  const portrait = `${assetBase}assets/ui/portraits/${playerSkinPortraitAssetStem(skinId)}.png`;
  const tag = locked || !dataAttribute ? "article" : "button";
  const attribute = dataAttribute ? ` ${dataAttribute}="${characterId === "nova-vale" ? skinId : characterId}"` : "";
  const interaction = tag === "button"
    ? ` type="button" aria-pressed="${selected}"`
    : "";
  return `<${tag} class="league-profile-fighter${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}"${attribute}${interaction}>
    <span class="league-profile-fighter-portrait" style="--skin-portrait:url('${portrait}')" aria-hidden="true"></span>
    <span class="league-profile-fighter-copy"><small>${escapeHtml(badge)}</small><strong>${escapeHtml(displayName ?? character.name)}</strong><i>${escapeHtml(displayName ? playerSkinLabel(skinId) : character.visualStyle)}</i>${displayName ? "" : `<b>${archetype.label}</b><em>${archetype.description}</em>`}</span>
    ${locked ? `<b aria-hidden="true">${uiText("common.locked").toUpperCase()}</b>` : ""}
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
