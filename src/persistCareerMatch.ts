import { CareerSaveError, withCareerSaveLock } from "./careerSaveGuard";
import { syncCareerUnlocks } from "./careerProfile";
import { completeLeagueRound, createLeagueCareerRepository, type CompleteLeagueMatchInput } from "./meta/league";
import type { SavePort } from "./platform";

/** Reload and validate inside the lock. A repeated result cannot award anything twice. */
export function persistCareerMatch(storage: SavePort, input: CompleteLeagueMatchInput): Promise<void> {
  return withCareerSaveLock(() => {
    const repository = createLeagueCareerRepository(storage);
    const career = repository.load();
    if (!career || career.season.seasonId !== input.seasonId) throw new CareerSaveError("stale");
    const match = career.season.rounds[input.roundIndex]?.matches.find((entry) => entry.id === input.matchId);
    if (!match || ![match.homeTeamId, match.awayTeamId].includes(career.season.playerTeamId)) {
      throw new CareerSaveError("stale");
    }
    if (match.result) return;
    if (career.season.status !== "active" || input.roundIndex !== career.season.currentRound) {
      throw new CareerSaveError("stale");
    }
    const profile = repository.loadProfile();
    completeLeagueRound(career.season, input);
    if (profile) syncCareerUnlocks(profile, career.season.defeatedTeamIds);
    repository.save(career, profile ?? undefined);
  });
}
