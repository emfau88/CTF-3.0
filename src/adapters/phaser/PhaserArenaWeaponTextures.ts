import Phaser from "phaser";
import type { ArenaWeaponId } from "../../core";

const GENERATED_TEXTURES: Readonly<
  Partial<Record<ArenaWeaponId, readonly [string, string]>>
> = {
  pulse: ["uiPulseButton", "pickupPulse"],
  disc: ["uiDiscButton", "pickupDisc"],
  grenade: ["uiGrenadeButton", "pickupGrenade"],
  shard: ["uiShardButton", "pickupShard"],
};

export function ensureArenaWeaponTextures(scene: Phaser.Scene): void {
  for (const [weaponId, keys] of Object.entries(GENERATED_TEXTURES) as [
    ArenaWeaponId,
    readonly [string, string],
  ][]) {
    if (scene.textures.exists(keys[0]) && scene.textures.exists(keys[1])) {
      continue;
    }
    const graphics = scene.make.graphics({ x: 0, y: 0 });
    drawWeaponIcon(graphics, weaponId);
    for (const key of keys) {
      if (!scene.textures.exists(key)) graphics.generateTexture(key, 128, 128);
    }
    graphics.destroy();
  }
}

function drawWeaponIcon(
  graphics: Phaser.GameObjects.Graphics,
  weaponId: ArenaWeaponId,
): void {
  const color = weaponColor(weaponId);
  graphics.clear();
  graphics.fillStyle(0x08131d, .98).fillCircle(64, 64, 59);
  graphics.lineStyle(5, color, .92).strokeCircle(64, 64, 55);
  graphics.fillStyle(color, .16).fillCircle(64, 64, 48);
  if (weaponId === "pulse") {
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(28, 49, 62, 30, 8);
    graphics.fillTriangle(88, 44, 112, 64, 88, 84);
    graphics.fillStyle(0xdffcff, .95);
    graphics.fillRect(37, 57, 43, 5);
    graphics.fillRect(37, 68, 35, 5);
    return;
  }
  if (weaponId === "disc") {
    graphics.lineStyle(13, color, 1).strokeCircle(64, 64, 30);
    graphics.lineStyle(4, 0xe7ffff, .9).strokeCircle(64, 64, 21);
    graphics.fillStyle(color, .82).fillCircle(64, 64, 8);
    return;
  }
  if (weaponId === "grenade") {
    graphics.fillStyle(color, 1).fillCircle(62, 69, 28);
    graphics.lineStyle(5, 0xe8fbff, .95).strokeCircle(62, 69, 20);
    graphics.fillStyle(0x354651, 1).fillRoundedRect(54, 29, 21, 19, 5);
    graphics.lineStyle(6, 0xffe7a1, 1)
      .beginPath().arc(79, 39, 15, -1.5, .25).strokePath();
    return;
  }
  graphics.fillStyle(color, 1);
  graphics.fillTriangle(28, 76, 90, 26, 62, 85);
  graphics.fillTriangle(43, 97, 102, 51, 74, 105);
  graphics.lineStyle(4, 0xf4e8ff, .95)
    .beginPath().moveTo(45, 72).lineTo(83, 42).strokePath();
}

function weaponColor(weaponId: ArenaWeaponId): number {
  if (weaponId === "pulse") return 0x35d9ff;
  if (weaponId === "disc") return 0xffd34a;
  if (weaponId === "grenade") return 0x79caff;
  return 0xc674ff;
}
