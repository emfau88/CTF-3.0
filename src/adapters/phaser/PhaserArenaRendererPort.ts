import Phaser from "phaser";
import type {
  ActorId,
  ProjectileId,
  ProjectileState,
  WorldMapData,
  WorldSnapshot,
} from "../../core";
import { renderArena } from "../../arenaRenderer";
import type { LevelData } from "../../level";
import type { RendererPort } from "../rendering";
import type { V2PlayerSkinId } from "../../v2Route";
import { PhaserArenaActorRenderer } from "./PhaserArenaActorRenderer";
import { PhaserArenaCameraController } from "./PhaserArenaCameraController";
import { PhaserArenaObjectiveRenderer } from "./PhaserArenaObjectiveRenderer";
import {
  PhaserArenaPickupRenderer,
  pickupPadColor,
} from "./PhaserArenaPickupRenderer";

interface SpawnPadParticle {
  x: number;
  y: number;
  offsetX: number;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  color: number;
}

interface LibraryDustParticle {
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  size: number;
  alpha: number;
}

export class PhaserArenaRendererPort implements RendererPort {
  private readonly projectileViews =
    new Map<ProjectileId, Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image>();
  private readonly actorRenderer: PhaserArenaActorRenderer;
  private readonly cameraController: PhaserArenaCameraController;
  private readonly pickupRenderer: PhaserArenaPickupRenderer;
  private readonly objectiveRenderer: PhaserArenaObjectiveRenderer;
  private readonly spawnPadParticleGraphics: Phaser.GameObjects.Graphics;
  private readonly libraryDustGraphics?: Phaser.GameObjects.Graphics;
  private readonly libraryDust: LibraryDustParticle[] = [];
  private spawnPadParticles: SpawnPadParticle[] = [];
  private spawnPadParticleTimerMs = 0;
  private lastRenderTimeMs = 0;
  private lastLibraryTimeMs = 0;
  constructor(
    private readonly scene: Phaser.Scene,
    map: WorldMapData,
    private readonly followActorId?: ActorId,
    private readonly playerSkinId: V2PlayerSkinId = "alien-runner",
    enableManualCamera = false,
    cameraZoom = 1,
  ) {
    this.cameraController = new PhaserArenaCameraController(
      scene,
      followActorId,
      enableManualCamera,
      cameraZoom,
    );
    this.actorRenderer = new PhaserArenaActorRenderer(scene, playerSkinId);
    this.pickupRenderer = new PhaserArenaPickupRenderer(scene);
    this.objectiveRenderer = new PhaserArenaObjectiveRenderer(scene);
    const level = toPresentationLevel(map);
    ensureLibraryCandleAnimation(scene);
    renderArena(scene, level, (x, y) => this.addLibraryCandles(x, y));
    if (map.presentation.theme === "library") {
      this.libraryDustGraphics = scene.add.graphics().setDepth(8);
      this.libraryDust.push(...createLibraryDust(map));
      this.addLibrarySpiders(map);
    }
    this.spawnPadParticleGraphics = scene.add.graphics().setDepth(19);
  }

  render(snapshot: WorldSnapshot): void {
    this.cameraController.update(snapshot);
    this.actorRenderer.render(snapshot);
    this.renderProjectiles(snapshot);
    this.pickupRenderer.render(snapshot);
    this.objectiveRenderer.render(snapshot);
    this.renderSpawnPadParticles(snapshot);
    this.renderLibraryAtmosphere(snapshot.timeMs);
  }

  reset(): void {
    this.cameraController.reset();
    this.lastLibraryTimeMs = 0;
    this.actorRenderer.reset();
    this.destroyProjectileViews();
    this.pickupRenderer.reset();
    this.objectiveRenderer.reset();
    this.resetSpawnPadParticles();
  }

  dispose(): void {
    this.cameraController.dispose();
    this.actorRenderer.dispose();
    this.destroyProjectileViews();
    this.pickupRenderer.dispose();
    this.objectiveRenderer.dispose();
    this.spawnPadParticleGraphics.destroy();
    this.libraryDustGraphics?.destroy();
  }

  private renderProjectiles(snapshot: WorldSnapshot): void {
    const visibleIds = new Set(
      snapshot.projectiles.map((projectile) => projectile.id),
    );
    for (const [projectileId, view] of this.projectileViews) {
      if (!visibleIds.has(projectileId)) {
        view.destroy();
        this.projectileViews.delete(projectileId);
      }
    }
    for (const projectile of snapshot.projectiles) {
      this.renderProjectile(projectile);
    }
  }

  private renderProjectile(projectile: Readonly<ProjectileState>): void {
    const color = projectile.teamId === "blue" ? 0x79a9ff : 0xff806f;
    const view = this.projectileViews.get(projectile.id) ??
      this.createProjectileView(projectile, color);
    view
      .setPosition(projectile.position.x, projectile.position.y)
      .setRotation(Math.atan2(projectile.velocity.y, projectile.velocity.x));
    if (view instanceof Phaser.GameObjects.Ellipse) {
      view.setDisplaySize(projectile.radius * 2.7, projectile.radius * .9);
      view.setFillStyle(color, .98);
    } else {
      view.setScale(.46);
    }
    this.projectileViews.set(projectile.id, view);
  }

  private createProjectileView(
    projectile: Readonly<ProjectileState>,
    color: number,
  ): Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image {
    if (projectile.weaponId === "rocket") {
      return this.scene.add.image(
        projectile.position.x,
        projectile.position.y,
        "rocketProjectile",
        2,
      ).setScale(.46).setDepth(52);
    }
    return this.scene.add.ellipse(
      projectile.position.x,
      projectile.position.y,
      projectile.radius * 2.7,
      projectile.radius * .9,
      color,
      .98,
    ).setDepth(52);
  }

  private destroyProjectileViews(): void {
    for (const view of this.projectileViews.values()) {
      view.destroy();
    }
    this.projectileViews.clear();
  }

  private renderSpawnPadParticles(snapshot: WorldSnapshot): void {
    const now = this.scene.time.now;
    const deltaMs = this.lastRenderTimeMs > 0
      ? Math.min(100, Math.max(0, now - this.lastRenderTimeMs))
      : 0;
    this.lastRenderTimeMs = now;
    this.spawnPadParticleTimerMs -= deltaMs;
    if (this.spawnPadParticleTimerMs <= 0) {
      this.spawnPadParticleTimerMs = 95;
      for (const pickup of snapshot.pickups) {
        if (pickup.lifeState !== "active") continue;
        const lifeMs = Phaser.Math.Between(620, 920);
        this.spawnPadParticles.push({
          x: pickup.position.x + Phaser.Math.Between(-14, 14),
          y: pickup.position.y - 2 + Phaser.Math.Between(-4, 7),
          offsetX: Phaser.Math.FloatBetween(-8, 8),
          lifeMs,
          maxLifeMs: lifeMs,
          size: Phaser.Math.FloatBetween(2.2, 4.2),
          color: pickupPadColor(pickup.type),
        });
      }
    }
    for (const particle of this.spawnPadParticles) {
      particle.lifeMs -= deltaMs;
    }
    this.spawnPadParticles = this.spawnPadParticles.filter(
      (particle) => particle.lifeMs > 0,
    );

    const graphics = this.spawnPadParticleGraphics;
    graphics.clear();
    for (const particle of this.spawnPadParticles) {
      const progress = 1 - particle.lifeMs / particle.maxLifeMs;
      const alpha = Phaser.Math.Clamp(
        particle.lifeMs / particle.maxLifeMs,
        0,
        1,
      ) * .45;
      graphics.fillStyle(particle.color, alpha).fillCircle(
        particle.x + particle.offsetX * progress,
        particle.y - progress * 34,
        particle.size * (1 - progress * .35),
      );
    }
  }

  private resetSpawnPadParticles(): void {
    this.spawnPadParticles = [];
    this.spawnPadParticleTimerMs = 0;
    this.lastRenderTimeMs = 0;
    this.spawnPadParticleGraphics.clear();
  }

  private addLibraryCandles(x: number, y: number): void {
    const points = [{ x: 0, y: -14 }, { x: 7, y: -4 }, { x: -7, y: -4 }];
    for (const [index, point] of points.entries()) {
      const flameX = x + point.x;
      const flameY = y + point.y - 6;
      const glow = this.scene.add.circle(
        flameX,
        flameY + 1,
        15,
        0xffc45a,
        .13,
      ).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
      const flame = this.scene.add.sprite(
        flameX,
        flameY,
        "libraryCandleFlame",
      ).setDisplaySize(12, 12)
        .setDepth(4)
        .play({ key: "library-candle-flicker", startFrame: index * 2 });
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: .08, to: .18 },
        duration: 180 + index * 45,
        yoyo: true,
        repeat: -1,
      });
      this.scene.tweens.add({
        targets: flame,
        alpha: { from: index === 1 ? .72 : .88, to: 1 },
        duration: 160 + index * 40,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private addLibrarySpiders(map: WorldMapData): void {
    const width = map.geometry.bounds.maxX - map.geometry.bounds.minX;
    const routes = [
      { x: 420, y: 142, dx: 42, dy: 8, flip: false },
      { x: width - 420, y: 684, dx: -38, dy: -6, flip: true },
    ];
    for (const [index, route] of routes.entries()) {
      const spider = this.scene.add.image(route.x, route.y, "librarySpider")
        .setDisplaySize(18, 18)
        .setFlipX(route.flip)
        .setAlpha(.82)
        .setDepth(3);
      this.scene.tweens.add({
        targets: spider,
        x: route.x + route.dx,
        y: route.y + route.dy,
        angle: route.flip ? -8 : 8,
        duration: 3800 + index * 700,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
        hold: 900 + index * 500,
        repeatDelay: 1200,
      });
    }
  }

  private renderLibraryAtmosphere(timeMs: number): void {
    if (!this.libraryDustGraphics) {
      return;
    }
    const deltaMs = this.lastLibraryTimeMs > 0
      ? Math.max(0, timeMs - this.lastLibraryTimeMs)
      : 0;
    this.lastLibraryTimeMs = timeMs;
    const dt = Math.min(deltaMs, 100) / 1000;
    const bounds = this.scene.cameras.main.getBounds();
    for (const dust of this.libraryDust) {
      dust.phase += dt * .7;
      dust.y -= dust.speed * dt;
      dust.x += Math.sin(dust.phase) * dust.drift * dt;
      if (dust.y < 55) {
        dust.y = bounds.height - 55;
        dust.x = Phaser.Math.Between(270, bounds.width - 270);
      }
    }
    this.libraryDustGraphics.clear();
    for (const dust of this.libraryDust) {
      const pulse = .72 + Math.sin(dust.phase * 1.7) * .28;
      this.libraryDustGraphics.fillStyle(
        0xffe8b0,
        dust.alpha * pulse,
      ).fillCircle(dust.x, dust.y, dust.size);
    }
  }

}

function toPresentationLevel(map: WorldMapData): LevelData {
  const bounds = map.geometry.bounds;
  const redSpawn = map.spawnPoints.find((spawn) =>
    spawn.id === "red-player-spawn"
  )?.position ?? map.diagnosticSpawn;
  const blueSpawn = map.spawnPoints.find((spawn) =>
    spawn.id === "blue-player-spawn"
  )?.position ?? map.diagnosticSpawn;
  const rect = (
    value: { x: number; y: number; width: number; height: number },
  ) => ({
    x: value.x,
    y: value.y,
    w: value.width,
    h: value.height,
  });
  return {
    id: map.id,
    name: map.displayName,
    plan: map.presentation.plan,
    theme: map.presentation.theme,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    redSpawn: { ...redSpawn },
    blueSpawn: { ...blueSpawn },
    redBase: rect(map.gameplay.redBase),
    blueBase: rect(map.gameplay.blueBase),
    walls: map.presentation.walls.map((wall) => ({
      ...rect(wall),
      visual: wall.visual,
    })),
    gaps: map.presentation.gaps.map((gap) => ({
      ...rect(gap),
      visual: gap.visual,
    })),
    decorations: map.presentation.decorations?.map((decoration) => ({
      ...rect(decoration),
      kind: decoration.kind,
    })),
    combatZone: map.gameplay.combatZone
      ? rect(map.gameplay.combatZone)
      : undefined,
    pickups: map.pickupSpawns.map((pickup) => ({
      kind: pickup.type,
      x: pickup.position.x,
      y: pickup.position.y,
    })),
    botRoutes: {
      attacker: map.presentation.botRoutes.attacker.map((point) => ({
        ...point,
      })),
      defender: map.presentation.botRoutes.defender.map((point) => ({
        ...point,
      })),
    },
  };
}

function createLibraryDust(map: WorldMapData): LibraryDustParticle[] {
  const width = map.geometry.bounds.maxX - map.geometry.bounds.minX;
  const height = map.geometry.bounds.maxY - map.geometry.bounds.minY;
  return Array.from({ length: 34 }, (_, index) => ({
    x: Phaser.Math.Between(270, width - 270),
    y: Phaser.Math.Between(70, height - 70),
    speed: Phaser.Math.FloatBetween(3.5, 8),
    drift: Phaser.Math.FloatBetween(2, 7) * (index % 2 ? 1 : -1),
    phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    size: Phaser.Math.FloatBetween(.8, 1.8),
    alpha: Phaser.Math.FloatBetween(.08, .2),
  }));
}

function ensureLibraryCandleAnimation(scene: Phaser.Scene): void {
  if (scene.anims.exists("library-candle-flicker")) {
    return;
  }
  scene.anims.create({
    key: "library-candle-flicker",
    frames: scene.anims.generateFrameNumbers("libraryCandleFlame", {
      start: 0,
      end: 5,
    }),
    frameRate: 10,
    repeat: -1,
    yoyo: true,
  });
}
