import type { ArenaWeaponId } from "../../core";

export interface DesktopWeaponTrigger {
  readonly weaponId: ArenaWeaponId;
  readonly held: boolean;
  readonly wasHeld: boolean;
}

export interface DesktopWeaponFireResolution {
  readonly selectedWeaponId: ArenaWeaponId;
  readonly fireWeaponId: ArenaWeaponId | null;
}

export type DesktopWeaponAvailability = (
  weaponId: ArenaWeaponId,
) => boolean;

export function normalizeDesktopWeaponSelection(
  selectedWeaponId: ArenaWeaponId,
  roster: readonly ArenaWeaponId[],
  available: DesktopWeaponAvailability,
): ArenaWeaponId {
  if (roster.includes(selectedWeaponId) && available(selectedWeaponId)) {
    return selectedWeaponId;
  }

  return roster.find((weaponId) => weaponId === "whip" && available(weaponId)) ??
    roster.find(available) ??
    roster[0] ??
    "whip";
}

export function cycleDesktopWeaponSelection(
  selectedWeaponId: ArenaWeaponId,
  steps: number,
  roster: readonly ArenaWeaponId[],
  available: DesktopWeaponAvailability,
): ArenaWeaponId {
  const usable = roster.filter(available);
  if (usable.length === 0) {
    return normalizeDesktopWeaponSelection(selectedWeaponId, roster, available);
  }

  const current = normalizeDesktopWeaponSelection(
    selectedWeaponId,
    roster,
    available,
  );
  const currentIndex = Math.max(0, usable.indexOf(current));
  const integerSteps = Math.trunc(steps);
  const nextIndex = ((currentIndex + integerSteps) % usable.length + usable.length) %
    usable.length;
  return usable[nextIndex]!;
}

export function resolveDesktopWeaponFire(input: {
  readonly selectedWeaponId: ArenaWeaponId;
  readonly roster: readonly ArenaWeaponId[];
  readonly available: DesktopWeaponAvailability;
  readonly directTriggers: readonly DesktopWeaponTrigger[];
  readonly pointerHeld: boolean;
  readonly pointerWasHeld: boolean;
}): DesktopWeaponFireResolution {
  const selectedWeaponId = normalizeDesktopWeaponSelection(
    input.selectedWeaponId,
    input.roster,
    input.available,
  );

  for (const trigger of input.directTriggers) {
    if (!shouldFireDesktopWeapon(
      trigger.weaponId,
      trigger.held,
      trigger.wasHeld,
    )) {
      continue;
    }

    return {
      selectedWeaponId:
        input.roster.includes(trigger.weaponId) &&
          input.available(trigger.weaponId)
          ? trigger.weaponId
          : selectedWeaponId,
      fireWeaponId: trigger.weaponId,
    };
  }

  return {
    selectedWeaponId,
    fireWeaponId: shouldFireDesktopWeapon(
        selectedWeaponId,
        input.pointerHeld,
        input.pointerWasHeld,
      )
      ? selectedWeaponId
      : null,
  };
}

export function shouldFireDesktopWeapon(
  weaponId: ArenaWeaponId,
  held: boolean,
  wasHeld: boolean,
): boolean {
  return held && (isAutomaticDesktopWeapon(weaponId) || !wasHeld);
}

export function isAutomaticDesktopWeapon(
  weaponId: ArenaWeaponId,
): boolean {
  return weaponId === "pulse" || weaponId === "shard";
}
