import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test("mobile portrait exposes the responsive menu, setup and fullscreen", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.addInitScript(() => localStorage.setItem("core-arena.ui-language", "de"));
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#v2-main-menu")).toBeVisible();
  await expect(page.locator("#v2-menu-home")).toBeVisible();
  await expect(page.locator("#v2-menu-quick-start")).toBeVisible();
  await expect(page.locator("#v2-menu-play")).toBeVisible();
  await expect(page.locator(".v2-menu-rotate")).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  await expectViewportFill(page, 390, 844);

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
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
    await expectViewportFill(page, 390, 844);
  }

  await page.locator("#v2-menu-play").click();
  await expect(page.locator("#v2-menu-setup")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deine Arena. Deine Regeln." })).toBeVisible();
  await expect(page.locator("#v2-setup-next")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  const backBox = await page.locator("#v2-menu-back").boundingBox();
  const titleBox = await page.locator(
    "#v2-menu-setup .v2-subpage-title",
  ).boundingBox();
  const actionsBox = await page.locator(
    "#v2-menu-setup .v2-subpage-header-actions",
  ).boundingBox();
  expect(backBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(rectanglesOverlap(backBox!, titleBox!)).toBe(false);
  expect(rectanglesOverlap(titleBox!, actionsBox!)).toBe(false);

  for (const step of ["mode", "arena", "teams", "overview"] as const) {
    await page.locator(`[data-setup-step-target="${step}"]`).click();
    await expect(page.locator("#v2-menu-setup"))
      .toHaveAttribute("data-setup-step", step);
    await expect(page.locator(`[data-setup-group="${step}"]`).first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);
  }
  await expect(page.locator("#v2-menu-start")).toBeVisible();
  await page.locator("#v2-menu-start").scrollIntoViewIfNeeded();
  const startBox = await page.locator("#v2-menu-start").boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.x).toBeGreaterThanOrEqual(0);
  expect(startBox!.x + startBox!.width).toBeLessThanOrEqual(390);
  if (fullscreenAvailable) {
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
  }
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
});

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
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

async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator("#v2-main-menu").evaluate((menu) =>
    menu.scrollWidth - menu.clientWidth
  );
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
