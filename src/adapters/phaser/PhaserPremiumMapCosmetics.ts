import Phaser from "phaser";
import type { WorldSnapshot } from "../../core";
import {
  advancePremiumMapCosmeticState,
  createPremiumMapCosmeticState,
  getPremiumMapCosmetic,
  type PremiumMapCosmeticConfig,
  type PremiumMapCosmeticState,
} from "../../premiumMapCosmetics";

const COSMETIC_DEPTH = -1.05;
const COSMETIC_GRAPHICS_DEPTH = -1.1;

export class PhaserPremiumMapCosmetics {
  private readonly config?: PremiumMapCosmeticConfig;
  private readonly view?: Phaser.GameObjects.Image;
  private readonly graphics?: Phaser.GameObjects.Graphics;
  private state = createPremiumMapCosmeticState();
  private lastSnapshotTimeMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    mapId: string,
  ) {
    this.config = getPremiumMapCosmetic(mapId);
    if (!this.config) {
      return;
    }
    this.graphics = scene.add.graphics().setDepth(COSMETIC_GRAPHICS_DEPTH);
    this.view = scene.add.image(
      this.config.position.x,
      this.config.position.y,
      this.config.assetKey,
    )
      .setDisplaySize(this.config.displaySize, this.config.displaySize)
      .setDepth(COSMETIC_DEPTH);
  }

  render(snapshot: WorldSnapshot): void {
    if (!this.config || !this.view || !this.graphics) {
      return;
    }
    const deltaMs = this.lastSnapshotTimeMs > 0
      ? snapshot.timeMs - this.lastSnapshotTimeMs
      : 0;
    this.lastSnapshotTimeMs = snapshot.timeMs;
    this.state = advancePremiumMapCosmeticState(
      this.state,
      this.config,
      deltaMs,
      hasNearbyActivity(snapshot, this.config),
    );
    this.graphics.clear();
    if (this.config.kind === "curious-bloom") {
      this.renderCuriousBloom();
      return;
    }
    this.renderGrumpyFrog();
  }

  reset(): void {
    this.state = createPremiumMapCosmeticState();
    this.lastSnapshotTimeMs = 0;
    this.graphics?.clear();
    if (!this.config || !this.view) {
      return;
    }
    const scale = this.baseScale;
    this.view
      .setPosition(this.config.position.x, this.config.position.y)
      .setScale(scale)
      .setRotation(0)
      .setAlpha(1)
      .setVisible(true);
  }

  dispose(): void {
    this.view?.destroy();
    this.graphics?.destroy();
  }

  private renderCuriousBloom(): void {
    if (!this.config || !this.view || !this.graphics) {
      return;
    }
    const { x, y } = this.config.position;
    const baseScale = this.baseScale;
    const idle = this.state.elapsedMs / 1_000;
    const reactionProgress = this.reactionProgress;
    const startled = this.state.reactionRemainingMs > 0
      ? Math.sin(Math.min(1, reactionProgress * 1.45) * Math.PI)
      : 0;
    const breathe = 1 + Math.sin(idle * 2.4) * .025;
    const squashX = breathe * (1 + startled * .12);
    const squashY = breathe * (1 - startled * .34);
    this.view
      .setPosition(x, y + startled * 12 + Math.sin(idle * 1.6) * 1.5)
      .setScale(baseScale * squashX, baseScale * squashY)
      .setRotation(Math.sin(idle * 1.15) * .035 + startled * .055)
      .setAlpha(1 - startled * .16);

    const glowPulse = .055 + (Math.sin(idle * 2.8) + 1) * .018;
    this.graphics
      .fillStyle(0x5fffe0, glowPulse * (1 - startled * .5))
      .fillCircle(x, y + 3, 47 + Math.sin(idle * 2.1) * 3);
    for (let index = 0; index < 4; index += 1) {
      const phase = idle * .7 + index * 1.55;
      const moteX = x + Math.sin(phase * 1.4) * (34 + index * 3);
      const moteY = y + 23 - ((idle * (8 + index)) % 48);
      this.graphics
        .fillStyle(0x9dffe8, .2 + Math.sin(phase) * .07)
        .fillCircle(moteX, moteY, 1.5 + index * .22);
    }
  }

  private renderGrumpyFrog(): void {
    if (!this.config || !this.view || !this.graphics) {
      return;
    }
    const { x, y } = this.config.position;
    const baseScale = this.baseScale;
    const idle = this.state.elapsedMs / 1_000;
    const elapsedReactionMs = this.elapsedReactionMs;
    let offsetY = Math.sin(idle * 1.55) * 1.2;
    let scale = 1 + Math.sin(idle * 2.1) * .012;
    let alpha = 1;
    let rotation = Math.sin(idle * .9) * .018;

    if (this.state.reactionRemainingMs > 0) {
      const returnDelayMs = this.config.reactionReturnDelayMs ?? 1_520;
      if (elapsedReactionMs < 180) {
        const progress = elapsedReactionMs / 180;
        offsetY -= Math.sin(progress * Math.PI) * 20;
        scale += Math.sin(progress * Math.PI) * .1;
        rotation = Math.sin(progress * Math.PI * 2) * .07;
      } else if (elapsedReactionMs < 520) {
        const progress = easeIn((elapsedReactionMs - 180) / 340);
        offsetY += progress * 42;
        scale = 1 - progress * .78;
        alpha = 1 - progress;
      } else if (elapsedReactionMs < returnDelayMs) {
        offsetY = 42;
        scale = .2;
        alpha = 0;
      } else {
        const progress = easeOut(
          (elapsedReactionMs - returnDelayMs) /
            (this.config.reactionDurationMs - returnDelayMs),
        );
        offsetY = (1 - progress) * 42 -
          Math.sin(progress * Math.PI) * 12;
        scale = .2 + progress * .8;
        alpha = progress;
      }
      this.renderFrogRipples(elapsedReactionMs);
    }

    this.view
      .setPosition(x, y + offsetY)
      .setScale(baseScale * scale, baseScale * scale * (
        1 + Math.sin(idle * 2.1) * .018
      ))
      .setRotation(rotation)
      .setAlpha(alpha);
  }

  private renderFrogRipples(elapsedReactionMs: number): void {
    if (!this.config || !this.graphics) {
      return;
    }
    const { x, y } = this.config.position;
    const returnDelayMs = this.config.reactionReturnDelayMs ?? 1_520;
    for (const startMs of [170, returnDelayMs - 20]) {
      const progress = Phaser.Math.Clamp(
        (elapsedReactionMs - startMs) / 760,
        0,
        1,
      );
      if (progress <= 0 || progress >= 1) {
        continue;
      }
      this.graphics
        .lineStyle(2, 0xb5a568, (1 - progress) * .42)
        .strokeEllipse(x, y + 26, 22 + progress * 58, 7 + progress * 18)
        .lineStyle(1, 0x667d49, (1 - progress) * .28)
        .strokeEllipse(x, y + 26, 10 + progress * 38, 4 + progress * 12);
    }
  }

  private get baseScale(): number {
    if (!this.config || !this.view) {
      return 1;
    }
    return this.config.displaySize / this.view.width;
  }

  private get reactionProgress(): number {
    if (!this.config || this.state.reactionRemainingMs <= 0) {
      return 0;
    }
    return 1 -
      this.state.reactionRemainingMs / this.config.reactionDurationMs;
  }

  private get elapsedReactionMs(): number {
    if (!this.config || this.state.reactionRemainingMs <= 0) {
      return 0;
    }
    return this.config.reactionDurationMs -
      this.state.reactionRemainingMs;
  }
}

function hasNearbyActivity(
  snapshot: Readonly<WorldSnapshot>,
  config: Readonly<PremiumMapCosmeticConfig>,
): boolean {
  const radiusSquared = config.reactionRadius * config.reactionRadius;
  const isNear = (position: Readonly<{ x: number; y: number }>) => {
    const dx = position.x - config.position.x;
    const dy = position.y - config.position.y;
    return dx * dx + dy * dy <= radiusSquared;
  };
  return snapshot.actors.some((actor) =>
    actor.lifeState === "active" && isNear(actor.position)
  ) || snapshot.projectiles.some((projectile) =>
    isNear(projectile.position)
  );
}

function easeIn(value: number): number {
  const clamped = Phaser.Math.Clamp(value, 0, 1);
  return clamped * clamped;
}

function easeOut(value: number): number {
  const clamped = Phaser.Math.Clamp(value, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}
