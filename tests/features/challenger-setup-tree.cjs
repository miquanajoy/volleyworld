const assert = require("node:assert/strict"),
  C = require("../../.test-build/challenger-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const t = ui("new", 39178),
  d = t.w.document,
  api = t.w.__challenger;
const click = (q) => {
  const e = d.querySelector(q);
  assert(e, q);
  assert(!e.disabled, "Disabled " + q);
  e.click();
};
click('[data-action="Challenger.enter"]');
click('[data-action="Challenger.create"]');
assert(d.querySelector(".challenger-roster-setup"));
assert.equal(
  api.model.records.length,
  0,
  "No season is persisted before confirmation",
);
click('[data-action="Challenger.toggleTeam"][data-arg="POL"]');
assert.equal(api.model.setup.ids.length, 31);
assert(d.querySelector('[data-action="Challenger.start"]').disabled);
click('[data-action="Challenger.toggleTeam"][data-arg="ROU"]');
assert.equal(api.model.setup.ids.length, 32);
click('[data-action="Challenger.start"]');
const row = api.selected(),
  id = row.season_id;
assert(row.snapshot.roster.includes("ROU"));
assert(!row.snapshot.roster.includes("POL"));
assert(C.validChallenger(row.snapshot));
const before = JSON.stringify(row.snapshot);
click('[data-action="Challenger.editRoster"]');
click('[data-action="Challenger.toggleTeam"][data-arg="ITA"]');
click('[data-action="Challenger.cancelSetup"]');
assert.equal(JSON.stringify(row.snapshot), before);
click('[data-action="Challenger.editRoster"]');
click('[data-action="Challenger.toggleTeam"][data-arg="ITA"]');
click('[data-action="Challenger.toggleTeam"][data-arg="POR"]');
click('[data-action="Challenger.start"]');
assert.equal(api.selected().season_id, id);
assert(api.selected().snapshot.roster.includes("POR"));
assert(!api.selected().snapshot.roster.includes("ITA"));
click('[data-action="Challenger.section"][data-arg="swiss"]');
assert.equal(d.querySelectorAll("[data-swiss-node]").length, 15);
assert.equal(d.querySelectorAll(".swiss-map-lines path").length, 18);
assert.equal(d.querySelectorAll(".swiss-map-match").length, 16);
assert.equal(d.querySelectorAll(".swiss-map-match .swiss-map-team").length, 32);
assert.equal(
  d.querySelectorAll('[data-swiss-node="1-0"] .swiss-map-match').length,
  0,
);
const first = api.selected().snapshot.rounds[0][0];
d.querySelector(".swiss-tree-scroll").scrollLeft = 430;
click(`[data-action="Challenger.match"][data-arg="${first.id}"]`);
click('[data-action="Challenger.dialogSim"]');
assert.equal(d.querySelector(".swiss-tree-scroll").scrollLeft, 430);
const played = api.selected().snapshot.rounds[0][0],
  won = V.winner(played),
  lost = V.loser(played);
assert(d.querySelector(`[data-swiss-node="1-0"] [data-swiss-team="${won}"]`));
assert(d.querySelector(`[data-swiss-node="0-1"] [data-swiss-team="${lost}"]`));
assert(!d.querySelector('[data-action="Challenger.editRoster"]'));
api.editRoster();
assert(!api.model.setup, "Cannot edit a started roster");
const untouched = JSON.stringify(api.selected().snapshot);
click('[data-action="Challenger.swissView"][data-arg="matches"]');
assert.equal(d.querySelectorAll(".full-match").length, 16);
click('[data-action="Challenger.swissView"][data-arg="tree"]');
assert.equal(JSON.stringify(api.selected().snapshot), untouched);
click('[data-action="Challenger.simRound"]');
click('[data-action="Challenger.next"]');
assert.equal(d.querySelectorAll(".swiss-map-match").length, 32);
assert.equal(
  d.querySelectorAll('[data-swiss-node="1-0"] .swiss-map-match').length,
  8,
);
assert.equal(
  d.querySelectorAll('[data-swiss-node="0-1"] .swiss-map-match').length,
  8,
);
click('[data-action="Challenger.round"][data-arg="0"]');
assert.equal(
  d.querySelectorAll(".swiss-map-match").length,
  16,
  "Old round must not expose later draws",
);
assert.equal(
  d.querySelectorAll('[data-swiss-node="1-0"] .swiss-map-match').length,
  0,
);
click('[data-action="Challenger.round"][data-arg="1"]');
click('[data-action="Challenger.simRound"]');
click('[data-action="Challenger.next"]');
click('[data-action="Challenger.simRound"]');
assert.equal(
  d.querySelectorAll(".swiss-map-node.is-qualified [data-swiss-team]").length,
  4,
);
assert.equal(
  d.querySelectorAll(".swiss-map-node.is-eliminated [data-swiss-team]").length,
  4,
);
click('[data-action="Challenger.finish"]');
click('[data-action="Challenger.round"][data-arg="4"]');
assert.equal(api.selected().played, 82);
assert.equal(d.querySelectorAll(".swiss-map-match").length, 66);
assert.equal(
  d.querySelectorAll(".swiss-map-node.is-qualified [data-swiss-team]").length,
  16,
);
assert.equal(
  d.querySelectorAll(".swiss-map-node.is-eliminated [data-swiss-team]").length,
  16,
);
assert.equal(
  new Set(
    [
      ...d.querySelectorAll(".swiss-map-node.is-qualified [data-swiss-team]"),
    ].map((e) => e.dataset.swissTeam),
  ).size,
  16,
);
const completed = JSON.stringify(api.selected().snapshot);
click(".swiss-map-match");
assert(!d.querySelector('[data-action="Challenger.dialogSim"]'));
assert(!d.querySelector('[data-action="Challenger.dialogEdit"]'));
assert.equal(JSON.stringify(api.selected().snapshot), completed);
d.getElementById("playoffMatchDialog").close();
const data = t.data();
t.close();
const reload = ui("new", 39179, data);
reload.w.__challenger.enter();
reload.w.__challenger.open(id);
assert(C.validChallenger(reload.w.__challenger.selected().snapshot));
assert(reload.w.__challenger.selected().snapshot.roster.includes("POR"));
reload.close();
const stale = ui("new", 39180),
  old = stale.w.__challenger;
old.enter();
old.create();
old.model.token++;
old.start();
assert.equal(
  old.model.records.length,
  0,
  "Stale setup cannot create a season after account change",
);
stale.close();
console.log(
  "PASS Challenger setup/tree: custom choices, 32-team validation, cancel/unstarted edit, started lock, stale-account isolation, all 15 nodes/18 transitions, partial known-team previews, as-of old rounds, 16 qualified/16 eliminated, match dialogs, read-only history, preserved scroll and reload",
);
