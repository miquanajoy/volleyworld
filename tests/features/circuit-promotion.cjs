const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  D = require("../../.test-build/circuit-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x));
const s = D.freshCircuit();
while (s.stage < 6) {
  D.finishStage(s);
  D.nextStage(s);
}
D.finishStage(s);
assert(!D.complete(s), "World Cup alone cannot finish a new season");
assert.throws(() => D.nextUpper(s, "CEV"));
const before = JSON.stringify(
  D.regions.map((r) => [
    D.points(s, r, true, true),
    D.points(s, r, false, true),
  ]),
);
const wc = copy(s.world);
const legacy = copy(s);
delete legacy.promotionEnabled;
D.nextStage(legacy);
assert(D.complete(legacy));
assert.equal(D.seasonMatchCount(legacy), 1095);
assert(D.validCircuit(legacy));
fs.writeFileSync("/tmp/phase6-legacy.json", JSON.stringify(legacy));
D.nextStage(s);
assert.equal(s.stage, 7);
assert(!D.complete(s));
assert(D.validCircuit(s));
// Loading an already played legacy season must add only the new rule marker.
const oldActive = copy(legacy);
oldActive.stage = 6;
const upgradedApp = ui("local", 1192);
const upgraded = upgradedApp.w.__circuit.recordOf(oldActive);
assert(upgraded.snapshot.promotionEnabled);
assert.deepEqual(copy(upgraded.snapshot.world), oldActive.world);
assert.equal(upgraded.status, "active");
assert.equal(upgraded.podium.length, 3);
assert(upgradedApp.w.__circuit.validRecord(upgraded));
assert(
  !upgradedApp.w.__circuit.recordOf(legacy).snapshot.promotionEnabled,
  "Completed legacy season stays immutable",
);
upgradedApp.close();
const draw = JSON.stringify(s.regions.CEV.promotion);
assert.equal(
  JSON.stringify(copy(s).regions.CEV.promotion),
  draw,
  "Draw survives JSON reload",
);
fs.writeFileSync("/tmp/phase6-start.json", JSON.stringify(s));
for (const r of D.regions) {
  const z = s.regions[r],
    p = z.promotion;
  assert.equal(D.promotionEntrants(s, r).length, 16);
  assert.equal(new Set(p.groups.flatMap((g) => g.seeds)).size, 16);
  assert(!p.seeds.some((id) => D.qualifiers(s, r).includes(id)));
  assert(
    p.groups.every((g) => p.pots.every((pot, i) => pot.includes(g.seeds[i]))),
  );
  for (const safe of D.qualifiers(s, r))
    assert.equal(D.promotionStatus(s, r, safe), "safe");
  const forged = copy(s);
  forged.regions[r].promotion.groups[0].seeds[0] = D.qualifiers(s, r)[0];
  assert(!D.validCircuit(forged));
  const early = copy(s);
  early.stage = 6;
  assert(!D.validCircuit(early));
}
const preview = ui("local", 19990),
  pc = preview.w.__circuit;
pc.create();
pc.start();
const untouched = JSON.stringify(pc.selected().snapshot);
pc.viewStage("7");
assert.equal(JSON.stringify(pc.selected().snapshot), untouched);
assert(!preview.w.document.querySelector('[data-action="Circuit.simRound"]'));
preview.close();
const app = ui("local", 19991),
  c = app.w.__circuit,
  doc = app.w.document;
c.model.records = [c.recordOf(s)];
c.model.selected = s.seasonId;
c.viewStage("7");
assert.equal(doc.querySelectorAll("[data-promotion-group]").length, 4);
const styles = doc.createElement("style");
styles.textContent = fs.readFileSync("src/styles/circuit.css", "utf8");
doc.head.append(styles);
assert.equal(
  app.w.getComputedStyle(doc.querySelector(".circuit-promotion-groups"))
    .gridTemplateColumns,
  "repeat(2, minmax(0, 1fr))",
);
assert.equal(
  doc.querySelectorAll(".circuit-promotion-groups .circuit-bracket").length,
  4,
);
assert.equal(
  doc.querySelectorAll(".circuit-promotion-table tbody tr").length,
  16,
);
assert.equal(doc.querySelectorAll('[data-promotion-status="safe"]').length, 8);
assert(!doc.getElementById("content").textContent.match(/mâm/i));
assert(doc.querySelector('[data-action="Circuit.simRound"]'));
// Score one opening, then the other: both controls and round progression remain available.
const g = s.regions.CEV.promotion.groups[0];
c.simMatch(g.rounds[0][0].id);
c.simMatch(g.rounds[0][1].id);
let cg = c.selected().snapshot.regions.CEV.promotion.groups[0];
c.simMatch(cg.rounds[1][0].id);
assert.equal(
  doc.querySelectorAll(
    '.circuit-promotion-table [data-promotion-status="qualified"]',
  ).length,
  1,
  "First winner gets live green tick",
);
cg = c.selected().snapshot.regions.CEV.promotion.groups[0];
c.simMatch(cg.rounds[2][0].id);
assert.equal(
  doc.querySelectorAll(
    '.circuit-promotion-table [data-promotion-status="eliminated"]',
  ).length,
  1,
  "Second loss gets live red cross",
);
c.finishStage();
doc.querySelector('[data-action="Circuit.confirmFinish"]').click();
assert.equal(D.promotionWinners(c.selected().snapshot, "CEV").length, 8);
assert(
  !D.stageDone(c.selected().snapshot),
  "One region cannot close the season",
);
const storage = app.data(),
  id = s.seasonId;
app.close();
(async () => {
  const reloaded = ui("local", 19992, storage),
    rc = reloaded.w.__circuit;
  await rc.open(id);
  rc.viewStage("7");
  assert.equal(D.promotionWinners(rc.selected().snapshot, "CEV").length, 8);
  reloaded.close();
  while (!D.stageDone(s)) {
    for (const m of D.batch(s).filter((m) => !m.sets)) {
      m.sets = [
        [20, 25],
        [20, 25],
        [20, 25],
      ];
    }
    D.advance(s);
    assert(D.validCircuit(s));
  }
  for (const r of D.regions) {
    assert.equal(D.promotionWinners(s, r).length, 8);
    for (const g of s.regions[r].promotion.groups) {
      assert.equal(D.bracketMatches(g).length, 5);
      for (const id of g.seeds) {
        const ms = D.bracketMatches(g),
          wins = ms.filter((m) => V.winner(m) === id).length,
          losses = ms.filter((m) => V.loser(m) === id).length;
        assert(wins === 2 || losses === 2);
        assert.equal(
          D.promotionStatus(s, r, id),
          wins === 2 ? "qualified" : "eliminated",
        );
      }
    }
  }
  assert.deepEqual(s.world, wc, "World Cup results untouched");
  assert.equal(
    JSON.stringify(
      D.regions.map((r) => [
        D.points(s, r, true, true),
        D.points(s, r, false, true),
      ]),
    ),
    before,
    "Phase 6 adds no points",
  );
  D.nextStage(s);
  assert(D.complete(s));
  assert.equal(D.played(s), 1175);
  assert(D.validCircuit(s));
  for (const r of D.regions) {
    assert.equal(
      D.promotionStatus(s, r, s.regions[r].promotion.seeds[0]),
      "eliminated",
      "Highest points never grants a free place",
    );
    assert(!D.nextUpper(s, r).includes(s.regions[r].promotion.seeds[0]));
    assert.deepEqual(D.nextUpper(s, r), [
      ...D.qualifiers(s, r),
      ...D.promotionWinners(s, r),
    ]);
  }
  const future = D.freshCircuit(2, D.inheritedSelection(s), s);
  assert(D.validCircuit(future));
  fs.writeFileSync("/tmp/phase6-completed.json", JSON.stringify(s));
  console.log(
    "PASS Phase 6: existing/legacy saves;World Cup immunity;16 entrants;four pots;live GSL ticks/crosses;two-win/two-loss routes;80 games;unchanged points/results;reload;8+8 next-season slots;inherited UI",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
