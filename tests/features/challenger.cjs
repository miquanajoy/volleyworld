const assert = require("node:assert/strict"),
  C = require("../../.test-build/challenger-engine.js"),
  V = require("../../.test-build/engine.js");
const copy = (x) => JSON.parse(JSON.stringify(x));
let seed = 61123;
const native = Math.random;
Math.random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
let sample;
for (let season = 0; season < 500; season++) {
  const s = C.freshChallenger(season + 1);
  assert(C.validChallenger(s));
  assert(s.rounds[0].every((m) => V.get(m.a).region !== V.get(m.b).region));
  assert.throws(() => C.drawSwissRound(s));
  assert.throws(() => C.drawChallengerPlayoff(s));
  const previous = new Set();
  for (let r = 0; r < 5; r++) {
    assert.equal(s.rounds[r].length, [16, 16, 16, 12, 6][r]);
    const table = C.challengerStandings(s, r - 1),
      active = table.filter((t) => t.w < 3 && t.l < 3).map((t) => t.id);
    assert.deepEqual(
      [...s.rounds[r].flatMap((m) => [m.a, m.b])].sort(),
      active.sort(),
    );
    for (const m of s.rounds[r]) {
      const a = table.find((t) => t.id === m.a),
        b = table.find((t) => t.id === m.b),
        key = [m.a, m.b].sort().join(":");
      assert.equal(a.w, b.w);
      assert.equal(a.l, b.l);
      assert(!previous.has(key));
      previous.add(key);
    }
    C.simulateChallengerRound(s);
    assert(C.validChallenger(s));
    if (r < 4) {
      const history = JSON.stringify(C.challengerStandings(s, r));
      C.drawSwissRound(s);
      assert(C.validChallenger(s));
      assert.equal(JSON.stringify(C.challengerStandings(s, r)), history);
      assert(C.challengerLocked(s, s.rounds[r][0]));
      assert.throws(() =>
        C.recordChallengerScore(s, s.rounds[r][0].id, [
          [25, 0],
          [25, 0],
          [25, 0],
        ]),
      );
    }
  }
  const table = C.challengerStandings(s);
  assert.equal(table.filter((t) => t.w === 3 && t.l === 0).length, 4);
  assert.equal(table.filter((t) => t.w === 3 && t.l === 1).length, 6);
  assert.equal(table.filter((t) => t.w === 3 && t.l === 2).length, 6);
  assert.equal(table.filter((t) => t.l === 3).length, 16);
  assert(table.every((t) => t.w + t.l >= 3 && t.w + t.l <= 5));
  C.drawChallengerPlayoff(s);
  assert(C.validChallenger(s));
  assert.throws(() => C.drawChallengerPlayoff(s));
  const slots = V.seedSlots
    ? V.seedSlots(16)
    : [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
  const bracketSeeds = [];
  s.bracket.r16
    .flatMap((m) => [m.a, m.b])
    .forEach((id, i) => (bracketSeeds[slots[i] - 1] = id));
  bracketSeeds.forEach((id, i) =>
    assert.equal(table.find((t) => t.id === id).l, i < 4 ? 0 : i < 10 ? 1 : 2),
  );
  for (const stage of ["r16", "qf", "sf"]) {
    C.simulateChallengerStage(s, stage);
    assert(C.validChallenger(s));
  }
  assert(C.challengerLocked(s, s.bracket.final[0]));
  assert.throws(() =>
    C.recordChallengerScore(s, s.bracket.final[0].id, [
      [25, 0],
      [25, 0],
      [25, 0],
    ]),
  );
  C.simulateChallengerStage(s, "bronze");
  assert(C.validChallenger(s));
  assert(!C.challengerLocked(s, s.bracket.final[0]));
  C.simulateChallengerStage(s, "final");
  assert(C.validChallenger(s));
  assert(C.challengerComplete(s));
  assert.equal(C.challengerMatches(s).length, 82);
  assert.equal(
    new Set(C.challengerMatches(s).map((m) => m.resultOrder)).size,
    82,
  );
  assert.equal(C.challengerPodium(s).length, 3);
  assert.equal(C.challengerPlacements(s).length, 32);
  assert.equal(
    C.challengerPlacements(s).filter((p) => p.from === 17).length,
    16,
  );
  assert(C.challengerLocked(s, s.bracket.final[0]));
  sample = s;
}
const ids = ["A", "B", "C", "D"],
  allowed = new Set(["A:B", "A:C", "B:D"]),
  prior = [];
for (let i = 0; i < 4; i++)
  for (let j = i + 1; j < 4; j++)
    if (!allowed.has(`${ids[i]}:${ids[j]}`))
      prior.push({ a: ids[i], b: ids[j] });
assert.equal(C.pairScoreGroup(ids, prior).length, 2);
assert.throws(() => C.pairScoreGroup(["A", "B"], [{ a: "A", b: "B" }]));
for (const change of [
  (s) => (s.rounds[1][0].a = s.rounds[1][1].a),
  (s) => (s.rounds[0][0].a = "INVALID"),
  (s) => s.tie.pop(),
  (s) => s.roster.reverse(),
  (s) => s.rounds[4].pop(),
  (s) =>
    (s.rounds[0][0].sets = [
      [25, 24],
      [25, 0],
      [25, 0],
    ]),
  (s) => (s.rounds[0][0].resultOrder = s.rounds[0][1].resultOrder),
  (s) => (s.bracket.r16[0].a = s.bracket.r16[1].a),
  (s) => (s.bracket.qf[0].a = s.bracket.qf[0].b),
  (s) => (s.bracket.bronze[0].a = V.winner(s.bracket.sf[0])),
  (s) => {
    s.bracket.bronze[0].sets = null;
    delete s.bracket.bronze[0].resultOrder;
  },
  (s) => (s.rounds[0][0].sets = null),
]) {
  const bad = copy(sample);
  change(bad);
  assert(!C.validChallenger(bad));
}
// Independent OMW calculation, including an incomplete round and a stable historic snapshot.
const partial = C.freshChallenger();
const first = partial.rounds[0][0];
C.recordChallengerScore(partial, first.id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
assert(C.validChallenger(partial));
let a = C.challengerStandings(partial).find((t) => t.id === first.a),
  b = C.challengerStandings(partial).find((t) => t.id === first.b);
assert.equal(a.omw, 0);
assert.equal(b.omw, 1);
assert.equal(a.sf - a.sa, 3);
assert.equal(a.pf - a.pa, 15);
C.finishChallenger(partial);
assert(C.validChallenger(partial));
const finalRows = C.challengerStandings(partial);
for (const t of finalRows) {
  const matches = partial.rounds
      .flat()
      .filter((m) => m.a === t.id || m.b === t.id),
    sum = matches.reduce((n, m) => {
      const opp = finalRows.find((r) => r.id === (m.a === t.id ? m.b : m.a));
      return n + opp.w / (opp.w + opp.l);
    }, 0);
  assert(Math.abs(t.omw - sum / matches.length) < 1e-12);
}
const wrongOpening = C.freshChallenger();
const firstPair = wrongOpening.rounds[0][0],
  secondPair = wrongOpening.rounds[0].find(
    (m) => m !== firstPair && V.get(m.b).region === V.get(firstPair.a).region,
  );
assert(secondPair);
[firstPair.b, secondPair.b] = [secondPair.b, firstPair.b];
assert(
  !C.validChallenger(wrongOpening),
  "Same-region opener rejected even with valid seed bands and unique players",
);
Math.random = native;
console.log(
  "PASS Challenger engine: 500 complete 82-match seasons; exact Swiss groups/berths, no rematches, perfect-matching recovery, OMW, seed bands, fixed routes, bronze-first locks, partial/manual completion, chronology and corrupt-state rejection",
);
// Diverse and extreme regional quotas across the full 100-team catalog.
for (let trial = 0; trial < 80; trial++) {
  const quotas = [
    { CEV: 16, AVC: 6, NORCECA: 6, CAVB: 2, CSV: 2 },
    { CEV: 2, AVC: 12, NORCECA: 12, CAVB: 4, CSV: 2 },
    { CEV: 16, AVC: 2, NORCECA: 2, CAVB: 6, CSV: 6 },
    { CEV: 8, AVC: 8, NORCECA: 8, CAVB: 6, CSV: 2 },
  ][trial % 4];
  const ids = Object.entries(quotas).flatMap(([region, n]) =>
    V.shuffle(V.catalog.filter((t) => t.region === region))
      .slice(0, n)
      .map((t) => t.id),
  );
  assert(C.validChallengerRoster(ids));
  const s = C.freshChallenger(1, ids);
  assert(C.validChallenger(s));
  assert(s.rounds[0].every((m) => V.get(m.a).region !== V.get(m.b).region));
  C.finishChallenger(s);
  assert(C.validChallenger(s));
  assert.equal(C.challengerMatches(s).length, 82);
}
const excessive = Object.entries({
  CEV: 17,
  AVC: 5,
  NORCECA: 6,
  CAVB: 2,
  CSV: 2,
}).flatMap(([r, n]) =>
  V.regionTeams(r)
    .slice(0, n)
    .map((t) => t.id),
);
assert(!C.validChallengerRoster(excessive));
assert.throws(() => C.freshChallenger(1, excessive));
assert(!C.validChallengerRoster(C.challengerRoster().slice(1)));
assert(!C.validChallengerRoster([...C.challengerRoster().slice(1), "INVALID"]));
console.log(
  "PASS custom Challenger rosters: 80 complete seasons using all regions and extreme allowed quotas; opening region/seed rules preserved, invalid sizes and excessive regional quotas rejected",
);
