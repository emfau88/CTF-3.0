import assert from "node:assert/strict";
import test from "node:test";
import { createCareerProfile, createCareerProfileRepository, CAREER_PROFILE_STORAGE_KEY } from "../src/careerProfile";
import { CareerSaveError, withCareerSaveLock } from "../src/careerSaveGuard";
import { persistCareerMatch } from "../src/persistCareerMatch";
import {
  createLeagueCareer, createLeagueCareerRepository, createLeagueSeason,
  getCurrentPlayerMatch, LEAGUE_CAREER_STORAGE_KEY, LEAGUE_STORAGE_KEY,
  LEAGUE_MIGRATION_PROFILE_BACKUP_KEY, LEAGUE_RESET_BACKUP_KEY,
} from "../src/meta/league";

class Storage {
  values = new Map<string, string>();
  failWrite: string | null = null;
  failRead = false;
  getItem(key: string) {
    if (this.failRead) throw new Error("denied");
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (key === this.failWrite) throw new Error("quota");
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

const profile = () => createCareerProfile({ callsign: "Axiom", teamName: "Comet Guard", emblemId: "rift-crown", captainSkinId: "alien-runner", selectedWingmanId: "lyra-quell" });
const hasIssue = (issue: string) => (error: unknown) => error instanceof CareerSaveError && error.issue === issue;
function seed(storage = new Storage()) {
  const repository = createLeagueCareerRepository(storage);
  repository.load();
  const career = createLeagueCareer(71, "lyra-quell");
  repository.save(career, profile());
  const input = { seasonId: career.season.seasonId, matchId: getCurrentPlayerMatch(career.season)!.id, roundIndex: 0, blueScore: 10, redScore: 0, stats: [] };
  return { storage, repository, career, input };
}

test("missing, corrupt, unknown-version and structurally broken saves are distinct and preserved", () => {
  const storage = new Storage();
  assert.equal(createLeagueCareerRepository(storage).load(), null);
  for (const [raw, issue] of [["{broken", "corrupt"], ['{"version":99}', "version"], ['{"version":3,"season":null}', "corrupt"]]) {
    storage.setItem(LEAGUE_CAREER_STORAGE_KEY, raw);
    assert.throws(() => createLeagueCareerRepository(storage).load(), hasIssue(issue));
    assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), raw);
  }
  storage.failRead = true;
  assert.throws(() => createLeagueCareerRepository(storage).load(), hasIssue("read"));
});

test("a stale HQ cannot overwrite a newer match or profile", async () => {
  const { storage, input } = seed();
  const oldTab = createLeagueCareerRepository(storage);
  const old = oldTab.load()!;
  await persistCareerMatch(storage, input);
  const committed = storage.getItem(LEAGUE_CAREER_STORAGE_KEY);
  assert.throws(() => oldTab.save(old), hasIssue("stale"));
  assert.throws(() => oldTab.clear(), hasIssue("stale"));
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), committed);
  assert.equal(createLeagueCareerRepository(storage).load()!.season.currentRound, 1);
});

test("simultaneous copies of one match commit only once under the shared write lock", async () => {
  const { storage, input } = seed();
  await Promise.all([persistCareerMatch(storage, input), persistCareerMatch(storage, input)]);
  const career = createLeagueCareerRepository(storage).load()!;
  assert.equal(career.season.currentRound, 1);
  assert.equal(career.season.standings[career.season.playerTeamId].played, 1);
  assert.equal(career.revision, 2);
  assert.equal(new Set(career.profile!.unlockedWingmanIds).size, career.profile!.unlockedWingmanIds.length);
});

test("failed match writes keep the old snapshot and a retry records the result exactly once", async () => {
  const { storage, input } = seed();
  const before = storage.getItem(LEAGUE_CAREER_STORAGE_KEY);
  storage.failWrite = LEAGUE_CAREER_STORAGE_KEY;
  await assert.rejects(persistCareerMatch(storage, input), hasIssue("write"));
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), before);
  storage.failWrite = null;
  await persistCareerMatch(storage, input);
  await persistCareerMatch(storage, input);
  assert.equal(createLeagueCareerRepository(storage).load()!.season.currentRound, 1);
});

test("profile mirror failure cannot lose committed unlocks or replay a match", async () => {
  const { storage, input } = seed();
  storage.failWrite = CAREER_PROFILE_STORAGE_KEY;
  await persistCareerMatch(storage, input);
  const career = createLeagueCareerRepository(storage).load()!;
  const loadedProfile = createCareerProfileRepository(storage).load()!;
  assert.ok(loadedProfile.unlockedWingmanIds.length > 3);
  assert.deepEqual(loadedProfile, career.profile);
  await persistCareerMatch(storage, input);
  assert.equal(createLeagueCareerRepository(storage).load()!.revision, career.revision);
});

test("V2 migration is read-only until commit, backs up the profile, and can be rolled back", () => {
  const storage = new Storage();
  const oldSeason = JSON.stringify(createLeagueSeason(44, "lyra-quell"));
  const oldProfile = JSON.stringify(profile());
  storage.setItem(LEAGUE_STORAGE_KEY, oldSeason);
  storage.setItem(CAREER_PROFILE_STORAGE_KEY, oldProfile);
  const repository = createLeagueCareerRepository(storage);
  const career = repository.load()!;
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), null);
  storage.failWrite = LEAGUE_MIGRATION_PROFILE_BACKUP_KEY;
  assert.throws(() => repository.save(career), hasIssue("write"));
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), null);
  storage.failWrite = null;
  repository.save(career);
  assert.equal(storage.getItem(LEAGUE_STORAGE_KEY), oldSeason);
  assert.equal(storage.getItem(LEAGUE_MIGRATION_PROFILE_BACKUP_KEY), oldProfile);
  const restored = new Storage();
  restored.setItem(LEAGUE_STORAGE_KEY, storage.getItem(LEAGUE_STORAGE_KEY)!);
  restored.setItem(CAREER_PROFILE_STORAGE_KEY, storage.getItem(LEAGUE_MIGRATION_PROFILE_BACKUP_KEY)!);
  assert.equal(createLeagueCareerRepository(restored).load()!.season.seasonId, career.season.seasonId);
  assert.deepEqual(createCareerProfileRepository(restored).load(), JSON.parse(oldProfile));
});

test("reset requires its backup and cannot resurrect legacy data or lose the profile", () => {
  const { storage, repository } = seed();
  const before = storage.getItem(LEAGUE_CAREER_STORAGE_KEY);
  storage.failWrite = LEAGUE_RESET_BACKUP_KEY;
  assert.throws(() => repository.clear(), hasIssue("write"));
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), before);
  storage.failWrite = null;
  repository.clear();
  assert.equal(repository.load(), null);
  assert.equal(repository.loadProfile()!.teamName, "Comet Guard");
  assert.equal(JSON.parse(storage.getItem(LEAGUE_RESET_BACKUP_KEY)!).career, before);
  const edited = repository.loadProfile()!;
  edited.teamName = "Comet Crew";
  repository.saveProfile(edited);
  assert.equal(createCareerProfileRepository(storage).load()!.teamName, "Comet Crew");
});

test("unsupported browser locking fails closed instead of racing saves", async () => {
  const locks = navigator.locks;
  Object.defineProperty(navigator, "locks", { configurable: true, value: undefined });
  try {
    let wrote = false;
    await assert.rejects(withCareerSaveLock(() => { wrote = true; }), hasIssue("unsupported"));
    assert.equal(wrote, false);
  } finally { Object.defineProperty(navigator, "locks", { configurable: true, value: locks }); }
});

test("an old match from a different attempt cannot write into a new career", async () => {
  const { storage, repository, input } = seed();
  repository.save(createLeagueCareer(999, "lyra-quell"), profile());
  const before = storage.getItem(LEAGUE_CAREER_STORAGE_KEY);
  await assert.rejects(persistCareerMatch(storage, input), hasIssue("stale"));
  assert.equal(storage.getItem(LEAGUE_CAREER_STORAGE_KEY), before);
});
