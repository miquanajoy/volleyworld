const fs = require("node:fs"),
  F = require("../.test-build/full-engine.js");
const fresh = F.freshFullSeason(1, "legacy"),
  complete = structuredClone(fresh);
F.finishFullSeason(complete);
const quote = (s) => JSON.stringify(s).replaceAll("'", "''");
const sql = fs
  .readFileSync("supabase/tests/full_season.sql", "utf8")
  .replace(
    /^-- Replace .*$/m,
    "-- Actual-engine snapshots generated for a rollback-only SQL contract test.",
  )
  .replaceAll("__FRESH__", quote(fresh))
  .replaceAll("__COMPLETE__", quote(complete));
if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], sql);
  console.log("Generated rollback-only Full Season SQL contract test.");
} else process.stdout.write(sql);
