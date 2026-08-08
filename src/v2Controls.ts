import type { V2ControlsMode } from "./v2Route";

export interface V2TouchCapabilities {
  readonly maxTouchPoints: number;
  readonly coarsePointer: boolean;
}

export function prefersV2TouchControls(
  controls: V2ControlsMode,
  capabilities: V2TouchCapabilities = readBrowserTouchCapabilities(),
): boolean {
  if (controls === "touch") return true;
  if (controls === "keyboard") return false;
  return capabilities.maxTouchPoints > 0 || capabilities.coarsePointer;
}

function readBrowserTouchCapabilities(): V2TouchCapabilities {
  return {
    maxTouchPoints: typeof navigator === "undefined"
      ? 0
      : navigator.maxTouchPoints,
    coarsePointer: typeof window === "undefined" || !window.matchMedia
      ? false
      : window.matchMedia("(pointer: coarse)").matches,
  };
}
