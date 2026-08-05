import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.CTF_BASE_URL ??
  "http://127.0.0.1:5190/CTF-3.0/";
const outputRoot = path.resolve(
  process.argv[2] ?? "docs/qa/phase-3-mobile-runtime",
);
const mobileViewport = { width: 844, height: 390 };

const captures = [
  {
    kind: "mobile-countdown",
    mode: "tdm",
    controls: "touch",
    viewport: mobileViewport,
    waitMs: 120,
  },
  ...(["tdm", "ctf", "one-flag"].map((mode) => ({
    kind: `mobile-${mode}`,
    mode,
    controls: "touch",
    viewport: mobileViewport,
    waitMs: 2_800,
  }))),
  {
    kind: "mobile-combat-log",
    mode: "tdm",
    controls: "touch",
    viewport: mobileViewport,
    waitMs: 16_000,
  },
  {
    kind: "desktop-regression",
    mode: "tdm",
    controls: "keyboard",
    viewport: { width: 1280, height: 720 },
    waitMs: 2_800,
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
    const requestedUrls = [];
    const page = await browser.newPage({ viewport: capture.viewport });
    page.setDefaultTimeout(60_000);
    page.on("console", (message) => {
      if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
    page.on("request", (request) => requestedUrls.push(request.url()));
    page.on("requestfailed", (request) => {
      diagnostics.failedRequests.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
      );
    });

    const params = new URLSearchParams({
      scene: "v2",
      mode: capture.mode,
      map: "helix-canopy-v2",
      players: "bot",
      teamSize: "3",
      blueBots: "2",
      redBots: "3",
      blueBotDifficulty: "strong",
      redBotDifficulty: "casual",
      controls: capture.controls,
      skin: "alien-runner",
      sfx: "off",
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
    await page.waitForTimeout(capture.waitMs);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("v2-overlay-state", {
        detail: { paused: true },
      }));
    });
    await page.waitForTimeout(120);

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
      quality: 90,
      fullPage: false,
      animations: "disabled",
      caret: "hide",
      timeout: 120_000,
    });
    const image = await readFile(outputFile);
    const utilityBox = capture.controls === "touch"
      ? await page.locator("#v2-game-utility").boundingBox()
      : null;
    results.push({
      kind: capture.kind,
      mode: capture.mode,
      controls: capture.controls,
      viewport: capture.viewport,
      waitMsAfterLoad: capture.waitMs,
      file: relativeFile.replaceAll("\\", "/"),
      bytes: image.byteLength,
      sha256: createHash("sha256").update(image).digest("hex"),
      url,
      utilityBox,
      loadedRebuiltHelix: requestedUrls.some((requestUrl) =>
        new URL(requestUrl).pathname.endsWith(
          "/assets/helix-canopy/arena-master-v2.png",
        )
      ),
      loadedLegacyHelix: requestedUrls.some((requestUrl) =>
        new URL(requestUrl).pathname.endsWith(
          "/assets/helix-canopy/arena-master.png",
        )
      ),
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
  variant: "Phase 3 synchronized start, mobile controls, and runtime QA",
  commit: git(["rev-parse", "HEAD"]),
  branch: git(["branch", "--show-current"]),
  dirtyAtCapture: git(["status", "--short"]).length > 0,
  baseUrl,
  capturePolicy: {
    map: "helix-canopy-v2",
    mobileTeamSetup: "player + 2 hard bots versus 3 easy bots",
    imageFormat: "jpeg",
    imageQuality: 90,
    gameplayPausedImmediatelyBeforeCapture: true,
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
  ...(!result.loadedRebuiltHelix
    ? [`${result.file}: rebuilt Helix master was not loaded`]
    : []),
  ...(result.loadedLegacyHelix
    ? [`${result.file}: legacy Helix master was loaded`]
    : []),
]);

console.log(`Captured ${results.length} screenshots.`);
if (failures.length > 0) {
  throw new Error(`Browser diagnostics failed:\n${failures.join("\n")}`);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
