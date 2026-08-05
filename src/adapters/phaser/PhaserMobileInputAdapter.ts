import Phaser from "phaser";
import type {
  ActorState,
  ArenaWeaponId,
  CoreActionIntent,
  CoreInputFrame,
  WorldPosition,
  WorldSnapshot,
} from "../../core";
import {
  ARENA_WEAPON_CATALOG,
  ARENA_WEAPON_IDS,
  DEFAULT_ARENA_WEAPON_ROSTER,
  V2_BASIC_AUTOSHOOT_PARITY_CONFIG,
} from "../../core";
import { UI_FONT_FAMILY } from "../../uiTypography";
import type { InputAdapterPort } from "../input";
import { drawRadialCooldownWipe } from "./PhaserRadialCooldown";
import { calculateV2TouchLayout } from "./v2TouchLayout";
import {
  formatCooldownSeconds,
  weaponIconScale,
} from "./weaponHudLayout";
import { worldLineIntersectsRect } from "./worldLineOfSight";
import { ensureArenaWeaponTextures } from "./PhaserArenaWeaponTextures";

interface TouchControl {
  id: number;
  x: number;
  y: number;
  radius: number;
  held: boolean;
  pressed: boolean;
  released: boolean;
}

interface TouchStick extends TouchControl {
  originX: number;
  originY: number;
  direction: WorldPosition;
  magnitude: number;
}

const PLAYER_JUMP_INPUT_ENABLED = true;
const MOBILE_WEAPON_DRAG_THRESHOLD = 18;

interface KeyboardFallbackKeys {
  readonly up: Phaser.Input.Keyboard.Key;
  readonly down: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly jump: Phaser.Input.Keyboard.Key;
  readonly rocket: Phaser.Input.Keyboard.Key;
  readonly rail: Phaser.Input.Keyboard.Key;
  readonly whip: Phaser.Input.Keyboard.Key;
  readonly pulse: Phaser.Input.Keyboard.Key;
  readonly disc: Phaser.Input.Keyboard.Key;
  readonly grenade: Phaser.Input.Keyboard.Key;
  readonly shard: Phaser.Input.Keyboard.Key;
}

type WeaponId = ArenaWeaponId;
const WEAPON_IDS = ARENA_WEAPON_IDS;
interface WeaponControl extends TouchControl {
  aim: WorldPosition;
  drag: number;
  dragged: boolean;
}

interface WeaponBadgeView {
  readonly image: Phaser.GameObjects.Image;
  readonly text: Phaser.GameObjects.Text;
}

export interface MobileWeaponStatus {
  readonly ammo: number | null;
  readonly cooldownMs: number;
}

export class PhaserMobileInputAdapter implements InputAdapterPort {
  private readonly uiScene: Phaser.Scene;
  private sequence = 0;
  private restartRequested = false;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly aimGraphics: Phaser.GameObjects.Graphics;
  private readonly cooldownGraphics: Phaser.GameObjects.Graphics;
  private readonly fireLabel: Phaser.GameObjects.Text;
  private readonly jumpLabel: Phaser.GameObjects.Text;
  private readonly weaponViews: Record<WeaponId, Phaser.GameObjects.Image>;
  private readonly weaponBadges: Record<WeaponId, WeaponBadgeView>;
  private readonly weaponCooldownLabels: Record<
    WeaponId,
    Phaser.GameObjects.Text
  >;
  private readonly moveStick: TouchStick = {
    id: -1,
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
    radius: 58,
    direction: { x: 0, y: 0 },
    magnitude: 0,
    held: false,
    pressed: false,
    released: false,
  };
  private readonly fire: TouchControl = {
    id: -1,
    x: 0,
    y: 0,
    radius: 46,
    held: false,
    pressed: false,
    released: false,
  };
  private readonly jump: TouchControl = {
    id: -1,
    x: 0,
    y: 0,
    radius: 46,
    held: false,
    pressed: false,
    released: false,
  };
  private aim: WorldPosition = { x: 1, y: 0 };
  private readonly keyboardKeys?: KeyboardFallbackKeys;
  private combinedJumpWasHeld = false;
  private queuedWeapon: {
    weaponId: WeaponId;
    direction: WorldPosition;
  } | null = null;
  private readonly weaponControls: Record<WeaponId, WeaponControl> = {
    rocket: createWeaponControl(36),
    rail: createWeaponControl(36),
    whip: createWeaponControl(36),
    pulse: createWeaponControl(36),
    disc: createWeaponControl(36),
    grenade: createWeaponControl(36),
    shard: createWeaponControl(36),
  };
  private weaponKeyWasHeld: Record<WeaponId, boolean> = {
    rocket: false,
    rail: false,
    whip: false,
    pulse: false,
    disc: false,
    grenade: false,
    shard: false,
  };
  private lastDrawSignature = "";

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly actorId = "blue-player",
    private readonly manualFireEnabled = false,
    private readonly weaponStatus?: (weaponId: WeaponId) => MobileWeaponStatus,
    private readonly snapshotProvider?: () => WorldSnapshot,
    uiScene: Phaser.Scene = scene,
  ) {
    this.uiScene = uiScene;
    scene.input.addPointer(2);
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.keyboardKeys = {
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        rocket: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
        rail: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        whip: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
        pulse: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
        disc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
        grenade: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
        shard: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      };
    }
    this.graphics = uiScene.add.graphics().setDepth(1100);
    this.aimGraphics = scene.add.graphics().setDepth(1099);
    this.cooldownGraphics = uiScene.add.graphics()
      .setScrollFactor(0)
      .setDepth(1102);
    ensureArenaWeaponTextures(uiScene);
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#17302d",
      align: "center",
    };
    this.fireLabel = uiScene.add.text(0, 0, "FIRE", labelStyle)
      .setOrigin(.5).setScrollFactor(0).setDepth(1103);
    this.jumpLabel = uiScene.add.text(0, 0, "JUMP", labelStyle)
      .setOrigin(.5).setScrollFactor(0).setDepth(1103).setVisible(false);
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
      view.setScrollFactor(0).setDepth(1101);
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

    scene.input.on("pointerdown", this.handlePointerDown, this);
    scene.input.on("pointermove", this.handlePointerMove, this);
    scene.input.on("pointerup", this.handlePointerUp, this);
    scene.input.on("pointerupoutside", this.handlePointerUp, this);
    uiScene.scale.on("resize", this.layout, this);
    this.layout(uiScene.scale.gameSize);
  }

  readFrame(deltaMs: number): CoreInputFrame {
    const keyboardMove = this.readKeyboardMove();
    const moveDirection = this.moveStick.magnitude > .05
      ? { ...this.moveStick.direction }
      : keyboardMove;
    const moveMagnitude = this.moveStick.magnitude > .05
      ? this.moveStick.magnitude
      : Math.hypot(keyboardMove.x, keyboardMove.y);
    if (
      this.moveStick.magnitude <= .05 &&
      (keyboardMove.x !== 0 || keyboardMove.y !== 0)
    ) {
      this.aim = { ...keyboardMove };
    }
    const actions: CoreActionIntent[] = [{
      action: "move",
      phase: "held",
      actorId: this.actorId,
      direction: moveDirection,
      magnitude: moveMagnitude,
    }, {
      action: "aim",
      phase: "held",
      actorId: this.actorId,
      direction: { ...this.aim },
    }];

    if (PLAYER_JUMP_INPUT_ENABLED) {
      this.appendJumpActions(actions);
    } else {
      this.combinedJumpWasHeld = false;
    }
    this.appendWeaponActions(actions);
    if (this.restartRequested) {
      actions.push({ action: "restartMatch", phase: "pressed" });
      this.restartRequested = false;
    }
    if (this.manualFireEnabled && this.fire.held) {
      actions.push({
        action: "firePrimary",
        phase: "held",
        actorId: this.actorId,
      });
    }

    this.jump.pressed = false;
    this.jump.released = false;
    this.fire.pressed = false;
    this.fire.released = false;
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
    this.restartRequested = false;
    this.releaseControl(this.moveStick);
    this.releaseControl(this.fire);
    this.releaseControl(this.jump);
    for (const control of Object.values(this.weaponControls)) {
      this.releaseControl(control);
    }
    this.combinedJumpWasHeld = false;
    this.queuedWeapon = null;
    this.weaponKeyWasHeld = {
      rocket: false,
      rail: false,
      whip: false,
      pulse: false,
      disc: false,
      grenade: false,
      shard: false,
    };
    this.lastDrawSignature = "";
    this.draw();
  }

  dispose(): void {
    this.scene.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.scene.input.off("pointerupoutside", this.handlePointerUp, this);
    this.uiScene.scale.off("resize", this.layout, this);
    this.graphics.destroy();
    this.aimGraphics.destroy();
    this.cooldownGraphics.destroy();
    this.fireLabel.destroy();
    this.jumpLabel.destroy();
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
    for (const key of Object.values(this.keyboardKeys ?? {})) {
      key.destroy();
    }
  }

  requestRestart(): void {
    this.restartRequested = true;
  }

  private appendJumpActions(actions: CoreActionIntent[]): void {
    const jumpHeld = this.jump.held || Boolean(this.keyboardKeys?.jump.isDown);
    if (jumpHeld && !this.combinedJumpWasHeld) {
      actions.push({
        action: "jump",
        phase: "pressed",
        actorId: this.actorId,
      });
    }
    if (jumpHeld) {
      actions.push({
        action: "jump",
        phase: "held",
        actorId: this.actorId,
      });
    }
    if (!jumpHeld && this.combinedJumpWasHeld) {
      actions.push({
        action: "jump",
        phase: "released",
        actorId: this.actorId,
      });
    }
    this.combinedJumpWasHeld = jumpHeld;
  }

  private appendWeaponActions(actions: CoreActionIntent[]): void {
    for (const weaponId of this.activeWeaponIds()) {
      const held = Boolean(this.keyboardKeys?.[weaponId].isDown);
      const queued = this.queuedWeapon?.weaponId === weaponId
        ? this.queuedWeapon
        : null;
      if (queued || (held && !this.weaponKeyWasHeld[weaponId])) {
        actions.push({
          action: "fireWeapon",
          phase: "pressed",
          actorId: this.actorId,
          direction: queued?.direction ?? { ...this.aim },
          payload: { weaponId },
        });
      }
      this.weaponKeyWasHeld[weaponId] = held;
    }
    this.queuedWeapon = null;
  }

  private readKeyboardMove(): WorldPosition {
    if (!this.keyboardKeys) {
      return { x: 0, y: 0 };
    }
    const x = Number(this.keyboardKeys.right.isDown) -
      Number(this.keyboardKeys.left.isDown);
    const y = Number(this.keyboardKeys.down.isDown) -
      Number(this.keyboardKeys.up.isDown);
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const weapon = this.weaponAt(pointer);
    if (weapon === "whip") {
      this.queueAutoTargetedWeapon(weapon);
    } else if (weapon && this.weaponControls[weapon].id < 0) {
      const control = this.weaponControls[weapon];
      this.captureControl(control, pointer);
      control.drag = 0;
      control.dragged = false;
      this.updateWeaponAim(weapon, pointer);
    } else if (
      PLAYER_JUMP_INPUT_ENABLED &&
      inside(pointer, this.jump, 10) &&
      this.jump.id < 0
    ) {
      this.captureControl(this.jump, pointer);
    } else if (
      this.manualFireEnabled &&
      inside(pointer, this.fire) &&
      this.fire.id < 0
    ) {
      this.captureControl(this.fire, pointer);
      this.updateAim(pointer);
    } else if (
      pointer.x < this.scene.scale.width * .56 &&
      this.moveStick.id < 0
    ) {
      this.captureControl(this.moveStick, pointer);
      this.moveStick.originX = pointer.x;
      this.moveStick.originY = pointer.y;
      this.updateStick(pointer);
    }
    this.draw();
  };

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.moveStick.id) {
      this.updateStick(pointer);
    } else if (pointer.id === this.fire.id) {
      this.updateAim(pointer);
    } else {
      const weapon = this.capturedWeapon(pointer.id);
      if (weapon) {
        this.updateWeaponAim(weapon, pointer);
      }
    }
    this.draw();
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id === this.moveStick.id) {
      this.releaseControl(this.moveStick);
      this.moveStick.direction = { x: 0, y: 0 };
      this.moveStick.magnitude = 0;
      this.moveStick.originX = this.moveStick.x;
      this.moveStick.originY = this.moveStick.y;
    }
    if (pointer.id === this.fire.id) {
      this.releaseControl(this.fire);
    }
    if (pointer.id === this.jump.id) {
      this.releaseControl(this.jump);
    }
    const weapon = this.capturedWeapon(pointer.id);
    if (weapon) {
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
      this.releaseControl(control);
      control.drag = 0;
      control.dragged = false;
    }
    this.draw();
  };

  private layout(gameSize: Phaser.Structs.Size): void {
    const activeWeaponIds = this.activeWeaponIds();
    const layout = calculateV2TouchLayout(
      gameSize.width,
      gameSize.height,
      activeWeaponIds.length,
    );
    const compact = layout.compact;
    this.moveStick.radius = layout.joy.r;
    this.moveStick.x = layout.joy.ox;
    this.moveStick.y = layout.joy.oy;
    if (!this.moveStick.held) {
      this.moveStick.originX = this.moveStick.x;
      this.moveStick.originY = this.moveStick.y;
    }
    this.jump.radius = layout.jump.r;
    this.jump.x = layout.jump.x;
    this.jump.y = layout.jump.y;
    this.fire.radius = layout.fire.r;
    this.fire.x = layout.fire.x;
    this.fire.y = layout.fire.y;
    this.fireLabel.setPosition(this.fire.x, this.fire.y)
      .setVisible(this.manualFireEnabled);
    this.jumpLabel.setPosition(this.jump.x, this.jump.y)
      .setVisible(PLAYER_JUMP_INPUT_ENABLED);
    const active = new Set(activeWeaponIds);
    for (const weaponId of WEAPON_IDS) {
      const position = layout.weapons[activeWeaponIds.indexOf(weaponId)];
      if (!active.has(weaponId) || !position) {
        this.weaponViews[weaponId].setVisible(false);
        this.weaponBadges[weaponId].image.setVisible(false);
        this.weaponBadges[weaponId].text.setVisible(false);
        this.weaponCooldownLabels[weaponId].setVisible(false);
        continue;
      }
      Object.assign(this.weaponControls[weaponId], position, {
        radius: position.r,
      });
      this.weaponViews[weaponId]
        .setPosition(position.x, position.y)
        .setScale(weaponIconScale(weaponId, position.r))
        .setVisible(true);
      this.weaponCooldownLabels[weaponId]
        .setPosition(position.x, position.y)
        .setFontSize(compact ? 14 : 16);
    }
    this.lastDrawSignature = "";
    this.draw();
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.moveStick.originX;
    const dy = pointer.y - this.moveStick.originY;
    const distance = Math.hypot(dx, dy);
    this.moveStick.direction = distance > 0
      ? { x: dx / distance, y: dy / distance }
      : { x: 0, y: 0 };
    this.moveStick.magnitude = Math.min(1, distance / this.moveStick.radius);
  }

  private updateAim(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.fire.x;
    const dy = pointer.y - this.fire.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 10) {
      this.aim = { x: dx / distance, y: dy / distance };
    }
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
      this.aim = { ...control.aim };
    }
    control.drag = distance;
    if (distance >= MOBILE_WEAPON_DRAG_THRESHOLD) control.dragged = true;
  }

  private captureControl(
    control: TouchControl,
    pointer: Phaser.Input.Pointer,
  ): void {
    control.id = pointer.id;
    control.held = true;
    control.pressed = true;
    control.released = false;
  }

  private releaseControl(control: TouchControl): void {
    control.id = -1;
    control.held = false;
    control.pressed = false;
    control.released = true;
  }

  private draw(): void {
    const signature = this.drawSignature();
    if (signature === this.lastDrawSignature) return;
    this.lastDrawSignature = signature;
    const graphics = this.graphics;
    graphics.clear();
    this.aimGraphics.clear();
    this.cooldownGraphics.clear();
    graphics.fillStyle(0xffffff, .38);
    graphics.lineStyle(2, 0x17302d, .2);
    graphics.fillCircle(
      this.moveStick.originX,
      this.moveStick.originY,
      this.moveStick.radius,
    );
    graphics.strokeCircle(
      this.moveStick.originX,
      this.moveStick.originY,
      this.moveStick.radius,
    );
    const knobRadius = this.moveStick.radius <= 50 ? 18 : 22;
    const travel = (this.moveStick.radius - knobRadius + 8) *
      this.moveStick.magnitude;
    graphics.fillStyle(0x17302d, .42);
    graphics.fillCircle(
      this.moveStick.originX + this.moveStick.direction.x * travel,
      this.moveStick.originY + this.moveStick.direction.y * travel,
      knobRadius,
    );
    if (this.manualFireEnabled) {
      const cooldownMs = this.controlledActor()?.primaryFireCooldownMs ?? 0;
      this.drawButton(this.fire, 0xf3c453);
      this.fireLabel.setText(
        cooldownMs > 0
          ? `FIRE\n${(Math.ceil(cooldownMs / 100) / 10).toFixed(1)}`
          : "FIRE",
      );
      drawRadialCooldownWipe(
        this.cooldownGraphics,
        this.fire.x,
        this.fire.y,
        this.fire.radius,
        cooldownMs,
        V2_BASIC_AUTOSHOOT_PARITY_CONFIG.cooldownMs,
      );
    }
    if (PLAYER_JUMP_INPUT_ENABLED) {
      graphics.fillStyle(
        this.jump.held ? 0xffd86b : 0xffffff,
        this.jump.held ? .84 : .52,
      );
      graphics.lineStyle(
        3,
        this.jump.held ? 0xb77516 : 0x17302d,
        .28,
      );
      graphics.fillCircle(this.jump.x, this.jump.y, this.jump.radius);
      graphics.strokeCircle(this.jump.x, this.jump.y, this.jump.radius);
    }
    const activeWeaponIds = this.activeWeaponIds();
    const activeWeapons = new Set(activeWeaponIds);
    for (const weaponId of WEAPON_IDS) {
      if (activeWeapons.has(weaponId)) continue;
      this.weaponViews[weaponId].setVisible(false);
      this.weaponBadges[weaponId].image.setVisible(false);
      this.weaponBadges[weaponId].text.setVisible(false);
      this.weaponCooldownLabels[weaponId].setVisible(false);
    }
    for (const weaponId of activeWeaponIds) {
      const status = this.weaponStatus?.(weaponId) ?? {
        ammo: weaponId === "whip" ? null : 0,
        cooldownMs: 0,
      };
      const usesAmmo = status.ammo !== null;
      const available = !usesAmmo || status.ammo > 0;
      const control = this.weaponControls[weaponId];
      const compact = control.radius <= 24;
      const badgeOffset = control.radius * .72;
      const badge = this.weaponBadges[weaponId];
      const active = control.held && status.cooldownMs <= 0;
      const baseScale = weaponIconScale(weaponId, control.radius);
      this.weaponViews[weaponId]
        .setVisible(true)
        .setAlpha(available ? 1 : .58)
        .setScale(
          active && weaponId !== "whip" ? baseScale + .025 : baseScale,
        );
      badge.image
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setScale(compact ? .075 : .11)
        .setAlpha(.95)
        .setVisible(usesAmmo);
      badge.text
        .setPosition(control.x + badgeOffset, control.y + badgeOffset)
        .setFontSize(compact ? 10 : 13)
        .setText(String(status.ammo ?? ""))
        .setVisible(usesAmmo);
      this.weaponCooldownLabels[weaponId]
        .setText(formatCooldownSeconds(status.cooldownMs))
        .setVisible(status.cooldownMs > 0);
      if (status.cooldownMs > 0) {
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

  private drawSignature(): string {
    const actor = this.controlledActor();
    const activeWeaponIds = this.activeWeaponIds();
    const aimingWeapon = activeWeaponIds.find((weaponId) => {
      const control = this.weaponControls[weaponId];
      return weaponId !== "whip" && control.held && control.dragged;
    });
    const weaponState = activeWeaponIds.map(
      (weaponId) => {
        const control = this.weaponControls[weaponId];
        const status = this.weaponStatus?.(weaponId) ?? {
          ammo: weaponId === "whip" ? null : 0,
          cooldownMs: 0,
        };
        return [
          weaponId,
          status.ammo ?? "na",
          Math.ceil(status.cooldownMs / 100),
          Number(control.held),
          Number(control.dragged),
          control.drag.toFixed(1),
          control.aim.x.toFixed(3),
          control.aim.y.toFixed(3),
        ].join(":");
      },
    ).join("|");
    const fireCooldown = this.manualFireEnabled
      ? Math.ceil((actor?.primaryFireCooldownMs ?? 0) / 100)
      : 0;
    return [
      this.moveStick.originX.toFixed(1),
      this.moveStick.originY.toFixed(1),
      this.moveStick.direction.x.toFixed(3),
      this.moveStick.direction.y.toFixed(3),
      this.moveStick.magnitude.toFixed(3),
      Number(this.fire.held),
      Number(this.jump.held),
      fireCooldown,
      weaponState,
      aimingWeapon ? actor?.position.x.toFixed(1) ?? "x" : "",
      aimingWeapon ? actor?.position.y.toFixed(1) ?? "y" : "",
      aimingWeapon ? actor?.jump.height.toFixed(1) ?? "h" : "",
    ].join(";");
  }

  private drawWeaponAim(
    weaponId: Exclude<WeaponId, "whip">,
    control: WeaponControl,
    cooldownMs: number,
  ): void {
    const ready = cooldownMs <= 0;
    const buttonLength = Math.min(68, Math.max(28, control.drag));
    const color = mobileWeaponColor(weaponId);
    const lightColor = 0xe9fbff;
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
    const length = Math.min(340, ARENA_WEAPON_CATALOG[weaponId].range * .42);
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

  private drawButton(
    control: TouchControl,
    color: number,
  ): void {
    this.graphics.fillStyle(color, control.held ? .9 : .55);
    this.graphics.lineStyle(
      3,
      0x17302d,
      control.held ? .55 : .25,
    );
    this.graphics.fillCircle(control.x, control.y, control.radius);
    this.graphics.strokeCircle(control.x, control.y, control.radius);
  }

  private weaponAt(pointer: Phaser.Input.Pointer): WeaponId | null {
    return this.activeWeaponIds()
      .filter((weaponId) => this.weaponAvailable(weaponId))
      .map((weaponId) => ({
        weaponId,
        distance: Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          this.weaponControls[weaponId].x,
          this.weaponControls[weaponId].y,
        ),
      }))
      .filter(({ weaponId, distance }) =>
        distance <= this.weaponControls[weaponId].radius + 8
      )
      .sort((left, right) => left.distance - right.distance)[0]?.weaponId ?? null;
  }

  private createWeaponBadge(
    texture: string,
    stroke: string,
  ): WeaponBadgeView {
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

  private drawCooldown(
    weaponId: WeaponId,
    control: TouchControl,
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

  private capturedWeapon(pointerId: number): WeaponId | null {
    return this.activeWeaponIds().find((weaponId) =>
      this.weaponControls[weaponId].id === pointerId
    ) ?? null;
  }

  private activeWeaponIds(): readonly WeaponId[] {
    return resolveMobileWeaponRoster(this.snapshotProvider?.());
  }

  private weaponAvailable(weaponId: WeaponId): boolean {
    const ammo = this.weaponStatus?.(weaponId).ammo;
    return weaponId === "whip" || (ammo ?? 0) > 0;
  }

  private queueAutoTargetedWeapon(weaponId: WeaponId): void {
    const direction = this.autoTargetDirection(weaponId);
    if (!direction) return;
    this.queuedWeapon = {
      weaponId,
      direction,
    };
  }

  private autoTargetDirection(weaponId: WeaponId): WorldPosition | null {
    const snapshot = this.snapshotProvider?.();
    if (!snapshot) {
      return null;
    }
    return resolveMobileWeaponTapDirection(
      snapshot,
      this.actorId,
      weaponId,
    );
  }

  private controlledActor(
    snapshot = this.snapshotProvider?.(),
  ): Readonly<ActorState> | undefined {
    return snapshot?.actors.find((actor) => actor.id === this.actorId);
  }
}

function inside(
  pointer: Phaser.Input.Pointer,
  control: TouchControl,
  padding = 8,
): boolean {
  return Phaser.Math.Distance.Between(
    pointer.x,
    pointer.y,
    control.x,
    control.y,
  ) <= control.radius + padding;
}

function createTouchControl(radius: number): TouchControl {
  return {
    id: -1,
    x: 0,
    y: 0,
    radius,
    held: false,
    pressed: false,
    released: false,
  };
}

function createWeaponControl(radius: number): WeaponControl {
  return {
    ...createTouchControl(radius),
    aim: { x: 1, y: 0 },
    drag: 0,
    dragged: false,
  };
}

function distance(left: WorldPosition, right: WorldPosition): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function normalizeDirection(direction: WorldPosition): WorldPosition {
  const length = Math.hypot(direction.x, direction.y);
  return length > .001
    ? { x: direction.x / length, y: direction.y / length }
    : { x: 1, y: 0 };
}

function mobileWeaponColor(weaponId: Exclude<WeaponId, "whip">): number {
  if (weaponId === "rocket") return 0xffd36c;
  if (weaponId === "rail") return 0x62ff91;
  if (weaponId === "pulse") return 0x35d9ff;
  if (weaponId === "disc") return 0xffd34a;
  if (weaponId === "grenade") return 0x79caff;
  return 0xc674ff;
}

export function resolveMobileWeaponRoster(
  snapshot: Pick<WorldSnapshot, "map"> | null | undefined,
): readonly WeaponId[] {
  return snapshot?.map?.weaponRoster ?? DEFAULT_ARENA_WEAPON_ROSTER;
}

export function resolveMobileWeaponTapDirection(
  snapshot: WorldSnapshot,
  actorId: string,
  weaponId: WeaponId,
): WorldPosition | null {
  const owner = snapshot.actors.find((actor) => actor.id === actorId);
  if (!owner) return null;
  const maxRange = ARENA_WEAPON_CATALOG[weaponId].range;
  const target = snapshot.actors
    .filter((candidate) =>
      candidate.id !== owner.id &&
      candidate.lifeState === "active" &&
      candidate.teamId !== owner.teamId
    )
    .filter((candidate) =>
      distance(owner.position, candidate.position) <= maxRange
    )
    .filter((candidate) =>
      !snapshot.geometry.solids.some((solid) =>
        worldLineIntersectsRect(owner.position, candidate.position, solid)
      )
    )
    .sort((left, right) =>
      distance(owner.position, left.position) -
      distance(owner.position, right.position)
    )[0];
  // A tap without a visible target should not reuse stale aim state.
  if (!target) return null;
  return normalizeDirection({
    x: target.position.x - owner.position.x,
    y: target.position.y - owner.position.y,
  });
}

export function resolveMobileWeaponReleaseDirection(input: {
  readonly dragged: boolean;
  readonly dragDistance: number;
  readonly manualDirection: WorldPosition;
  readonly autoDirection: WorldPosition | null;
}): WorldPosition | null {
  if (input.dragged && input.dragDistance < MOBILE_WEAPON_DRAG_THRESHOLD) {
    return null;
  }
  if (!input.dragged && !input.autoDirection) return null;
  const direction = input.dragged ? input.manualDirection : input.autoDirection;
  return direction ? normalizeDirection(direction) : null;
}
