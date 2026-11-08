const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const V = require("../../.test-build/engine.js");
const { ui } = require("../support/tour-harness.cjs");
const clone = (x) => JSON.parse(JSON.stringify(x));
let rng = 428151;
Math.random = () =>
  (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
const base = T.freshPointsTour(
  1,
  T.defaultRoster(),
  T.defaultRegionalSelection(T.defaultRoster(), 1, true),
);
while (base.stage < 6) {
  T.finishStage(base);
  T.nextStage(base);
}
for (const region of ["CEV", "AVC"])
  for (const reset of [false, true]) {
    const s = clone(base),
      n = s.worldcup.regions[region].teamIds.length;
    const screen = ui("career", 428152 + (reset ? 1 : 0)),
      api = screen.w.__tour,
      d = screen.w.document;
    api.enter();
    const rec = api.recordOf(s);
    api.model.records = [rec];
    api.model.selected = rec.season_id;
    api.resume();
    api.region(region);
    api.section("playoff");
    const before = JSON.stringify(api.selected().snapshot);
    const root = d.querySelector(
      "[data-regional-double].points-regional-double",
    );
    assert(root);
    const upper = root.querySelector('[aria-label="Nhánh thắng"]'),
      lower = root.querySelector('[aria-label="Nhánh thua"]'),
      grand = root.querySelector('[aria-label="Chung kết"]');
    assert(upper && lower && grand);
    assert(
      upper.querySelector('.playoff-tree-scroll[role="region"][tabindex="0"]'),
    );
    assert(
      lower.querySelector('.double-lower-scroll[role="region"][tabindex="0"]'),
    );
    assert(upper.querySelector(".tree-node.has-next.join-upper"));
    assert(lower.querySelector(".lower-tree-node.has-prev > div"));
    assert(lower.querySelector(".lower-tree-node.has-next.join-upper"));
    assert(
      lower.querySelector(".double-route").textContent.includes("Thua U1-1"),
    );
    assert.equal(
      upper.querySelectorAll("[data-regional-round]").length,
      Math.log2(n),
    );
    assert.equal(upper.querySelectorAll("[data-regional-slot]").length, n - 1);
    assert(
      upper
        .querySelector(".regional-double-nodes")
        .style.gridTemplateRows.includes("106px"),
      "upper uses compact inherited spacing",
    );
    assert.equal(grand.querySelectorAll("[data-regional-slot]").length, 2);
    assert(
      upper
        .querySelector(".tree-scroll-hint")
        .textContent.includes("Cuộn ngang"),
    );
    assert(
      !upper
        .querySelector(".bracket-match-head")
        .textContent.includes(region + "D"),
      "short human-readable match codes",
    );
    assert.equal(
      JSON.stringify(api.selected().snapshot),
      before,
      "render does not create or modify results",
    );
    const m = T.regionalBatch(api.selected().snapshot, region)[0];
    api.simMatch(m.id);
    const played = T.matches(api.selected().snapshot).find(
      (x) => x.id === m.id,
    );
    const pending = d.querySelector(`[data-regional-slot="${region}DL1-0"]`);
    assert(pending.textContent.includes(V.get(V.loser(played)).name));
    assert(pending.textContent.includes("Thua U1-2"));
    assert(
      !pending.querySelector("[data-action]"),
      "pending preview is not editable",
    );
    const fixture = d.querySelector(
      '[data-regional-double] [data-action="Tour.match"]',
    );
    fixture.click();
    assert(
      d.querySelector("dialog[open]"),
      "inherited match card still opens detail",
    );
    for (const dialog of d.querySelectorAll("dialog[open]")) dialog.close();
    // Resolve the entire selected region, with and without a required reset.
    const live = clone(api.selected().snapshot);
    while (!T.pointsRegionalPhaseDone(live.worldcup, region, 2)) {
      const ms = T.regionalBatch(live, region);
      assert(ms.length);
      for (const match of ms) {
        const win = reset && match.id === `${region}DF-0` ? match.b : match.a;
        T.recordScore(
          live,
          match.id,
          Array.from({ length: 3 }, () =>
            match.a === win ? [25, 20] : [20, 25],
          ),
        );
      }
    }
    assert(T.validTour(live));
    const b = live.worldcup.career.regionalTour.brackets[region];
    assert.equal(b.rounds.at(-1).length, reset ? 1 : 0);
    const finished = api.recordOf(live);
    api.model.records = [finished];
    api.model.selected = finished.season_id;
    api.resume();
    api.region(region);
    api.section("playoff");
    const resetSlot = d.querySelector(`[data-regional-slot="${region}DR-0"]`);
    assert(
      resetSlot.querySelector(
        reset ? ".bracket-match.is-finished" : ".bracket-match.is-cancelled",
      ),
    );
    assert.equal(
      d.querySelectorAll("[data-regional-double] button.bracket-match").length,
      T.pointsRegionalPhaseMatches(live.worldcup, region, 2).length,
    );
    assert.equal(
      d.querySelectorAll(
        '[data-regional-double] [data-action="Tour.qualifierStage"]',
      ).length,
      0,
    );
    assert.deepEqual(
      clone(
        api.selected().snapshot.worldcup.career.regionalTour.brackets[region],
      ),
      b,
    );
    screen.close();
  }
console.log(
  "PASS Phase3 connected UI: Europe16/Asia8; inherited upper/lower connectors; compact rows; route labels and live loser projection; accessible scroll regions; readable match codes; modal detail; no render mutations; full finals with required/skipped reset",
);
