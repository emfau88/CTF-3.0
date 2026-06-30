export function calculateV2TouchLayout(width: number, height: number) {
  const compact = width <= 720 || height <= 520;
  const jumpRadius = compact ? 40 : 48;
  const fireRadius = compact ? 32 : 38;
  const weaponRadius = compact ? 29 : 36;

  // Jump is the thumb anchor (like the Wild Rift attack button): it sits in the
  // lower-right corner where the right thumb rests. fire/rocket/rail/whip fan
  // out on a single arc that sweeps up and to the left, so every action sits at
  // the same comfortable reach for that same thumb and no button is stranded in
  // a corner.
  const anchorX = width - Math.max(
    compact ? 80 : 100,
    width * (compact ? .055 : .065),
  );
  const anchorY = height - Math.max(
    compact ? 72 : 104,
    height * (compact ? .09 : .12),
  );

  // The arc radius scales with the buttons so the gaps stay tappable on small
  // screens and do not crowd on large ones. The radius is large enough that the
  // four action buttons never overlap each other, the jump anchor, or the
  // bottom-left move stick (verified down to 360px-wide portrait screens).
  const arcRadius = compact ? 210 : 240;
  const point = (angleDeg: number) => {
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: anchorX + Math.cos(angle) * arcRadius,
      y: anchorY - Math.sin(angle) * arcRadius,
    };
  };

  // Angles are measured counter-clockwise from the positive x-axis and spaced
  // evenly across the fan. fire (most used) sits lowest/closest to the resting
  // thumb just above the jump anchor, sweeping up through rocket and rail to
  // whip in the upper-left, well clear of the move stick.
  const arcStart = 78;
  const arcEnd = 150;
  const arcStep = (arcEnd - arcStart) / 3;
  const fire = point(arcStart);
  const rocket = point(arcStart + arcStep);
  const rail = point(arcStart + arcStep * 2);
  const whip = point(arcEnd);

  return {
    joy: {
      r: compact ? 46 : 56,
      knobR: compact ? 18 : 22,
      ox: Math.max(compact ? 70 : 96, width * (compact ? .09 : .12)),
      oy: height - (compact ? 62 : 88),
    },
    jump: {
      r: jumpRadius,
      x: anchorX,
      y: anchorY,
    },
    fire: {
      r: fireRadius,
      x: fire.x,
      y: fire.y,
    },
    rocket: {
      r: weaponRadius,
      x: rocket.x,
      y: rocket.y,
    },
    rail: {
      r: weaponRadius,
      x: rail.x,
      y: rail.y,
    },
    whip: {
      r: weaponRadius,
      x: whip.x,
      y: whip.y,
    },
  };
}
