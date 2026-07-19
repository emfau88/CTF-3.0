import Phaser from "phaser";
import {
  sampleWorldMapClearance,
  WORLD_MAP_ACTOR_RADIUS,
  type ActorId,
  type ProjectileId,
  type ProjectileState,
  type WorldMapData,
  type WorldSnapshot,
} from "../../core";
import { renderArena } from "../../arenaRenderer";
import type { ArenaPresentationData } from "../../arenaPresentation";
import type { RendererPort } from "../rendering";
import type { V2PlayerSkinId } from "../../v2Route";
import { PhaserArenaActorRenderer } from "./PhaserArenaActorRenderer";
import type { V2CharacterRosterPresentation } from "./v2CharacterPresentation";
import { PhaserArenaCameraController } from "./PhaserArenaCameraController";
import { PhaserArenaObjectiveRenderer } from "./PhaserArenaObjectiveRenderer";
import {
  PhaserArenaPickupRenderer,
  pickupPadColor,
} from "./PhaserArenaPickupRenderer";
import { PhaserPremiumMapCosmetics } from "./PhaserPremiumMapCosmetics";
import { PhaserPremiumMapLighting } from "./PhaserPremiumMapLighting";

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

export type ArenaCollisionDiagnostics = "off" | "solids" | "heatmap";

export class PhaserArenaRendererPort implements RendererPort {
  private readonly projectileViews =
    new Map<ProjectileId, Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image>();
  private readonly projectileChargeGraphics: Phaser.GameObjects.Graphics;
  private readonly actorRenderer: PhaserArenaActorRenderer;
  private readonly cameraController: PhaserArenaCameraController;
  private readonly pickupRenderer: PhaserArenaPickupRenderer;
  private readonly objectiveRenderer: PhaserArenaObjectiveRenderer;
  private readonly premiumMapCosmetics: PhaserPremiumMapCosmetics;
  private readonly premiumMapLighting: PhaserPremiumMapLighting;
  private readonly spawnPadParticleGraphics: Phaser.GameObjects.Graphics;
  private readonly libraryDustGraphics?: Phaser.GameObjects.Graphics;
  private readonly libraryDust: LibraryDustParticle[] = [];
  private readonly collisionDiagnosticGraphics?: Phaser.GameObjects.Graphics;
  private readonly collisionDiagnosticViews: Phaser.GameObjects.GameObject[] = [];
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
    collisionDiagnostics: ArenaCollisionDiagnostics = "off",
    rosterPresentation?: V2CharacterRosterPresentation,
  ) {
    this.cameraController = new PhaserArenaCameraController(
      scene,
      followActorId,
      enableManualCamera,
      cameraZoom,
    );
    this.actorRenderer = new PhaserArenaActorRenderer(
      scene,
      playerSkinId,
      rosterPresentation,
    );
    this.pickupRenderer = new PhaserArenaPickupRenderer(scene);
    this.objectiveRenderer = new PhaserArenaObjectiveRenderer(scene);
    const level = toPresentationLevel(map);
    if (map.presentation.theme === "library") {
      ensureLibraryCandleAnimation(scene);
    }
    renderArena(scene, level, (x, y) => this.addLibraryCandles(x, y));
    this.premiumMapCosmetics = new PhaserPremiumMapCosmetics(scene, map.id);
    this.premiumMapLighting = new PhaserPremiumMapLighting(scene, map.id);
    if (collisionDiagnostics !== "off") {
      this.collisionDiagnosticGraphics = scene.add.graphics().setDepth(88);
      this.renderCollisionDiagnostics(
        map,
        collisionDiagnostics,
        this.collisionDiagnosticGraphics,
      );
    }
    if (map.presentation.theme === "library") {
      this.libraryDustGraphics = scene.add.graphics().setDepth(8);
      this.libraryDust.push(...createLibraryDust(map));
      this.addLibrarySpiders(map);
    }
    this.spawnPadParticleGraphics = scene.add.graphics().setDepth(19);
    this.projectileChargeGraphics = scene.add.graphics().setDepth(51);
  }

  render(snapshot: WorldSnapshot): void {
    this.cameraController.update(snapshot);
    this.premiumMapCosmetics.render(snapshot);
    this.premiumMapLighting.render(snapshot);
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
    this.premiumMapCosmetics.reset();
    this.premiumMapLighting.reset();
    this.actorRenderer.reset();
    this.destroyProjectileViews();
    this.projectileChargeGraphics.clear();
    this.pickupRenderer.reset();
    this.objectiveRenderer.reset();
    this.resetSpawnPadParticles();
  }

  dispose(): void {
    this.cameraController.dispose();
    this.premiumMapCosmetics.dispose();
    this.premiumMapLighting.dispose();
    this.actorRenderer.dispose();
    this.destroyProjectileViews();
    this.projectileChargeGraphics.destroy();
    this.pickupRenderer.dispose();
    this.objectiveRenderer.dispose();
    this.spawnPadParticleGraphics.destroy();
    this.libraryDustGraphics?.destroy();
    this.collisionDiagnosticGraphics?.destroy();
    for (const view of this.collisionDiagnosticViews) {
      view.destroy();
    }
  }

  private renderCollisionDiagnostics(
    map: WorldMapData,
    mode: Exclude<ArenaCollisionDiagnostics, "off">,
    graphics: Phaser.GameObjects.Graphics,
  ): void {
    const radius = WORLD_MAP_ACTOR_RADIUS;
    if (mode === "heatmap") {
      const step = 22;
      for (const sample of sampleWorldMapClearance(map, {
        actorRadius: radius,
        step,
      })) {
        if (sample.band === "open") continue;
        graphics.fillStyle(
          sample.band === "blocked" ? 0xff3155 : 0xffc83d,
          sample.band === "blocked" ? .22 : .14,
        ).fillRect(
          sample.position.x - step / 2,
          sample.position.y - step / 2,
          step,
          step,
        );
      }
    }

    const bounds = map.geometry.bounds;
    graphics.lineStyle(3, 0x38e8ff, .9).strokeRect(
      bounds.minX + radius,
      bounds.minY + radius,
      bounds.maxX - bounds.minX - radius * 2,
      bounds.maxY - bounds.minY - radius * 2,
    );

    for (const solid of map.geometry.solids) {
      graphics.fillStyle(0xff3155, .12).fillRoundedRect(
        solid.x - radius,
        solid.y - radius,
        solid.width + radius * 2,
        solid.height + radius * 2,
        radius,
      );
      graphics.lineStyle(2, 0xff3155, .95).strokeRect(
        solid.x,
        solid.y,
        solid.width,
        solid.height,
      );
      const label = this.scene.add.text(
        solid.x + 4,
        solid.y + 4,
        solid.id,
        {
          backgroundColor: "rgba(32, 4, 12, .78)",
          color: "#fff0f3",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: { x: 3, y: 2 },
        },
      ).setDepth(89);
      this.collisionDiagnosticViews.push(label);
    }

    for (const gap of map.geometry.gaps) {
      graphics.fillStyle(0x25c7ff, .18).fillRect(
        gap.x,
        gap.y,
        gap.width,
        gap.height,
      );
      graphics.lineStyle(2, 0x25c7ff, .95).strokeRect(
        gap.x,
        gap.y,
        gap.width,
        gap.height,
      );
    }

    const legend = this.scene.add.text(
      12,
      58,
      mode === "heatmap"
        ? "CLEARANCE: ROT = BLOCKIERT · GELB = ENG · LINIE = ROHE KOLLISION"
        : "KOLLISION: ROTFLÄCHE = EFFEKTIVE SPIELER-SPERRZONE · LINIE = ROH",
      {
        backgroundColor: "rgba(4, 14, 20, .86)",
        color: "#e9fbff",
        fontFamily: "monospace",
        fontSize: "13px",
        padding: { x: 8, y: 6 },
      },
    ).setDepth(120).setScrollFactor(0);
    this.collisionDiagnosticViews.push(legend);
  }

  private renderProjectiles(snapshot: WorldSnapshot): void {
    this.projectileChargeGraphics.clear();
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
      this.renderGrenadeCharge(projectile);
      this.renderProjectile(projectile);
    }
  }

  private renderProjectile(projectile: Readonly<ProjectileState>): void {
    const color = projectileColor(projectile);
    const view = this.projectileViews.get(projectile.id) ??
      this.createProjectileView(projectile, color);
    view
      .setPosition(
        projectile.position.x,
        projectile.position.y - (projectile.visualHeight ?? 0),
      )
      .setRotation(
        projectile.weaponId === "disc"
          ? this.scene.time.now * .018
          : projectile.weaponId === "grenade"
          ? this.scene.time.now * .0045
          : Math.atan2(projectile.velocity.y, projectile.velocity.x),
      );
    if (view instanceof Phaser.GameObjects.Ellipse) {
      const size = projectileDisplaySize(projectile);
      view.setDisplaySize(size.width, size.height);
      view.setFillStyle(color, .98);
    } else if (projectile.weaponId === "rocket") {
      view.setScale(.46);
    } else if (projectile.weaponId === "pulse") {
      view.setDisplaySize(34, 34);
    } else if (projectile.weaponId === "grenade") {
      const charge = grenadeChargeProgress(projectile);
      view
        .setDisplaySize(32 + charge * 8, 32 + charge * 8)
        .setAlpha(.94 + charge * .06);
      if (charge > .62) {
        view.setTint(0xe7f8ff);
      } else {
        view.clearTint();
      }
    } else {
      view.setDisplaySize(40, 40);
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
    if (projectile.weaponId === "pulse") {
      return this.scene.add.image(
        projectile.position.x,
        projectile.position.y,
        "pulseProjectile",
      ).setDisplaySize(34, 34).setDepth(52);
    }
    if (projectile.weaponId === "disc") {
      return this.scene.add.image(
        projectile.position.x,
        projectile.position.y,
        "discProjectile",
      ).setDisplaySize(40, 40).setDepth(52);
    }
    if (projectile.weaponId === "grenade") {
      return this.scene.add.image(
        projectile.position.x,
        projectile.position.y,
        "grenadeProjectile",
      ).setDisplaySize(32, 32).setDepth(52);
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

  private renderGrenadeCharge(
    projectile: Readonly<ProjectileState>,
  ): void {
    const charge = grenadeChargeProgress(projectile);
    if (charge <= 0) return;
    const pulse = .72 + Math.sin(this.scene.time.now * .018) * .28;
    const radius = 17 + charge * 14;
    this.projectileChargeGraphics
      .fillStyle(0x55cfff, (.07 + charge * .12) * pulse)
      .fillCircle(projectile.position.x, projectile.position.y, radius)
      .fillStyle(0xf3fdff, (.16 + charge * .34) * pulse)
      .fillCircle(
        projectile.position.x,
        projectile.position.y,
        5 + charge * 5,
      )
      .lineStyle(2, 0xaeeaff, (.28 + charge * .48) * pulse)
      .strokeCircle(
        projectile.position.x,
        projectile.position.y,
        13 + charge * 12,
      );
    if (charge < .55) return;
    const rotation = this.scene.time.now * .006;
    for (let index = 0; index < 4; index += 1) {
      const angle = rotation + index * Math.PI / 2;
      const inner = 11 + charge * 8;
      const outer = inner + 5 + charge * 7;
      this.projectileChargeGraphics.lineBetween(
        projectile.position.x + Math.cos(angle) * inner,
        projectile.position.y + Math.sin(angle) * inner,
        projectile.position.x + Math.cos(angle) * outer,
        projectile.position.y + Math.sin(angle) * outer,
      );
    }
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

function projectileColor(projectile: Readonly<ProjectileState>): number {
  if (projectile.weaponId === "pulse") return 0x35d9ff;
  if (projectile.weaponId === "disc") return 0xffd34a;
  if (projectile.weaponId === "grenade") return 0x79caff;
  if (projectile.weaponId === "shard") return 0xc674ff;
  return projectile.teamId === "blue" ? 0x79a9ff : 0xff806f;
}

function grenadeChargeProgress(
  projectile: Readonly<ProjectileState>,
): number {
  const lob = projectile.lob;
  if (projectile.weaponId !== "grenade" || !lob?.landed) return 0;
  return Phaser.Math.Clamp(
    (lob.elapsedMs - lob.flightMs) / Math.max(1, lob.fuseMs),
    .001,
    1,
  );
}

function projectileDisplaySize(
  projectile: Readonly<ProjectileState>,
): Readonly<{ width: number; height: number }> {
  if (projectile.weaponId === "disc") {
    return { width: projectile.radius * 2.4, height: projectile.radius * .75 };
  }
  if (projectile.weaponId === "grenade") {
    return { width: projectile.radius * 2, height: projectile.radius * 2 };
  }
  if (projectile.weaponId === "shard") {
    return { width: projectile.radius * 3.5, height: projectile.radius * .8 };
  }
  return { width: projectile.radius * 2.7, height: projectile.radius * .9 };
}

function toPresentationLevel(map: WorldMapData): ArenaPresentationData {
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
