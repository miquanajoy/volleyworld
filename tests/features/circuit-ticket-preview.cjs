const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const app = ui("local", 12281),
  c = app.w.__circuit,
  doc = app.w.document;
const style = doc.createElement("style");
style.textContent = require("node:fs").readFileSync(
  "src/styles/circuit.css",
  "utf8",
);
doc.head.append(style);
c.create();
c.start();
let s = c.selected().snapshot;
for (const stage of [1, 3, 6]) {
  const before = JSON.stringify(s);
  c.viewStage(String(stage));
  assert.equal(c.model.stage, stage);
  assert(doc.querySelector(`[data-international-preview="${stage}"]`));
  assert.equal(doc.querySelectorAll("[data-international-team]").length, 0);
  assert.equal(
    doc.querySelectorAll(".circuit-ticket-row").length,
    D.internationalCapacity(stage) * 4,
  );
  for (const row of doc.querySelectorAll(".circuit-ticket-row"))
    assert.equal(app.w.getComputedStyle(row).flexWrap, "nowrap");
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
const opening = early.firstStand.rounds[0].flatMap((m) => [m.a, m.b]);
assert.equal(new Set(opening.slice(0, 4).map(D.regionOf)).size, 4);
assert.equal(new Set(opening.slice(4).map(D.regionOf)).size, 4);
assert(D.validCircuit(early));
const forged = JSON.parse(JSON.stringify(early));
[forged.firstStand.opening[1], forged.firstStand.opening[5]] = [
  forged.firstStand.opening[5],
  forged.firstStand.opening[1],
];
assert(!D.validCircuit(forged));
const phase = early.regions.CEV.phases[1].upper;
while (!phase.bracket) D.simulateBatch(early, "CEV", true);
const m = phase.bracket.rounds[0][0];
D.recordScore(early, m.id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
assert.equal(D.internationalTickets(early, 3, "CEV").length, 0);
while (phase.bracket.rounds.length < 3) D.simulateBatch(early, "CEV", true);
D.recordScore(early, phase.bracket.rounds[2][0].id, [
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
D.finishSeason(early);
c.model.records = [c.recordOf(early)];
c.model.selected = early.seasonId;
c.viewStage("6");
c.model.section = "teams";
c.renderCircuit();
assert.equal(doc.querySelectorAll("[data-international-team]").length, 32);
for (const row of doc.querySelectorAll("[data-international-team]")) {
  assert.equal(
    row.children.length,
    2,
    "Only team and compact status occupy a ticket row",
  );
  assert.equal(row.querySelector(".circuit-ticket-check").textContent, "✓");
  assert(row.querySelector(".circuit-ticket-check").getAttribute("aria-label"));
  assert(
    row.title.includes(row.querySelector(".team-name").textContent),
    "Full name stays available on hover",
  );
  assert.equal(app.w.getComputedStyle(row).flexWrap, "nowrap");
  assert.equal(
    app.w.getComputedStyle(row.querySelector(".team-name")).whiteSpace,
    "nowrap",
  );
  assert.equal(app.w.getComputedStyle(row).minHeight, "52px");
}
app.close();
console.log(
  "PASS international previews:future navigation,exact live early tickets for First Stand/Challenger/World Cup,read-only viewing,no premature draws or simulation,regional gates retained",
);
