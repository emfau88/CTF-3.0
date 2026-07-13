export function calculateV2TouchLayout(width: number, height: number) {
  const compact = width <= 720 || height <= 520;
  const jumpRadius = compact ? 46 : 58;
  const fireRadius = compact ? 30 : 36;
  const weaponRadius = compact ? 28 : 34;

  // Jump is the right-thumb anchor. Fire and picked-up weapons form one
  // predictable ability arc around it, matching the spatial language of
  // mobile MOBAs instead of stretching into an unrelated horizontal row.
  const safeRight = compact ? 107 : 140;
  const safeBottom = compact ? 78 : 118;
  const anchorX = width - safeRight;
  const anchorY = height - safeBottom;
  const orbit = compact ? 135 : 165;
  const satellite = (degrees: number) => {
    const radians = degrees * Math.PI / 180;
    return {
      x: anchorX + Math.cos(radians) * orbit,
      y: anchorY + Math.sin(radians) * orbit,
    };
  };

  const fire = satellite(185);
  const whip = satellite(223);
  const rocket = satellite(261);
  const rail = satellite(299);

  return {
    joy: {
      r: compact ? 48 : 58,
      knobR: compact ? 18 : 22,
      ox: Math.max(compact ? 72 : 98, width * (compact ? .09 : .115)),
      oy: height - Math.max(compact ? 62 : 84, height * (compact ? .09 : .11)),
    },
    jump: {
      r: jumpRadius,
      x: anchorX,
      y: anchorY,
    },
    fire: {
      r: fireRadius,
      ...fire,
    },
    rocket: {
      r: weaponRadius,
      ...rocket,
    },
    rail: {
      r: weaponRadius,
      ...rail,
    },
    whip: {
      r: weaponRadius,
      ...whip,
    },
  };
}
