"""Normalize an alpha spritesheet into an exact, evenly sized grid."""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


def alpha_bounds(image: Image.Image, trim_fraction: float) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    if trim_fraction <= 0:
        return alpha.getbbox()
    coordinates = [
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if alpha.getpixel((x, y)) >= 16
    ]
    if not coordinates:
        return None
    x_values = sorted(x for x, _ in coordinates)
    y_values = sorted(y for _, y in coordinates)
    trim_count = min(len(coordinates) // 2 - 1, round(len(coordinates) * trim_fraction))
    left = max(0, x_values[trim_count] - 2)
    right = min(image.width, x_values[-trim_count - 1] + 3)
    top = max(0, y_values[trim_count] - 2)
    bottom = min(image.height, y_values[-trim_count - 1] + 3)
    return left, top, right, bottom


def remove_small_components(image: Image.Image, minimum_ratio: float) -> Image.Image:
    if minimum_ratio <= 0:
        return image
    alpha = image.getchannel("A")
    width, height = image.size
    pixels = alpha.load()
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in visited or pixels[x, y] < 16:
                continue
            stack = [(x, y)]
            visited.add((x, y))
            component: list[tuple[int, int]] = []
            while stack:
                current_x, current_y = stack.pop()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    if (next_x, next_y) in visited or pixels[next_x, next_y] < 16:
                        continue
                    visited.add((next_x, next_y))
                    stack.append((next_x, next_y))
            components.append(component)

    if not components:
        return image
    minimum_area = max(1, round(max(len(component) for component in components) * minimum_ratio))
    keep = {point for component in components if len(component) >= minimum_area for point in component}
    cleaned = image.copy()
    cleaned_pixels = cleaned.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] >= 16 and (x, y) not in keep:
                red, green, blue, _ = cleaned_pixels[x, y]
                cleaned_pixels[x, y] = (red, green, blue, 0)
    return cleaned


def parse_row_alignments(value: str, rows: int) -> list[str]:
    alignments = [item.strip() for item in value.split(",") if item.strip()]
    if len(alignments) == 1:
        alignments *= rows
    if len(alignments) != rows or any(item not in {"left", "center", "right"} for item in alignments):
        raise ValueError("--align-x must be one value or one left/center/right value per row")
    return alignments


def parse_boundaries(value: str | None, count: int, length: int) -> list[int]:
    if value is None:
        return [round(index * length / count) for index in range(count + 1)]
    boundaries = [int(item.strip()) for item in value.split(",") if item.strip()]
    if len(boundaries) != count + 1:
        raise ValueError("Source boundaries must contain one more value than the grid count")
    if boundaries[0] != 0 or boundaries[-1] != length or boundaries != sorted(boundaries):
        raise ValueError("Source boundaries must be sorted and span the complete source dimension")
    return boundaries


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--cell-size", type=int, required=True)
    parser.add_argument("--padding", type=int, default=8)
    parser.add_argument("--align-x", default="center")
    parser.add_argument("--min-component-ratio", type=float, default=0.0)
    parser.add_argument("--trim-outlier-fraction", type=float, default=0.0)
    parser.add_argument("--source-row-boundaries")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    row_alignments = parse_row_alignments(args.align_x, args.rows)
    row_boundaries = parse_boundaries(args.source_row_boundaries, args.rows, source.height)
    cells: list[Image.Image] = []
    subjects: list[Image.Image] = []

    for row in range(args.rows):
        top = row_boundaries[row]
        bottom = row_boundaries[row + 1]
        for column in range(args.columns):
            left = round(column * source.width / args.columns)
            right = round((column + 1) * source.width / args.columns)
            cell = remove_small_components(
                source.crop((left, top, right, bottom)),
                args.min_component_ratio,
            )
            cell.putalpha(cell.getchannel("A").point(lambda value: 0 if value < 16 else value))
            bounds = alpha_bounds(cell, args.trim_outlier_fraction)
            if bounds is None:
                raise ValueError(f"No visible pixels in cell row={row} column={column}")
            cells.append(cell)
            subjects.append(cell.crop(bounds))

    content_size = args.cell_size - args.padding * 2
    max_width = max(subject.width for subject in subjects)
    max_height = max(subject.height for subject in subjects)
    scale = min(content_size / max_width, content_size / max_height)
    output = Image.new("RGBA", (args.columns * args.cell_size, args.rows * args.cell_size))

    for index, subject in enumerate(subjects):
        row = index // args.columns
        column = index % args.columns
        width = max(1, round(subject.width * scale))
        height = max(1, round(subject.height * scale))
        resized = subject.resize((width, height), Image.Resampling.LANCZOS)
        alignment = row_alignments[row]
        if alignment == "left":
            x = args.padding
        elif alignment == "right":
            x = args.cell_size - args.padding - width
        else:
            x = (args.cell_size - width) // 2
        y = (args.cell_size - height) // 2
        output.alpha_composite(resized, (column * args.cell_size + x, row * args.cell_size + y))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output, optimize=True)


if __name__ == "__main__":
    main()
