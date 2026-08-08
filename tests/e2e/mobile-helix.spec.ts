import { expect, test, type Page } from "@playwright/test";

const modes = ["tdm", "ctf", "one-flag"] as const;

test.use({ hasTouch: true });

for (const mode of modes) {
  test(`Helix mobile ${mode} uses the rebuilt map and edge-safe HUD`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const diagnostics = collectBrowserDiagnostics(page);
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));

    await page.goto(matchUrl(mode), { waitUntil: "domcontentloaded" });
    await expect(page.locator("#v2-arena-loading")).toHaveClass(/is-hidden/, {
      timeout: 30_000,
    });
    await expect(page.locator("#game canvas")).toBeVisible();

    const utility = page.getByRole("toolbar", { name: "Match controls" });
    await expect(utility).toBeVisible();
    const utilityBox = await utility.boundingBox();
    expect(utilityBox).not.toBeNull();
    expect(utilityBox!.y).toBeLessThanOrEqual(8);
    expect(844 - utilityBox!.x - utilityBox!.width).toBeLessThanOrEqual(8);
    await expect(page.locator("#v2-fullscreen-button")).toBeHidden();

    expect(
      requestedUrls.some((url) =>
        new URL(url).pathname.endsWith(
          "/assets/helix-canopy/arena-master-v2.png",
        )
      ),
    ).toBe(true);
    expect(
      requestedUrls.some((url) =>
        new URL(url).pathname.endsWith(
          "/assets/helix-canopy/arena-master.png",
        )
      ),
    ).toBe(false);
    expect(diagnostics.errors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
  });
}

function matchUrl(mode: typeof modes[number]): string {
  const search = new URLSearchParams({
    v2: "1",
    menu: "0",
    mode,
    map: "helix-canopy-v2",
    teamSize: "3",
    blueBots: "2",
    redBots: "3",
    blueBotDifficulty: "strong",
    redBotDifficulty: "casual",
    players: "bot",
    controls: "auto",
    skin: "alien-runner",
    sfx: "off",
  });
  return `?${search.toString()}`;
}

function collectBrowserDiagnostics(page: Page): {
  errors: string[];
  failedRequests: string[];
} {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
    );
  });
  return { errors, failedRequests };
}
