const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js");
const copy = (x) => JSON.parse(JSON.stringify(x));
const s = D.freshCircuit();
assert(s.integerPoints);
assert.equal(D.placementPoints(s, 35, D.leagueMultiplier(s, 1)), 70);
assert.equal(D.placementPoints(s, 45, D.leagueMultiplier(s, 1)), 90);
assert.equal(D.placementPoints(s, 25, D.leagueMultiplier(s, 1)), 50);
const old = copy(s);
delete old.integerPoints;
old.stage = 5;
assert.equal(D.placementPoints(old, 35, 1.5), 52.5);
for (let i = 0; i < 7; i++) {
  D.finishStage(s);
  for (const r of D.regions)
    for (const tier of [true, false])
      for (const row of D.points(s, r, tier, true)) {
        assert(Number.isInteger(row.total));
        assert(row.phase.every(Number.isInteger));
        assert(Number.isInteger(row.challenger));
        assert(Number.isInteger(row.world));
      }
  assert(D.validCircuit(s));
  D.nextStage(s);
}
assert(D.validCircuit(copy(s)));
assert(s.integerPoints);
const legacy = copy(s);
delete legacy.integerPoints;
const q = D.regions.map((r) => D.qualifiers(legacy, r));
assert(!D.integerPointPolicy(legacy));
assert.equal(
  JSON.stringify(D.regions.map((r) => D.qualifiers(copy(legacy), r))),
  JSON.stringify(q),
);
const undrawn = D.freshCircuit();
delete undrawn.integerPoints;
D.finishStage(undrawn);
D.nextStage(undrawn);
assert(
  undrawn.integerPoints,
  "Undrawn seasons stamp the new policy before advancing",
);
console.log(
  "PASS integer awards:integer multipliers without rounding;all phases/international totals integral;persisted policy;undrawn upgrade;drawn legacy policy retained",
);
