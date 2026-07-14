import type {
  WorldPosition,
  WorldSnapshot,
} from "../../core";
import type { BotTraversalSmokeSetup } from "./BotTraversalSmoke";

export type BotTraversalSmokeStatus =
  | "APPROACH"
  | "JUMPING"
  | "LANDED"
  | "FAILED";

export class PhaserBotTraversalSmokeOverlay {
  private readonly element: HTMLDivElement;
  private sawJump = false;
  private wasJumping = false;
  private landed = false;
  private failed = false;
  private bestProgress = 0;

  constructor(private readonly setup: BotTraversalSmokeSetup) {
    this.element = document.createElement("div");
    this.element.id = "v2-traversal-smoke";
    this.element.setAttribute("role", "status");
    Object.assign(this.element.style, {
      position: "fixed",
      left: "16px",
      top: "72px",
      zIndex: "1000",
      padding: "9px 12px",
      border: "1px solid rgba(143, 239, 255, .8)",
      borderRadius: "6px",
      background: "rgba(5, 18, 26, .9)",
      boxShadow: "0 5px 18px rgba(0, 0, 0, .45)",
      color: "#eaffff",
      font: "700 13px/1.35 Arial, sans-serif",
      letterSpacing: ".03em",
      pointerEvents: "none",
      whiteSpace: "pre-line",
    });
    document.body.append(this.element);
  }

  render(snapshot: WorldSnapshot): void {
    const bot = snapshot.actors.find((actor) =>
      actor.id === this.setup.botActorId
    );
    const jumping = Boolean(bot?.jump.active);
    if (jumping) this.sawJump = true;
    if (bot?.lifeState === "falling") this.failed = true;
    if (
      this.sawJump &&
      this.wasJumping &&
      !jumping &&
      bot?.lifeState === "active" &&
      !bot.overGap
    ) {
      this.landed = true;
    }
    this.wasJumping = jumping;
    const progress = bot
      ? progressAlongSegment(
        bot.position,
        this.setup.jumpLink.from,
        this.setup.jumpLink.to,
      )
      : 0;
    this.bestProgress = Math.max(this.bestProgress, progress);
    const status = this.resolveStatus(jumping);
    const progressPercent = Math.round(this.bestProgress * 100);
    this.element.dataset.mapId = this.setup.mapId;
    this.element.dataset.linkId = this.setup.jumpLink.id;
    this.element.dataset.progress = String(progressPercent);
    this.element.dataset.status = status;
    this.element.textContent = [
      "AUTHORED BOT TRAVERSAL",
      this.setup.mapName,
      this.setup.jumpLink.id,
      `${status} | ${progressPercent}%`,
    ].join("\n");
    this.element.style.borderColor = status === "LANDED"
      ? "rgba(88, 255, 160, .9)"
      : status === "FAILED"
      ? "rgba(255, 105, 116, .9)"
      : "rgba(143, 239, 255, .8)";
  }

  dispose(): void {
    this.element.remove();
  }

  private resolveStatus(jumping: boolean): BotTraversalSmokeStatus {
    if (this.failed) return "FAILED";
    if (this.landed) return "LANDED";
    if (jumping) return "JUMPING";
    return "APPROACH";
  }
}

function progressAlongSegment(
  position: WorldPosition,
  from: WorldPosition,
  to: WorldPosition,
): number {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared <= Number.EPSILON) return 0;
  const progress = (
    (position.x - from.x) * deltaX +
    (position.y - from.y) * deltaY
  ) / lengthSquared;
  return Math.max(0, Math.min(1, progress));
}
