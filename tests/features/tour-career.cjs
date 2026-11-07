const assert = require("node:assert/strict"),
  T = require("../../.test-build/tour-engine.js"),
  F = require("../../.test-build/full-engine.js"),
  K = require("../../.test-build/career-engine.js"),
  V = require("../../.test-build/engine.js"),
  C = require("../../.test-build/challenger-engine.js");
const { ui } = require("../support/tour-harness.cjs");
const clone = (s) => JSON.parse(JSON.stringify(s));
let random = 892103;
Math.random = () =>
  (random = (Math.imul(random, 1664525) + 1013904223) >>> 0) / 4294967296;
let allocations = 0,
  seasons = 0,
  allot0 = false,
  automaticRegion = false;
const outsideQuota = { CEV: 7, AVC: 4, NORCECA: 3, CAVB: 2, CSV: 0 };
assert.deepEqual(K.allocateCareerSlots(T.defaultRoster()), outsideQuota);
for (let a = 0; a <= 16; a++)
  for (let b = 0; b <= 16; b++)
    for (let c = 0; c <= 16; c++)
      for (let d = 0; d <= 13; d++) {
        const e = 32 - a - b - c - d;
        if (e < 0 || e > 6) continue;
        const counts = { CEV: a, AVC: b, NORCECA: c, CAVB: d, CSV: e },
          ids = F.regionOrder.flatMap((r) =>
            V.regionTeams(r)
              .slice(0, counts[r])
              .map((t) => t.id),
          ),
          q = K.allocateCareerSlots(ids, (allocations % 19) + 1);
        assert.equal(
          Object.values(q).reduce((a, b) => a + b, 0),
          16,
        );
        for (const r of F.regionOrder) {
          const cap = Math.min(
            V.regionTeams(r).length - counts[r],
            16 - counts[r],
          );
          assert(Number.isInteger(q[r]));
          assert(q[r] >= 0 && q[r] <= cap);
          if (cap > 0) assert(q[r] >= 1);
          else assert.equal(q[r], 0);
        }
        allocations++;
      }
let partial;
for (let chain = 0; chain < 10; chain++) {
  const ids = F.regionOrder.flatMap((r) =>
    V.shuffle(V.regionTeams(r))
      .slice(0, T.quotas[r])
      .map((t) => t.id),
  );
  let s = T.freshCareerTour(1, ids);
  for (let season = 0; season < 12; season++) {
    assert(T.validTour(s));
    const before = clone(s),
      old = s.roster,
      slots = s.worldcup.career.slots;
    if (!Object.values(slots).every((q) => q > 0)) allot0 = true;
    if (
      F.regionOrder.some(
        (r) =>
          slots[r] > 0 && slots[r] === s.worldcup.regions[r].teamIds.length,
      )
    )
      automaticRegion = true;
    for (let stage = 0; stage < 8; stage++) {
      assert.equal(s.stage, stage);
      assert.throws(() => T.nextStage(s));
      if (!chain && !season && stage === 4) partial = clone(s);
      T.finishStage(s);
      assert(T.validTour(s), `chain${chain} season${season} stage${stage}`);
      if (stage === 1) {
        const qualified = F.regionOrder.flatMap((r) =>
          F.careerRegionEntrants(s.worldcup, r),
        );
        assert.equal(qualified.length, 16);
        assert.equal(new Set(qualified).size, 16);
        assert(qualified.every((id) => !s.roster.includes(id)));
      }
      if (stage === 4) {
        assert.equal(T.careerStatus(s).league16.length, 16);
        assert(s.league.bracket.r16.every((m) => !m.sets));
      }
      if (stage === 5) {
        const status = T.careerStatus(s),
          p = s.worldcup.career.playin;
        assert.equal(status.qualified.length, 32);
        assert.equal(new Set(status.qualified).size, 32);
        assert.equal(status.promoted.length, status.relegated.length);
        assert.equal(
          p.double.rounds.flat().length,
          40 - (32 - p.double.seeds.length),
        );
        assert(status.challenger.every((id) => status.retained.includes(id)));
        assert(
          F.regionOrder.every(
            (r) =>
              status.qualified.filter((id) => V.get(id).region === r).length <=
              16,
          ),
        );
      }
      T.nextStage(s);
      assert(T.validTour(s));
    }
    assert.equal(T.played(s), T.seasonTotal(s));
    assert.equal(s.worldcup.world.groups.length, 8);
    assert.equal(F.worldThirds(s.worldcup.world).length, 0);
    assert.equal(F.worldEntrants(s.worldcup.world).length, 16);
    const placements = F.worldPlacements(s.worldcup);
    assert.equal(Object.keys(placements).length, 32);
    assert.equal(
      Object.values(placements).filter((p) => p.from === 17 && p.to === 24)
        .length,
      8,
    );
    assert.equal(
      Object.values(placements).filter((p) => p.from === 25 && p.to === 32)
        .length,
      8,
    );
    const pots = s.worldcup.world.pots;
    assert(pots.every((p) => p.length === 8));
    assert.deepEqual(
      [...pots[0]].sort(),
      s.league.bracket.r16.map(V.winner).sort(),
    );
    assert.deepEqual(
      [...pots[1]].sort(),
      s.league.bracket.r16.map(V.loser).sort(),
    );
    for (const g of s.worldcup.world.groups) {
      assert(
        pots.every(
          (p) => p.filter((id) => g.teamIds.includes(id)).length === 1,
        ),
      );
      assert(
        F.regionOrder.every(
          (r) => g.teamIds.filter((id) => V.get(id).region === r).length <= 2,
        ),
      );
    }
    const frozen = JSON.stringify(s),
      next = T.nextCareerSeason(s);
    assert.equal(JSON.stringify(s), frozen);
    assert.equal(next.seasonNumber, s.seasonNumber + 1);
    assert.equal(next.career.previousSeasonId, s.seasonId);
    assert.equal(next.career.chainId, s.career.chainId);
    assert.deepEqual(
      [...next.roster].sort(),
      s.worldcup.world.groups.flatMap((g) => g.teamIds).sort(),
    );
    assert.deepEqual(before.roster, old);
    s = next;
    seasons++;
  }
}
assert(
  allot0 && automaticRegion,
  "Long careers exercise inactive and automatically qualifying regions",
);
// Generate valid Challenger finalists in each overlap class rather than forging title metadata.
function finalists(roster, targets) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const c = C.freshChallenger(1, roster, true);
    while (!C.swissDone(c)) {
      for (const m of c.rounds.at(-1)) {
        const target = targets.find((id) => m.a === id || m.b === id);
        if (target)
          m.sets = Array.from({ length: 3 }, () =>
            m.a === target ? [25, 20] : [20, 25],
          );
        else V.simulate(m);
      }
      C.advanceChallenger(c);
      C.stampChallenger(c);
      if (!C.swissDone(c)) C.drawSwissRound(c);
    }
    C.drawChallengerPlayoff(c);
    const halves = targets.map((id) =>
      Math.floor(c.bracket.r16.findIndex((m) => m.a === id || m.b === id) / 4),
    );
    if (halves[0] === halves[1]) continue;
    for (const k of F.worldPlayOrder) {
      for (const m of c.bracket[k]) {
        const target = targets.find((id) => m.a === id || m.b === id);
        if (target)
          m.sets = Array.from({ length: 3 }, () =>
            m.a === target ? [25, 20] : [20, 25],
          );
        else V.simulate(m);
      }
      C.advanceChallenger(c);
      C.stampChallenger(c);
    }
    assert(C.validChallenger(c));
    assert.deepEqual(
      C.challengerPodium(c).slice(0, 2).sort(),
      [...targets].sort(),
    );
    return c;
  }
  throw Error("Unable to produce separated finalists");
}
T.finishStage(partial);
const l16 = partial.league.bracket.r16.flatMap((m) => [m.a, m.b]),
  rest = partial.roster.filter((id) => !l16.includes(id));
for (let d = 0; d <= 2; d++) {
  const s = clone(partial);
  const targets =
    d === 0 ? l16.slice(0, 2) : d === 1 ? [l16[0], rest[0]] : rest.slice(0, 2);
  s.challenger = finalists(s.roster, targets);
  assert(T.validTour(s));
  T.nextStage(s);
  assert(T.validTour(s));
  const p = s.worldcup.career.playin;
  assert.equal(p.double.seeds.length, 32 - d);
  assert.equal(p.preliminary.length, 0);
  assert.equal(T.careerStatus(s).playinTickets, 16 - d);
  const screen = ui("career", 3200 + d),
    api = screen.w.__tour;
  api.enter();
  api.model.records.push(api.recordOf(s));
  api.persist();
  api.open(s.seasonId);
  api.resume();
  const dom = screen.w.document;
  assert(
    dom
      .querySelector("[data-world-playin-double]")
      .textContent.includes(`${32 - d} đội tranh ${16 - d} vé World Cup`),
  );
  assert.equal(
    [
      ...dom.querySelectorAll(
        '[data-world-playin-slot^="WCU1"] .bracket-state',
      ),
    ].filter((el) => el.textContent === "Miễn đấu").length,
    d,
  );
  assert.equal(
    dom.querySelectorAll('[data-world-playin-slot^="WCL3"]').length,
    d,
  );
  api.finishStage();
  assert(T.validTour(api.selected().snapshot));
  assert.equal(
    dom.querySelectorAll("[data-world-playin-qualified]").length,
    16 - d,
  );
  assert.equal(
    dom.querySelectorAll("[data-world-playin-eliminated]").length,
    16,
  );
  screen.close();
  T.finishStage(s);
  assert(T.validTour(s));
  assert.equal(
    p.double.rounds.flat().length,
    40 - (32 - p.double.seeds.length),
  );
  assert.equal(T.careerStatus(s).qualified.length, 32);
  const corrupt = clone(s);
  corrupt.worldcup.career.playin.challenger.reverse();
  assert(!T.validTour(corrupt), "Forged champion order rejected");
  T.nextStage(s);
  T.finishStage(s);
  T.nextStage(s);
  assert(T.validTour(s));
  assert.equal(
    s.worldcup.world.pots[2].filter(
      (id) => targets.includes(id) && !l16.includes(id),
    ).length,
    d,
  );
  T.finishTour(s);
  assert(T.validTour(s));
}
const base = clone(partial);
for (const mutate of [
  (s) => (s.career.chainId = null),
  (s) => (s.seasonId = 123),
  (s) => s.worldcup.career.slots.CEV++,
  (s) => s.worldcup.regions.CEV.teamIds.push(s.roster[0]),
  (s) => s.league.rounds[0].push(s.league.rounds[1][0]),
  (s) => (s.worldcup.career.playin = {}),
  (s) => (s.stage = 7),
  (s) => (s.career.previousSeasonId = s.seasonId),
]) {
  const bad = clone(base);
  mutate(bad);
  assert(!T.validTour(bad));
}
assert.throws(() => T.nextCareerSeason(T.freshCareerTour()));
assert.throws(() => T.freshCareerTour(2));
console.log(
  `PASS career32: ${allocations} exhaustive regional allocations; ${seasons} chained seasons; all3 valid Challenger overlap cases;8stage gates;16 outsider qualifiers;38–40 double-elimination WCPlayin fixtures;64 WCfixtures;8groups/no third berths;4pots;cap16;promotion/relegation;inherited rosters;forged saves rejected`,
);
