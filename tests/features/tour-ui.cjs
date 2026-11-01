const assert = require("node:assert/strict"),
  T = require("../../.test-build/tour-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const t = ui("new", 81731),
  d = t.w.document,
  api = t.w.__tour;
const click = (selector) => {
  const e = d.querySelector(selector);
  assert(e, "Missing " + selector);
  assert(!e.disabled, "Disabled " + selector);
  e.click();
};
const select = (section) =>
  click(`[data-action="Tour.section"][data-arg="${section}"]`);
const classic = t.run("JSON.stringify(state)");
click('[data-action="Tour.enter"]');
assert(d.querySelector(".tour-hero"));
assert(d.querySelector(".tour-empty"));
click('[data-action="Tour.create"]');
assert.equal(api.model.records.length, 0, "Setup is a draft");
assert.equal(d.querySelectorAll(".tour-region-tabs button").length, 5);
assert(T.validRoster(api.model.setup.ids));
const outgoing = api.model.setup.ids.find((id) => V.get(id).region === "CEV"),
  incoming = V.catalog.find(
    (team) => team.region === "CEV" && !api.model.setup.ids.includes(team.id),
  ).id;
click(`[data-action="Tour.toggleTeam"][data-arg="${outgoing}"]`);
assert(d.querySelector('[data-action="Tour.start"]').disabled);
click(`[data-action="Tour.toggleTeam"][data-arg="${incoming}"]`);
click('[data-action="Tour.start"]');
const id = api.selected().season_id;
assert(api.selected().snapshot.roster.includes(incoming));
assert(!api.selected().snapshot.roster.includes(outgoing));
assert.equal(d.querySelectorAll(".tour-journey-card").length, 8);
assert.equal(
  d.querySelectorAll(".tour-journey-card button:disabled").length,
  7,
);
api.viewStage("7");
assert.equal(api.model.stage, 0, "Cannot jump to a future event");
click('[data-action="Tour.viewStage"][data-arg="0"]');
assert.equal(d.querySelectorAll(".full-match").length, 16);
assert.equal(d.querySelectorAll(".tour-round-nav button").length, 10);
const first = api.selected().snapshot.league.rounds[0][0];
click(`[data-action="Tour.edit"][data-arg="${first.id}"]`);
assert(d.getElementById("editor").open);
assert(!d.getElementById("setPlay0").hidden);
assert(d.getElementById("setPlay1").hidden);
for (let i = 0; i < 3; i++) {
  d.getElementById("a" + i).value = "25";
  d.getElementById("b" + i).value = "20";
}
d.getElementById("scoreForm").dispatchEvent(
  new t.w.Event("submit", { bubbles: true, cancelable: true }),
);
assert(!d.getElementById("editor").open);
assert.equal(api.selected().played, 1);
// Corrections remain available while this round is still active.
click(`[data-action="Tour.edit"][data-arg="${first.id}"]`);
for (let i = 0; i < 3; i++) d.getElementById("b" + i).value = "18";
d.getElementById("scoreForm").dispatchEvent(
  new t.w.Event("submit", { bubbles: true, cancelable: true }),
);
assert.equal(api.selected().played, 1);
assert.equal(api.selected().snapshot.league.rounds[0][0].sets[0][1], 18);

const next = api.selected().snapshot.league.rounds[0][1];
click(`[data-action="Tour.match"][data-arg="${next.id}"]`);
click('[data-action="Tour.dialogSim"]');
assert.equal(api.selected().played, 2);
api.simMatch(api.selected().snapshot.league.rounds[10][0].id);
assert.equal(
  api.selected().played,
  2,
  "Later League phase cannot be simulated early",
);
click('[data-action="Tour.simRound"]');
select("table");
click('[data-action="Tour.round"][data-arg="0"]');
const table0 = d.querySelector(".tour-standings tbody").textContent;
api.showMatch(first.id);
const detailForm0 = [...d.querySelectorAll("#playoffMatchBody .form-strip")]
  .map((e) => e.textContent)
  .join("|");
assert.equal(d.querySelectorAll("#playoffMatchBody .form-strip").length, 2);
d.getElementById("playoffMatchDialog").close();

click('[data-action="Tour.simRound"]');
click('[data-action="Tour.round"][data-arg="0"]');
assert.equal(
  d.querySelector(".tour-standings tbody").textContent,
  table0,
  "Old League standings/form remain unchanged",
);
assert.equal(d.querySelectorAll(".tour-standings tbody tr").length, 32);
api.showMatch(first.id);
assert.equal(
  [...d.querySelectorAll("#playoffMatchBody .form-strip")]
    .map((e) => e.textContent)
    .join("|"),
  detailForm0,
  "Old match detail forms do not leak later League games",
);
d.getElementById("playoffMatchDialog").close();

for (let stage = 0; stage < 8; stage++) {
  assert.equal(api.selected().snapshot.stage, stage);
  assert.equal(api.model.stage, stage);
  if (stage === 1) {
    select("table");
    click('[data-action="Tour.region"][data-arg="CSV"]');
    assert.equal(d.querySelectorAll(".tour-group-table tbody tr").length, 6);
    select("playoff");
    assert(
      d.querySelector(".tour-empty").textContent.includes("không có playoff"),
    );
    click('[data-action="Tour.region"][data-arg="CEV"]');
  }
  if (stage === 2) {
    select("matches");
    assert.equal(d.querySelectorAll(".tour-round-nav button").length, 10);
    assert.equal(d.querySelector(".tour-round-nav button").dataset.arg, "10");
  }
  if (stage === 3) {
    assert.deepEqual(
      [...api.selected().snapshot.challenger.roster].sort(),
      [...api.selected().snapshot.roster].sort(),
    );
    select("matches");
    assert.equal(d.querySelectorAll("[data-swiss-node]").length, 15);
    assert.equal(d.querySelectorAll(".swiss-map-match").length, 16);
    click('[data-action="Tour.swissView"][data-arg="matches"]');
    assert.equal(d.querySelectorAll(".full-match").length, 16);
    click('[data-action="Tour.simRound"]');
    assert.equal(api.selected().snapshot.challenger.rounds.length, 2);
    select("table");
    click('[data-action="Tour.round"][data-arg="0"]');
    const swiss0 = d.querySelector(".tour-standings tbody").textContent;
    click('[data-action="Tour.simRound"]');
    click('[data-action="Tour.round"][data-arg="0"]');
    assert.equal(
      d.querySelector(".tour-standings tbody").textContent,
      swiss0,
      "Old Swiss standings/form remain unchanged",
    );
  }
  if (stage === 4) {
    select("matches");
    assert.equal(d.querySelectorAll(".tour-round-nav button").length, 11);
    assert.equal(d.querySelector(".tour-round-nav button").dataset.arg, "20");
  }
  if (stage === 5) {
    select("playoff");
    assert.equal(d.querySelectorAll(".tour-qualifier-branch").length, 3);
    assert.equal(d.querySelectorAll(".qualification-tree").length, 3);
    assert.equal(
      d.querySelectorAll('#content [data-action^="Full."]').length,
      0,
      "All qualifier actions belong to Tour",
    );
    api.qualifierStage("IC0");
    assert(
      api
        .selected()
        .snapshot.worldcup.intercontinental.branches[0].rounds.flat()
        .some((m) => m.sets),
    );
    assert(
      api
        .selected()
        .snapshot.worldcup.intercontinental.branches.slice(1)
        .every((b) => b.rounds.flat().every((m) => !m.sets)),
      "A branch's run button only simulates its own matches",
    );
  }
  if (stage === 6) {
    select("playoff");
    assert.equal(
      d.querySelectorAll(".full-match").length,
      4,
      "League Play-in has four matches",
    );
    click('[data-action="Tour.simRound"]');
    assert.equal(api.selected().snapshot.league.bracket.r20.length, 4);
    click('[data-action="Tour.simRound"]');
    assert.equal(
      d.querySelectorAll(".full-tree-match").length,
      16,
      "Connected playoff tree is inherited",
    );
    api.stage("r16");
    assert(api.selected().snapshot.league.bracket.r16.every((m) => m.sets));
    assert(
      api.selected().snapshot.league.bracket.qf.every((m) => !m.sets),
      "Running one stage does not run its successor",
    );
  }
  if (stage === 7) {
    select("matches");
    assert.equal(
      d.querySelectorAll(".full-match").length,
      12,
      "One matchday spans all six World Cup groups",
    );
    click('[data-action="Tour.simRound"]');
    assert.equal(
      api
        .selected()
        .snapshot.worldcup.world.groups.flatMap((g) => g.rounds.flat())
        .filter((m) => m.sets).length,
      12,
    );
    select("table");
    click('[data-action="Tour.round"][data-arg="0"]');
    const world0 = [...d.querySelectorAll(".tour-group-table tbody")]
      .map((e) => e.textContent)
      .join("|");
    click('[data-action="Tour.simRound"]');
    click('[data-action="Tour.round"][data-arg="0"]');
    assert.equal(
      [...d.querySelectorAll(".tour-group-table tbody")]
        .map((e) => e.textContent)
        .join("|"),
      world0,
      "Old world group/third-place tables remain unchanged",
    );
  }
  if (api.model.section === "journey") select("matches");
  click('[data-action="Tour.finishStage"]');
  assert(T.stageDone(api.selected().snapshot));
  assert(T.validTour(api.selected().snapshot));
  if (stage === 1) {
    select("playoff");
    assert(d.querySelector(".qualification-tree"));
  }
  if (stage === 3) {
    select("playoff");
    assert.equal(d.querySelectorAll(".full-tree-match").length, 16);
    assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  }
  assert(
    !d.querySelector('[data-action="Tour.simMatch"]'),
    "Completed stage offers no simulation",
  );
  click('[data-action="Tour.next"]');
}
assert.equal(api.selected().status, "completed");
assert.equal(api.selected().played, 968);
assert.equal(d.querySelectorAll(".tour-champions > section").length, 3);
assert.equal(d.querySelectorAll(".tour-journey-card.is-done").length, 8);
const completed = JSON.stringify(api.selected().snapshot);
for (let stage = 0; stage < 8; stage++) {
  click(`[data-action="Tour.viewStage"][data-arg="${stage}"]`);
  for (const section of ["matches", "table", "playoff"]) {
    select(section);
    assert(d.querySelector(".tour-page"));
    if (stage === 1) {
      assert.equal(
        d.querySelectorAll(".tour-qualified-list > div").length,
        21,
        "Regional history excludes later Play-in tickets",
      );
      assert(
        !d
          .querySelector(".tour-qualified-list")
          .textContent.includes("Play-in"),
      );
    }
    if (stage === 5 && section === "table") {
      assert.equal(
        d.querySelectorAll(".tour-qualified-list > div").length,
        24,
        "Play-in winners update their region's World Cup qualifiers",
      );
    }
    assert(!d.querySelector('[data-action="Tour.finishStage"]'));
    assert(!d.querySelector('[data-action="Tour.simMatch"]'));
    assert(!d.querySelector('[data-action="Tour.edit"]'));
  }
}
assert.equal(
  JSON.stringify(api.selected().snapshot),
  completed,
  "History browsing never changes the season",
);
assert.equal(
  t.run("JSON.stringify(state)"),
  classic,
  "Standalone World League is unchanged",
);
const data = t.data();
t.close();
const reload = ui("new", 81732, data),
  restored = reload.w.__tour;
restored.enter();
restored.open(id);
assert(T.validTour(restored.selected().snapshot));
assert.equal(restored.selected().played, 968);
assert.equal(
  reload.w.document.querySelectorAll(".tour-champions > section").length,
  3,
);
reload.close();
console.log(
  "PASS Tour UI: exact regional setup, shared roster, eight gated stages, manual/per-set editor, dialog simulation, historical League/Swiss/world/third-place tables, regional and intercontinental brackets, global World Cup matchdays, League play-in/r20, all completed history tabs read-only, three champions, persistence and standalone isolation",
);
