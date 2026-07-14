import Phaser from "phaser";
import { V2_ACTOR_LIFECYCLE_CONFIG } from "../../core";
import type {
  ActorState,
  ClassicCtfManualTeamCommand,
  CoreActionIntent,
  CoreInputFrame,
  WorldPosition,
  WorldSnapshot,
} from "../../core";
import { UI_FONT_FAMILY } from "../../uiTypography";
import {
  V2_V1_WEAPON_PARITY_CONFIG,
} from "../../core";
import type { InputAdapterPort } from "../input";
import { drawRadialCooldownWipe } from "./PhaserRadialCooldown";
import { resolveDesktopAimDirection } from "./desktopAim";
import {
  calculateDesktopWeaponLayout,
  formatCooldownSeconds,
  weaponIconScale,
} from "./weaponHudLayout";

interface DiagnosticKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly jump: Phaser.Input.Keyboard.Key;
  readonly fireSpecial: Phaser.Input.Keyboard.Key;
  readonly rocket: Phaser.Input.Keyboard.Key;
  readonly rail: Phaser.Input.Keyboard.Key;
  readonly whip: Phaser.Input.Keyboard.Key;
  readonly teamDefend: Phaser.Input.Keyboard.Key;
  readonly teamFollow: Phaser.Input.Keyboard.Key;
  readonly teamAttack: Phaser.Input.Keyboard.Key;
  readonly debugDamage: Phaser.Input.Keyboard.Key;
  readonly debugScore: Phaser.Input.Keyboard.Key;
  readonly restartMatch: Phaser.Input.Keyboard.Key;
  readonly redUp: Phaser.Input.Keyboard.Key;
  readonly redDown: Phaser.Input.Keyboard.Key;
  readonly redLeft: Phaser.Input.Keyboard.Key;
  readonly redRight: Phaser.Input.Keyboard.Key;
  readonly redJump: Phaser.Input.Keyboard.Key;
}

export type PhaserInputProfile = "diagnostic" | "tdm" | "tdm-solo";

type WeaponId = "rocket" | "rail" | "whip";

interface DesktopWeaponControl {
  x: number;
  y: number;
  radius: number;
}

interface DesktopWeaponBadgeView {
  readonly image: Phaser.GameObjects.Image;
  readonly text: Phaser.GameObjects.Text;
}

export interface DesktopWeaponStatus {
  readonly ammo: number;
  readonly cooldownMs: number;
}

export class PhaserDiagnosticInputAdapter implements InputAdapterPort {
  private readonly keys: DiagnosticKeys;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly cooldownGraphics: Phaser.GameObjects.Graphics;
  private readonly weaponViews: Record<WeaponId, Phaser.GameObjects.Image>;
  private readonly weaponBadges: Record<WeaponId, DesktopWeaponBadgeView>;
  private readonly weaponCooldownLabels: Record<
    WeaponId,
    Phaser.GameObjects.Text
  >;
  private readonly weaponKeyLabels: Record<WeaponId, Phaser.GameObjects.Text>;
  private sequence = 0;
  private jumpWasHeld = false;
  private damageWasHeld = false;
  private scoreWasHeld = false;
  private restartWasHeld = false;
  private redJumpWasHeld = false;
  private rocketWasHeld = false;
  private railWasHeld = false;
  private whipWasHeld = false;
  private teamDefendWasHeld = false;
  private teamFollowWasHeld = false;
  private teamAttackWasHeld = false;
  private readonly weaponControls: Record<WeaponId, DesktopWeaponControl> = {
    rocket: createDesktopWeaponControl(),
    rail: createDesktopWeaponControl(),
    whip: createDesktopWeaponControl(),
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly profile: PhaserInputProfile = "diagnostic",
    private readonly weaponStatus?: (weaponId: WeaponId) => DesktopWeaponStatus,
    private readonly snapshotProvider?: () => WorldSnapshot,
    private readonly actorId = "blue-player",
    private readonly onTeamCommand?: (
      command: ClassicCtfManualTeamCommand,
    ) => void,
  ) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Phaser keyboard input is required for V2 diagnostics.");
    }

    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      fireSpecial: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      rocket: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      rail: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      whip: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      teamDefend: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      teamFollow: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      teamAttack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      debugDamage: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      debugScore: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      restartMatch: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      redUp: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      redDown: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      redLeft: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      redRight: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      redJump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1100);
    this.cooldownGraphics = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(1102);
    this.weaponViews = {
      rocket: scene.add.image(0, 0, "uiRocketButton"),
      rail: scene.add.image(0, 0, "uiRailButton"),
      whip: scene.add.image(0, 0, "uiWhipButton"),
    };
    for (const view of Object.values(this.weaponViews)) {
      view.setScrollFactor(0).setDepth(1101).setVisible(false);
    }
    this.weaponBadges = {
      rocket: this.createWeaponBadge("uiAmmoBadge", "#17211f"),
      rail: this.createWeaponBadge("uiRailBadge", "#10281a"),
      whip: this.createWeaponBadge("uiAmmoBadge", "#2b1c36"),
    };
    this.weaponCooldownLabels = {
      rocket: this.createCooldownLabel(),
      rail: this.createCooldownLabel(),
      whip: this.createCooldownLabel(),
    };
    this.weaponKeyLabels = {
      rocket: this.createKeyLabel("Q"),
      rail: this.createKeyLabel("E"),
      whip: this.createKeyLabel("F"),
    };
    scene.scale.on("resize", this.layout, this);
    this.layout(scene.scale.gameSize);
  }

  readFrame(deltaMs: number): CoreInputFrame {
    const actions: CoreActionIntent[] = [];
    const move = this.readMoveDirection();
    const aim = this.readAimDirection();
    const jumpHeld = this.keys.jump.isDown;
    const pointer = this.scene.input.activePointer;
    const fireSpecial =
      this.keys.fireSpecial.isDown || pointer.rightButtonDown();

    const blueActorId = this.profile === "diagnostic"
      ? undefined
      : this.actorId;
    actions.push({
      action: "move",
      phase: "held",
      actorId: blueActorId,
      direction: move,
      magnitude: Math.hypot(move.x, move.y),
    });
    actions.push({
      action: "aim",
      phase: "held",
      actorId: blueActorId,
      direction: aim,
    });

    if (jumpHeld && !this.jumpWasHeld) {
      actions.push({ action: "jump", phase: "pressed", actorId: blueActorId });
    }
    if (jumpHeld) {
      actions.push({ action: "jump", phase: "held", actorId: blueActorId });
    }
    if (!jumpHeld && this.jumpWasHeld) {
      actions.push({ action: "jump", phase: "released", actorId: blueActorId });
    }
    if (this.profile === "diagnostic" && fireSpecial) {
      actions.push({ action: "fireSpecial", phase: "held" });
    }
    this.appendWeaponActions(actions, blueActorId, aim);
    this.readTeamCommand();
    if (
      this.profile === "diagnostic" &&
      this.keys.debugDamage.isDown &&
      !this.damageWasHeld
    ) {
      actions.push({
        action: "debugDamage",
        phase: "pressed",
        payload: { amount: V2_ACTOR_LIFECYCLE_CONFIG.diagnosticDamage },
      });
    }
    if (
      this.profile === "diagnostic" &&
      this.keys.debugScore.isDown &&
      !this.scoreWasHeld
    ) {
      actions.push({ action: "debugScore", phase: "pressed" });
    }
    if (this.keys.restartMatch.isDown && !this.restartWasHeld) {
      actions.push({ action: "restartMatch", phase: "pressed" });
    }
    if (this.profile === "tdm") {
      this.appendRedPlayerActions(actions);
    }

    this.jumpWasHeld = jumpHeld;
    this.damageWasHeld = this.keys.debugDamage.isDown;
    this.scoreWasHeld = this.keys.debugScore.isDown;
    this.restartWasHeld = this.keys.restartMatch.isDown;
    this.redJumpWasHeld = this.keys.redJump.isDown;
    this.rocketWasHeld = this.keys.rocket.isDown;
    this.railWasHeld = this.keys.rail.isDown;
    this.whipWasHeld = this.keys.whip.isDown;
    this.draw();
    return {
      sequence: ++this.sequence,
      timeMs: this.scene.time.now,
      deltaMs: Math.max(0, deltaMs),
      actions,
    };
  }

  reset(): void {
    this.sequence = 0;
    this.jumpWasHeld = false;
    this.damageWasHeld = false;
    this.scoreWasHeld = false;
    this.restartWasHeld = false;
    this.redJumpWasHeld = false;
    this.rocketWasHeld = false;
    this.railWasHeld = false;
    this.whipWasHeld = false;
    this.teamDefendWasHeld = false;
    this.teamFollowWasHeld = false;
    this.teamAttackWasHeld = false;
    this.draw();
  }

  dispose(): void {
    this.scene.scale.off("resize", this.layout, this);
    for (const key of Object.values(this.keys)) {
      key.destroy();
    }
    this.graphics.destroy();
    this.cooldownGraphics.destroy();
    for (const view of Object.values(this.weaponViews)) {
      view.destroy();
    }
    for (const badge of Object.values(this.weaponBadges)) {
      badge.image.destroy();
      badge.text.destroy();
    }
    for (const label of Object.values(this.weaponCooldownLabels)) {
      label.destroy();
    }
    for (const label of Object.values(this.weaponKeyLabels)) {
      label.destroy();
    }
  }

  private readMoveDirection(): WorldPosition {
    const x = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    const y = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
    const length = Math.hypot(x, y);

    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private readAimDirection(): WorldPosition {
    const pointer = this.scene.input.activePointer;
    const camera = this.scene.cameras.main;
    const pointerWorld = camera.getWorldPoint(pointer.x, pointer.y);
    const actor = this.controlledActor();
    const aimOrigin = actor?.lifeState === "active"
      ? actor.position
      : camera.getWorldPoint(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
      );

    return resolveDesktopAimDirection(aimOrigin, pointerWorld);
  }

  private appendRedPlayerActions(actions: CoreActionIntent[]): void {
    const actorId = "red-player";
    const move = this.readRedMoveDirection();
    actions.push({
      action: "move",
      phase: "held",
      actorId,
      direction: move,
      magnitude: Math.hypot(move.x, move.y),
    });
    actions.push({
      action: "aim",
      phase: "held",
      actorId,
      direction: move,
    });
    const jumpHeld = this.keys.redJump.isDown;
    if (jumpHeld && !this.redJumpWasHeld) {
      actions.push({ action: "jump", phase: "pressed", actorId });
    }
    if (jumpHeld) {
      actions.push({ action: "jump", phase: "held", actorId });
    }
    if (!jumpHeld && this.redJumpWasHeld) {
      actions.push({ action: "jump", phase: "released", actorId });
    }
  }

  private readTeamCommand(): void {
    const selected = this.keys.teamDefend.isDown && !this.teamDefendWasHeld
      ? "defend"
      : this.keys.teamFollow.isDown && !this.teamFollowWasHeld
      ? "follow"
      : this.keys.teamAttack.isDown && !this.teamAttackWasHeld
      ? "attack"
      : null;
    this.teamDefendWasHeld = this.keys.teamDefend.isDown;
    this.teamFollowWasHeld = this.keys.teamFollow.isDown;
    this.teamAttackWasHeld = this.keys.teamAttack.isDown;
    if (!selected || !this.onTeamCommand) return;
    this.onTeamCommand(selected);
  }

  private appendWeaponActions(
    actions: CoreActionIntent[],
    actorId: string | undefined,
    direction: WorldPosition,
  ): void {
    for (const [weaponId, held, wasHeld] of [
      ["rocket", this.keys.rocket.isDown, this.rocketWasHeld],
      ["rail", this.keys.rail.isDown, this.railWasHeld],
      ["whip", this.keys.whip.isDown, this.whipWasHeld],
    ] as const) {
      if (held && !wasHeld) {
        const action: CoreActionIntent = {
          action: "fireWeapon",
          phase: "pressed",
          actorId,
          ...(weaponId === "whip" ? {} : { direction }),
          payload: { weaponId },
        };
        actions.push(action);
      }
    }
  }

  private readRedMoveDirection(): WorldPosition {
    const x = Number(this.keys.redRight.isDown) -
      Number(this.keys.redLeft.isDown);
    const y = Number(this.keys.redDown.isDown) -
      Number(this.keys.redUp.isDown);
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private layout(gameSize: Phaser.Structs.Size): void {
    const positions = calculateDesktopWeaponLayout(
      gameSize.width,
      gameSize.height,
    );
    const compact = positions.rocket.r <= 25;
    for (const weaponId of ["rocket", "rail", "whip"] as const) {
      Object.assign(this.weaponControls[weaponId], positions[weaponId], {
        radius: positions[weaponId].r,
      });
      this.weaponViews[weaponId]
        .setPosition(positions[weaponId].x, positions[weaponId].y)
        .setScale(weaponIconScale(weaponId, positions[weaponId].r));
      this.weaponCooldownLabels[weaponId]
        .setPosition(positions[weaponId].x, positions[weaponId].y)
        .setFontSize(compact ? 14 : 16);
      this.weaponKeyLabels[weaponId]
        .setPosition(
          positions[weaponId].x - positions[weaponId].r * .68,
          positions[weaponId].y - positions[weaponId].r * .68,
        )
        .setFontSize(compact ? 11 : 12);
    }
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.cooldownGraphics.clear();
    if (["rocket", "rail", "whip"].some((weaponId) =>
      this.weaponAvailable(weaponId as WeaponId)
    )) {
      const first = this.weaponControls.rocket;
      const last = this.weaponControls.whip;
      const padding = first.radius <= 25 ? 6 : 7;
      const left = first.x - first.radius - padding;
      const top = first.y - first.radius - padding;
      const width = last.x - first.x + first.radius + last.radius + padding * 2;
      const height = first.radius * 2 + padding * 2;
      this.graphics.fillStyle(0x08131d, .52)
        .fillRoundedRect(left, top, width, height, 13);
      this.graphics.lineStyle(1, 0x8ea6b6, .22)
        .strokeRoundedRect(left, top, width, height, 13);
    }
    for (const weaponId of ["rocket", "rail", "whip"] as const) {
      const status = this.weaponStatus?.(weaponId) ?? {
        ammo: 0,
        cooldownMs: 0,
      };
      const available = status.ammo > 0;
      const control = this.weaponControls[weaponId];
      const compact = control.radius <= 25;
      const badgeOffset = control.radius * .72;
      const badge = this.weaponBadges[weaponId];
      const baseScale = weaponIconScale(weaponId, control.radius);
      this.weaponViews[weaponId]
        .setVisible(available)
        .setAlpha(1)
        .setScale(baseScale);
      badge.image
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setScale(compact ? .085 : .1)
        .setAlpha(.95)
        .setVisible(available);
      badge.text
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setFontSize(compact ? 10 : 12)
        .setText(String(status.ammo))
        .setVisible(available);
      this.weaponKeyLabels[weaponId].setVisible(available);
      this.weaponCooldownLabels[weaponId]
        .setText(formatCooldownSeconds(status.cooldownMs))
        .setVisible(available && status.cooldownMs > 0);
      if (available) {
        this.drawCooldown(weaponId, control, status.cooldownMs);
      }
    }
  }

  private drawCooldown(
    weaponId: WeaponId,
    control: DesktopWeaponControl,
    cooldownMs: number,
  ): void {
    if (cooldownMs <= 0) {
      return;
    }
    const total = weaponId === "rocket"
      ? V2_V1_WEAPON_PARITY_CONFIG.rocketCooldownMs
      : weaponId === "rail"
      ? V2_V1_WEAPON_PARITY_CONFIG.railCooldownMs
      : V2_V1_WEAPON_PARITY_CONFIG.whipCooldownMs;
    drawRadialCooldownWipe(
      this.cooldownGraphics,
      control.x,
      control.y,
      control.radius + 4,
      cooldownMs,
      total,
    );
  }

  private weaponAvailable(weaponId: WeaponId): boolean {
    return (this.weaponStatus?.(weaponId).ammo ?? 0) > 0;
  }

  private controlledActor(
    snapshot = this.snapshotProvider?.(),
  ): Readonly<ActorState> | undefined {
    return snapshot?.actors.find((actor) => actor.id === this.actorId);
  }

  private createWeaponBadge(
    texture: string,
    stroke: string,
  ): DesktopWeaponBadgeView {
    const image = this.scene.add.image(0, 0, texture)
      .setScrollFactor(0)
      .setDepth(1103)
      .setVisible(false);
    const text = this.scene.add.text(0, 0, "0", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "17px",
      color: "#ffffff",
      stroke,
      strokeThickness: 5,
    }).setOrigin(.5).setScrollFactor(0).setDepth(1104).setVisible(false);
    return { image, text };
  }

  private createCooldownLabel(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#101820",
      strokeThickness: 5,
    }).setOrigin(.5).setScrollFactor(0).setDepth(1104).setVisible(false);
  }

  private createKeyLabel(key: string): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, key, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#eaf7ff",
      backgroundColor: "#17232d",
      padding: { x: 4, y: 2 },
    }).setOrigin(.5).setScrollFactor(0).setDepth(1104).setVisible(false);
  }
}

function createDesktopWeaponControl(): DesktopWeaponControl {
  return {
    x: 0,
    y: 0,
    radius: 36,
  };
}
