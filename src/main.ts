import Phaser from "phaser";
import { GameplayV2Scene } from "./adapters/phaser";
import { shouldUseGameplayV2Shell } from "./bootSceneSelection";
import {
  getWorldMap,
  type MatchResult,
  type MatchStatEntry,
  type ScoreEntry,
  validateWorldMapForMode,
} from "./core";
import { ArenaScene } from "./scenes/ArenaScene";
import {
  buildLeagueHubSearch,
  completeLeagueRound,
  createLeagueRepository,
  leagueTeam,
  readLeagueMatchContext,
} from "./meta/league";
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

const search = new URLSearchParams(window.location.search);
const leagueMatchContext = readLeagueMatchContext(search);
const useGameplayV2Shell = shouldUseGameplayV2Shell(
  window.location,
  import.meta.env.BASE_URL,
);
const routeState = useGameplayV2Shell ? readV2RouteState(search) : null;
const activeRoute = routeState ? { ...routeState.route } : null;
const routeIssues = routeState ? [...routeState.issues] : [];
if (useGameplayV2Shell && activeRoute && routeState?.canStartMatch) {
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
const showV2Menu = useGameplayV2Shell &&
  Boolean(activeRoute?.menu || routeIssues.length > 0);

if (useGameplayV2Shell) {
  document.querySelector<HTMLElement>("#hud")?.setAttribute("hidden", "");
}

if (showV2Menu) {
  showGameplayV2Menu(routeIssues[0]);
} else {
  if (useGameplayV2Shell) {
    const menuButton = document.querySelector<HTMLButtonElement>(
      "#v2-game-menu-button",
    );
    const statsButton = document.querySelector<HTMLButtonElement>(
      "#v2-stats-button",
    );
    const audioButton = document.querySelector<HTMLButtonElement>(
      "#v2-audio-button",
    );
    const usesTouchControls = activeRoute?.controls === "touch";
    let latestStats: readonly MatchStatEntry[] = [];
    let matchEnded = false;
    let leagueResultRecorded = false;
    const leagueOpponentName = leagueMatchContext
      ? leagueTeam(leagueMatchContext.opponentId).name
      : null;
    let heldScoreboardVisible = false;
    const humanActorIds = activeRoute?.players === "local"
      ? ["blue-player", "red-player"]
      : ["blue-player"];
    const respawnStatus = document.querySelector<HTMLElement>(
      "#v2-respawn-status",
    );
    const setIngameButtonsVisible = (visible: boolean): void => {
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
        });
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
        audioButton.textContent = currentSfx === "off" ? "SFX OFF" : "SFX ON";
        audioButton.setAttribute(
          "aria-pressed",
          currentSfx === "off" ? "true" : "false",
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
      if (leagueMatchContext && !leagueResultRecorded) {
        leagueResultRecorded = true;
        const repository = createLeagueRepository(window.localStorage);
        const season = repository.load();
        if (season && season.seasonId === leagueMatchContext.seasonId) {
          const blueScore = detail.scores?.find((entry) => entry.teamId === "blue")?.score ?? 0;
          const redScore = detail.scores?.find((entry) => entry.teamId === "red")?.score ?? 0;
          completeLeagueRound(season, {
            seasonId: leagueMatchContext.seasonId,
            matchId: leagueMatchContext.matchId,
            roundIndex: leagueMatchContext.roundIndex,
            blueScore,
            redScore,
            stats: latestStats.map((entry) => ({
              actorId: entry.actorId,
              kills: entry.kills,
              deaths: entry.deaths,
              flagPickups: entry.flagPickups,
              flagCaptures: entry.flagCaptures,
              flagReturns: entry.flagReturns,
            })),
          });
          repository.save(season);
        }
      }
      closeHeldScoreboard();
      setIngameButtonsVisible(false);
      hideGameplayV2Pause();
      releaseOverlayPause();
      showGameplayV2Result({
        headline: detail.result.kind === "draw"
          ? "Draw"
          : leagueMatchContext
            ? detail.result.winnerEntryId === "blue"
              ? "Iron Vanguard Win"
              : `${leagueOpponentName ?? "Rivals"} Win`
            : `${detail.result.winnerEntryId.toUpperCase()} Wins`,
        detail: leagueMatchContext
          ? `LEAGUE MATCH ${leagueMatchContext.roundIndex + 1} · ${formatResultScores(detail.scores ?? [])}`
          : formatResultScores(detail.scores ?? []),
        stats: latestStats,
        humanActorIds,
        onPlayAgain: leagueMatchContext ? showMenuRoute : restartCurrentMatch,
        onMainMenu: showMenuRoute,
        playAgainLabel: leagueMatchContext ? "Continue League" : "Play Again",
        mainMenuLabel: leagueMatchContext ? "League HQ" : "Main Menu",
      });
    });
  }
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#edf5ee",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: { antialias: true },
    scene: [useGameplayV2Shell ? GameplayV2Scene : ArenaScene],
  });
}

function modeIdForRoute(mode: "tdm" | "ctf" | "one-flag") {
  return mode === "tdm"
    ? "team-deathmatch"
    : mode === "ctf"
    ? "classic-ctf"
    : "one-flag";
}

function formatResultScores(scores: readonly ScoreEntry[]): string {
  const blue = scores.find((entry) => entry.teamId === "blue")?.score ?? 0;
  const red = scores.find((entry) => entry.teamId === "red")?.score ?? 0;
  return `BLUE ${blue} : RED ${red}`;
}
