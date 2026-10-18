const assert = require("node:assert/strict"),
  N = require("../../.test-build/nations-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const tick = () => new Promise((r) => setTimeout(r, 10));
(async () => {
  const t = ui("new", 479),
    n = t.w.__nations,
    d = t.w.document,
    classic = t.run("JSON.stringify(state)");
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  click('[data-action="Nations.enter"]');
  click('[data-action="Nations.create"]');
  const first = n.selected();
  n.finishNations();
  const old = JSON.stringify(first.snapshot);
  assert(
    d
      .querySelector('footer [data-action="Seasons.requestNew"]')
      .textContent.includes("lên/xuống hạng"),
  );
  click('footer [data-action="Seasons.requestNew"]');
  await tick();
  const second = n.selected();
  assert.equal(second.cycle_number, 2);
  assert.equal(second.campaign_id, first.campaign_id);
  assert.equal(second.previous_id, first.season_id);
  assert(N.validNationsTransition(first.snapshot, second.snapshot));
  assert.equal(JSON.stringify(first.snapshot), old);
  const transfers = N.nationsTransfers(first.snapshot, second.snapshot);
  assert.equal(transfers.length, 24);
  assert.equal(transfers.filter((t) => t.promoted).length, 12);
  assert.equal(transfers.filter((t) => !t.promoted).length, 12);
  const displayed = [...d.querySelectorAll("[data-transfer-team]")];
  assert.equal(displayed.length, 24);
  for (const row of displayed) {
    const id = row.dataset.transferTeam,
      from = row.dataset.from,
      to = row.dataset.to;
    assert(first.snapshot.divisions[from].teamIds.includes(id));
    assert(second.snapshot.divisions[to].teamIds.includes(id));
    assert.notEqual(from, to);
  }
  for (const tier of N.tiers)
    assert.equal(second.snapshot.divisions[tier].teamIds.length, 16);
  // An active season's footer now opens management, never a new independent root.
  click('footer [data-action="Seasons.requestNew"]');
  await tick();
  assert.equal(n.nationsModel.records.length, 2);
  assert.equal(n.selected(), undefined);
  assert.equal(
    d.querySelector('[data-action="Nations.continue"]').textContent,
    "Tiếp tục mùa 2 →",
  );
  click('[data-action="Nations.continue"]');
  await tick();
  assert.equal(n.selected(), second);
  assert.equal(n.nationsModel.records.length, 2);
  n.finishNations();
  n.enterNations();
  assert(
    d
      .querySelector('[data-action="Nations.continue"]')
      .textContent.includes("Tạo mùa 3"),
  );
  click('[data-action="Nations.continue"]');
  await tick();
  const third = n.selected();
  assert.equal(third.cycle_number, 3);
  assert.equal(third.campaign_id, first.campaign_id);
  assert(N.validNationsTransition(second.snapshot, third.snapshot));
  // Reopening an old completed season opens its existing successor without duplicating it.
  n.openNations(first.season_id);
  click('footer [data-action="Seasons.requestNew"]');
  await tick();
  assert.equal(n.selected(), second);
  assert.equal(n.nationsModel.records.length, 3);
  // Independent chains remain available and explicitly start again at cycle 1.
  n.enterNations();
  assert(
    d
      .querySelector('[data-action="Nations.create"]')
      .textContent.includes("độc lập"),
  );
  click('[data-action="Nations.create"]');
  const independent = n.selected();
  assert.equal(independent.cycle_number, 1);
  assert.notEqual(independent.campaign_id, first.campaign_id);
  assert(d.querySelector(".nations-cycle-note").textContent.includes("Mùa 1"));
  assert.throws(() => N.nationsTransfers(first.snapshot, independent.snapshot));
  // Metadata-only parent history has a distinct, non-mutating load affordance.
  n.openNations(third.season_id);
  const parentState = second.snapshot;
  second.snapshot = undefined;
  t.w.render();
  assert(d.querySelector('[data-action="Nations.transfers"]'));
  assert.equal(d.querySelectorAll("[data-transfer-team]").length, 0);
  second.snapshot = parentState;
  assert.equal(t.run("JSON.stringify(state)"), classic);
  n.enterNations();
  click('[data-action="navigate"][data-arg="home"]');
  assert.equal(
    d.querySelector('footer [data-action="Seasons.requestNew"]').textContent,
    "Mùa giải mới",
  );
  t.close();
  console.log(
    "PASS Nations League continuation: footer and campaign actions inherit promotion/relegation, 24 actual division changes (12 up/12 down), immutable prior season, active-season management, idempotent successor, explicit independent roots and parent-history affordance",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
