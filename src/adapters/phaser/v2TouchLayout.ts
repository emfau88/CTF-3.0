export function calculateV2TouchLayout(width: number, height: number) {
  const compact = width <= 720 || height <= 520;
  const jumpRadius = compact ? 46 : 58;
  const fireRadius = compact ? 30 : 36;
  const weaponRadius = compact ? 28 : 34;

  // Jump is the right-thumb anchor and the dominant action, mirrored against
  // the movement stick. Weapon and fire buttons are smaller satellites around
  // that same thumb position, so visible buttons and hit zones stay aligned.
  const safeRight = compact ? 76 : 104;
  const safeBottom = compact ? 78 : 96;
  const anchorX = width - Math.max(safeRight, width * (compact ? .06 : .075));
  const anchorY = height - Math.max(safeBottom, height * (compact ? .105 : .135));

  const fireOffsetX = compact ? 131 : 146;
  const fireOffsetY = compact ? -5 : -8;
  const rocketOffsetX = compact ? 71 : 90;
  const rocketOffsetY = compact ? 119 : 140;
  const railOffsetX = compact ? 201 : 230;
  const railOffsetY = compact ? 92 : 114;
  const whipOffsetX = compact ? 251 : 300;
  const whipOffsetY = compact ? 3 : -8;

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
      x: anchorX - fireOffsetX,
      y: anchorY + fireOffsetY,
    },
    rocket: {
      r: weaponRadius,
      x: anchorX - rocketOffsetX,
      y: anchorY - rocketOffsetY,
    },
    rail: {
      r: weaponRadius,
      x: anchorX - railOffsetX,
      y: anchorY - railOffsetY,
    },
    whip: {
      r: weaponRadius,
      x: anchorX - whipOffsetX,
      y: anchorY + whipOffsetY,
    },
  };
}
