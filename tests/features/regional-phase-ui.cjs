const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const V = require("../../.test-build/engine.js");
const { ui } = require("../support/tour-harness.cjs");
let rng = 450923;
Math.random = () =>
  (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
for (const phase of [0, 1]) {
  const s = T.freshPointsTour(
    1,
    T.defaultRoster(),
    T.defaultRegionalSelection(T.defaultRoster(), 1, true),
  );
  const target = phase ? 3 : 1;
  while (s.stage < target) {
    T.finishStage(s);
    T.nextStage(s);
  }
  const g = T.pointsRegionPhase(s.worldcup, "CEV", phase);
  while (g.rounds.flat().some((m) => !m.sets)) T.simulateRegion(s, "CEV");
  assert(g.playoff);
  const screen = ui("career", 450924 + phase),
    api = screen.w.__tour,
    d = screen.w.document;
  api.enter();
  const rec = api.recordOf(s);
  api.model.records = [rec];
  api.model.selected = rec.season_id;
  api.resume();
  api.region("CEV");
  api.section("playoff");
  const before = JSON.stringify(api.selected().snapshot);
  assert(d.querySelector("[data-phase-playoff] .qualification-tree"));
  assert.equal(
    d.querySelectorAll("[data-phase-playoff] [data-qualification-match]")
      .length,
    7,
  );
  assert.equal(
    d.querySelectorAll('[data-phase-playoff] button[data-action="Tour.match"]')
      .length,
    4,
  );
  assert(
    d.querySelector(
      "[data-phase-playoff] .qualification-node.has-outgoing.joins-next",
    ),
  );
  assert(
    d
      .querySelector("[data-phase-playoff] .qualification-bronze")
      .textContent.includes("Thua S1"),
  );
  assert.equal(
    JSON.stringify(api.selected().snapshot),
    before,
    "render never materializes or mutates future matches",
  );
  const opening = T.regionalBatch(api.selected().snapshot, "CEV")[0];
  api.simMatch(opening.id);
  const scored = T.pointsRegionPhase(
    api.selected().snapshot.worldcup,
    "CEV",
    phase,
  ).playoff.rounds[0][0];
  const future = d.querySelector(
    `[data-qualification-match="CEVP${phase + 1}K1-0"]`,
  );
  assert(
    future.textContent.includes(V.get(V.winner(scored)).name),
    "known winner projects into next round",
  );
  assert(!future.hasAttribute("data-action"), "projection remains read-only");
  const prefix = `CEVP${phase + 1}`;
  api.qualifierStage(prefix);
  let live = T.pointsRegionPhase(
    api.selected().snapshot.worldcup,
    "CEV",
    phase,
  );
  assert(live.playoff.rounds[0].every((m) => m.sets));
  api.qualifierStage(prefix);
  live = T.pointsRegionPhase(api.selected().snapshot.worldcup, "CEV", phase);
  assert(live.playoff.rounds[1].every((m) => m.sets));
  assert(live.decider && !live.decider.sets);
  assert(d.querySelector('.qualification-bronze [data-action="Tour.match"]'));
  api.qualifierStage(prefix);
  live = T.pointsRegionPhase(api.selected().snapshot.worldcup, "CEV", phase);
  assert(live.decider.sets, "round action plays bronze before final");
  assert(!live.playoff.rounds.at(-1)[0].sets);
  api.qualifierStage(prefix);
  assert(
    T.pointsPhaseDone(
      T.pointsRegionPhase(api.selected().snapshot.worldcup, "CEV", phase),
    ),
  );
  assert(T.validTour(api.selected().snapshot));
  assert(
    d
      .querySelector(".qualification-winner")
      .textContent.includes(`VÔ ĐỊCH PHASE ${phase + 1}`),
  );
  assert(
    !d.querySelector("[data-phase-playoff]").textContent.includes("GIÀNH VÉ"),
  );
  api.section("table");
  assert(d.querySelector(".tour-phase-groups"));
  assert.equal(
    d.querySelectorAll(".tour-phase-groups [data-points-group]").length,
    4,
  );
  screen.close();
}
console.log(
  "PASS regional phase UI: shared connected tree in phases1/2; fixed seven slots plus bronze; winner projection without future edits; round controls; bronze-first scoring; phase title without automatic tickets; scoped group layout",
);
