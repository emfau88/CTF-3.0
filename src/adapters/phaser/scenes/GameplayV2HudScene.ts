import Phaser from "phaser";

export const GAMEPLAY_V2_HUD_SCENE_KEY = "GameplayV2HudScene";

/**
 * Dedicated screen-space layer for V2 HUD and touch controls.
 *
 * The arena camera may zoom and scroll to frame the world. This parallel scene
 * never does either, so its coordinates always match CSS viewport pixels.
 */
export class GameplayV2HudScene extends Phaser.Scene {
  constructor() {
    super({ key: GAMEPLAY_V2_HUD_SCENE_KEY, active: false });
  }

  create(): void {
    this.resetScreenCamera(this.scale.gameSize);
    this.scale.on("resize", this.resetScreenCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private resetScreenCamera(gameSize: Phaser.Structs.Size): void {
    this.cameras.main
      .setViewport(0, 0, gameSize.width, gameSize.height)
      .setScroll(0, 0)
      .setZoom(1)
      .setRoundPixels(false);
  }

  private shutdown(): void {
    this.scale.off("resize", this.resetScreenCamera, this);
  }
}
