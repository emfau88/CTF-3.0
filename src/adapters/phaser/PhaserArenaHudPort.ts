import Phaser from "phaser";
import type {
  CoreFrameResult,
  CoreInputFrame,
  ClassicCtfManualTeamCommand,
  ClassicCtfTeamCommand,
  ModeHudState,
  WorldSnapshot,
} from "../../core";
import type { FrameDiagnosticsPort } from "../debugging";
import type { HudPort } from "../hud";
import {
  readArenaKillNotice,
  type ArenaKillCause,
  type ArenaKillNotice,
} from "./arenaKillFeed";

const HUD_DEPTH = 1000;
const PANEL_FILL = 0x102320;
const PANEL_STROKE = 0xffffff;
const BLUE = "#8db7ff";
const RED = "#ff9e91";
const NEUTRAL = "#f5fbfa";
const MUTED = "#a9bfba";
const SHOW_PLAYER_PANELS = false;
const KILL_FEED_LIMIT = 3;
const KILL_FEED_LIFETIME_MS = 4_200;

interface PlayerPanel {
  readonly background: Phaser.GameObjects.Graphics;
  readonly bars: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  readonly state: Phaser.GameObjects.Text;
  readonly health: Phaser.GameObjects.Text;
  readonly armor: Phaser.GameObjects.Text;
  readonly ammo: Phaser.GameObjects.Text;
}

type TeamCommandButtons = Record<
  ClassicCtfManualTeamCommand,
  Phaser.GameObjects.Text
>;

interface KillFeedView {
  readonly background: Phaser.GameObjects.Graphics;
  readonly killer: Phaser.GameObjects.Text;
  readonly victim: Phaser.GameObjects.Text;
  readonly weaponIcon: Phaser.GameObjects.Image;
  readonly causeIcon: Phaser.GameObjects.Text;
}

interface ActiveKillNotice {
  readonly notice: ArenaKillNotice;
  readonly expiresAt: number;
}

export class PhaserArenaHudPort
implements HudPort, FrameDiagnosticsPort {
  private readonly scorePanel: Phaser.GameObjects.Graphics;
  private readonly blueScoreText: Phaser.GameObjects.Text;
  private readonly redScoreText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly teamCommandPanel: Phaser.GameObjects.Graphics;
  private readonly teamCommandStatus: Phaser.GameObjects.Text;
  private readonly teamCommandButtons: TeamCommandButtons;
  private readonly killFeedViews: readonly KillFeedView[];
  private readonly bluePanel: PlayerPanel;
  private readonly redPanel: PlayerPanel;
  private readonly resultText: Phaser.GameObjects.Text;
  private hudState: ModeHudState | null = null;
  private snapshot: WorldSnapshot | null = null;
  private activeTeamCommand: ClassicCtfTeamCommand = "auto";
  private activeKillNotices: ActiveKillNotice[] = [];
  private readonly processedKillEventIds = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mobileControls = false,
    private readonly botOpponent = false,
    private readonly requestRestart?: () => void,
    private readonly requestTeamCommand?: (
      command: ClassicCtfManualTeamCommand,
    ) => void,
  ) {
    this.scorePanel = createGraphics(scene);
    this.blueScoreText = createText(scene, BLUE, "18px", "bold")
      .setOrigin(1, 0);
    this.redScoreText = createText(scene, RED, "18px", "bold");
    this.timerText = createText(scene, NEUTRAL, "15px", "bold")
      .setOrigin(.5, 0);
    this.objectiveText = createText(scene, NEUTRAL, "12px", "bold")
      .setOrigin(.5, 0)
      .setPadding(8, 4)
      .setBackgroundColor("#102320dc")
      .setVisible(false);
    this.teamCommandPanel = createGraphics(scene);
    this.teamCommandStatus = createText(scene, "#e6f2ef", "11px", "bold")
      .setVisible(false);
    this.teamCommandButtons = {
      defend: this.createTeamCommandButton("defend", "1 DEFEND"),
      follow: this.createTeamCommandButton("follow", "2 FOLLOW"),
      attack: this.createTeamCommandButton("attack", "3 ATTACK"),
    };
    this.killFeedViews = Array.from(
      { length: KILL_FEED_LIMIT },
      () => createKillFeedView(scene),
    );
    this.bluePanel = createPlayerPanel(scene, BLUE);
    this.redPanel = createPlayerPanel(scene, RED);
    this.resultText = createText(scene, NEUTRAL, "30px", "bold")
      .setOrigin(.5)
      .setPadding(22, 16)
      .setAlign("center")
      .setBackgroundColor("#102320ee")
      .setVisible(false)
      .setDepth(HUD_DEPTH + 1);

    if (mobileControls && requestRestart) {
      this.resultText.setInteractive({ useHandCursor: true });
      this.resultText.on("pointerup", this.handleRestart);
    }
  }

  render(state: ModeHudState, snapshot: WorldSnapshot): void {
    this.hudState = state;
    this.snapshot = snapshot;
    this.refresh();
  }

  renderFrame(
    _frameCount: number,
    _input: CoreInputFrame | null,
    result: CoreFrameResult,
  ): void {
    this.captureKillEvents(result);
    this.refresh();
  }

  showTeamCommand(command: ClassicCtfTeamCommand): void {
    this.activeTeamCommand = command;
    this.refresh();
  }

  reset(): void {
    this.hudState = null;
    this.snapshot = null;
    this.activeTeamCommand = "auto";
    this.activeKillNotices = [];
    this.processedKillEventIds.clear();
    this.resultText.setVisible(false);
    this.teamCommandPanel.setVisible(false);
    this.teamCommandStatus.setVisible(false);
    for (const button of Object.values(this.teamCommandButtons)) {
      button.setVisible(false);
    }
    for (const view of this.killFeedViews) setKillFeedViewVisible(view, false);
  }

  dispose(): void {
    this.scorePanel.destroy();
    this.blueScoreText.destroy();
    this.redScoreText.destroy();
    this.timerText.destroy();
    this.objectiveText.destroy();
    this.teamCommandPanel.destroy();
    this.teamCommandStatus.destroy();
    for (const button of Object.values(this.teamCommandButtons)) {
      button.destroy();
    }
    for (const view of this.killFeedViews) destroyKillFeedView(view);
    destroyPlayerPanel(this.bluePanel);
    destroyPlayerPanel(this.redPanel);
    this.resultText.destroy();
  }

  private readonly handleRestart = (): void => {
    if (this.hudState?.phase === "ended") {
      this.requestRestart?.();
    }
  };

  private createTeamCommandButton(
    command: ClassicCtfManualTeamCommand,
    label: string,
  ): Phaser.GameObjects.Text {
    const button = createText(this.scene, MUTED, "11px", "bold")
      .setText(label)
      .setPadding(5, 4)
      .setBackgroundColor("#17302dcc")
      .setVisible(false);
    if (this.requestTeamCommand) {
      button.setInteractive({ useHandCursor: true });
      button.on("pointerup", () => this.requestTeamCommand?.(command));
    }
    return button;
  }

  private captureKillEvents(result: CoreFrameResult): void {
    for (const event of result.events) {
      const notice = readArenaKillNotice(event);
      if (!notice || this.processedKillEventIds.has(notice.eventId)) continue;
      this.processedKillEventIds.add(notice.eventId);
      this.activeKillNotices.unshift({
        notice,
        expiresAt: this.scene.time.now + KILL_FEED_LIFETIME_MS,
      });
      this.activeKillNotices = this.activeKillNotices.slice(0, KILL_FEED_LIMIT);
    }
  }

  private refresh(): void {
    if (!this.hudState || !this.snapshot) {
      return;
    }
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const compact = width < 700 || height < 500;
    const blueScore = this.hudState.scores.find((entry) =>
      entry.teamId === "blue"
    )?.score ?? 0;
    const redScore = this.hudState.scores.find((entry) =>
      entry.teamId === "red"
    )?.score ?? 0;
    const blue = this.snapshot.actors.find((actor) =>
      actor.teamId === "blue" && actor.kind === "player"
    );
    const red = this.snapshot.actors.find((actor) =>
      actor.teamId === "red" && actor.kind === "player"
    );
    const objective = formatArenaObjectiveAlert(this.hudState, compact);

    this.layoutMatchHeader(
      this.hudState,
      width,
      compact,
      blueScore,
      redScore,
      objective,
    );
    this.layoutPlayerPanels(width, height, compact, blue, red);
    this.layoutTeamCommand(this.hudState, width, compact);
    this.layoutKillFeed(width, compact, Boolean(objective));
    this.layoutResult(width, height);
  }

  private layoutMatchHeader(
    state: ModeHudState,
    width: number,
    compact: boolean,
    blueScore: number,
    redScore: number,
    objective: string,
  ): void {
    const centerX = Math.round(width / 2);
    const panelWidth = compact ? 170 : 214;
    const panelHeight = compact ? 34 : 38;
    const panelX = centerX - panelWidth / 2;
    const panelY = compact ? 8 : 10;
    drawPanel(this.scorePanel, panelX, panelY, panelWidth, panelHeight, 10);

    this.blueScoreText
      .setPosition(centerX - (compact ? 34 : 42), panelY + (compact ? 6 : 7))
      .setFontSize(compact ? "15px" : "17px")
      .setText(compact ? `B ${blueScore}` : `BLUE ${blueScore}`);
    this.redScoreText
      .setPosition(centerX + (compact ? 34 : 42), panelY + (compact ? 6 : 7))
      .setFontSize(compact ? "15px" : "17px")
      .setText(compact ? `${redScore} R` : `${redScore} RED`);
    this.timerText
      .setPosition(centerX, panelY + (compact ? 7 : 9))
      .setFontSize(compact ? "13px" : "14px")
      .setText(formatTime(state.timeRemainingMs ?? 0));
    this.objectiveText
      .setPosition(centerX, panelY + panelHeight + 6)
      .setFontSize(compact ? "11px" : "12px")
      .setText(objective)
      .setVisible(Boolean(objective));
  }

  private layoutTeamCommand(
    state: ModeHudState,
    width: number,
    compact: boolean,
  ): void {
    const visible = state.modeId === "classic-ctf" && this.botOpponent &&
      !this.mobileControls && width >= 700;
    this.teamCommandPanel.setVisible(visible);
    this.teamCommandStatus.setVisible(visible);
    for (const button of Object.values(this.teamCommandButtons)) {
      button.setVisible(visible);
    }
    if (!visible) return;

    const x = compact ? 8 : 12;
    const y = compact ? 8 : 10;
    drawPanel(this.teamCommandPanel, x, y, 226, 52, 9);
    this.teamCommandStatus
      .setPosition(x + 9, y + 5)
      .setText(`BOT: ${this.activeTeamCommand.toUpperCase()}`)
      .setColor(teamCommandColor(this.activeTeamCommand));
    for (const [index, command] of ([
      "defend",
      "follow",
      "attack",
    ] as const).entries()) {
      const selected = this.activeTeamCommand === command;
      this.teamCommandButtons[command]
        .setPosition(x + 8 + index * 72, y + 25)
        .setColor(selected ? "#08131d" : "#d6e4e1")
        .setBackgroundColor(
          selected ? teamCommandColor(command) : "#17302dcc",
        );
    }
  }

  private layoutKillFeed(
    width: number,
    compact: boolean,
    objectiveVisible: boolean,
  ): void {
    const now = this.scene.time.now;
    this.activeKillNotices = this.activeKillNotices.filter((entry) =>
      entry.expiresAt > now
    );
    const centerX = Math.round(width / 2);
    const firstY = (compact ? 49 : 56) + (objectiveVisible ? 28 : 0);
    const rowWidth = compact ? 228 : 264;
    const rowHeight = compact ? 22 : 24;
    for (let index = 0; index < this.killFeedViews.length; index += 1) {
      const view = this.killFeedViews[index];
      const entry = this.activeKillNotices[index];
      if (!entry) {
        setKillFeedViewVisible(view, false);
        continue;
      }
      const { notice } = entry;
      setKillFeedViewVisible(view, true);
      const y = firstY + index * (rowHeight + 4);
      const remainingMs = entry.expiresAt - now;
      const alpha = Math.min(1, remainingMs / 650);
      drawKillFeedRow(
        view.background,
        centerX - rowWidth / 2,
        y,
        rowWidth,
        rowHeight,
      );
      view.killer
        .setPosition(centerX - 19, y + rowHeight / 2)
        .setFontSize(compact ? "10px" : "11px")
        .setText(killFeedActorName(
          notice.killerActorId,
          this.snapshot,
          this.botOpponent,
          true,
        ))
        .setColor(killFeedActorColor(notice.killerActorId, this.snapshot));
      view.victim
        .setPosition(centerX + 19, y + rowHeight / 2)
        .setFontSize(compact ? "10px" : "11px")
        .setText(killFeedActorName(
          notice.victimActorId,
          this.snapshot,
          this.botOpponent,
          false,
        ))
        .setColor(killFeedActorColor(notice.victimActorId, this.snapshot));
      const weaponTexture = killFeedWeaponTexture(notice.cause);
      view.weaponIcon
        .setPosition(centerX, y + rowHeight / 2)
        .setDisplaySize(compact ? 18 : 20, compact ? 18 : 20)
        .setVisible(Boolean(weaponTexture));
      if (weaponTexture) view.weaponIcon.setTexture(weaponTexture);
      view.causeIcon
        .setPosition(centerX, y + rowHeight / 2)
        .setFontSize(compact ? "14px" : "16px")
        .setText(killFeedCauseGlyph(notice.cause))
        .setVisible(!weaponTexture);
      setKillFeedViewAlpha(view, alpha);
    }
  }

  private layoutPlayerPanels(
    width: number,
    height: number,
    compact: boolean,
    blue: WorldSnapshot["actors"][number] | undefined,
    red: WorldSnapshot["actors"][number] | undefined,
  ): void {
    if (!SHOW_PLAYER_PANELS) {
      setPlayerPanelVisible(this.bluePanel, false);
      setPlayerPanelVisible(this.redPanel, false);
      return;
    }
    const panelWidth = compact ? 154 : 184;
    const panelHeight = compact ? 62 : 68;
    const edge = compact ? 8 : 12;
    const desktopY = height - panelHeight - edge;
    const mobileY = compact ? 70 : 82;

    updatePlayerPanel(
      this.bluePanel,
      this.mobileControls ? "BLUE" : "BLUE P1",
      blue,
      edge,
      this.mobileControls ? mobileY : desktopY,
      panelWidth,
      panelHeight,
      BLUE,
    );
    updatePlayerPanel(
      this.redPanel,
      this.botOpponent ? "RED BOT" : "RED P2",
      red,
      width - panelWidth - edge,
      desktopY,
      panelWidth,
      panelHeight,
      RED,
    );
    setPlayerPanelVisible(this.bluePanel, !this.mobileControls);
    setPlayerPanelVisible(this.redPanel, !this.mobileControls);
  }

  private layoutResult(width: number, height: number): void {
    this.resultText.setPosition(width / 2, height / 2);
    this.resultText.setVisible(false);
  }
}

function createGraphics(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setScrollFactor(0).setDepth(HUD_DEPTH);
}

function createText(
  scene: Phaser.Scene,
  color: string,
  fontSize: string,
  fontStyle = "normal",
): Phaser.GameObjects.Text {
  const text = scene.add.text(0, 0, "", {
    fontFamily: "Arial, sans-serif",
    fontSize,
    fontStyle,
    color,
  }).setScrollFactor(0).setDepth(HUD_DEPTH);
  const resolution = typeof window === "undefined"
    ? 2
    : Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 2));
  return text.setResolution(resolution);
}

function createKillFeedView(scene: Phaser.Scene): KillFeedView {
  return {
    background: createGraphics(scene),
    killer: createText(scene, NEUTRAL, "11px", "bold")
      .setOrigin(1, .5)
      .setVisible(false),
    victim: createText(scene, NEUTRAL, "11px", "bold")
      .setOrigin(0, .5)
      .setVisible(false),
    weaponIcon: scene.add.image(0, 0, "uiRocketButton")
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false),
    causeIcon: createText(scene, NEUTRAL, "16px", "bold")
      .setOrigin(.5)
      .setVisible(false),
  };
}

function setKillFeedViewVisible(view: KillFeedView, visible: boolean): void {
  view.background.setVisible(visible);
  view.killer.setVisible(visible);
  view.victim.setVisible(visible);
  view.weaponIcon.setVisible(visible);
  view.causeIcon.setVisible(visible);
}

function setKillFeedViewAlpha(view: KillFeedView, alpha: number): void {
  view.background.setAlpha(alpha);
  view.killer.setAlpha(alpha);
  view.victim.setAlpha(alpha);
  view.weaponIcon.setAlpha(alpha);
  view.causeIcon.setAlpha(alpha);
}

function destroyKillFeedView(view: KillFeedView): void {
  view.background.destroy();
  view.killer.destroy();
  view.victim.destroy();
  view.weaponIcon.destroy();
  view.causeIcon.destroy();
}

function drawKillFeedRow(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  graphics.clear();
  graphics.fillStyle(0x08151b, .72);
  graphics.fillRoundedRect(x, y, width, height, 5);
  graphics.lineStyle(1, 0xb8d1cc, .12);
  graphics.strokeRoundedRect(x, y, width, height, 5);
}

function killFeedWeaponTexture(cause: ArenaKillCause): string | null {
  if (cause === "rocket") return "uiRocketButton";
  if (cause === "rail") return "uiRailButton";
  if (cause === "whip") return "uiWhipButton";
  return null;
}

function killFeedCauseGlyph(cause: ArenaKillCause): string {
  return cause === "fall" ? "▼" : "☠";
}

function killFeedActorName(
  actorId: string | undefined,
  snapshot: WorldSnapshot | null,
  botOpponent: boolean,
  killer: boolean,
): string {
  if (!actorId) return killer ? "WORLD" : "UNKNOWN";
  const actor = snapshot?.actors.find((candidate) => candidate.id === actorId);
  if (!actor) return actorId.toUpperCase();
  if (actor.id === "blue-player") return "YOU";
  if (!botOpponent && actor.id === "red-player") return "P2";
  const team = actor.teamId?.toUpperCase() ?? "BOT";
  const teamBots = snapshot?.actors.filter((candidate) =>
    candidate.teamId === actor.teamId && candidate.id !== "blue-player" &&
    (botOpponent || candidate.id !== "red-player")
  ) ?? [];
  const number = teamBots.findIndex((candidate) => candidate.id === actorId) + 1;
  return `${team} BOT${number > 1 ? ` ${number}` : ""}`;
}

function killFeedActorColor(
  actorId: string | undefined,
  snapshot: WorldSnapshot | null,
): string {
  const teamId = snapshot?.actors.find((actor) => actor.id === actorId)?.teamId;
  return teamId === "blue" ? BLUE : teamId === "red" ? RED : MUTED;
}

function createPlayerPanel(scene: Phaser.Scene, accent: string): PlayerPanel {
  return {
    background: createGraphics(scene),
    bars: createGraphics(scene),
    label: createText(scene, accent, "11px", "bold").setLetterSpacing(.8),
    state: createText(scene, MUTED, "9px", "bold").setOrigin(1, 0),
    health: createText(scene, NEUTRAL, "10px", "bold"),
    armor: createText(scene, NEUTRAL, "10px", "bold"),
    ammo: createText(scene, MUTED, "9px", "bold"),
  };
}

function destroyPlayerPanel(panel: PlayerPanel): void {
  panel.background.destroy();
  panel.bars.destroy();
  panel.label.destroy();
  panel.state.destroy();
  panel.health.destroy();
  panel.armor.destroy();
  panel.ammo.destroy();
}

function setPlayerPanelVisible(panel: PlayerPanel, visible: boolean): void {
  panel.background.setVisible(visible);
  panel.bars.setVisible(visible);
  panel.label.setVisible(visible);
  panel.state.setVisible(visible);
  panel.health.setVisible(visible);
  panel.armor.setVisible(visible);
  panel.ammo.setVisible(visible);
}

function updatePlayerPanel(
  panel: PlayerPanel,
  label: string,
  actor: WorldSnapshot["actors"][number] | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string,
): void {
  setPlayerPanelVisible(panel, true);
  const compact = width <= 160;
  drawPanel(panel.background, x, y, width, height, compact ? 9 : 10);
  panel.label
    .setPosition(x + (compact ? 8 : 9), y + (compact ? 6 : 7))
    .setFontSize(compact ? "10px" : "11px")
    .setText(label);
  panel.state
    .setPosition(x + width - (compact ? 8 : 9), y + (compact ? 6 : 7))
    .setFontSize(compact ? "8px" : "9px")
    .setText(lifeLabel(actor));
  panel.health
    .setPosition(x + (compact ? 8 : 9), y + (compact ? 22 : 24))
    .setFontSize(compact ? "10px" : "10px")
    .setText(`HP ${actor?.health ?? 0}`);
  panel.armor
    .setPosition(x + width - (compact ? 58 : 62), y + (compact ? 22 : 24))
    .setFontSize(compact ? "10px" : "10px")
    .setText(`AR ${actor?.armor ?? 0}`);
  panel.ammo
    .setPosition(x + (compact ? 8 : 9), y + (compact ? 45 : 49))
    .setFontSize(compact ? "8px" : "9px")
    .setText(
      `R ${actor?.weapons.rocketAmmo ?? 0}  RL ${
        actor?.weapons.railAmmo ?? 0
      }  W ${actor?.weapons.whipAmmo ?? 0}`,
    );

  const healthRatio = actor
    ? Phaser.Math.Clamp(actor.health / Math.max(1, actor.maxHealth), 0, 1)
    : 0;
  const armorRatio = actor
    ? Phaser.Math.Clamp(actor.armor / Math.max(1, actor.maxArmor), 0, 1)
    : 0;
  const gap = compact ? 6 : 7;
  const barY = y + (compact ? 35 : 38);
  const inset = compact ? 8 : 9;
  const healthWidth = Math.floor((width - inset * 2 - gap) * .64);
  const armorWidth = width - inset * 2 - gap - healthWidth;
  panel.bars.clear();
  drawBar(panel.bars, x + inset, barY, healthWidth, 4, healthRatio, 0x56c98c);
  drawBar(
    panel.bars,
    x + inset + healthWidth + gap,
    barY,
    armorWidth,
    4,
    armorRatio,
    Phaser.Display.Color.HexStringToColor(accent).color,
  );
}

function drawPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  graphics.clear();
  graphics.fillStyle(PANEL_FILL, .88);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(1, PANEL_STROKE, .16);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}

function drawBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: number,
): void {
  graphics.fillStyle(0xffffff, .12);
  graphics.fillRoundedRect(x, y, width, height, height / 2);
  if (ratio > 0) {
    graphics.fillStyle(color, .95);
    graphics.fillRoundedRect(x, y, width * ratio, height, height / 2);
  }
}

export function teamCommandColor(command: ClassicCtfTeamCommand): string {
  if (command === "defend") return BLUE;
  if (command === "attack") return "#ffae9f";
  if (command === "follow") return "#f3d47f";
  return "#e6f2ef";
}

export function formatArenaObjectiveAlert(
  state: ModeHudState,
  compact: boolean,
): string {
  if (state.modeId === "classic-ctf") {
    const red = state.objectives.find((objective) =>
      objective.id === "red-flag"
    );
    const blue = state.objectives.find((objective) =>
      objective.id === "blue-flag"
    );
    return [
      activeFlagAlert("RED", red, compact),
      activeFlagAlert("BLUE", blue, compact),
    ].filter(Boolean).join(compact ? " · " : "   ·   ");
  }
  if (state.modeId === "one-flag") {
    const center = state.objectives.find((objective) =>
      objective.id === "center-flag"
    );
    return center?.state.status === "home"
      ? ""
      : `CENTER FLAG ${flagLabel(center)}`;
  }
  return "";
}

function activeFlagAlert(
  team: "RED" | "BLUE",
  objective: ModeHudState["objectives"][number] | undefined,
  compact: boolean,
): string {
  if (!objective || objective.state.status === "home") return "";
  if (objective.state.status === "carried") {
    return compact ? `${team[0]} FLAG OUT` : `${team} FLAG TAKEN`;
  }
  return compact
    ? `${team[0]} FLAG ${flagLabel(objective, true)}`
    : `${team} FLAG ${flagLabel(objective)}`;
}

function flagLabel(
  objective: ModeHudState["objectives"][number] | undefined,
  compact = false,
): string {
  if (objective?.state.status === "carried") return "OUT";
  if (objective?.state.status !== "dropped") return "HOME";
  const seconds = Math.ceil(
    Math.max(0, objective.state.returnRemainingMs ?? 0) / 100,
  ) / 10;
  return compact ? `D${seconds}` : `DROP ${seconds}S`;
}

function lifeLabel(
  actor: WorldSnapshot["actors"][number] | undefined,
): string {
  if (actor?.lifeState === "active") {
    return "READY";
  }
  if (!actor) {
    return "MISSING";
  }
  const seconds = Math.ceil((actor.respawn?.remainingMs ?? 0) / 100) / 10;
  return `${actor.lifeState.toUpperCase()} ${seconds}s`;
}

function formatTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
