import Phaser from "phaser";
import type {
  CoreFrameResult,
  CoreInputFrame,
  ClassicCtfManualTeamCommand,
  ClassicCtfTeamCommand,
  ModeHudState,
  WorldSnapshot,
} from "../../core";
import { playerSkinLabel } from "../../playerSkinPreference";
import type { V2PlayerSkinId } from "../../v2Route";
import {
  DISPLAY_FONT_FAMILY,
  UI_FONT_FAMILY,
} from "../../uiTypography";
import type { FrameDiagnosticsPort } from "../debugging";
import type { HudPort } from "../hud";
import {
  readArenaKillNotice,
  type ArenaKillCause,
  type ArenaKillNotice,
} from "./arenaKillFeed";
import {
  calculateArenaHudLayout,
  type ArenaHudDensity,
  type ArenaHudRect,
} from "./arenaHudLayout";
import {
  drawHudBar,
  drawTechnicalPanel,
  HUD_COLORS,
  HUD_CSS_COLORS,
} from "./hudVisualDesign";

const HUD_DEPTH = 1000;
const KILL_FEED_LIMIT = 3;
const KILL_FEED_LIFETIME_MS = 4_200;

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

interface PlayerStatusView {
  readonly background: Phaser.GameObjects.Graphics;
  readonly portraitFrame: Phaser.GameObjects.Graphics;
  readonly bars: Phaser.GameObjects.Graphics;
  readonly portrait: Phaser.GameObjects.Image;
  readonly name: Phaser.GameObjects.Text;
  readonly state: Phaser.GameObjects.Text;
  readonly healthLabel: Phaser.GameObjects.Text;
  readonly healthValue: Phaser.GameObjects.Text;
  readonly armorLabel: Phaser.GameObjects.Text;
  readonly armorValue: Phaser.GameObjects.Text;
}

export class PhaserArenaHudPort
implements HudPort, FrameDiagnosticsPort {
  private readonly headerPanel: Phaser.GameObjects.Graphics;
  private readonly blueLabel: Phaser.GameObjects.Text;
  private readonly blueScoreText: Phaser.GameObjects.Text;
  private readonly redScoreText: Phaser.GameObjects.Text;
  private readonly redLabel: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly modeText: Phaser.GameObjects.Text;
  private readonly objectivePanel: Phaser.GameObjects.Graphics;
  private readonly objectiveText: Phaser.GameObjects.Text;
  private readonly teamCommandPanel: Phaser.GameObjects.Graphics;
  private readonly teamCommandStatus: Phaser.GameObjects.Text;
  private readonly teamCommandButtons: TeamCommandButtons;
  private readonly killFeedViews: readonly KillFeedView[];
  private readonly playerStatus: PlayerStatusView;
  private hudState: ModeHudState | null = null;
  private snapshot: WorldSnapshot | null = null;
  private activeTeamCommand: ClassicCtfTeamCommand = "auto";
  private activeKillNotices: ActiveKillNotice[] = [];
  private readonly processedKillEventIds = new Set<string>();
  private previousBlueScore: number | null = null;
  private previousRedScore: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mobileControls = false,
    private readonly botOpponent = false,
    private readonly playerSkinId: V2PlayerSkinId = "alien-runner",
    private readonly requestTeamCommand?: (
      command: ClassicCtfManualTeamCommand,
    ) => void,
  ) {
    this.headerPanel = createGraphics(scene);
    this.blueLabel = createText(
      scene,
      HUD_CSS_COLORS.blue,
      "12px",
      "bold",
    ).setOrigin(0, 0);
    this.blueScoreText = createDisplayText(
      scene,
      HUD_CSS_COLORS.blue,
      "28px",
    ).setOrigin(.5, 0);
    this.redScoreText = createDisplayText(
      scene,
      HUD_CSS_COLORS.red,
      "28px",
    ).setOrigin(.5, 0);
    this.redLabel = createText(
      scene,
      HUD_CSS_COLORS.red,
      "12px",
      "bold",
    ).setOrigin(1, 0);
    this.timerText = createDisplayText(
      scene,
      HUD_CSS_COLORS.neutral,
      "24px",
    ).setOrigin(.5, 0);
    this.modeText = createText(
      scene,
      HUD_CSS_COLORS.muted,
      "9px",
      "bold",
    ).setOrigin(.5, 0).setLetterSpacing(.8);
    this.objectivePanel = createGraphics(scene).setVisible(false);
    this.objectiveText = createText(
      scene,
      HUD_CSS_COLORS.neutral,
      "11px",
      "bold",
    ).setOrigin(.5, 0).setLetterSpacing(.5).setVisible(false);
    this.teamCommandPanel = createGraphics(scene);
    this.teamCommandStatus = createText(
      scene,
      HUD_CSS_COLORS.neutral,
      "10px",
      "bold",
    ).setVisible(false).setLetterSpacing(.5);
    this.teamCommandButtons = {
      defend: this.createTeamCommandButton("defend", "1 DEFEND"),
      follow: this.createTeamCommandButton("follow", "2 FOLLOW"),
      attack: this.createTeamCommandButton("attack", "3 ATTACK"),
    };
    this.killFeedViews = Array.from(
      { length: KILL_FEED_LIMIT },
      () => createKillFeedView(scene),
    );
    this.playerStatus = createPlayerStatusView(scene);
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
    this.previousBlueScore = null;
    this.previousRedScore = null;
    this.teamCommandPanel.setVisible(false);
    this.teamCommandStatus.setVisible(false);
    for (const button of Object.values(this.teamCommandButtons)) {
      button.setVisible(false);
    }
    for (const view of this.killFeedViews) setKillFeedViewVisible(view, false);
    setPlayerStatusVisible(this.playerStatus, false);
  }

  dispose(): void {
    this.scene.tweens.killTweensOf(this.blueScoreText);
    this.scene.tweens.killTweensOf(this.redScoreText);
    this.headerPanel.destroy();
    this.blueLabel.destroy();
    this.blueScoreText.destroy();
    this.redScoreText.destroy();
    this.redLabel.destroy();
    this.timerText.destroy();
    this.modeText.destroy();
    this.objectivePanel.destroy();
    this.objectiveText.destroy();
    this.teamCommandPanel.destroy();
    this.teamCommandStatus.destroy();
    for (const button of Object.values(this.teamCommandButtons)) {
      button.destroy();
    }
    for (const view of this.killFeedViews) destroyKillFeedView(view);
    destroyPlayerStatusView(this.playerStatus);
  }

  private createTeamCommandButton(
    command: ClassicCtfManualTeamCommand,
    label: string,
  ): Phaser.GameObjects.Text {
    const button = createText(
      this.scene,
      HUD_CSS_COLORS.neutral,
      "10px",
      "bold",
    )
      .setText(label)
      .setPadding(6, 4)
      .setBackgroundColor("#0d1d2ad9")
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
    if (!this.hudState || !this.snapshot) return;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const layout = calculateArenaHudLayout(
      width,
      height,
      this.mobileControls,
    );
    const blueScore = this.hudState.scores.find((entry) =>
      entry.teamId === "blue"
    )?.score ?? 0;
    const redScore = this.hudState.scores.find((entry) =>
      entry.teamId === "red"
    )?.score ?? 0;
    const player = this.snapshot.actors.find((actor) =>
      actor.id === "blue-player"
    );
    const objective = formatArenaObjectiveAlert(
      this.hudState,
      layout.density !== "standard",
    );

    this.layoutMatchHeader(
      this.hudState,
      layout.header,
      layout.density,
      blueScore,
      redScore,
    );
    this.layoutObjective(width, layout.objectiveY, layout.density, objective);
    this.layoutPlayerStatus(layout.playerStatus, layout, player);
    this.layoutTeamCommand(this.hudState, layout.density);
    this.layoutKillFeed(layout.killFeed, layout.killFeedVisible);
  }

  private layoutMatchHeader(
    state: ModeHudState,
    rect: ArenaHudRect,
    density: ArenaHudDensity,
    blueScore: number,
    redScore: number,
  ): void {
    drawTechnicalPanel(
      this.headerPanel,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      {
        fillAlpha: .91,
        borderAlpha: .32,
        cut: density === "micro" ? 6 : 10,
        raised: true,
      },
    );
    const centerX = rect.x + rect.width / 2;
    const primaryY = rect.y + (density === "micro" ? 5 : 7);
    const modeVisible = density !== "micro";
    const scoreFont = density === "standard" ? "29px" : density === "compact" ? "24px" : "18px";
    const timerFont = density === "standard" ? "23px" : density === "compact" ? "20px" : "15px";
    const labelFont = density === "standard" ? "11px" : density === "compact" ? "10px" : "9px";
    const leftScoreX = rect.x + rect.width * (density === "micro" ? .27 : .29);
    const rightScoreX = rect.x + rect.width * (density === "micro" ? .73 : .71);

    this.headerPanel.lineStyle(1, HUD_COLORS.borderBright, .13)
      .beginPath()
      .moveTo(centerX - (density === "micro" ? 25 : 34), rect.y + 7)
      .lineTo(centerX - (density === "micro" ? 25 : 34), rect.y + rect.height - (modeVisible ? 17 : 7))
      .moveTo(centerX + (density === "micro" ? 25 : 34), rect.y + 7)
      .lineTo(centerX + (density === "micro" ? 25 : 34), rect.y + rect.height - (modeVisible ? 17 : 7))
      .strokePath();
    this.headerPanel.lineStyle(2, HUD_COLORS.blue, .86)
      .beginPath()
      .moveTo(rect.x + 8, rect.y + 1)
      .lineTo(rect.x + Math.min(76, rect.width * .27), rect.y + 1)
      .strokePath();
    this.headerPanel.lineStyle(2, HUD_COLORS.red, .86)
      .beginPath()
      .moveTo(rect.x + rect.width - Math.min(76, rect.width * .27), rect.y + 1)
      .lineTo(rect.x + rect.width - 8, rect.y + 1)
      .strokePath();

    this.blueLabel
      .setPosition(rect.x + (density === "micro" ? 12 : 20), primaryY + (density === "micro" ? 4 : 7))
      .setFontSize(labelFont)
      .setText(density === "micro" ? "B" : "BLUE");
    this.blueScoreText
      .setPosition(leftScoreX, primaryY)
      .setFontSize(scoreFont)
      .setText(String(blueScore));
    this.timerText
      .setPosition(centerX, primaryY + (density === "micro" ? 1 : 2))
      .setFontSize(timerFont)
      .setText(formatTime(state.timeRemainingMs ?? 0));
    this.redScoreText
      .setPosition(rightScoreX, primaryY)
      .setFontSize(scoreFont)
      .setText(String(redScore));
    this.redLabel
      .setPosition(rect.x + rect.width - (density === "micro" ? 12 : 20), primaryY + (density === "micro" ? 4 : 7))
      .setFontSize(labelFont)
      .setText(density === "micro" ? "R" : "RED");
    this.modeText
      .setPosition(centerX, rect.y + rect.height - 15)
      .setFontSize(density === "standard" ? "9px" : "8px")
      .setText(formatArenaModeLine(state))
      .setVisible(modeVisible);

    this.animateScoreChange(
      this.blueScoreText,
      blueScore,
      this.previousBlueScore,
    );
    this.animateScoreChange(
      this.redScoreText,
      redScore,
      this.previousRedScore,
    );
    this.previousBlueScore = blueScore;
    this.previousRedScore = redScore;
  }

  private layoutObjective(
    width: number,
    y: number,
    density: ArenaHudDensity,
    objective: string,
  ): void {
    const visible = Boolean(objective);
    this.objectivePanel.setVisible(visible);
    this.objectiveText.setVisible(visible);
    if (!visible) return;
    this.objectiveText
      .setFontSize(density === "standard" ? "10px" : "9px")
      .setText(objective);
    const panelWidth = Math.min(
      width - 20,
      Math.max(128, this.objectiveText.width + 24),
    );
    const panelHeight = density === "standard" ? 23 : 21;
    const x = Math.round((width - panelWidth) / 2);
    drawTechnicalPanel(
      this.objectivePanel,
      x,
      y,
      panelWidth,
      panelHeight,
      {
        fillAlpha: .86,
        borderAlpha: .24,
        cut: 5,
        accent: HUD_COLORS.armor,
      },
    );
    this.objectiveText.setPosition(width / 2, y + 5);
  }

  private layoutTeamCommand(
    state: ModeHudState,
    density: ArenaHudDensity,
  ): void {
    const visible = state.modeId === "classic-ctf" && this.botOpponent &&
      !this.mobileControls && density !== "micro" &&
      this.scene.scale.width >= 760;
    this.teamCommandPanel.setVisible(visible);
    this.teamCommandStatus.setVisible(visible);
    for (const button of Object.values(this.teamCommandButtons)) {
      button.setVisible(visible);
    }
    if (!visible) return;

    const x = density === "standard" ? 12 : 8;
    const y = density === "standard" ? 10 : 8;
    const width = density === "standard" ? 226 : 214;
    drawTechnicalPanel(
      this.teamCommandPanel,
      x,
      y,
      width,
      52,
      {
        accent: HUD_COLORS.blue,
        fillAlpha: .86,
        borderAlpha: .24,
        cut: 7,
      },
    );
    this.teamCommandStatus
      .setPosition(x + 10, y + 6)
      .setText(`SQUAD · ${this.activeTeamCommand.toUpperCase()}`)
      .setColor(teamCommandColor(this.activeTeamCommand));
    for (const [index, command] of ([
      "defend",
      "follow",
      "attack",
    ] as const).entries()) {
      const selected = this.activeTeamCommand === command;
      this.teamCommandButtons[command]
        .setPosition(x + 9 + index * (density === "standard" ? 72 : 68), y + 27)
        .setColor(selected ? HUD_CSS_COLORS.darkText : "#d6e2e9")
        .setBackgroundColor(
          selected ? teamCommandColor(command) : "#0d1d2ad9",
        );
    }
  }

  private layoutKillFeed(rect: ArenaHudRect, layoutVisible: boolean): void {
    const now = this.scene.time.now;
    this.activeKillNotices = this.activeKillNotices.filter((entry) =>
      entry.expiresAt > now
    );
    for (let index = 0; index < this.killFeedViews.length; index += 1) {
      const view = this.killFeedViews[index];
      const entry = this.activeKillNotices[index];
      if (!entry || !layoutVisible) {
        setKillFeedViewVisible(view, false);
        continue;
      }
      const { notice } = entry;
      const remainingMs = entry.expiresAt - now;
      const ageMs = KILL_FEED_LIFETIME_MS - remainingMs;
      const slide = Math.max(0, 14 * (1 - ageMs / 180));
      const x = rect.x + slide;
      const y = rect.y + index * (rect.height + 4);
      const centerX = x + rect.width / 2;
      const alpha = Math.min(1, remainingMs / 650) * (1 - index * .14);
      const accent = killFeedActorColorNumber(
        notice.killerActorId,
        this.snapshot,
      );
      setKillFeedViewVisible(view, true);
      drawKillFeedRow(
        view.background,
        x,
        y,
        rect.width,
        rect.height,
        accent,
      );
      view.killer
        .setPosition(centerX - 17, y + rect.height / 2)
        .setFontSize(rect.height >= 25 ? "10px" : "9px")
        .setText(killFeedActorName(
          notice.killerActorId,
          this.snapshot,
          this.botOpponent,
          true,
        ))
        .setColor(killFeedActorColor(notice.killerActorId, this.snapshot));
      view.victim
        .setPosition(centerX + 17, y + rect.height / 2)
        .setFontSize(rect.height >= 25 ? "10px" : "9px")
        .setText(killFeedActorName(
          notice.victimActorId,
          this.snapshot,
          this.botOpponent,
          false,
        ))
        .setColor(killFeedActorColor(notice.victimActorId, this.snapshot));
      const weaponTexture = killFeedWeaponTexture(notice.cause);
      view.weaponIcon
        .setPosition(centerX, y + rect.height / 2)
        .setDisplaySize(rect.height - 6, rect.height - 6)
        .setVisible(Boolean(weaponTexture));
      if (weaponTexture) view.weaponIcon.setTexture(weaponTexture);
      view.causeIcon
        .setPosition(centerX, y + rect.height / 2)
        .setFontSize(rect.height >= 25 ? "14px" : "12px")
        .setText(killFeedCauseGlyph(notice.cause))
        .setVisible(!weaponTexture);
      setKillFeedViewAlpha(view, alpha);
    }
  }

  private layoutPlayerStatus(
    rect: ArenaHudRect,
    layout: ReturnType<typeof calculateArenaHudLayout>,
    actor: WorldSnapshot["actors"][number] | undefined,
  ): void {
    if (!layout.playerStatusVisible) {
      setPlayerStatusVisible(this.playerStatus, false);
      return;
    }
    setPlayerStatusVisible(this.playerStatus, true);
    drawTechnicalPanel(
      this.playerStatus.background,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      {
        accent: HUD_COLORS.blue,
        fillAlpha: .9,
        borderAlpha: .28,
        cut: layout.playerStatusPortrait ? 9 : 7,
        raised: true,
      },
    );
    const portraitVisible = layout.playerStatusPortrait;
    this.playerStatus.portraitFrame.setVisible(portraitVisible);
    this.playerStatus.portrait.setVisible(portraitVisible);
    const contentX = portraitVisible ? rect.x + 69 : rect.x + 11;
    const contentRight = rect.x + rect.width - 10;
    const contentWidth = contentRight - contentX;
    if (portraitVisible) {
      drawTechnicalPanel(
        this.playerStatus.portraitFrame,
        rect.x + 8,
        rect.y + 8,
        52,
        52,
        {
          fillAlpha: .72,
          borderAlpha: .3,
          cut: 6,
          accent: HUD_COLORS.blue,
        },
      );
      this.playerStatus.portrait
        .setPosition(rect.x + 34, rect.y + 34)
        .setDisplaySize(48, 48);
    }

    const nameY = rect.y + (portraitVisible ? 7 : 5);
    this.playerStatus.name
      .setPosition(contentX, nameY)
      .setFontSize(portraitVisible ? "12px" : "10px")
      .setText(playerSkinLabel(this.playerSkinId).toUpperCase());
    this.playerStatus.state
      .setPosition(contentRight, nameY + 1)
      .setFontSize(portraitVisible ? "8px" : "7px")
      .setText(playerStateLabel(actor))
      .setColor(
        (actor?.spawnProtectionRemainingMs ?? 0) > 0
          ? HUD_CSS_COLORS.armor
          : HUD_CSS_COLORS.muted,
      );

    const health = Math.max(0, Math.ceil(actor?.health ?? 0));
    const armor = Math.max(0, Math.ceil(actor?.armor ?? 0));
    const healthRatio = actor
      ? actor.health / Math.max(1, actor.maxHealth)
      : 0;
    const armorRatio = actor
      ? actor.armor / Math.max(1, actor.maxArmor)
      : 0;
    const healthLabelY = rect.y + (portraitVisible ? 24 : 19);
    const healthBarY = rect.y + (portraitVisible ? 38 : 29);
    const armorLabelY = rect.y + (portraitVisible ? 49 : 34);
    const armorBarY = rect.y + (portraitVisible ? 60 : 42);
    this.playerStatus.healthLabel
      .setPosition(contentX, healthLabelY)
      .setFontSize(portraitVisible ? "8px" : "7px")
      .setText("HEALTH");
    this.playerStatus.healthValue
      .setPosition(contentRight, healthLabelY - 1)
      .setFontSize(portraitVisible ? "9px" : "8px")
      .setText(`${health} HP`);
    this.playerStatus.armorLabel
      .setPosition(contentX, armorLabelY)
      .setFontSize(portraitVisible ? "7px" : "6px")
      .setText("ARMOR");
    this.playerStatus.armorValue
      .setPosition(contentRight, armorLabelY - 1)
      .setFontSize(portraitVisible ? "8px" : "7px")
      .setText(String(armor));
    this.playerStatus.bars.clear();
    drawHudBar(
      this.playerStatus.bars,
      contentX,
      healthBarY,
      contentWidth,
      portraitVisible ? 7 : 6,
      healthRatio,
      HUD_COLORS.health,
    );
    drawHudBar(
      this.playerStatus.bars,
      contentX,
      armorBarY,
      contentWidth,
      portraitVisible ? 4 : 5,
      armorRatio,
      HUD_COLORS.armor,
    );
  }

  private animateScoreChange(
    text: Phaser.GameObjects.Text,
    next: number,
    previous: number | null,
  ): void {
    if (previous === null || next <= previous) return;
    this.scene.tweens.killTweensOf(text);
    text.setScale(1.28).setAlpha(1);
    this.scene.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 240,
      ease: "Back.Out",
    });
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
  return createResolvedText(scene, color, fontSize, UI_FONT_FAMILY, fontStyle);
}

function createDisplayText(
  scene: Phaser.Scene,
  color: string,
  fontSize: string,
): Phaser.GameObjects.Text {
  return createResolvedText(
    scene,
    color,
    fontSize,
    DISPLAY_FONT_FAMILY,
    "bold",
  );
}

function createResolvedText(
  scene: Phaser.Scene,
  color: string,
  fontSize: string,
  fontFamily: string,
  fontStyle: string,
): Phaser.GameObjects.Text {
  const text = scene.add.text(0, 0, "", {
    fontFamily,
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
    killer: createText(scene, HUD_CSS_COLORS.neutral, "10px", "bold")
      .setOrigin(1, .5)
      .setVisible(false),
    victim: createText(scene, HUD_CSS_COLORS.neutral, "10px", "bold")
      .setOrigin(0, .5)
      .setVisible(false),
    weaponIcon: scene.add.image(0, 0, "uiRocketButton")
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false),
    causeIcon: createText(scene, HUD_CSS_COLORS.neutral, "14px", "bold")
      .setOrigin(.5)
      .setVisible(false),
  };
}

function createPlayerStatusView(scene: Phaser.Scene): PlayerStatusView {
  return {
    background: createGraphics(scene),
    portraitFrame: createGraphics(scene),
    bars: createGraphics(scene),
    portrait: scene.add.image(0, 0, "playerHudPortrait")
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH)
      .setVisible(false),
    name: createDisplayText(scene, HUD_CSS_COLORS.neutral, "12px")
      .setLetterSpacing(.4),
    state: createText(scene, HUD_CSS_COLORS.muted, "8px", "bold")
      .setOrigin(1, 0)
      .setLetterSpacing(.4),
    healthLabel: createText(scene, HUD_CSS_COLORS.muted, "8px", "bold")
      .setLetterSpacing(.5),
    healthValue: createText(scene, HUD_CSS_COLORS.neutral, "9px", "bold")
      .setOrigin(1, 0),
    armorLabel: createText(scene, HUD_CSS_COLORS.armor, "7px", "bold")
      .setLetterSpacing(.5),
    armorValue: createText(scene, HUD_CSS_COLORS.armor, "8px", "bold")
      .setOrigin(1, 0),
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

function setPlayerStatusVisible(
  view: PlayerStatusView,
  visible: boolean,
): void {
  view.background.setVisible(visible);
  view.portraitFrame.setVisible(visible);
  view.bars.setVisible(visible);
  view.portrait.setVisible(visible);
  view.name.setVisible(visible);
  view.state.setVisible(visible);
  view.healthLabel.setVisible(visible);
  view.healthValue.setVisible(visible);
  view.armorLabel.setVisible(visible);
  view.armorValue.setVisible(visible);
}

function destroyKillFeedView(view: KillFeedView): void {
  view.background.destroy();
  view.killer.destroy();
  view.victim.destroy();
  view.weaponIcon.destroy();
  view.causeIcon.destroy();
}

function destroyPlayerStatusView(view: PlayerStatusView): void {
  view.background.destroy();
  view.portraitFrame.destroy();
  view.bars.destroy();
  view.portrait.destroy();
  view.name.destroy();
  view.state.destroy();
  view.healthLabel.destroy();
  view.healthValue.destroy();
  view.armorLabel.destroy();
  view.armorValue.destroy();
}

function drawKillFeedRow(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: number,
): void {
  drawTechnicalPanel(graphics, x, y, width, height, {
    fillAlpha: .78,
    borderAlpha: .18,
    cut: 5,
  });
  graphics.fillStyle(accent, .85);
  graphics.fillRect(x + 1, y + 5, 2, Math.max(4, height - 10));
}

function killFeedWeaponTexture(cause: ArenaKillCause): string | null {
  if (cause === "rocket") return "uiRocketButton";
  if (cause === "rail") return "uiRailButton";
  if (cause === "whip") return "uiWhipButton";
  if (cause === "pulse") return "uiPulseButton";
  if (cause === "disc") return "uiDiscButton";
  if (cause === "grenade") return "uiGrenadeButton";
  if (cause === "shard") return "uiShardButton";
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
  return teamId === "blue"
    ? HUD_CSS_COLORS.blue
    : teamId === "red"
    ? HUD_CSS_COLORS.red
    : HUD_CSS_COLORS.muted;
}

function killFeedActorColorNumber(
  actorId: string | undefined,
  snapshot: WorldSnapshot | null,
): number {
  const teamId = snapshot?.actors.find((actor) => actor.id === actorId)?.teamId;
  return teamId === "blue"
    ? HUD_COLORS.blue
    : teamId === "red"
    ? HUD_COLORS.red
    : HUD_COLORS.muted;
}

export function teamCommandColor(command: ClassicCtfTeamCommand): string {
  if (command === "defend") return HUD_CSS_COLORS.blue;
  if (command === "attack") return HUD_CSS_COLORS.red;
  if (command === "follow") return HUD_CSS_COLORS.armor;
  return HUD_CSS_COLORS.neutral;
}

export function formatArenaModeLine(state: ModeHudState): string {
  const title = state.modeId === "classic-ctf"
    ? "CLASSIC CTF"
    : state.modeId === "one-flag"
    ? "ONE FLAG"
    : state.modeId === "team-deathmatch"
    ? "TEAM DEATHMATCH"
    : state.modeId.replaceAll("-", " ").toUpperCase();
  const notice = state.notices[0]?.toUpperCase();
  return notice ? `${title} · ${notice}` : title;
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

function playerStateLabel(
  actor: WorldSnapshot["actors"][number] | undefined,
): string {
  if (!actor) return "OFFLINE";
  if (actor.lifeState === "active") {
    if (actor.spawnProtectionRemainingMs > 0) {
      return `SHIELD ${
        (Math.ceil(actor.spawnProtectionRemainingMs / 100) / 10).toFixed(1)
      }S`;
    }
    return "READY";
  }
  const seconds = Math.ceil((actor.respawn?.remainingMs ?? 0) / 100) / 10;
  return `RESPAWN ${seconds.toFixed(1)}S`;
}

function formatTime(timeMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
