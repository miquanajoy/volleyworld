const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const classic = (t, format) =>
  t.run(
    `state=V.fresh(undefined,'${format}');state.rounds.flat().forEach(V.simulate);V.startPlayin(state);state.playin.forEach(V.simulate);V.draw(state);save();navigate('playoff')`,
  );
const medal = (d, place) =>
  d.querySelector(`.live-podium [data-place="${place}"]`);
const assertAwards = (t, ids) =>
  ids.forEach((id, i) =>
    assert(medal(t.w.document, i + 1).textContent.includes(V.get(id).name)),
  );
(async () => {
  const t = ui("new", 198),
    d = t.w.document;
  classic(t, "single");
  assert(!d.querySelector(".live-podium"));
  t.w.setPlayoffLayout("tree");
  const finalColumn = d.querySelector(".tree-medal-stack");
  assert(finalColumn.closest(".playoff-tree-scroll"));
  assert(finalColumn.querySelector(".tree-final-slot"));
  assert(finalColumn.querySelector(".tree-bronze"));
  assert.equal(d.querySelectorAll(".tree-bronze").length, 1);
  for (const key of ["r16", "qf", "sf"]) t.w.simStage(key);
  assert.equal(d.querySelectorAll(".live-podium .medal-card").length, 3);
  assert(medal(d, 1).textContent.includes("Chờ kết quả chung kết"));
  assert(medal(d, 3).textContent.includes("Chờ kết quả hạng ba"));
  assert.equal(
    d.querySelector('[data-action="simStage"]').dataset.arg,
    "bronze",
  );
  d.querySelector('[data-action="simStage"]').click();
  const bronze = t.run("V.winner(state.bracket.bronze[0])");
  assert(medal(d, 3).textContent.includes(V.get(bronze).name));
  assert(medal(d, 1).textContent.includes("Chờ kết quả chung kết"));
  assert.equal(t.run("state.bracket.final[0].sets"), null);
  assert.equal(
    d.querySelector('[data-action="simStage"]').dataset.arg,
    "final",
  );
  const checkpoint = t.data(),
    before = t.run("JSON.stringify(state)");
  t.w.setPlayoffLayout("branches");
  t.w.setPlayoffLayout("tree");
  assert.equal(t.run("JSON.stringify(state)"), before);
  const reload = ui("new", 198, checkpoint);
  reload.run("navigate('playoff')");
  assert(medal(reload.w.document, 3).textContent.includes(V.get(bronze).name));
  reload.close();
  t.w.simStage("final");
  assertAwards(t, t.run("V.podium(state)"));
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  // Existing snapshots with the old final-first order remain playable and valid.
  classic(t, "single");
  for (const key of ["r16", "qf", "sf", "final"]) t.w.simStage(key);
  assert(t.run("V.validState(state)"));
  assert.equal(
    d.querySelector('[data-action="simStage"]').dataset.arg,
    "bronze",
  );
  assert(
    medal(d, 2).textContent.includes(
      t.run("V.get(V.loser(state.bracket.final[0])).name"),
    ),
  );
  t.w.simStage("bronze");
  assertAwards(t, t.run("V.podium(state)"));
  for (const reset of [false, true]) {
    classic(t, "double");
    t.w.setDoubleView("overview");
    assert.equal(d.querySelectorAll(".double-overview-panel").length, 3);
    assert.equal(
      d.querySelectorAll(".double-lower-tree .lower-tree-node").length,
      14,
    );
    assert(
      d.querySelector(
        '.double-overview-panel[aria-label="Nhánh thắng"] .playoff-tree',
      ),
    );
    assert(
      d.querySelector(
        '.double-overview-panel[aria-label="Nhánh thua"] .double-lower-tree',
      ),
    );
    assert.equal(d.querySelectorAll(".live-podium").length, 0);
    t.w.simStage("r16");
    assert.equal(
      t.run("doubleView"),
      "overview",
      "automatic simulation must keep both branches visible",
    );
    for (const def of V.playoffStages(t.run("state"))) {
      if (["gf", "reset"].includes(def.key)) break;
      t.w.simStage(def.key);
    }
    assert.equal(d.querySelectorAll(".live-podium .medal-card").length, 3);
    const third = t.run("V.loser(state.bracket.lower6[0])");
    assert(medal(d, 3).textContent.includes(V.get(third).name));
    assert(
      !d.querySelector(".double-bronze"),
      "bronze award should not repeat below the bracket",
    );
    t.run(
      `state.bracket.gf[0].sets=${reset ? "[[20,25],[20,25],[20,25]]" : "[[25,20],[25,20],[25,20]]"};V.advance(state);save();renderPlayoff()`,
    );
    if (reset) {
      assert(medal(d, 1).textContent.includes("Chờ chung kết tổng"));
      assert(medal(d, 3).textContent.includes(V.get(third).name));
      t.w.simStage("reset");
    }
    assertAwards(t, t.run("V.podium(state)"));
    const state = t.run("JSON.stringify(state)");
    for (const view of ["upper", "lower", "grand", "overview"])
      t.w.setDoubleView(view);
    assert.equal(t.run("JSON.stringify(state)"), state);
  }
  t.close();
  // Auto-finish records the actual bronze-before-final chronology in both modes.
  const s = V.fresh();
  V.finishAll(s);
  assert(s.bracket.bronze[0].resultOrder < s.bracket.final[0].resultOrder);
  assert(V.validState(s));
  const full = F.freshFullSeason(1);
  F.finishFullSeason(full);
  assert(
    full.world.bracket.bronze[0].resultOrder <
      full.world.bracket.final[0].resultOrder,
  );
  assert(F.validFullSeason(full));
  // Resume an active world playoff at the medal stage through the real Full UI.
  const b = full.world.bracket;
  b.final[0].sets = null;
  delete b.final[0].resultOrder;
  b.bronze[0].sets = null;
  delete b.bronze[0].resultOrder;
  const row = {
    season_id: full.seasonId,
    season_number: 1,
    created_at: full.createdAt,
    status: "active",
    played: 1313,
    podium: [],
    revision: 0,
    snapshot: full,
    dirty: true,
  };
  const f = ui("new", 2026, {
      "volleyworld-full-guest": JSON.stringify([row]),
    }),
    fd = f.w.document;
  fd.querySelector('[data-action="Full.enter"]').click();
  fd.querySelector('[data-action="Full.open"]').click();
  fd.querySelector('[data-action="Full.section"][data-arg="playoff"]').click();
  assert.equal(fd.querySelectorAll(".live-podium .medal-card").length, 3);
  assert.equal(
    fd.querySelector('.section-head > [data-action="Full.stage"]').dataset.arg,
    "bronze",
  );
  const medals = fd.querySelector(".full-bracket-medals");
  assert.equal(medals.children[0].dataset.worldStage, "final");
  assert.equal(medals.children[1].dataset.worldStage, "bronze");
  fd.querySelector('.section-head > [data-action="Full.stage"]').click();
  assert(!medal(fd, 3).textContent.includes("Chờ"));
  assert(medal(fd, 1).textContent.includes("Chờ"));
  assert.equal(
    fd.querySelector('.section-head > [data-action="Full.stage"]').dataset.arg,
    "final",
  );
  fd.querySelector('.section-head > [data-action="Full.stage"]').click();
  assert.equal(fd.querySelectorAll(".podium-grid").length, 1);
  assert.equal(fd.querySelectorAll(".medal-card").length, 3);
  assert.equal(fd.querySelectorAll(".full-finals-table tbody tr").length, 24);
  f.close();
  console.log(
    "PASS playoff overview: both branches together, fixed 14-match lower tree, medal matches inside final column, bronze-before-final UI and auto-finish chronology, early bronze/three pending slots, GF/reset, legacy final-first saves, reload, view-only invariance and Full Season podium",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
