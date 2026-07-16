import Phaser from "phaser";

export const HUD_COLORS = {
  panel: 0x07121d,
  panelRaised: 0x0c1b29,
  panelSoft: 0x101f2d,
  border: 0x8aa0b2,
  borderBright: 0xc4d4df,
  blue: 0x55bfe8,
  red: 0xec5a61,
  neutral: 0xf3f7f9,
  muted: 0x91a6b4,
  health: 0x58c986,
  armor: 0xd0aa5b,
  cooldown: 0x69727d,
} as const;

export const HUD_CSS_COLORS = {
  blue: "#61c6eb",
  red: "#f06b70",
  neutral: "#f3f7f9",
  muted: "#91a6b4",
  health: "#63d18e",
  armor: "#d8b867",
  darkText: "#07121d",
} as const;

export interface TechnicalPanelOptions {
  readonly accent?: number;
  readonly fillAlpha?: number;
  readonly borderAlpha?: number;
  readonly cut?: number;
  readonly raised?: boolean;
}

export function drawTechnicalPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: TechnicalPanelOptions = {},
): void {
  const cut = Math.min(
    options.cut ?? 8,
    Math.max(0, width / 4),
    Math.max(0, height / 3),
  );
  graphics.clear();
  drawTechnicalPanelShape(
    graphics,
    x,
    y,
    width,
    height,
    cut,
    options,
  );
}

export function drawWeaponStrip(
  graphics: Phaser.GameObjects.Graphics,
  input: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly slots: readonly {
      readonly x: number;
      readonly y: number;
      readonly radius: number;
      readonly available: boolean;
    }[];
  },
): void {
  graphics.clear();
  drawTechnicalPanelShape(
    graphics,
    input.x,
    input.y,
    input.width,
    input.height,
    Math.min(10, input.height * .2),
    {
      fillAlpha: .78,
      borderAlpha: .24,
      accent: HUD_COLORS.blue,
    },
  );

  for (const slot of input.slots) {
    const half = slot.radius + 4;
    const x = slot.x - half;
    const y = slot.y - half;
    const size = half * 2;
    graphics.fillStyle(
      slot.available ? HUD_COLORS.panelRaised : HUD_COLORS.panel,
      slot.available ? .84 : .36,
    );
    graphics.fillRoundedRect(x, y, size, size, Math.min(6, half * .22));
    graphics.lineStyle(
      1,
      slot.available ? HUD_COLORS.borderBright : HUD_COLORS.border,
      slot.available ? .28 : .1,
    );
    graphics.strokeRoundedRect(x, y, size, size, Math.min(6, half * .22));
    if (slot.available) {
      graphics.lineStyle(2, HUD_COLORS.blue, .62)
        .beginPath()
        .moveTo(x + 7, y + 1)
        .lineTo(x + size - 7, y + 1)
        .strokePath();
    }
  }
}

export function drawHudBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: number,
): void {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  graphics.fillStyle(HUD_COLORS.borderBright, .12);
  graphics.fillRoundedRect(x, y, width, height, Math.min(3, height / 2));
  if (clamped <= 0) return;
  graphics.fillStyle(color, .96);
  graphics.fillRoundedRect(
    x,
    y,
    Math.max(height, width * clamped),
    height,
    Math.min(3, height / 2),
  );
}

function drawTechnicalPanelShape(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number,
  options: TechnicalPanelOptions,
): void {
  const path = () => {
    graphics.beginPath()
      .moveTo(x + cut, y)
      .lineTo(x + width - cut, y)
      .lineTo(x + width, y + cut)
      .lineTo(x + width, y + height - cut)
      .lineTo(x + width - cut, y + height)
      .lineTo(x + cut, y + height)
      .lineTo(x, y + height - cut)
      .lineTo(x, y + cut)
      .closePath();
  };

  path();
  graphics.fillStyle(
    options.raised ? HUD_COLORS.panelRaised : HUD_COLORS.panel,
    options.fillAlpha ?? .88,
  );
  graphics.fillPath();

  graphics.fillStyle(HUD_COLORS.panelSoft, .34);
  graphics.fillRect(x + cut, y + 1, Math.max(0, width - cut * 2), 2);

  path();
  graphics.lineStyle(
    1,
    HUD_COLORS.border,
    options.borderAlpha ?? .24,
  );
  graphics.strokePath();

  if (options.accent !== undefined) {
    graphics.lineStyle(2, options.accent, .78)
      .beginPath()
      .moveTo(x + cut + 2, y + 1)
      .lineTo(x + Math.min(width * .28, 74), y + 1)
      .strokePath();
  }
}
