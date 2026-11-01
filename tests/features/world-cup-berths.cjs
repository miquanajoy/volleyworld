const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js");
const clone = (x) => JSON.parse(JSON.stringify(x));
const wins = [
    [25, 20],
    [25, 20],
    [25, 20],
  ],
  score = (m, id) => {
    m.sets = wins.map((p) => (m.a === id ? [...p] : [p[1], p[0]]));
  };
const s = F.freshFullSeason();
assert.equal(F.worldCupBerths(s).total, 0);
const rg = s.regions.CEV,
  index = rg.groups.findIndex((g) => g.length === 6),
  g = F.regionalGroup(rg, index),
  target = g.teamIds[0];
const first = g.rounds.slice(0, 4).flat(),
  other = first.filter((m) => m.a !== target && m.b !== target);
let balanced = false;
for (let mask = 0; mask < 2 ** other.length; mask++) {
  first
    .filter((m) => m.a === target || m.b === target)
    .forEach((m) => score(m, target));
  other.forEach((m, i) => score(m, (mask >> i) & 1 ? m.a : m.b));
  const rows = F.fullStandings(g);
  if (rows.every((r) => r.id === target || r.w + 1 < 4)) {
    balanced = true;
    break;
  }
}
assert(balanced, "Construct an exact early top-one certificate");
assert(!F.fullLeagueDone(g));
assert(!F.regionalDone(rg));
let berths = F.worldCupBerths(s);
assert(berths.teams.some((t) => t.id === target && t.route === "group"));
assert.equal(berths.capacity, 24);
const before = JSON.stringify(s);
F.worldCupBerths(s);
assert.equal(JSON.stringify(s), before, "Projection never mutates tournament");
assert(Object.isFrozen(berths));
assert(Object.isFrozen(berths.teams));
const historical = clone(s);
// Every BO5 outcome of the three remaining group fixtures preserves a proven ticket.
const variants = [
  [
    [25, 0],
    [25, 0],
    [25, 0],
  ],
  [
    [25, 0],
    [0, 25],
    [25, 0],
    [25, 0],
  ],
  [
    [25, 0],
    [0, 25],
    [25, 0],
    [0, 25],
    [15, 0],
  ],
];
const outcomes = [
    ...variants,
    ...variants.map((sets) => sets.map(([a, b]) => [b, a])),
  ],
  remaining = g.rounds.at(-1);
assert.equal(remaining.length, 3);
for (let a = 0; a < 6; a++)
  for (let b = 0; b < 6; b++)
    for (let c = 0; c < 6; c++) {
      remaining.forEach((m, i) => (m.sets = clone(outcomes[[a, b, c][i]])));
      assert.equal(
        F.fullStandings(g)[0].id,
        target,
        "Early ticket holds for every remaining BO5 outcome",
      );
    }
remaining.forEach((m) => (m.sets = null));
// Correcting scores invalidates cached proof; old snapshots retain their own status.
first
  .filter((m) => m.a === target || m.b === target)
  .forEach((m) => score(m, m.a === target ? m.b : m.a));
assert(!F.worldCupBerths(s).teams.some((t) => t.id === target));
assert(F.worldCupBerths(historical).teams.some((t) => t.id === target));
// A single completed group appears before its region or other regions finish.
F.simulateLeague(g);
const groupWinner = F.fullStandings(g)[0].id;
assert(F.worldCupBerths(s).teams.some((t) => t.id === groupWinner));
assert(!F.regionalDone(rg));
// A guaranteed top-three/contender place is never promoted to a direct World Cup ticket.
const completed = F.worldCupBerths(s).teams.filter((t) =>
  g.teamIds.includes(t.id),
);
assert.equal(completed.length, 1);
F.simulateLeague(rg);
F.advanceRegions(s);
while (!F.qualifierWinner(rg.playoff)) {
  rg.playoff.rounds
    .find((row) => row.some((m) => !m.sets))
    .filter((m) => !m.sets)
    .forEach(V.simulate);
  F.advanceRegions(s);
}
berths = F.worldCupBerths(s);
assert.equal(berths.teams.filter((t) => t.region === "CEV").length, 7);
assert.equal(
  berths.teams.filter((t) => t.route === "regional-playoff").length,
  1,
);
assert(!F.regionalDone(s.regions.AVC));
for (const r of F.regionOrder) F.simulateLeague(s.regions[r]);
F.advanceRegions(s);
for (const r of F.regionOrder) {
  const bracket = s.regions[r].playoff;
  if (!bracket) continue;
  while (!F.qualifierWinner(bracket)) {
    bracket.rounds
      .find((row) => row.some((m) => !m.sets))
      .filter((m) => !m.sets)
      .forEach(V.simulate);
    F.advanceRegions(s);
  }
}
assert.equal(F.worldCupBerths(s).total, 21);
F.drawIntercontinental(s);
for (let i = 0; i < 3; i++) {
  const bracket = s.intercontinental.branches[i];
  while (!F.qualifierWinner(bracket)) {
    bracket.rounds
      .find((row) => row.some((m) => !m.sets))
      .filter((m) => !m.sets)
      .forEach(V.simulate);
    F.advanceRegions(s);
  }
  berths = F.worldCupBerths(s);
  assert.equal(berths.total, 22 + i);
  assert.equal(berths.teams.filter((t) => t.route === "playin").length, i + 1);
  if (i < 2) assert(!F.intercontinentalDone(s));
}
assert.equal(new Set(berths.teams.map((t) => t.id)).size, 24);
assert.deepEqual(
  berths.teams.map((t) => t.id).sort(),
  F.qualificationEntrants(s).sort(),
);
console.log(
  "PASS World Cup berths: early group proof verified over all 216 BO5 completions, score-correction/cache/history isolation, one group before region completion, regional champion before other regions, 21direct/regional plus each individual Play-in winner, no false contender tickets/duplicates and immutable projections",
);
