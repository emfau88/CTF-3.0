import Phaser from "phaser";
import type { WorldSnapshot } from "../../core";

export const ONE_FLAG_NEUTRAL_BANNER_PRESENTATION = {
  clothScale: .29,
  clothOffset: 35,
  mastScale: .19,
} as const;

type ObjectiveView = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

interface NeutralBannerParts {
  readonly mast: Phaser.GameObjects.Image;
  readonly cloth: Phaser.GameObjects.Sprite;
}

interface DirectionCandidate {
  readonly direction: -1 | 1;
  readonly sinceMs: number;
}

export class PhaserArenaObjectiveRenderer {
  private readonly views = new Map<string, ObjectiveView>();
  private readonly neutralDirections = new Map<string, -1 | 1>();
  private readonly neutralDirectionCandidates = new Map<string, DirectionCandidate>();
  private readonly neutralBannerParts = new Map<string, NeutralBannerParts>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(snapshot: WorldSnapshot): void {
    const visibleIds = new Set(snapshot.objectives.map((objective) => objective.id));
    for (const [objectiveId, view] of this.views) {
      if (!visibleIds.has(objectiveId)) {
        view.destroy();
        this.views.delete(objectiveId);
        this.neutralDirections.delete(objectiveId);
        this.neutralDirectionCandidates.delete(objectiveId);
        this.neutralBannerParts.delete(objectiveId);
      }
    }
    for (const objective of snapshot.objectives) {
      const view = this.views.get(objective.id) ?? this.createView(objective);
      if (!view) continue;
      view
        .setPosition(objective.position.x, objective.position.y - 18)
        .setAlpha(objective.state.status === "carried" ? .94 : 1);
      if (
        objective.kind === "neutral-flag" &&
        view instanceof Phaser.GameObjects.Container
      ) {
        this.updateNeutralBanner(view, objective, snapshot);
      }
      this.views.set(objective.id, view);
    }
  }

  reset(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    this.neutralDirections.clear();
    this.neutralDirectionCandidates.clear();
    this.neutralBannerParts.clear();
  }

  dispose(): void {
    this.reset();
  }

  private createView(objective: WorldSnapshot["objectives"][number]): ObjectiveView | null {
    if (objective.kind === "neutral-flag") {
      const cloth = this.scene.add.sprite(
        -ONE_FLAG_NEUTRAL_BANNER_PRESENTATION.clothOffset,
        0,
        "coreRelayClothPilot",
        0,
      ).setScale(ONE_FLAG_NEUTRAL_BANNER_PRESENTATION.clothScale);
      const mast = this.scene.add.image(
        0,
        0,
        "coreRelayMastPilot",
      ).setScale(ONE_FLAG_NEUTRAL_BANNER_PRESENTATION.mastScale);
      const container = this.scene.add.container(
        objective.position.x,
        objective.position.y - 18,
        [cloth, mast],
      ).setDepth(34);
      this.neutralBannerParts.set(objective.id, { mast, cloth });
      this.neutralDirections.set(objective.id, 1);
      return container;
    }
    if (objective.kind !== "team-flag") return null;
    const teamId = objective.state.controllingTeamId;
    if (teamId !== "red" && teamId !== "blue") return null;
    return this.scene.add.image(
      objective.position.x,
      objective.position.y - 18,
      teamId === "red" ? "flagRed" : "flagBlue",
    ).setDepth(34).setScale(.25);
  }

  private updateNeutralBanner(
    view: Phaser.GameObjects.Container,
    objective: WorldSnapshot["objectives"][number],
    snapshot: WorldSnapshot,
  ): void {
    const carrier = objective.state.interactingActorId
      ? snapshot.actors.find((actor) =>
        actor.id === objective.state.interactingActorId
      )
      : undefined;
    const parts = this.neutralBannerParts.get(objective.id);
    if (!parts) return;
    let direction = this.neutralDirections.get(objective.id) ?? 1;
    if (carrier && Math.abs(carrier.velocity.x) > 12) {
      const desiredDirection = carrier.velocity.x > 0 ? 1 : -1;
      if (desiredDirection !== direction) {
        const candidate = this.neutralDirectionCandidates.get(objective.id);
        if (!candidate || candidate.direction !== desiredDirection) {
          this.neutralDirectionCandidates.set(objective.id, {
            direction: desiredDirection,
            sinceMs: this.scene.time.now,
          });
        } else if (this.scene.time.now - candidate.sinceMs >= 140) {
          direction = desiredDirection;
          this.neutralDirections.set(objective.id, direction);
          this.neutralDirectionCandidates.delete(objective.id);
        }
      } else {
        this.neutralDirectionCandidates.delete(objective.id);
      }
    }
    const moving = carrier ? Math.hypot(carrier.velocity.x, carrier.velocity.y) : 0;
    const frameRate = 4 + Math.min(4, moving / 90);
    const frame = moving > 8
      ? Math.floor(this.scene.time.now * frameRate / 1_000) % 6
      : 0;
    const row = direction > 0 ? 0 : 1;
    const flutter = moving > 8
      ? Math.sin(this.scene.time.now * (moving > 30 ? .018 : .01))
      : 0;
    parts.cloth
      .setFrame(row * 6 + frame)
      .setPosition(
        direction > 0
          ? -ONE_FLAG_NEUTRAL_BANNER_PRESENTATION.clothOffset
          : ONE_FLAG_NEUTRAL_BANNER_PRESENTATION.clothOffset,
        0,
      );
    view
      .setScale(1 + flutter * (moving > 30 ? .018 : .008), 1)
      .setRotation(flutter * (moving > 30 ? .018 : .007));
  }
}
