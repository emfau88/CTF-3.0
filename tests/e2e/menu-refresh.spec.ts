import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test("desktop menu is complete, bilingual, edge-to-edge and fullscreen-safe", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("core-arena.ui-language", "de");
  });
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#v2-menu-home")).toBeVisible();
  await expectViewportFill(page, 1440, 900);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);

  await expect(page.locator("#v2-menu-league")).toBeVisible();
  await expect(page.locator("#v2-menu-quick-start")).toBeVisible();
  await expect(page.locator("#v2-menu-play")).toBeVisible();
  await expect(page.locator(".v2-home-imagegen-icon")).toHaveCount(3);
  await expect(page.locator("#v2-open-settings")).toBeVisible();
  await expect(page.locator("#v2-open-help")).toBeVisible();

  await page.locator("#v2-open-settings").click();
  await expect(page.locator("#v2-settings-dialog")).toBeVisible();
  await page.locator('[data-ui-language="en"]').click();
  await expect(page.locator("#v2-menu-play")).toContainText("Custom Match");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator('[data-ui-language="de"]').click();
  await expect(page.locator("#v2-menu-play")).toContainText("Eigenes Match");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.locator("#v2-settings-close").click();

  const fullscreenButton = page.locator(
    "#v2-menu-home [data-v2-fullscreen-control]",
  );
  const fullscreenAvailable = await page.evaluate(() =>
    document.fullscreenEnabled &&
    typeof document.documentElement.requestFullscreen === "function"
  );
  if (fullscreenAvailable) {
    await expect(fullscreenButton).toBeVisible();
    await fullscreenButton.click();
    await expect.poll(() =>
      page.evaluate(() => Boolean(document.fullscreenElement))
    ).toBe(true);
    await expectViewportFill(page, 1440, 900);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  }

  await page.locator("#v2-menu-play").click();
  await expect(page.locator("#v2-menu-setup")).toBeVisible();
  for (const step of ["mode", "arena", "teams", "overview"] as const) {
    await page.locator(`[data-setup-step-target="${step}"]`).click();
    await expect(page.locator("#v2-menu-setup"))
      .toHaveAttribute("data-setup-step", step);
    await expect(page.locator(`[data-setup-group="${step}"]`).first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  }
  await page.locator('[data-setup-step-target="arena"]').click();
  const preview = page.locator("#v2-menu-arena-preview-image");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect(await preview.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
  const nextBox = await page.locator("#v2-setup-next").boundingBox();
  expect(nextBox).not.toBeNull();
  expect(nextBox!.y + nextBox!.height).toBeLessThanOrEqual(900);
  expect(await verticalOverflow(page)).toBeLessThanOrEqual(2);

  if (fullscreenAvailable) {
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
  }

  await page.locator("#v2-menu-back").click();
  await page.locator("#v2-menu-league").click();
  await expect(page.locator("#v2-league-hub")).toBeVisible();
  await expect(page.locator("#league-profile-setup")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
});

test("compact desktop arena step keeps its navigation in view", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => localStorage.setItem("core-arena.ui-language", "de"));
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });
  await page.locator("#v2-menu-play").click();
  await page.locator('[data-setup-step-target="arena"]').click();
  await expect(page.locator("#v2-menu-arena-preview-image")).toBeVisible();

  const nextBox = await page.locator("#v2-setup-next").boundingBox();
  expect(nextBox).not.toBeNull();
  expect(nextBox!.y).toBeGreaterThanOrEqual(0);
  expect(nextBox!.y + nextBox!.height).toBeLessThanOrEqual(768);
  expect(await verticalOverflow(page)).toBeLessThanOrEqual(2);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
});

async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("#v2-main-menu").evaluate((menu) =>
    menu.scrollWidth - menu.clientWidth
  );
}

async function verticalOverflow(page: Page): Promise<number> {
  return page.locator("#v2-main-menu").evaluate((menu) =>
    menu.scrollHeight - menu.clientHeight
  );
}

async function expectViewportFill(
  page: Page,
  width: number,
  height: number,
): Promise<void> {
  const box = await page.locator("#v2-main-menu").boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.width - width)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.height - height)).toBeLessThanOrEqual(1);
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
