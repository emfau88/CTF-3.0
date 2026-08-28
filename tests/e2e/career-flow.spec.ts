import { expect, test, type Page } from "@playwright/test";

const QUALIFIED_STATE = {
  version: 1,
  status: "qualified",
  attemptCount: 1,
  activeAttempt: null,
  qualifiedAt: "2026-08-28T00:00:00.000Z",
  lastExitReason: null,
  updatedAt: "2026-08-28T00:00:00.000Z",
};

test("qualified first run creates a team and completes the three-arena Proving Circuit", async ({
  page,
}) => {
  await page.addInitScript((qualifier) => {
    if (sessionStorage.getItem("career-flow-test-seeded") === "1") return;
    localStorage.clear();
    localStorage.setItem("core-arena.ui-language", "en");
    localStorage.setItem("core-arena.qualifier.v1", JSON.stringify(qualifier));
    sessionStorage.setItem("career-flow-test-seeded", "1");
  }, QUALIFIED_STATE);
  await page.goto("?scene=v2&menu=1", { waitUntil: "domcontentloaded" });

  await page.locator("#v2-menu-league").click();
  await expect(page.locator("#league-profile-setup")).toBeVisible();
  await page.locator("#league-profile-callsign").fill("Axiom");
  await page.locator("#league-profile-team-name").fill("Comet Guard");
  await page.locator('[data-wingman-id="lyra-quell"]').click();
  await page.locator("#league-profile-review").click();
  await expect(page.locator("#league-profile-review-heading")).toHaveText(/confirm.*identity/i);
  await page.locator("#league-profile-confirm").click();
  await expect(page.locator("#league-empty")).toBeVisible();
  await page.locator("#league-new-season").click();
  await expect(page.locator("#league-dashboard")).toBeVisible();

  const matches = [
    { mode: "tdm", map: "helix-canopy-v2" },
    { mode: "one-flag", map: "drowned-sun-temple-v2" },
    { mode: "ctf", map: "flow-circuit-v2" },
  ] as const;

  for (const [roundIndex, expected] of matches.entries()) {
    await page.locator("#league-play-next").click();
    await expect(page).toHaveURL(new RegExp(`mode=${expected.mode}`));
    await expect(page).toHaveURL(new RegExp(`map=${expected.map}`));
    await expect(page).toHaveURL(new RegExp(`leagueRound=${roundIndex}`));
    await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
    await finishLeagueMatch(page, 3, 1);
    await expect(page.locator("#v2-result-overlay")).toBeVisible();
    await page.locator("#v2-result-play-again").click();
    await expect(page).toHaveURL(/leagueHub=1/);
    await expect(page.locator("#league-progression")).toBeVisible();
    await expect(page.locator("#league-progression")).toContainText(
      `MATCH ${roundIndex + 1} OF 3`,
    );
    await page.locator("#league-progression-continue").click();
  }

  await expect(page.locator("#league-finish-new")).toBeVisible();
  await expect(page.locator("#league-dashboard")).toContainText("3 OF 3 COMPLETE");
  const persisted = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("core-arena.career-profile.v1") ?? "null"),
    season: JSON.parse(localStorage.getItem("core-arena.league.v2") ?? "null"),
  }));
  expect(persisted.profile.teamName).toBe("Comet Guard");
  expect(persisted.profile.selectedWingmanId).toBe("lyra-quell");
  expect(persisted.season.status).toBe("completed");
  expect(persisted.season.currentRound).toBe(3);
  expect(persisted.season.rounds).toHaveLength(3);
});

async function finishLeagueMatch(
  page: Page,
  blueScore: number,
  redScore: number,
): Promise<void> {
  await page.evaluate(({ blueScore, redScore }) => {
    window.dispatchEvent(new window.CustomEvent("v2-match-state", {
      detail: {
        phase: "ended",
        result: { kind: "winner", winnerEntryId: "blue" },
        scores: [
          { id: "blue", teamId: "blue", score: blueScore },
          { id: "red", teamId: "red", score: redScore },
        ],
        stats: [],
      },
    }));
  }, { blueScore, redScore });
}
