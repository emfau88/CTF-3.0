import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test("mobile portrait exposes the main menu and Quick Play setup", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });

  await expect(page.locator("#v2-main-menu")).toBeVisible();
  await expect(page.locator("#v2-menu-home")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick Play" })).toBeVisible();
  await expect(page.locator(".v2-menu-rotate")).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(2);

  await page.getByRole("button", { name: "Quick Play" }).click();
  await expect(page.locator("#v2-menu-setup")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick Play" })).toBeVisible();
  await expect(page.locator("#v2-menu-start")).toBeVisible();
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
  expect(backBox!.x + backBox!.width).toBeLessThanOrEqual(titleBox!.x);
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(actionsBox!.x);
  await page.locator("#v2-menu-start").scrollIntoViewIfNeeded();
  const startBox = await page.locator("#v2-menu-start").boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.x).toBeGreaterThanOrEqual(0);
  expect(startBox!.x + startBox!.width).toBeLessThanOrEqual(390);
  expect(diagnostics.errors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
});

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
