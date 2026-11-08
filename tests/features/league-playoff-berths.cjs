const assert = require("node:assert/strict");
const T = require("../../.test-build/tour-engine.js");
const K = require("../../.test-build/career-engine.js");
const V = require("../../.test-build/engine.js");
const { ui } = require("../support/tour-harness.cjs");
const clone = (s) => JSON.parse(JSON.stringify(s));
let rng = 826541;
Math.random = () =>
  (rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296;
const s = T.freshPointsTour(
  1,
  T.defaultRoster(),
  T.defaultRegionalSelection(T.defaultRoster(), 1, true),
);
while (s.stage < 5) {
  T.finishStage(s);
  T.nextStage(s);
}
T.finishStage(s);
const regular = V.standings(s.league)
  .slice(0, 4)
  .map((t) => t.id);
assert.equal(
  T.leagueTopFour(s).length,
  0,
  "regular top4 are not automatic qualifiers",
);
assert(!T.seasonPointsRows(s).some((r) => r.automatic));
assert(T.automaticBerths(s).every((r) => r.route !== "league"));
// Existing undecided points seasons without a rule marker get the correction immediately.
delete s.worldcup.career.points.leagueBerths;
assert(T.validTour(s));
const badMarker = clone(s);
badMarker.worldcup.career.points.leagueBerths = "standings";
assert(!T.validTour(badMarker), "invalid qualification marker rejected");
assert(T.leaguePlayoffBerths(s));
assert.equal(T.leagueTopFour(s).length, 0);
const beforePlayoff = clone(s);
T.nextStage(s);
T.finishStage(s);
T.nextStage(s);
const score = (m, id) =>
  Array.from({ length: 3 }, () => (m.a === id ? [25, 20] : [20, 25]));
for (const m of [...T.batch(s)]) {
  const top = regular.find((id) => m.a === id || m.b === id);
  const win = top ? (m.a === top ? m.b : m.a) : m.a;
  T.recordScore(s, m.id, score(m, win));
}
assert.equal(s.league.bracket.qf.length, 4);
assert(
  !s.league.bracket.qf.some(
    (m) => regular.includes(m.a) || regular.includes(m.b),
  ),
  "all regular top4 exited in R16",
);
assert.equal(T.leagueTopFour(s).length, 0);
const semifinalists = [];
for (const m of [...T.batch(s)]) {
  T.recordScore(s, m.id, score(m, m.a));
  semifinalists.push(m.a);
  assert.deepEqual(
    T.leagueTopFour(s),
    semifinalists,
    "each quarterfinal winner immediately secures an automatic berth",
  );
  const rows = T.seasonPointsRows(s);
  assert.equal(rows.filter((r) => r.automatic).length, semifinalists.length);
  assert(rows.filter((r) => r.automatic).every((r) => r.confirmed));
  assert(!rows.filter((r) => regular.includes(r.id)).some((r) => r.automatic));
  assert(semifinalists.every((id) => T.careerStatus(s).qualified.includes(id)));
  assert(T.validTour(s));
}
const atSemifinal = clone(s);
T.finishStage(s);
const direct = T.seasonPointsDirect(s);
assert.equal(direct.length, 16);
assert.equal(new Set(direct).size, 16);
assert.deepEqual(direct.slice(0, 4), semifinalists);
assert.equal(direct.slice(4).length, 12);
assert(!direct.slice(4).some((id) => semifinalists.includes(id)));
const preDraw = clone(s);
T.nextStage(s);
assert.equal(
  s.worldcup.career.points.leagueBerths,
  "playoff",
  "undecided saved season records corrected rule before draw",
);
assert.deepEqual(s.worldcup.career.playin.league16, direct);
assert(T.validTour(clone(s)));
T.finishTour(s);
assert(T.validTour(s));
assert.equal(T.careerStatus(s).qualified.length, 32);
// Reproduce an already drawn old season using its original four regular-season tickets.
const legacy = clone(preDraw);
delete legacy.worldcup.career.points.leagueBerths;
const oldDirect = [
  ...regular,
  ...T.seasonPointsRows(legacy)
    .filter((r) => !regular.includes(r.id))
    .slice(0, 12)
    .map((r) => r.id),
];
legacy.stage = 8;
K.createCareerPlayin(legacy.worldcup, oldDirect, []);
assert(!T.leaguePlayoffBerths(legacy));
assert.deepEqual(T.leagueTopFour(legacy), regular);
assert(T.validTour(legacy), "old draw remains valid");
T.simulateBatch(legacy);
const persisted = JSON.stringify(legacy);
assert(
  T.validTour(JSON.parse(persisted)),
  "scored legacy play-in reload remains readable",
);
assert.equal(
  JSON.stringify(legacy),
  persisted,
  "validation never changes old draw or scores",
);
T.finishTour(legacy);
assert(T.validTour(legacy));
assert.deepEqual(legacy.worldcup.world.pots[0], oldDirect.slice(0, 8));
const screen = ui("career", 826542),
  api = screen.w.__tour,
  d = screen.w.document;
api.enter();
for (const snapshot of [beforePlayoff, atSemifinal, legacy]) {
  const rec = api.recordOf(snapshot);
  api.model.records = [rec];
  api.model.selected = rec.season_id;
  api.resume();
  api.section("points");
  const automatic = T.leagueTopFour(snapshot);
  for (const id of automatic) {
    const row = d.querySelector(`[data-main-points] [data-point-team="${id}"]`);
    assert(row.querySelector('[data-point-status="qualified"]'));
  }
  if (T.leaguePlayoffBerths(snapshot)) {
    assert(
      d
        .querySelector("[data-main-points]")
        .textContent.includes("Top 4 playoff League"),
    );
    assert(
      !d
        .querySelector("[data-main-points]")
        .textContent.includes("Top 4 BXH League"),
    );
  }
  api.section("qualifiers");
  for (const id of automatic)
    assert(
      d
        .querySelector(`[data-qualified-team="${id}"]`)
        .textContent.includes(
          T.leaguePlayoffBerths(snapshot) ? "Top 4 playoff League" : "Luật cũ",
        ),
    );
}
screen.close();
console.log(
  "PASS League playoff berths: zero regular-stage automatic tickets; all four regular top4 eliminated in R16; each QF winner qualifies early; top4+12 distinct points tickets; current undecided save correction; persisted marker; scored old draw/world preservation; points and World Cup UI labels",
);
