const { spawnSync } = require("node:child_process");
for (const file of [
  "tour",
  "tour-career",
  "season-qualification-points",
  "world-cup-double-playin",
  "tour-career-ui",
  "tour-regional",
  "tour-merit",
  "tour-merit-ui",
  "tour-ui",
  "tour-achievements",
  "tour-cloud",
  "tour-account",
  "account-reset",
  "placements",
  "league-history",
  "standings-movement",
  "ui",
  "career-ranking",
  "season-summary",
  "season-format-metadata",
  "playoff-overview",
  "bracket-scroll",
  "expanded-single",
  "simulation-v2",
  "full-season",
  "full-season-groups",
  "world-qualification",
  "world-cup-berths",
  "full-playoff-tree",
  "full-world-matchdays",
  "full-season-cloud",
  "challenger",
  "challenger-ui",
  "challenger-cloud",
  "challenger-setup-tree",
]) {
  const r = spawnSync(process.execPath, ["tests/features/" + file + ".cjs"], {
    encoding: "utf8",
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.status) process.exitCode = 1;
}
