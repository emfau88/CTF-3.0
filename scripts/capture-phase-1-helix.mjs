import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CTF_BASE_URL ??
  "http://127.0.0.1:5188/CTF-3.0/";
const outputRoot = path.resolve(
  process.argv[2] ?? "docs/qa/phase-1-helix-v2-1",
);

const map = {
  id: "helix-canopy-v2",
  name: "Helix Canopy v2.1",
};
const compact = { width: 1024, height: 768 };
const reference = { width: 1280, height: 720 };
const wide = { width: 1920, height: 1080 };

const captures = [
  { kind: "overview", viewport: reference, preview: true, query: {} },
  { kind: "overview", viewport: wide, preview: true, query: {} },
  {
    kind: "collision-full-map",
    viewport: reference,
    preview: true,
    query: { collisionDebug: "1" },
  },
  {
    kind: "clearance-full-map",
    viewport: reference,
    preview: true,
    query: { clearanceHeatmap: "1" },
  },
  { kind: "gameplay", viewport: compact, preview: false, query: {} },
  { kind: "gameplay", viewport: reference, preview: false, query: {} },
  { kind: "gameplay", viewport: wide, preview: false, query: {} },
  {
    kind: "collision-gameplay",
    viewport: reference,
    preview: false,
    query: { collisionDebug: "1" },
  },
];

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];

try {
  for (const capture of captures) {
    const diagnostics = {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    };
    const page = await browser.newPage({ viewport: capture.viewport });
    page.setDefaultTimeout(60_000);
    page.on("console", (message) => {
      if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      diagnostics.failedRequests.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
      );
    });

    const params = new URLSearchParams({
      v2: "1",
      menu: "0",
      mode: "ctf",
      map: map.id,
      teamSize: "2",
      players: "bot",
      controls: "keyboard",
      skin: "alien-runner",
      sfx: "off",
      ...(capture.preview ? { mapPreview: "1" } : {}),
      ...capture.query,
    });
    const url = `${baseUrl}?${params}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("#v2-arena-loading").waitFor({
      state: "hidden",
      timeout: 30_000,
    });
    await page.locator("#game canvas").waitFor({
      state: "visible",
      timeout: 30_000,
    });
    await page.evaluate(async () => await document.fonts.ready);
    if (!capture.preview) {
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("v2-overlay-state", {
          detail: { paused: true },
        }));
      });
    }
    await page.waitForTimeout(350);

    const viewportLabel = `${capture.viewport.width}x${capture.viewport.height}`;
    const relativeFile = path.join(
      "screenshots",
      `${capture.kind}-${viewportLabel}.jpg`,
    );
    const outputFile = path.join(outputRoot, relativeFile);
    await mkdir(path.dirname(outputFile), { recursive: true });
    console.log(`Capturing ${relativeFile}...`);
    await page.screenshot({
      path: outputFile,
      type: "jpeg",
      quality: 88,
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      timeout: 120_000,
    });
    const image = await readFile(outputFile);
    results.push({
      mapId: map.id,
      mapName: map.name,
      kind: capture.kind,
      viewport: capture.viewport,
      file: relativeFile.replaceAll("\\", "/"),
      bytes: image.byteLength,
      sha256: createHash("sha256").update(image).digest("hex"),
      url,
      diagnostics,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const manifest = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  project: "Core Arena / CTF-3.0",
  variant: "Helix Canopy v2.1 gameplay-first redesign",
  commit: git(["rev-parse", "HEAD"]),
  branch: git(["branch", "--show-current"]),
  dirtyAtCapture: git(["status", "--short"]).length > 0,
  baseUrl,
  capturePolicy: {
    gameplayMode: "classic-ctf",
    teamSize: 2,
    opponent: "bots",
    gameplayPausedBeforeCapture: true,
    fullMapDiagnosticsWithoutHud: true,
    imageFormat: "jpeg",
    imageQuality: 88,
  },
  captures: results,
};

await mkdir(outputRoot, { recursive: true });
await writeFile(
  path.join(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const failures = results.flatMap((result) => [
  ...result.diagnostics.consoleErrors.map((message) =>
    `${result.file}: console: ${message}`
  ),
  ...result.diagnostics.pageErrors.map((message) =>
    `${result.file}: page: ${message}`
  ),
  ...result.diagnostics.failedRequests.map((message) =>
    `${result.file}: request: ${message}`
  ),
]);

console.log(
  `Captured ${results.length} screenshots (${results.reduce((sum, result) => sum + result.bytes, 0)} bytes).`,
);
if (failures.length > 0) {
  throw new Error(`Browser diagnostics failed:\n${failures.join("\n")}`);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
