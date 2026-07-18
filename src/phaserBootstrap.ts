import Phaser from "phaser";
import {
  GameplayV2HudScene,
  GameplayV2Scene,
} from "./adapters/phaser";
import { ArenaScene } from "./scenes/ArenaScene";

export function createPhaserGame(useGameplayV2Shell: boolean): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: useGameplayV2Shell ? "#050b12" : "#edf5ee",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    render: { antialias: true },
    scene: useGameplayV2Shell
      ? [GameplayV2Scene, GameplayV2HudScene]
      : [ArenaScene],
  });
}
