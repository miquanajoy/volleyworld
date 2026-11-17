const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const score = [
  [25, 20],
  [25, 20],
  [25, 20],
];
const s = D.freshCircuit();
for (const stage of [0, 2, 4]) {
  while (s.stage < stage) {
    D.finishStage(s);
    D.nextStage(s);
  }
  for (const upper of stage === 0 ? [false] : [true, false]) {
    const p =
      s.regions.CEV.phases[D.phaseIndex(stage)][upper ? "upper" : "lower"];
    for (let round = 0; round < p.groups[0].rounds.length; round++) {
      const [a, b] = p.groups.map((g) => g.rounds[round]);
      for (const m of a) D.recordScore(s, m.id, score);
      assert(D.validCircuit(s));
      const pending = D.regionalBatch(s, "CEV", upper);
      assert(
        b.every((m) => pending.some((x) => x.id === m.id)),
        "Other group remains playable",
      );
      if (round + 1 < p.groups[0].rounds.length)
        assert(
          !pending.some((m) => p.groups[0].rounds[round + 1].includes(m)),
          "Cannot advance A ahead of B",
        );
      for (const m of b) D.recordScore(s, m.id, score);
      assert(D.validCircuit(s));
    }
    assert(p.bracket, "Playoff generated only after both groups complete");
  }
}
const app = ui("local", 7182),
  c = app.w.__circuit,
  d = app.w.document;
c.create();
c.start();
c.model.tier = "lower";
c.viewStage("0");
const p = c.selected().snapshot.regions.CEV.phases[0].lower;
const [a, b] = p.groups.map((g) => g.rounds[0]);
a.forEach((m) => c.simMatch(m.id));
assert.equal(c.model.round, 0);
for (const m of b)
  assert(
    d.querySelector(`[data-action="Circuit.simMatch"][data-arg="${m.id}"]`),
    "B keeps its simulation buttons after A completes",
  );
const before = JSON.stringify(
  c.selected().snapshot.regions.CEV.phases[0].lower.groups[0].rounds[0],
);
c.simRound();
assert.equal(c.model.round, 1);
assert.equal(
  JSON.stringify(
    c.selected().snapshot.regions.CEV.phases[0].lower.groups[0].rounds[0],
  ),
  before,
  "Running remaining B never overwrites A",
);
assert(
  c
    .selected()
    .snapshot.regions.CEV.phases[0].lower.groups.every((g) =>
      g.rounds[0].every((m) => m.sets),
    ),
);
app.close();
console.log(
  "PASS shared regional matchdays:all regional group phases/tiers;A completion keeps B playable;future A locked;score validation;playoff gate;real DOM simulation controls and round cursor",
);
