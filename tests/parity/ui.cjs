const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  {
    parityUi: ui,
    equivalent,
    normalizeLegacyData,
  } = require("../support/parity-harness.cjs");
assert.equal(
  fs.readFileSync("src/styles/app.css", "utf8"),
  fs.readFileSync("tests/fixtures/main/style.css", "utf8"),
  "CSS must remain byte-identical",
);
(async () => {
  let count = 0;
  for (const format of ["single", "double"]) {
    const a = ui("main"),
      b = ui("new"),
      same = (label) => {
        equivalent(a, b, format + ": " + label);
        count++;
      },
      both = (code) => {
        a.run(code);
        b.run(code);
      };
    same("home");
    both("navigate('settings')");
    same("setup");
    if (format === "double") {
      both("Settings.setPlayoffFormat('double')");
      same("format selection");
    }
    both(
      "Settings.setQuota('CEV',12);Settings.setQuota('AVC',7);Settings.next()",
    );
    same("mandatory roster changes");
    both(
      "Settings.toggle('POL',false);Settings.toggle('ITA',false);Settings.toggle('THA',true);Settings.toggle('VIE',true);Settings.review()",
    );
    same("review");
    both("Settings.apply()");
    b.run("delete state.playoffEntry;save()"); // Compare legacy-rule seasons; expanded-single has its own suite.
    a.run("navigate('league')");
    same("apply");
    a.w.document.getElementById("heroAction").click();
    b.w.document.getElementById("heroAction").click();
    same("start button");
    // Use the actual delegated handlers and the original inline handlers for each action.
    const click = (oldSelector, newSelector) => {
      a.w.document.querySelector(oldSelector).click();
      b.w.document.querySelector(newSelector).click();
    };
    click('[onclick^="editMatch("]', '[data-action="editMatch"]');
    same("open score editor");
    for (const [id, value] of [
      ["a0", "25"],
      ["b0", "20"],
      ["a1", "25"],
      ["b1", "24"],
    ])
      for (const t of [a, b]) {
        const el = t.w.document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new t.w.Event("input", { bubbles: true }));
      }
    same("live score + incomplete pairs");
    for (const t of [a, b])
      t.w.document
        .getElementById("scoreForm")
        .dispatchEvent(
          new t.w.Event("submit", { cancelable: true, bubbles: true }),
        );
    same("invalid set/focus");
    assert.equal(a.w.document.activeElement.id, b.w.document.activeElement.id);
    for (const [id, value] of [
      ["b1", "20"],
      ["a2", "25"],
      ["b2", "20"],
    ])
      for (const t of [a, b]) {
        const el = t.w.document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new t.w.Event("input", { bubbles: true }));
      }
    for (const t of [a, b])
      t.w.document
        .getElementById("scoreForm")
        .dispatchEvent(
          new t.w.Event("submit", { cancelable: true, bubbles: true }),
        );
    same("save score");
    both("navigate('table')");
    same("standings");
    both("showTeamLeague('VIE')");
    same("team dialog");
    both(
      "document.getElementById('teamLeagueDialog').close();navigate('league');simRound()",
    );
    same("simulate round");
    both("simLeague()");
    same("league complete");
    both("navigate('playoff');startPlayin()");
    same("play-in");
    both("simPlayin();drawBracket()");
    same("seeded bracket");
    both("setPlayoffLayout('tree')");
    same("tree");
    both("openPlayoffMatch('R0')");
    same("match details");
    both(
      "document.getElementById('playoffMatchDialog').close();setPlayoffLayout('branches')",
    );
    if (format === "double") {
      both("setDoubleView('lower')");
      same("lower branch");
      both("setDoubleView('grand')");
      same("grand final");
      both("setDoubleView('upper')");
    }
    // Hold completion order at the legacy baseline for data compatibility.
    // Production finishAll now plays bronze first (playoff-overview.cjs).
    both(
      "for(const d of V.playoffStages(state)){state.bracket[d.key].filter(m=>!m.sets).forEach(V.simulate);V.advance(state)}V.stampResults(state);save();render()",
    );
    same("finished");
    both("navigate('home');Seasons.start()");
    a.run("Seasons.customize()");
    same("new season + archive");
    both("navigate('history')");
    same("history");
    const id = a.run("Seasons.localRecords()[0].season_id");
    await a.w.Seasons.view(id);
    await b.w.Seasons.view(id);
    same("archived results");
    const bundleA = await a.w.Seasons.exportAll(),
      bundleB = await b.w.Seasons.exportAll();
    assert.equal(
      JSON.stringify(normalizeLegacyData(bundleA)),
      JSON.stringify(normalizeLegacyData(bundleB)),
      "exports equal",
    );
    const reloadA = ui("main", 5, a.data()),
      reloadB = ui("new", 5, b.data());
    equivalent(reloadA, reloadB, "reload");
    reloadA.close();
    reloadB.close();
    a.close();
    b.close();
  }
  console.log(
    `PASS differential UI/data: ${count} compatible legacy view/data checkpoints (approved UI additions tested separately); real DOM button/input/submit events; score errors/focus; both playoff formats; archive, export and reload; unchanged baseline CSS plus scoped feature styles`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
