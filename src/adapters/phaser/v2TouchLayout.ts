export function calculateV2TouchLayout(width: number, height: number) {
  const compact = width <= 720 || height <= 520;
  const fireRadius = compact ? 32 : 38;
  const weaponRadius = compact ? 29 : 36;
  const weaponSpacing = compact ? 116 : 136;
  const attackX = width - Math.max(
    compact ? 64 : 84,
    width * (compact ? .055 : .065),
  );
  const attackY = height - Math.max(
    compact ? 72 : 104,
    height * (compact ? .09 : .12),
  );

  return {
    joy: {
      r: compact ? 46 : 56,
      knobR: compact ? 18 : 22,
      ox: Math.max(compact ? 70 : 96, width * (compact ? .09 : .12)),
      oy: height - (compact ? 62 : 88),
    },
    fire: {
      r: fireRadius,
      x: attackX,
      y: attackY,
    },
    rocket: {
      r: weaponRadius,
      x: attackX - weaponSpacing,
      y: attackY,
    },
    rail: {
      r: weaponRadius,
      x: attackX,
      y: attackY - weaponSpacing,
    },
    whip: {
      r: weaponRadius,
      x: attackX - weaponSpacing,
      y: attackY - weaponSpacing,
    },
  };
}
