import {
  buildV2MatchSearch,
  buildV2MenuSearch,
  readV2Route,
  V2_PLAYER_SKINS,
  type V2ControlsMode,
  type V2ModeId,
  type V2PlayerSkinId,
  type V2RouteConfig,
  type V2PlayersMode,
} from "./v2Route";
import type { GameModeId, MatchStatEntry, ScoreEntry } from "./core";
import { createLeagueMenuController } from "./leagueMenu";
import {
  calculateMatchImpact,
  compareMatchImpact,
  matchStatsColumns,
} from "./matchStatsPresentation";
export { calculateMatchImpact } from "./matchStatsPresentation";
import {
  isPlayerSkinId,
  loadPlayerSkinPreference,
  playerSkinLabel,
  playerSkinPortraitAssetStem,
  savePlayerSkinPreference,
} from "./playerSkinPreference";

interface V2MenuElements {
  readonly root: HTMLElement;
  readonly home: HTMLElement;
  readonly setup: HTMLElement;
  readonly league: HTMLElement;
  readonly status: HTMLElement;
  readonly enterSetup: HTMLButtonElement;
  readonly enterLeague: HTMLButtonElement;
  readonly leagueLabel: HTMLElement;
  readonly leagueMeta: HTMLElement;
  readonly back: HTMLButtonElement;
  readonly mode: HTMLSelectElement;
  readonly modePicker: HTMLElement;
  readonly map: HTMLSelectElement;
  readonly players: HTMLSelectElement;
  readonly teamSize: HTMLSelectElement;
  readonly controls: HTMLSelectElement;
  readonly skin: HTMLSelectElement;
  readonly skinPicker: HTMLElement;
  readonly skinPreview: HTMLElement;
  readonly skinName: HTMLElement;
  readonly sfx: HTMLSelectElement;
  readonly start: HTMLButtonElement;
}

interface V2PauseElements {
  readonly root: HTMLElement;
  readonly resume: HTMLButtonElement;
  readonly restart: HTMLButtonElement;
  readonly mainMenu: HTMLButtonElement;
}

interface V2ResultElements {
  readonly root: HTMLElement;
  readonly card: HTMLElement;
  readonly title: HTMLElement;
  readonly detail: HTMLElement;
  readonly lockup: HTMLElement;
  readonly blueTeam: HTMLElement;
  readonly blueEmblem: HTMLElement;
  readonly blueEmblemImage: HTMLImageElement;
  readonly blueName: HTMLElement;
  readonly blueScore: HTMLElement;
  readonly redTeam: HTMLElement;
  readonly redEmblem: HTMLElement;
  readonly redEmblemImage: HTMLImageElement;
  readonly redName: HTMLElement;
  readonly redScore: HTMLElement;
  readonly stats: HTMLElement;
  readonly playAgain: HTMLButtonElement;
  readonly mainMenu: HTMLButtonElement;
}

export interface V2ResultTeamPresentation {
  readonly name: string;
  readonly emblemUrl?: string;
}

interface V2StatsElements {
  readonly root: HTMLElement;
  readonly table: HTMLElement;
  readonly close: HTMLButtonElement;
}

export function showGameplayV2Menu(statusMessage?: string): void {
  const elements = readMenuElements();
  const route = readV2Route();
  elements.root.classList.remove("has-modal-open");
  setupMenuKeyboardScrolling(elements.root);
  resetMenuScroll(elements.root);
  document.documentElement.style.setProperty(
    "--v2-menu-background",
    `url("${import.meta.env.BASE_URL}assets/league-menu-arena-v1.png")`,
  );
  setupQuickPlayModePicker({
    select: elements.mode,
    picker: elements.modePicker,
  }, route.mode);
  elements.map.value = route.map;
  elements.players.value = route.players;
  elements.teamSize.value = String(route.teamSize);
  elements.controls.value = route.controls;
  const preferredSkin = new URLSearchParams(window.location.search).has("skin")
    ? route.skin
    : loadPlayerSkinPreference();
  setupQuickPlaySkinPicker({
    select: elements.skin,
    picker: elements.skinPicker,
    preview: elements.skinPreview,
    name: elements.skinName,
  }, preferredSkin);
  elements.sfx.value = route.sfx;
  elements.status.textContent = statusMessage ?? "";
  elements.status.classList.toggle("is-hidden", !statusMessage);
  elements.root.classList.remove("is-hidden");
  hideGameplayV2Pause();
  hideGameplayV2Result();
  hideGameplayV2Stats();
  const syncControls = (): void => {
    const localMatch = elements.players.value === "local";
    if (localMatch) {
      elements.controls.value = "keyboard";
    }
    elements.controls.disabled = localMatch;
  };
  const showHome = (): void => {
    elements.home.classList.remove("is-hidden");
    elements.setup.classList.add("is-hidden");
    elements.league.classList.add("is-hidden");
    elements.status.classList.add("is-hidden");
    resetMenuScroll(elements.root);
    focusMenuScreen(elements.root);
  };
  const syncLeagueHome = (): void => {
    elements.leagueLabel.textContent = leagueController.hasSave
      ? "Continue League"
      : "Start League";
    elements.leagueMeta.textContent = leagueController.homeMeta;
  };
  const leagueController = createLeagueMenuController({
    onBack: () => {
      showHome();
      syncLeagueHome();
    },
  });
  syncLeagueHome();
  elements.home.classList.toggle("is-hidden", Boolean(statusMessage));
  elements.setup.classList.toggle("is-hidden", !statusMessage);
  elements.league.classList.add("is-hidden");
  focusMenuScreen(elements.root);
  syncControls();
  elements.players.onchange = syncControls;
  elements.enterSetup.onclick = () => {
    elements.home.classList.add("is-hidden");
    elements.setup.classList.remove("is-hidden");
    resetMenuScroll(elements.root);
    focusMenuScreen(elements.root);
  };
  elements.enterLeague.onclick = () => {
    elements.home.classList.add("is-hidden");
    elements.setup.classList.add("is-hidden");
    resetMenuScroll(elements.root);
    focusMenuScreen(elements.root);
    leagueController.open();
  };
  elements.back.onclick = () => {
    showHome();
  };
  elements.start.onclick = () => {
    savePlayerSkinPreference(elements.skin.value as V2PlayerSkinId);
    resetMenuScroll(elements.root);
    window.location.search = buildV2MatchSearch({
      mode: elements.mode.value as typeof route.mode,
      map: elements.map.value,
      players: elements.players.value as V2PlayersMode,
      teamSize: Number(elements.teamSize.value) as typeof route.teamSize,
      controls: elements.controls.value as V2ControlsMode,
      skin: elements.skin.value as V2PlayerSkinId,
      sfx: elements.sfx.value === "off" ? "off" : "on",
    });
  };
  if (new URLSearchParams(window.location.search).get("leagueHub") === "1") {
    elements.enterLeague.click();
  }
}

export function hideGameplayV2Menu(): void {
  const root = readMenuElements().root;
  root.classList.add("is-hidden");
  root.classList.remove("has-modal-open");
  resetMenuScroll(root);
}

export function showGameplayV2Pause(actions: {
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onMainMenu: () => void;
}): void {
  hideGameplayV2Result();
  hideGameplayV2Stats();
  const elements = readPauseElements();
  elements.resume.onclick = actions.onResume;
  elements.restart.onclick = actions.onRestart;
  elements.mainMenu.onclick = actions.onMainMenu;
  elements.root.classList.remove("is-hidden");
}

export function hideGameplayV2Pause(): void {
  readPauseElements().root.classList.add("is-hidden");
}

export function showGameplayV2Result(input: {
  readonly headline: string;
  readonly detail: string;
  readonly winnerEntryId: string | null;
  readonly scores: readonly ScoreEntry[];
  readonly teams?: {
    readonly blue: V2ResultTeamPresentation;
    readonly red: V2ResultTeamPresentation;
  };
  readonly stats: readonly MatchStatEntry[];
  readonly humanActorIds: readonly string[];
  readonly modeId: GameModeId;
  readonly onPlayAgain: () => void;
  readonly onMainMenu: () => void;
  readonly playAgainLabel?: string;
  readonly mainMenuLabel?: string;
}): void {
  hideGameplayV2Pause();
  const elements = readResultElements();
  const blueTeam = input.teams?.blue ?? { name: "Blue Team" };
  const redTeam = input.teams?.red ?? { name: "Red Team" };
  const blueScore = input.scores.find((entry) => entry.teamId === "blue")?.score ?? 0;
  const redScore = input.scores.find((entry) => entry.teamId === "red")?.score ?? 0;
  const outcomeClass = input.winnerEntryId === "blue"
    ? "is-blue-win"
    : input.winnerEntryId === "red"
      ? "is-red-win"
      : "is-draw";
  elements.root.classList.remove("is-blue-win", "is-red-win", "is-draw");
  elements.root.classList.add(outcomeClass);
  elements.title.textContent = input.headline;
  elements.detail.textContent = input.detail;
  elements.blueName.textContent = blueTeam.name;
  elements.redName.textContent = redTeam.name;
  elements.blueScore.textContent = String(blueScore);
  elements.redScore.textContent = String(redScore);
  syncResultEmblem(elements.blueEmblem, elements.blueEmblemImage, blueTeam);
  syncResultEmblem(elements.redEmblem, elements.redEmblemImage, redTeam);
  elements.blueTeam.classList.toggle("is-winner", input.winnerEntryId === "blue");
  elements.redTeam.classList.toggle("is-winner", input.winnerEntryId === "red");
  elements.lockup.setAttribute(
    "aria-label",
    `${blueTeam.name} ${blueScore} to ${redTeam.name} ${redScore}`,
  );
  renderStatsTable(elements.stats, input.stats, input.humanActorIds, input.modeId);
  elements.playAgain.onclick = input.onPlayAgain;
  elements.mainMenu.onclick = input.onMainMenu;
  elements.playAgain.textContent = input.playAgainLabel ?? "Play Again";
  elements.mainMenu.textContent = input.mainMenuLabel ?? "Main Menu";
  elements.card.classList.remove("is-revealing");
  void elements.card.offsetWidth;
  elements.card.classList.add("is-revealing");
  elements.root.classList.remove("is-hidden");
}

function syncResultEmblem(
  root: HTMLElement,
  image: HTMLImageElement,
  team: V2ResultTeamPresentation,
): void {
  const hasImage = Boolean(team.emblemUrl);
  root.classList.toggle("has-image", hasImage);
  image.classList.toggle("is-hidden", !hasImage);
  if (team.emblemUrl) {
    image.src = team.emblemUrl;
    image.alt = `${team.name} emblem`;
  } else {
    image.removeAttribute("src");
    image.alt = "";
  }
}

export function showGameplayV2Stats(
  stats: readonly MatchStatEntry[],
  humanActorIds: readonly string[],
  onClose: () => void = () => {},
  options: {
    readonly holdToView?: boolean;
    readonly modeId?: GameModeId;
  } = {},
): void {
  const elements = readStatsElements();
  renderStatsTable(
    elements.table,
    stats,
    humanActorIds,
    options.modeId ?? "team-deathmatch",
  );
  elements.close.onclick = onClose;
  elements.root.classList.toggle(
    "is-held-scoreboard",
    options.holdToView === true,
  );
  elements.root.classList.remove("is-hidden");
}

export function hideGameplayV2Stats(): void {
  const root = readStatsElements().root;
  root.classList.add("is-hidden");
  root.classList.remove("is-held-scoreboard");
}

export function hideGameplayV2Result(): void {
  readResultElements().root.classList.add("is-hidden");
}

export function goToGameplayV2Menu(route: Partial<V2RouteConfig> = {}): void {
  window.location.search = buildV2MenuSearch(route);
}

function readMenuElements(): V2MenuElements {
  const root = requiredElement<HTMLElement>("v2-main-menu");
  return {
    root,
    home: requiredElement<HTMLElement>("v2-menu-home"),
    setup: requiredElement<HTMLElement>("v2-menu-setup"),
    league: requiredElement<HTMLElement>("v2-league-hub"),
    status: requiredElement<HTMLElement>("v2-menu-status"),
    enterSetup: requiredElement<HTMLButtonElement>("v2-menu-play"),
    enterLeague: requiredElement<HTMLButtonElement>("v2-menu-league"),
    leagueLabel: requiredElement<HTMLElement>("v2-menu-league-label"),
    leagueMeta: requiredElement<HTMLElement>("v2-menu-league-meta"),
    back: requiredElement<HTMLButtonElement>("v2-menu-back"),
    mode: requiredElement<HTMLSelectElement>("v2-menu-mode"),
    modePicker: requiredElement<HTMLElement>("v2-menu-mode-picker"),
    map: requiredElement<HTMLSelectElement>("v2-menu-map"),
    players: requiredElement<HTMLSelectElement>("v2-menu-players"),
    teamSize: requiredElement<HTMLSelectElement>("v2-menu-team-size"),
    controls: requiredElement<HTMLSelectElement>("v2-menu-controls"),
    skin: requiredElement<HTMLSelectElement>("v2-menu-skin"),
    skinPicker: requiredElement<HTMLElement>("v2-menu-skin-picker"),
    skinPreview: requiredElement<HTMLElement>("v2-menu-skin-preview"),
    skinName: requiredElement<HTMLElement>("v2-menu-skin-name"),
    sfx: requiredElement<HTMLSelectElement>("v2-menu-sfx"),
    start: requiredElement<HTMLButtonElement>("v2-menu-start"),
  };
}

function readPauseElements(): V2PauseElements {
  return {
    root: requiredElement<HTMLElement>("v2-pause-overlay"),
    resume: requiredElement<HTMLButtonElement>("v2-pause-resume"),
    restart: requiredElement<HTMLButtonElement>("v2-pause-restart"),
    mainMenu: requiredElement<HTMLButtonElement>("v2-pause-main-menu"),
  };
}

function readResultElements(): V2ResultElements {
  return {
    root: requiredElement<HTMLElement>("v2-result-overlay"),
    card: requiredElement<HTMLElement>("v2-result-card"),
    title: requiredElement<HTMLElement>("v2-result-title"),
    detail: requiredElement<HTMLElement>("v2-result-detail"),
    lockup: requiredElement<HTMLElement>("v2-result-lockup"),
    blueTeam: requiredElement<HTMLElement>("v2-result-blue-team"),
    blueEmblem: requiredElement<HTMLElement>("v2-result-blue-emblem"),
    blueEmblemImage: requiredElement<HTMLImageElement>("v2-result-blue-emblem-image"),
    blueName: requiredElement<HTMLElement>("v2-result-blue-name"),
    blueScore: requiredElement<HTMLElement>("v2-result-blue-score"),
    redTeam: requiredElement<HTMLElement>("v2-result-red-team"),
    redEmblem: requiredElement<HTMLElement>("v2-result-red-emblem"),
    redEmblemImage: requiredElement<HTMLImageElement>("v2-result-red-emblem-image"),
    redName: requiredElement<HTMLElement>("v2-result-red-name"),
    redScore: requiredElement<HTMLElement>("v2-result-red-score"),
    stats: requiredElement<HTMLElement>("v2-result-stats"),
    playAgain: requiredElement<HTMLButtonElement>("v2-result-play-again"),
    mainMenu: requiredElement<HTMLButtonElement>("v2-result-main-menu"),
  };
}

function readStatsElements(): V2StatsElements {
  return {
    root: requiredElement<HTMLElement>("v2-stats-overlay"),
    table: requiredElement<HTMLElement>("v2-stats-table"),
    close: requiredElement<HTMLButtonElement>("v2-stats-close"),
  };
}

function renderStatsTable(
  root: HTMLElement,
  stats: readonly MatchStatEntry[],
  humanActorIds: readonly string[],
  modeId: GameModeId,
): void {
  root.replaceChildren();
  const table = document.createElement("table");
  table.className = "v2-stats-table";
  table.dataset.mode = modeId;
  const columns = matchStatsColumns(modeId);
  const head = table.createTHead().insertRow();
  for (const column of columns) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = column.label;
    if (column.title) cell.title = column.title;
    head.append(cell);
  }
  const humans = new Set(humanActorIds);
  const maxImpact = Math.max(1, ...stats.map(calculateMatchImpact));
  const mvp = [...stats].sort(compareMatchImpact)[0];
  for (const teamId of orderedTeamIds(stats)) {
    const entries = stats
      .filter((entry) => (entry.teamId ?? "neutral") === teamId)
      .sort(compareMatchImpact);
    const body = table.createTBody();
    body.className = `v2-stats-group v2-stats-group-${teamId}`;
    const teamRow = body.insertRow();
    teamRow.className = "v2-stats-team-header";
    const teamCell = teamRow.insertCell();
    teamCell.colSpan = columns.length;
    teamCell.innerHTML = `<div class="v2-stats-team-header-content"><span>${
      teamLabel(teamId)
    }</span><strong>${
      entries.reduce((sum, entry) => sum + calculateMatchImpact(entry), 0)
    } IMPACT</strong></div>`;
    for (const entry of entries) {
      const impact = calculateMatchImpact(entry);
      const row = body.insertRow();
      row.className = `v2-stats-player v2-stats-team-${teamId}${
        humans.has(entry.actorId) ? " is-human" : ""
      }`;
      row.title = `Flag pickups: ${entry.flagPickups}`;
      const playerCell = row.insertCell();
      const name = document.createElement("span");
      name.className = "v2-stats-player-name";
      name.textContent = formatActorName(entry, stats, humans);
      playerCell.append(name);
      if (mvp?.actorId === entry.actorId && impact > 0) {
        const badge = document.createElement("span");
        badge.className = "v2-stats-mvp";
        badge.textContent = "MVP";
        playerCell.append(badge);
      }
      for (const column of columns.slice(1, -1)) {
        const cell = row.insertCell();
        cell.textContent = column.value(entry);
      }
      const impactCell = row.insertCell();
      impactCell.className = "v2-stats-impact";
      const impactValue = document.createElement("strong");
      impactValue.textContent = String(impact);
      const impactBar = document.createElement("span");
      impactBar.className = "v2-stats-impact-bar";
      impactBar.style.setProperty("--impact-ratio", String(impact / maxImpact));
      impactCell.append(impactValue, impactBar);
    }
  }
  root.append(table);
}

export interface QuickPlaySkinPickerElements {
  readonly select: HTMLSelectElement;
  readonly picker: HTMLElement;
  readonly preview: HTMLElement;
  readonly name: HTMLElement;
}

export interface QuickPlayModePickerElements {
  readonly select: HTMLSelectElement;
  readonly picker: HTMLElement;
}

export function setupQuickPlayModePicker(
  elements: QuickPlayModePickerElements,
  initialMode: V2ModeId,
  onSelected: (modeId: V2ModeId) => void = () => {},
): void {
  const buttons = Array.from(
    elements.picker.querySelectorAll<HTMLButtonElement>("[data-mode]"),
  );
  const modeOrder: readonly V2ModeId[] = ["tdm", "ctf", "one-flag"];

  const selectMode = (modeId: V2ModeId, notify: boolean): void => {
    elements.select.value = modeId;
    for (const button of buttons) {
      const selected = button.dataset.mode === modeId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (notify) onSelected(modeId);
  };

  const isModeId = (value: string | undefined): value is V2ModeId =>
    modeOrder.includes(value as V2ModeId);

  for (const button of buttons) {
    button.onclick = () => {
      if (isModeId(button.dataset.mode)) selectMode(button.dataset.mode, true);
    };
    button.onkeydown = (event) => {
      const current = modeOrder.indexOf(elements.select.value as V2ModeId);
      let next = current;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        next = (current + 1) % modeOrder.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        next = (current - 1 + modeOrder.length) % modeOrder.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = modeOrder.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      const modeId = modeOrder[next];
      selectMode(modeId, true);
      buttons.find((candidate) => candidate.dataset.mode === modeId)?.focus();
    };
  }

  elements.select.onchange = () => {
    if (isModeId(elements.select.value)) {
      selectMode(elements.select.value, true);
    }
  };
  selectMode(initialMode, false);
}

export function setupQuickPlaySkinPicker(
  elements: QuickPlaySkinPickerElements,
  initialSkin: V2PlayerSkinId,
  onSelected: (skinId: V2PlayerSkinId) => void = savePlayerSkinPreference,
): void {
  elements.select.replaceChildren(
    ...V2_PLAYER_SKINS.map((skinId) => {
      const option = document.createElement("option");
      option.value = skinId;
      option.textContent = playerSkinLabel(skinId);
      return option;
    }),
  );

  const buttons = V2_PLAYER_SKINS.map((skinId) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v2-quick-skin-option";
    button.dataset.skinId = skinId;
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", playerSkinLabel(skinId));
    const portrait = document.createElement("span");
    portrait.className = "v2-quick-skin-thumb";
    applySkinSprite(portrait, skinId);
    const label = document.createElement("strong");
    label.textContent = playerSkinLabel(skinId);
    button.append(portrait, label);
    return button;
  });

  const selectSkin = (skinId: V2PlayerSkinId, notify: boolean): void => {
    elements.select.value = skinId;
    elements.name.textContent = playerSkinLabel(skinId);
    applySkinSprite(elements.preview, skinId);
    for (const button of buttons) {
      const selected = button.dataset.skinId === skinId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    }
    if (notify) onSelected(skinId);
  };

  for (const button of buttons) {
    button.onclick = () => {
      const skinId = button.dataset.skinId ?? null;
      if (isPlayerSkinId(skinId)) selectSkin(skinId, true);
    };
  }
  elements.picker.replaceChildren(...buttons);
  elements.select.onchange = () => {
    if (isPlayerSkinId(elements.select.value)) {
      selectSkin(elements.select.value, true);
    }
  };
  selectSkin(initialSkin, false);
}

function applySkinSprite(element: HTMLElement, skinId: V2PlayerSkinId): void {
  const assetBase = import.meta.env?.BASE_URL ?? "/";
  element.style.setProperty(
    "--skin-portrait",
    `url('${assetBase}assets/ui/portraits/${playerSkinPortraitAssetStem(skinId)}.png')`,
  );
}

function orderedTeamIds(stats: readonly MatchStatEntry[]): string[] {
  const present = new Set(stats.map((entry) => entry.teamId ?? "neutral"));
  return ["blue", "red", "neutral"].filter((teamId) => present.has(teamId));
}

function teamLabel(teamId: string): string {
  return teamId === "blue"
    ? "BLUE TEAM"
    : teamId === "red"
    ? "RED TEAM"
    : "NEUTRAL";
}

function formatActorName(
  entry: MatchStatEntry,
  stats: readonly MatchStatEntry[],
  humanActorIds: ReadonlySet<string>,
): string {
  const teamName = entry.teamId
    ? entry.teamId.charAt(0).toUpperCase() + entry.teamId.slice(1)
    : "Neutral";
  if (humanActorIds.has(entry.actorId)) {
    return entry.actorId === "blue-player"
      ? `YOU / ${teamName}`
      : `PLAYER 2 / ${teamName}`;
  }
  const teamBots = stats.filter((candidate) =>
    candidate.teamId === entry.teamId && !humanActorIds.has(candidate.actorId)
  );
  return `${teamName} BOT ${teamBots.findIndex((candidate) =>
    candidate.actorId === entry.actorId
  ) + 1}`;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing V2 menu element: ${id}`);
  }
  return element as T;
}

function resetMenuScroll(root: HTMLElement): void {
  root.scrollTop = 0;
  root.scrollLeft = 0;
}

function focusMenuScreen(root: HTMLElement): void {
  root.focus({ preventScroll: true });
}

function setupMenuKeyboardScrolling(root: HTMLElement): void {
  root.onkeydown = (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    const pageDistance = Math.max(120, Math.round(root.clientHeight * .85));
    const maximumScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    if (event.key === "PageDown") {
      root.scrollTop = Math.min(maximumScroll, root.scrollTop + pageDistance);
    } else if (event.key === "PageUp") {
      root.scrollTop = Math.max(0, root.scrollTop - pageDistance);
    } else if (event.key === "Home") {
      root.scrollTop = 0;
    } else if (event.key === "End") {
      root.scrollTop = maximumScroll;
    } else {
      return;
    }
    event.preventDefault();
  };
}
