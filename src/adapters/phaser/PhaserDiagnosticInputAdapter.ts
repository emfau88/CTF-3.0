import Phaser from "phaser";
import { V2_ACTOR_LIFECYCLE_CONFIG } from "../../core";
import type {
  ActorState,
  CoreActionIntent,
  CoreInputFrame,
  WorldPosition,
  WorldSnapshot,
} from "../../core";
import {
  V2_V1_WEAPON_PARITY_CONFIG,
} from "../../core";
import type { InputAdapterPort } from "../input";
import { calculateV2TouchLayout } from "./v2TouchLayout";
import {
  resolveMobileWeaponReleaseDirection,
  resolveMobileWeaponTapDirection,
} from "./PhaserMobileInputAdapter";

interface DiagnosticKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly jump: Phaser.Input.Keyboard.Key;
  readonly firePrimary: Phaser.Input.Keyboard.Key;
  readonly fireSpecial: Phaser.Input.Keyboard.Key;
  readonly rocket: Phaser.Input.Keyboard.Key;
  readonly rail: Phaser.Input.Keyboard.Key;
  readonly whip: Phaser.Input.Keyboard.Key;
  readonly debugDamage: Phaser.Input.Keyboard.Key;
  readonly debugScore: Phaser.Input.Keyboard.Key;
  readonly restartMatch: Phaser.Input.Keyboard.Key;
  readonly redUp: Phaser.Input.Keyboard.Key;
  readonly redDown: Phaser.Input.Keyboard.Key;
  readonly redLeft: Phaser.Input.Keyboard.Key;
  readonly redRight: Phaser.Input.Keyboard.Key;
  readonly redJump: Phaser.Input.Keyboard.Key;
  readonly redFire: Phaser.Input.Keyboard.Key;
}

export type PhaserInputProfile = "diagnostic" | "tdm" | "tdm-solo";

type WeaponId = "rocket" | "rail" | "whip";

interface DesktopWeaponControl {
  id: number;
  x: number;
  y: number;
  radius: number;
  aim: WorldPosition;
  drag: number;
  dragged: boolean;
  held: boolean;
}

interface DesktopWeaponBadgeView {
  readonly image: Phaser.GameObjects.Image;
  readonly text: Phaser.GameObjects.Text;
}

export interface DesktopWeaponStatus {
  readonly ammo: number;
  readonly cooldownMs: number;
}

const DESKTOP_WEAPON_DRAG_THRESHOLD = 18;

export class PhaserDiagnosticInputAdapter implements InputAdapterPort {
  private readonly keys: DiagnosticKeys;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly aimGraphics: Phaser.GameObjects.Graphics;
  private readonly weaponViews: Record<WeaponId, Phaser.GameObjects.Image>;
  private readonly weaponBadges: Record<WeaponId, DesktopWeaponBadgeView>;
  private sequence = 0;
  private jumpWasHeld = false;
  private damageWasHeld = false;
  private scoreWasHeld = false;
  private restartWasHeld = false;
  private redJumpWasHeld = false;
  private rocketWasHeld = false;
  private railWasHeld = false;
  private whipWasHeld = false;
  private queuedWeapon: {
    weaponId: WeaponId;
    direction: WorldPosition;
  } | null = null;
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
      firePrimary: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      fireSpecial: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      rocket: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      rail: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      whip: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      debugDamage: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      debugScore: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      restartMatch: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      redUp: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      redDown: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      redLeft: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      redRight: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      redJump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      redFire: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1100);
    this.aimGraphics = scene.add.graphics().setDepth(1099);
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
    scene.input.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
    scene.scale.on("resize", this.layout, this);
    this.layout(scene.scale.gameSize);
  }

  readFrame(deltaMs: number): CoreInputFrame {
    const actions: CoreActionIntent[] = [];
    const move = this.readMoveDirection();
    const aim = this.readAimDirection();
    const jumpHeld = this.keys.jump.isDown;
    const pointer = this.scene.input.activePointer;
    const firePrimary = this.keys.firePrimary.isDown ||
      (pointer.isDown && !this.isPointerCapturedByWeapon(pointer.id));
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
    if (firePrimary) {
      actions.push({
        action: "firePrimary",
        phase: "held",
        actorId: blueActorId,
      });
    }
    if (this.profile === "diagnostic" && fireSpecial) {
      actions.push({ action: "fireSpecial", phase: "held" });
    }
    this.appendWeaponActions(actions, blueActorId, aim);
    this.appendQueuedWeaponAction(actions, blueActorId);
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
    this.queuedWeapon = null;
    for (const control of Object.values(this.weaponControls)) {
      this.releaseWeaponControl(control);
    }
    this.draw();
  }

  dispose(): void {
    this.scene.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.scene.input.off("pointerupoutside", this.handlePointerUp, this);
    this.scene.scale.off("resize", this.layout, this);
    for (const key of Object.values(this.keys)) {
      key.destroy();
    }
    this.graphics.destroy();
    this.aimGraphics.destroy();
    for (const view of Object.values(this.weaponViews)) {
      view.destroy();
    }
    for (const badge of Object.values(this.weaponBadges)) {
      badge.image.destroy();
      badge.text.destroy();
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
    const x = pointer.x - this.scene.scale.width / 2;
    const y = pointer.y - this.scene.scale.height / 2;
    const length = Math.hypot(x, y);

    return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
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
    if (this.keys.redFire.isDown) {
      actions.push({ action: "firePrimary", phase: "held", actorId });
    }
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
        actions.push({
          action: "fireWeapon",
          phase: "pressed",
          actorId,
          direction,
          payload: { weaponId },
        });
      }
    }
  }

  private appendQueuedWeaponAction(
    actions: CoreActionIntent[],
    actorId: string | undefined,
  ): void {
    if (!this.queuedWeapon) {
      return;
    }
    actions.push({
      action: "fireWeapon",
      phase: "pressed",
      actorId,
      direction: { ...this.queuedWeapon.direction },
      payload: { weaponId: this.queuedWeapon.weaponId },
    });
    this.queuedWeapon = null;
  }

  private readRedMoveDirection(): WorldPosition {
    const x = Number(this.keys.redRight.isDown) -
      Number(this.keys.redLeft.isDown);
    const y = Number(this.keys.redDown.isDown) -
      Number(this.keys.redUp.isDown);
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private readonly handlePointerDown = (
    pointer: Phaser.Input.Pointer,
  ): void => {
    const weapon = this.weaponAt(pointer);
    if (!weapon) {
      return;
    }
    const control = this.weaponControls[weapon];
    if (control.id >= 0) {
      return;
    }
    this.captureWeaponControl(control, pointer);
    control.drag = 0;
    control.dragged = false;
    this.updateWeaponAim(weapon, pointer);
    this.draw();
  };

  private readonly handlePointerMove = (
    pointer: Phaser.Input.Pointer,
  ): void => {
    const weapon = this.capturedWeapon(pointer.id);
    if (!weapon) {
      return;
    }
    this.updateWeaponAim(weapon, pointer);
    this.draw();
  };

  private readonly handlePointerUp = (
    pointer: Phaser.Input.Pointer,
  ): void => {
    const weapon = this.capturedWeapon(pointer.id);
    if (!weapon) {
      return;
    }
    const control = this.weaponControls[weapon];
    const direction = resolveMobileWeaponReleaseDirection({
      dragged: control.dragged,
      dragDistance: control.drag,
      manualDirection: control.aim,
      autoDirection: this.autoTargetDirection(weapon),
    });
    if (direction) {
      this.queuedWeapon = {
        weaponId: weapon,
        direction,
      };
    }
    this.releaseWeaponControl(control);
    control.drag = 0;
    control.dragged = false;
    this.draw();
  };

  private layout(gameSize: Phaser.Structs.Size): void {
    const layout = calculateV2TouchLayout(gameSize.width, gameSize.height);
    const compact = layout.rocket.r <= 36;
    const positions = {
      rocket: layout.rocket,
      rail: layout.rail,
      whip: layout.whip,
    };
    for (const weaponId of ["rocket", "rail", "whip"] as const) {
      Object.assign(this.weaponControls[weaponId], positions[weaponId], {
        radius: positions[weaponId].r,
      });
      this.weaponViews[weaponId]
        .setPosition(positions[weaponId].x, positions[weaponId].y)
        .setScale(weaponId === "whip"
          ? compact ? .42 : .54
          : compact ? .27 : .38);
    }
    this.draw();
  }

  private updateWeaponAim(
    weaponId: WeaponId,
    pointer: Phaser.Input.Pointer,
  ): void {
    const control = this.weaponControls[weaponId];
    const dx = pointer.x - control.x;
    const dy = pointer.y - control.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) {
      control.aim = { x: dx / distance, y: dy / distance };
    }
    control.drag = distance;
    if (distance >= DESKTOP_WEAPON_DRAG_THRESHOLD) {
      control.dragged = true;
    }
  }

  private captureWeaponControl(
    control: DesktopWeaponControl,
    pointer: Phaser.Input.Pointer,
  ): void {
    control.id = pointer.id;
    control.held = true;
  }

  private releaseWeaponControl(control: DesktopWeaponControl): void {
    control.id = -1;
    control.held = false;
  }

  private draw(): void {
    this.graphics.clear();
    this.aimGraphics.clear();
    for (const weaponId of ["rocket", "rail", "whip"] as const) {
      const status = this.weaponStatus?.(weaponId) ?? {
        ammo: 0,
        cooldownMs: 0,
      };
      const available = status.ammo > 0;
      const control = this.weaponControls[weaponId];
      const compact = control.radius <= 36;
      const badgeOffset = compact ? 21 : 27;
      const badge = this.weaponBadges[weaponId];
      const active = control.held && status.cooldownMs <= 0;
      const baseScale = weaponId === "whip"
        ? compact ? .42 : .54
        : compact ? .27 : .38;
      this.weaponViews[weaponId]
        .setVisible(available)
        .setAlpha(status.cooldownMs > 0
          ? weaponId === "rail" ? .62 : .58
          : 1)
        .setScale(
          active && weaponId !== "whip" ? baseScale + .025 : baseScale,
        );
      badge.image
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setScale(compact ? .1 : .14)
        .setAlpha(.95)
        .setVisible(available);
      badge.text
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setFontSize(compact ? 12 : 15)
        .setText(String(status.ammo))
        .setVisible(available);
      if (available) {
        this.drawCooldown(weaponId, control, status.cooldownMs);
      }
      if (
        available &&
        control.held &&
        control.dragged &&
        weaponId !== "whip"
      ) {
        this.drawWeaponAim(weaponId, control, status.cooldownMs);
      }
    }
  }

  private drawWeaponAim(
    weaponId: "rocket" | "rail",
    control: DesktopWeaponControl,
    cooldownMs: number,
  ): void {
    const ready = cooldownMs <= 0;
    const buttonLength = Math.min(68, Math.max(28, control.drag));
    const color = weaponId === "rocket" ? 0xffd36c : 0x62ff91;
    const lightColor = weaponId === "rocket" ? 0xfff0b2 : 0xcaffd9;
    const alpha = ready ? .8 : .3;
    this.graphics.lineStyle(5, lightColor, ready ? .92 : .38)
      .beginPath()
      .moveTo(control.x, control.y)
      .lineTo(
        control.x + control.aim.x * buttonLength,
        control.y + control.aim.y * buttonLength,
      )
      .strokePath();

    const actor = this.controlledActor();
    if (!actor || actor.lifeState !== "active") return;
    const length = weaponId === "rocket" ? 260 : 310;
    const startX = actor.position.x;
    const startY = actor.position.y - actor.jump.height;
    const endX = startX + control.aim.x * length;
    const endY = startY + control.aim.y * length;
    this.aimGraphics.lineStyle(weaponId === "rocket" ? 4 : 3, color, alpha)
      .beginPath()
      .moveTo(startX, startY)
      .lineTo(endX, endY)
      .strokePath();
    this.aimGraphics.fillStyle(lightColor, ready ? .86 : .35)
      .fillCircle(endX, endY, weaponId === "rocket" ? 7 : 6);
  }

  private drawCooldown(
    weaponId: WeaponId,
    control: DesktopWeaponControl,
    cooldownMs: number,
  ): void {
    if (cooldownMs <= 0 || weaponId === "rocket") {
      return;
    }
    const total = weaponId === "rail"
      ? V2_V1_WEAPON_PARITY_CONFIG.railCooldownMs
      : V2_V1_WEAPON_PARITY_CONFIG.whipCooldownMs;
    const ratio = Phaser.Math.Clamp(cooldownMs / total, 0, 1);
    this.graphics.lineStyle(
      5,
      weaponId === "rail" ? 0x62ff91 : 0xf4b35d,
      .72,
    ).beginPath()
      .arc(
        control.x,
        control.y,
        control.radius + 5,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - ratio),
      )
      .strokePath();
  }

  private weaponAt(pointer: Phaser.Input.Pointer): WeaponId | null {
    return (["rocket", "rail", "whip"] as const).find((weaponId) =>
      this.weaponAvailable(weaponId) &&
      Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          this.weaponControls[weaponId].x,
          this.weaponControls[weaponId].y,
        ) <= this.weaponControls[weaponId].radius +
          (weaponId === "rocket" ? 24 : 20)
    ) ?? null;
  }

  private capturedWeapon(pointerId: number): WeaponId | null {
    return (["rocket", "rail", "whip"] as const).find((weaponId) =>
      this.weaponControls[weaponId].id === pointerId
    ) ?? null;
  }

  private isPointerCapturedByWeapon(pointerId: number): boolean {
    return this.capturedWeapon(pointerId) !== null;
  }

  private weaponAvailable(weaponId: WeaponId): boolean {
    return (this.weaponStatus?.(weaponId).ammo ?? 0) > 0;
  }

  private autoTargetDirection(weaponId: WeaponId): WorldPosition | null {
    const snapshot = this.snapshotProvider?.();
    if (!snapshot) {
      return null;
    }
    return resolveMobileWeaponTapDirection(snapshot, this.actorId, weaponId);
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
      .setDepth(1102)
      .setVisible(false);
    const text = this.scene.add.text(0, 0, "0", {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#ffffff",
      stroke,
      strokeThickness: 5,
    }).setOrigin(.5).setScrollFactor(0).setDepth(1103).setVisible(false);
    return { image, text };
  }
}

function createDesktopWeaponControl(): DesktopWeaponControl {
  return {
    id: -1,
    x: 0,
    y: 0,
    radius: 36,
    aim: { x: 1, y: 0 },
    drag: 0,
    dragged: false,
    held: false,
  };
}
