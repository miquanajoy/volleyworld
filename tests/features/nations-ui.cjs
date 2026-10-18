const assert = require("node:assert/strict"),
  N = require("../../.test-build/nations-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
(async () => {
  const t = ui("new", 831),
    d = t.w.document,
    n = t.w.__nations;
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  const classic = t.run("JSON.stringify(state)"),
    full = t.w.localStorage.getItem("volleyworld-full-guest");
  click('[data-action="Nations.enter"]');
  assert(d.getElementById("homeHero").hidden);
  assert(d.getElementById("nav").hidden);
  click('[data-action="Nations.create"]');
  const first = n.selected();
  assert(first);
  assert.equal(first.played, 0);
  assert.equal(d.querySelectorAll(".nations-format section").length, 4);
  click('[data-action="Nations.section"][data-arg="groups"]');
  assert.equal(d.querySelectorAll(".full-match").length, 32);
  assert.equal(d.querySelectorAll(".rank-movement").length, 0);
  // Future rounds blocked, set simulation shared with other modes.
  n.roundNations("3");
  assert.equal(n.nationsModel.round, 0);
  click('[data-action="Nations.edit"]');
  assert(d.getElementById("editor").open);
  assert.equal(
    d.querySelectorAll('[data-action="simulateEditorSet"]:not([hidden])')
      .length,
    1,
  );
  click('[data-action="simulateEditorSet"]');
  assert.equal(
    d.querySelectorAll('[data-action="simulateEditorSet"]:not([hidden])')
      .length,
    1,
  );
  for (let i = 0; i < 5; i++) {
    d.getElementById("a" + i).value = i < 3 ? "25" : "";
    d.getElementById("b" + i).value = i < 3 ? "20" : "";
  }
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  assert.equal(n.selected().played, 1);
  click('[data-action="Nations.simRound"]');
  assert.equal(n.selected().played, 32);
  assert(d.querySelector('[data-action="Nations.next"]'));
  const historic = d.querySelector(".nations-division table").textContent;
  click('[data-action="Nations.next"]');
  assert.equal(n.nationsModel.round, 1);
  assert(d.querySelector('[data-action="Nations.simRound"]'));
  click('[data-action="Nations.simRound"]');
  n.roundNations("0");
  assert.equal(
    d.querySelector(".nations-division table").textContent,
    historic,
  );
  click('[data-action="Nations.team"]');
  assert.equal(d.querySelectorAll("#teamLeagueRows tr").length, 6);
  assert.equal(
    [...d.querySelectorAll("#teamLeagueRows tr")].filter(
      (r) => r.children[2].textContent,
    ).length,
    1,
  );
  d.getElementById("teamLeagueDialog").close();
  n.roundNations("1");
  for (let r = 2; r < 6; r++) {
    n.roundNations(String(r));
    n.simulateNationsRound();
  }
  assert.equal(n.selected().played, 192);
  assert(d.querySelector('[data-action="Nations.draw"]'));
  click('[data-action="Nations.draw"]');
  assert.equal(d.querySelectorAll(".full-playoff-tree .tree-stage").length, 3);
  assert.equal(d.querySelectorAll(".full-tree-match").length, 8);
  assert.equal(
    d.querySelector(".full-bracket-medals").children[0].dataset.worldStage,
    "final",
  );
  const m = n.selected().snapshot.playoff.qf[0];
  n.showNationsMatch(m.id);
  const before = JSON.stringify(n.selected().snapshot),
    scope = n.nationsModel.scope;
  n.nationsModel.scope = "other";
  n.actNationsDialog();
  assert.equal(JSON.stringify(n.selected().snapshot), before);
  assert(!d.getElementById("playoffMatchDialog").open);
  n.nationsModel.scope = scope;
  for (const k of ["qf", "sf"])
    click(`[data-action="Nations.stage"][data-arg="${k}"]`);
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  assert(d.querySelector('[data-action="Nations.stage"][data-arg="bronze"]'));
  const finale = n.selected().snapshot.playoff.final[0];
  n.simulateNationsMatch(finale.id);
  assert(!n.selected().snapshot.playoff.final[0].sets);
  click('[data-action="Nations.stage"][data-arg="bronze"]');
  assert(d.querySelector('[data-place="3"]').textContent.includes("HẠNG BA"));
  click('[data-action="Nations.stage"][data-arg="final"]');
  assert.equal(n.selected().played, 200);
  assert(!N.nationsComplete(n.selected().snapshot));
  for (const tier of ["B", "C", "D"]) {
    click(`[data-action="Nations.playoffTier"][data-arg="${tier}"]`);
    assert.equal(d.querySelectorAll(".full-tree-match").length, 7);
    assert.equal(d.querySelectorAll(".tree-bronze").length, 0);
    assert.equal(d.querySelectorAll("[data-promoted-team]").length, 0);
    click(`[data-action="Nations.stage"][data-arg="${tier}:qf"]`);
    assert.equal(d.querySelectorAll("[data-promoted-team]").length, 4);
    const promoted = [...d.querySelectorAll("[data-promoted-team]")].map(
      (e) => e.dataset.promotedTeam,
    );
    const lowerFinal = n.selected().snapshot.divisionPlayoffs[tier].final;
    assert.equal(lowerFinal.length, 0);
    n.simulateNationsStage(`${tier}:final`);
    assert.equal(n.selected().snapshot.divisionPlayoffs[tier].final.length, 0);
    click(`[data-action="Nations.stage"][data-arg="${tier}:sf"]`);
    click(`[data-action="Nations.stage"][data-arg="${tier}:final"]`);
    assert.deepEqual(
      [...d.querySelectorAll("[data-promoted-team]")].map(
        (e) => e.dataset.promotedTeam,
      ),
      promoted,
    );
    assert(d.querySelector(`[data-division-champion="${tier}"]`));
  }
  assert.equal(n.selected().played, 221);
  assert(N.nationsComplete(n.selected().snapshot));
  const firstState = JSON.stringify(n.selected().snapshot);
  n.simulateNationsMatch(m.id);
  assert.equal(JSON.stringify(n.selected().snapshot), firstState);
  n.sectionNations("overview");
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  assert.equal(d.querySelectorAll(".full-season-summary tbody tr").length, 64);
  await n.nextNationsSeason();
  const second = n.selected();
  assert.equal(second.cycle_number, 2);
  assert.equal(second.previous_id, first.season_id);
  assert(N.validNationsTransition(first.snapshot, second.snapshot));
  n.openNations(first.season_id);
  await n.nextNationsSeason();
  assert.equal(n.nationsModel.records.length, 2);
  assert.equal(n.selected(), second);
  n.createNations();
  assert.equal(n.nationsModel.records.length, 3);
  assert.equal(n.selected().cycle_number, 1);
  assert.notEqual(n.selected().campaign_id, second.campaign_id);
  await n.showNationsHonours();
  assert.equal(d.querySelectorAll(".full-honours tbody tr").length, 3);
  const bundle = {
    format: "volleyworld-nations-seasons",
    version: 1,
    seasons: [first.snapshot, second.snapshot],
  };
  await n.importNations({
    size: 200000,
    text: async () => JSON.stringify(bundle),
  });
  assert.equal(n.nationsModel.records.length, 5);
  const imported = n.nationsModel.records.slice(-2);
  assert(N.validNationsTransition(imported[0].snapshot, imported[1].snapshot));
  assert.notEqual(imported[0].season_id, first.season_id);
  assert.notEqual(imported[0].campaign_id, first.campaign_id);
  const total = n.nationsModel.records.length;
  await n.importNations({
    size: 20000,
    text: async () => JSON.stringify({ ...bundle, seasons: [second.snapshot] }),
  });
  assert.equal(n.nationsModel.records.length, total);
  assert.equal(t.run("JSON.stringify(state)"), classic);
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), full);
  const storage = t.data();
  t.close();
  const reload = ui("new", 832, storage);
  reload.w.__nations.enterNations();
  assert.equal(reload.w.__nations.nationsModel.records.length, 5);
  assert(reload.w.document.querySelector('[data-action="Nations.open"]'));
  reload.close();
  const legacy = N.freshNationsSeason();
  delete legacy.playoffFormat;
  delete legacy.divisionPlayoffs;
  N.finishNations(legacy);
  const oldRow = {
    season_id: legacy.seasonId,
    season_number: legacy.seasonNumber,
    created_at: legacy.createdAt,
    campaign_id: legacy.campaignId,
    cycle_number: 1,
    previous_id: null,
    status: "completed",
    played: 200,
    podium: N.nationsPodium(legacy),
    revision: 0,
    snapshot: legacy,
    dirty: true,
  };
  const oldUi = ui("new", 833, {
    "volleyworld-nations-guest": JSON.stringify([oldRow]),
  });
  const oldN = oldUi.w.__nations;
  oldN.enterNations();
  oldN.openNations(legacy.seasonId);
  oldN.sectionNations("rules");
  assert(oldUi.w.document.body.textContent.includes("200 trận"));
  oldN.sectionNations("playoff");
  assert.equal(
    oldUi.w.document.querySelectorAll('[data-action="Nations.playoffTier"]')
      .length,
    0,
  );
  assert.equal(oldUi.w.document.querySelectorAll(".full-tree-match").length, 8);
  await oldN.nextNationsSeason();
  assert.equal(oldN.selected().total_matches, 221);
  assert(N.validNationsTransition(legacy, oldN.selected().snapshot));
  oldUi.close();
  console.log(
    "PASS Nations League UI: mode isolation, 16-group shared matchdays, set editor, history snapshots/form/rank, 8-slot connected bracket, stale dialog guard, bronze-first podium, completed summary, promotion continuation, independent chains, import and reload",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
