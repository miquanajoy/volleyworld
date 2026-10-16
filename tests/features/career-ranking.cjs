const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  P = require("../../.test-build/points-policy.js"),
  R = require("../../.test-build/career-ranking.js"),
  { ui } = require("../support/parity-harness.cjs");
const table = [
  [1, 1, 1000],
  [2, 2, 630],
  [3, 3, 460],
  [4, 4, 360],
  [5, 8, 230],
  [9, 16, 90],
  [17, 20, 20],
  [5, 6, 270],
  [7, 8, 190],
  [9, 12, 120],
  [13, 16, 60],
];
for (const [from, to, points] of table)
  assert.equal(P.placementPoints({ from, to }), points, `${from}–${to}`);
for (const p of [
  { from: 0, to: 1 },
  { from: 2, to: 1 },
  { from: NaN, to: 4 },
  { from: 1, to: Infinity },
  { from: 1.5, to: 3 },
  { from: 21, to: 21 },
  { from: 20, to: 21 },
])
  assert.equal(P.placementPoints(p), 0);
for (let rank = 1; rank < 20; rank++) {
  const a = P.placementPoints({ from: rank, to: rank }),
    b = P.placementPoints({ from: rank + 1, to: rank + 1 });
  assert(a >= b && b > 0);
}
assert.equal(
  4 * P.placementPoints({ from: 5, to: 8 }),
  2 * P.placementPoints({ from: 5, to: 6 }) +
    2 * P.placementPoints({ from: 7, to: 8 }),
);
assert.equal(
  8 * P.placementPoints({ from: 9, to: 16 }),
  4 * P.placementPoints({ from: 9, to: 12 }) +
    4 * P.placementPoints({ from: 13, to: 16 }),
);
const make = (n, format, custom = false) => {
  const s = V.fresh(
    custom
      ? V.defaultIds.filter((id) => id !== "POL").concat("VIE")
      : undefined,
    format,
  );
  s.seasonNumber = n;
  V.finishAll(s);
  return {
    season_id: s.seasonId,
    season_number: n,
    status: "completed",
    created_at: s.seasonCreatedAt,
    ended_at: s.seasonCreatedAt,
    podium: V.podium(s),
    played: V.totalMatches(s),
    snapshot: s,
  };
};
const seasons = [];
for (let i = 0; i < 12; i++) {
  const row = make(i + 1, i % 2 ? "double" : "single", i === 11),
    all = V.finalPlacements(row.snapshot);
  for (const id of V.ids(row.snapshot))
    assert.deepEqual(all[id], V.finalPlacement(row.snapshot, id));
  const ranking = R.careerRanking([row]);
  assert(ranking.complete);
  assert.equal(ranking.entries.length, 20);
  assert.equal(
    ranking.entries.reduce((n, e) => n + e.points, 0),
    4170,
  );
  const [gold, silver, bronze] = row.podium;
  assert.equal(ranking.entries[0].id, gold);
  assert.equal(ranking.entries[0].points, 1000);
  assert.equal(ranking.entries[1].id, silver);
  assert.equal(ranking.entries[2].id, bronze);
  assert.equal(R.seasonPoints(row, V.standings(row.snapshot)[20].id), 0);
  for (const entry of ranking.entries) {
    assert(entry.points > 0);
    assert.equal(entry.seasons, 1);
    assert.equal(R.seasonPoints(row, entry.id), entry.points);
  }
  for (const region of Object.keys(V.limits)) {
    const regional = R.careerRanking([row], region);
    assert(regional.entries.every((e) => V.get(e.id).region === region));
    assert.equal(
      regional.entries.reduce((n, e) => n + e.points, 0),
      ranking.entries
        .filter((e) => V.get(e.id).region === region)
        .reduce((n, e) => n + e.points, 0),
    );
  }
  seasons.push(row);
}
assert.equal(
  R.careerRanking(seasons).entries.reduce((n, e) => n + e.points, 0),
  12 * 4170,
);
assert.equal(
  R.careerRanking(seasons.concat(seasons[0])).entries.reduce(
    (n, e) => n + e.points,
    0,
  ),
  12 * 4170,
  "duplicate season cannot count twice",
);
assert.equal(
  JSON.stringify(R.careerRanking([...seasons].reverse()).entries),
  JSON.stringify(R.careerRanking(seasons).entries),
  "order independent",
);
const a = seasons[0],
  target = a.podium[0],
  meta = { ...a, snapshot: undefined };
assert(!R.careerRanking([meta]).complete);
assert.equal(R.seasonPoints(meta, target), 1000);
assert.equal(R.careerSummary([meta], target).missing, 0);
assert.equal(R.seasonPoints(meta, V.loser(a.snapshot.bracket.qf[0])), null);
assert.equal(
  R.careerRanking([meta, a]).entries.reduce((n, e) => n + e.points, 0),
  4170,
);
assert.equal(
  R.careerRanking([
    { ...a, status: "cancelled" },
    { ...a, status: "active" },
  ]).entries.length,
  0,
);
assert.equal(R.seasonPoints({ ...a, status: "cancelled" }, target), 0);
assert.equal(R.seasonPoints({ ...a, status: "active" }, target), 0);
const single = R.careerRanking([a]);
for (let i = 1; i < single.entries.length; i++) {
  const x = single.entries[i - 1],
    y = single.entries[i];
  if (
    x.points === y.points &&
    x.gold === y.gold &&
    x.silver === y.silver &&
    x.bronze === y.bronze
  )
    assert.equal(x.rank, y.rank);
}
// Same total points: medals decide before a shared rank. Metadata is sufficient for this unit check.
const rival = a.podium[1],
  fillers = V.catalog
    .map((t) => t.id)
    .filter((id) => ![target, rival].includes(id))
    .slice(0, 2);
const tieRows = [
  ...Array.from({ length: 10 }, (_, i) => ({
    ...meta,
    season_id: "tie-g-" + i,
    podium: [target, ...fillers],
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    ...meta,
    season_id: "tie-s-" + i,
    podium: [fillers[0], rival, fillers[1]],
  })),
  ...Array.from({ length: 19 }, (_, i) => ({
    ...meta,
    season_id: "tie-b-" + i,
    podium: [...fillers, rival],
  })),
];
const medalTie = R.careerRanking(tieRows),
  goldEntry = medalTie.entries.find((e) => e.id === target),
  otherEntry = medalTie.entries.find((e) => e.id === rival);
assert.equal(goldEntry.points, 10000);
assert.equal(otherEntry.points, 10000);
assert(goldEntry.rank < otherEntry.rank, "gold breaks equal points");
const silverRows = [
  ...Array.from({ length: 46 }, (_, i) => ({
    ...meta,
    season_id: "silver-" + i,
    podium: [fillers[0], target, fillers[1]],
  })),
  ...Array.from({ length: 63 }, (_, i) => ({
    ...meta,
    season_id: "bronze-" + i,
    podium: [...fillers, rival],
  })),
];
const silverTie = R.careerRanking(silverRows),
  silverEntry = silverTie.entries.find((e) => e.id === target),
  bronzeEntry = silverTie.entries.find((e) => e.id === rival);
assert.equal(silverEntry.points, bronzeEntry.points);
assert(
  silverEntry.rank < bronzeEntry.rank,
  "silver breaks equal points after gold",
);
for (const entry of R.careerRanking(seasons).entries) {
  const summary = R.careerSummary(seasons, entry.id);
  assert.equal(summary.points, entry.points);
  assert.equal(summary.seasons, entry.seasons);
  assert.equal(summary.missing, 0);
}
const click = (t, s) => {
    const el = t.w.document.querySelector(s);
    assert(el, "missing " + s);
    el.click();
  },
  tick = () => new Promise((r) => setTimeout(r, 20));
(async () => {
  const t = ui("new");
  const active = V.fresh();
  active.seasonNumber = 13;
  t.w.bundle = JSON.parse(
    JSON.stringify({
      format: "volleyworld-seasons",
      version: 1,
      active,
      history: seasons,
    }),
  );
  t.run('state=Seasons.importAll(bundle);save();navigate("achievements")');
  const before = t.run("JSON.stringify(state)");
  click(t, '[data-action="achievementView"][data-arg="ranking"]');
  assert(t.w.document.querySelector(".career-ranking"));
  click(t, '[data-action="achievementWorld"]');
  const expected = R.careerRanking(seasons),
    ids = [...t.w.document.querySelectorAll("[data-career-team]")].map(
      (el) => el.dataset.careerTeam,
    );
  assert.deepEqual(
    ids,
    expected.entries.map((e) => e.id),
  );
  const leader = expected.entries[0];
  let scrolledDetail = false;
  t.w.HTMLElement.prototype.scrollIntoView = function () {
    if (this.classList.contains("achievement-detail")) scrolledDetail = true;
  };
  click(
    t,
    `.career-ranking [data-action="achievementTeam"][data-arg="${leader.id}"]`,
  );
  assert(
    scrolledDetail,
    "selected detail scrolls into view on stacked layouts",
  );
  assert.equal(
    t.w.document.querySelector(".career-summary strong").textContent,
    new Intl.NumberFormat("vi-VN").format(leader.points),
  );
  assert.equal(t.w.document.querySelectorAll(".achievement-season").length, 13);
  assert(
    t.w.document.querySelector(".achievement-detail").textContent.includes("+"),
  );
  assert.equal(
    t.run("JSON.stringify(state)"),
    before,
    "ranking never mutates tournament",
  );
  click(t, '[data-action="achievementRegion"][data-arg="AVC"]');
  assert(
    [...t.w.document.querySelectorAll("[data-career-team]")].every(
      (el) => V.get(el.dataset.careerTeam).region === "AVC",
    ),
  );
  assert(!t.run("state.setupConfirmed"));
  click(t, '[data-action="achievementView"][data-arg="countries"]');
  assert(t.w.document.querySelector(".achievement-countries"));
  // Missing archives block an authoritative leaderboard until full snapshots arrive.
  t.w.meta = seasons
    .slice(0, 5)
    .map(({ snapshot, ...row }) => ({ ...row, synced: true }));
  t.run("Seasons.restoreRecords(meta)");
  let activeFetches = 0,
    maxFetches = 0,
    fetches = 0;
  const pending = [];
  t.w.loader = (id) =>
    new Promise((resolve) => {
      activeFetches++;
      fetches++;
      maxFetches = Math.max(maxFetches, activeFetches);
      pending.push(() => {
        activeFetches--;
        resolve(
          JSON.parse(
            JSON.stringify(seasons.find((r) => r.season_id === id).snapshot),
          ),
        );
      });
    });
  t.run("__ports().cloud.fetchSeason=loader");
  click(t, '[data-action="achievementView"][data-arg="ranking"]');
  assert(!t.w.document.querySelector(".career-ranking"));
  assert(
    t.w.document
      .querySelector(".ranking-unavailable")
      .textContent.includes("Đang tổng hợp"),
  );
  assert.equal(fetches, 4);
  while (pending.length) {
    pending.shift()();
    await tick();
  }
  await tick();
  assert.equal(fetches, 5);
  assert.equal(maxFetches, 4);
  assert(t.w.document.querySelector(".career-ranking"));
  t.run("Seasons.restoreRecords(meta)");
  t.w.loader = async () => {
    throw Error("offline");
  };
  t.run("__ports().cloud.fetchSeason=loader");
  click(t, '[data-action="achievementView"][data-arg="ranking"]');
  await tick();
  assert(!t.w.document.querySelector(".career-ranking"));
  assert(
    t.w.document
      .querySelector(".ranking-unavailable")
      .textContent.includes("Chưa đủ lịch sử"),
  );
  assert(
    t.w.document.querySelector(
      '[data-action="achievementView"][data-arg="ranking"]',
    ),
  );
  const storage = t.data(),
    reload = ui("new", 1742, storage);
  reload.run('navigate("achievements")');
  click(reload, '[data-action="achievementView"][data-arg="ranking"]');
  await tick();
  assert(
    reload.w.document.querySelector(".ranking-unavailable"),
    "incomplete data remains explicit after reload",
  );
  reload.close();
  t.close();
  console.log(
    "PASS career points: exact awards, monotone curve, equal 4,170-point formats, 12 full seasons/20 eligible teams, bulk placements, additive/deduplicated totals, regional/shared ranks, per-season details, no mutation, incomplete/offline history, four-fetch bound and reload",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
