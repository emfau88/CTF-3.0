import Phaser from "phaser";
import type { WorldSnapshot } from "../../core";
import {
  advancePremiumMapLightState,
  createPremiumMapLightState,
  getPremiumMapLighting,
  type PremiumMapLightingConfig,
  type PremiumMapLightState,
} from "../../premiumMapLighting";

const FIXTURE_DEPTH = -1;
const GLOW_DEPTH = -1.12;

export class PhaserPremiumMapLighting {
  private readonly config?: PremiumMapLightingConfig;
  private readonly views: Phaser.GameObjects.Image[] = [];
  private readonly graphics?: Phaser.GameObjects.Graphics;
  private states: PremiumMapLightState[] = [];
  private lastSnapshotTimeMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    mapId: string,
  ) {
    this.config = getPremiumMapLighting(mapId);
    if (!this.config) return;
    this.graphics = scene.add.graphics().setDepth(GLOW_DEPTH);
    this.states = this.config.positions.map(() =>
      createPremiumMapLightState()
    );
    for (const position of this.config.positions) {
      this.views.push(
        scene.add.image(position.x, position.y, this.config.assetKey)
          .setDisplaySize(this.config.displaySize, this.config.displaySize)
          .setDepth(FIXTURE_DEPTH),
      );
    }
  }

  render(snapshot: WorldSnapshot): void {
    if (!this.config || !this.graphics) return;
    const deltaMs = this.lastSnapshotTimeMs > 0
      ? snapshot.timeMs - this.lastSnapshotTimeMs
      : 0;
    this.lastSnapshotTimeMs = snapshot.timeMs;
    this.graphics.clear();
    for (const [index, position] of this.config.positions.entries()) {
      const projectileNear = snapshot.projectiles.some((projectile) => {
        const dx = projectile.position.x - position.x;
        const dy = projectile.position.y - position.y;
        return dx * dx + dy * dy <= this.config!.interactionRadius ** 2;
      });
      const state = advancePremiumMapLightState(
        this.states[index] ?? createPremiumMapLightState(),
        deltaMs,
        projectileNear,
      );
      this.states[index] = state;
      this.renderLight(index, position, state, snapshot.timeMs);
    }
  }

  reset(): void {
    this.lastSnapshotTimeMs = 0;
    this.states = this.states.map(() => createPremiumMapLightState());
    this.graphics?.clear();
    if (!this.config) return;
    for (const [index, view] of this.views.entries()) {
      const position = this.config.positions[index]!;
      const scale = this.config.displaySize / view.width;
      view
        .setPosition(position.x, position.y)
        .setScale(scale)
        .setRotation(0)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  dispose(): void {
    for (const view of this.views) view.destroy();
    this.graphics?.destroy();
  }

  private renderLight(
    index: number,
    position: Readonly<{ x: number; y: number }>,
    state: Readonly<PremiumMapLightState>,
    timeMs: number,
  ): void {
    if (!this.config || !this.graphics) return;
    const view = this.views[index];
    if (!view) return;
    const time = timeMs / 1_000;
    const phase = time * 2.15 + index * 1.37;
    const dimmed = state.dimRemainingMs > 0;
    const recovery = dimmed
      ? Phaser.Math.Clamp(1 - state.dimRemainingMs / 1_150, 0, 1)
      : 1;
    const flicker = Math.sin(phase * 3.7) * .025 +
      Math.sin(phase * 7.9) * .012;
    const energy = dimmed ? recovery * .28 : .86 + flicker;
    const baseScale = this.config.displaySize / view.width;
    view
      .setScale(baseScale * (1 + Math.sin(phase) * .012))
      .setRotation(Math.sin(phase * .43) * .008)
      .setAlpha(dimmed ? .58 + recovery * .25 : .98);
    this.graphics
      .fillStyle(this.config.glowColor, Math.max(0, energy) * .055)
      .fillCircle(
        position.x,
        position.y,
        this.config.glowRadius + Math.sin(phase) * 3,
      )
      .lineStyle(1.5, this.config.glowColor, Math.max(0, energy) * .18)
      .strokeCircle(
        position.x,
        position.y,
        this.config.glowRadius * .55 + Math.sin(phase * 1.3) * 2,
      );
    if (!dimmed || state.dimRemainingMs < 750) return;
    for (let spark = 0; spark < 3; spark += 1) {
      const sparkPhase = phase * 2.4 + spark * 2.1;
      const radius = 22 + ((timeMs / 18 + spark * 11) % 17);
      this.graphics
        .fillStyle(this.config.glowColor, .28)
        .fillCircle(
          position.x + Math.cos(sparkPhase) * radius,
          position.y + Math.sin(sparkPhase) * radius,
          1.2,
        );
    }
  }
}
