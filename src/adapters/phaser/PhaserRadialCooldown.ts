import Phaser from "phaser";
import { cooldownWipeState } from "./weaponHudLayout";

export function drawRadialCooldownWipe(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  cooldownMs: number,
  totalCooldownMs: number,
): void {
  const state = cooldownWipeState(cooldownMs, totalCooldownMs);
  if (state.remainingRatio <= 0) {
    return;
  }

  graphics.fillStyle(0x59616b, .92);
  if (state.remainingRatio >= .9999) {
    graphics.fillCircle(x, y, radius);
  } else {
    graphics.beginPath()
      .moveTo(x, y)
      .arc(
        x,
        y,
        radius,
        state.boundaryAngle,
        Math.PI * 1.5,
        false,
      )
      .closePath()
      .fillPath();
  }

  const handX = x + Math.cos(state.boundaryAngle) * radius;
  const handY = y + Math.sin(state.boundaryAngle) * radius;
  graphics.lineStyle(2, 0xffffff, .72)
    .beginPath()
    .moveTo(x, y)
    .lineTo(handX, handY)
    .strokePath();
  graphics.lineStyle(2, 0x101820, .5).strokeCircle(x, y, radius);
}
