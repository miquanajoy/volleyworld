const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  Q = require("../../.test-build/qualification.js"),
  R = require("../../.test-build/career-ranking.js"),
  { ui } = require("../support/parity-harness.cjs");
const make = () => Object.assign(V.fresh(), { playoffEntry: "top16" });
for (let season = 0; season < 30; season++) {
  const s = make();
  s.rounds.flat().forEach(V.simulate);
  V.stampResults(s);
  const ranks = V.standings(s).map((t) => t.id);
  V.startPlayin(s);
  assert.deepEqual(
    s.playin.map((m) => [ranks.indexOf(m.a) + 1, ranks.indexOf(m.b) + 1]),
    [
      [17, 24],
      [18, 23],
      [19, 22],
      [20, 21],
    ],
  );
  assert(V.validState(s));
  assert.throws(() => V.draw(s));
  // Alternate favourites/upsets: paths must depend on P1–P4, not on reranked winners.
  s.playin.forEach(
    (m, i) =>
      (m.sets =
        season % 2
          ? [
              [20, 25],
              [20, 25],
              [20, 25],
            ]
          : [
              [25, 20],
              [25, 20],
              [25, 20],
            ]),
  );
  V.draw(s);
  assert(V.validState(s));
  assert.deepEqual(
    s.bracket.r20.map((m) => m.a),
    ranks.slice(12, 16),
  );
  assert.deepEqual(
    s.bracket.r20.map((m) => m.b),
    s.playin.map(V.winner).reverse(),
  );
  assert.equal(s.bracket.r16.length, 0);
  assert.equal(Object.keys(s.bracket.seeds).length, 0);
  assert.throws(() => V.draw(s));
  const wrong = structuredClone(s);
  wrong.bracket.r20[0].b = wrong.bracket.r20[1].b;
  assert(!V.validState(wrong));
  V.simulate(s.bracket.r20[0]);
  V.advance(s);
  assert(V.validState(s));
  const partial = JSON.parse(JSON.stringify(s));
  V.finishAll(partial);
  assert(V.complete(partial));
  assert(V.validState(partial));
  s.bracket.r20.filter((m) => !m.sets).forEach(V.simulate);
  V.draw(s);
  assert(V.validState(s));
  assert.throws(() => V.draw(s), "redrawing must not erase results");
  assert.equal(new Set(s.bracket.r16.flatMap((m) => [m.a, m.b])).size, 16);
  assert(s.bracket.r20.every((m) => V.playoffLocked(s, m)));
  for (let i = 0; i < 4; i++) {
    const seeds = s.bracket.r16
      .slice(i * 2, i * 2 + 2)
      .flatMap((m) => [s.bracket.seeds[m.a], s.bracket.seeds[m.b]])
      .sort();
    assert.deepEqual(seeds, [1, 2, 3, 4]);
  }
  assert.deepEqual(
    s.bracket.r20.map(V.winner).sort(),
    Object.keys(s.bracket.seeds)
      .filter((id) => s.bracket.seeds[id] === 4)
      .sort(),
  );
  V.finishAll(s);
  assert(V.validState(s));
  assert.equal(V.totalMatches(s), 520);
  assert.equal(V.matches(s).length, 520);
  assert(s.bracket.bronze[0].resultOrder < s.bracket.final[0].resultOrder);
  const places = V.finalPlacements(s);
  assert.equal(Object.keys(places).length, 32);
  for (const id of V.ids(s))
    assert.deepEqual(places[id], V.finalPlacement(s, id));
  for (const m of s.playin)
    assert.deepEqual(places[V.loser(m)], { from: 21, to: 24 });
  for (const m of s.bracket.r20)
    assert.deepEqual(places[V.loser(m)], { from: 17, to: 20 });
  for (const id of ranks.slice(24))
    assert.equal(places[id].from, ranks.indexOf(id) + 1);
  const row = {
    season_id: s.seasonId,
    season_number: 1,
    status: "completed",
    created_at: s.seasonCreatedAt,
    podium: V.podium(s),
    snapshot: s,
  };
  const career = R.careerRanking([row]);
  assert.equal(career.entries.length, 24);
  assert.equal(
    career.entries.reduce((n, t) => n + t.points, 0),
    4210,
  );
  assert.equal(R.seasonPoints(row, V.loser(s.playin[0])), 10);
  assert.equal(R.seasonPoints(row, ranks[24]), 0);
  if (season === 0) {
    const q = Q.report(s);
    assert.equal(Object.values(q.teams).filter((t) => t.direct).length, 16);
    assert.equal(Object.values(q.teams).filter((t) => t.playin).length, 8);
    assert.equal(Object.values(q.teams).filter((t) => t.out).length, 8);
    assert.equal(Object.values(q.teams).filter((t) => t.bye).length, 12);
    const legacy = structuredClone(s);
    delete legacy.playoffEntry;
    assert(!V.validState(legacy));
    legacy.playin = null;
    legacy.bracket = null;
    const oldReport = Q.report(legacy);
    assert.equal(
      Object.values(oldReport.teams).filter((t) => t.direct).length,
      12,
    );
    assert.equal(
      Object.values(Q.report(s).teams).filter((t) => t.direct).length,
      16,
      "qualification cache is isolated by rule version",
    );
  }
}
// Fresh schema remains usable for old snapshots and double elimination remains untouched.
for (const format of ["single", "double"]) {
  const old = V.fresh(undefined, format);
  V.finishAll(old);
  assert(V.validState(old));
  assert.equal(V.entrySlots(old).direct, 12);
  assert.equal(V.entrySlots(old).advance, 20);
  assert(!old.bracket.r20);
}
(async () => {
  const t = ui("new", 345),
    d = t.w.document;
  t.w.document.getElementById("heroAction").click();
  for (const action of ["next", "review", "apply"])
    d.querySelector(`[data-action="Settings.${action}"]`).click();
  assert.equal(t.run("state.playoffEntry"), "top16");
  t.run(
    "state.rounds.flat().forEach(V.simulate);V.stampResults(state);save();navigate('table')",
  );
  assert.equal(d.querySelectorAll("#rows tr.direct").length, 16);
  assert.equal(d.querySelectorAll("#rows tr.in").length, 8);
  assert.equal(d.querySelectorAll("#rows tr.out").length, 8);
  t.run("navigate('playoff')");
  d.querySelector('[data-action="startPlayin"]').click();
  d.querySelector('[data-action="simPlayin"]').click();
  assert(
    d
      .querySelector('[data-action="drawBracket"]')
      .textContent.includes("Tạo vòng 20"),
  );
  d.querySelector('[data-action="drawBracket"]').click();
  assert.equal(
    d.querySelectorAll('.round20-section [data-action="openPlayoffMatch"]')
      .length,
    4,
  );
  assert.equal(d.querySelectorAll(".round20-byes .team").length, 12);
  assert.equal(d.querySelector('[data-action="simStage"]').dataset.arg, "r20");
  // Manual entry uses the shared editor and keeps later drawing pending.
  const first = t.run("state.bracket.r20[0].id");
  t.w.playoffEditMatch(first);
  for (let i = 0; i < 3; i++) {
    d.getElementById(`a${i}`).value = "25";
    d.getElementById(`b${i}`).value = "20";
  }
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(t.run("!!state.bracket.r20[0].sets"));
  assert.equal(t.run("state.bracket.r16.length"), 0);
  const saved = t.data();
  const reload = ui("new", 4, saved);
  reload.run("navigate('playoff')");
  assert(reload.w.document.querySelector(".round20-section"));
  reload.close();
  d.querySelector('[data-action="simStage"]').click();
  assert.equal(t.run("state.bracket.r16.length"), 0);
  d.querySelector('[data-action="drawBracket"]').click();
  assert.equal(t.run("state.bracket.r16.length"), 8);
  assert(!d.querySelector(".round20-section").open);
  for (const key of ["r16", "qf", "sf", "bronze", "final"]) t.w.simStage(key);
  const id = t.run("state.seasonId");
  await t.w.Seasons.view(id);
  assert.equal(d.querySelectorAll("[data-summary-team]").length, 24);
  assert.equal(d.querySelectorAll(".medal-card").length, 3);
  const labels = [...d.querySelectorAll("[data-summary-team]")].map(
    (r) => r.cells[2].textContent,
  );
  assert.equal(labels.filter((x) => x === "Play-in").length, 4);
  assert.equal(labels.filter((x) => x === "Vòng 20 đội").length, 4);
  const bundle = await t.w.Seasons.exportAll();
  const before = JSON.stringify(bundle);
  t.w.bundle = JSON.parse(before);
  t.run("Seasons.importAll(bundle)");
  assert.equal(JSON.stringify(bundle), before);
  t.close();
  console.log(
    "PASS expanded single: 30 full 520-match seasons, fixed 17–24 Play-in and round-20 routes, four seeds per branch, locked predecessors, invalid imports, 24 finishes/points, automatic/manual UI, reload/archive/export, legacy single/double compatibility",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
