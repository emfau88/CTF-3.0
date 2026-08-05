import Phaser from "phaser";
import type { MatchState } from "../../core";
import { UI_FONT_FAMILY } from "../../uiTypography";

const FIGHT_DISPLAY_MS = 700;

export class PhaserMatchStartOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly kicker: Phaser.GameObjects.Text;
  private readonly countdown: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private lastPhase: MatchState["phase"] | null = null;
  private lastLabel = "";
  private fightUntilMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.backdrop = scene.add.rectangle(0, 0, 280, 158, 0x07131b, .88)
      .setStrokeStyle(2, 0x7fdcff, .82);
    this.kicker = scene.add.text(0, -52, "MATCH START", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "13px",
      fontStyle: "bold",
      color: "#8fdff1",
      letterSpacing: 2,
    }).setOrigin(.5);
    this.countdown = scene.add.text(0, 0, "READY", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "58px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#07131b",
      strokeThickness: 8,
    }).setOrigin(.5);
    this.detail = scene.add.text(0, 55, "ALL FIGHTERS LOCKED", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#b9cbd1",
      letterSpacing: 1,
    }).setOrigin(.5);
    this.container = scene.add.container(0, 0, [
      this.backdrop,
      this.kicker,
      this.countdown,
      this.detail,
    ]).setDepth(2_000).setVisible(false);
    scene.scale.on("resize", this.layout, this);
    this.layout(scene.scale.gameSize);
  }

  render(match: Readonly<MatchState> | null | undefined): void {
    if (match?.phase === "starting") {
      this.fightUntilMs = 0;
      this.show(countdownLabel(match), "ALL FIGHTERS LOCKED", 1);
      this.lastPhase = match.phase;
      return;
    }
    if (this.lastPhase === "starting" && match?.phase === "running") {
      this.fightUntilMs = this.scene.time.now + FIGHT_DISPLAY_MS;
      this.lastLabel = "";
    }
    this.lastPhase = match?.phase ?? null;
    if (this.fightUntilMs > this.scene.time.now) {
      const alpha = Phaser.Math.Clamp(
        (this.fightUntilMs - this.scene.time.now) / FIGHT_DISPLAY_MS,
        0,
        1,
      );
      this.show("FIGHT!", "SIMULATION LIVE", alpha);
      return;
    }
    this.container.setVisible(false);
    this.lastLabel = "";
  }

  dispose(): void {
    this.scene.scale.off("resize", this.layout, this);
    this.container.destroy(true);
  }

  private show(label: string, detail: string, alpha: number): void {
    this.container.setVisible(true).setAlpha(alpha);
    if (label === this.lastLabel) return;
    this.lastLabel = label;
    this.countdown.setText(label);
    this.detail.setText(detail);
    this.kicker.setColor(label === "FIGHT!" ? "#ffd36c" : "#8fdff1");
    this.backdrop.setStrokeStyle(
      2,
      label === "FIGHT!" ? 0xffd36c : 0x7fdcff,
      .82,
    );
  }

  private layout(gameSize: Phaser.Structs.Size): void {
    const compact = gameSize.width < 620 || gameSize.height < 480;
    this.container.setPosition(gameSize.width / 2, gameSize.height * .43);
    this.backdrop.setDisplaySize(compact ? 230 : 280, compact ? 132 : 158);
    this.kicker.setY(compact ? -42 : -52).setFontSize(compact ? 11 : 13);
    this.countdown.setFontSize(compact ? 46 : 58);
    this.detail.setY(compact ? 44 : 55).setFontSize(compact ? 9 : 11);
  }
}

function countdownLabel(match: Readonly<MatchState>): string {
  const durationMs = Math.max(1, match.startCountdownDurationMs ?? 1);
  const remainingMs = Math.max(0, match.startCountdownRemainingMs ?? 0);
  const progress = 1 - remainingMs / durationMs;
  if (progress < .15) return "READY";
  if (progress < .433) return "3";
  if (progress < .716) return "2";
  return "1";
}
