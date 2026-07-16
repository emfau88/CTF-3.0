import Phaser from "phaser";
import type { ActorId, ActorState, WorldSnapshot } from "../../core";
import {
  V2_ACTOR_LIFECYCLE_CONFIG,
  V2_COLLISION_GROUNDWORK_CONFIG,
} from "../../core";
import type { V2PlayerSkinId } from "../../v2Route";
import { UI_FONT_FAMILY } from "../../uiTypography";
import { TEAM } from "../../config";
import { resolveCharacterIdlePose } from "./characterIdlePose";
import {
  FIGHTER_OUTLINE_OFFSETS,
  fighterRingSegments,
  PRIMARY_CONTROLLED_ACTOR_ID,
  TEAM_RING_GROUND_OFFSET_Y,
  type FighterRingSegment,
} from "./fighterReadability";
import {
  V2_CHARACTER_DIRECTIONS,
  V2_CHARACTER_SKINS,
  legacyArenaCharacterFrame,
  resolveV2CharacterPresentation,
  v2CharacterAnimationKey,
  v2CharacterAnimationState,
  v2CharacterColumns,
  v2CharacterDirection,
  v2CharacterDirectionRow,
  v2CharacterFrame,
  type V2CharacterAnimationState,
  type V2CharacterPresentation,
  type V2CharacterRosterPresentation,
  type V2CharacterSkinConfig,
} from "./v2CharacterPresentation";

interface ArenaActorView {
  readonly teamRing: Phaser.GameObjects.Graphics;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly container: Phaser.GameObjects.Container;
  readonly shield: Phaser.GameObjects.Graphics;
  readonly outlines: readonly Phaser.GameObjects.Sprite[];
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly status: Phaser.GameObjects.Graphics;
  readonly playerMarker: Phaser.GameObjects.Graphics | null;
  readonly shieldLabel: Phaser.GameObjects.Text;
  readonly character: V2CharacterPresentation;
  idleStartedAtMs: number;
}

const NEUTRAL_OUTLINE_COLOR = 0x061117;
const PLAYER_MARKER_COLOR = 0x8fe9ff;
const PLAYER_MARKER_OFFSET_Y = 60;
const OBJECTIVE_CARRIER_MARKER_OFFSET_Y = 84;

export class PhaserArenaActorRenderer {
  private readonly views = new Map<ActorId, ArenaActorView>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerSkinId: V2PlayerSkinId,
    private readonly rosterPresentation?: V2CharacterRosterPresentation,
  ) {
    ensurePlayerSkinAnimations(scene);
  }

  render(snapshot: WorldSnapshot): void {
    const visibleIds = new Set(snapshot.actors.map((actor) => actor.id));
    const objectiveCarrierIds = new Set(
      snapshot.objectives.flatMap((objective) =>
        objective.state.status === "carried" &&
          objective.state.interactingActorId
          ? [objective.state.interactingActorId]
          : []
      ),
    );
    for (const [actorId, view] of this.views) {
      if (!visibleIds.has(actorId)) {
        destroyActorView(view);
        this.views.delete(actorId);
      }
    }
    for (const actor of snapshot.actors) {
      this.renderActor(actor, objectiveCarrierIds.has(actor.id));
    }
  }

  reset(): void {
    for (const view of this.views.values()) {
      destroyActorView(view);
    }
    this.views.clear();
  }

  dispose(): void {
    this.reset();
  }

  private renderActor(
    actor: Readonly<ActorState>,
    carriesObjective: boolean,
  ): void {
    const view = this.views.get(actor.id) ?? this.createActorView(actor);
    const height = actor.jump.height;
    const scale = 1 + height / 210;
    const fallProgress = actor.lifeState === "falling"
      ? Phaser.Math.Clamp(
        1 - (actor.respawn?.remainingMs ?? 0) /
          V2_COLLISION_GROUNDWORK_CONFIG.fallDurationMs,
        0,
        1,
      )
      : 0;
    const fallScale = Math.max(.08, 1 - fallProgress * .92);
    const active = actor.lifeState === "active";
    const controlled = actor.id === PRIMARY_CONTROLLED_ACTOR_ID;

    const ringPulse = controlled
      ? 1 + (Math.sin(this.scene.time.now * .0032) + 1) * .012
      : 1;
    view.teamRing
      .setPosition(
        actor.position.x,
        actor.position.y + TEAM_RING_GROUND_OFFSET_Y,
      )
      .setScale(ringPulse)
      .setAlpha(active ? controlled ? .95 : .78 : 0)
      .setVisible(active);
    view.shadow
      .setPosition(actor.position.x, actor.position.y + 8)
      .setScale(1 + height / 160, Math.max(.35, 1 - height / 95))
      .setAlpha(active ? Math.max(.1, .22 - height / 330) : 0);
    view.container
      .setPosition(actor.position.x, actor.position.y - height)
      .setScale(scale * fallScale)
      .setRotation(actor.lifeState === "falling" ? fallProgress * 1.3 : 0)
      .setAlpha(active ? 1 : Math.max(.05, 1 - fallProgress))
      .setVisible(actor.lifeState !== "dead");
    updateActorSprite(view.sprite, view.character, actor);
    const isIdle = v2CharacterAnimationState(actor) === "idle";
    if (!isIdle) view.idleStartedAtMs = this.scene.time.now;
    const idleMotion = isIdle && view.character.skin
      ? resolveCharacterIdlePose(
        view.character.skin.id,
        this.scene.time.now - view.idleStartedAtMs,
        actor.id.length * 97 + actor.lifeId * 31,
      )
      : { active: false, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    view.sprite
      .setPosition(idleMotion.x, idleMotion.y)
      .setRotation(idleMotion.rotation)
      .setScale(
        view.character.scale * idleMotion.scaleX,
        view.character.scale * idleMotion.scaleY,
      )
      .setTint(actor.lifeState === "falling" ? 0x555555 : 0xffffff);
    syncOutlineSprites(view.outlines, view.sprite, active);
    view.playerMarker
      ?.setPosition(
        actor.position.x,
        actor.position.y - height -
          (carriesObjective
            ? OBJECTIVE_CARRIER_MARKER_OFFSET_Y
            : PLAYER_MARKER_OFFSET_Y),
      )
      .setVisible(active && controlled);
    this.drawActorStatus(view.status, actor);
    this.drawSpawnProtection(view, actor);
  }

  private createActorView(actor: Readonly<ActorState>): ArenaActorView {
    const controlled = actor.id === PRIMARY_CONTROLLED_ACTOR_ID;
    const teamRing = this.scene.add.graphics().setDepth(19);
    drawTeamRing(teamRing, actor, controlled);
    const shadow = this.scene.add.ellipse(
      actor.position.x,
      actor.position.y + 8,
      34,
      14,
      0x000000,
      .2,
    ).setDepth(20);
    const character = resolveV2CharacterPresentation(
      actor,
      this.playerSkinId,
      this.rosterPresentation,
    );
    const sprite = this.scene.add.sprite(0, 0, character.texture, character.initialFrame)
      .setOrigin(character.origin.x, character.origin.y)
      .setScale(character.scale);
    const outlines = FIGHTER_OUTLINE_OFFSETS.map((offset) =>
      this.scene.add.sprite(
        offset.x,
        offset.y,
        character.texture,
        character.initialFrame,
      )
        .setOrigin(character.origin.x, character.origin.y)
        .setScale(character.scale)
        .setTintFill(NEUTRAL_OUTLINE_COLOR)
        .setAlpha(.94)
    );
    const status = this.scene.add.graphics();
    const shield = this.scene.add.graphics();
    const playerMarker = controlled
      ? this.scene.add.graphics().setDepth(76)
      : null;
    if (playerMarker) drawPlayerMarker(playerMarker);
    const shieldLabel = this.scene.add.text(0, -76, "", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "9px",
      fontStyle: "bold",
      color: "#dffcff",
      stroke: "#07131b",
      strokeThickness: 4,
    }).setOrigin(.5).setVisible(false);
    const container = this.scene.add.container(
      actor.position.x,
      actor.position.y,
      [shield, ...outlines, sprite, status, shieldLabel],
    ).setDepth(35);
    const view = {
      teamRing,
      shadow,
      container,
      shield,
      outlines,
      sprite,
      status,
      playerMarker,
      shieldLabel,
      character,
      idleStartedAtMs: this.scene.time.now,
    };
    this.views.set(actor.id, view);
    return view;
  }

  private drawActorStatus(
    graphics: Phaser.GameObjects.Graphics,
    actor: Readonly<ActorState>,
  ): void {
    graphics.clear();
    if (actor.lifeState !== "active") return;
    const healthRatio = actor.maxHealth > 0
      ? Phaser.Math.Clamp(actor.health / actor.maxHealth, 0, 1)
      : 0;
    const color = actor.teamId === "red" ? TEAM.red.dark : TEAM.blue.dark;
    graphics.fillStyle(0x10201d, .65).fillRoundedRect(-22, -38, 44, 6, 3);
    graphics.fillStyle(color, 1).fillRoundedRect(-22, -38, 44 * healthRatio, 6, 3);
    if (actor.armor > 0) {
      graphics.lineStyle(4, 0x29c46a, .95)
        .beginPath()
        .arc(0, 0, actor.radius + 9, -2.55, -.6)
        .strokePath();
    }
  }

  private drawSpawnProtection(
    view: ArenaActorView,
    actor: Readonly<ActorState>,
  ): void {
    const remainingMs = actor.spawnProtectionRemainingMs;
    const active = actor.lifeState === "active" && remainingMs > 0;
    view.shield.clear().setVisible(active);
    view.shieldLabel.setVisible(
      active && actor.id === PRIMARY_CONTROLLED_ACTOR_ID,
    );
    if (!active) return;
    const radius = actor.radius + 15;
    const teamColor = actor.teamId === "red" ? 0xff6f78 : 0x7fdcff;
    const ratio = Phaser.Math.Clamp(
      remainingMs / V2_ACTOR_LIFECYCLE_CONFIG.spawnProtectionMs,
      0,
      1,
    );
    view.shield.fillStyle(teamColor, .09).fillCircle(0, 0, radius);
    view.shield.lineStyle(2, teamColor, .58 + ratio * .32).strokeCircle(0, 0, radius);
    view.shield.lineStyle(3, 0xffffff, .72)
      .beginPath()
      .arc(0, 0, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
      .strokePath();
    view.shield.lineStyle(1, teamColor, .34);
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI * 2 * index / 6;
      const next = Math.PI * 2 * (index + 1) / 6;
      view.shield.beginPath()
        .moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        .lineTo(Math.cos(next) * radius, Math.sin(next) * radius)
        .strokePath();
    }
    view.shieldLabel.setText(
      `SPAWN SHIELD ${(Math.ceil(remainingMs / 100) / 10).toFixed(1)}s`,
    );
  }
}

function destroyActorView(view: ArenaActorView): void {
  view.teamRing.destroy();
  view.shadow.destroy();
  view.playerMarker?.destroy();
  view.container.destroy();
}

function drawTeamRing(
  graphics: Phaser.GameObjects.Graphics,
  actor: Readonly<ActorState>,
  controlled: boolean,
): void {
  const radiusX = Math.max(22, actor.radius + 7);
  const radiusY = Math.max(9, radiusX * .42);
  const segments = fighterRingSegments(actor.teamId);
  const color = actor.teamId === "red" ? TEAM.red.color : TEAM.blue.color;

  drawEllipseSegments(
    graphics,
    segments,
    radiusX,
    radiusY,
    5,
    NEUTRAL_OUTLINE_COLOR,
    .76,
  );
  drawEllipseSegments(graphics, segments, radiusX, radiusY, 2, color, .98);
  if (controlled) {
    drawEllipseSegments(
      graphics,
      segments,
      radiusX + 4,
      radiusY + 2,
      1.5,
      PLAYER_MARKER_COLOR,
      .9,
    );
  }
}

function drawEllipseSegments(
  graphics: Phaser.GameObjects.Graphics,
  segments: readonly FighterRingSegment[],
  radiusX: number,
  radiusY: number,
  width: number,
  color: number,
  alpha: number,
): void {
  graphics.lineStyle(width, color, alpha);
  for (const segment of segments) {
    graphics.beginPath();
    const steps = Math.max(8, Math.ceil((segment.end - segment.start) * 12));
    for (let index = 0; index <= steps; index += 1) {
      const angle = Phaser.Math.Linear(
        segment.start,
        segment.end,
        index / steps,
      );
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
      if (index === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.strokePath();
  }
}

function drawPlayerMarker(graphics: Phaser.GameObjects.Graphics): void {
  graphics.lineStyle(5, NEUTRAL_OUTLINE_COLOR, .94)
    .beginPath()
    .moveTo(-7, -4)
    .lineTo(0, 3)
    .lineTo(7, -4)
    .strokePath();
  graphics.lineStyle(2.25, PLAYER_MARKER_COLOR, 1)
    .beginPath()
    .moveTo(-7, -4)
    .lineTo(0, 3)
    .lineTo(7, -4)
    .strokePath();
}

function syncOutlineSprites(
  outlines: readonly Phaser.GameObjects.Sprite[],
  sprite: Phaser.GameObjects.Sprite,
  visible: boolean,
): void {
  if (!visible) {
    for (const outline of outlines) outline.setVisible(false);
    return;
  }
  for (let index = 0; index < outlines.length; index += 1) {
    const outline = outlines[index];
    const offset = FIGHTER_OUTLINE_OFFSETS[index];
    if (!outline || !offset) continue;
    if (outline.frame.name !== sprite.frame.name) {
      outline.setFrame(sprite.frame.name);
    }
    outline
      .setPosition(sprite.x + offset.x, sprite.y + offset.y)
      .setRotation(sprite.rotation)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlip(sprite.flipX, sprite.flipY)
      .setVisible(visible);
  }
}

function updateActorSprite(
  sprite: Phaser.GameObjects.Sprite,
  character: V2CharacterPresentation,
  actor: Readonly<ActorState>,
): void {
  if (character.kind === "animated-skin" && character.skin) {
    updatePlayerSkinSprite(sprite, character.skin, actor);
    return;
  }
  if (sprite.anims.isPlaying) sprite.stop();
  sprite.setFrame(legacyArenaCharacterFrame(actor));
}

function updatePlayerSkinSprite(
  sprite: Phaser.GameObjects.Sprite,
  skin: V2CharacterSkinConfig,
  actor: Readonly<ActorState>,
): void {
  const direction = v2CharacterDirection(actor);
  const state = v2CharacterAnimationState(actor);
  const columns = v2CharacterColumns(skin, state, direction);
  if (columns.length > 1) {
    sprite.play(v2CharacterAnimationKey(skin, direction, state), true);
    return;
  }
  sprite.stop();
  sprite.setFrame(v2CharacterFrame(skin, actor, state));
}

function ensurePlayerSkinAnimations(scene: Phaser.Scene): void {
  for (const skin of Object.values(V2_CHARACTER_SKINS)) {
    for (const direction of V2_CHARACTER_DIRECTIONS) {
      for (const state of ["idle", "walk", "jump"] as const) {
        if (v2CharacterColumns(skin, state, direction).length > 1) {
          ensurePlayerSkinAnimation(scene, skin, direction, state);
        }
      }
    }
  }
}

function ensurePlayerSkinAnimation(
  scene: Phaser.Scene,
  skin: V2CharacterSkinConfig,
  direction: (typeof V2_CHARACTER_DIRECTIONS)[number],
  state: V2CharacterAnimationState,
): void {
  const key = v2CharacterAnimationKey(skin, direction, state);
  if (scene.anims.exists(key)) return;
  const row = v2CharacterDirectionRow(direction);
  const columns = v2CharacterColumns(skin, state, direction);
  scene.anims.create({
    key,
    frames: columns.map((column) => ({
      key: skin.texture,
      frame: row * skin.columns + column,
    })),
    frameRate: state === "idle"
      ? skin.idleFrameRate
      : state === "walk"
      ? skin.walkFrameRate
      : skin.jumpFrameRate,
    repeat: -1,
  });
}
