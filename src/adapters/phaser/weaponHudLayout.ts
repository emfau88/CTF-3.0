export type WeaponHudId = "rocket" | "rail" | "whip";

export interface WeaponHudPosition {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export function calculateDesktopWeaponLayout(
  width: number,
  height: number,
): Record<WeaponHudId, WeaponHudPosition> {
  const compact = height <= 520;
  const radius = compact ? 25 : 29;
  const spacing = radius * 2 + (compact ? 12 : 14);
  const centerX = width / 2;
  const y = height - radius - (compact ? 6 : 7);

  return {
    rocket: { x: centerX - spacing, y, r: radius },
    rail: { x: centerX, y, r: radius },
    whip: { x: centerX + spacing, y, r: radius },
  };
}

export function weaponIconScale(
  weaponId: WeaponHudId,
  radius: number,
): number {
  const sourceSize = weaponId === "whip" ? 512 : 256;
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
