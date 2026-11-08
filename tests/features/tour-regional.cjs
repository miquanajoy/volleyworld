const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const V = require("../../.test-build/engine.js");
const F = require("../../.test-build/full-engine.js");
const { ui } = require("../support/tour-harness.cjs");
const clone = (x) => JSON.parse(JSON.stringify(x));
const first = T.defaultRoster();
const defaults = T.defaultRegionalSelection(first, 1);
const choices = T.regionalTourChoices(first, 1);
assert.deepEqual(
  choices.map((x) => [x.region, x.count, x.q]),
  [
    ["CEV", 16, 7],
    ["AVC", 8, 4],
    ["CAVB", 8, 2],
    ["NORCECA", 8, 3],
  ],
);
assert(T.validRegionalSelection(first, 1, defaults));
assert(!T.validRegionalSelection(first, 1, [...defaults.slice(1), first[0]]));
assert.throws(() => T.freshCareerTour(1, first, defaults.slice(1)));
let combinations = 0;
for (let a = 0; a <= 16; a++)
  for (let b = 0; b <= 16; b++)
    for (let c = 0; c <= 16; c++)
      for (let d = 0; d <= 13; d++) {
        const e = 32 - a - b - c - d;
        if (e < 0 || e > 6) continue;
        const roster = [a, b, c, d, e].flatMap((n, i) =>
          V.regionTeams(F.regionOrder[i])
            .slice(0, n)
            .map((t) => t.id),
        );
        const number = (combinations % 19) + 1;
        assert(
          T.validRegionalSelection(
            roster,
            number,
            T.defaultRegionalSelection(roster, number),
          ),
          JSON.stringify([a, b, c, d, e]),
        );
        combinations++;
      }
let state = T.freshCareerTour(1, first, defaults);
assert.equal(
  Object.values(state.worldcup.regions).reduce(
    (n, r) => n + r.rounds.flat().length,
    0,
  ),
  140,
);
for (let season = 1; season <= 24; season++) {
  assert(T.validTour(state));
  assert.equal(T.calendar(state).length, 10);
  for (let stage = 0; stage < 10; stage++) {
    assert.equal(state.stage, stage);
    if (stage === 1 || stage === 3 || stage === 6) {
      const r = T.regionalTourKeys.find(
        (r) => T.regionalBatch(state, r).length,
      );
      if (r) {
        const before = clone(state.worldcup.regions),
          own = T.regionalBatch(state, r).map((m) => m.id);
        T.simulateRegion(state, r);
        assert(
          own.every((id) => T.matches(state).find((m) => m.id === id).sets),
        );
        for (const other of T.regionalTourKeys.filter((x) => x !== r))
          assert.deepEqual(state.worldcup.regions[other], before[other]);
        assert(T.validTour(state));
      }
    }
    T.finishStage(state);
    assert(T.validTour(state), `Season ${season} stage ${stage}`);
    if (stage === 1)
      for (const r of T.regionalTourKeys) {
        const g = state.worldcup.regions[r];
        assert(
          g.rounds
            .slice(T.regionalTourSplit(g))
            .flat()
            .every((m) => !m.sets),
        );
      }
    if (stage === 6) {
      const qualified = T.regionalTourKeys.flatMap(
        (r) => T.regionalTourStatus(state.worldcup, r).entrants,
      );
      assert.equal(new Set(qualified).size, 16);
      assert(qualified.every((id) => !state.roster.includes(id)));
      for (const r of T.regionalTourKeys) {
        const result = T.regionalTourStatus(state.worldcup, r);
        assert.equal(
          result.entrants.length,
          T.regionalTourQuota(state.worldcup, r),
        );
        assert(result.early.every((id) => result.entrants.includes(id)));
        const bad = clone(state);
        const m =
          bad.worldcup.career.regionalTour.brackets[r]?.rounds.flat()[0];
        if (m) {
          m.b = m.a;
          assert(!T.validTour(bad), "reject forged bracket routes");
        }
      }
    }
    T.nextStage(state);
  }
  assert.equal(T.played(state), T.seasonTotal(state));
  const status = T.careerStatus(state);
  assert.equal(status.tickets, 32);
  assert.equal(status.promoted.length, status.relegated.length);
  for (const r of F.regionOrder)
    assert(
      status.qualified.filter((id) => V.get(id).region === r).length <= 16,
    );
  const selected = T.defaultRegionalSelection(status.qualified, season + 1);
  const next = T.nextCareerSeason(state, selected);
  assert.deepEqual([...next.roster].sort(), [...status.qualified].sort());
  state = next;
}

const t = ui("career", 65745),
  api = t.w.__tour,
  d = t.w.document;
const click = (sel) => {
  const el = d.querySelector(sel);
  assert(el && !el.disabled, sel);
  el.click();
};
api.enter();
api.create();
click('[data-action="Tour.start"]');
assert(d.querySelector("[data-regional-setup]"));
assert.equal(api.model.records.length, 0, "confirmation is mandatory");
const id = api.model.setup.regionalIds[0];
api.toggleTeam(id);
assert(d.querySelector('[data-action="Tour.start"]').disabled);
api.toggleTeam(id);
click('[data-action="Tour.start"]');
// Keep this suite on the saved split-phase format; new points format has its own suite.
const legacyUI = T.freshCareerTour(1, first, defaults);
api.model.records[0] = api.recordOf(legacyUI);
api.model.selected = legacyUI.seasonId;
api.section("journey");
assert.equal(d.querySelectorAll(".tour-journey-card").length, 10);
for (let stage = 0; stage < 10; stage++) {
  api.resume();
  assert.equal(api.selected().snapshot.stage, stage);
  if (stage === 6) {
    api.region("AVC");
    const snapshot = api.selected().snapshot;
    const opening =
      snapshot.worldcup.career.regionalTour.brackets.AVC.rounds[0][0];
    api.simMatch(opening.id);
    const updated = api.selected().snapshot;
    const scored = T.matches(updated).find((m) => m.id === opening.id);
    const loser = V.loser(scored);
    const before = JSON.stringify(updated);
    const pending = d.querySelector('[data-regional-slot="AVCDL1-0"]');
    assert(
      pending.textContent.includes(V.get(loser).name),
      "Known loser appears in lower bracket immediately",
    );
    assert(
      pending.textContent.includes("Thua U1-2"),
      "Unresolved opponent stays pending",
    );
    assert(
      !pending.querySelector('[data-action="Tour.match"]'),
      "Preview is not a playable fixture",
    );
    assert.equal(
      updated.worldcup.career.regionalTour.brackets.AVC.rounds.length,
      1,
    );
    api.section("playoff");
    assert.equal(
      JSON.stringify(api.selected().snapshot),
      before,
      "Rendering does not change saved matches",
    );
    assert(
      d.querySelector('[data-regional-double] [aria-label="Nhánh thắng"]'),
    );
    assert(d.querySelector('[data-regional-double] [aria-label="Nhánh thua"]'));
    click('[data-regional-double] [data-action="Tour.match"]');
    assert(
      d.querySelector("dialog[open]"),
      "regional bracket opens match detail",
    );
    for (const modal of d.querySelectorAll("dialog[open]")) modal.close();
  }
  if ([1, 3, 6].includes(stage)) {
    for (const r of T.regionalTourKeys) {
      api.region(r);
      api.finishStage();
      if (stage === 6) {
        const frozen = JSON.stringify(api.selected().snapshot);
        api.section("playoff");
        const cancelled = [
          ...d.querySelectorAll(".bracket-match.is-cancelled"),
        ];
        assert(cancelled.length > 0);
        for (const slot of cancelled) {
          assert(slot.textContent.includes("Cặp đấu không diễn ra"));
          assert.deepEqual(
            [...slot.querySelectorAll(".bracket-set-score")].map(
              (x) => x.textContent,
            ),
            ["X", "X"],
          );
          assert(!slot.hasAttribute("data-action"));
        }
        const knownClosed = cancelled.find(
          (slot) => slot.querySelectorAll(".team").length === 2,
        );
        assert(
          knownClosed,
          "Known participants remain visible in an unused pair",
        );
        assert.equal(JSON.stringify(api.selected().snapshot), frozen);
        assert(
          d.querySelector(".bracket-match.is-finished"),
          "Played matches retain their actual results",
        );
      }
    }
  } else api.finishStage();
  api.next();
}
assert.equal(api.selected().status, "completed");
api.nextSeason(api.selected().season_id);
assert(d.querySelector("[data-regional-setup]"));
assert.equal(api.model.records.length, 1);
click('[data-action="Tour.start"]');
assert.equal(api.model.records.length, 2);
assert(T.validTour(api.selected().snapshot));
t.close();
console.log(
  `PASS regional Tour: ${combinations} roster allocations, 24 chained seasons, gates, separate region batches, two branches, required selections, retained promotion and invalid routes`,
);
