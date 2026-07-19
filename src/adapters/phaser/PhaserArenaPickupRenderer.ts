import Phaser from "phaser";
import type { PickupId, PickupState, WorldSnapshot } from "../../core";
import { UI_FONT_FAMILY } from "../../uiTypography";
import { ensureArenaWeaponTextures } from "./PhaserArenaWeaponTextures";

export class PhaserArenaPickupRenderer {
  private readonly views = new Map<PickupId, Phaser.GameObjects.Container>();

  constructor(private readonly scene: Phaser.Scene) {
    ensureArenaWeaponTextures(scene);
    ensureSpawnPadAnimation(scene);
  }

  render(snapshot: WorldSnapshot): void {
    const visibleIds = new Set(snapshot.pickups.map((pickup) => pickup.id));
    for (const [pickupId, view] of this.views) {
      if (!visibleIds.has(pickupId)) {
        view.destroy(true);
        this.views.delete(pickupId);
      }
    }
    for (const pickup of snapshot.pickups) {
      const view = this.views.get(pickup.id) ?? this.createView(pickup);
      view.setPosition(pickup.position.x, pickup.position.y);
      const active = pickup.lifeState === "active";
      const energy = view.getByName("pad-energy") as Phaser.GameObjects.Image;
      const glow = view.getByName("pad-glow") as Phaser.GameObjects.Sprite;
      const icon = view.getByName("icon") as Phaser.GameObjects.Image;
      const stateRing = view.getByName("state-ring") as Phaser.GameObjects.Graphics;
      const respawnLabel = view.getByName("respawn-label") as Phaser.GameObjects.Text;
      const wave = Math.sin(this.scene.time.now * .003 + pickup.position.x * .02);
      const pulse = wave * .008;
      const color = pickupPadColor(pickup.type);
      energy
        .setVisible(active)
        .setTint(color)
        .setAlpha(.58 + wave * .1)
        .setScale(.255 + wave * .009);
      glow
        .setVisible(true)
        .setTint(color)
        .setAlpha(active ? .62 + wave * .08 : .08)
        .setScale(.29 + wave * .008);
      icon
        .setVisible(active)
        .setY((isWeaponPickup(pickup.type) ? -5 : -7) + wave * 1.5)
        .setScale(pickupIconScale(pickup.type) + pulse);
      drawPickupState(stateRing, pickup, color, pulse);
      respawnLabel
        .setVisible(!active)
        .setText(Math.max(1, Math.ceil(pickup.respawnRemainingMs / 1000)).toString());
    }
  }

  reset(): void {
    for (const view of this.views.values()) view.destroy(true);
    this.views.clear();
  }

  dispose(): void {
    this.reset();
  }

  private createView(pickup: Readonly<PickupState>): Phaser.GameObjects.Container {
    const container = this.scene.add.container(pickup.position.x, pickup.position.y)
      .setDepth(18);
    const pad = this.scene.add.image(0, 2, "spawnPadV2")
      .setName("pad")
      .setScale(.31)
      .setAlpha(.96);
    const energy = this.scene.add.image(0, 1, "spawnPadLegacy")
      .setName("pad-energy")
      .setScale(.255)
      .setAlpha(.66)
      .setBlendMode(Phaser.BlendModes.ADD);
    const glow = this.scene.add.sprite(0, 2, "spawnPadGlowV2")
      .setName("pad-glow")
      .setScale(.29)
      .setAlpha(.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .play("spawn-pad-glow-v2");
    const icon = this.scene.add.image(
      0,
      isWeaponPickup(pickup.type) ? -3 : -5,
      pickupTexture(pickup.type),
    ).setName("icon").setScale(pickupIconScale(pickup.type));
    const stateRing = this.scene.add.graphics().setName("state-ring");
    const respawnLabel = this.scene.add.text(0, -1, "", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "10px",
      fontStyle: "bold",
      color: "#b9c8ce",
      stroke: "#071118",
      strokeThickness: 4,
    }).setName("respawn-label").setOrigin(.5).setVisible(false);
    container.add([pad, energy, glow, stateRing, icon, respawnLabel]);
    this.views.set(pickup.id, container);
    return container;
  }
}

function pickupTexture(type: PickupState["type"]): string {
  if (type === "health") return "pickupHealth";
  if (type === "armor") return "pickupArmor";
  if (type === "rocket") return "pickupRocket";
  if (type === "rail") return "pickupRail";
  if (type === "pulse") return "pickupPulse";
  if (type === "disc") return "pickupDisc";
  if (type === "grenade") return "pickupGrenade";
  return "pickupShard";
}

function pickupIconScale(type: PickupState["type"]): number {
  if (type === "rail") return .22;
  if (type === "pulse" || type === "disc") return .15;
  if (type === "grenade" || type === "shard") {
    return .28;
  }
  return .18;
}

export function pickupPadColor(type: PickupState["type"]): number {
  if (type === "health") return 0x55d88a;
  if (type === "armor") return 0x6fc7ff;
  if (type === "rocket") return 0xff7048;
  if (type === "rail") return 0x9cff67;
  if (type === "pulse") return 0x35d9ff;
  if (type === "disc") return 0xffd34a;
  if (type === "grenade") return 0x79caff;
  return 0xc674ff;
}

function drawPickupState(
  graphics: Phaser.GameObjects.Graphics,
  pickup: Readonly<PickupState>,
  color: number,
  pulse: number,
): void {
  graphics.clear();
  const active = pickup.lifeState === "active";
  const radius = 29 + pulse * 45;
  if (active) return;
  graphics.lineStyle(1.5, color, .22).strokeCircle(0, 2, radius);
  const progress = pickup.respawnDelayMs > 0
    ? Phaser.Math.Clamp(
      1 - pickup.respawnRemainingMs / pickup.respawnDelayMs,
      0,
      1,
    )
    : 1;
  graphics.lineStyle(3, color, .62)
    .beginPath()
    .arc(0, 2, radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
    .strokePath();
}

function isWeaponPickup(type: PickupState["type"]): boolean {
  return type !== "health" && type !== "armor";
}

function ensureSpawnPadAnimation(scene: Phaser.Scene): void {
  if (scene.anims.exists("spawn-pad-glow-v2")) return;
  scene.anims.create({
    key: "spawn-pad-glow-v2",
    frames: scene.anims.generateFrameNumbers("spawnPadGlowV2", { start: 0, end: 3 }),
    frameRate: 2.2,
    repeat: -1,
    yoyo: true,
  });
}
