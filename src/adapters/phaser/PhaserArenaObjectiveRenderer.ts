import Phaser from "phaser";
import type { WorldSnapshot } from "../../core";

type ObjectiveView = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

export class PhaserArenaObjectiveRenderer {
  private readonly views = new Map<string, ObjectiveView>();
  private readonly neutralDirections = new Map<string, -1 | 1>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(snapshot: WorldSnapshot): void {
    const visibleIds = new Set(snapshot.objectives.map((objective) => objective.id));
    for (const [objectiveId, view] of this.views) {
      if (!visibleIds.has(objectiveId)) {
        view.destroy();
        this.views.delete(objectiveId);
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
        view instanceof Phaser.GameObjects.Image
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
  }

  dispose(): void {
    this.reset();
  }

  private createView(objective: WorldSnapshot["objectives"][number]): ObjectiveView | null {
    if (objective.kind === "neutral-flag") {
      return this.scene.add.image(
        objective.position.x,
        objective.position.y - 18,
        "coreRelayBanner",
      ).setOrigin(.2, .5).setDepth(34).setScale(.19);
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
    view: Phaser.GameObjects.Image,
    objective: WorldSnapshot["objectives"][number],
    snapshot: WorldSnapshot,
  ): void {
    const carrier = objective.state.interactingActorId
      ? snapshot.actors.find((actor) =>
        actor.id === objective.state.interactingActorId
      )
      : undefined;
    let direction = this.neutralDirections.get(objective.id) ?? 1;
    if (carrier && Math.abs(carrier.velocity.x) > 8) {
      direction = carrier.velocity.x > 0 ? -1 : 1;
      this.neutralDirections.set(objective.id, direction);
    }
    const moving = carrier ? Math.hypot(carrier.velocity.x, carrier.velocity.y) : 0;
    const flutter = Math.sin(this.scene.time.now * (moving > 30 ? .018 : .007));
    view
      .setFlipX(direction < 0)
      .setScale(.19 * (1 + flutter * (moving > 30 ? .045 : .018)), .19)
      .setRotation(flutter * (moving > 30 ? .025 : .01));
  }
}
