import type { ArenaWeaponId } from "../../core";

export type WeaponHudId = ArenaWeaponId;

export interface WeaponHudPosition {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface WeaponStripLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly slots: readonly WeaponHudPosition[];
}

export function calculateWeaponStripLayout(
  width: number,
  height: number,
  slotCount: number,
): WeaponStripLayout {
  const count = Math.max(1, Math.floor(slotCount));
  const micro = width <= 420 || height <= 240;
  const compact = !micro && height <= 520;
  const baseRadius = micro ? 16 : compact ? 25 : 29;
  const gap = micro ? 8 : compact ? 12 : 14;
  const frameExtra = micro ? 2 : 3;
  const panelPadding = micro ? 4 : compact ? 6 : 7;
  const maximumPanelWidth = Math.max(
    64,
    Math.min(width - 12, count > 3 ? 372 : 222),
  );
  const availableSlotWidth = Math.max(
    20,
    maximumPanelWidth - (frameExtra + panelPadding) * 2,
  );
  const fittedRadius = Math.floor(
    (availableSlotWidth - gap * (count - 1)) / (count * 2),
  );
  const radius = Math.max(10, Math.min(baseRadius, fittedRadius));
  const spacing = radius * 2 + gap;
  const centerX = width / 2;
  const centerY = height - radius - frameExtra - panelPadding;
  const firstX = centerX - spacing * (count - 1) / 2;
  const slots = Array.from({ length: count }, (_, index) => ({
    x: firstX + spacing * index,
    y: centerY,
    r: radius,
  }));
  const left = firstX - radius - frameExtra - panelPadding;
  const panelWidth = spacing * (count - 1) +
    (radius + frameExtra + panelPadding) * 2;
  const panelHeight = (radius + frameExtra + panelPadding) * 2;

  return {
    x: left,
    y: height - panelHeight,
    width: panelWidth,
    height: panelHeight,
    slots,
  };
}

export function calculateDesktopWeaponLayout(
  width: number,
  height: number,
): Record<"rocket" | "rail" | "whip", WeaponHudPosition> {
  const layout = calculateWeaponStripLayout(width, height, 3);
  const [rocket, rail, whip] = layout.slots;

  return {
    rocket,
    rail,
    whip,
  };
}

export function weaponIconScale(
  weaponId: WeaponHudId,
  radius: number,
): number {
  const sourceSize = weaponId === "whip"
    ? 512
    : weaponId === "rocket" || weaponId === "rail" ||
        weaponId === "pulse" || weaponId === "disc"
    ? 256
    : 128;
  return radius * 2.15 / sourceSize;
}

export function cooldownWipeState(
  cooldownMs: number,
  totalCooldownMs: number,
) {
  const remainingRatio = totalCooldownMs > 0
    ? Math.max(0, Math.min(1, cooldownMs / totalCooldownMs))
    : 0;
  const elapsedRatio = 1 - remainingRatio;
  return {
    remainingRatio,
    elapsedRatio,
    boundaryAngle: -Math.PI / 2 + elapsedRatio * Math.PI * 2,
  };
}

export function formatCooldownSeconds(cooldownMs: number): string {
  return (Math.ceil(Math.max(0, cooldownMs) / 100) / 10).toFixed(1);
}
