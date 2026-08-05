import type { WeaponHudPosition } from "./weaponHudLayout";

export interface V2TouchLayout {
  readonly compact: boolean;
  readonly joy: Readonly<{ r: number; knobR: number; ox: number; oy: number }>;
  readonly jump: WeaponHudPosition;
  readonly fire: WeaponHudPosition;
  readonly weapons: readonly WeaponHudPosition[];
}

export function calculateV2TouchLayout(
  width: number,
  height: number,
  weaponCount = 3,
): V2TouchLayout {
  const compact = width <= 720 || height <= 520;
  const count = Math.max(1, Math.floor(weaponCount));
  const jumpRadius = compact ? 34 : 44;
  const fireRadius = compact ? 25 : 31;
  const weaponRadius = compact
    ? count >= 4 ? 18 : 20
    : count >= 4 ? 23 : 26;

  // The jump button is the right-thumb anchor. Map-specific weapons occupy a
  // compact upper-left fan around it, keeping every action close to the screen
  // edge and out of the central playfield.
  const safeRight = compact ? jumpRadius + 12 : 78;
  const safeBottom = compact ? jumpRadius + 12 : 78;
  const anchorX = width - safeRight;
  const anchorY = height - safeBottom;
  const orbit = compact
    ? count >= 4 ? 88 : 82
    : count >= 4 ? 135 : 118;
  const startDegrees = count >= 4 ? 170 : 185;
  const endDegrees = count >= 4 ? 280 : 275;
  const weapons = Array.from({ length: count }, (_, index) => {
    const ratio = count <= 1 ? .5 : index / (count - 1);
    const radians = (startDegrees + (endDegrees - startDegrees) * ratio) *
      Math.PI / 180;
    return {
      r: weaponRadius,
      x: anchorX + Math.cos(radians) * orbit,
      y: anchorY + Math.sin(radians) * orbit,
    };
  });

  return {
    compact,
    joy: {
      r: compact ? 42 : 52,
      knobR: compact ? 16 : 20,
      ox: Math.max(compact ? 58 : 82, width * (compact ? .075 : .1)),
      oy: height - Math.max(compact ? 54 : 74, height * (compact ? .08 : .1)),
    },
    jump: {
      r: jumpRadius,
      x: anchorX,
      y: anchorY,
    },
    // Manual primary fire is currently disabled in product matches. Its slot
    // remains adjacent to Jump for the diagnostic profile without affecting
    // the map-specific weapon fan.
    fire: {
      r: fireRadius,
      x: anchorX - orbit - fireRadius * 2.4,
      y: anchorY + 4,
    },
    weapons,
  };
}
