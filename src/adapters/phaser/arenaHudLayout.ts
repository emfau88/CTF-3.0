export type ArenaHudDensity = "micro" | "compact" | "standard";

export interface ArenaHudRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ArenaHudLayout {
  readonly density: ArenaHudDensity;
  readonly header: ArenaHudRect;
  readonly objectiveY: number;
  readonly killFeed: ArenaHudRect;
  readonly killFeedVisible: boolean;
  readonly playerStatus: ArenaHudRect;
  readonly playerStatusVisible: boolean;
  readonly playerStatusPortrait: boolean;
}

export function calculateArenaHudLayout(
  width: number,
  height: number,
  mobileControls: boolean,
): ArenaHudLayout {
  const density: ArenaHudDensity =
    width < 520 || height < 300
      ? "micro"
      : width < 980 || height < 600
      ? "compact"
      : "standard";
  const headerWidth = density === "micro"
    ? Math.min(178, width - 16)
    : density === "compact"
    ? Math.min(292, width - 24)
    : 364;
  const headerHeight = density === "micro" ? 38 : density === "compact" ? 54 : 64;
  const headerY = density === "micro" ? 6 : 10;
  const header: ArenaHudRect = {
    x: Math.round((width - headerWidth) / 2),
    y: headerY,
    width: headerWidth,
    height: headerHeight,
  };

  const killFeedWidth = density === "standard"
    ? 252
    : Math.min(222, width - 20);
  const utilityStacked = width < 700 || height <= 520 || mobileControls;
  const killFeedY = utilityStacked
    ? header.y + header.height + (density === "micro" ? 78 : 46)
    : width < 1100
    ? header.y + header.height + 10
    : 58;
  const killFeed: ArenaHudRect = {
    x: Math.max(8, width - killFeedWidth - 12),
    y: killFeedY,
    width: killFeedWidth,
    height: density === "standard" ? 26 : 23,
  };

  const playerStatusVisible = density !== "micro";
  const playerStatusPortrait = density === "standard" && !mobileControls;
  const playerStatusWidth = playerStatusPortrait ? 220 : 174;
  const playerStatusHeight = playerStatusPortrait ? 68 : 50;
  const playerStatus: ArenaHudRect = {
    x: density === "standard" ? 12 : 8,
    y: mobileControls
      ? header.y + header.height + 8
      : Math.max(8, height - playerStatusHeight - (density === "standard" ? 12 : 8)),
    width: playerStatusWidth,
    height: playerStatusHeight,
  };

  return {
    density,
    header,
    objectiveY: header.y + header.height + 6,
    killFeed,
    killFeedVisible: width >= 430 && height >= 260,
    playerStatus,
    playerStatusVisible,
    playerStatusPortrait,
  };
}
