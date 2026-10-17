const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
for (let i = 0; i < 40; i++) {
  const s = F.freshFullSeason(i + 1);
  assert(F.validFullSeason(s));
  assert.equal(F.fullMatches(s).length, 1263);
  assert.throws(() => F.drawWorld(s));
  for (const r of F.regionOrder) {
    const g = s.regions[r],
      n = g.teamIds.length,
      seen = new Set();
    assert.equal(g.rounds.length, n % 2 ? n : n - 1);
    for (const round of g.rounds) {
      assert.equal(
        new Set(round.flatMap((m) => [m.a, m.b])).size,
        round.length * 2,
      );
      for (const m of round) {
        const pair = [m.a, m.b].sort().join("-");
        assert(!seen.has(pair));
        seen.add(pair);
      }
    }
    assert.equal(seen.size, (n * (n - 1)) / 2);
    F.simulateLeague(g);
  }
  // One last unplayed match must keep the world gate locked, even with almost all results known.
  const last = s.regions.CSV.rounds.at(-1).at(-1),
    sets = last.sets;
  last.sets = null;
  assert.throws(() => F.drawWorld(s));
  last.sets = sets;
  F.stampFull(s);
  const qualifiers = F.regionalQualifiers(s);
  assert.equal(new Set(qualifiers).size, 24);
  for (const r of F.regionOrder)
    assert.equal(
      qualifiers.filter((id) => V.get(id).region === r).length,
      F.worldSlots[r],
    );
  F.drawWorld(s);
  assert(F.validFullSeason(s));
  const draw = JSON.stringify(s.world);
  F.worldThirds(s.world);
  assert.equal(JSON.stringify(s.world), draw);
  for (const g of s.world.groups) {
    for (const p of s.world.pots)
      assert.equal(p.filter((id) => g.teamIds.includes(id)).length, 1);
    for (const r of F.regionOrder)
      assert(g.teamIds.filter((id) => V.get(id).region === r).length <= 2);
  }
  assert.throws(() =>
    F.recordFullScore(s, s.regions.CEV.rounds[0][0].id, [
      [25, 20],
      [25, 20],
      [25, 20],
    ]),
  );
  assert.throws(() => F.drawWorldPlayoff(s));
  s.world.groups.forEach((g) => F.simulateLeague(g));
  F.stampFull(s);
  F.drawWorldPlayoff(s);
  assert(F.validFullSeason(s));
  const entrants = F.worldEntrants(s.world);
  assert.equal(
    new Set(s.world.bracket.r16.flatMap((m) => [m.a, m.b])).size,
    16,
  );
  assert(
    entrants.every((id) =>
      s.world.bracket.r16.some((m) => m.a === id || m.b === id),
    ),
  );
  F.finishFullSeason(s);
  assert(F.validFullSeason(s));
  assert(F.worldComplete(s));
  assert.equal(F.fullMatches(s).length, 1315);
  assert.equal(F.fullMatches(s).filter((m) => m.sets).length, 1315);
  assert.equal(F.worldPodium(s).length, 3);
  const places = F.worldPlacements(s);
  assert.equal(Object.keys(places).length, 24);
  assert.equal(Object.values(places).filter((p) => p.from === 17).length, 2);
  assert.equal(Object.values(places).filter((p) => p.from === 19).length, 6);
  const copy = structuredClone(s);
  copy.world.groups[0].rounds[0][0].sets = [
    [25, 24],
    [25, 20],
    [25, 20],
  ];
  assert(!F.validFullSeason(copy));
  const bad = structuredClone(s);
  bad.world.bracket.final[0].a = bad.world.bracket.final[0].b;
  assert(!F.validFullSeason(bad));
}
(async () => {
  const t = ui("new", 682),
    d = t.w.document,
    classic = t.run("JSON.stringify(state)");
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  click('[data-action="Full.enter"]');
  assert(
    d.getElementById("content").textContent.includes("Một mùa. Sáu giải đấu."),
  );
  click('[data-action="Full.create"]');
  assert(d.querySelector('[data-action="Full.drawWorld"]').disabled);
  click('[data-action="Full.section"][data-arg="CSV"]');
  assert.equal(d.querySelectorAll(".full-standings tbody tr").length, 6);
  click('[data-action="Full.edit"]');
  assert(d.getElementById("editor").open);
  click('[data-action="simulateEditorSet"]:not([hidden])');
  d.getElementById("generatedWinner").value = "0";
  d.getElementById("generatedLosses").value = "1";
  click('[data-action="generateScore"]');
  assert.equal(t.run("JSON.stringify(state)"), classic);
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  let rows = JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].played, 1);
  click('[data-action="Full.simRound"]');
  assert(d.querySelector('[data-action="Full.next"]'));
  click('[data-action="Full.next"]');
  click('[data-action="Full.section"][data-arg="overview"]');
  click('[data-action="Full.finish"]');
  assert(d.querySelector(".full-season-summary"));
  assert.equal(
    d.querySelectorAll(".full-season-summary .medal-card").length,
    3,
  );
  assert.equal(d.querySelectorAll(".full-finals-table tbody tr").length, 24);
  rows = JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest"));
  assert.equal(rows[0].played, 1315);
  assert.equal(rows[0].status, "completed");
  click('[data-action="Full.section"][data-arg="playoff"]');
  assert.equal(d.querySelectorAll('[data-action="Full.simMatch"]').length, 0);
  click('[data-action="Full.match"]');
  assert(d.getElementById("playoffMatchDialog").open);
  click('[data-action="closeDialog"][data-arg="playoffMatchDialog"]');
  click('[data-action="Full.library"]');
  click('[data-action="Full.create"]');
  assert.equal(
    JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest")).length,
    2,
  );
  const copy = t.data();
  t.close();
  const reload = ui("new", 9, copy);
  reload.w.document.querySelector('[data-action="Full.enter"]').click();
  assert(
    reload.w.document.getElementById("content").textContent.includes("Mùa 2"),
  );
  assert.equal(reload.run("JSON.stringify(state)"), classic);
  reload.close();
  console.log(
    "PASS Full Season: 40 complete seasons, 52,600 fixtures, bye schedules, gate, quotas, pots/regions, third-place qualification, fixed bracket, 24 placements, invalid-state rejection, shared score editor, independent multi-season storage, read-only history and reload",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
