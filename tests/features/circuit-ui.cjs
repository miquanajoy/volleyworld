const assert = require("node:assert/strict"),
  D = require("../../.test-build/circuit-engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
(async () => {
  const a = ui("local", 8142, {
      "volleyworld-tour-guest": '[{"old":true}]',
      "volleyworld-reset-test": "cutoff",
      "sb-keep-auth": "token",
    }),
    w = a.w,
    d = w.document,
    c = w.__circuit;
  const click = (selector) => {
    const e = d.querySelector(selector);
    assert(e, "Missing " + selector);
    assert(!e.disabled, "Disabled " + selector);
    e.click();
  };
  const finishStage = () => {
    c.finishStage();
    assert(d.getElementById("finishSeasonDialog").open);
    click('[data-action="Circuit.confirmFinish"]');
  };
  assert(d.querySelector(".tour-hero"));
  assert.equal(
    d.querySelector(".tour-hero").children.length,
    2,
    "Inherited hero has copy and route columns",
  );
  assert.equal(
    d.querySelectorAll(".circuit-region-grid > .full-region-summary").length,
    4,
  );
  assert.equal(
    d.querySelectorAll("footer [data-action^='Tour.']").length,
    0,
    "Footer uses the current circuit actions",
  );
  const fs = require("node:fs"),
    style = d.createElement("style");
  style.textContent = fs.readFileSync("src/styles/circuit.css", "utf8");
  d.head.append(style);
  assert.equal(
    w.getComputedStyle(d.querySelector(".full-region-summary")).padding,
    "24px",
    "Region cards inherit panel spacing",
  );
  assert.equal(
    w.getComputedStyle(d.querySelector(".circuit-region-grid"))
      .gridTemplateColumns,
    "repeat(4, minmax(0, 1fr))",
  );

  assert.equal(w.localStorage.getItem("volleyworld-tour-guest"), null);
  assert.equal(w.localStorage.getItem("sb-keep-auth"), "token");
  assert.equal(w.localStorage.getItem("volleyworld-reset-test"), "cutoff");
  click('[data-action="Circuit.create"]');
  assert(d.querySelector(".tour-setup"));
  assert.equal(
    d.querySelectorAll('[data-action="Circuit.setupRegion"]').length,
    4,
  );
  assert.equal(c.model.setup.selection.CEV.upper.length, 16);
  for (const tier of ["upper", "lower"]) {
    click(`[data-action="Circuit.setupTier"][data-arg="${tier}"]`);
    const draft = c.model.setup,
      zone = draft.selection.CEV,
      cap = tier === "upper" ? 16 : 8;
    const candidate = D.pool("CEV").find(
      (id) => !zone.upper.includes(id) && !zone.lower.includes(id),
    );
    const selector = `[data-action="Circuit.toggle"][data-arg="${candidate}"]`;
    assert(
      d.querySelector(selector).disabled,
      "Full roster disables unselected teams",
    );
    const direct = d.createElement("button");
    direct.dataset.arg = candidate;
    c.actions["Circuit.toggle"](direct);
    assert.equal(zone[tier].length, cap, "Controller also rejects overflow");
    const removed = zone[tier][0];
    click(`[data-action="Circuit.toggle"][data-arg="${removed}"]`);
    assert.equal(zone[tier].length, cap - 1);
    assert(!d.querySelector(selector).disabled);
    click(selector);
    assert.equal(zone[tier].length, cap);
    assert(zone[tier].includes(candidate));
    assert(
      d.querySelector(`[data-action="Circuit.toggle"][data-arg="${removed}"]`)
        .disabled,
    );
  }
  click('[data-action="Circuit.resetSelection"]');
  click('[data-action="Circuit.setupRegion"][data-arg="CAVB"]');
  assert.equal(d.querySelectorAll('[data-action="Circuit.toggle"]').length, 24);
  click('[data-action="Circuit.start"]');
  assert.equal(d.querySelectorAll(".tour-journey-card").length, 8);
  click('[data-action="Circuit.viewStage"][data-arg="0"]');
  assert(d.querySelector(".regional-double-columns"));
  assert(!d.textContent?.includes("Trận reset"));
  const pending = D.batch(c.selected().snapshot)[0];
  c.showMatch(pending.id);
  assert(d.getElementById("playoffMatchDialog").open);
  click('[data-action="Circuit.dialogEdit"]');
  assert(d.getElementById("editor").open);
  click('[data-action="simulateEditorSet"]:not([hidden])');
  assert(d.getElementById("a0").value);
  w.document.getElementById("generatedWinner").value = "1";
  w.document.getElementById("generatedLosses").value = "2";
  click('[data-action="generateScore"]');
  d.getElementById("scoreForm").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  assert.equal(c.selected().played, 1);
  c.showTeam(pending.a);
  assert(d.getElementById("teamLeagueDialog").open);
  d.getElementById("teamLeagueDialog").close();
  for (let stage = 0; stage < 8; stage++) {
    if (c.selected().snapshot.stage !== stage) throw Error("stage progression");
    for (const section of [
      "matches",
      "table",
      "playoff",
      "points",
      "qualifiers",
      "teams",
      "rules",
    ]) {
      click(`[data-action="Circuit.section"][data-arg="${section}"]`);
      assert(d.querySelector(".circuit-page"));
    }
    const s = c.selected().snapshot,
      before = JSON.stringify(s);
    c.renderCircuit();
    assert.equal(
      JSON.stringify(c.selected().snapshot),
      before,
      "Render is read only",
    );
    if ([0, 2, 4].includes(stage)) {
      click('[data-action="Circuit.section"][data-arg="matches"]');
      for (const r of D.regions) {
        click(`[data-action="Circuit.region"][data-arg="${r}"]`);
        for (const t of ["upper", "lower"]) {
          click(`[data-action="Circuit.tier"][data-arg="${t}"]`);
          if (stage !== 0 || t === "lower") {
            assert.equal(d.querySelectorAll(".tour-group-table").length, 2);
            click('[data-action="Circuit.group"][data-arg="0"]');
            assert.equal(d.querySelectorAll(".tour-group-table").length, 1);
            click('[data-action="Circuit.group"][data-arg="all"]');
          }
          if (stage === 0 && r === "CEV" && t === "upper") {
            w.confirm = () => false;
            const prior = c.selected().played;
            click('[data-action="Circuit.finishStage"]');
            assert(
              d
                .getElementById("finishSeasonDescription")
                .textContent.includes("Châu Âu · Hạng 1"),
            );
            click('#finishSeasonDialog [data-action="closeDialog"]');
            assert.equal(c.selected().played, prior);
          }
          finishStage();
          assert(
            D.leagueDone(
              c.selected().snapshot.regions[r].phases[D.phaseIndex(stage)][t],
            ),
          );
        }
      }
    } else if ([5, 7].includes(stage)) {
      click('[data-action="Circuit.section"][data-arg="matches"]');
      for (const r of D.regions) {
        click(`[data-action="Circuit.region"][data-arg="${r}"]`);
        finishStage();
      }
    } else finishStage();
    assert(
      D.stageDone(c.selected().snapshot),
      `stage ${stage}: ${d.getElementById("toast").textContent}`,
    );
    if (stage === 2) {
      click('[data-action="Circuit.tier"][data-arg="upper"]');
      click('[data-action="Circuit.section"][data-arg="playoff"]');
      assert(!d.querySelector("[data-circuit-bronze]"));
      assert(d.querySelector(".double-lower-scroll"));
      assert.equal(
        c.selected().snapshot.regions[c.model.region].phases[1].upper.bracket
          .kind,
        "double",
      );
      assert.equal(
        d.querySelectorAll(".circuit-final-standings tbody tr").length,
        16,
      );
    }
    if (stage === 3) {
      assert.equal(c.selected().snapshot.challenger.roster.length, 16);
      click('[data-action="Circuit.section"][data-arg="matches"]');
      assert(
        d.querySelector(".swiss-map-head").textContent.includes("8 vé playoff"),
      );
      click('[data-action="Circuit.section"][data-arg="playoff"]');
      assert(d.querySelector('[data-action="Circuit.match"]'));
      const line = d.querySelector(".nations-playoff-tree .full-team-line");
      assert(line.querySelector(".team-name").textContent.length > 0);
      assert.equal(
        w.getComputedStyle(line).gridTemplateColumns,
        "minmax(0, 1fr) 78px",
        "Unranked team rows keep a real name column",
      );
    }
    if ([5, 7].includes(stage)) {
      assert.equal(
        d.querySelectorAll("[data-circuit-bracket]").length >= 1,
        true,
      );
    }
    if (stage === 5) {
      for (const r of D.regions)
        assert.equal(
          d.querySelectorAll(`[data-phase-six-region="${r}"] li`).length,
          16,
        );
      click('[data-action="Circuit.viewStage"][data-arg="7"]');
      assert.equal(d.querySelectorAll("[data-phase-six-region]").length, 4);
      assert(!d.querySelector('[data-action="Circuit.finishStage"]'));
      click('[data-action="Circuit.viewStage"][data-arg="5"]');
    }
    if (stage === 6) {
      click('[data-action="Circuit.section"][data-arg="table"]');
      click('[data-action="Circuit.round"][data-arg="2"]');
      assert.equal(
        d.querySelectorAll('[data-playoff-status="qualified"]').length,
        16,
      );
      assert.equal(
        d.querySelectorAll('[data-playoff-status="eliminated"]').length,
        16,
      );
      click('[data-action="Circuit.round"][data-arg="0"]');
      assert.equal(d.querySelectorAll(".world-playoff-status").length, 0);
    }
    c.next();
  }
  assert.equal(c.selected().status, "completed");
  assert.equal(c.selected().played, 1175);
  assert.equal(D.podium(c.selected().snapshot).length, 3);
  const recap = c.selected().snapshot;
  const international = d.querySelector(".circuit-season-recap");
  assert.equal(
    international.querySelectorAll("[data-history-competition]").length,
    3,
  );
  assert.equal(international.querySelectorAll(".tour-history-award").length, 9);
  assert(
    international.nextElementSibling.querySelector("[data-next-tier-region]"),
  );
  for (const r of D.regions) {
    const region = d.querySelector(`[data-next-tier-region="${r}"]`);
    const upper = recap.regions[r].upper;
    const next = D.nextUpper(recap, r);
    assert.deepEqual(
      [...region.querySelectorAll("[data-next-tier-team]")].map(
        (el) => el.dataset.nextTierTeam,
      ),
      Array.from(next),
    );
    assert.deepEqual(
      [
        ...region.querySelectorAll(
          "[data-next-tier-team]:has(.circuit-roster-new)",
        ),
      ].map((el) => el.dataset.nextTierTeam),
      Array.from(next.filter((id) => !upper.includes(id))),
    );
    assert.deepEqual(
      [...region.querySelectorAll("[data-relegated-team]")].map(
        (el) => el.dataset.relegatedTeam,
      ),
      Array.from(upper.filter((id) => !next.includes(id))),
    );
  }
  await c.achievements();
  assert(d.querySelector(".tour-country-card"));
  for (const key of ["all", "league", "first", "challenger", "world"]) {
    click(`[data-action="Circuit.achievementCompetition"][data-arg="${key}"]`);
    assert(d.querySelector(".tour-country-card"));
    const el = d.querySelector('[data-action="Circuit.teamHistory"]');
    el.click();
    assert(d.querySelector(".full-standings"));
  }
  c.enter();
  assert.equal(d.querySelectorAll(".tour-history-awards > section").length, 3);
  assert.equal(d.querySelectorAll(".tour-history-award").length, 9);
  assert(d.querySelector(".tour-season-card .badge.gold"));
  const first = c.model.records[0].snapshot;
  await c.nextSeason(first.seasonId);
  assert(c.model.setup.parent === first.seasonId);
  for (const r of D.regions)
    assert(
      D.qualifiers(first, r).every((id) =>
        c.model.setup.selection[r].upper.includes(id),
      ),
    );
  assert.equal(c.model.setup.tier, "lower");
  c.start();
  assert.equal(c.selected().season_number, 2);
  const storage = a.data();
  a.close();
  const reload = ui("local", 8123, storage);
  assert.equal(reload.w.__circuit.model.records.length, 2);
  reload.close();
  console.log(
    "PASS circuit UI: inherited cards/editor/team dialog; all8 stages and4regions/2tiers; two-table/group filters; Swiss8; no reset; WC icons/history; medals filters; next-season selection; reload and legacy purge preserve auth",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
