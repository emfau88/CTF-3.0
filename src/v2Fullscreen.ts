export interface V2FullscreenDocument {
  readonly fullscreenEnabled?: boolean;
  readonly fullscreenElement?: Element | null;
  readonly documentElement: Element;
  exitFullscreen?: () => Promise<void>;
}

export interface V2FullscreenControlState {
  readonly available: boolean;
  readonly active: boolean;
  readonly label: "Fullscreen" | "Exit";
  readonly ariaLabel: "Enter fullscreen" | "Exit fullscreen";
  readonly icon: "enter" | "exit";
}

export function readV2FullscreenControlState(
  documentPort: V2FullscreenDocument,
): V2FullscreenControlState {
  const active = Boolean(documentPort.fullscreenElement);
  const available = documentPort.fullscreenEnabled === true &&
    typeof documentPort.documentElement.requestFullscreen === "function" &&
    typeof documentPort.exitFullscreen === "function";
  return {
    available,
    active,
    label: active ? "Exit" : "Fullscreen",
    ariaLabel: active ? "Exit fullscreen" : "Enter fullscreen",
    icon: active ? "exit" : "enter",
  };
}

export async function toggleV2Fullscreen(
  documentPort: V2FullscreenDocument,
): Promise<void> {
  const state = readV2FullscreenControlState(documentPort);
  if (!state.available) return;
  if (state.active) {
    await documentPort.exitFullscreen?.();
    return;
  }
  await documentPort.documentElement.requestFullscreen();
}
