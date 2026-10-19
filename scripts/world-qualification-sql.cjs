// Generate rollback-only integration tests using real engine fixtures.
const fs = require("node:fs"),
  F = require("../.test-build/full-engine.js");
const copy = (x) => structuredClone(x),
  fresh = F.freshFullSeason(),
  pending = copy(fresh);
F.regionOrder.forEach((r) => F.simulateLeague(pending.regions[r]));
F.advanceRegions(pending);
F.stampFull(pending);
const regional = copy(pending);
for (const r of F.regionOrder) {
  const b = regional.regions[r].playoff;
  if (b)
    for (const row of b.rounds)
      for (const m of row)
        F.recordFullScore(regional, m.id, [
          [25, 20],
          [25, 20],
          [25, 20],
        ]);
}
const drawn = copy(regional);
F.drawIntercontinental(drawn);
const qualified = copy(drawn);
for (const b of qualified.intercontinental.branches)
  for (const row of b.rounds)
    for (const m of row)
      F.recordFullScore(qualified, m.id, [
        [25, 20],
        [25, 20],
        [25, 20],
      ]);
const partial = copy(qualified);
partial.intercontinental.branches[2].rounds[3][0].sets = null;
delete partial.intercontinental.branches[2].rounds[3][0].resultOrder;
const complete = copy(qualified);
F.finishFullSeason(complete);
const legacy = F.freshFullSeason(2, "legacy"),
  groups = F.freshFullSeason(3, "groups");
F.finishFullSeason(legacy);
F.finishFullSeason(groups);
const fixtures = {
  fresh,
  pending,
  regional,
  drawn,
  partial,
  qualified,
  complete,
  legacy,
  groups,
};
for (const [key, s] of Object.entries(fixtures))
  if (!F.validFullSeason(s)) throw Error("Invalid fixture " + key);
console.log(
  "begin;create temporary table qualification_fixtures(key text,state jsonb);grant select on qualification_fixtures to authenticated;",
);
for (const [key, s] of Object.entries(fixtures))
  console.log(
    `insert into qualification_fixtures values ('${key}',$fixture$${JSON.stringify(s)}$fixture$::jsonb);`,
  );
console.log(fs.readFileSync("supabase/tests/world_qualification.sql", "utf8"));
