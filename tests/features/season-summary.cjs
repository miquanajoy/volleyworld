const assert = require("node:assert/strict"),
  { ui } = require("../support/parity-harness.cjs");
(async () => {
  for (const format of ["single", "double"]) {
    const t = ui("new", format === "single" ? 13 : 29);
    t.run(
      `state=V.fresh(undefined,'${format}');V.finishAll(state);save();render()`,
    );
    const before = t.run("JSON.stringify(state)"),
      expected = t.run("V.finalPlacements(state)"),
      id = t.run("state.seasonId");
    await t.w.Seasons.view(id);
    const d = t.w.document;
    assert.equal(d.querySelectorAll(".podium-grid").length, 1);
    assert.equal(d.querySelectorAll(".medal-card").length, 3);
    assert.equal(d.querySelectorAll(".live-podium").length, 0);
    const rows = [...d.querySelectorAll("[data-summary-team]")];
    assert.equal(rows.length, 20);
    assert.equal(new Set(rows.map((r) => r.dataset.summaryTeam)).size, 20);
    for (const row of rows) {
      const p = expected[row.dataset.summaryTeam];
      assert(p && p.to <= 20);
      const rank = row.querySelector(".season-finish");
      assert.equal(
        rank.textContent,
        p.from <= 3
          ? ["🥇", "🥈", "🥉"][p.from - 1]
          : p.from === p.to
            ? `#${p.from}`
            : `#${p.from}–#${p.to}`,
      );
    }
    assert.equal(
      rows.filter((r) => r.cells[2].textContent === "Play-in").length,
      4,
    );
    if (format === "double")
      assert(
        rows.some((r) => r.cells[2].textContent === "Nhánh thua · vòng 5"),
      );
    const playoff = d.querySelector('[data-season-section="playoff"]'),
      league = d.querySelector('[data-season-section="league"]');
    assert(!playoff.open && !league.open);
    assert.equal(league.querySelectorAll("#rows tr").length, 32);
    playoff.open = true;
    league.open = true;
    t.w.setPlayoffLayout("tree");
    assert(d.querySelector('[data-season-section="playoff"]').open);
    assert(d.querySelector('[data-season-section="league"]').open);
    if (format === "double") {
      t.w.setDoubleView("lower");
      assert(d.querySelector('[data-season-section="playoff"]').open);
    }
    d.querySelector('[data-action="openPlayoffMatch"]').click();
    assert(d.getElementById("playoffMatchDialog").open);
    assert.equal(t.run("JSON.stringify(state)"), before);
    assert.equal(t.run("JSON.stringify(seasonView.snapshot)"), before);
    t.close();
  }
  console.log(
    "PASS completed season summary: one podium, 20 exact/grouped placements in both formats, four Play-in exits, collapsed playoff/32-team league, open-state retention, match detail and immutable snapshots",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
