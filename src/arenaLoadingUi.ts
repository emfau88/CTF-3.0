import type Phaser from "phaser";

const ROOT_ID = "v2-arena-loading";

interface PhaserLoadFile {
  readonly key?: string;
}

export function showArenaLoadingUi(
  arenaName = "Arena",
  status = "Preparing match",
): void {
  const elements = ensureArenaLoadingUi();
  elements.root.classList.remove("is-hidden", "has-error");
  elements.root.setAttribute("aria-hidden", "false");
  elements.title.textContent = arenaName;
  elements.status.textContent = status;
  elements.progress.value = 0;
  elements.percent.textContent = "0%";
  elements.actions.classList.add("is-hidden");
}

export function bindArenaLoadingUi(
  scene: Phaser.Scene,
  arenaName: string,
): void {
  showArenaLoadingUi(arenaName, "Loading arena assets");
  let failed = false;
  scene.load.on("progress", (progress: number) => {
    if (failed) return;
    const elements = ensureArenaLoadingUi();
    const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    elements.progress.value = percent;
    elements.percent.textContent = `${percent}%`;
  });
  scene.load.on("fileprogress", (file: PhaserLoadFile) => {
    if (failed || !file.key) return;
    ensureArenaLoadingUi().status.textContent = `Loading ${readableAssetName(file.key)}`;
  });
  scene.load.once("loaderror", (file: PhaserLoadFile) => {
    failed = true;
    showArenaLoadingError(
      file.key ? `Could not load ${readableAssetName(file.key)}.` : undefined,
    );
  });
  scene.load.once("complete", () => {
    if (!failed) hideArenaLoadingUi();
  });
}

export function showArenaLoadingError(
  message = "The arena could not be loaded.",
): void {
  const elements = ensureArenaLoadingUi();
  elements.root.classList.remove("is-hidden");
  elements.root.classList.add("has-error");
  elements.root.setAttribute("aria-hidden", "false");
  elements.status.textContent = message;
  elements.actions.classList.remove("is-hidden");
}

export function hideArenaLoadingUi(): void {
  const root = document.querySelector<HTMLElement>(`#${ROOT_ID}`);
  root?.classList.add("is-hidden");
  root?.setAttribute("aria-hidden", "true");
}

function ensureArenaLoadingUi(): {
  root: HTMLElement;
  title: HTMLElement;
  status: HTMLElement;
  progress: HTMLProgressElement;
  percent: HTMLElement;
  actions: HTMLElement;
} {
  let root = document.querySelector<HTMLElement>(`#${ROOT_ID}`);
  if (!root) {
    root = document.createElement("section");
    root.id = ROOT_ID;
    root.className = "v2-arena-loading";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    root.innerHTML = `
      <div class="v2-arena-loading-card">
        <div class="v2-arena-loading-kicker">CORE ARENA NETWORK</div>
        <h1 data-arena-loading-title>Arena</h1>
        <p data-arena-loading-status>Preparing match</p>
        <div class="v2-arena-loading-meter">
          <progress data-arena-loading-progress max="100" value="0"></progress>
          <span data-arena-loading-percent>0%</span>
        </div>
        <div class="v2-arena-loading-actions is-hidden" data-arena-loading-actions>
          <button type="button" data-arena-loading-retry>Retry</button>
          <button type="button" class="v2-menu-secondary" data-arena-loading-menu>Main Menu</button>
        </div>
      </div>`;
    document.body.append(root);
    requiredElement<HTMLButtonElement>(root, "[data-arena-loading-retry]")
      .addEventListener("click", () => window.location.reload());
    requiredElement<HTMLButtonElement>(root, "[data-arena-loading-menu]")
      .addEventListener("click", () => {
        const url = new URL(window.location.href);
        url.searchParams.set("menu", "1");
        window.location.assign(url);
      });
  }
  return {
    root,
    title: requiredElement(root, "[data-arena-loading-title]"),
    status: requiredElement(root, "[data-arena-loading-status]"),
    progress: requiredElement(root, "[data-arena-loading-progress]"),
    percent: requiredElement(root, "[data-arena-loading-percent]"),
    actions: requiredElement(root, "[data-arena-loading-actions]"),
  };
}

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing arena loading element: ${selector}`);
  return element;
}

function readableAssetName(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
}
