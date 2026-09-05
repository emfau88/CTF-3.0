import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-900.css";
import {
  getWorldMap,
  type MatchResult,
  type MatchStatEntry,
  type ScoreEntry,
  validateWorldMapForMode,
} from "./core";
import {
  showArenaLoadingError,
  showArenaLoadingUi,
} from "./arenaLoadingUi";
import {
  buildLeagueHubSearch,
  createLeagueCareerRepository,
  type CompleteLeagueMatchInput,
  leagueTeam,
  readLeagueMatchContext,
} from "./meta/league";
import {
  careerEmblemUrl,
  createCareerProfileRepository,
  resolveCareerCaptainSkin,
} from "./careerProfile";
import {
  goToGameplayV2Menu,
  hideGameplayV2Pause,
  hideGameplayV2Result,
  hideGameplayV2Stats,
  showGameplayV2Menu,
  showGameplayV2Pause,
  showGameplayV2Result,
  showGameplayV2Stats,
} from "./v2Menu";
import {
  readV2RouteState,
} from "./v2Route";
import { prefersV2TouchControls } from "./v2Controls";
import {
  readV2FullscreenControlState,
  toggleV2Fullscreen,
} from "./v2Fullscreen";
import { applyUiTranslations, onUiLanguageChange, uiText } from "./uiLocale";
import {
  CORE_ARENA_LIFECYCLE_EVENT,
  STANDALONE_RELEASE_PROFILE,
  createStandalonePlatformServices,
  readMatchEntryPoint,
  type TutorialAction,
} from "./platform";
import {
  QUALIFIER_TUTORIAL_ACTIONS,
  QUALIFIER_TUTORIAL_EVENT,
  buildQualifierMatchSearch,
  createQualifierRepository,
  isQualifierMatch,
  readQualifierAttemptKind,
} from "./qualifier";
import { createQualifierGuide } from "./qualifierGuide";
import { persistCareerMatch } from "./persistCareerMatch";
import { createCareerSaveNotice } from "./careerSaveUi";

const search = new URLSearchParams(window.location.search);
const platformServices = createStandalonePlatformServices({
  profile: STANDALONE_RELEASE_PROFILE,
  storage: window.localStorage,
  windowPort: window,
});
void platformServices.sdk.initialize();
const matchEntryPoint = readMatchEntryPoint(search);
const qualifierActive = isQualifierMatch(search);
const qualifierAttemptKind = readQualifierAttemptKind(search);
const qualifierRepository = createQualifierRepository(platformServices.save);
const qualifierStart = qualifierActive
  ? qualifierRepository.start(qualifierAttemptKind)
  : null;
if (qualifierStart?.started) {
  platformServices.analytics.track("qualifier_started", {
    mapId: "helix-canopy-v2",
    mode: "tdm",
  });
}
const lifecycleSubscription = platformServices.lifecycle.subscribe((state) => {
  window.dispatchEvent(new CustomEvent(CORE_ARENA_LIFECYCLE_EVENT, {
    detail: state,
  }));
});
window.addEventListener("pagehide", () => {
  lifecycleSubscription();
  platformServices.lifecycle.dispose();
}, { once: true });
const leagueMatchContext = readLeagueMatchContext(search);
const careerProfileRepository = createCareerProfileRepository(platformServices.save);
let careerProfile = leagueMatchContext ? careerProfileRepository.load() : null;
const routeState = readV2RouteState(search);
const activeRoute = { ...routeState.route };
const routeIssues = [...routeState.issues];
if (leagueMatchContext && careerProfile && activeRoute) {
  activeRoute.skin = resolveCareerCaptainSkin(careerProfile, activeRoute.skin);
}
if (routeState.canStartMatch) {
  const map = getWorldMap(activeRoute.map);
  if (!map) {
    routeIssues.push(`Unknown V2 arena map: ${activeRoute.map}.`);
    activeRoute.menu = true;
  } else {
    for (const issue of validateWorldMapForMode(
      map,
      modeIdForRoute(activeRoute.mode),
      activeRoute.teamSize,
    )) {
      routeIssues.push(issue.message);
    }
    if (routeIssues.length > 0) {
      activeRoute.menu = true;
    }
  }
}
const showV2Menu = Boolean(activeRoute.menu || routeIssues.length > 0);

platformServices.analytics.track("app_opened", {
  entryPoint: showV2Menu ? "menu" : matchEntryPoint,
});

applyUiTranslations(document);
setupV2FullscreenControls();

if (showV2Menu) {
  showGameplayV2Menu(routeIssues[0], platformServices);
} else {
    const menuButton = document.querySelector<HTMLButtonElement>(
      "#v2-game-menu-button",
    );
    const statsButton = document.querySelector<HTMLButtonElement>(
      "#v2-stats-button",
    );
    const audioButton = document.querySelector<HTMLButtonElement>(
      "#v2-audio-button",
    );
    const audioLabel = document.querySelector<HTMLElement>(
      "#v2-audio-label",
    );
    const fullscreenButton = document.querySelector<HTMLButtonElement>(
      "#v2-fullscreen-button",
    );
    const gameUtility = document.querySelector<HTMLElement>(
      "#v2-game-utility",
    );
    const usesTouchControls = prefersV2TouchControls(activeRoute.controls);
    gameUtility?.classList.toggle("is-touch-controls", usesTouchControls);
    const activeModeId = activeRoute
      ? modeIdForRoute(activeRoute.mode)
      : "team-deathmatch";
    let latestStats: readonly MatchStatEntry[] = [];
    let matchEnded = false;
    let matchStartedRecorded = false;
    let matchCompletedRecorded = false;
    let qualifierResultRecorded = false;
    let qualifierNavigationHandled = false;
    let leagueResultRecorded = false;
    let leagueResultPending = false;
    let leagueSaveFailed = false;
    let pendingLeagueResult: CompleteLeagueMatchInput | null = null;
    const resultSaveNotice = leagueMatchContext ? createCareerSaveNotice(
      document.getElementById("v2-result-card")!, "league-result-save-error",
      () => { void saveLeagueResult(); },
      () => createLeagueCareerRepository(platformServices.save).exportBackup(),
    ) : null;
    const saveLeagueResult = async (): Promise<void> => {
      if (leagueResultPending || leagueResultRecorded || !pendingLeagueResult) return;
      leagueResultPending = true;
      try {
        await persistCareerMatch(platformServices.save, pendingLeagueResult);
        leagueResultRecorded = true;
        leagueSaveFailed = false;
        resultSaveNotice?.hide();
      } catch (error) {
        leagueSaveFailed = true;
        resultSaveNotice?.show(error);
      } finally {
        leagueResultPending = false;
        const continueButton = document.getElementById("v2-result-play-again") as HTMLButtonElement | null;
        if (continueButton) continueButton.disabled = !leagueResultRecorded;
      }
    };
    window.addEventListener("beforeunload", (event) => {
      if (pendingLeagueResult && !leagueResultRecorded) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    const leagueOpponent = leagueMatchContext
      ? leagueTeam(leagueMatchContext.opponentId)
      : null;
    const leagueOpponentName = leagueOpponent?.name ?? null;
    let heldScoreboardVisible = false;
    const humanActorIds = activeRoute?.players === "local"
      ? ["blue-player", "red-player"]
      : ["blue-player"];
    const respawnStatus = document.querySelector<HTMLElement>(
      "#v2-respawn-status",
    );
    const qualifierGuide = qualifierActive
      ? createQualifierGuide(
        qualifierStart?.state.activeAttempt?.completedActions ?? [],
      )
      : null;
    const abandonQualifier = (reason: "menu" | "restart" | "reload" | "closed"): void => {
      if (!qualifierActive || !qualifierRepository.load().activeAttempt) return;
      qualifierRepository.abandon(reason);
      qualifierGuide?.hide();
      platformServices.analytics.track("qualifier_abandoned", { reason });
      if (qualifierAttemptKind === "first-run") {
        platformServices.analytics.track("career_abandoned", {
          stage: "qualifier",
        });
      }
    };
    const retryQualifier = (): void => {
      qualifierNavigationHandled = true;
      const started = qualifierRepository.start("training");
      if (started.started) {
        platformServices.analytics.track("qualifier_started", {
          mapId: "helix-canopy-v2",
          mode: "tdm",
        });
      }
      window.location.search = buildQualifierMatchSearch({
        kind: "training",
        skin: activeRoute.skin,
        sfx: activeRoute.sfx,
      });
    };
    const continueToCareer = (): void => {
      qualifierNavigationHandled = true;
      qualifierGuide?.dispose();
      window.location.search = buildLeagueHubSearch();
    };
    const handleQualifierAction = (event: Event): void => {
      if (!qualifierActive) return;
      const action = (event as CustomEvent<{ action?: TutorialAction }>).detail?.action;
      if (!action || !QUALIFIER_TUTORIAL_ACTIONS.includes(action)) return;
      const recorded = qualifierRepository.recordAction(action);
      if (!recorded.recorded) return;
      qualifierGuide?.complete(action);
      platformServices.analytics.track("tutorial_action_completed", { action });
    };
    window.addEventListener(QUALIFIER_TUTORIAL_EVENT, handleQualifierAction);
    window.addEventListener("pagehide", () => {
      window.removeEventListener(QUALIFIER_TUTORIAL_EVENT, handleQualifierAction);
      qualifierGuide?.dispose();
      if (!qualifierNavigationHandled && !matchEnded) {
        abandonQualifier("reload");
      }
    }, { once: true });
    const setIngameButtonsVisible = (visible: boolean): void => {
      const fullscreenAvailable = Boolean(
        !usesTouchControls &&
          fullscreenButton &&
          !fullscreenButton.classList.contains("is-hidden"),
      );
      gameUtility?.classList.toggle(
        "is-hidden",
        !visible && !fullscreenAvailable,
      );
      menuButton?.classList.toggle("is-hidden", !visible);
      audioButton?.classList.toggle("is-hidden", !visible);
      statsButton?.classList.toggle("is-hidden", !visible || !usesTouchControls);
    };
    const closeHeldScoreboard = (): void => {
      if (!heldScoreboardVisible) return;
      heldScoreboardVisible = false;
      hideGameplayV2Stats();
    };
    const releaseOverlayPause = (): void => {
      window.dispatchEvent(
        new CustomEvent("v2-overlay-state", { detail: { paused: false } }),
      );
    };
    const showMenuRoute = (): void => {
      if (qualifierActive) {
        qualifierNavigationHandled = true;
        abandonQualifier("menu");
      }
      if (!matchEnded && matchStartedRecorded) {
        platformServices.analytics.track("match_abandoned", {
          entryPoint: matchEntryPoint,
          reason: "menu",
        });
        platformServices.sdk.gameplayStop();
      }
      closeHeldScoreboard();
      hideGameplayV2Pause();
      hideGameplayV2Result();
      hideGameplayV2Stats();
      releaseOverlayPause();
      if (leagueMatchContext) {
        window.location.search = buildLeagueHubSearch();
      } else if (activeRoute) {
        goToGameplayV2Menu(activeRoute);
      }
    };
    const restartCurrentMatch = (): void => {
      if (qualifierActive) {
        qualifierNavigationHandled = true;
        abandonQualifier("restart");
        const restarted = qualifierRepository.start(qualifierAttemptKind);
        if (restarted.started) {
          platformServices.analytics.track("qualifier_started", {
            mapId: "helix-canopy-v2",
            mode: "tdm",
          });
        }
      }
      if (!matchEnded && matchStartedRecorded) {
        platformServices.analytics.track("match_abandoned", {
          entryPoint: matchEntryPoint,
          reason: "restart",
        });
        platformServices.sdk.gameplayStop();
      }
      closeHeldScoreboard();
      hideGameplayV2Pause();
      hideGameplayV2Result();
      hideGameplayV2Stats();
      releaseOverlayPause();
      window.location.reload();
    };
    const closePauseOverlay = (): void => {
      closeHeldScoreboard();
      hideGameplayV2Pause();
      hideGameplayV2Stats();
      releaseOverlayPause();
      setIngameButtonsVisible(true);
    };
    const openPauseOverlay = (): void => {
      closeHeldScoreboard();
      hideGameplayV2Result();
      window.dispatchEvent(
        new CustomEvent("v2-overlay-state", { detail: { paused: true } }),
      );
      setIngameButtonsVisible(false);
      showGameplayV2Pause({
        onResume: closePauseOverlay,
        onRestart: restartCurrentMatch,
        onMainMenu: showMenuRoute,
      });
    };
    gameUtility?.classList.remove("is-hidden");
    menuButton?.classList.remove("is-hidden");
    if (menuButton && activeRoute) {
      menuButton.onclick = openPauseOverlay;
    }
    statsButton?.classList.toggle("is-hidden", !usesTouchControls);
    if (statsButton && activeRoute && usesTouchControls) {
      statsButton.onclick = () => {
        window.dispatchEvent(
          new CustomEvent("v2-overlay-state", { detail: { paused: true } }),
        );
        setIngameButtonsVisible(false);
        showGameplayV2Stats(latestStats, humanActorIds, () => {
          hideGameplayV2Stats();
          releaseOverlayPause();
          setIngameButtonsVisible(true);
        }, { modeId: activeModeId });
      };
    }
    const heldScoreboardAvailable = (): boolean => {
      const pauseVisible = !document.querySelector("#v2-pause-overlay")
        ?.classList.contains("is-hidden");
      const resultVisible = !document.querySelector("#v2-result-overlay")
        ?.classList.contains("is-hidden");
      return !usesTouchControls && !matchEnded && !pauseVisible && !resultVisible;
    };
    const handleScoreboardKeyDown = (event: KeyboardEvent): void => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      if (event.repeat || heldScoreboardVisible || !heldScoreboardAvailable()) {
        return;
      }
      heldScoreboardVisible = true;
      showGameplayV2Stats(latestStats, humanActorIds, undefined, {
        holdToView: true,
        modeId: activeModeId,
      });
    };
    const handleScoreboardKeyUp = (event: KeyboardEvent): void => {
      if (event.code !== "Tab") return;
      event.preventDefault();
      closeHeldScoreboard();
    };
    window.addEventListener("keydown", handleScoreboardKeyDown);
    window.addEventListener("keyup", handleScoreboardKeyUp);
    window.addEventListener("blur", closeHeldScoreboard);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) closeHeldScoreboard();
    });
    audioButton?.classList.remove("is-hidden");
    if (audioButton && activeRoute) {
      let currentSfx = activeRoute.sfx;
      const syncAudioButton = (): void => {
        if (audioLabel) {
          audioLabel.textContent = uiText(currentSfx === "off" ? "utility.sfxOff" : "utility.sfxOn");
        }
        audioButton.classList.toggle("is-muted", currentSfx === "off");
        audioButton.setAttribute(
          "aria-pressed",
          currentSfx === "off" ? "true" : "false",
        );
        audioButton.setAttribute(
          "aria-label",
          uiText(currentSfx === "off" ? "settings.enableSfx" : "settings.disableSfx"),
        );
      };
      syncAudioButton();
      audioButton.onclick = () => {
        currentSfx = currentSfx === "off" ? "on" : "off";
        activeRoute.sfx = currentSfx;
        syncAudioButton();
        const currentParams = new URLSearchParams(window.location.search);
        currentParams.set("sfx", currentSfx);
        window.history.replaceState(null, "", `?${currentParams.toString()}`);
        window.dispatchEvent(
          new CustomEvent("v2-sfx-changed", {
            detail: { enabled: currentSfx === "on" },
          }),
        );
      };
    }
    window.addEventListener("v2-request-pause", openPauseOverlay);
    window.addEventListener("v2-match-state", (event) => {
      const detail = (event as CustomEvent<{
        phase?: string;
        result?: MatchResult | null;
        scores?: readonly ScoreEntry[];
        stats?: readonly MatchStatEntry[];
        playerLifeState?: string;
        playerRespawnMs?: number;
      }>).detail;
      latestStats = detail.stats ?? latestStats;
      matchEnded = detail.phase === "ended";
      if (detail.phase === "running" && !matchStartedRecorded) {
        matchStartedRecorded = true;
        platformServices.sdk.gameplayStart();
        platformServices.analytics.track("match_started", {
          entryPoint: matchEntryPoint,
          mode: activeRoute.mode,
          mapId: activeRoute.map,
        });
      }
      const respawnMs = Math.max(0, detail.playerRespawnMs ?? 0);
      const showRespawn = detail.playerLifeState === "falling" ||
        detail.playerLifeState === "dead" ||
        detail.playerLifeState === "respawning";
      if (respawnStatus) {
        respawnStatus.textContent = detail.playerLifeState === "falling"
          ? `FALLING · RESPAWN: ${(Math.ceil(respawnMs / 100) / 10).toFixed(1)}s`
          : `RESPAWN: ${(Math.ceil(respawnMs / 100) / 10).toFixed(1)}s`;
        respawnStatus.classList.toggle("is-hidden", !showRespawn);
      }
      if (detail.phase !== "ended" || !detail.result || !activeRoute) {
        return;
      }
      if (!matchCompletedRecorded) {
        matchCompletedRecorded = true;
        platformServices.sdk.gameplayStop();
        platformServices.analytics.track("match_completed", {
          entryPoint: matchEntryPoint,
          outcome: detail.result.kind === "draw"
            ? "draw"
            : detail.result.winnerEntryId === "blue"
              ? "win"
              : "loss",
        });
      }
      const qualifierOutcome = detail.result.kind === "draw"
        ? "draw"
        : detail.result.winnerEntryId === "blue"
          ? "win"
          : "loss";
      if (qualifierActive && !qualifierResultRecorded) {
        qualifierResultRecorded = true;
        qualifierRepository.complete();
        qualifierGuide?.finish();
        platformServices.analytics.track("qualifier_completed", {
          outcome: qualifierOutcome,
        });
      }
      if (leagueMatchContext && !pendingLeagueResult) {
        pendingLeagueResult = {
          seasonId: leagueMatchContext.seasonId,
          matchId: leagueMatchContext.matchId,
          roundIndex: leagueMatchContext.roundIndex,
          blueScore: detail.scores?.find((entry) => entry.teamId === "blue")?.score ?? 0,
          redScore: detail.scores?.find((entry) => entry.teamId === "red")?.score ?? 0,
          stats: latestStats.map((entry) => ({ ...entry })),
        };
      }
      closeHeldScoreboard();
      setIngameButtonsVisible(false);
      respawnStatus?.classList.add("is-hidden");
      hideGameplayV2Pause();
      qualifierGuide?.hide();
      releaseOverlayPause();
      showGameplayV2Result({
        headline: qualifierActive
          ? uiText("qualifier.qualified")
          : detail.result.kind === "draw"
          ? uiText("common.draw")
          : leagueMatchContext
            ? detail.result.winnerEntryId === "blue"
              ? uiText("result.teamWins", { team: careerProfile?.teamName ?? "Iron Vanguard" })
              : uiText("result.teamWins", { team: leagueOpponentName ?? "Rivals" })
            : uiText("result.teamWins", { team: detail.result.winnerEntryId.toUpperCase() }),
        detail: qualifierActive
          ? uiText("qualifier.qualifiedCopy")
          : leagueMatchContext
          ? uiText("result.leagueMatch", {
              match: leagueMatchContext.roundIndex + 1,
              mode: resultModeLabel(activeModeId),
            })
          : uiText("result.modeFinal", { mode: resultModeLabel(activeModeId) }),
        winnerEntryId: detail.result.kind === "winner"
          ? detail.result.winnerEntryId
          : null,
        scores: detail.scores ?? [],
        teams: leagueMatchContext && leagueOpponent
          ? {
              blue: {
                name: careerProfile?.teamName ?? "Iron Vanguard",
                emblemUrl: careerProfile
                  ? careerEmblemUrl(careerProfile.emblemId)
                  : `${import.meta.env.BASE_URL}assets/league/teams/iron-vanguard-emblem.png`,
              },
              red: {
                name: leagueOpponent.name,
                emblemUrl: `${import.meta.env.BASE_URL}assets/league/teams/${leagueOpponent.id}-emblem.png`,
              },
            }
          : undefined,
        stats: latestStats,
        humanActorIds,
        modeId: activeModeId,
        onPlayAgain: qualifierActive
          ? continueToCareer
          : leagueMatchContext
            ? showMenuRoute
            : restartCurrentMatch,
        onMainMenu: qualifierActive ? retryQualifier : showMenuRoute,
        playAgainLabel: qualifierActive
          ? uiText("qualifier.createTeam")
          : leagueMatchContext
            ? uiText("home.careerContinue")
            : uiText("result.playAgain"),
        mainMenuLabel: qualifierActive
          ? uiText("qualifier.retry")
          : leagueMatchContext
            ? uiText("league.title")
            : uiText("common.mainMenu"),
      });
      if (leagueMatchContext) {
        (document.getElementById("v2-result-play-again") as HTMLButtonElement).disabled = !leagueResultRecorded;
        if (!leagueSaveFailed) void saveLeagueResult();
      }
    });
  showArenaLoadingUi(
    getWorldMap(activeRoute.map)?.displayName ?? "Arena",
    "Starting arena engine",
  );
  void import("./phaserBootstrap")
    .then(({ createPhaserGame }) => createPhaserGame())
    .catch((error: unknown) => {
      console.error("Could not start Phaser", error);
      showArenaLoadingError();
    });
}

function modeIdForRoute(mode: "tdm" | "ctf" | "one-flag") {
  return mode === "tdm"
    ? "team-deathmatch"
    : mode === "ctf"
    ? "classic-ctf"
    : "one-flag";
}

function resultModeLabel(modeId: ReturnType<typeof modeIdForRoute>): string {
  return modeId === "team-deathmatch"
    ? uiText("custom.modeTdm").toUpperCase()
    : modeId === "classic-ctf"
      ? uiText("custom.modeCtf").toUpperCase()
      : uiText("custom.modeOneFlag").toUpperCase();
}

function setupV2FullscreenControls(): void {
  const controls = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-v2-fullscreen-control]"),
  );
  if (controls.length === 0) return;

  const syncControls = (): void => {
    const state = readV2FullscreenControlState(document);
    const fullscreenLabel = uiText(state.active ? "common.exitFullscreen" : "common.enterFullscreen");
    for (const control of controls) {
      control.classList.toggle("is-hidden", !state.available);
      control.classList.toggle("is-active", state.active);
      control.setAttribute("aria-label", fullscreenLabel);
      control.setAttribute("aria-pressed", String(state.active));
      control.setAttribute("title", fullscreenLabel);
      const label = control.querySelector<HTMLElement>(
        "[data-v2-fullscreen-label]",
      );
      const icon = control.querySelector<HTMLImageElement>(
        "[data-v2-fullscreen-icon]",
      );
      if (label) label.textContent = fullscreenLabel;
      if (icon) {
        icon.src =
          `${import.meta.env.BASE_URL}assets/ui/hud-fullscreen-${state.icon}.svg`;
      }
    }
  };

  const toggleFullscreen = async (): Promise<void> => {
    try {
      await toggleV2Fullscreen(document);
    } catch {
      // Browsers may reject fullscreen because of policy or user settings.
    } finally {
      syncControls();
    }
  };

  for (const control of controls) {
    control.onclick = toggleFullscreen;
  }
  document.addEventListener("fullscreenchange", syncControls);
  document.addEventListener("fullscreenerror", syncControls);
  onUiLanguageChange(syncControls);
  syncControls();
}
