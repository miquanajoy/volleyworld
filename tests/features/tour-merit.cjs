const assert = require("node:assert/strict"),
  fs = require("node:fs");
const T = require("../../.test-build/tour-engine.js"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js");
const clone = (s) => JSON.parse(JSON.stringify(s)),
  fixtures = [];
let duplicate = 0;
for (let n = 0; n < 30; n++) {
  const s = T.freshMeritTour(n + 1);
  assert(T.validTour(s));
  assert.equal(T.seasonTotal(s), 948);
  if (!n) fixtures.push({ key: "fresh", expected: true, state: clone(s) });
  for (let stage = 0; stage < 8; stage++) {
    assert.equal(s.stage, stage);
    assert(T.validTour(s));
    assert.throws(() => T.nextStage(s));
    if (stage === 1) {
      const bad = clone(s);
      bad.worldcup.automatic = ["POL", "JPN"];
      assert(!T.validTour(bad));
      if (!n)
        fixtures.push({
          key: "premature-automatic",
          expected: false,
          state: bad,
        });
    }
    T.finishStage(s);
    assert(T.validTour(s), `done ${stage}`);
    if (stage === 1) {
      assert(F.regionOrder.every((r) => !s.worldcup.regions[r].playoff));
      assert(!s.worldcup.intercontinental);
    }
    if (stage === 5) {
      assert(V.complete(s.league));
      assert(!s.worldcup.intercontinental);
    }
    if (stage === 6) {
      assert.equal(s.worldcup.automatic.length, 2);
      assert.equal(new Set(s.worldcup.automatic).size, 2);
      const champ = V.winner(s.challenger.bracket.final[0]);
      const league = V.winner(s.league.bracket.final[0]);
      assert.deepEqual(s.worldcup.automatic, [
        league,
        league === champ ? V.loser(s.challenger.bracket.final[0]) : champ,
      ]);
      if (champ === league) duplicate++;
      assert.deepEqual(
        F.regionOrder.map((r) => F.meritRegionQualifiers(s.worldcup, r).length),
        [6, 4, 4, 3, 2],
      );
      assert.equal(F.intercontinentalPool(s.worldcup).length, 17);
      assert.deepEqual(
        s.worldcup.intercontinental.branches.map((b) => b.seeds.length).sort(),
        [5, 6, 6],
      );
      for (const r of ["CEV", "AVC"])
        assert.equal(
          F.qualifierAdvancers(s.worldcup.regions[r].playoff).length,
          4,
        );
      assert.equal(F.qualificationEntrants(s.worldcup).length, 24);
      assert.equal(new Set(F.qualificationEntrants(s.worldcup)).size, 24);
      assert.equal(F.worldCupBerths(s.worldcup).total, 24);
    }
    T.nextStage(s);
    assert(T.validTour(s), `stage ${s.stage}`);
    if (!n)
      fixtures.push({
        key: `stage-${s.stage}`,
        expected: true,
        state: clone(s),
      });
  }
  assert.equal(T.played(s), 948);
  assert.equal(T.matches(s).length, 948);
  assert.equal(T.podium(s).length, 3);
  assert.deepEqual(
    s.worldcup.world.pots.flat().sort(),
    F.qualificationEntrants(s.worldcup).sort(),
  );
  if (!n) {
    const base = clone(s);
    for (const [key, corrupt] of [
      ["forged-award", (s) => s.worldcup.automatic.reverse()],
      [
        "legacy-format",
        (s) => (s.worldcup.regionalFormat = "qualification-v2"),
      ],
      ["illegal-entry", (s) => (s.league.playoffEntry = "top16")],
      [
        "extra-regional-final",
        (s) => s.worldcup.regions.CEV.playoff.rounds.push([]),
      ],
      [
        "wrong-advance-slots",
        (s) => (s.worldcup.regions.AVC.playoff.advanceSlots = 2),
      ],
      [
        "duplicate-ic",
        (s) =>
          (s.worldcup.intercontinental.branches[0].seeds[0] =
            s.worldcup.intercontinental.branches[1].seeds[0]),
      ],
      ["wrong-pot", (s) => s.worldcup.intercontinental.pots[0].reverse()],
      ["unknown-rules", (s) => (s.rules = "unknown")],
    ]) {
      const bad = clone(base);
      corrupt(bad);
      assert(!T.validTour(bad), key);
      fixtures.push({ key, expected: false, state: bad });
    }
  }
}
// Exhaust all pairs of automatic teams in every group: enough eligible replacements in all five regions.
const fixture = fixtures.find((f) => f.key === "stage-6").state;
let pairs = 0;
for (const r of F.regionOrder) {
  const g = fixture.worldcup.regions[r];
  for (const group of g.groups || [g.teamIds])
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const s = clone(fixture.worldcup);
        s.automatic = [group[i], group[j]];
        const before = JSON.stringify(s);
        assert.equal(
          F.meritDirect(s, r).length,
          r === "CSV" ? 2 : F.qualificationGroups[r],
        );
        assert(F.meritDirect(s, r).every((id) => !s.automatic.includes(id)));
        if (r === "CSV")
          assert(!s.automatic.includes(F.meritGroupRows(s, r)[2].id));
        else {
          const ids = F.meritPlayoffSeeds(s, r);
          assert.equal(ids.length, F.qualificationGroups[r] * 2);
          assert.equal(new Set(ids).size, ids.length);
          assert(
            ids.every(
              (id) =>
                !s.automatic.includes(id) && !F.meritDirect(s, r).includes(id),
            ),
          );
        }
        assert.equal(JSON.stringify(s), before);
        pairs++;
      }
}
// Explicit double-title transfer for champions from every region.
for (const [a, b] of [
  ["POL", "ITA"],
  ["JPN", "IRI"],
  ["USA", "CAN"],
  ["EGY", "TUN"],
  ["BRA", "ARG"],
]) {
  const s = clone(fixture);
  const final = {
    id: "X",
    a,
    b,
    sets: [
      [25, 20],
      [25, 20],
      [25, 20],
    ],
  };
  s.league.bracket.final = [clone(final)];
  s.challenger.bracket.final = [clone(final)];
  assert.deepEqual(
    T.automaticBerths(s).map((t) => t.id),
    [a, b],
  );
}
const legacy = T.freshTour(99);
T.finishTour(legacy);
assert(T.validTour(legacy));
assert.equal(T.played(legacy), 964);
const dir = ".test-build/tour-merit-fixtures";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  `${dir}/index.json`,
  JSON.stringify(
    fixtures.map((f, i) => {
      const file = `${i}.json`;
      fs.writeFileSync(`${dir}/${file}`, JSON.stringify(f));
      return { file, key: f.key, expected: f.expected };
    }),
  ),
);
console.log(
  `PASS merit Tour:30 full948-match seasons, ${pairs} same-group award pairs across5regions, duplicate-title transfer,19+2+3 distinct entrants,17-team fair short-branch draw,8gates,forgery rejection,legacy964 compatibility; duplicate winners observed:${duplicate}`,
);
