const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { parityUi: ui, equivalent } = require("../support/parity-harness.cjs");
(async () => {
  const a = ui("main"),
    b = ui("new"),
    same = (label) => equivalent(a, b, label);
  for (const t of [a, b]) {
    t.run(
      fs.readFileSync(
        t === a
          ? "tests/fixtures/main/sync-core.js"
          : ".test-build/sync-core.js",
        "utf8",
      ),
    );
    t.run(
      fs.readFileSync(
        t === a ? "tests/fixtures/main/cloud.js" : ".test-build/cloud.js",
        "utf8",
      ),
    );
  }
  const click = (oldSelector, newSelector) => {
    assert(a.w.document.querySelector(oldSelector), oldSelector);
    assert(b.w.document.querySelector(newSelector), newSelector);
    a.w.document.querySelector(oldSelector).click();
    b.w.document.querySelector(newSelector).click();
  };
  const command = (old, newAction, args = "") =>
    click(`[onclick="${old}"]`, `[data-action="${newAction}"]${args}`);
  click("#heroSettings", "#heroAction");
  same("settings entry");
  command(
    "Settings.adjust('CEV',-1)",
    "Settings.adjust",
    '[data-arg="CEV"][data-arg1="-1"]',
  );
  same("quota minus");
  command("Settings.defaults()", "Settings.defaults");
  same("defaults");
  for (const [region, value] of [
    ["CEV", 12],
    ["AVC", 7],
  ])
    for (const t of [a, b]) {
      const el = t.w.document.querySelector(
        t === a
          ? `[onchange="Settings.setQuota('${region}',this.value)"]`
          : `[data-action="Settings.setQuota"][data-arg="${region}"]`,
      );
      el.value = value;
      el.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    }
  same("quota input change");
  command("Settings.next()", "Settings.next");
  same("next step");
  for (const id of ["POL", "ITA", "THA", "VIE"]) {
    click(
      `[onchange="Settings.toggle('${id}',this.checked)"]`,
      `[data-action="Settings.toggle"][data-arg="${id}"]`,
    );
    same("toggle " + id);
  }
  command("Settings.review()", "Settings.review");
  same("review");
  command("Settings.back()", "Settings.back");
  same("back");
  command("Settings.review()", "Settings.review");
  command("Settings.apply()", "Settings.apply");
  b.run("delete state.playoffEntry;save()"); // Compare legacy-rule seasons; expanded-single has its own suite.
  a.run("navigate('league')");
  same("apply");
  click("#heroAction", "#heroAction");
  same("start");
  command("round++;renderLeague()", "changeRound", '[data-arg="1"]');
  same("next round");
  command("round--;renderLeague()", "changeRound", '[data-arg="-1"]');
  same("previous round");
  for (const t of [a, b]) {
    const el = t.w.document.querySelector(
      t === a ? "select[onchange]" : 'select[data-action="selectRound"]',
    );
    el.value = 4;
    el.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  }
  same("select round");
  command("simRound()", "simRound");
  same("round button");
  a.run("navigate('table')");
  b.run("navigate('table')");
  click('[onclick^="showTeamLeague("]', '[data-action="showTeamLeague"]');
  same("details button");
  command(
    "document.getElementById('teamLeagueDialog').close()",
    "closeDialog",
    '[data-arg="teamLeagueDialog"]',
  );
  same("close dialog");
  a.run("navigate('home')");
  b.run("navigate('home')");
  command("Seasons.requestNew()", "Seasons.requestNew");
  same("active season decision");
  command(
    "Seasons.resolve('cancel',false)",
    "Seasons.resolve",
    '[data-arg="cancel"][data-arg1="false"]',
  );
  a.run("Seasons.customize()");
  same("cancel season + new setup");

  click("#accountButton", "#accountButton");
  same("account button");
  command(
    "document.getElementById('cloudDialog').close()",
    "closeDialog",
    '[data-arg="cloudDialog"]',
  );
  click("#saveProgress", "#saveProgress");
  await Promise.resolve();
  same("manual save button");
  assert.equal(b.w.document.getElementById("saveProgress").disabled, false);
  a.close();
  b.close();
  console.log(
    "PASS delegated actions vs main: setup/quotas/checkboxes/review/apply, round controls, team dialog, cancellation, account dialog and manual save",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
