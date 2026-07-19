import Phaser from "phaser";
import { preloadArenaAssets } from "../../../assets";
import { playerSkinPortraitAssetStem } from "../../../playerSkinPreference";
import { readLeagueMatchRosterPresentation } from "../../../meta/league";
import {
  readV2Route,
  type V2PlayerSkinId,
} from "../../../v2Route";
import {
  ArenaBotControllerGroup,
  ClassicCtfMode,
  createArenaBotControllerGroup,
  createArenaRoster,
  createClassicCtfWorldState,
  createOneFlagWorldState,
  createTeamDeathmatchWorldState,
  GameplayCoreRuntime,
  OneFlagMode,
  resolveWorldMap,
  TeamDeathmatchMode,
  toggleClassicCtfTeamCommand,
  weaponAmmo,
  weaponCooldown,
  type ArenaWeaponId,
  type ClassicCtfManualTeamCommand,
  type ClassicCtfTeamCommand,
  type WorldMapData,
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_COLLISION_GROUNDWORK_CONFIG,
} from "../../../core";
import {
  AugmentedInputAdapter,
  type InputAdapterPort,
} from "../../input";
import {
  PhaserDiagnosticInputAdapter,
} from "../PhaserDiagnosticInputAdapter";
import { PhaserArenaAudioPort } from "../PhaserArenaAudioPort";
import {
  PhaserArenaRendererPort,
  type ArenaCollisionDiagnostics,
} from "../PhaserArenaRendererPort";
import { PhaserGameBridge } from "../PhaserGameBridge";
import { PhaserMobileInputAdapter } from "../PhaserMobileInputAdapter";
import { PhaserArenaHudPort } from "../PhaserArenaHudPort";
import { PhaserWeaponEffectsPort } from "../PhaserWeaponEffectsPort";
import {
  BotTraversalSmokeController,
  configureBotTraversalSmokeWorld,
  createBotTraversalSmokeSetup,
} from "../BotTraversalSmoke";
import { PhaserBotTraversalSmokeOverlay } from "../PhaserBotTraversalSmokeOverlay";
import {
  GAMEPLAY_V2_HUD_SCENE_KEY,
  GameplayV2HudScene,
} from "./GameplayV2HudScene";
import { requiredV2CharacterSkinIds } from "../v2CharacterPresentation";
import { bindArenaLoadingUi } from "../../../arenaLoadingUi";

export class GameplayV2Scene extends Phaser.Scene {
  private bridge?: PhaserGameBridge;
  private inputAdapter?: InputAdapterPort;
  private menuKey?: Phaser.Input.Keyboard.Key;
  private pauseForVisibility = false;
  private pauseForOverlay = false;
  private skipNextFrame = false;
  private lastReportedMatchSignature = "";
  private traversalSmokeOverlay?: PhaserBotTraversalSmokeOverlay;
  private mapPreviewRenderer?: PhaserArenaRendererPort;
  private mapPreviewResize?: () => void;
  private hudScene?: GameplayV2HudScene;

  constructor() {
    super("GameplayV2Scene");
  }

  preload(): void {
    const search = new URLSearchParams(window.location.search);
    const route = readV2Route(search);
    const map = resolveWorldMap(route.map);
    bindArenaLoadingUi(this, map.displayName);
    const leagueRosterPresentation = readLeagueMatchRosterPresentation(search);
    const captainSkinId = leagueRosterPresentation?.captainSkinId ?? route.skin;
    const characterRosterPresentation = leagueRosterPresentation
      ? {
          blueBotSkinIds: [leagueRosterPresentation.playerWingmanSkinId],
          redSkinIds: leagueRosterPresentation.opponentSkinIds,
        }
      : undefined;
    preloadArenaAssets(this, {
      mapId: map.id,
      mapTheme: map.presentation.theme,
      characterSkinIds: requiredV2CharacterSkinIds(
        route.teamSize,
        captainSkinId,
        characterRosterPresentation,
      ),
      playerHudPortraitAssetStem: playerSkinPortraitAssetStem(captainSkinId),
    });
  }

  create(): void {
    const search = new URLSearchParams(window.location.search);
    const route = readV2Route(search);
    const leagueRosterPresentation = readLeagueMatchRosterPresentation(search);
    const captainSkinId = leagueRosterPresentation?.captainSkinId ?? route.skin;
    const characterRosterPresentation = leagueRosterPresentation
      ? {
          blueBotSkinIds: [leagueRosterPresentation.playerWingmanSkinId],
          redSkinIds: leagueRosterPresentation.opponentSkinIds,
        }
      : undefined;
    const isTeamDeathmatch = route.mode === "tdm";
    const isClassicCtf = route.mode === "ctf";
    const isOneFlag = route.mode === "one-flag";
    const selectedMap = resolveWorldMap(route.map);
    if (search.get("mapPreview") === "1") {
      this.createMapPreview(selectedMap, route.skin);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      return;
    }
    this.scene.launch(GAMEPLAY_V2_HUD_SCENE_KEY);
    this.hudScene = this.scene.get(
      GAMEPLAY_V2_HUD_SCENE_KEY,
    ) as GameplayV2HudScene;
    this.scene.bringToTop(GAMEPLAY_V2_HUD_SCENE_KEY);
    const collisionDiagnostics: ArenaCollisionDiagnostics =
      search.get("clearanceHeatmap") === "1"
        ? "heatmap"
        : search.get("collisionDebug") === "1"
        ? "solids"
        : "off";
    const traversalSmokeSetup =
      search.get("traversalSmoke") === "1" &&
      isTeamDeathmatch &&
      route.players === "bot" &&
      route.teamSize === 1
        ? createBotTraversalSmokeSetup(
          selectedMap,
          search.get("traversalLink") ?? undefined,
        )
        : null;
    // Product V2 routes only resolve arena modes via readV2Route().
    const useMobileControls = prefersMobileControls(route);
    const useBotOpponent = prefersBotOpponent(route.players, useMobileControls);
    const humanActorIds = route.players === "bot"
      ? ["blue-player"]
      : ["blue-player", "red-player"];
    const botParticipants = createArenaRoster(route.teamSize).filter(
      (participant) => !humanActorIds.includes(participant.actorId),
    );
    const botControllers = traversalSmokeSetup
      ? new ArenaBotControllerGroup([
          new BotTraversalSmokeController(traversalSmokeSetup),
        ])
      : createArenaBotControllerGroup(
        isClassicCtf
          ? "classic-ctf"
          : isOneFlag
          ? "one-flag"
          : "team-deathmatch",
        selectedMap,
        botParticipants,
        humanActorIds,
      );
    this.sound.mute = route.sfx === "off";
    const runtime = new GameplayCoreRuntime({
      mode: isClassicCtf
        ? new ClassicCtfMode(selectedMap)
        : isOneFlag
        ? new OneFlagMode(selectedMap)
        : new TeamDeathmatchMode(),
      createWorld: () => {
        const world = isClassicCtf
          ? createClassicCtfWorldState(selectedMap, { teamSize: route.teamSize })
          : isOneFlag
          ? createOneFlagWorldState(selectedMap, { teamSize: route.teamSize })
          : createTeamDeathmatchWorldState(selectedMap, {
            teamSize: route.teamSize,
          });
        return traversalSmokeSetup
          ? configureBotTraversalSmokeWorld(world, traversalSmokeSetup)
          : world;
      },
      humanActorIds,
    });
    const readBlueWeaponStatus = (weaponId: ArenaWeaponId) => {
      const actor = (this.bridge?.snapshot ?? runtime.snapshot).actors.find(
        (candidate) => candidate.id === "blue-player",
      );
      if (!actor) return { ammo: 0, cooldownMs: 0 };
      return {
        ammo: weaponAmmo(actor.weapons, weaponId),
        cooldownMs: weaponCooldown(actor.weapons, weaponId),
      };
    };
    const mobileInput = useMobileControls
      ? new PhaserMobileInputAdapter(
        this,
        "blue-player",
        false,
        readBlueWeaponStatus,
        () => this.bridge?.snapshot ?? runtime.snapshot,
        this.hudScene,
      )
      : undefined;
    let activeTeamCommand: ClassicCtfTeamCommand = "auto";
    const requestTeamCommand = (
      selected: ClassicCtfManualTeamCommand,
    ): void => {
      activeTeamCommand = toggleClassicCtfTeamCommand(
        activeTeamCommand,
        selected,
      );
      botControllers.setTeamCommand("blue", activeTeamCommand);
      hud.showTeamCommand(activeTeamCommand);
    };
    const hud = new PhaserArenaHudPort(
      this.hudScene,
      useMobileControls,
      useBotOpponent,
      captainSkinId,
      isClassicCtf && useBotOpponent ? requestTeamCommand : undefined,
    );
    const playerInput = useMobileControls && mobileInput
      ? mobileInput
      : new PhaserDiagnosticInputAdapter(
        this,
        useBotOpponent ? "tdm-solo" : "tdm",
        readBlueWeaponStatus,
        () => this.bridge?.snapshot ?? runtime.snapshot,
        "blue-player",
        isClassicCtf && useBotOpponent ? requestTeamCommand : undefined,
        this.hudScene,
      );
    this.inputAdapter = botControllers.size > 0
      ? new AugmentedInputAdapter(
        playerInput,
        () => this.bridge?.snapshot ?? runtime.snapshot,
        botControllers,
      )
      : playerInput;
    this.bridge = new PhaserGameBridge(runtime, {
      renderer: new PhaserArenaRendererPort(
        this,
        selectedMap,
        useBotOpponent ? "blue-player" : undefined,
        captainSkinId,
        useBotOpponent,
        useMobileControls ? .8 : 1,
        collisionDiagnostics,
        characterRosterPresentation,
      ),
      audio: new PhaserArenaAudioPort(this, "blue-player"),
      diagnostics: hud,
      effects: new PhaserWeaponEffectsPort(this, "blue-player"),
      hud,
    });
    this.bridge.initialize();
    if (traversalSmokeSetup) {
      this.traversalSmokeOverlay = new PhaserBotTraversalSmokeOverlay(
        traversalSmokeSetup,
      );
      this.traversalSmokeOverlay.render(this.bridge.snapshot);
    }
    this.publishMatchState();
    window.addEventListener("v2-sfx-changed", this.handleSfxChanged);
    window.addEventListener("v2-overlay-state", this.handleOverlayState);
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    if (this.input.keyboard) {
      this.menuKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.M,
      );
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    if (!this.bridge || !this.inputAdapter) {
      return;
    }
    if (this.pauseForVisibility || this.pauseForOverlay || document.hidden) {
      return;
    }
    if (this.menuKey && Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      window.dispatchEvent(new CustomEvent("v2-request-pause"));
      return;
    }
    if (this.skipNextFrame) {
      this.skipNextFrame = false;
      this.inputAdapter.reset();
      return;
    }
    this.bridge.advance(this.inputAdapter.readFrame(delta));
    this.traversalSmokeOverlay?.render(this.bridge.snapshot);
    this.publishMatchState();
  }

  private shutdown(): void {
    window.removeEventListener("v2-sfx-changed", this.handleSfxChanged);
    window.removeEventListener("v2-overlay-state", this.handleOverlayState);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.bridge?.dispose();
    this.mapPreviewRenderer?.dispose();
    this.traversalSmokeOverlay?.dispose();
    this.inputAdapter?.dispose();
    if (this.scene.isActive(GAMEPLAY_V2_HUD_SCENE_KEY)) {
      this.scene.stop(GAMEPLAY_V2_HUD_SCENE_KEY);
    }
    this.menuKey?.destroy();
    this.bridge = undefined;
    if (this.mapPreviewResize) {
      this.scale.off("resize", this.mapPreviewResize);
    }
    document.body.classList.remove("v2-map-preview");
    this.inputAdapter = undefined;
    this.menuKey = undefined;
    this.traversalSmokeOverlay = undefined;
    this.mapPreviewRenderer = undefined;
    this.mapPreviewResize = undefined;
    this.hudScene = undefined;
    this.pauseForVisibility = false;
    this.pauseForOverlay = false;
    this.skipNextFrame = false;
    this.lastReportedMatchSignature = "";
  }

  private createMapPreview(
    map: WorldMapData,
    skin: V2PlayerSkinId,
  ): void {
    document.body.classList.add("v2-map-preview");
    this.mapPreviewRenderer = new PhaserArenaRendererPort(
      this,
      map,
      undefined,
      skin,
    );
    const bounds = map.geometry.bounds;
    this.mapPreviewResize = () => {
      const camera = this.cameras.main;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      camera
        .setBounds(bounds.minX, bounds.minY, width, height)
        .setZoom(Math.min(camera.width / width, camera.height / height))
        .centerOn(
          bounds.minX + width / 2,
          bounds.minY + height / 2,
        );
    };
    this.scale.on("resize", this.mapPreviewResize);
    this.mapPreviewResize();
  }

  private readonly handleSfxChanged = (event: Event): void => {
    const enabled = Boolean(
      (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled,
    );
    this.sound.mute = !enabled;
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pauseForVisibility = true;
      this.skipNextFrame = true;
      this.inputAdapter?.reset();
      return;
    }
    this.pauseForVisibility = false;
    this.skipNextFrame = true;
  };

  private readonly handleOverlayState = (event: Event): void => {
    this.pauseForOverlay = Boolean(
      (event as CustomEvent<{ paused?: boolean }>).detail?.paused,
    );
    if (this.pauseForOverlay) {
      this.inputAdapter?.reset();
    }
  };

  private publishMatchState(): void {
    const hudState = this.bridge?.hudState;
    if (!hudState) {
      return;
    }
    const resultKey = hudState.matchResult?.kind === "winner"
      ? `${hudState.matchResult.kind}:${hudState.matchResult.winnerEntryId}`
      : hudState.matchResult?.kind ?? "none";
    const stats = this.bridge?.snapshot.matchStats.entries ?? [];
    const controlledActor = this.bridge?.snapshot.actors.find((actor) =>
      actor.id === "blue-player"
    );
    const playerRespawnMs = controlledActor?.lifeState === "falling"
      ? (controlledActor.respawn?.remainingMs ?? 0) +
        V2_ACTOR_LIFECYCLE_CONFIG.respawnDelayMs -
        V2_COLLISION_GROUNDWORK_CONFIG.fallDurationMs
      : controlledActor?.respawn?.remainingMs ?? 0;
    const statsKey = stats.map((entry) =>
      `${entry.actorId}:${entry.kills}:${entry.deaths}:${entry.flagPickups}:${entry.flagCaptures}:${entry.flagReturns}`
    ).join("|");
    const respawnKey = `${controlledActor?.lifeState ?? "missing"}:${Math.ceil(playerRespawnMs / 100)}`;
    const signature = `${hudState.phase}:${resultKey}:${statsKey}:${respawnKey}`;
    if (signature === this.lastReportedMatchSignature) {
      return;
    }
    this.lastReportedMatchSignature = signature;
    window.dispatchEvent(new CustomEvent("v2-match-state", {
      detail: {
        phase: hudState.phase,
        result: hudState.matchResult ?? null,
        scores: hudState.scores,
        stats,
        playerLifeState: controlledActor?.lifeState,
        playerRespawnMs,
      },
    }));
  }
}

function prefersMobileControls(route: { controls: string; players: string }): boolean {
  const override = route.controls;
  if (override === "mobile" || override === "touch") {
    return true;
  }
  if (override === "desktop" || override === "keyboard") {
    return false;
  }
  // Touch controls follow the device, not the opponent: a desktop solo-vs-bots
  // match defaults to keyboard + mouse, while real touch devices keep the
  // overlay. `?controls=touch` still forces the overlay for on-desktop testing.
  return navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;
}

function prefersBotOpponent(
  players: string,
  mobileControls: boolean,
): boolean {
  if (players === "bot") {
    return true;
  }
  if (players === "local") {
    return false;
  }
  return mobileControls;
}
