import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inflateSync } from "node:zlib";

const EMBLEM_FILENAMES = [
  "comet-lance-emblem.png",
  "orbit-talon-emblem.png",
  "rift-crown-emblem.png",
] as const;

const CANVAS_SIZE = 512;
const MIN_ALPHA_MARGIN = Math.ceil(CANVAS_SIZE * 0.08);
const MIN_LONGEST_ALPHA_SPAN = 400;

interface DecodedRgbaPng {
  readonly width: number;
  readonly height: number;
  readonly pixels: Buffer;
}

interface AlphaBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

test("career emblems keep a transparent optical safe zone", () => {
  for (const filename of EMBLEM_FILENAMES) {
    const png = readFileSync(
      new URL(`../public/assets/league/player-emblems/${filename}`, import.meta.url),
    );
    const decoded = decodeRgbaPng(png, filename);
    const bounds = findAlphaBounds(decoded, filename);
    const margins = {
      left: bounds.left,
      top: bounds.top,
      right: decoded.width - bounds.right,
      bottom: decoded.height - bounds.bottom,
    };

    assert.equal(decoded.width, CANVAS_SIZE, `${filename} width`);
    assert.equal(decoded.height, CANVAS_SIZE, `${filename} height`);
    for (const [side, margin] of Object.entries(margins)) {
      assert.ok(
        margin >= MIN_ALPHA_MARGIN,
        `${filename} ${side} alpha margin is ${margin}px; expected at least ${MIN_ALPHA_MARGIN}px`,
      );
    }
    assert.ok(
      Math.max(bounds.width, bounds.height) >= MIN_LONGEST_ALPHA_SPAN,
      `${filename} should remain optically legible inside its safe zone`,
    );
  }
});

function decodeRgbaPng(png: Buffer, filename: string): DecodedRgbaPng {
  assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a", `${filename} PNG signature`);

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    assert.ok(dataEnd + 4 <= png.length, `${filename} has a complete ${type} chunk`);

    if (type === "IHDR") {
      width = png.readUInt32BE(dataStart);
      height = png.readUInt32BE(dataStart + 4);
      bitDepth = png[dataStart + 8];
      colorType = png[dataStart + 9];
      interlace = png[dataStart + 12];
    } else if (type === "IDAT") {
      idatChunks.push(png.subarray(dataStart, dataEnd));
    }
    offset = dataEnd + 4;
  }

  assert.equal(width, CANVAS_SIZE, `${filename} width`);
  assert.equal(height, CANVAS_SIZE, `${filename} height`);
  assert.equal(bitDepth, 8, `${filename} must use 8-bit channels`);
  assert.equal(colorType, 6, `${filename} must use RGBA color type`);
  assert.equal(interlace, 0, `${filename} must be non-interlaced`);
  assert.ok(idatChunks.length > 0, `${filename} must contain image data`);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const scanlines = inflateSync(Buffer.concat(idatChunks));
  assert.equal(
    scanlines.length,
    height * (stride + 1),
    `${filename} decompressed scanline length`,
  );

  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = scanlines[sourceOffset];
    sourceOffset += 1;
    assert.ok(filter <= 4, `${filename} uses a supported PNG filter`);
    const rowOffset = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = scanlines[sourceOffset];
      sourceOffset += 1;
      const left = x >= bytesPerPixel ? pixels[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[rowOffset - stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[rowOffset - stride + x - bytesPerPixel]
        : 0;
      const predictor = filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : paeth(left, up, upperLeft);
      pixels[rowOffset + x] = (raw + predictor) & 0xff;
    }
  }

  return { width, height, pixels };
}

function findAlphaBounds(decoded: DecodedRgbaPng, filename: string): AlphaBounds {
  let minX = decoded.width;
  let minY = decoded.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const alpha = decoded.pixels[(y * decoded.width + x) * 4 + 3];
      if (alpha === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  assert.ok(maxX >= minX && maxY >= minY, `${filename} must contain visible pixels`);
  return {
    left: minX,
    top: minY,
    right: maxX + 1,
    bottom: maxY + 1,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function paeth(left: number, up: number, upperLeft: number): number {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
}
