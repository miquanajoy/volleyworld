const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const K = require("../../.test-build/career-engine.js");
const V = require("../../.test-build/engine.js");
const C = require("../../.test-build/challenger-engine.js");
const { ui } = require("../support/tour-harness.cjs");
const clone = (x) => JSON.parse(JSON.stringify(x));
let rng = 726349;
Math.random = () =>
  (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
const newSeason = (number = 1, roster = T.defaultRoster()) =>
  T.freshPointsTour(
    number,
    roster,
    T.defaultRegionalSelection(roster, number, true),
  );
const won = (ms, id) => ms.filter((m) => m.sets && V.winner(m) === id).length;
assert.deepEqual(
  [1, 2, 3, 4, 5, 8, 9, 16, 17].map(T.leaguePointBonus),
  [400, 300, 240, 200, 150, 150, 80, 80, 0],
);
assert.deepEqual(
  [1, 2, 3, 4, 5, 8, 9, 16, 17].map(T.challengerPointBonus),
  [300, 180, 120, 100, 60, 60, 25, 25, 0],
);
const manual = newSeason();
const score = [
  [25, 20],
  [25, 20],
  [25, 20],
];
assert.throws(() =>
  T.recordScore(
    manual,
    manual.worldcup.career.points.phase2.CEV.rounds[0][0].id,
    score,
  ),
);
T.finishStage(manual);
T.nextStage(manual);
const opening = T.regionalBatch(manual, "CEV")[0];
const untouched = JSON.stringify(manual.worldcup.career.points.phase2);
T.recordScore(manual, opening.id, score);
assert.equal(
  T.pointsRegionalRows(manual.worldcup, "CEV").find((x) => x.id === opening.a)
    .points,
  5,
);
assert.equal(JSON.stringify(manual.worldcup.career.points.phase2), untouched);
assert(T.validTour(manual));
assert.throws(() =>
  T.recordScore(manual, manual.worldcup.regions.CEV.rounds[1][0].id, score),
);

let snapshots = [],
  finals = [],
  resets = 0,
  noResets = 0,
  checkpoints = 0;
let s = newSeason();
for (let season = 0; season < 40; season++) {
  assert(T.validTour(s), "new inherited season");
  assert.equal(T.calendar(s).length, 10);
  const f = s.worldcup;
  for (const r of T.regionalTourKeys) {
    const a = T.pointsRegionPhase(f, r, 0),
      b = T.pointsRegionPhase(f, r, 1);
    assert.notEqual(a, b);
    assert(a.groups.every((g) => g.length <= 4));
    assert.equal(a.groups.length, Math.ceil(a.teamIds.length / 4));
    if (!season && r === "CEV")
      assert.deepEqual(
        a.groups.map((g) => g.length),
        [4, 4, 4, 4],
      );
    assert(b.rounds.flat().every((m) => !m.sets));
  }
  const certified = new Set(),
    regional = new Map(T.regionalTourKeys.map((r) => [r, new Set()]));
  const bounds = [];
  for (let stage = 0; stage < 10; stage++) {
    assert.equal(s.stage, stage);
    assert.throws(() => T.nextStage(s));
    while (!T.stageDone(s)) {
      T.simulateBatch(s);
      if (season < 3) assert(T.validTour(s), `valid mid stage ${stage}`);
    }
    assert(T.validTour(s), `valid stage ${stage}`);
    const main = T.seasonPointsRows(s);
    main.filter((x) => x.confirmed).forEach((x) => certified.add(x.id));
    for (const r of T.regionalTourKeys) {
      const rows = T.pointsRegionalRows(f, r);
      rows.filter((x) => x.confirmed).forEach((x) => regional.get(r).add(x.id));
      bounds.push({ r, rows: clone(rows) });
      for (const p of [0, 1]) {
        const g = T.pointsRegionPhase(f, r, p);
        if (g.playoff) {
          const top = g.groups.flatMap((_, i) => {
            const ids = g.groups[i];
            return V.standings({
              teamIds: ids,
              tie: g.tie.filter((x) => ids.includes(x)),
              rounds: g.rounds.map((row) =>
                row.filter((m) => ids.includes(m.a)),
              ),
            })
              .slice(0, 2)
              .map((t) => t.id);
          });
          assert.deepEqual([...g.playoff.seeds].sort(), top.sort());
          if (g.groups.length > 1)
            for (const m of g.playoff.rounds[0])
              assert.notEqual(
                g.groups.findIndex((g) => g.includes(m.a)),
                g.groups.findIndex((g) => g.includes(m.b)),
              );
        }
      }
    }
    bounds.push({ main: clone(main) });
    if (!season && [1, 3, 5, 6, 7, 8].includes(stage)) snapshots.push(clone(s));
    if (stage === 5) assert.equal(T.leagueTopFour(s).length, 4);
    if (stage === 6)
      for (const r of T.regionalTourKeys) {
        const b = f.career.regionalTour.brackets[r];
        if (!b) continue;
        const n = f.regions[r].teamIds.length;
        assert(T.completeRegionalDouble(b, n));
        assert.equal(
          b.rounds.length,
          K.regionalDoublePlan(T.pointsRegionalSeeds(f, r), r + "D").length,
        );
        if (b.rounds.at(-1).length) resets++;
        else noResets++;
        const places = T.pointsDoublePlaces(f, r);
        assert.equal(Object.keys(places).length, n);
        assert.equal(Object.values(places).filter((p) => p === 1).length, 1);
        const selected = T.pointsRegionalRows(f, r)
          .filter((x) => x.inQuota)
          .map((x) => x.id);
        for (const id of regional.get(r))
          assert(
            selected.includes(id),
            "early regional certification survives completion",
          );
      }
    if (stage === 7) {
      const direct = T.seasonPointsDirect(s);
      assert.equal(direct.length, 16);
      assert.deepEqual(direct.slice(0, 4), T.leagueTopFour(s));
      for (const id of certified)
        assert(
          direct.includes(id),
          "early main certification survives completion",
        );
      for (const x of main) {
        const lko = [
          ...s.league.playin,
          ...["r16", "qf", "sf", "bronze", "final"].flatMap(
            (k) => s.league.bracket[k],
          ),
        ];
        const cko = ["r16", "qf", "sf", "bronze", "final"].flatMap(
          (k) => s.challenger.bracket[k],
        );
        const sw = C.challengerStandings(s.challenger).find(
          (t) => t.id === x.id,
        );
        const lw = V.standings(s.league).find((t) => t.id === x.id).w;
        assert.equal(
          x.league,
          lw * 5 + won(lko, x.id) * 20 + T.leaguePointBonus(x.leaguePlace),
        );
        assert.equal(
          x.challenger,
          sw.w * 5 +
            won(cko, x.id) * 10 +
            T.challengerPointBonus(x.challengerPlace),
        );
        assert.equal(x.max, x.points);
      }
      const champ = C.challengerPodium(s.challenger)[0];
      assert(direct.includes(champ), "Challenger champion safely qualifies");
    }
    if (stage === 8) {
      assert.equal(f.career.playin.challenger.length, 0);
      assert.equal(f.career.playin.double.seeds.length, 32);
      assert.equal(T.careerStatus(s).qualified.length, 32);
      assert.equal(new Set(T.careerStatus(s).qualified).size, 32);
    }
    T.nextStage(s);
  }
  const finalMain = T.seasonPointsRows(s);
  for (const checkpoint of bounds) {
    const final = checkpoint.main
      ? finalMain
      : T.pointsRegionalRows(f, checkpoint.r);
    for (const row of checkpoint.main || checkpoint.rows) {
      assert(
        final.find((x) => x.id === row.id).points <= row.max,
        "conservative upper bound",
      );
      checkpoints++;
    }
  }
  assert.equal(T.played(s), T.seasonTotal(s));
  assert(T.validTour(clone(s)), "JSON save/reload");
  const status = T.careerStatus(s);
  assert.equal(status.promoted.length, status.relegated.length);
  for (const r of ["CEV", "AVC", "CAVB", "NORCECA", "CSV"])
    assert(
      status.qualified.filter((id) => V.get(id).region === r).length <= 16,
    );
  finals.push(clone(s));
  s = T.nextPointsSeason(
    s,
    T.defaultRegionalSelection(status.qualified, s.seasonNumber + 1, true),
  );
  assert(
    T.seasonPointsRows(s).every((x) => x.points === 0 && !x.confirmed),
    "points reset each season",
  );
}
assert(resets && noResets, "exercise required and skipped grand-final reset");
// Extreme inherited rosters cover inactive regions, singleton/small pools and uneven groups.
for (const counts of [
  [16, 16, 0, 0, 0],
  [13, 0, 0, 13, 6],
  [0, 16, 10, 0, 6],
  [16, 0, 3, 12, 1],
  [1, 0, 16, 13, 2],
]) {
  const rs = ["CEV", "AVC", "NORCECA", "CAVB", "CSV"].flatMap((r, i) =>
    V.regionTeams(r)
      .slice(0, counts[i])
      .map((t) => t.id),
  );
  const extreme = newSeason();
  extreme.seasonNumber = 2;
  extreme.career.previousSeasonId = "previous-season";
  extreme.roster = rs;
  extreme.league = V.fresh(rs, "single", true);
  extreme.league.setupConfirmed = true;
  extreme.league.seasonNumber = 2;
  extreme.worldcup = K.freshCareerQualification(rs, 2);
  K.setupPointsRegions(
    extreme.worldcup,
    T.defaultRegionalSelection(rs, 2, true),
  );
  assert(T.validTour(extreme));
  for (let stage = 0; stage < 10; stage++) {
    T.finishStage(extreme);
    assert(T.validTour(extreme), `extreme ${counts} stage ${stage}`);
    T.nextStage(extreme);
  }
  assert.equal(T.careerStatus(extreme).tickets, 32);
  assert.equal(T.played(extreme), T.seasonTotal(extreme));
}

// A phase cannot be scored before its turn; routes, group pairs, format version cannot be forged.
for (const mutate of [
  (s) => s.worldcup.career.points.version++,
  (s) =>
    (s.worldcup.career.points.phase2.CEV.rounds[0][0].sets = [
      [25, 20],
      [25, 20],
      [25, 20],
    ]),
  (s) =>
    s.worldcup.regions.CEV.groups[0].push(s.worldcup.regions.CEV.groups[1][0]),
  (s) => s.worldcup.regions.CEV.playoff.seeds.reverse(),
  (s) =>
    (s.worldcup.regions.CEV.rounds[0][0].b =
      s.worldcup.regions.CEV.rounds[0][0].a),
]) {
  const bad = clone(snapshots[0]);
  mutate(bad);
  assert(!T.validTour(bad));
}
const legacy = T.freshCareerTour(
  1,
  T.defaultRoster(),
  T.defaultRegionalSelection(T.defaultRoster(), 1),
);
assert(T.validTour(legacy));
assert(!T.seasonPointsFormat(legacy));
// Production UI shows the same certified teams on the points board and World Cup ticket page.
(async () => {
  const screen = ui("career", 98765),
    api = screen.w.__tour,
    d = screen.w.document;
  api.enter();
  api.create();
  api.start();
  api.start();
  assert(T.seasonPointsFormat(api.selected().snapshot));
  for (const snapshot of snapshots) {
    const rec = api.recordOf(snapshot);
    api.model.records = [rec];
    api.model.selected = rec.season_id;
    api.resume();
    api.section("points");
    assert(d.querySelector("[data-main-points]"));
    assert.equal(d.querySelectorAll("[data-region-points]").length, 4);
    const expected = T.seasonPointsRows(snapshot)
      .filter((x) => x.confirmed)
      .map((x) => x.id);
    const actual = [
      ...d.querySelectorAll("[data-main-points] tr[data-point-team]"),
    ]
      .filter((el) => el.querySelector('[data-point-status="qualified"]'))
      .map((el) => el.dataset.pointTeam);
    assert.deepEqual(actual.sort(), expected.sort());
    api.section("qualifiers");
    for (const id of expected)
      assert(d.querySelector(`[data-qualified-team="${id}"]`));
    api.persist();
    const restored = ui("career", 98766, screen.data());
    const loaded = restored.w.__tour.model.records.find(
      (r) => r.season_id === rec.season_id,
    );
    assert(loaded && T.validTour(loaded.snapshot));
    restored.close();
  }
  const historical = snapshots.find((s) => s.stage === 3);
  const historyRecord = api.recordOf(historical);
  api.model.records = [historyRecord];
  api.model.selected = historyRecord.season_id;
  api.resume();
  api.region("CEV");
  api.round("0");
  api.section("table");
  assert.equal(d.querySelectorAll("[data-points-group]").length, 4);
  for (const tr of d.querySelectorAll("[data-points-group] tbody tr"))
    assert.equal(
      Number(tr.children[2].textContent) + Number(tr.children[3].textContent),
      1,
      "historical group standings only show selected round",
    );
  const historicalTeam =
    historical.worldcup.career.points.phase2.CEV.teamIds[0];
  api.showTeam(historicalTeam);
  assert.equal(
    d.querySelectorAll("#teamLeagueRows .team-league-result").length,
    1,
    "team detail masks later results and playoff",
  );
  assert(
    d
      .querySelector("#teamLeagueRows")
      .textContent.includes("Phase 2 · Vòng bảng 1"),
  );
  for (const dialog of d.querySelectorAll("dialog[open]")) dialog.close();
  const prior = api.model.records.length;
  await api.importSeasons({
    size: 1000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-tour-seasons",
        version: 1,
        seasons: finals.slice(0, 2),
      }),
  });
  assert.equal(
    api.model.records.length,
    prior + 2,
    "new points seasons import as a separate valid chain",
  );
  const imported = api.model.records.slice(-2);
  assert(
    imported.every(
      (r) => T.validTour(r.snapshot) && T.seasonPointsFormat(r.snapshot),
    ),
  );
  assert.equal(
    imported[1].snapshot.career.previousSeasonId,
    imported[0].season_id,
  );
  assert.deepEqual(
    clone(T.seasonPointsRows(imported[0].snapshot)),
    T.seasonPointsRows(finals[0]),
  );
  screen.close();
  console.log(
    `PASS qualification points: 40 chained ten-stage seasons + 5 extreme rosters; ${checkpoints} point ceilings; stable early tickets; top4+12+16; exact scoring; groups/top2; full phase3/reset; cap16; saved-format compatibility; corrupt routes rejected; boards and World Cup UI/reload`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
