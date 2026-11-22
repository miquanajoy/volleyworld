const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  reference = require("../support/circuit-point-reference.cjs");
let comparisons = 0;
for (const legacy of [false, true]) {
  const s = D.freshCircuit();
  if (legacy) delete s.phaseTwoDouble;
  const check = () => {
    for (const ledger of s.stage >= 5
      ? [s, { ...s, integerPoints: undefined }]
      : [s])
      for (const r of D.regions)
        for (const upper of [false, true])
          for (const world of [false, true]) {
            assert.deepEqual(
              D.points(ledger, r, upper, world),
              reference(ledger, r, upper, world),
              `ledger stage ${s.stage}/${r}/${upper}/${world}`,
            );
            comparisons++;
          }
  };
  while (!D.complete(s)) {
    check();
    if (!D.stageDone(s)) D.simulateBatch(s);
    check();
    D.finishStage(s);
    check();
    D.nextStage(s);
  }
  check();
  // Result correction must take effect immediately; there is no persistent derived cache.
  const m = D.phaseMatches(s.regions.CEV.phases[2].upper).find((m) => m.sets);
  m.sets = [
    [20, 25],
    [20, 25],
    [20, 25],
  ];
  check();
}
console.log(
  `PASS optimized points: ${comparisons} complete ledger comparisons against frozen per-team calculation;partial/completed/new/legacy seasons;World Cup bonus gating;immediate score corrections`,
);
