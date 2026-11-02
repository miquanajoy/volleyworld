const assert = require("node:assert/strict"),
  T = require("../../.test-build/tour-engine.js"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/tour-harness.cjs");
const t = ui("new", 84217),
  d = t.w.document,
  api = t.w.__tour;
const click = (selector) => {
  const el = d.querySelector(selector);
  assert(el, selector);
  assert(!el.disabled, selector);
  el.click();
};
const tab = (key) => click(`[data-action="Tour.section"][data-arg="${key}"]`);
click('[data-action="Tour.enter"]');
click('[data-action="Tour.create"]');
click('[data-action="Tour.start"]');
assert.equal(api.selected().snapshot.rules, "merit-v1");
assert.equal(api.selected().total_matches, 948);
const id = api.selected().season_id;
for (let n = 0; n < 8; n++) {
  assert.equal(api.selected().snapshot.stage, n);
  api.resume();
  if (n === 1) {
    assert.equal(d.querySelectorAll("[data-regional-group]").length, 6);
    assert(!d.querySelector(".qualification-tree"));
    assert(d.getElementById("content").textContent.includes("tạm tính"));
  }
  if (n === 4) {
    tab("qualifiers");
    const champ = T.automaticBerths(api.selected().snapshot)[0];
    assert(d.querySelector(`[data-qualified-team="${champ.id}"]`));
    assert(
      d.getElementById("content").textContent.includes("Vô địch Challenger"),
    );
    api.resume();
  }
  if (n === 5) {
    assert(
      d.querySelector(".tour-stage-heading").textContent.includes("League"),
    );
    assert.equal(d.querySelectorAll(".full-match").length, 4);
    click('[data-action="Tour.simRound"]');
    assert.equal(d.querySelectorAll(".full-tree-match").length, 16);
    api.stage("r16");
    assert(api.selected().snapshot.league.bracket.r16.every((m) => m.sets));
  }
  if (n === 6) {
    assert(
      d
        .querySelector(".tour-stage-heading")
        .textContent.includes("Chốt vé World Cup"),
    );
    assert.equal(d.querySelectorAll("[data-merit-team]").length, 2);
    assert.equal(d.querySelectorAll(".qualification-tree").length, 4);
    const before = JSON.stringify(api.selected().snapshot);
    tab("qualifiers");
    assert.equal(d.querySelectorAll('[data-route="league"]').length, 1);
    assert.equal(d.querySelectorAll('[data-route="challenger"]').length, 1);
    tab("matches");
    assert.equal(JSON.stringify(api.selected().snapshot), before);
    api.qualifierStage("CEV");
    assert(
      api
        .selected()
        .snapshot.worldcup.regions.CEV.playoff.rounds[0].every((m) => m.sets),
    );
    assert(
      api
        .selected()
        .snapshot.worldcup.regions.AVC.playoff.rounds[0].every((m) => !m.sets),
    );
    for (
      let guard = 0;
      !api.selected().snapshot.worldcup.intercontinental;
      guard++
    ) {
      assert(guard < 8);
      api.simRound();
    }
    assert.equal(
      F.intercontinentalPool(api.selected().snapshot.worldcup).length,
      17,
    );
    tab("matches");
    assert.equal(d.querySelectorAll(".tour-qualifier-branch").length, 7);
    const b = api.selected().snapshot.worldcup.intercontinental.branches[0];
    const pending = b.rounds.flat().find((m) => !m.sets);
    api.edit(pending.id);
    assert(d.getElementById("editor").open);
    d.getElementById("editor").close();
    api.qualifierStage("IC0");
    assert(
      api
        .selected()
        .snapshot.worldcup.intercontinental.branches[0].rounds[0].every(
          (m) => m.sets,
        ),
    );
  }
  if (n === 7) {
    assert.equal(d.querySelectorAll("[data-world-group]").length, 6);
    assert.equal(
      new Set(api.selected().snapshot.worldcup.world.pots.flat()).size,
      24,
    );
  }
  api.finishStage();
  assert(T.validTour(api.selected().snapshot));
  api.next();
}
assert.equal(api.selected().status, "completed");
assert.equal(api.selected().played, 948);
assert.equal(d.querySelectorAll(".tour-summary-podium > li").length, 9);
for (let n = 0; n < 8; n++) {
  api.viewStage(String(n));
  assert.equal(api.model.stage, n);
  assert(!d.querySelector('[data-action="Tour.simRound"]'));
  for (const section of ["matches", "table", "playoff"]) {
    api.section(section);
    assert(d.querySelector(".tour-page"));
  }
}
api.section("rules");
assert(d.getElementById("content").textContent.includes("19 vé khu vực"));
const data = t.data();
t.close();
const restored = ui("new", 84218, data);
restored.w.__tour.enter();
restored.w.__tour.open(id);
assert.equal(restored.w.__tour.selected().played, 948);
assert.equal(
  restored.w.document.querySelectorAll(".tour-summary-podium > li").length,
  9,
);
restored.close();
console.log(
  "PASS merit UI: production setup948, new8stagecalendar, earlyChallenger award, actual League5/qualification6 score editor and branchcontrols, all5regions/2meritroute labels,17-team IC,24worldteams,9medals,read-onlyhistoricaltabs,reload",
);
