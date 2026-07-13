import {
  migrateV2PlayerSkinId,
  V2_PLAYER_SKINS,
  type V2PlayerSkinId,
} from "./v2Route";

export const PLAYER_SKIN_STORAGE_KEY = "core-arena.player-skin.v1";
export const DEFAULT_PLAYER_SKIN: V2PlayerSkinId = "alien-runner";

export interface PlayerSkinStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadPlayerSkinPreference(
  storage: PlayerSkinStoragePort = window.localStorage,
): V2PlayerSkinId {
  try {
    const stored = storage.getItem(PLAYER_SKIN_STORAGE_KEY);
    return migrateV2PlayerSkinId(stored) ?? DEFAULT_PLAYER_SKIN;
  } catch {
    return DEFAULT_PLAYER_SKIN;
  }
}

export function savePlayerSkinPreference(
  skinId: V2PlayerSkinId,
  storage: PlayerSkinStoragePort = window.localStorage,
): void {
  if (!isPlayerSkinId(skinId)) return;
  try {
    storage.setItem(PLAYER_SKIN_STORAGE_KEY, skinId);
  } catch {
    // Cosmetic preferences must never block menu or match startup.
  }
}

export function isPlayerSkinId(value: string | null): value is V2PlayerSkinId {
  return V2_PLAYER_SKINS.includes(value as V2PlayerSkinId);
}

export function playerSkinLabel(skinId: V2PlayerSkinId): string {
  const labels: Partial<Record<V2PlayerSkinId, string>> = {
    "briarhorn": "Briarhorn",
    "ax9-mantis": "AX-9 Mantis",
    "null-courier": "Null Courier",
    "aegis-vanguard": "Aegis Vanguard",
    "alien-runner": "Xeno Runner",
    "volt-hound": "Volt Hound",
    "mirejaw": "Mirejaw",
    "scrapwing": "Scrapwing",
    "prism-bastion": "Prism Bastion",
  };
  return labels[skinId] ?? skinId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function playerSkinSheetColumns(skinId: V2PlayerSkinId): number {
  void skinId;
  return 6;
}

export function playerSkinSheetAssetStem(skinId: V2PlayerSkinId): string {
  return skinId === "alien-runner" ? "xeno-runner" : skinId;
}
