const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  V = require("../../.test-build/engine.js");
let random = 17421;
Math.random = () => (random = (random * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const copy = (x) => JSON.parse(JSON.stringify(x));
const win = (m, id) => {
  m.sets = Array.from({ length: 3 }, () => (m.a === id ? [25, 20] : [20, 25]));
};
const counts = [176, 190, 506, 547, 887, 1007, 1071, 1151];
let promoted = 0;
for (let season = 0; season < 16; season++) {
  const s = D.freshCircuit();
  assert(D.validCircuit(s));
  assert.equal(D.pool("CAVB").length, 24);
  assert.equal(D.validSelection(s.regions), true);
  const nextAttempt = copy(s);
  assert.throws(() => D.nextStage(nextAttempt));
  for (let stage = 0; stage < 8; stage++) {
    assert.equal(s.stage, stage);
    while (!D.stageDone(s)) {
      const pending = D.batch(s).filter((m) => !m.sets);
      assert(pending.length);
      D.simulateBatch(s);
      assert(D.validCircuit(s), `valid partial stage ${stage}`);
    }
    assert.equal(D.played(s), counts[stage]);
    if ([0, 2, 4].includes(stage))
      for (const r of D.regions) {
        const p = s.regions[r].phases[D.phaseIndex(stage)];
        assert.equal(D.leagueRanks(p.upper).length, 16);
        assert.equal(D.leagueRanks(p.lower).length, 8);
        assert(!p.lower.bracket.bronze);
        assert.equal(!!p.upper.bracket.bronze, stage === 2);
        if (stage === 0) {
          assert.equal(D.bracketMatches(p.upper.bracket).length, 29);
          assert(!D.plan(p.upper.bracket).some((n) => n.kind === "grand"));
        }
        if (stage === 4) {
          assert.equal(D.bracketMatches(p.upper.bracket).length, 14);
          assert.equal(D.directTickets(s, r).league.length, 2);
          assert.equal(D.directTickets(s, r).points.length, 2);
        }
      }
    if (stage === 1) {
      assert.equal(D.bracketMatches(s.firstStand).length, 14);
      assert(!D.plan(s.firstStand).some((n) => n.id.endsWith("R")));
    }
    if (stage === 3) {
      assert.equal(s.challenger.roster.length, 16);
      assert.equal(s.challenger.rounds.flat().length, 33);
      assert.equal(s.challenger.bracket.qf.length, 4);
      assert.equal(s.challenger.bracket.r16.length, 0);
      assert(s.challenger.bracket.bronze[0].sets);
    }
    if (stage === 5)
      for (const r of D.regions) {
        const p = s.regions[r].playin;
        assert.equal(p.groups.length, 4);
        assert.equal(p.groups.flatMap(D.bracketMatches).length, 20);
        assert.equal(D.bracketMatches(p.bracket).length, 10);
        assert.equal(D.survivors(p.bracket).length, 4);
        assert.equal(D.qualifiers(s, r).length, 8);
        assert.equal(new Set(D.qualifiers(s, r)).size, 8);
        for (const b of p.groups) {
          assert.equal(D.survivors(b).length, 2);
          const losses = new Map(b.seeds.map((id) => [id, 0]));
          D.bracketMatches(b).forEach((m) =>
            losses.set(V.loser(m), losses.get(V.loser(m)) + 1),
          );
          b.seeds
            .filter((id) => !D.survivors(b).includes(id))
            .forEach((id) => assert.equal(losses.get(id), 2));
        }
      }
    D.nextStage(s);
    assert(D.validCircuit(copy(s)));
  }
  assert(D.complete(s));
  assert.equal(D.matches(s).length, 1151);
  assert.equal(D.podium(s).length, 3);
  const sel = D.inheritedSelection(s),
    future = D.freshCircuit(2, sel, s);
  assert(D.validCircuit(future));
  for (const r of D.regions) {
    const q = D.qualifiers(s, r);
    assert(q.every((id) => future.regions[r].upper.includes(id)));
    const fromLower = q.filter((id) => s.regions[r].lower.includes(id));
    promoted += fromLower.length;
    assert.equal(
      s.regions[r].upper.filter((id) => !future.regions[r].upper.includes(id))
        .length,
      future.regions[r].upper.filter((id) => s.regions[r].lower.includes(id))
        .length,
    );
    assert.equal(future.regions[r].upper.length, 16);
    assert.equal(future.regions[r].lower.length, 8);
  }
  const wrong = copy(s);
  wrong.regions.CEV.upper[0] = wrong.regions.CEV.lower[0];
  assert(!D.validCircuit(wrong));
  const wrongScore = copy(s);
  D.matches(wrongScore)[0].sets = [
    [25, 24],
    [25, 20],
    [25, 20],
  ];
  assert(!D.validCircuit(wrongScore));
  const wrongRoute = copy(s);
  wrongRoute.regions.CEV.phases[2].upper.bracket.rounds[1][0].a =
    s.regions.CEV.lower[0];
  assert(!D.validCircuit(wrongRoute));
}
// Force lower-tier teams to win all regional Play-in matches: each must promote.
const s = D.freshCircuit();
while (s.stage < 5) {
  D.finishStage(s);
  D.nextStage(s);
}
while (!D.stageDone(s)) {
  for (const r of D.regions) {
    for (const m of D.regionalBatch(s, r).filter((m) => !m.sets)) {
      const low = s.regions[r].lower;
      win(m, low.includes(m.a) ? m.a : low.includes(m.b) ? m.b : m.a);
    }
  }
  D.advance(s);
}
for (const r of D.regions) {
  assert.equal(
    D.qualifiers(s, r).filter((id) => s.regions[r].lower.includes(id)).length,
    4,
  );
}
D.nextStage(s);
D.finishStage(s);
D.nextStage(s);
D.finishStage(s);
D.nextStage(s);
for (const r of D.regions) {
  assert(D.qualifiers(s, r).every((id) => D.nextUpper(s, r).includes(id)));
}
console.log(
  `PASS regional circuit:16 full seasons;1151 matches each;partial/reload validation;fixed seeds;no reset;16-team Swiss;4+4 distinct WC tickets;GSL losses;promotion including forced16 lower-tier qualifiers (${promoted} observed naturally)`,
);
