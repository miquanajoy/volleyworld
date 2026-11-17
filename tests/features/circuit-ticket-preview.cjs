const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const app = ui("local", 12281),
  c = app.w.__circuit,
  doc = app.w.document;
c.create();
c.start();
let s = c.selected().snapshot;
for (const stage of [1, 3, 6]) {
  const before = JSON.stringify(s);
  c.viewStage(String(stage));
  assert.equal(c.model.stage, stage);
  assert(doc.querySelector(`[data-international-preview="${stage}"]`));
  assert.equal(doc.querySelectorAll("[data-international-team]").length, 0);
  assert(!doc.querySelector('[data-action="Circuit.simRound"]'));
  assert.equal(JSON.stringify(s), before);
}
c.viewStage("2");
assert.equal(c.model.stage, 6, "Future regional stages remain locked");
const early = D.freshCircuit();
while (!D.internationalTickets(early, 1, "CEV").length)
  D.simulateBatch(early, "CEV", true);
assert(!D.stageDone(early));
assert.equal(D.internationalTickets(early, 1, "CEV").length, 1);
D.finishStage(early, "CEV", true);
assert.equal(D.internationalTickets(early, 1, "CEV").length, 2);
c.model.records = [c.recordOf(early)];
c.model.selected = early.seasonId;
c.viewStage("1");
assert.equal(doc.querySelectorAll("[data-international-team]").length, 2);
while (early.stage < 2) {
  D.finishStage(early);
  D.nextStage(early);
}
const phase = early.regions.CEV.phases[1].upper;
while (!phase.bracket) D.simulateBatch(early, "CEV", true);
const m = phase.bracket.rounds[0][0];
D.recordScore(early, m.id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
assert.equal(D.internationalTickets(early, 3, "CEV").length, 1);
c.model.records = [c.recordOf(early)];
c.model.selected = early.seasonId;
c.viewStage("3");
assert.equal(doc.querySelectorAll("[data-international-team]").length, 1);
assert(!early.challenger);
D.finishStage(early);
assert.equal(D.internationalTicketCount(early, 3), 16);
assert(!early.challenger);
while (early.stage < 4) {
  D.nextStage(early);
  if (early.stage < 4) D.finishStage(early);
}
D.finishStage(early, "CEV", true);
assert.equal(D.internationalTickets(early, 6, "CEV").length, 4);
assert(!early.world);
c.model.records = [c.recordOf(early)];
c.model.selected = early.seasonId;
c.viewStage("6");
assert.equal(
  doc.querySelectorAll("[data-international-team]").length,
  D.internationalTicketCount(early, 6),
);
assert(!early.world);
app.close();
console.log(
  "PASS international previews:future navigation,exact live early tickets for First Stand/Challenger/World Cup,read-only viewing,no premature draws or simulation,regional gates retained",
);
