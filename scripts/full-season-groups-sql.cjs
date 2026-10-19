// Generate a rollback-only SQL integration suite from the actual bundled engine.
// node scripts/build-test.cjs && node scripts/full-season-groups-sql.cjs > /tmp/full-season-groups.sql
const fs = require("node:fs"),
  F = require("../.test-build/full-engine.js");
const fresh = F.freshFullSeason(1, "groups"),
  pending = structuredClone(fresh);
F.regionOrder.forEach((r) => F.simulateLeague(pending.regions[r]));
F.advanceRegions(pending);
F.stampFull(pending);
const complete = structuredClone(pending);
F.finishFullSeason(complete);
const legacy = F.freshFullSeason(1, "legacy");
F.finishFullSeason(legacy);
const V = require("../.test-build/engine.js");
const table_cases = Array.from({ length: 32 }, (_, i) => {
  const group = F.fullLeague(
    V.regionTeams("CSV")
      .slice(0, 4)
      .map((t) => t.id),
    `TIE${i}`,
  );
  for (const m of group.rounds.flat())
    m.sets = Array.from({ length: 3 }, () =>
      Math.random() < 0.5 ? [25, 20] : [20, 25],
    );
  // All three sets share a winner, creating equal W/SD/PD tie groups often.
  for (const m of group.rounds.flat())
    m.sets = Array.from({ length: 3 }, () => [...m.sets[0]]);
  return { group, expected: F.fullStandings(group).map((t) => t.id) };
});
let sql = fs.readFileSync("supabase/tests/full_season_groups.sql", "utf8");
for (const [key, value] of Object.entries({
  fresh,
  pending,
  complete,
  legacy,
  table_cases,
}))
  sql = sql.replace(`__${key.toUpperCase()}__`, JSON.stringify(value));
process.stdout.write(sql);
