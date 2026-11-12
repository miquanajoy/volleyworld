const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  T = require("../../.test-build/tour-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/tour-harness.cjs");
const clone = (x) => JSON.parse(JSON.stringify(x));
const ids = V.catalog.slice(0, 32).map((t) => t.id);
function group(offset = 0) {
  const t = ids.slice(offset, offset + 4);
  return {
    teamIds: t,
    tie: [...t],
    rounds: [
      [
        [0, 1],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 3],
      ],
      [
        [0, 3],
        [1, 2],
      ],
    ].map((r, i) =>
      r.map(([a, b], j) => ({
        id: `G${offset}-${i}-${j}`,
        a: t[a],
        b: t[b],
        sets: null,
      })),
    ),
  };
}
function result(m, winner, lost = 0, margin = 5) {
  const sets = [...Array(3)].map(() => [25, 25 - margin]);
  for (let i = 0; i < lost; i++) sets.splice(i * 2, 0, [0, 25]);
  if (sets.length === 5) sets[4] = [15, 15 - Math.min(margin, 15)];
  m.sets = sets.map(([a, b]) => (m.a === winner ? [a, b] : [b, a]));
}
const world = (n = 8) => ({
  groups: Array.from({ length: n }, (_, i) => group(i * 4)),
  pots: [],
  tie: ids.slice(0, n * 4),
  bracket: null,
});
const w = world(),
  g = w.groups[0],
  [a, b, c, d] = g.teamIds;
assert(
  Object.values(F.worldPlayoffBerths(w)).every(
    (s) => !s.qualified && !s.eliminated,
  ),
);
// A two-win leader can still drop below the cutoff in a three-way tie.
result(g.rounds[0][0], a, 2);
result(g.rounds[0][1], d);
result(g.rounds[1][0], a, 2);
result(g.rounds[1][1], b);
// A 2-0 start is NOT sufficient: three teams can still finish 2-1.
assert(!F.worldPlayoffBerths(w)[a].qualified);
// A/B each win first two, C/D each lose, and final round pairs A-B / C-D.
g.rounds = [
  [
    { id: "1", a, b: c, sets: null },
    { id: "2", a: b, b: d, sets: null },
  ],
  [
    { id: "3", a, b: d, sets: null },
    { id: "4", a: b, b: c, sets: null },
  ],
  [
    { id: "5", a, b, sets: null },
    { id: "6", a: c, b: d, sets: null },
  ],
];
g.rounds
  .slice(0, 2)
  .flat()
  .forEach((m) => result(m, m.a));
let proof = F.worldPlayoffBerths(w);
assert(proof[a].qualified && proof[b].qualified);
assert(proof[c].eliminated && proof[d].eliminated);
assert(!F.fullLeagueDone(g));
const early = clone(w);
const before = JSON.stringify(w);
F.worldPlayoffBerths(w);
assert.equal(JSON.stringify(w), before, "Read-only proof");
assert(
  Object.values(F.worldPlayoffBerths(F.worldAtRound(w, 0))).every(
    (s) => !s.qualified && !s.eliminated,
  ),
  "No future results leak",
);
g.rounds[1][0].sets = null;
assert(
  !F.worldPlayoffBerths(w)[a].qualified,
  "Clearing a score invalidates prior proof",
);
result(g.rounds[1][0], a);
assert.deepEqual(
  F.worldPlayoffBerths(clone(w)),
  F.worldPlayoffBerths(w),
  "Reload derives identical status",
);
// Certify every emitted status against all six BO5 outcomes for the last 3 games.
for (let seed = 0; seed < 24; seed++) {
  const candidate = world(),
    gg = candidate.groups[seed % 8],
    matches = gg.rounds.flat();
  matches
    .slice(0, 3)
    .forEach((m, i) =>
      result(m, (seed >> i) & 1 ? m.a : m.b, (seed + i) % 3, seed % 2 ? 25 : 2),
    );
  const certificates = F.worldPlayoffBerths(candidate);
  function finish(i) {
    if (i === matches.length) {
      const final = F.fullStandings(gg);
      final.forEach((t, rank) => {
        if (certificates[t.id].qualified)
          assert(rank < 2, "No false qualification");
        if (certificates[t.id].eliminated)
          assert(rank >= 2, "No false elimination");
      });
      return;
    }
    for (let outcome = 0; outcome < 6; outcome++) {
      result(
        matches[i],
        outcome < 3 ? matches[i].a : matches[i].b,
        outcome % 3,
        i % 2 ? 25 : 2,
      );
      finish(i + 1);
    }
    matches[i].sets = null;
  }
  finish(3);
}
// A fully tied 3-team mini-league uses the saved draw after head-to-head.
const tied = world(),
  tg = tied.groups[0],
  [ta, tb, tc, td] = tg.teamIds;
tg.rounds.flat().forEach((m) => {
  const win = [m.a, m.b].includes(td)
    ? m.a === td
      ? m.b
      : m.a
    : [m.a, m.b].includes(ta) && [m.a, m.b].includes(tb)
      ? ta
      : [m.a, m.b].includes(tb) && [m.a, m.b].includes(tc)
        ? tb
        : tc;
  result(m, win);
});
tg.tie = [tc, tb, ta, td];
assert.deepEqual(
  F.fullStandings(tg).map((r) => r.id),
  [tc, tb, ta, td],
);
assert(F.worldPlayoffBerths(tied)[tc].qualified);
assert(F.worldPlayoffBerths(tied)[tb].qualified);
assert(F.worldPlayoffBerths(tied)[ta].eliminated);
// Final standings must use all tie breakers, including the saved draw.
for (const gg of w.groups)
  gg.rounds
    .flat()
    .filter((m) => !m.sets)
    .forEach((m) => result(m, m.a, 2, 2));
proof = F.worldPlayoffBerths(w);
assert.equal(Object.values(proof).filter((s) => s.qualified).length, 16);
assert.equal(Object.values(proof).filter((s) => s.eliminated).length, 16);
assert.deepEqual(
  Object.keys(proof)
    .filter((id) => proof[id].qualified)
    .sort(),
  F.worldEntrants(w).sort(),
);
const old = world(6);
old.groups[0] = clone(g);
assert(
  !F.worldPlayoffBerths(old)[c].eliminated || F.groupBerths(g, 3)[c].eliminated,
  "Third-place path is preserved in legacy cups",
);
old.groups.forEach((gg) =>
  gg.rounds
    .flat()
    .filter((m) => !m.sets)
    .forEach((m) => result(m, m.a)),
);
assert.equal(
  Object.values(F.worldPlayoffBerths(old)).filter((s) => s.qualified).length,
  16,
);
assert.equal(
  Object.values(F.worldPlayoffBerths(old)).filter((s) => s.eliminated).length,
  8,
);
// Render the real Tour application in both screens and historical rounds.
const app = ui("career", 8172),
  api = app.w.__tour;
api.enter();
const s = T.freshCareerTour(1, T.defaultRoster());
s.stage = 7;
s.worldcup.world = clone(early);
s.worldcup.world.pots = Array.from({ length: 4 }, (_, i) =>
  w.groups.map((gg) => gg.teamIds[i]),
);
api.model.records = [api.recordOf(s)];
api.model.selected = s.seasonId;
api.resume();
api.round("1");
for (const section of ["matches", "table"]) {
  api.section(section);
  assert.equal(
    app.w.document.querySelectorAll('[data-playoff-status="qualified"]').length,
    2,
  );
  assert.equal(
    app.w.document.querySelectorAll('[data-playoff-status="eliminated"]')
      .length,
    2,
  );
}
api.selected().snapshot.worldcup.world = clone(w);
api.selected().snapshot.worldcup.world.pots = s.worldcup.world.pots;
api.section("matches");
api.round("2");
function checkIcons() {
  const icons = [...app.w.document.querySelectorAll(".world-playoff-status")];
  assert.equal(icons.length, 32);
  assert.equal(
    icons.filter((e) => e.dataset.playoffStatus === "qualified").length,
    16,
  );
  icons.forEach((e) => {
    assert(["✓", "✕"].includes(e.textContent));
    assert(e.getAttribute("aria-label"));
    assert(e.title);
  });
}
checkIcons();
api.section("table");
checkIcons();
assert(
  !app.w.document.querySelector(".full-qualification"),
  "No text badges in World Cup table",
);
api.round("0");
assert.equal(
  app.w.document.querySelectorAll(".world-playoff-status").length,
  0,
);
api.round("2");
checkIcons();
app.close();
console.log(
  "World Cup playoff status: early proofs, score correction, BO5 branches, legacy routes, historical tables and icon-only UI passed",
);
