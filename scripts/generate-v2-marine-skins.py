from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "arena-characters.png"
OUT_DIR = ROOT / "public" / "assets"
FRAME = 128

SKINS = [
    ("space-marine-red-rifle", 0),
    ("space-marine-red-heavy", 1),
    ("space-marine-red-scout", 2),
    ("space-marine-red-medic", 3),
    ("space-marine-blue-rifle", 4),
    ("space-marine-blue-heavy", 5),
    ("space-marine-blue-scout", 6),
    ("space-marine-blue-medic", 7),
]

DIRECTION_COLUMNS = {
    "down": 2,
    "right": 1,
    "up": 0,
    "left": 3,
}

# Output row order matches V2_CHARACTER_DIRECTIONS.
DIRECTION_ORDER = ["down", "right", "up", "left"]
WALK_POSES = [
    {"dx": 0, "dy": 0, "angle": 0},
    {"dx": -3, "dy": 2, "angle": -2.4},
    {"dx": 0, "dy": -2, "angle": 0},
    {"dx": 3, "dy": 2, "angle": 2.4},
]


def remove_shadow_ring(frame: Image.Image) -> Image.Image:
    cleaned = frame.copy()
    pixels = cleaned.load()
    for y in range(FRAME):
        for x in range(FRAME):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            saturation = max(r, g, b) - min(r, g, b)
            near_edge = y > 86 or x < 10 or x > 117
            weak_shadow = a < 48
            grey_ring = near_edge and saturation < 18 and a < 180
            if weak_shadow or grey_ring:
                pixels[x, y] = (r, g, b, 0)
    return cleaned


def posed(frame: Image.Image, dx: int, dy: int, angle: float) -> Image.Image:
    rotated = frame.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        center=(FRAME // 2, FRAME // 2 + 10),
    )
    out = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    out.alpha_composite(rotated, (dx, dy))
    return out


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    for name, source_row in SKINS:
        sheet = Image.new("RGBA", (FRAME * 4, FRAME * 4), (0, 0, 0, 0))
        for target_row, direction in enumerate(DIRECTION_ORDER):
            source_col = DIRECTION_COLUMNS[direction]
            box = (
                source_col * FRAME,
                source_row * FRAME,
                (source_col + 1) * FRAME,
                (source_row + 1) * FRAME,
            )
            base = remove_shadow_ring(source.crop(box))
            for target_col, pose in enumerate(WALK_POSES):
                frame = posed(base, pose["dx"], pose["dy"], pose["angle"])
                sheet.alpha_composite(
                    frame,
                    (target_col * FRAME, target_row * FRAME),
                )
        sheet.save(OUT_DIR / f"{name}-spritesheet-4x4.png")


if __name__ == "__main__":
    main()
