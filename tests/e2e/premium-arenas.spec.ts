import { expect, test, type Page } from "@playwright/test";

const premiumArenas = [
  {
    name: "Helix Canopy",
    mapId: "helix-canopy-v2",
    expectedAsset: "assets/helix-canopy/arena-master.png",
    forbiddenAssetFolders: ["assets/jungle-temple/", "assets/library/", "assets/industrial/"],
  },
  {
    name: "Temple of the Drowned Sun",
    mapId: "drowned-sun-temple-v2",
    expectedAsset: "assets/jungle-temple/arena-master-v2.png",
    forbiddenAssetFolders: ["assets/helix-canopy/", "assets/library/", "assets/industrial/"],
  },
  {
    name: "Foundry Circuit",
    mapId: "flow-circuit-v2",
    expectedAsset: "assets/foundry-circuit/arena-master-v2.png",
    forbiddenAssetFolders: ["assets/helix-canopy/", "assets/jungle-temple/", "assets/library/", "assets/industrial/"],
  },
] as const;

for (const arena of premiumArenas) {
  test(`${arena.name} starts a real V2 match with its selective preload`, async ({
    page,
  }) => {
    const diagnostics = collectBrowserDiagnostics(page);
    const requestedUrls: string[] = [];
    page.on("request", (request) => requestedUrls.push(request.url()));

    await page.goto(matchUrl(arena.mapId), { waitUntil: "domcontentloaded" });

    await expect(page.locator("#v2-arena-loading")).toHaveClass(/is-hidden/, {
      timeout: 30_000,
    });
    await expect(page.locator("#game canvas")).toHaveCount(1);
    await expect(page.locator("#game canvas")).toBeVisible();
    await expect(
      page.getByRole("toolbar", { name: "Match controls" }),
    ).toBeVisible();

    expect(requestedUrls.some((url) => url.includes(arena.expectedAsset))).toBe(
      true,
    );
    for (const folder of arena.forbiddenAssetFolders) {
      expect(
        requestedUrls.some((url) => url.includes(folder)),
        `${arena.name} unexpectedly requested ${folder}`,
      ).toBe(false);
    }
    expect(diagnostics.errors).toEqual([]);
    expect(diagnostics.failedRequests).toEqual([]);
  });
}

function matchUrl(mapId: string): string {
  const search = new URLSearchParams({
    v2: "1",
    menu: "0",
    mode: "ctf",
    map: mapId,
    teamSize: "2",
    players: "bot",
    controls: "keyboard",
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
