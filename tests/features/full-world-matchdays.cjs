const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const result = [
  [25, 20],
  [25, 20],
  [25, 20],
];
function fixture(format = "groups", outOfOrder = false) {
  const s = F.freshFullSeason(1, format);
  F.finishFullSeason(s);
  s.world.bracket = null;
  for (const g of s.world.groups)
    for (const m of g.rounds.flat()) {
      m.sets = null;
      delete m.resultOrder;
    }
  if (outOfOrder) F.simulateLeague(s.world.groups[0]);
  F.stampFull(s);
  assert(F.validFullSeason(s));
  return {
    season_id: s.seasonId,
    season_number: 1,
    created_at: s.createdAt,
    status: "active",
    played: F.fullMatches(s).filter((m) => m.sets).length,
    podium: [],
    revision: 0,
    snapshot: s,
    dirty: true,
  };
}
for (const format of ["groups", "legacy"]) {
  const row = fixture(format),
    s = row.snapshot;
  assert.equal(F.worldCurrentRound(s.world), 0);
  assert.equal(F.worldRoundMatches(s.world, 0).length, 12);
  assert(F.fullMatchLocked(s, s.world.groups[0].rounds[1][0]));
  assert.throws(() =>
    F.recordFullScore(s, s.world.groups[0].rounds[1][0].id, result),
  );
  const t = ui("new", 619, { "volleyworld-full-guest": JSON.stringify([row]) }),
    d = t.w.document;
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  const snapshot = () =>
    JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest"))[0].snapshot;
  const changeRound = (r) => {
    const select = d.querySelector('[data-action="Full.round"]');
    select.value = String(r);
    select.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  };
  click('[data-action="Full.enter"]');
  click('[data-action="Full.open"]');
  click('[data-action="Full.section"][data-arg="world"]');
  assert.equal(
    d.querySelectorAll(".full-world-round-fixtures .full-match").length,
    12,
  );
  assert.equal(d.querySelectorAll(".full-group-nav button").length, 7);
  assert(
    d.querySelector('[data-action="Full.round"] option[value="1"]').disabled,
  );
  t.w.__full.nextFullRound();
  assert.equal(t.w.__full.fullModel.round, 0);
  click('.full-group-nav [data-arg="WG0"]');
  assert.equal(d.querySelectorAll(".full-match").length, 2);
  for (let i = 0; i < 2; i++)
    click('.full-match [data-action="Full.simMatch"]');
  const already = JSON.stringify(snapshot().world.groups[0].rounds[0]);
  assert(d.querySelector('[data-action="Full.simRound"]'));
  assert(!d.querySelector('[data-action="Full.next"]'));
  t.w.__full.nextFullRound();
  t.w.__full.setFullRound("1");
  assert.equal(t.w.__full.fullModel.round, 0);
  click('[data-action="Full.simRound"]');
  let saved = snapshot();
  assert.equal(JSON.stringify(saved.world.groups[0].rounds[0]), already);
  for (const g of saved.world.groups) {
    assert(g.rounds[0].every((m) => m.sets));
    assert(
      g.rounds
        .slice(1)
        .flat()
        .every((m) => !m.sets),
    );
  }
  assert.equal(
    saved.world.groups.flatMap(F.leagueMatches).filter((m) => m.sets).length,
    12,
  );
  assert(d.querySelector('[data-action="Full.next"]'));
  click('[data-action="Full.next"]');
  assert.equal(t.w.__full.fullModel.round, 1);
  const beforeNav = t.w.localStorage.getItem("volleyworld-full-guest");
  click('.full-group-nav [data-arg="WG5"]');
  assert.equal(t.w.__full.fullModel.round, 1);
  click('.full-group-nav [data-arg="world"]');
  assert.equal(t.w.__full.fullModel.round, 1);
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), beforeNav);
  click('[data-action="Full.simRound"]');
  changeRound(0);
  assert.equal(t.w.__full.fullModel.round, 0);
  assert(
    [...d.querySelectorAll(".full-world-matchday .full-group-team > b")].every(
      (x) => x.textContent === "1W · 0L" || x.textContent === "0W · 1L",
    ),
  );
  click('.full-group-nav [data-arg="WG2"]');
  assert.equal(t.w.__full.fullModel.round, 0);
  assert(
    [...d.querySelectorAll(".full-standings tbody tr")].every(
      (x) => x.cells[2].textContent === "1",
    ),
  );
  changeRound(1);
  click('[data-action="Full.next"]');
  assert.equal(t.w.__full.fullModel.round, 2);
  click('.full-group-nav [data-arg="world"]');
  click('[data-action="Full.simRound"]');
  saved = snapshot();
  assert(saved.world.groups.every(F.fullLeagueDone));
  assert(F.validFullSeason(saved));
  click('.full-world-round-controls [data-action="Full.drawPlayoff"]');
  assert.equal(t.w.__full.fullModel.section, "playoff");
  assert(d.querySelector(".full-playoff-tree"));
  click('[data-action="Full.section"][data-arg="world"]');
  assert(!d.querySelector('[data-action="Full.simRound"]'));
  assert(!d.querySelector('[data-action="Full.edit"]'));
  const storage = t.data();
  t.close();
  const reload = ui("new", 620, storage);
  reload.w.document.querySelector('[data-action="Full.enter"]').click();
  reload.w.document.querySelector('[data-action="Full.open"]').click();
  reload.w.document
    .querySelector('[data-action="Full.section"][data-arg="world"]')
    .click();
  assert.equal(reload.w.__full.fullModel.round, 2);
  assert.equal(
    reload.w.document.querySelectorAll(".full-world-round-fixtures .full-match")
      .length,
    12,
  );
  reload.close();
}
// Existing unequal progress is not erased or replayed, and future results are
// masked in historical standings until the shared matchday is reached.
const legacy = fixture("legacy", true),
  original = JSON.stringify(legacy.snapshot.world.groups[0]),
  t = ui("new", 713, { "volleyworld-full-guest": JSON.stringify([legacy]) }),
  d = t.w.document;
for (const q of [
  '[data-action="Full.enter"]',
  '[data-action="Full.open"]',
  '[data-action="Full.section"][data-arg="world"]',
])
  d.querySelector(q).click();
assert.equal(t.w.__full.fullModel.round, 0);
assert(
  [
    ...d.querySelectorAll(
      ".full-world-matchday .full-group:first-child .full-group-team > b",
    ),
  ].every((x) => x.textContent === "1W · 0L" || x.textContent === "0W · 1L"),
);
d.querySelector('[data-action="Full.simRound"]').click();
const saved = JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest"))[0]
  .snapshot;
assert.equal(JSON.stringify(saved.world.groups[0]), original);
assert.equal(F.worldCurrentRound(saved.world), 1);
assert(F.validFullSeason(saved));
t.close();
console.log(
  "PASS world matchdays: 12 games across all six groups before next round, shared A–F navigation, future-entry lock, historical standings, preserved unequal legacy scores, 36-game completion/playoff gate, read-only phase and reload",
);
