const fs = require("node:fs"),
  V = require("../.test-build/engine.js");
const state = V.fresh();
state.playoffEntry = "top16";
V.finishAll(state);
if (!V.validState(state) || V.matches(state).length !== 520)
  throw Error("Invalid test fixture");
const sql = fs
  .readFileSync("supabase/tests/expanded_single.sql", "utf8")
  .replace("'__STATE__'", "'" + JSON.stringify(state) + "'")
  .replace("'__PODIUM__'", "'" + JSON.stringify(V.podium(state)) + "'");
fs.writeFileSync(process.argv[2] || "/tmp/expanded-single-contract.sql", sql);
