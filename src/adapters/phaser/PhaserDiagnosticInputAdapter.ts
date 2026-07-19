import Phaser from "phaser";
import {
  ARENA_WEAPON_CATALOG,
  ARENA_WEAPON_IDS,
  V2_ACTOR_LIFECYCLE_CONFIG,
  type ArenaWeaponId,
} from "../../core";
import type {
  ActorState,
  ClassicCtfManualTeamCommand,
  CoreActionIntent,
  CoreInputFrame,
  WorldPosition,
  WorldSnapshot,
} from "../../core";
import { UI_FONT_FAMILY } from "../../uiTypography";
import type { InputAdapterPort } from "../input";
import { drawRadialCooldownWipe } from "./PhaserRadialCooldown";
import { resolveDesktopAimDirection } from "./desktopAim";
import {
  calculateWeaponStripLayout,
  formatCooldownSeconds,
  type WeaponStripLayout,
  weaponIconScale,
} from "./weaponHudLayout";
import { drawWeaponStrip } from "./hudVisualDesign";
import { ensureArenaWeaponTextures } from "./PhaserArenaWeaponTextures";

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
  readonly pulse: Phaser.Input.Keyboard.Key;
  readonly disc: Phaser.Input.Keyboard.Key;
  readonly grenade: Phaser.Input.Keyboard.Key;
  readonly shard: Phaser.Input.Keyboard.Key;
  readonly shift: Phaser.Input.Keyboard.Key;
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

type WeaponId = ArenaWeaponId;
const WEAPON_IDS = ARENA_WEAPON_IDS;

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
  readonly ammo: number | null;
  readonly cooldownMs: number;
}

export class PhaserDiagnosticInputAdapter implements InputAdapterPort {
  private readonly uiScene: Phaser.Scene;
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
  private pulseWasHeld = false;
  private discWasHeld = false;
  private grenadeWasHeld = false;
  private shardWasHeld = false;
  private teamDefendWasHeld = false;
  private teamFollowWasHeld = false;
  private teamAttackWasHeld = false;
  private readonly weaponControls: Record<WeaponId, DesktopWeaponControl> = {
    rocket: createDesktopWeaponControl(),
    rail: createDesktopWeaponControl(),
    whip: createDesktopWeaponControl(),
    pulse: createDesktopWeaponControl(),
    disc: createDesktopWeaponControl(),
    grenade: createDesktopWeaponControl(),
    shard: createDesktopWeaponControl(),
  };
  private weaponStripLayout: WeaponStripLayout =
    calculateWeaponStripLayout(1280, 720, WEAPON_IDS.length);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly profile: PhaserInputProfile = "diagnostic",
    private readonly weaponStatus?: (weaponId: WeaponId) => DesktopWeaponStatus,
    private readonly snapshotProvider?: () => WorldSnapshot,
    private readonly actorId = "blue-player",
    private readonly onTeamCommand?: (
      command: ClassicCtfManualTeamCommand,
    ) => void,
    uiScene: Phaser.Scene = scene,
  ) {
    this.uiScene = uiScene;
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
      pulse: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      disc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      grenade: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
      shard: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      shift: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
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
    this.graphics = uiScene.add.graphics().setDepth(1100);
    this.cooldownGraphics = uiScene.add.graphics()
      .setScrollFactor(0)
      .setDepth(1102);
    ensureArenaWeaponTextures(uiScene);
    this.weaponViews = {
      rocket: uiScene.add.image(0, 0, "uiRocketButton"),
      rail: uiScene.add.image(0, 0, "uiRailButton"),
      whip: uiScene.add.image(0, 0, "uiWhipButton"),
      pulse: uiScene.add.image(0, 0, "uiPulseButton"),
      disc: uiScene.add.image(0, 0, "uiDiscButton"),
      grenade: uiScene.add.image(0, 0, "uiGrenadeButton"),
      shard: uiScene.add.image(0, 0, "uiShardButton"),
    };
    for (const view of Object.values(this.weaponViews)) {
      view.setScrollFactor(0).setDepth(1101).setVisible(false);
    }
    this.weaponBadges = {
      rocket: this.createWeaponBadge("uiAmmoBadge", "#17211f"),
      rail: this.createWeaponBadge("uiRailBadge", "#10281a"),
      whip: this.createWeaponBadge("uiAmmoBadge", "#2b1c36"),
      pulse: this.createWeaponBadge("uiRailBadge", "#06283a"),
      disc: this.createWeaponBadge("uiAmmoBadge", "#332607"),
      grenade: this.createWeaponBadge("uiAmmoBadge", "#082b45"),
      shard: this.createWeaponBadge("uiRailBadge", "#28103a"),
    };
    this.weaponCooldownLabels = {
      rocket: this.createCooldownLabel(),
      rail: this.createCooldownLabel(),
      whip: this.createCooldownLabel(),
      pulse: this.createCooldownLabel(),
      disc: this.createCooldownLabel(),
      grenade: this.createCooldownLabel(),
      shard: this.createCooldownLabel(),
    };
    this.weaponKeyLabels = {
      rocket: this.createKeyLabel("Q"),
      rail: this.createKeyLabel("E"),
      whip: this.createKeyLabel("F"),
      pulse: this.createKeyLabel("R"),
      disc: this.createKeyLabel("C"),
      grenade: this.createKeyLabel("G"),
      shard: this.createKeyLabel("X"),
    };
    uiScene.scale.on("resize", this.layout, this);
    this.layout(uiScene.scale.gameSize);
  }

  readFrame(deltaMs: number): CoreInputFrame {
    const actions: CoreActionIntent[] = [];
    const move = this.readMoveDirection();
    const aimTarget = this.readAimTarget();
    const aim = this.readAimDirection(aimTarget);
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
    this.appendWeaponActions(actions, blueActorId, aim, aimTarget);
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
    const restartHeld = this.keys.restartMatch.isDown && this.keys.shift.isDown;
    if (restartHeld && !this.restartWasHeld) {
      actions.push({ action: "restartMatch", phase: "pressed" });
    }
    if (this.profile === "tdm") {
      this.appendRedPlayerActions(actions);
    }

    this.jumpWasHeld = jumpHeld;
    this.damageWasHeld = this.keys.debugDamage.isDown;
    this.scoreWasHeld = this.keys.debugScore.isDown;
    this.restartWasHeld = restartHeld;
    this.redJumpWasHeld = this.keys.redJump.isDown;
    this.rocketWasHeld = this.keys.rocket.isDown;
    this.railWasHeld = this.keys.rail.isDown;
    this.whipWasHeld = this.keys.whip.isDown;
    this.pulseWasHeld = this.keys.pulse.isDown;
    this.discWasHeld = this.keys.disc.isDown;
    this.grenadeWasHeld = this.keys.grenade.isDown;
    this.shardWasHeld = this.keys.shard.isDown;
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
    this.pulseWasHeld = false;
    this.discWasHeld = false;
    this.grenadeWasHeld = false;
    this.shardWasHeld = false;
    this.teamDefendWasHeld = false;
    this.teamFollowWasHeld = false;
    this.teamAttackWasHeld = false;
    this.draw();
  }

  dispose(): void {
    this.uiScene.scale.off("resize", this.layout, this);
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

  private readAimTarget(): WorldPosition {
    const pointer = this.scene.input.activePointer;
    const camera = this.scene.cameras.main;
    return camera.getWorldPoint(pointer.x, pointer.y);
  }

  private readAimDirection(pointerWorld = this.readAimTarget()): WorldPosition {
    const camera = this.scene.cameras.main;
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
    targetPosition: WorldPosition,
  ): void {
    for (const [weaponId, held, wasHeld] of [
      ["rocket", this.keys.rocket.isDown, this.rocketWasHeld],
      ["rail", this.keys.rail.isDown, this.railWasHeld],
      ["whip", this.keys.whip.isDown, this.whipWasHeld],
      [
        "pulse",
        this.keys.pulse.isDown && !this.keys.shift.isDown,
        this.pulseWasHeld,
      ],
      ["disc", this.keys.disc.isDown, this.discWasHeld],
      ["grenade", this.keys.grenade.isDown, this.grenadeWasHeld],
      ["shard", this.keys.shard.isDown, this.shardWasHeld],
    ] as const) {
      const automatic = weaponId === "pulse" || weaponId === "shard";
      if (held && (automatic || !wasHeld)) {
        const action: CoreActionIntent = {
          action: "fireWeapon",
          phase: "pressed",
          actorId,
          ...(weaponId === "whip" ? {} : { direction }),
          payload: { weaponId, targetPosition },
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
    const activeWeaponIds = this.activeWeaponIds();
    this.weaponStripLayout = calculateWeaponStripLayout(
      gameSize.width,
      gameSize.height,
      activeWeaponIds.length,
    );
    const first = this.weaponStripLayout.slots[0]!;
    const micro = first.r <= 18;
    const compact = first.r <= 25;
    for (const [index, weaponId] of activeWeaponIds.entries()) {
      const position = this.weaponStripLayout.slots[index]!;
      Object.assign(this.weaponControls[weaponId], position, {
        radius: position.r,
      });
      this.weaponViews[weaponId]
        .setPosition(position.x, position.y)
        .setScale(weaponIconScale(weaponId, position.r));
      this.weaponCooldownLabels[weaponId]
        .setPosition(position.x, position.y)
        .setFontSize(micro ? 11 : compact ? 14 : 16);
      this.weaponKeyLabels[weaponId]
        .setPosition(
          position.x - position.r * .68,
          position.y - position.r * .68,
        )
        .setFontSize(micro ? 8 : compact ? 11 : 12);
    }
    this.draw();
  }

  private draw(): void {
    const activeWeaponIds = this.activeWeaponIds();
    const active = new Set(activeWeaponIds);
    this.graphics.clear();
    this.cooldownGraphics.clear();
    drawWeaponStrip(this.graphics, {
      ...this.weaponStripLayout,
      slots: activeWeaponIds.map((weaponId) => {
        const control = this.weaponControls[weaponId];
        return {
          x: control.x,
          y: control.y,
          radius: control.radius,
          available: this.weaponAvailable(weaponId),
        };
      }),
    });
    for (const weaponId of WEAPON_IDS) {
      if (!active.has(weaponId)) {
        this.weaponViews[weaponId].setVisible(false);
        this.weaponBadges[weaponId].image.setVisible(false);
        this.weaponBadges[weaponId].text.setVisible(false);
        this.weaponKeyLabels[weaponId].setVisible(false);
        this.weaponCooldownLabels[weaponId].setVisible(false);
        continue;
      }
      const status = this.weaponStatus?.(weaponId) ?? {
        ammo: weaponId === "whip" ? null : 0,
        cooldownMs: 0,
      };
      const usesAmmo = status.ammo !== null;
      const available = !usesAmmo || status.ammo > 0;
      const control = this.weaponControls[weaponId];
      const micro = control.radius <= 18;
      const compact = control.radius <= 25;
      const badgeOffset = control.radius * .72;
      const badge = this.weaponBadges[weaponId];
      const baseScale = weaponIconScale(weaponId, control.radius);
      this.weaponViews[weaponId]
        .setVisible(true)
        .setAlpha(available ? 1 : .34)
        .setScale(baseScale);
      badge.image
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setScale(micro ? .065 : compact ? .085 : .1)
        .setAlpha(.95)
        .setVisible(usesAmmo);
      badge.text
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setFontSize(micro ? 8 : compact ? 10 : 12)
        .setText(String(status.ammo ?? ""))
        .setVisible(usesAmmo);
      this.weaponKeyLabels[weaponId].setVisible(true);
      this.weaponCooldownLabels[weaponId]
        .setText(formatCooldownSeconds(status.cooldownMs))
        .setVisible(status.cooldownMs > 0);
      if (status.cooldownMs > 0) {
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
    const total = ARENA_WEAPON_CATALOG[weaponId].cooldownMs;
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
    const ammo = this.weaponStatus?.(weaponId).ammo;
    return weaponId === "whip" || (ammo ?? 0) > 0;
  }

  private activeWeaponIds(): readonly WeaponId[] {
    return this.snapshotProvider?.().map?.weaponRoster ??
      ["whip", "rocket", "rail"];
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
    const image = this.uiScene.add.image(0, 0, texture)
      .setScrollFactor(0)
      .setDepth(1103)
      .setVisible(false);
    const text = this.uiScene.add.text(0, 0, "0", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "17px",
      color: "#ffffff",
      stroke,
      strokeThickness: 5,
    }).setOrigin(.5).setScrollFactor(0).setDepth(1104).setVisible(false);
    return { image, text };
  }

  private createCooldownLabel(): Phaser.GameObjects.Text {
    return this.uiScene.add.text(0, 0, "", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "14px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#101820",
      strokeThickness: 5,
    }).setOrigin(.5).setScrollFactor(0).setDepth(1104).setVisible(false);
  }

  private createKeyLabel(key: string): Phaser.GameObjects.Text {
    return this.uiScene.add.text(0, 0, key, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "11px",
      fontStyle: "bold",
      color: "#eaf7ff",
      backgroundColor: "#0b1824",
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
