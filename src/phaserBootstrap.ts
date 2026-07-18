import Phaser from "phaser";
import {
  GameplayV2HudScene,
  GameplayV2Scene,
} from "./adapters/phaser";

export function createPhaserGame(): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#050b12",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: { antialias: true },
    scene: [GameplayV2Scene, GameplayV2HudScene],
  });
}
