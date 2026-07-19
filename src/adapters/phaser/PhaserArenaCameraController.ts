import Phaser from "phaser";
import type { ActorId, WorldSnapshot } from "../../core";
import { calculateArenaFitZoom } from "./arenaCameraFit";

export const ARENA_CAMERA_RESET_KEY_CODE =
  Phaser.Input.Keyboard.KeyCodes.HOME;

export class PhaserArenaCameraController {
  private initialized = false;
  private manualActive = false;
  private lastTimeMs = 0;
  private readonly cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly resetKey?: Phaser.Input.Keyboard.Key;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly followActorId?: ActorId,
    enableManualCamera = false,
    private readonly requestedZoom = 1,
  ) {
    scene.cameras.main.setRoundPixels(false);
    if (enableManualCamera && scene.input.keyboard) {
      this.cursorKeys = scene.input.keyboard.createCursorKeys();
      this.resetKey = scene.input.keyboard.addKey(
        ARENA_CAMERA_RESET_KEY_CODE,
      );
    }
  }

  update(snapshot: WorldSnapshot): void {
    const bounds = snapshot.geometry.bounds;
    const camera = this.scene.cameras.main;
    camera.setZoom(calculateArenaFitZoom(
      camera.width,
      camera.height,
      bounds,
      this.requestedZoom,
    ));
    camera.setBounds(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    const deltaMs = this.lastTimeMs > 0
      ? Math.min(100, Math.max(0, snapshot.timeMs - this.lastTimeMs))
      : 0;
    this.lastTimeMs = snapshot.timeMs;
    if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.manualActive = false;
      this.initialized = false;
    }
    const manualX = Number(this.cursorKeys?.right?.isDown) -
      Number(this.cursorKeys?.left?.isDown);
    const manualY = Number(this.cursorKeys?.down?.isDown) -
      Number(this.cursorKeys?.up?.isDown);
    if (manualX !== 0 || manualY !== 0) this.manualActive = true;
    if (this.manualActive) {
      const length = Math.hypot(manualX, manualY) || 1;
      const distance = 650 * deltaMs / 1000;
      camera.setScroll(
        camera.scrollX + manualX / length * distance,
        camera.scrollY + manualY / length * distance,
      );
      return;
    }
    const requested = this.followActorId
      ? snapshot.actors.find((actor) =>
        actor.id === this.followActorId && actor.lifeState === "active"
      )
      : undefined;
    const activePlayers = snapshot.actors.filter((actor) =>
      actor.kind === "player" && actor.lifeState === "active"
    );
    const followed = requested
      ? [requested]
      : activePlayers.length > 0
      ? activePlayers
      : snapshot.actors.slice(0, 1);
    if (followed.length === 0) return;
    const centerX = followed.reduce(
      (sum, actor) => sum + actor.position.x,
      0,
    ) / followed.length;
    const centerY = followed.reduce(
      (sum, actor) => sum + actor.position.y,
      0,
    ) / followed.length;
    const targetScrollX = centerX - camera.width / (2 * camera.zoom);
    const targetScrollY = centerY - camera.height / (2 * camera.zoom);
    if (!this.initialized) {
      camera.centerOn(centerX, centerY);
      this.initialized = true;
      return;
    }
    camera.setScroll(
      Phaser.Math.Linear(camera.scrollX, targetScrollX, .12),
      Phaser.Math.Linear(camera.scrollY, targetScrollY, .12),
    );
  }

  reset(): void {
    this.initialized = false;
    this.manualActive = false;
    this.lastTimeMs = 0;
  }

  dispose(): void {
    for (const key of Object.values(this.cursorKeys ?? {})) key?.destroy();
    this.resetKey?.destroy();
  }
}
