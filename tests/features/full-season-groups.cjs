const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const score = [
  [25, 18],
  [25, 18],
  [25, 18],
];
for (let n = 0; n < 24; n++) {
  const s = F.freshFullSeason(n + 1);
  assert(F.validFullSeason(s));
  assert.equal(F.fullTotalMatches(s), 543);
  assert.equal(F.fullMatches(s).length, 489);
  assert.deepEqual(
    F.regionOrder.map(
      (r) =>
        s.regions[r].groups?.map((ids) => ids.length) || [
          s.regions[r].teamIds.length,
        ],
    ),
    [[13, 13, 13], [12, 12], [9, 9], [7, 6], [6]],
  );
  for (const r of F.regionOrder) {
    const g = s.regions[r];
    for (let i = 0; i < (g.groups?.length || 1); i++) {
      const group = F.regionalGroup(g, i),
        fixtures = group.rounds.flat(),
        size = group.teamIds.length;
      assert.equal(fixtures.length, (size * (size - 1)) / 2);
      assert.equal(
        new Set(fixtures.map((m) => [m.a, m.b].sort().join("-"))).size,
        fixtures.length,
      );
      for (const id of group.teamIds)
        assert.equal(
          fixtures.filter((m) => m.a === id || m.b === id).length,
          size - 1,
        );
      for (const round of group.rounds)
        assert.equal(
          new Set(round.flatMap((m) => [m.a, m.b])).size,
          round.length * 2,
        );
      for (const p of g.pots || [])
        assert(group.teamIds.filter((id) => p.includes(id)).length <= 1);
    }
    F.simulateLeague(g);
  }
  // Required qualification matches are created only when BOTH tables are final.
  assert.throws(() => F.drawWorld(s));
  F.advanceRegions(s);
  F.stampFull(s);
  assert(F.validFullSeason(s));
  assert.equal(F.fullMatches(s).length, 491);
  for (const r of ["AVC", "CAVB"]) {
    const g = s.regions[r],
      m = g.decider;
    assert(m && !m.sets);
    assert.deepEqual(
      [m.a, m.b],
      g.groups.map(
        (_, i) =>
          F.fullStandings(F.regionalGroup(g, i))[F.groupDirectSlots[r]].id,
      ),
    );
    assert(F.fullMatchLocked(s, g.rounds[0][0]));
    assert(!F.fullMatchLocked(s, m));
    assert.throws(() => F.recordFullScore(s, g.rounds[0][0].id, score));
    F.recordFullScore(s, m.id, score);
  }
  const ids = F.regionalQualifiers(s);
  assert.equal(new Set(ids).size, 24);
  for (const r of F.regionOrder)
    assert.equal(
      ids.filter((id) => V.get(id).region === r).length,
      F.worldSlots[r],
    );
  F.drawWorld(s);
  assert(F.validFullSeason(s));
  F.finishFullSeason(s);
  assert(F.validFullSeason(JSON.parse(JSON.stringify(s))));
  assert.equal(F.fullMatches(s).filter((m) => m.sets).length, 543);
  assert(F.worldComplete(s));
  assert.equal(Object.keys(F.worldPlacements(s)).length, 24);
  for (const corrupt of [
    (x) => {
      x.regions.CEV.groups[0][0] = x.regions.CEV.groups[1][0];
    },
    (x) => {
      x.regions.CEV.rounds[0][0].b = x.regions.CEV.groups[1][0];
    },
    (x) => {
      x.regions.AVC.decider.a = x.regions.AVC.groups[0].find(
        (id) => id !== x.regions.AVC.decider.a,
      );
    },
    (x) => {
      delete x.regions.AVC.decider;
    },
    (x) => {
      x.regions.CAVB.pots[0].reverse();
      x.regions.CAVB.groups.reverse();
    },
    (x) => {
      delete x.regionalFormat;
    },
  ]) {
    const bad = structuredClone(s);
    corrupt(bad);
    assert(!F.validFullSeason(bad));
  }
}
// A certificate is valid before remaining matches finish, survives JSON reload,
// and cannot leak into an earlier scheduled round.
const early = F.freshFullSeason(),
  group = F.regionalGroup(early.regions.CEV, 0),
  id = group.teamIds[0];
for (const m of group.rounds.flat().filter((m) => m.a === id || m.b === id))
  m.sets = score.map(([a, b]) => (m.a === id ? [a, b] : [b, a]));
const before = JSON.stringify(early),
  berths = F.groupBerths(group, 3);
assert(berths[id].qualified);
assert(!F.fullLeagueDone(group));
assert.equal(JSON.stringify(early), before);
assert.deepEqual(
  F.groupBerths(F.regionalGroup(JSON.parse(before).regions.CEV, 0), 3),
  berths,
);
assert(!F.groupBerths(V.leagueRoundSnapshot(group, 0), 3)[id].qualified);
const none = F.freshFullSeason();
assert(
  !Object.values(
    F.groupBerths(F.regionalGroup(none.regions.AVC, 0), 2, true),
  ).some((x) => x.qualified || x.contender),
);
for (let trial = 0; trial < 60; trial++) {
  const g = F.fullLeague(
    V.regionTeams("CSV").map((t) => t.id),
    "CERT",
  );
  g.rounds.flat().slice(0, 10).forEach(V.simulate);
  const cert = F.groupBerths(g, 2, true);
  for (let completion = 0; completion < 4; completion++) {
    const x = structuredClone(g);
    F.simulateLeague(x);
    const order = F.fullStandings(x).map((t) => t.id);
    for (const team of g.teamIds) {
      if (cert[team].qualified) assert(order.indexOf(team) < 2);
      if (cert[team].contender) assert(order.indexOf(team) < 3);
      if (cert[team].eliminated) assert(order.indexOf(team) >= 3);
    }
  }
}
// UI: seeded regional cards, actual group navigation, both deciders and the gate.
const t = ui("new", 937),
  d = t.w.document,
  click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
click('[data-action="Full.enter"]');
click('[data-action="Full.create"]');
click('[data-action="Full.section"][data-arg="AVC"]');
assert.equal(d.querySelectorAll(".full-regional-standing").length, 24);
assert(
  d
    .querySelector(".full-regional-decider")
    .textContent.includes("Chờ hoàn tất"),
);
for (const key of ["AVCG0", "AVCG1"]) {
  click(`[data-action="Full.section"][data-arg="${key}"]`);
  assert.equal(d.querySelectorAll(".full-standings tbody tr").length, 12);
  click('[data-action="Full.simLeague"]');
  click('[data-action="Full.section"][data-arg="AVC"]');
}
assert(d.querySelector('.full-regional-decider [data-action="Full.simMatch"]'));
click('.full-regional-decider [data-action="Full.simMatch"]');
assert.equal(d.querySelectorAll('[data-berth="qualified"]').length, 5);
assert.equal(d.querySelectorAll('[data-berth="contender"]').length, 0);
click('[data-action="Full.section"][data-arg="AVCG0"]');
assert(!d.querySelector('[data-action="Full.edit"]'));
click('[data-action="Full.section"][data-arg="overview"]');
assert(d.querySelector('[data-action="Full.drawWorld"]').disabled);
click('[data-action="Full.finish"]');
const data = t.data(),
  row = JSON.parse(data["volleyworld-full-guest"])[0];
assert.equal(row.played, 543);
assert(F.validFullSeason(row.snapshot));
click('[data-action="Full.section"][data-arg="CAVB"]');
assert.equal(d.querySelectorAll(".full-regional-standing").length, 13);
assert(!d.querySelector('[data-action="Full.edit"]'));
t.close();
const reload = ui("new", 938, data);
reload.w.document.querySelector('[data-action="Full.enter"]').click();
assert(reload.w.document.getElementById("content").textContent.includes("543"));
reload.close();
console.log(
  "PASS regional groups: 24 full 543-match seasons, pots/partition/round-robin/byes, both deciders and locks, 24 quotas, gate, corruption rejection, certificates/no future leakage/reload, sampled completions and full UI/archive flow",
);
