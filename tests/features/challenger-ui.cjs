const assert = require("node:assert/strict"),
  C = require("../../.test-build/challenger-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
(async () => {
  const t = ui("new", 19191),
    d = t.w.document,
    api = t.w.__challenger;
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  const classic = t.run("JSON.stringify(state)");
  click('[data-action="Challenger.enter"]');
  assert(d.querySelector(".challenger-hero"));
  click('[data-action="Challenger.create"]');
  click('[data-action="Challenger.start"]');
  const id = api.selected().season_id;
  click('[data-action="Challenger.section"][data-arg="swiss"]');
  click('[data-action="Challenger.swissView"][data-arg="matches"]');
  assert.equal(d.querySelectorAll(".full-match").length, 16);
  assert.equal(d.querySelectorAll(".full-match .form-dot").length, 160);
  assert.equal(
    d.querySelectorAll(".swiss-round-nav button:disabled").length,
    4,
  );
  assert(!d.querySelector('[data-action="Challenger.next"]'));
  click('[data-action="Challenger.edit"]');
  assert(d.getElementById("editor").open);
  assert(!d.getElementById("setPlay0").hidden);
  assert(d.getElementById("setPlay1").hidden);
  for (let i = 0; i < 3; i++) {
    d.getElementById("a" + i).value = "25";
    d.getElementById("b" + i).value = "20";
  }
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  assert.equal(api.selected().played, 1);
  click('.full-match [data-action="Challenger.match"]');
  assert(d.querySelector(".full-match-scoreboard"));
  assert(d.querySelector(".full-match-sets"));
  assert(!d.querySelector('[data-action="Challenger.dialogSim"]'));
  d.getElementById("playoffMatchDialog").close();
  const nextId = api.selected().snapshot.rounds[0][1].id;
  click(`[data-action="Challenger.match"][data-arg="${nextId}"]`);
  click('[data-action="Challenger.dialogSim"]');
  assert.equal(api.selected().played, 2);
  click('[data-action="Challenger.restore"]');
  assert.equal(api.selected().played, 1);
  assert(C.validChallenger(api.selected().snapshot));
  click('[data-action="Challenger.simRound"]');
  assert.equal(api.selected().played, 16);
  assert(d.querySelector('[data-action="Challenger.next"]'));
  click('[data-action="Challenger.next"]');
  assert.equal(api.model.round, 1);
  assert.equal(api.selected().snapshot.rounds.length, 2);
  const locked = api.selected().snapshot.rounds[0][0].id;
  click('[data-action="Challenger.round"][data-arg="0"]');
  assert(!d.querySelector('.full-match [data-action="Challenger.edit"]'));
  api.edit(locked);
  assert(!d.getElementById("editor").open);
  click('[data-action="Challenger.section"][data-arg="table"]');
  const table0 = d.querySelector(".swiss-standings tbody").textContent;
  assert.equal(d.querySelectorAll(".swiss-standings tbody tr").length, 32);
  click('[data-action="Challenger.team"]');
  assert(d.getElementById("teamLeagueDialog").open);
  assert.equal(d.querySelectorAll("#teamLeagueRows tr").length, 1);
  d.getElementById("teamLeagueDialog").close();
  click('[data-action="Challenger.round"][data-arg="1"]');
  click('[data-action="Challenger.simRound"]');
  click('[data-action="Challenger.round"][data-arg="0"]');
  assert.equal(
    d.querySelector(".swiss-standings tbody").textContent,
    table0,
    "Historical rank, OMW and form do not leak future scores",
  );
  click('[data-action="Challenger.round"][data-arg="1"]');
  click('[data-action="Challenger.next"]');
  for (let round = 2; round < 5; round++) {
    click('[data-action="Challenger.simRound"]');
    click('[data-action="Challenger.section"][data-arg="overview"]');
    const expected = round === 2 ? 4 : round === 3 ? 10 : 16;
    assert.equal(
      api
        .selected()
        .snapshot.rounds.flat()
        .filter((m) => m.sets).length,
      [0, 0, 48, 60, 66][round],
    );
    assert.equal(
      C.challengerStandings(api.selected().snapshot).filter((r) => r.w === 3)
        .length,
      expected,
    );
    click('[data-action="Challenger.section"][data-arg="swiss"]');
    click('[data-action="Challenger.swissView"][data-arg="matches"]');
    click('[data-action="Challenger.next"]');
  }
  assert.equal(api.model.section, "playoff");
  click('[data-action="Challenger.draw"]');
  assert.equal(d.querySelectorAll(".full-tree-match").length, 16);
  d.querySelector(".full-bracket").scrollLeft = 420;
  click('.full-tree-match[data-action="Challenger.match"]');
  click('[data-action="Challenger.dialogSim"]');
  assert.equal(d.querySelector(".full-bracket").scrollLeft, 420);
  for (const key of ["r16", "qf", "sf"])
    click(`[data-action="Challenger.stage"][data-arg="${key}"]`);
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  const final = api.selected().snapshot.bracket.final[0];
  click(`[data-action="Challenger.match"][data-arg="${final.id}"]`);
  assert(!d.querySelector('[data-action="Challenger.dialogEdit"]'));
  assert(d.querySelector(".full-match-lock").textContent.includes("hạng ba"));
  d.getElementById("playoffMatchDialog").close();
  const bronze = api.selected().snapshot.bracket.bronze[0];
  click(`[data-action="Challenger.match"][data-arg="${bronze.id}"]`);
  click('[data-action="Challenger.dialogSim"]');
  assert(d.querySelector('[data-place="3"] h3'));
  assert(!d.querySelector('[data-place="2"] h3'));
  click(`[data-action="Challenger.match"][data-arg="${final.id}"]`);
  click('[data-action="Challenger.dialogSim"]');
  assert.equal(api.selected().status, "completed");
  assert.equal(api.selected().played, 82);
  assert(C.validChallenger(api.selected().snapshot));
  click('[data-action="Challenger.section"][data-arg="overview"]');
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  assert.equal(d.querySelectorAll('[data-place="2"] h3').length, 1);
  assert.equal(d.querySelectorAll(".swiss-standings tbody tr").length, 32);
  const saved = JSON.stringify(api.selected().snapshot);
  click('.full-tree-match[data-action="Challenger.match"]');
  assert(!d.querySelector('[data-action="Challenger.dialogEdit"]'));
  assert.equal(JSON.stringify(api.selected().snapshot), saved);
  d.getElementById("playoffMatchDialog").close();
  click('[data-action="Challenger.enter"]');
  click('[data-action="Challenger.create"]');
  click('[data-action="Challenger.start"]');
  assert.equal(api.model.records.length, 2);
  assert.equal(api.model.records[0].played, 82);
  click('[data-action="Challenger.section"][data-arg="swiss"]');
  click('[data-action="Challenger.swissView"][data-arg="matches"]');
  click('[data-action="Challenger.edit"]');
  const stale = JSON.stringify(api.selected().snapshot);
  api.model.token++;
  api.model.scope = "different-account";
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert.equal(JSON.stringify(api.selected().snapshot), stale);
  d.getElementById("editor").close();
  api.model.scope = "volleyworld-challenger-guest";
  await api.importSeasons({
    size: 20000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-challenger-seasons",
        version: 1,
        seasons: [JSON.parse(saved)],
      }),
  });
  assert.equal(api.model.records.length, 3);
  assert.equal(new Set(api.model.records.map((r) => r.season_id)).size, 3);
  assert.equal(api.model.records[2].played, 82);
  assert.equal(t.run("JSON.stringify(state)"), classic);
  const data = t.data();
  t.close();
  const reload = ui("new", 1711, data);
  reload.w.__challenger.enter();
  assert.equal(reload.w.__challenger.model.records.length, 3);
  reload.w.__challenger.open(id);
  assert(C.validChallenger(reload.w.__challenger.selected().snapshot));
  reload.close();
  console.log(
    "PASS Challenger UI: new mode, 5-round navigation, 3W/3L, manual/per-set editor, modal simulation, historical OMW/form/team details, exact fixed bracket, preserved scroll, bronze-first live podium, immutable summary, multiple seasons, stale-account guard, backup/import/reload and unchanged World League",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
