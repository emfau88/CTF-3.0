import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(
  repositoryRoot,
  "docs",
  "screenshots",
  "menu-refresh-2026-08-24",
);
const baseUrl = process.env.CORE_ARENA_URL ??
  "http://127.0.0.1:5190/CTF-3.0/?scene=v2&menu=1";

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: "de-DE",
    colorScheme: "dark",
  });
  const page = await desktop.newPage();
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("core-arena.ui-language", "de");
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#v2-menu-home").waitFor({ state: "visible" });
  await settle(page);
  await capture(page, "main-menu-desktop-de.png");

  await page.locator("#v2-menu-play").click();
  await page.locator('[data-setup-step-target="arena"]').click();
  await page.locator("#v2-menu-arena-preview-image").waitFor({ state: "visible" });
  await page.locator("#v2-menu-arena-preview-image").evaluate(
    (image) => image instanceof HTMLImageElement && image.decode(),
  );
  await settle(page);
  await capture(page, "custom-match-arena-desktop-de.png");

  await page.locator("#v2-menu-back").click();
  await page.locator("#v2-menu-league").click();
  await page.locator("#league-profile-setup").waitFor({ state: "visible" });
  await page.locator("#league-profile-callsign").fill("Valkyr");
  await page.locator("#league-profile-team-name").fill("Rift Sentinels");
  await page.locator("#league-profile-review").click();
  await page.locator("#league-profile-confirm").click();
  await page.locator("#league-new-season").click();
  await page.locator("#league-dashboard").waitFor({ state: "visible" });
  await settle(page);
  await capture(page, "league-hq-desktop-de.png");
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: "de-DE",
    colorScheme: "dark",
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("core-arena.ui-language", "de");
  });
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  await mobilePage.locator("#v2-menu-home").waitFor({ state: "visible" });
  await settle(mobilePage);
  await capture(mobilePage, "main-menu-mobile-de.png");
  await mobile.close();
} finally {
  await browser.close();
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          })),
    );
  });
  await page.waitForTimeout(150);
}

async function capture(page, filename) {
  await page.screenshot({
    path: join(outputDirectory, filename),
    fullPage: false,
    animations: "disabled",
  });
}
