import { expect, test } from "@playwright/test";

async function openFreshMenu(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("qualifier-test-seeded") === "1") return;
    localStorage.clear();
    sessionStorage.setItem("qualifier-test-seeded", "1");
  });
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });
}

test("fresh Career starts the guided qualifier in one click and can recover to training", async ({ page }) => {
  await openFreshMenu(page);

  await page.locator("#v2-menu-league").click();
  await expect(page).toHaveURL(/qualifier=1/);
  const params = new URL(page.url()).searchParams;
  expect(params.get("mode")).toBe("tdm");
  expect(params.get("map")).toBe("helix-canopy-v2");
  expect(params.get("blueBots")).toBe("1");
  expect(params.get("redBots")).toBe("2");
  expect(params.get("controls")).toBe("keyboard");

  const guide = page.locator("#v2-qualifier-guide");
  await expect(guide).toBeVisible();
  await expect(guide).toContainText("0/5");
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(120);
  await page.keyboard.up("KeyW");
  await expect(guide.locator("h2")).toHaveText("Aim");
  await page.mouse.move(500, 320);
  await page.waitForTimeout(120);
  await page.mouse.move(560, 360);
  await expect(guide.locator("h2")).toHaveText("Arc Lash");
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(guide.locator("h2")).toHaveText("Pickup weapon");
  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("core-arena.qualifier.v1");
    return raw ? JSON.parse(raw).activeAttempt?.completedActions?.join(",") ?? "" : "";
  })).toMatch(/move.*aim.*arc-lash.*jump/);

  await page.locator("#v2-game-menu-button").click();
  await page.locator("#v2-pause-main-menu").click();
  await expect(page.locator("#v2-menu-home")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("core-arena.qualifier.v1");
    return raw ? JSON.parse(raw).status : "missing";
  })).toBe("not-started");

  await page.locator("#v2-open-help").click();
  await expect(page.locator("#v2-start-training")).toBeVisible();
  await page.locator("#v2-start-training").click();
  await expect(page).toHaveURL(/training=1/);
  await expect(page.locator("#v2-qualifier-guide")).toBeVisible();
});

test("any qualifier result grants QUALIFIED and continues to team creation without League points", async ({ page }) => {
  await openFreshMenu(page);
  await page.locator("#v2-menu-league").click();
  await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    window.dispatchEvent(new window.CustomEvent("v2-match-state", {
      detail: {
        phase: "ended",
        result: { kind: "winner", winnerEntryId: "red" },
        scores: [
          { id: "blue", teamId: "blue", score: 2 },
          { id: "red", teamId: "red", score: 5 },
        ],
        stats: [],
      },
    }));
  });
  await expect(page.locator("#v2-result-title")).toHaveText("Qualified");
  await expect(page.locator("#v2-result-detail")).toContainText("does not affect League points");
  expect(await page.evaluate(() => {
    const raw = localStorage.getItem("core-arena.qualifier.v1");
    return raw ? JSON.parse(raw).status : "missing";
  })).toBe("qualified");
  expect(await page.evaluate(() => localStorage.getItem("core-arena.league.v2"))).toBeNull();

  await page.locator("#v2-result-play-again").click();
  await expect(page.locator("#league-profile-setup")).toBeVisible();
  await expect(page).toHaveURL(/leagueHub=1/);
});
