const assert = require("node:assert/strict"),
  K = require("../../.test-build/career-engine.js"),
  T = require("../../.test-build/tour-engine.js"),
  V = require("../../.test-build/engine.js"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/tour-harness.cjs");
const clone = (x) => JSON.parse(JSON.stringify(x));
const all = F.regionOrder
  .flatMap((r) => V.regionTeams(r))
  .sort((a, b) => a.rank - b.rank)
  .map((t) => t.id);
const score = (side, five = false) =>
  five
    ? side
      ? [
          [20, 25],
          [25, 20],
          [20, 25],
          [25, 20],
          [10, 15],
        ]
      : [
          [25, 20],
          [20, 25],
          [25, 20],
          [20, 25],
          [15, 10],
        ]
    : Array.from({ length: 3 }, () => (side ? [20, 25] : [25, 20]));
function valid(b) {
  const seen = new Set();
  return K.validWorldPlayinDouble(b, b.seeds, (m, seeds, id) => {
    if (
      !m ||
      m.id !== id ||
      seen.has(id) ||
      m.a === m.b ||
      !seeds.includes(m.a) ||
      !seeds.includes(m.b) ||
      (m.sets !== null && !V.validate(m.sets))
    )
      return false;
    seen.add(id);
    return true;
  });
}
let random = 2913871;
const next = () => (random = (Math.imul(random, 1664525) + 1013904223) >>> 0);
Math.random = () => next() / 4294967296;
let trials = 0;
for (const n of [32, 31, 30]) {
  for (let trial = 0; trial < 1000; trial++) {
    const b = { seeds: all.slice(0, n), rounds: [] };
    K.advanceWorldPlayin(b);
    assert(valid(b));
    const absent = b.seeds.filter(
      (id) => !b.rounds[0].some((m) => m.a === id || m.b === id),
    );
    assert.deepEqual(
      absent,
      b.seeds.slice(0, 32 - n),
      "Only highest seeds get first-round byes",
    );
    let count = 0;
    while (!K.worldPlayinStatus(b).done) {
      assert(count++ < 6, "Draw cannot stall");
      const row = b.rounds.at(-1),
        before = K.worldPlayinStatus(b);
      assert.equal(
        new Set(row.flatMap((m) => [m.a, m.b])).size,
        2 * row.length,
      );
      for (const m of row) {
        assert(
          !before.qualified.includes(m.a) && !before.qualified.includes(m.b),
        );
        assert(
          !before.eliminated.includes(m.a) && !before.eliminated.includes(m.b),
        );
        const side = trial === 0 ? 0 : trial === 1 ? 1 : (next() >>> 16) % 2;
        m.sets = score(side, trial % 3 === 0);
        const state = K.worldPlayinStatus(b);
        assert([...state.losses.values()].every((losses) => losses <= 2));
        assert(state.qualified.every((id) => (state.losses.get(id) || 0) < 2));
      }
      K.advanceWorldPlayin(b);
      assert(valid(b));
      assert.deepEqual(
        K.worldPlayinStatus(clone(b)).qualified,
        K.worldPlayinStatus(b).qualified,
        "Reload retains tickets",
      );
    }
    const status = K.worldPlayinStatus(b);
    assert.equal(status.qualified.length, n - 16);
    assert.equal(new Set(status.qualified).size, n - 16);
    assert.equal(status.upper.length, 8);
    assert.equal(status.lower.length, n - 24);
    assert.equal(status.eliminated.length, 16);
    assert(status.eliminated.every((id) => status.losses.get(id) === 2));
    assert.equal(new Set([...status.qualified, ...status.eliminated]).size, n);
    assert.equal(b.rounds.flat().length, n + 8);
    const frozen = JSON.stringify(b);
    K.advanceWorldPlayin(b);
    assert.equal(
      JSON.stringify(b),
      frozen,
      "Completed draw is immutable under advance",
    );
    if (!trial) {
      for (const change of [
        (b) => (b.rounds[0][0].b = b.rounds[0][0].a),
        (b) => (b.rounds[1][0].a = b.seeds[0]),
        (b) => b.rounds[0].push(clone(b.rounds[0][0])),
        (b) =>
          (b.rounds[0][0].sets = [
            [25, 24],
            [25, 20],
            [25, 20],
          ]),
        (b) => (b.rounds[0][0].sets = null),
        (b) => b.rounds.push([]),
        (b) => (b.rounds[3][0].id = "WCU1-0"),
      ]) {
        const bad = clone(b);
        change(bad);
        assert(!valid(bad), "Reject forged routes/scores/future rounds");
      }
    }
    trials++;
  }
}

// Real ten-stage Tour flow, UI actions, manual result edits and saved history.
const game = T.freshCareerTour(
  1,
  T.defaultRoster(),
  T.defaultRegionalSelection(T.defaultRoster(), 1),
);
while (game.stage < 7) {
  T.finishStage(game);
  T.nextStage(game);
}
assert(T.validTour(game));
const gameStart = clone(game),
  p = game.worldcup.career.playin;
assert(p.double);
for (const change of [
  (p) => p.double.seeds.reverse(),
  (p) => p.double.rounds[0].pop(),
  (p) => p.double.rounds.push([]),
  (p) => p.final.push(clone(p.double.rounds[0][0])),
  (p) => (p.double = null),
]) {
  const bad = clone(game);
  change(bad.worldcup.career.playin);
  assert(
    !T.validTour(bad),
    "Full season validator rejects forged double Play-in state",
  );
}
assert(
  p.challenger.every((id) => !p.double.seeds.includes(id)),
  "Challenger's direct qualifiers never enter Play-in",
);
assert(p.league16.every((id) => !p.double.seeds.includes(id)));
assert.equal(T.batch(game).length, p.double.rounds[0].length);
const firstId = T.batch(game)[0].id;
assert.throws(
  () => T.recordScore(game, "WCL2-0", score(0)),
  "Future match cannot be played",
);
T.recordScore(game, firstId, score(0));
T.recordScore(game, firstId, score(1, true));
assert(T.validTour(game), "Edit a scored fixture before its round completes");
T.simulateBatch(game);
assert.throws(
  () => T.recordScore(game, firstId, score(0)),
  "Prior round locks after descendants are drawn",
);
assert(T.validTour(game));
const t = ui("career", 25116),
  api = t.w.__tour,
  d = t.w.document;
api.enter();
api.model.records.push(api.recordOf(game));
api.persist();
api.open(game.seasonId);
api.resume();
assert(
  d.querySelector('[data-world-playin-double] [aria-label="Nhánh thắng"]'),
);
assert(d.querySelector('[data-world-playin-double] [aria-label="Nhánh thua"]'));
const imageBefore = JSON.stringify(api.selected().snapshot);
api.section("playoff");
api.section("matches");
assert.equal(
  JSON.stringify(api.selected().snapshot),
  imageBefore,
  "Rendering cannot mutate the draw",
);
const available = T.batch(api.selected().snapshot).find((m) => !m.sets);
d.querySelector(
  `[data-action="Tour.match"][data-arg="${available.id}"]`,
).click();
assert(
  d.querySelector("#playoffMatchDialog[open]"),
  "Bracket opens real match detail",
);
d.getElementById("playoffMatchDialog").close();
api.edit(available.id);
assert(
  d.querySelector("#editor[open]"),
  "Score editor works for lower-bracket fixtures",
);
d.getElementById("generatedWinner").value = "1";
d.getElementById("generatedLosses").value = "2";
d.querySelector('[data-action="generateScore"]').click();
d.getElementById("scoreForm").dispatchEvent(
  new t.w.Event("submit", { bubbles: true, cancelable: true }),
);
assert(
  T.matches(api.selected().snapshot).find((m) => m.id === available.id).sets,
);
api.simRound();
api.finishStage();
assert(T.validTour(api.selected().snapshot));
const complete = K.worldPlayinStatus(
  api.selected().snapshot.worldcup.career.playin.double,
);
assert.equal(
  d.querySelectorAll("[data-world-playin-qualified]").length,
  complete.qualified.length,
);
assert.equal(d.querySelectorAll("[data-world-playin-eliminated]").length, 16);
const reload = ui("career", 25117, t.data());
reload.w.__tour.enter();
reload.w.__tour.open(game.seasonId);
assert(T.validTour(reload.w.__tour.selected().snapshot));
assert.deepEqual(
  clone(reload.w.__tour.selected().snapshot),
  clone(api.selected().snapshot),
);
reload.close();
t.close();

// Historical single-match Play-ins remain readable; unplayed draws can upgrade.
const old = clone(gameStart),
  cp = old.worldcup.career.playin;
const fields = K.careerPlayinFields(old.worldcup),
  extra = fields.extra.length,
  low = fields.regional.slice(16 - 2 * extra);
delete cp.double;
cp.draw = Array.from({ length: 16 - extra }, (_, i) => i);
cp.preliminary = Array.from({ length: extra }, (_, i) => ({
  id: `WP${i}`,
  a: low[i],
  b: low[2 * extra - 1 - i],
  sets: null,
}));
cp.final = [];
K.advanceCareerPlayin(old.worldcup);
assert(T.validTour(old));
const originalUnplayed = clone(old);
const unplayed = clone(old);
assert(K.useDoublePlayin(unplayed.worldcup));
assert(T.validTour(unplayed));
T.simulateMatches(old, [T.batch(old)[0].id]);
const oldFrozen = JSON.stringify(old);
assert(!K.useDoublePlayin(old.worldcup));
assert.equal(
  JSON.stringify(old),
  oldFrozen,
  "Never replace historical scored matches",
);
T.finishTour(old);
assert(T.validTour(old));
const legacyUI = ui("career", 211),
  model = legacyUI.w.__tour;
model.enter();
assert(
  model.recordOf(originalUnplayed).snapshot.worldcup.career.playin.double,
  "Unplayed old draw upgrades through the model",
);
model.model.records.push(model.recordOf(old));
model.persist();
assert.equal(
  model.readScope(model.model.scope)[0].snapshot.worldcup.career.playin.double,
  undefined,
);
// The pre-Play-in save's old total was 24 lower; it must not disappear on reload.
const early = T.freshCareerTour(),
  earlyRecord = model.recordOf(early);
earlyRecord.total_matches -= 24;
legacyUI.w.localStorage.setItem(
  model.model.scope,
  JSON.stringify([earlyRecord]),
);
assert.equal(model.readScope(model.model.scope).length, 1);
assert.equal(
  model.readScope(model.model.scope)[0].total_matches,
  T.seasonTotal(early),
);
legacyUI.close();
console.log(
  `PASS World Cup double Play-in: ${trials} complete 32/31/30 draws; exactly 40/39/38 BO5; 16/15/14 tickets; seeded byes; two-loss exits; no reentry; route/score forgery rejection; manual edits/locks; two-panel UI; reload; old scored/unplayed/pre-draw compatibility`,
);
