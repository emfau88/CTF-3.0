import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("all shipped WAV preload paths resolve after the filename cleanup", () => {
  const source = readFileSync(resolve("src/assets.ts"), "utf8");
  const entries = [...source.matchAll(
    /scene\.load\.audio\("([^"]+)", assetUrl\("sounds\/([^"]+\.wav)"\)\)/g,
  )];

  assert.equal(entries.length, 17);
  assert.equal(new Set(entries.map((entry) => entry[1])).size, entries.length);
  for (const [, key, file] of entries) {
    assert.match(file, /^[a-z0-9]+(?:-[a-z0-9]+)*\.wav$/, key);
    assert.ok(existsSync(resolve("public/assets/sounds", file)), `${key}: ${file}`);
  }
});
