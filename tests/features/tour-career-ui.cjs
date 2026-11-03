const assert = require("node:assert/strict"),
  T = require("../../.test-build/tour-engine.js"),
  { ui } = require("../support/tour-harness.cjs");
(async () => {
  const t = ui("career", 120983),
    api = t.w.__tour,
    d = t.w.document;
  const click = (selector) => {
    const el = d.querySelector(selector);
    assert(el, selector);
    assert(!el.disabled, selector);
    el.click();
  };
  api.enter();
  api.create();
  assert(api.model.setup, "First season opens team selection");
  api.start();
  const first = api.selected().season_id,
    chain = api.selected().snapshot.career.chainId;
  assert(T.career(api.selected().snapshot));
  assert.equal(
    api.selected().dirty,
    false,
    "Local career is never queued for production cloud",
  );
  assert.equal(d.querySelectorAll("[data-competition-overview]").length, 3);
  assert(!api.model.setup);
  for (let stage = 0; stage < 8; stage++) {
    assert.equal(api.selected().snapshot.stage, stage);
    api.resume();
    if (stage === 1) {
      assert(d.querySelector("[data-regional-group]"));
      api.group("0");
      assert.equal(d.querySelectorAll("[data-regional-group]").length, 1);
      api.section("playoff");
      assert(d.querySelector(".tour-page"));
      api.section("matches");
    }
    if (stage === 5) {
      assert(d.querySelector(".tour-career-playin"));
      api.section("qualifiers");
      assert(d.querySelectorAll("[data-qualified-team]").length >= 16);
      api.resume();
    }
    if (stage === 7) {
      assert.equal(d.querySelectorAll("[data-world-group]").length, 8);
      api.group("7");
      assert.equal(d.querySelectorAll("[data-world-group]").length, 1);
      api.section("table");
      assert(
        !d
          .getElementById("content")
          .textContent.includes("Cuộc đua các đội hạng ba"),
      );
      api.resume();
    }
    api.finishStage();
    assert(T.validTour(api.selected().snapshot));
    api.next();
  }
  assert.equal(api.selected().status, "completed");
  const completed = JSON.parse(JSON.stringify(api.selected().snapshot)),
    total = api.selected().total_matches;
  assert.equal(api.selected().played, total);
  assert.equal(d.querySelectorAll("[data-medal-place]").length, 9);
  const status = T.careerStatus(completed);
  assert.equal(status.qualified.length, 32);
  assert.equal(status.retained.length + status.promoted.length, 32);
  api.nextSeason(first);
  assert.equal(api.model.setup, null, "No team re-selection for later seasons");
  const second = api.selected().season_id;
  assert.notEqual(first, second);
  assert.equal(api.selected().snapshot.career.chainId, chain);
  assert.equal(api.selected().snapshot.career.previousSeasonId, first);
  assert.deepEqual(
    [...api.selected().snapshot.roster].sort(),
    [...status.qualified].sort(),
  );
  assert.equal(
    api.selected().snapshot.seasonNumber,
    completed.seasonNumber + 1,
  );
  api.nextSeason(first);
  assert.equal(api.selected().season_id, second, "Continuation is idempotent");
  const imported = ui("career", 120985),
    ia = imported.w.__tour;
  ia.enter();
  await ia.importSeasons({
    size: 1000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-tour-seasons",
        version: 1,
        seasons: api.model.records.map((r) => r.snapshot),
      }),
  });
  assert.equal(ia.model.records.length, 2);
  assert.notEqual(ia.model.records[0].chain_id, chain);
  assert.equal(
    ia.model.records[1].previous_season_id,
    ia.model.records[0].season_id,
  );
  assert(
    ia.model.records.every((r) => r.dirty === false && T.validTour(r.snapshot)),
  );
  assert.equal(
    ia.readScope(ia.model.scope).length,
    2,
    "Imported chain links survive validation and reload",
  );
  imported.close();
  api.open(first);
  assert(!d.querySelector('[data-action="Tour.simRound"]'));
  for (let stage = 0; stage < 8; stage++) {
    api.viewStage(String(stage));
    for (const section of ["matches", "table", "playoff"]) {
      api.section(section);
      assert(d.querySelector(".tour-page"));
    }
  }
  const restored = ui("career", 120984, t.data());
  restored.w.__tour.enter();
  restored.w.__tour.open(first);
  assert(
    restored.w.__tour.selected().snapshot,
    "Completed local career snapshot remains available after reload",
  );
  restored.w.__tour.open(second);
  assert(restored.w.__tour.selected().snapshot);
  restored.close();
  api.requestReset(first);
  assert(d.querySelector('[role="alertdialog"]'));
  api.cancelReset();
  assert.equal(api.model.records.length, 2);
  api.requestReset(first);
  api.model.token++;
  await api.confirmReset("discard");
  assert.equal(
    api.model.records.length,
    2,
    "Stale account confirmation cannot clear a chain",
  );
  api.cancelReset();
  api.requestReset(first);
  await api.confirmReset("export");
  assert.equal(
    api.model.records.length,
    2,
    "Failed export does not clear history",
  );
  api.cancelReset();
  const legacy = api.recordOf(T.freshMeritTour(3));
  api.model.records.push(legacy);
  api.persist();
  api.requestReset(first);
  await api.confirmReset("discard");
  assert.equal(api.model.records.length, 1);
  assert.equal(
    api.model.records[0].season_id,
    legacy.season_id,
    "Reset preserves unrelated legacy seasons",
  );
  assert(api.model.setup, "Reset returns to first-season selection");
  assert.equal(
    JSON.parse(t.w.localStorage.getItem(api.model.scope) || "[]").length,
    1,
  );
  const backups = JSON.parse(
    t.w.localStorage.getItem(api.model.scope + "-backups") || "[]",
  );
  assert(!backups.some((b) => b.state?.career?.chainId === chain));
  t.close();
  console.log(
    "PASS career Tour UI: eight-stage journey, outside-League regions, World Cup32/no third tickets, inherited roster, idempotent continuation, history and confirmed chain reset",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
