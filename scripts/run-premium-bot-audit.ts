import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatPremiumBotAuditMarkdown,
  PREMIUM_BOT_AUDIT_DEFAULT_DURATION_MS,
  PREMIUM_BOT_AUDIT_DEFAULT_RUNS,
  PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZE,
  PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZES,
  runPremiumBotAudit,
} from "../tests/premium-bot-audit";
import type { ArenaTeamSize } from "../src/core";

const runs = readIntegerOption("--runs", PREMIUM_BOT_AUDIT_DEFAULT_RUNS);
const durationMs = readIntegerOption(
  "--duration-ms",
  PREMIUM_BOT_AUDIT_DEFAULT_DURATION_MS,
);
const teamSizes = process.argv.includes("--team-size")
  ? [readIntegerOption(
    "--team-size",
    PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZE,
  ) as ArenaTeamSize]
  : readTeamSizesOption(
    "--team-sizes",
    PREMIUM_BOT_AUDIT_DEFAULT_TEAM_SIZES,
  );

if (runs < 5 || runs > 10) {
  throw new Error("--runs must be between 5 and 10 for a saved audit.");
}
if (durationMs < 5_000 || durationMs > 120_000) {
  throw new Error("--duration-ms must be between 5000 and 120000.");
}
if (teamSizes.some((teamSize) => ![1, 2, 3, 4].includes(teamSize))) {
  throw new Error("--team-size/--team-sizes only accepts 1, 2, 3 or 4.");
}

const timestamp = new Date().toISOString();
const runId = timestamp.replace(/[:.]/g, "-");
const git = readGitMetadata();
const report = runPremiumBotAudit({
  runsPerMapMode: runs,
  durationMs,
  teamSizes,
});
const artifact = {
  runId,
  timestamp,
  git,
  ...report,
};
const outputDirectory = join(
  process.cwd(),
  "diagnostics",
  "bots",
  "premium",
);
const historyDirectory = join(outputDirectory, "history");
mkdirSync(historyDirectory, { recursive: true });
const json = `${JSON.stringify(artifact, null, 2)}\n`;
const markdown = formatPremiumBotAuditMarkdown(report, {
  runId,
  timestamp,
  gitCommit: git.commit,
  gitDirty: git.dirty,
});
writeFileSync(join(outputDirectory, "latest.json"), json, "utf8");
writeFileSync(join(outputDirectory, "latest.md"), markdown, "utf8");
writeFileSync(join(historyDirectory, `${runId}.json`), json, "utf8");

const critical = report.findings.filter((finding) =>
  finding.severity === "critical"
).length;
const warnings = report.findings.filter((finding) =>
  finding.severity === "warning"
).length;
process.stdout.write([
  `Premium bot audit ${runId}`,
  `${report.runs.length} runs; ${critical} critical findings; ${warnings} warnings`,
  `JSON: diagnostics/bots/premium/latest.json`,
  `Markdown: diagnostics/bots/premium/latest.md`,
  "",
].join("\n"));

function readIntegerOption(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const raw = process.argv[index + 1];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} requires an integer value.`);
  }
  return parsed;
}

function readTeamSizesOption(
  name: string,
  fallback: readonly ArenaTeamSize[],
): readonly ArenaTeamSize[] {
  const index = process.argv.indexOf(name);
  if (index < 0) return [...fallback];
  const raw = process.argv[index + 1] ?? "";
  const values = raw.split(",").map((value) => Number(value.trim()));
  if (
    values.length === 0 ||
    values.some((value) => !Number.isInteger(value))
  ) {
    throw new Error(`${name} requires comma-separated integer values.`);
  }
  return [...new Set(values)] as ArenaTeamSize[];
}

function readGitMetadata(): {
  readonly commit: string;
  readonly branch: string;
  readonly dirty: boolean;
} {
  const read = (args: readonly string[]): string =>
    execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  try {
    return {
      commit: read(["rev-parse", "HEAD"]),
      branch: read(["branch", "--show-current"]),
      dirty: read(["status", "--porcelain"]).length > 0,
    };
  } catch {
    return {
      commit: "unavailable",
      branch: "unavailable",
      dirty: true,
    };
  }
}
