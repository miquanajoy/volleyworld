const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const K = require("../../.test-build/career-engine.js");
const V = require("../../.test-build/engine.js");
const { ui } = require("../support/tour-harness.cjs");
const regions = ["CEV", "AVC", "NORCECA", "CAVB", "CSV"];
const roster = (counts) =>
  regions.flatMap((r, i) =>
    V.regionTeams(r)
      .slice(0, counts[i])
      .map((t) => t.id),
  );
let n = 0,
  legacyInflation = 0,
  capacityRedistribution = 0;
for (let a = 0; a <= 16; a++)
  for (let b = 0; b <= 16; b++)
    for (let c = 0; c <= 16; c++)
      for (let d = 0; d <= 13; d++) {
        const e = 32 - a - b - c - d;
        if (e < 0 || e > 6) continue;
        const ids = roster([a, b, c, d, e]),
          season = (n % 19) + 1;
        const q = K.allocateCareerSlots(ids, season, true),
          old = K.allocateCareerSlots(ids, season);
        assert.equal(
          Object.values(q).reduce((a, b) => a + b),
          16,
        );
        assert(q.AVC <= 8 && q.CAVB <= 8 && q.NORCECA + q.CSV <= 8);
        if (JSON.stringify(q) !== JSON.stringify(old)) capacityRedistribution++;
        const choices = T.regionalTourChoices(ids, season, true),
          selected = T.defaultRegionalSelection(ids, season, true);
        assert(T.validRegionalSelection(ids, season, selected, true));
        for (const x of choices) {
          assert.equal(
            x.count,
            x.q ? Math.min(x.pool.length, x.region === "CEV" ? 16 : 8) : 0,
          );
          assert(x.q <= x.count);
          const actual = selected.filter((id) => x.pool.includes(id));
          for (const r of regions)
            assert(
              q[r] <= 16 - ids.filter((id) => V.get(id).region === r).length,
            );
          assert.equal(actual.length, x.count);
        }
        if (
          T.regionalTourChoices(ids, season).some(
            (x) => x.region !== "CEV" && x.count > 8,
          )
        )
          legacyInflation++;
        n++;
      }
assert(legacyInflation && capacityRedistribution);
const ids = roster([16, 9, 6, 1, 0]);
assert.equal(
  T.regionalTourChoices(ids, 2).find((x) => x.region === "AVC").count,
  9,
);
assert.equal(
  T.regionalTourChoices(ids, 2, true).find((x) => x.region === "AVC").count,
  8,
);
function inherited(version) {
  const s = T.freshPointsTour(
    1,
    T.defaultRoster(),
    T.defaultRegionalSelection(T.defaultRoster(), 1, true),
  );
  s.seasonNumber = 2;
  s.career.previousSeasonId = "previous-season";
  s.roster = ids;
  s.league = V.fresh(ids, "single", true);
  s.league.setupConfirmed = true;
  s.league.seasonNumber = 2;
  s.worldcup = K.freshCareerQualification(ids, 2);
  K.setupPointsRegions(
    s.worldcup,
    T.defaultRegionalSelection(ids, 2, version === 2),
    version,
  );
  return s;
}
let old = inherited(1),
  fresh = inherited(2);
assert(T.validTour(old) && T.validTour(fresh));
assert.deepEqual(
  old.worldcup.regions.AVC.groups.map((g) => g.length),
  [3, 3, 3],
);
for (const phase of [0, 1])
  assert.deepEqual(
    T.pointsRegionPhase(fresh.worldcup, "AVC", phase).groups.map(
      (g) => g.length,
    ),
    [4, 4],
  );
for (let stage = 0; stage < 10; stage++) {
  T.finishStage(old);
  T.finishStage(fresh);
  assert(
    T.validTour(old) && T.validTour(fresh),
    `both saved formats at stage ${stage}`,
  );
  if (stage === 3) {
    assert(
      old.worldcup.career.points.phase2.AVC.rounds.flat().some((m) => m.sets),
    );
    const loaded = JSON.parse(JSON.stringify(old));
    assert(
      T.validTour(loaded),
      "scored nine-team saves remain readable without silently deleting teams/results",
    );
  }
  T.nextStage(old);
  T.nextStage(fresh);
}
assert.equal(T.careerStatus(old).tickets, 32);
assert.equal(T.careerStatus(fresh).tickets, 32);
const next = T.nextPointsSeason(
  old,
  T.defaultRegionalSelection(
    T.careerStatus(old).qualified,
    old.seasonNumber + 1,
    true,
  ),
);
assert.equal(next.worldcup.career.points.version, 2);
assert(T.validTour(next));
const corrupt = JSON.parse(JSON.stringify(inherited(1)));
corrupt.worldcup.career.points.version = 2;
assert(
  !T.validTour(corrupt),
  "version2 cannot accept inflated legacy participant pools",
);
const screen = ui("career", 987112),
  api = screen.w.__tour;
api.enter();
api.create();
api.start();
api.model.setup.ids = ids;
api.resetRoster();
api.setupRegion("AVC");
assert.equal(
  api.model.setup.regionalIds.filter((id) => V.get(id).region === "AVC").length,
  8,
);
assert(
  screen.w.document
    .querySelector("[data-regional-setup]")
    .textContent.includes("8 đội tham dự"),
);
screen.close();
console.log(
  `PASS fixed regional pools: ${n} exhaustive inherited rosters; 6-ticket/9-team regression now8 teams in2x4; regional caps/16 total tickets; ${legacyInflation} previously inflated cases; ${capacityRedistribution} capacity redistributions; scored version1 reload and version2 continuation; setup UI fixed8`,
);
