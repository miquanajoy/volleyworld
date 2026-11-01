const assert = require("node:assert/strict"),
  path = require("node:path"),
  esbuild = require("esbuild"),
  { JSDOM } = require("jsdom");
esbuild.buildSync({
  stdin: {
    contents:
      'import {initializeStore} from "./src/app/store"; import {fresh} from "./src/domain/index"; initializeStore(fresh()); export * from "./src/features/tour/achievements"; export {libraryHtml,seasonHtml} from "./src/features/tour/views"; export * as T from "./src/domain/tour/index"; export * as V from "./src/domain/index";',
    resolveDir: process.cwd(),
    sourcefile: "tour-achievement-test.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".test-build/tour-achievements.js",
});
const A = require(path.resolve(".test-build/tour-achievements.js")),
  { T, V } = A;
const doc = (html) => new JSDOM(html).window.document;
function row(s, metadata = false) {
  const r = {
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    created_at: s.createdAt,
    status: T.complete(s) ? "completed" : "active",
    played: T.played(s),
    podium: T.podium(s),
    revision: 1,
    snapshot: s,
    total_matches: T.seasonTotal(s),
  };
  r.honours = A.honoursOf(r);
  if (metadata) delete r.snapshot;
  return r;
}
const s1 = T.freshTour(1);
T.finishTour(s1);
const ids = T.defaultRoster(),
  out = ids.find((id) => V.get(id).region === "CEV"),
  incoming = V.catalog.find(
    (t) => t.region === "CEV" && !ids.includes(t.id),
  ).id;
ids[ids.indexOf(out)] = incoming;
const s2 = T.freshTour(2, ids);
T.finishTour(s2);
const r1 = row(s1),
  r2 = row(s2),
  r3 = row(T.freshTour(3));
assert.equal(T.seasonTotal(s1), 964);
assert(!s1.league.playoffEntry, "New League format keeps original top12 entry");
const defaultId = s1.roster[0],
  unselected = V.catalog.find((t) => !s1.roster.includes(t.id)).id;
assert.equal(A.resultFor(r1, unselected, "league").kind, "absent");
assert.equal(A.resultFor(r1, unselected, "challenger").kind, "absent");
for (const key of A.competitionKeys) {
  const winners = A.honoursOf(r1)[key];
  assert.equal(winners.length, 3);
  winners.forEach((id, i) =>
    assert.equal(A.resultFor(r1, id, key).from, i + 1),
  );
}
const leagueGrouped = s1.roster.find(
    (id) => A.resultFor(r1, id, "league").from === 5,
  ),
  leagueResult = A.resultFor(r1, leagueGrouped, "league");
assert.deepEqual([leagueResult.from, leagueResult.to], [5, 8]);
assert(A.resultHtml(leagueResult, 1).includes("#5–#8"));
assert(A.resultHtml(leagueResult, 1).includes("SS 1"));
assert.equal(A.resultFor(r3, defaultId, "league").kind, "pending");
assert.equal(A.resultFor(r3, defaultId, "challenger").kind, "pending");
assert.equal(A.resultFor(r3, defaultId, "worldcup").kind, "pending");
const live = T.freshTour(4);
T.finishStage(live);
T.nextStage(live);
const r4 = row(live);
assert.equal(A.resultFor(r4, defaultId, "league").kind, "active");
assert.equal(A.resultFor(r4, defaultId, "challenger").kind, "pending");
assert.equal(
  A.resultFor(r4, defaultId, "worldcup").description,
  "Đang vòng loại",
);
const onlyMetadata = row(s1, true),
  withoutDetails = {
    ...onlyMetadata,
    season_id: "unknown-season",
    season_number: 5,
    honours: undefined,
  };
const winner = onlyMetadata.honours.league[0];
assert.equal(A.resultFor(onlyMetadata, winner, "league").from, 1);
assert.equal(
  A.resultFor(onlyMetadata, leagueGrouped, "league").kind,
  "unavailable",
);
assert.equal(
  A.resultFor(withoutDetails, defaultId, "league").kind,
  "unavailable",
  "Unknown cloud detail is not fabricated non-participation",
);
let library = doc(A.libraryHtml([onlyMetadata]));
assert.equal(library.querySelectorAll("[data-history-competition]").length, 3);
assert.equal(
  library.querySelectorAll(".tour-history-award").length,
  9,
  "All three top3 podiums survive lazy cloud loading",
);
library = doc(A.libraryHtml([withoutDetails]));
assert.equal(library.querySelectorAll(".tour-award-unavailable").length, 3);
assert(
  library
    .querySelector('[data-action="Tour.open"]')
    .textContent.includes("tổng kết"),
);
assert(
  !library.querySelector('[data-action="navigate"][data-arg="home"]'),
  "Tour library has no looping standalone home link",
);
const recordList = [r1, r2, r3, r4],
  snapshot = JSON.stringify(recordList);
const totals = A.medalTotals(recordList, defaultId);
assert.equal(
  totals.reduce((a, b) => a + b, 0),
  recordList.reduce(
    (n, r) =>
      n +
      A.competitionKeys.filter((key) => A.honoursOf(r)[key].includes(defaultId))
        .length,
    0,
  ),
);
for (const key of A.competitionKeys) {
  const separate = A.medalTotals(recordList, defaultId, key);
  assert.equal(
    separate.reduce((a, b) => a + b, 0),
    recordList.filter((r) => A.honoursOf(r)[key].includes(defaultId)).length,
  );
}
const region = V.get(defaultId).region;
let profile = doc(A.achievementsHtml(recordList, region, defaultId, "all"));
assert.equal(
  profile.querySelectorAll("[data-achievement-season]").length,
  4,
  "Every Tour season has an explicit history row",
);
assert.deepEqual(
  [...profile.querySelectorAll("[data-achievement-season]")].map((el) =>
    Number(el.dataset.achievementSeason),
  ),
  [4, 3, 2, 1],
);
assert.equal(
  profile.querySelectorAll("[data-achievement-season] [data-competition]")
    .length,
  12,
  "Each season shows League, Challenger and WorldCup",
);
const row3 = profile.querySelector('[data-achievement-season="3"]');
assert.equal(row3.querySelectorAll('[data-result="pending"]').length, 3);
profile = doc(
  A.achievementsHtml([r1], V.get(unselected).region, unselected, "all"),
);
assert.equal(
  profile.querySelectorAll('[data-result="absent"]').length >= 2,
  true,
);
profile = doc(A.achievementsHtml([withoutDetails], region, defaultId, "all"));
assert.equal(profile.querySelectorAll('[data-result="unavailable"]').length, 3);
const countries = doc(A.achievementsHtml(recordList, "CEV", null, "league"));
assert.equal(
  countries.querySelectorAll(".tour-country-card").length,
  V.catalog.filter((t) => t.region === "CEV").length,
);
assert.equal(
  countries.querySelector(
    '[data-action="Tour.achievementCompetition"][aria-pressed="true"]',
  ).dataset.arg,
  "league",
);
assert.equal(
  JSON.stringify(recordList),
  snapshot,
  "Achievement rendering cannot mutate history",
);
const summary = doc(
  A.seasonHtml(
    s1,
    {
      section: "journey",
      stage: 7,
      round: 2,
      region: "CEV",
      swissView: "tree",
    },
    true,
  ),
);
assert.equal(summary.querySelectorAll("[data-summary-competition]").length, 3);
assert.equal(summary.querySelectorAll("[data-medal-place]").length, 9);
for (const place of [1, 2, 3])
  assert.equal(
    summary.querySelectorAll(`[data-medal-place="${place}"]`).length,
    3,
  );
assert(!summary.querySelector(".tour-journey-disclosure").open);
assert.equal(summary.querySelectorAll(".tour-journey-recap > li").length, 8);
assert.equal(
  summary.querySelectorAll('.tour-competition-links [data-section="table"]')
    .length,
  3,
);
assert.equal(
  summary.querySelectorAll('.tour-competition-links [data-section="playoff"]')
    .length,
  3,
);
const currentTable = doc(
  A.seasonHtml(
    s1,
    { section: "table", stage: 6, round: 30, region: "CEV", swissView: "tree" },
    true,
  ),
);
assert(currentTable.querySelector(".legend").textContent.includes("1–12"));
assert(currentTable.querySelector(".legend").textContent.includes("13–20"));
assert(!currentTable.querySelector(".legend").textContent.includes("17–24"));
console.log(
  "PASS Tour achievements/summary: top12 League, three distinct top3 podiums, lazy metadata awards, grouped placements, absent/pending/live/unknown states, every season and competition, region/filter medal totals, no mutation, compact collapsed recap and direct competition links",
);
