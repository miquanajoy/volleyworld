const assert = require("node:assert/strict"),
  N = require("../../.test-build/nations-engine.js"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js");
const copy = (x) => JSON.parse(JSON.stringify(x));
let count = 0;
for (let chain = 0; chain < 25; chain++) {
  let prev;
  for (let cycle = 1; cycle <= 5; cycle++) {
    const s = N.freshNationsSeason(chain * 5 + cycle, prev);
    if (chain % 5 === 0) {
      delete s.playoffFormat;
      delete s.divisionPlayoffs;
    }
    assert(N.validNationsSeason(s));
    assert.equal(s.cycleNumber, cycle);
    assert.equal(s.roster.length, 64);
    assert.equal(new Set(s.roster).size, 64);
    for (const [r, n] of Object.entries(N.nationsQuotas))
      assert.equal(s.roster.filter((id) => V.get(id).region === r).length, n);
    if (prev) {
      assert(N.validNationsTransition(prev, s));
      const next = N.nextDivisions(prev);
      for (const t of N.tiers)
        assert.deepEqual([...s.divisions[t].teamIds].sort(), next[t].sort());
    }
    assert.equal(N.nationsMatches(s).length, 192);
    assert.throws(() => N.drawNationsPlayoff(s));
    assert.throws(() => N.freshNationsSeason(1, s));
    assert.throws(() => N.simulateNationsRound(s, 1));
    for (const g of N.nationsGroups(s)) {
      const pair = new Map();
      for (const m of g.rounds.flat()) {
        const k = [m.a, m.b].sort().join();
        pair.set(k, (pair.get(k) || 0) + 1);
      }
      assert.equal(pair.size, 6);
      assert([...pair.values()].every((n) => n === 2));
      assert(Object.values(N.nationsBerths(g, "A")).every((b) => !b.playoff));
    }
    for (let r = 0; r < 6; r++) {
      assert.equal(N.nationsCurrentRound(s), r);
      assert.equal(N.nationsRoundMatches(s, r).length, 32);
      N.simulateNationsRound(s, r);
      assert(N.validNationsSeason(s));
    }
    N.drawNationsPlayoff(s);
    assert(N.validNationsSeason(s));
    for (const m of s.playoff.qf) {
      const groups = s.divisions.A.groups;
      assert.notEqual(
        groups.findIndex((g) => g.teamIds.includes(m.a)),
        groups.findIndex((g) => g.teamIds.includes(m.b)),
      );
    }
    N.finishNations(s);
    assert(N.nationsComplete(s));
    assert(N.validNationsSeason(s));
    assert.equal(N.nationsMatches(s).length, N.nationsTotalMatches(s));
    assert.equal(N.nationsPodium(s).length, 3);
    assert.equal(Object.keys(N.nationsPlacements(s)).length, 64);
    const moves = N.nationsMovements(s);
    for (const t of N.tiers) {
      assert.equal(moves[t].up.length, t === "A" ? 0 : 4);
      assert.equal(moves[t].down.length, t === "D" ? 0 : 4);
      assert.equal(N.nextDivisions(s)[t].length, 16);
    }
    for (const g of s.divisions.A.groups) {
      const rows = F.fullStandings(g),
        b = N.nationsBerths(g, "A");
      assert(b[rows[0].id].playoff);
      assert(b[rows[1].id].playoff);
      assert(!b[rows[2].id].playoff);
      assert(b[rows[3].id].down);
    }
    prev = s;
    count++;
  }
}
const s = N.freshNationsSeason();
for (const change of [
  (s) => s.roster.pop(),
  (s) => (s.divisions.A.teamIds[0] = s.divisions.B.teamIds[0]),
  (s) => s.divisions.A.pots[0].reverse().splice(0, 1),
  (s) =>
    (s.divisions.A.groups[0].rounds[3][0].a =
      s.divisions.A.groups[0].rounds[0][0].a),
  (s) => (s.cycleNumber = 2),
  (s) => (s.playoff = {}),
  (s) =>
    (s.divisions.A.groups[0].rounds[0][0].sets = [
      [25, 24],
      [25, 20],
      [25, 20],
    ]),
  (s) => {
    s.divisions.A.groups[0].rounds[0][0].resultOrder = 1;
  },
]) {
  const bad = copy(s);
  change(bad);
  assert(!N.validNationsSeason(bad));
}
// Every early berth must hold under all remaining winner assignments (ties unconstrained).
for (let i = 0; i < 20; i++) {
  const s = N.freshNationsSeason();
  for (let r = 0; r < 4; r++) N.simulateNationsRound(s, r);
  for (const tier of N.tiers)
    for (const g of s.divisions[tier].groups) {
      const cert = N.nationsBerths(g, tier, true),
        rest = g.rounds.flat().filter((m) => !m.sets);
      for (let mask = 0; mask < 1 << rest.length; mask++) {
        const c = copy(g),
          pending = c.rounds.flat().filter((m) => !m.sets);
        pending.forEach(
          (m, j) =>
            (m.sets = Array.from({ length: 3 }, () =>
              mask & (1 << j) ? [25, 20] : [20, 25],
            )),
        );
        const rows = F.fullStandings(c);
        for (const [id, b] of Object.entries(cert)) {
          const rank = rows.findIndex((t) => t.id === id);
          if (b.playoff) assert(rank < 2);
          if (b.up) assert.equal(rank, 0);
          if (b.down) assert.equal(rank, 3);
        }
      }
    }
}
console.log(
  `PASS Nations League engine: ${count} seasons, 64-team quotas, 16 seeded double round robins, synchronized matchdays, legacy 200 / new 221 matches, playoff routes, 4-up/4-down transitions, strict malformed-state rejection and exhaustive early-berth samples`,
);
// Concurrent alternative next seasons remain recoverable as two complete chains.
const parent = N.freshNationsSeason();
N.finishNations(parent);
const c1 = N.freshNationsSeason(2, parent),
  c2 = N.freshNationsSeason(3, parent);
const exported = N.nationsExportSeasons([parent, c1, c2]);
assert.equal(exported.length, 4);
assert.equal(new Set(exported.map((s) => s.seasonId)).size, 4);
assert.equal(new Set(exported.map((s) => s.campaignId)).size, 2);
for (const child of exported.filter((s) => s.cycleNumber === 2))
  assert(
    N.validNationsTransition(
      exported.find((s) => s.seasonId === child.previousSeasonId),
      child,
    ),
  );
assert.throws(() => N.nationsExportSeasons([c1]));

// Promotions are quarterfinal wins, independent of group placing or later losses.
const promotionSeason = N.freshNationsSeason();
for (let r = 0; r < 6; r++) N.simulateNationsRound(promotionSeason, r);
assert.throws(() => N.nextDivisions(promotionSeason));
for (const tier of ["B", "C", "D"]) {
  const b = N.nationsBerths(
    promotionSeason.divisions[tier].groups[0],
    tier,
    true,
  );
  assert.equal(Object.values(b).filter((x) => x.playoff).length, 2);
  assert(Object.values(b).every((x) => !x.up));
  assert.equal(N.nationsMovements(promotionSeason)[tier].up.length, 0);
}
N.drawNationsPlayoff(promotionSeason);
for (const tier of ["B", "C", "D"]) {
  const b = N.nationsBracket(promotionSeason, tier);
  assert.equal(b.qf.length, 4);
  for (const [i, m] of b.qf.entries()) {
    const groups = promotionSeason.divisions[tier].groups;
    assert.notEqual(
      groups.findIndex((g) => g.teamIds.includes(m.a)),
      groups.findIndex((g) => g.teamIds.includes(m.b)),
    );
    // Every runner-up upsets a group winner.
    N.recordNationsScore(promotionSeason, m.id, [
      [20, 25],
      [20, 25],
      [20, 25],
    ]);
    assert.equal(N.nationsMovements(promotionSeason)[tier].up.length, i + 1);
    assert(N.nationsMovements(promotionSeason)[tier].up.includes(m.b));
    assert(N.validNationsSeason(promotionSeason));
  }
  const promoted = [...N.nationsMovements(promotionSeason)[tier].up];
  for (const m of b.sf)
    N.recordNationsScore(promotionSeason, m.id, [
      [25, 20],
      [25, 20],
      [25, 20],
    ]);
  N.recordNationsScore(promotionSeason, b.final[0].id, [
    [25, 20],
    [25, 20],
    [25, 20],
  ]);
  assert.deepEqual(N.nationsMovements(promotionSeason)[tier].up, promoted);
  assert.equal(b.bronze.length, 0);
  assert(N.nationsMatchLocked(promotionSeason, b.qf[0]));
}
assert(!N.nationsComplete(promotionSeason));
N.finishNations(promotionSeason);
assert(N.validNationsSeason(promotionSeason));
assert.equal(N.nationsMatches(promotionSeason).length, 221);
for (const tier of ["B", "C", "D"]) {
  const b = N.nationsBracket(promotionSeason, tier),
    base = N.tiers.indexOf(tier) * 16;
  const p = N.nationsPlacements(promotionSeason);
  assert.equal(p[V.winner(b.final[0])].from, base + 1);
  assert.equal(p[V.loser(b.final[0])].from, base + 2);
  for (const m of b.sf) {
    assert.deepEqual(
      [p[V.loser(m)].from, p[V.loser(m)].to],
      [base + 3, base + 4],
    );
    assert.match(p[V.loser(m)].movement, /Lên/);
  }
  for (const m of b.qf) assert.equal(p[V.loser(m)].movement, "Giữ hạng");
}
for (const change of [
  (s) => {
    s.playoffFormat = "unknown";
  },
  (s) => {
    delete s.divisionPlayoffs;
  },
  (s) => {
    s.divisionPlayoffs.B = null;
  },
  (s) => {
    s.divisionPlayoffs.B.bronze = [s.playoff.bronze[0]];
  },
  (s) => {
    s.divisionPlayoffs.B.qf[0].resultOrder = s.playoff.qf[0].resultOrder;
  },
  (s) => {
    s.divisionPlayoffs.B.sf[0].a = s.divisionPlayoffs.B.qf[0].a;
  },
  (s) => {
    s.divisionPlayoffs.B.qf[0].id = "NQ0";
  },
]) {
  const bad = copy(promotionSeason);
  change(bad);
  assert(!N.validNationsSeason(bad));
}
const old = N.freshNationsSeason();
delete old.playoffFormat;
delete old.divisionPlayoffs;
N.finishNations(old);
assert(N.validNationsSeason(old));
assert.equal(N.nationsMatches(old).length, 200);
const modernChild = N.freshNationsSeason(2, old);
assert(N.nationsAllPlayoffs(modernChild));
assert(N.validNationsTransition(old, modernChild));
console.log(
  "PASS promotion playoffs: immediate QF berths, runner-up upsets, fixed routes, no bronze B/C/D, finals required, stable promotions, final rank bands, malformed state rejection, legacy-to-new continuation",
);
