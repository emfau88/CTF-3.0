export function calculateV2TouchLayout(width: number, height: number) {
  const compact = width <= 720 || height <= 520;
  const jumpRadius = compact ? 40 : 48;
  const fireRadius = compact ? 32 : 38;
  const weaponRadius = compact ? 29 : 36;
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
    jump: {
      r: jumpRadius,
      x: attackX,
      y: attackY,
    },
    fire: {
      r: fireRadius,
      x: attackX - (compact ? 142 : 168),
      y: attackY - (compact ? 4 : 4),
    },
    rocket: {
      r: weaponRadius,
      x: attackX - (compact ? 258 : 260),
      y: attackY - (compact ? 78 : 98),
    },
    rail: {
      r: weaponRadius,
      x: attackX - (compact ? 76 : 90),
      y: attackY - (compact ? 130 : 162),
    },
    whip: {
      r: weaponRadius,
      x: attackX - (compact ? 190 : 290),
      y: attackY - (compact ? 172 : 234),
    },
  };
}
