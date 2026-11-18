const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  D = require("../../.test-build/circuit-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x));
const s = D.freshCircuit();
while (s.stage < 2) {
  D.finishStage(s);
  D.nextStage(s);
}
const p = s.regions.CEV.phases[1].upper;
while (!p.bracket) D.simulateBatch(s, "CEV", true);
const b = p.bracket;
assert.equal(b.kind, "double");
assert(!b.bronzeRequired);
assert(!D.plan(b).some((t) => t.id.endsWith("R")));
assert.deepEqual(b.opening, b.seeds);
const losers = new Set(b.rounds[0].map((m) => m.b));
for (const m of [...b.rounds[0]])
  D.recordScore(s, m.id, [
    [25, 20],
    [25, 20],
    [25, 20],
  ]);
assert.equal(
  D.internationalTickets(s, 3, "CEV").length,
  0,
  "Opening wins cannot grant Challenger tickets",
);
while (!D.bracketDone(b)) {
  const ready = D.regionalBatch(s, "CEV", true).filter((m) => !m.sets);
  for (const m of ready) {
    const id = losers.has(m.a) ? m.a : losers.has(m.b) ? m.b : m.a;
    D.recordScore(
      s,
      m.id,
      Array.from({ length: 3 }, () => (m.a === id ? [25, 20] : [20, 25])),
    );
  }
  assert(D.validCircuit(s));
  const tickets = D.internationalTickets(s, 3, "CEV").map((t) => t.id);
  assert.equal(new Set(tickets).size, tickets.length);
  assert(tickets.length <= 4);
}
assert.equal(D.bracketMatches(b).length, 14);
assert(!b.bronze);
const ranks = D.leagueRanks(p),
  top = ranks.slice(0, 4).map((t) => t.id);
assert(
  top.some((id) => losers.has(id)),
  "Opening losers may recover through lower bracket into Challenger",
);
assert.deepEqual(
  D.internationalTickets(s, 3, "CEV").map((t) => t.id),
  top,
);
assert.deepEqual(
  ranks.slice(0, 4).map((t) => t.from),
  [1, 2, 3, 4],
);
for (const id of b.seeds.filter((id) => !top.includes(id)))
  assert.equal(D.bracketMatches(b).filter((m) => V.loser(m) === id).length, 2);
const app = ui("local", 89312),
  c = app.w.__circuit,
  doc = app.w.document;
c.model.records = [c.recordOf(s)];
c.model.selected = s.seasonId;
c.viewStage("2");
c.model.section = "playoff";
c.renderCircuit();
assert(doc.querySelector(".double-lower-scroll"));
assert(!doc.querySelector("[data-circuit-bronze]"));
assert(doc.getElementById("content").textContent.includes("Chung kết tổng"));
assert.equal(
  doc.querySelectorAll(".circuit-final-standings tbody tr").length,
  16,
);
app.close();
D.finishStage(s);
D.nextStage(s);
assert.deepEqual(
  s.challenger.roster.filter((id) => D.regionOf(id) === "CEV"),
  top,
);
D.finishSeason(s);
assert.equal(D.played(s), 1175);
assert(D.validCircuit(s));
fs.writeFileSync("/tmp/phase2-double-complete.json", JSON.stringify(s));
// An existing unscored single bracket upgrades; any played Phase 2 bracket stays intact.
const old = D.freshCircuit();
delete old.phaseTwoDouble;
while (old.stage < 2) {
  D.finishStage(old);
  D.nextStage(old);
}
while (!old.regions.CEV.phases[1].upper.bracket)
  D.simulateBatch(old, "CEV", true);
const unplayed = copy(old),
  groupScores = JSON.stringify(unplayed.regions.CEV.phases[1].upper.groups),
  opening = copy(unplayed.regions.CEV.phases[1].upper.bracket.seeds);
D.upgradePhaseTwo(unplayed);
assert(unplayed.phaseTwoDouble);
assert.equal(unplayed.regions.CEV.phases[1].upper.bracket.kind, "double");
assert.equal(
  JSON.stringify(unplayed.regions.CEV.phases[1].upper.groups),
  groupScores,
);
assert.deepEqual(unplayed.regions.CEV.phases[1].upper.bracket.opening, opening);
assert(D.validCircuit(unplayed));
D.recordScore(old, old.regions.CEV.phases[1].upper.bracket.rounds[0][0].id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
const saved = JSON.stringify(old);
D.upgradePhaseTwo(old);
assert.equal(
  JSON.stringify(old),
  saved,
  "Scored legacy bracket never gets redrawn",
);
assert(!old.phaseTwoDouble);
assert.equal(D.internationalTickets(old, 3, "CEV").length, 1);
D.finishSeason(old);
assert.equal(D.played(old), 1151);
assert(D.validCircuit(old));
fs.writeFileSync("/tmp/phase2-single-complete.json", JSON.stringify(old));
console.log(
  "PASS Phase 2 double: fixed cross-group opening;14 matches;one grand final/no reset;no bronze;two-loss exits;top4 upper/lower tickets;opening loser recovery;Challenger seeds;1175-game season;legacy1151;safe unplayed upgrade;inherited UI",
);
