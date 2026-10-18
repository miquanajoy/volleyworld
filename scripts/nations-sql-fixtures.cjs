// Usage: node scripts/nations-sql-fixtures.cjs > /tmp/nations-tests.sql
// Run the resulting transaction through the database test connection. It rolls back.
const fs = require("node:fs"),
  N = require("../.test-build/nations-engine.js");
const complete = N.freshNationsSeason(),
  empty = JSON.parse(JSON.stringify(complete));
N.finishNations(complete);
const child = N.freshNationsSeason(2, complete),
  q = (x) => "$fixture$" + JSON.stringify(x) + "$fixture$::jsonb";
process.stdout.write(
  `begin;\ncreate temporary table nations_fixtures(key text,state jsonb);\ninsert into nations_fixtures values ('empty',${q(empty)}),('complete',${q(complete)}),('child',${q(child)});\n`,
);
process.stdout.write(
  fs.readFileSync("supabase/tests/nations_league.sql", "utf8"),
);
