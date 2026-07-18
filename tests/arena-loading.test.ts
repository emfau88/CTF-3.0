import assert from "node:assert/strict";
import test from "node:test";
import type Phaser from "phaser";
import { preloadArenaAssets } from "../src/assets";
import {
  bindArenaLoadingUi,
  hideArenaLoadingUi,
  showArenaLoadingUi,
} from "../src/arenaLoadingUi";
import { requiredV2CharacterSkinIds } from "../src/adapters/phaser/v2CharacterPresentation";

test("v2 preload selects only the active premium map and match roster", () => {
  const loader = new FakeLoader();
  preloadArenaAssets({ load: loader } as unknown as Phaser.Scene, {
    mapId: "drowned-sun-temple-v2",
    mapTheme: "jungle-temple",
    characterSkinIds: [
      "alien-runner",
      "prism-bastion",
      "mirejaw",
      "scrapwing",
    ],
  });

  assert.equal(loader.keys.has("templeArenaMasterV2"), true);
  assert.equal(loader.keys.has("templeFloorBasaltPilot"), false);
  assert.equal(loader.keys.has("helixArenaMaster"), false);
  assert.equal(loader.keys.has("ruinsFloorStone"), false);
  assert.equal(loader.keys.has("industrialFloorMetal"), false);
  assert.deepEqual(
    [...loader.keys].filter((key) => key.endsWith("Runner")).sort(),
    ["mirejawRunner", "prismBastionRunner", "scrapwingRunner", "xenoRunner"],
  );
});

test("required v2 skins match quick play and league rosters", () => {
  assert.deepEqual(
    requiredV2CharacterSkinIds(2, "alien-runner"),
    ["alien-runner", "prism-bastion", "mirejaw", "scrapwing"],
  );
  assert.deepEqual(
    requiredV2CharacterSkinIds(2, "aegis-vanguard", {
      blueBotSkinIds: ["briarhorn"],
      redSkinIds: ["ax9-mantis", "null-courier"],
    }),
    ["aegis-vanguard", "briarhorn", "ax9-mantis", "null-courier"],
  );
});

test("arena loading UI reports progress and preserves recoverable errors", () => {
  document.querySelector("#v2-arena-loading")?.remove();
  const loader = new FakeLoader();
  showArenaLoadingUi("Helix Canopy", "Starting arena engine");
  bindArenaLoadingUi(
    { load: loader } as unknown as Phaser.Scene,
    "Helix Canopy",
  );

  loader.emit("progress", .42);
  assert.equal(
    document.querySelector("[data-arena-loading-percent]")?.textContent,
    "42%",
  );
  loader.emit("loaderror", { key: "helixArenaMaster" });
  loader.emit("complete");
  assert.equal(
    document.querySelector("#v2-arena-loading")?.classList.contains("is-hidden"),
    false,
  );
  assert.equal(
    document.querySelector("[data-arena-loading-actions]")?.classList.contains(
      "is-hidden",
    ),
    false,
  );
  hideArenaLoadingUi();
});

class FakeLoader {
  readonly keys = new Set<string>();
  private readonly listeners = new Map<string, ((...args: unknown[]) => void)[]>();

  image(key: string): this {
    this.keys.add(key);
    return this;
  }

  spritesheet(key: string): this {
    this.keys.add(key);
    return this;
  }

  audio(key: string): this {
    this.keys.add(key);
    return this;
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  once(event: string, listener: (...args: unknown[]) => void): this {
    return this.on(event, listener);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}
