import type { V2PlayerSkinId } from "../../v2Route";

export interface CharacterIdlePose {
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

interface IdleProfile {
  readonly label: string;
  readonly durationMs: number;
  readonly pose: (energy: number, time: number) => Omit<CharacterIdlePose, "active">;
}

const NEUTRAL_POSE: CharacterIdlePose = {
  active: false,
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

export const V2_IDLE_PROFILES: Readonly<Partial<Record<V2PlayerSkinId, IdleProfile>>> = {
  briarhorn: profile("brief sit-down", 1_500, (energy) => ({
    x: -1.5 * energy,
    y: 5 * energy,
    rotation: -.055 * energy,
    scaleX: 1 + .04 * energy,
    scaleY: 1 - .15 * energy,
  })),
  "null-courier": profile("signal glitch", 900, (energy, time) => ({
    x: Math.sin(time * .075) * 2.2 * energy,
    y: Math.cos(time * .06) * 1.2 * energy,
    rotation: 0,
    scaleX: 1 + Math.sin(time * .05) * .055 * energy,
    scaleY: 1 - Math.sin(time * .05) * .035 * energy,
  })),
  "aegis-vanguard": profile("armor stretch", 1_400, (energy) => ({
    x: 0,
    y: -3 * energy,
    rotation: .035 * energy,
    scaleX: 1 - .025 * energy,
    scaleY: 1 + .1 * energy,
  })),
  "alien-runner": profile("zero-gravity hiccup", 1_700, (energy, time) => ({
    x: Math.sin(time * .008) * 2 * energy,
    y: -11 * energy,
    rotation: Math.sin(time * .006) * .12 * energy,
    scaleX: 1,
    scaleY: 1,
  })),
  "volt-hound": profile("static shake-off", 950, (energy, time) => ({
    x: Math.sin(time * .085) * 2.4 * energy,
    y: 0,
    rotation: Math.sin(time * .065) * .035 * energy,
    scaleX: 1 + .025 * energy,
    scaleY: 1 - .02 * energy,
  })),
  mirejaw: profile("floor inspection", 1_550, (energy) => ({
    x: 1.5 * energy,
    y: 6 * energy,
    rotation: .075 * energy,
    scaleX: 1 + .05 * energy,
    scaleY: 1 - .17 * energy,
  })),
  scrapwing: profile("wing check", 1_250, (energy, time) => ({
    x: Math.sin(time * .011) * 2 * energy,
    y: -2 * energy,
    rotation: Math.sin(time * .014) * .1 * energy,
    scaleX: 1 + .04 * energy,
    scaleY: 1,
  })),
  "prism-bastion": profile("heroic pose", 1_450, (energy) => ({
    x: 0,
    y: -2 * energy,
    rotation: -.045 * energy,
    scaleX: 1 + .075 * energy,
    scaleY: 1 + .075 * energy,
  })),
};

export function resolveCharacterIdlePose(
  skinId: V2PlayerSkinId,
  idleElapsedMs: number,
  seed = 0,
): CharacterIdlePose {
  // Keep the avatar calm long enough that a pose reads as an authored idle
  // moment, not as constant low-quality "breathing" motion.
  const warmupMs = 3_500 + Math.abs(seed % 2_500);
  if (idleElapsedMs < warmupMs) return NEUTRAL_POSE;
  const profile = V2_IDLE_PROFILES[skinId];
  if (!profile) return NEUTRAL_POSE;
  const restMs = 5_600 + Math.abs(seed % 2_100);
  const cycleMs = profile.durationMs + restMs;
  const cycleTime = (idleElapsedMs - warmupMs) % cycleMs;
  if (cycleTime > profile.durationMs) return NEUTRAL_POSE;
  const ratio = cycleTime / profile.durationMs;
  const energy = Math.sin(ratio * Math.PI) ** .7;
  return { active: true, ...profile.pose(energy, cycleTime) };
}

function profile(
  label: string,
  durationMs: number,
  pose: IdleProfile["pose"],
): IdleProfile {
  return { label, durationMs, pose };
}
