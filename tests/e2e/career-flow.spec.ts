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

test("qualified first run creates a team and completes the six-match Proving-to-Contender career", async ({
  page,
}) => {
  // Six arena loads, team setup and two recruitment decisions share one test.
  // Keep individual assertions bounded; allow the complete journey time on CI.
  test.setTimeout(120_000);
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

  const provingMatches = [
    { mode: "tdm", map: "helix-canopy-v2", difficulty: "normal" },
    { mode: "one-flag", map: "drowned-sun-temple-v2", difficulty: "normal" },
    { mode: "ctf", map: "flow-circuit-v2", difficulty: "normal" },
  ] as const;
  const contenderMatches = [
    { mode: "one-flag", map: "helix-canopy-v2", difficulty: "normal" },
    { mode: "tdm", map: "flow-circuit-v2", difficulty: "normal" },
    { mode: "ctf", map: "drowned-sun-temple-v2", difficulty: "strong" },
  ] as const;
  let recruitedWingmanId: string | null = null;

  for (const [roundIndex, expected] of provingMatches.entries()) {
    await page.locator("#league-play-next").click();
    await expect(page).toHaveURL(new RegExp(`mode=${expected.mode}`));
    await expect(page).toHaveURL(new RegExp(`map=${expected.map}`));
    await expect(page).toHaveURL(new RegExp(`redBotDifficulty=${expected.difficulty}`));
    await expect(page).toHaveURL(new RegExp(`leagueRound=${roundIndex}`));
    await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
    await finishLeagueMatch(page, 3, 1);
    await expect(page.locator("#v2-result-overlay")).toBeVisible();
    const returnToLeague = page.locator("#v2-result-play-again");
    await expect(returnToLeague).toBeEnabled();
    await returnToLeague.click();
    await expect(page).toHaveURL(/leagueHub=1/);
    await expect(page.locator("#league-progression")).toBeVisible();
    await expect(page.locator("#league-progression")).toContainText(
      `MATCH ${roundIndex + 1} OF 3`,
    );
    if (roundIndex === 0) {
      const continueButton = page.locator("#league-progression-continue");
      await expect(page.locator(".league-recruitment-choice")).toHaveCount(3);
      await expect(continueButton).toBeDisabled();
      const recruit = page.locator("[data-recruitment-choice]").first();
      recruitedWingmanId = await recruit.getAttribute("data-recruitment-choice");
      expect(recruitedWingmanId).not.toBeNull();
      await recruit.click();
      await expect(continueButton).toBeEnabled();
    }
    await page.locator("#league-progression-continue").click();
  }

  await expect(page.locator("#league-advance-contender")).toBeVisible();
  await page.locator("#league-advance-contender").click();
  await expect(page.locator("#league-dashboard")).toContainText("Contender Circuit");

  for (const [roundIndex, expected] of contenderMatches.entries()) {
    await page.locator("#league-play-next").click();
    await expect(page).toHaveURL(new RegExp(`mode=${expected.mode}`));
    await expect(page).toHaveURL(new RegExp(`map=${expected.map}`));
    await expect(page).toHaveURL(new RegExp(`redBotDifficulty=${expected.difficulty}`));
    await expect(page).toHaveURL(new RegExp(`leagueRound=${roundIndex}`));
    await expect(page.locator("#game canvas")).toBeVisible({ timeout: 15_000 });
    await finishLeagueMatch(page, 3, 1);
    const returnToLeague = page.locator("#v2-result-play-again");
    await expect(returnToLeague).toBeEnabled();
    await returnToLeague.click();
    await expect(page).toHaveURL(/leagueHub=1/);
    await expect(page.locator("#league-progression")).toBeVisible();
    if (roundIndex === 0) {
      const continueButton = page.locator("#league-progression-continue");
      await expect(continueButton).toBeDisabled();
      await page.locator("[data-recruitment-choice]").first().click();
      await expect(continueButton).toBeEnabled();
    }
    await page.locator("#league-progression-continue").click();
  }

  await expect(page.locator("#league-finish-new")).toBeVisible();
  await expect(page.locator("#league-dashboard")).toContainText("3 OF 3 COMPLETE");
  const persisted = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("core-arena.career-profile.v1") ?? "null"),
    career: JSON.parse(localStorage.getItem("core-arena.league.v3") ?? "null"),
  }));
  expect(persisted.profile.teamName).toBe("Comet Guard");
  expect(persisted.profile.unlockedWingmanIds).toContain(recruitedWingmanId);
  expect(persisted.career.qualifiedCircuitIds).toContain("proving");
  expect(persisted.career.activeCircuitId).toBe("contender");
  expect(persisted.career.season.status).toBe("completed");
  expect(persisted.career.season.currentRound).toBe(3);
  expect(persisted.career.season.rounds).toHaveLength(3);
});

async function finishLeagueMatch(
  page: Page,
  blueScore: number,
  redScore: number,
): Promise<void> {
  const context = new URL(page.url()).searchParams;
  const seasonId = context.get("leagueSeason");
  const nextRound = Number(context.get("leagueRound")) + 1;
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
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("core-arena.league.v3") ?? "null");
    return { seasonId: saved?.season?.seasonId, round: saved?.season?.currentRound };
  }), { message: "The match result must be persisted before leaving the arena" })
    .toEqual({ seasonId, round: nextRound });
}
