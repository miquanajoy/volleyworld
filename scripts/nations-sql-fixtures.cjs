// Usage: node scripts/nations-sql-fixtures.cjs > /tmp/nations-tests.sql
// Run the resulting transaction through the database test connection. It rolls back.
const fs = require("node:fs"),
  N = require("../.test-build/nations-engine.js");
const complete = N.freshNationsSeason(),
  empty = JSON.parse(JSON.stringify(complete));
for (let r = 0; r < 6; r++) N.simulateNationsRound(complete, r);
N.drawNationsPlayoff(complete);
for (const tier of ["B", "C", "D"])
  for (const m of complete.divisionPlayoffs[tier].qf)
    N.recordNationsScore(complete, m.id, [
      [20, 25],
      [20, 25],
      [20, 25],
    ]);
N.finishNations(complete);
const partial = JSON.parse(JSON.stringify(complete));
partial.divisionPlayoffs.D.final[0].sets = null;
delete partial.divisionPlayoffs.D.final[0].resultOrder;
const legacy = N.freshNationsSeason(3);
delete legacy.playoffFormat;
delete legacy.divisionPlayoffs;
N.finishNations(legacy);
const legacyChild = N.freshNationsSeason(4, legacy);
const child = N.freshNationsSeason(2, complete),
  q = (x) => "$fixture$" + JSON.stringify(x) + "$fixture$::jsonb";
process.stdout.write(
  `begin;\ncreate temporary table nations_fixtures(key text,state jsonb);\ninsert into nations_fixtures values ('empty',${q(empty)}),('complete',${q(complete)}),('child',${q(child)}),('partial',${q(partial)}),('legacy',${q(legacy)}),('legacyChild',${q(legacyChild)});\n`,
);
process.stdout.write(
  fs.readFileSync("supabase/tests/nations_league.sql", "utf8"),
);
