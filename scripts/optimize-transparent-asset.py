"""Crop and resize a transparent source into a square game texture."""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=20)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    bounds = image.getbbox()
    if bounds is None:
        raise ValueError(f"No visible pixels in {args.input}")
    subject = image.crop(bounds)
    content_size = max(1, args.size - args.padding * 2)
    subject.thumbnail((content_size, content_size), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (args.size, args.size))
    output.alpha_composite(
        subject,
        ((args.size - subject.width) // 2, (args.size - subject.height) // 2),
    )
    output.save(args.input, optimize=True)


if __name__ == "__main__":
    main()
