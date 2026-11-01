const assert = require("node:assert/strict"),
  fs = require("node:fs");
const T = require("../../.test-build/tour-engine.js"),
  V = require("../../.test-build/engine.js"),
  C = require("../../.test-build/challenger-engine.js"),
  F = require("../../.test-build/full-engine.js");
const clone = (s) => JSON.parse(JSON.stringify(s));
const fixtures = [];
for (let trial = 0; trial < 24; trial++) {
  const roster = Object.entries(T.quotas).flatMap(([r, n]) =>
    V.shuffle(V.regionTeams(r))
      .slice(0, n)
      .map((t) => t.id),
  );
  const s = T.freshTour(trial + 1, roster);
  assert(T.validTour(s));
  assert.equal(new Set(s.roster).size, 32);
  assert.equal(s.league.playoffEntry, undefined);
  if (!trial) fixtures.push({ key: "fresh", expected: true, state: clone(s) });
  assert.throws(() => T.nextStage(s));
  assert.throws(() =>
    T.recordScore(s, s.league.rounds[10][0].id, [
      [25, 20],
      [25, 20],
      [25, 20],
    ]),
  );
  for (let stage = 0; stage < 8; stage++) {
    assert.equal(s.stage, stage);
    assert(T.batch(s).some((m) => !m.sets));
    if (!trial) {
      T.recordScore(s, T.batch(s).find((m) => !m.sets).id, [
        [25, 20],
        [25, 20],
        [25, 20],
      ]);
      assert(T.validTour(s));
      fixtures.push({
        key: "partial-" + stage,
        expected: true,
        state: clone(s),
      });
    }
    if (!trial && stage === 6) {
      let step = 0;
      while (!T.stageDone(s)) {
        T.simulateBatch(s);
        assert(T.validTour(s));
        fixtures.push({
          key: "league-knockout-" + step++,
          expected: true,
          state: clone(s),
        });
      }
    }
    T.finishStage(s);
    assert(T.stageDone(s));
    assert(T.validTour(s), `stage ${stage}`);
    if (stage === 0) {
      assert.equal(s.league.rounds.flat().filter((m) => m.sets).length, 160);
      assert.equal(F.fullMatches(s.worldcup).filter((m) => m.sets).length, 0);
    }
    if (stage === 2)
      assert.equal(s.league.rounds.flat().filter((m) => m.sets).length, 320);
    if (stage === 3) {
      assert.equal(C.challengerMatches(s.challenger).length, 82);
      assert.deepEqual([...s.challenger.roster].sort(), [...s.roster].sort());
      for (const round of s.challenger.rounds) {
        const pairs = round.map((m) => [m.a, m.b].sort().join(":"));
        assert.equal(new Set(pairs).size, pairs.length);
      }
    }
    if (stage === 6) {
      assert.equal(s.league.bracket.r20, undefined);
      const ranks = V.standings(s.league);
      for (let i = 0; i < 4; i++) {
        assert.equal(s.league.playin[i].a, ranks[12 + i].id);
        assert.equal(s.league.playin[i].b, ranks[19 - i].id);
      }
    }
    if (stage === 4)
      assert.equal(s.league.rounds.flat().filter((m) => m.sets).length, 496);
    if (stage < 7)
      assert.equal(
        s.worldcup.world,
        null,
        "World Cup stays locked until League final ends",
      );
    T.nextStage(s);
    assert(T.validTour(s), "transition " + stage);
    if (!trial)
      fixtures.push({
        key: "stage-" + s.stage,
        expected: true,
        state: clone(s),
      });
  }
  assert(T.complete(s));
  assert.equal(T.played(s), 964);
  assert.equal(T.matches(s).length, 964);
  assert.equal(T.podium(s).length, 3);
  assert(V.complete(s.league));
  assert(F.worldComplete(s.worldcup));
  assert(C.challengerComplete(s.challenger));
  assert.equal(F.qualificationEntrants(s.worldcup).length, 24);
  assert.throws(() => T.nextStage(s));
  const replay = clone(s);
  T.finishTour(replay);
  assert.deepEqual(s, replay);
}
// Existing expanded Tour saves keep their recorded format; new seasons never opt in.
const legacy = T.freshTour(25);
legacy.league.playoffEntry = "top16";
assert(T.validTour(legacy));
T.finishTour(legacy);
assert(T.validTour(legacy));
assert.equal(T.played(legacy), 968);
assert.equal(T.seasonTotal(legacy), 968);
fixtures.push({
  key: "legacy-expanded-completed",
  expected: true,
  state: clone(legacy),
});
const upgrade = T.freshTour(26);
upgrade.league.playoffEntry = "top16";
T.finishStage(upgrade);
const beforePoints = clone(upgrade.league.rounds);
assert(T.useOriginalPlayoff(upgrade));
assert.deepEqual(upgrade.league.rounds, beforePoints);
assert(T.validTour(upgrade));
assert.equal(T.seasonTotal(upgrade), 964);
const locked = clone(legacy);
assert.equal(T.useOriginalPlayoff(locked), false);
assert.deepEqual(locked, legacy);
const unplayedKnockout = T.freshTour(27);
unplayedKnockout.league.playoffEntry = "top16";
while (unplayedKnockout.stage < 6) {
  T.finishStage(unplayedKnockout);
  T.nextStage(unplayedKnockout);
}
assert(T.useOriginalPlayoff(unplayedKnockout));
assert(T.validTour(unplayedKnockout));
const table = V.standings(unplayedKnockout.league);
assert.equal(unplayedKnockout.league.playin[0].a, table[12].id);
assert.equal(unplayedKnockout.league.playin[0].b, table[19].id);
const seed = fixtures[0].state;
function invalid(key, change) {
  const s = clone(seed);
  change(s);
  assert.equal(T.validTour(s), false, key);
  fixtures.push({ key, expected: false, state: s });
}
invalid("bad-quota", (s) => (s.roster[0] = "BRA"));
invalid("duplicate", (s) => (s.roster[0] = s.roster[1]));
invalid("skipped-stage", (s) => (s.stage = 7));
invalid(
  "future-league",
  (s) =>
    (s.league.rounds[10][0].sets = [
      [25, 20],
      [25, 20],
      [25, 20],
    ]),
);
invalid(
  "premature-challenger",
  (s) => (s.challenger = C.freshChallenger(1, s.roster)),
);
invalid("missing-worldcup", (s) => (s.worldcup = null));
invalid("wrong-format", (s) => (s.league.playoffFormat = "double"));
invalid("wrong-entry", (s) => (s.league.playoffEntry = "invalid"));
const same = clone(seed);
T.simulateBatch(same);
assert(T.validTour(same));
const premature = clone(same);
premature.league.rounds[2][0].sets = [
  [25, 20],
  [25, 20],
  [25, 20],
];
assert(!T.validTour(premature));
fixtures.push({ key: "skipped-round", expected: false, state: premature });
fs.mkdirSync(".test-build/tour-fixtures", { recursive: true });
fixtures.forEach((f, i) =>
  fs.writeFileSync(`.test-build/tour-fixtures/${i}.json`, JSON.stringify(f)),
);
fs.writeFileSync(
  ".test-build/tour-fixtures/index.json",
  JSON.stringify(
    fixtures.map(({ key, expected }, i) => ({
      key,
      expected,
      file: i + ".json",
    })),
  ),
);
console.log(
  "PASS Tour: 24 complete seasons, exact 32-team quotas, 8 ordered stage gates, 10+10+11 rounds, shared Challenger roster, 24 World Cup entrants, bronze-first paths, 964 matches, fixed champions, future-stage/manual-score guards and corrupt-state rejection",
);
