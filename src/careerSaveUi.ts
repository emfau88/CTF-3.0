import { CareerSaveError, type CareerSaveIssue } from "./careerSaveGuard";
import { uiText } from "./uiLocale";

export function createCareerSaveNotice(
  parent: HTMLElement,
  id: string,
  retry: () => void,
  backup: () => string,
) {
  const panel = document.createElement("aside");
  panel.id = id;
  panel.className = "career-save-notice is-hidden";
  panel.setAttribute("role", "alert");
  const copy = document.createElement("p");
  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.onclick = retry;
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.onclick = () => {
    try {
      const url = URL.createObjectURL(new Blob([backup()], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "core-arena-save-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { copy.textContent = uiText("save.read"); }
  };
  panel.append(copy, retryButton, exportButton);
  parent.prepend(panel);
  return {
    show(error: unknown, menu = false) {
      const issue: CareerSaveIssue = error instanceof CareerSaveError ? error.issue : "write";
      copy.textContent = uiText(menu && issue === "write" ? "save.menuWrite" : `save.${issue}`);
      retryButton.textContent = uiText(menu ? "save.reload" : "save.retry");
      exportButton.textContent = uiText("save.backup");
      panel.classList.remove("is-hidden");
    },
    hide() { panel.classList.add("is-hidden"); },
  };
}
