const { spawnSync } = require("node:child_process");
for (const file of [
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
  "full-season-cloud",
]) {
  const r = spawnSync(process.execPath, ["tests/features/" + file + ".cjs"], {
    encoding: "utf8",
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.status) process.exitCode = 1;
}
