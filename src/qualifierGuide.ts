import type { TutorialAction } from "./platform";
import { onUiLanguageChange, uiText, type UiCopyKey } from "./uiLocale";
import { QUALIFIER_TUTORIAL_ACTIONS } from "./qualifier";

const ACTION_COPY: Readonly<Record<TutorialAction, {
  readonly title: UiCopyKey;
  readonly hint: UiCopyKey;
}>> = {
  move: { title: "qualifier.move", hint: "qualifier.moveHint" },
  aim: { title: "qualifier.aim", hint: "qualifier.aimHint" },
  "arc-lash": { title: "qualifier.arcLash", hint: "qualifier.arcLashHint" },
  pickup: { title: "qualifier.pickup", hint: "qualifier.pickupHint" },
  jump: { title: "qualifier.jump", hint: "qualifier.jumpHint" },
};

export function createQualifierGuide(
  initialCompleted: readonly TutorialAction[] = [],
) {
  const root = document.getElementById("v2-qualifier-guide");
  if (!root) throw new Error("Missing qualifier guide root.");
  const completed = new Set(initialCompleted);
  let finished = false;
  const render = (): void => {
    const next = QUALIFIER_TUTORIAL_ACTIONS.find((action) => !completed.has(action));
    const completedCount = completed.size;
    const copy = next ? ACTION_COPY[next] : null;
    root.innerHTML = `
      <div class="v2-qualifier-progress"><span>${uiText("qualifier.kicker")}</span><b>${completedCount}/${QUALIFIER_TUTORIAL_ACTIONS.length}</b></div>
      <h2>${finished || !copy ? uiText("qualifier.systemsReady") : uiText(copy.title)}</h2>
      <p>${finished || !copy ? uiText("qualifier.finishMatch") : uiText(copy.hint)}</p>
      <ol>${QUALIFIER_TUTORIAL_ACTIONS.map((action, index) => {
        const done = completed.has(action);
        const active = action === next;
        return `<li class="${done ? "is-complete" : active ? "is-active" : ""}"><i>${done ? "✓" : index + 1}</i><span>${uiText(ACTION_COPY[action].title)}</span></li>`;
      }).join("")}</ol>`;
  };
  const unsubscribe = onUiLanguageChange(render);
  render();
  root.classList.remove("is-hidden");
  return {
    complete(action: TutorialAction): void {
      completed.add(action);
      render();
    },
    finish(): void {
      finished = true;
      render();
    },
    hide(): void {
      root.classList.add("is-hidden");
    },
    dispose(): void {
      unsubscribe();
      root.classList.add("is-hidden");
    },
  };
}
