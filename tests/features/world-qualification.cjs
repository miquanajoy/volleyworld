const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x));
function playBracket(s, b) {
  for (const round of b.rounds) {
    for (const m of round) {
      F.recordFullScore(s, m.id, [
        [25, 20],
        [25, 20],
        [25, 20],
      ]);
      assert(F.validFullSeason(s));
    }
  }
}
let complete;
for (let i = 0; i < 40; i++) {
  const s = F.freshFullSeason(i + 1);
  assert(F.validFullSeason(s));
  assert.equal(s.regionalFormat, "qualification-v2");
  assert.equal(F.fullMatches(s).length, 264);
  assert.equal(F.fullTotalMatches(s), 366);
  assert.throws(() => F.drawWorld(s));
  assert.throws(() => F.drawIntercontinental(s));
  for (const r of F.regionOrder) {
    const g = s.regions[r];
    assert.equal(g.groups?.length || 1, F.qualificationGroups[r]);
    if (g.groups)
      assert(g.groups.every((ids) => ids.length === 6 || ids.length === 7));
    F.simulateLeague(g);
    F.advanceRegions(s);
    F.stampFull(s);
    assert(F.validFullSeason(s));
    if (r !== "CSV") {
      const b = g.playoff,
        n = F.qualificationGroups[r] * 2;
      assert.equal(b.seeds.length, n);
      assert.equal(
        b.rounds[0].length,
        n === 12 ? 4 : n === 8 ? 4 : n === 6 ? 2 : 2,
      );
      if ([4, 8].includes(n)) assert.equal(b.rounds[0].length, n / 2);
      assert(F.fullMatchLocked(s, g.rounds[0][0]));
      const firstThird = b.seeds.findIndex(
        (id) => F.qualificationStanding(s, id).rank === 3,
      );
      assert.equal(firstThird, n / 2);
      playBracket(s, b);
      assert.equal(F.qualifierMatches(b).length, n - 1);
      assert.equal(
        F.regionQualifiers(g, r).length,
        F.qualificationGroups[r] + 1,
      );
    } else
      assert.deepEqual(
        F.regionQualifiers(g, r),
        F.fullStandings(g)
          .slice(0, 2)
          .map((t) => t.id),
      );
  }
  assert.equal(F.intercontinentalPool(s).length, 27);
  assert.throws(() => F.drawWorld(s));
  const expected = { CEV: 11, AVC: 7, NORCECA: 5, CAVB: 3, CSV: 1 };
  for (const r of F.regionOrder)
    assert.equal(
      F.intercontinentalPool(s).filter((id) => V.get(id).region === r).length,
      expected[r],
    );
  const third = F.fullStandings(s.regions.CSV)[2].id;
  assert(F.intercontinentalPool(s).includes(third));
  F.drawIntercontinental(s);
  assert(F.validFullSeason(s));
  assert.equal(s.intercontinental.pots.length, 9);
  assert(F.fullMatchLocked(s, s.regions.CSV.rounds[0][0]));
  for (const [j, b] of s.intercontinental.branches.entries()) {
    assert.equal(b.seeds.length, 9);
    assert.equal(b.rounds[0].length, 1);
    assert.equal(b.rounds[0][0].a, b.seeds[7]);
    assert.equal(b.rounds[0][0].b, b.seeds[8]);
    for (const [pot, ids] of s.intercontinental.pots.entries())
      assert(ids.includes(b.seeds[pot]));
    playBracket(s, b);
    assert.equal(F.qualifierMatches(b).length, 8);
    if (j < 2) assert.throws(() => F.drawWorld(s));
  }
  assert.equal(F.qualificationEntrants(s).length, 24);
  assert.equal(new Set(F.qualificationEntrants(s)).size, 24);
  F.drawWorld(s);
  assert(F.validFullSeason(s));
  F.finishFullSeason(s);
  assert(F.validFullSeason(s));
  assert(F.worldComplete(s));
  assert.equal(F.fullMatches(s).length, 366);
  assert(F.fullMatches(s).every((m) => m.sets));
  assert.equal(new Set(F.fullMatches(s).map((m) => m.resultOrder)).size, 366);
  complete = s;
}
for (const change of [
  (s) => delete s.intercontinental,
  (s) => (s.regions.CSV.directSlots = 3),
  (s) => s.regions.CEV.groups.pop(),
  (s) => s.regions.CEV.playoff.seeds.reverse(),
  (s) =>
    (s.regions.CEV.playoff.rounds[1][0].a = s.regions.CEV.playoff.seeds[1]),
  (s) =>
    (s.intercontinental.branches[0].seeds[0] =
      s.intercontinental.branches[1].seeds[0]),
  (s) =>
    (s.intercontinental.branches[0].rounds[1][0].b =
      s.intercontinental.branches[0].seeds[8]),
  (s) =>
    (s.intercontinental.branches[0].rounds[0][0].resultOrder =
      s.regions.CEV.rounds[0][0].resultOrder),
  (s) => s.intercontinental.pots.reverse(),
  (s) => {
    s.intercontinental.branches[2].rounds[3][0].sets = null;
    delete s.intercontinental.branches[2].rounds[3][0].resultOrder;
  },
]) {
  const bad = copy(complete);
  change(bad);
  assert(!F.validFullSeason(bad));
}
// Real UI: all six European groups, shared match editor, byes, all Play-in branches and the World Cup gate.
const t = ui("new", 921),
  d = t.w.document,
  api = t.w.__full;
const click = (q) => {
  const e = d.querySelector(q);
  assert(e, q);
  e.click();
};
click('[data-action="Full.enter"]');
click('[data-action="Full.create"]');
const id = api.selectedFull().season_id;
click('[data-action="Full.section"][data-arg="CEV"]');
assert.equal(d.querySelectorAll(".full-group-nav button").length, 8);
for (let i = 0; i < 6; i++) {
  click(`[data-action="Full.section"][data-arg="CEVG${i}"]`);
  assert(d.querySelectorAll(".full-standings tbody tr").length >= 6);
  click('[data-action="Full.simLeague"]');
}
assert(api.selectedFull().snapshot.regions.CEV.playoff);
const beforeRender = JSON.stringify(
  api.selectedFull().snapshot.regions.CEV.playoff,
);
click('[data-action="Full.section"][data-arg="CEVP"]');
assert(d.querySelector(".qualification-tree"));
const european = api.selectedFull().snapshot.regions.CEV.playoff;
const quarterTeams = [
  ...d.querySelectorAll(".qualification-round:nth-child(2) [data-team]"),
].map((e) => e.dataset.team);
assert.deepEqual(
  quarterTeams,
  [0, 3, 1, 2].map((i) => european.seeds[i]),
);
assert.equal(d.querySelectorAll(".qualification-team[data-bye]").length, 4);
assert.equal(
  d.querySelectorAll(".qualification-tree [data-qualification-match]").length,
  11,
);
assert.equal(
  d.querySelectorAll(".qualification-tree button[data-qualification-match]")
    .length,
  4,
);
assert.equal(
  JSON.stringify(european),
  beforeRender,
  "Rendering must not create results or future matches",
);
const firstPreliminary = european.rounds[0][0];
click(`[data-action="Full.match"][data-arg="${firstPreliminary.id}"]`);
click('[data-action="Full.dialogSim"]');
const updatedBracket = api.selectedFull().snapshot.regions.CEV.playoff;
assert.equal(
  updatedBracket.rounds[1].length,
  0,
  "Other preliminary matches are still pending",
);
const played = updatedBracket.rounds[0][0];
const qualified =
  played.sets.filter(([a, b]) => a > b).length === 3 ? played.a : played.b;
assert(
  d.querySelector(
    `[data-qualification-match="CEVK1-0"] [data-team="${qualified}"]`,
  ),
  "A known winner appears before the whole round finishes",
);
click('.qualification-tree [data-action="Full.match"]');
click('[data-action="Full.dialogEdit"]');
assert(d.getElementById("editor").open);
d.getElementById("editor").close();
for (let i = 0; i < 4; i++)
  click('[data-action="Full.qualifierStage"][data-arg="CEV"]');
assert(d.querySelector(".qualification-winner"));
click('[data-action="Full.section"][data-arg="overview"]');
assert.equal(
  d.querySelectorAll('[data-overview-region="CEV"] [data-world-qualifier]')
    .length,
  7,
);
assert(d.querySelector('[data-action="Full.drawWorld"]').disabled);
// Use a validated pending fixture for the cross-regional UI, avoiding more league simulation in this view test.
const pending = copy(complete);
pending.seasonId = id;
pending.seasonNumber = 1;
pending.world = null;
pending.intercontinental = null;
assert(F.validFullSeason(pending));
Object.assign(api.selectedFull(), api.recordOf(pending), { dirty: true });
api.persistFull();
click('[data-action="Full.section"][data-arg="intercontinental"]');
click('[data-action="Full.drawIntercontinental"]');
assert.equal(d.querySelectorAll(".qualification-branch").length, 3);
assert.equal(d.querySelectorAll(".qualification-team[data-bye]").length, 21);
assert.equal(
  d.querySelectorAll(".qualification-tree [data-qualification-match]").length,
  24,
);
for (let branch = 0; branch < 3; branch++) {
  const seeds =
    api.selectedFull().snapshot.intercontinental.branches[branch].seeds;
  const tree = d.querySelectorAll(".qualification-tree")[branch];
  const known = [
    ...tree.querySelectorAll(".qualification-round:nth-child(2) [data-team]"),
  ].map((e) => e.dataset.team);
  assert.deepEqual(
    known,
    [0, 3, 4, 1, 6, 2, 5].map((i) => seeds[i]),
  );
  assert.equal(
    tree.querySelectorAll("button[data-qualification-match]").length,
    1,
    "Only the real preliminary match is actionable",
  );
  assert(
    tree
      .querySelector(`[data-qualification-match="IC${branch}K1-0"]`)
      .textContent.includes("Thắng P1"),
  );
}
for (let b = 0; b < 3; b++)
  for (let i = 0; i < 4; i++)
    click(`[data-action="Full.qualifierStage"][data-arg="IC${b}"]`);
assert.equal(d.querySelectorAll(".qualification-winner").length, 3);
click('[data-action="Full.drawWorld"]');
assert(api.selectedFull().snapshot.world);
const data = t.data();
t.close();
const reloaded = ui("new", 922, data);
reloaded.w.__full.enterFull();
reloaded.w.__full.openFull(id);
assert(F.validFullSeason(reloaded.w.__full.selectedFull().snapshot));
reloaded.close();
console.log(
  "PASS qualification v2: 40 full 366-match seasons, exact 17+4+3 qualification, 27-team pool, normalized seeds, 12/8/6/4 regional routes and byes, 9-team branches, 24 distinct entrants, score locks, malformed states, six-group UI, manual editor, stage buttons, gate and reload",
);
