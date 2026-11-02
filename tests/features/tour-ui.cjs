const assert = require("node:assert/strict"),
  T = require("../../.test-build/tour-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/tour-harness.cjs");
const t = ui("new", 81731),
  d = t.w.document,
  api = t.w.__tour;
const click = (selector) => {
  const e = d.querySelector(selector);
  assert(e, "Missing " + selector);
  assert(!e.disabled, "Disabled " + selector);
  e.click();
};
const select = (section) =>
  click(`[data-action="Tour.section"][data-arg="${section}"]`);
click('[data-action="Tour.enter"]');
assert(d.querySelector(".tour-hero"));
assert(d.querySelector(".tour-empty"));
click('[data-action="Tour.create"]');
assert.equal(api.model.records.length, 0, "Setup is a draft");
assert.equal(d.querySelectorAll(".tour-region-tabs button").length, 5);
assert(T.validRoster(api.model.setup.ids));
const outgoing = api.model.setup.ids.find((id) => V.get(id).region === "CEV"),
  incoming = V.catalog.find(
    (team) => team.region === "CEV" && !api.model.setup.ids.includes(team.id),
  ).id;
click(`[data-action="Tour.toggleTeam"][data-arg="${outgoing}"]`);
assert(d.querySelector('[data-action="Tour.start"]').disabled);
click(`[data-action="Tour.toggleTeam"][data-arg="${incoming}"]`);
click('[data-action="Tour.start"]');
// This suite preserves the previous Tour calendar as a loaded legacy snapshot.
// The merit calendar is covered separately against the real production start flow.
delete api.selected().snapshot.rules;
api.selected().snapshot.worldcup.regionalFormat = "qualification-v2";
delete api.selected().snapshot.worldcup.automatic;
api.selected().total_matches = 964;
api.section("journey");
const id = api.selected().season_id;
assert(api.selected().snapshot.roster.includes(incoming));
assert(!api.selected().snapshot.roster.includes(outgoing));
assert.equal(d.querySelectorAll(".tour-journey-card").length, 8);
assert.equal(
  d.querySelectorAll(".tour-journey-card button:disabled").length,
  7,
);
api.viewStage("7");
assert.equal(api.model.stage, 0, "Cannot jump to a future event");
assert.equal(
  d.querySelectorAll("[data-competition-overview]").length,
  3,
  "All three competitions remain visible",
);
const previewBefore = JSON.stringify(api.selected().snapshot);
click('[data-action="Tour.competition"][data-arg="challenger"]');
assert.equal(
  api.selected().snapshot.stage,
  0,
  "Inspecting a future competition does not advance the season",
);
assert(d.querySelector(".tour-empty").textContent.includes("chờ khởi tranh"));
assert.equal(d.querySelectorAll(".tour-roster-team").length, 32);
assert(!d.querySelector('[data-action="Tour.simRound"]'));
click('[data-action="Tour.competition"][data-arg="worldcup"]');
assert.equal(d.querySelectorAll("[data-berth-region]").length, 5);
assert.equal(d.querySelectorAll("[data-qualified-team]").length, 0);
assert.equal(
  JSON.stringify(api.selected().snapshot),
  previewBefore,
  "Previews are read-only",
);
click('[data-action="Tour.competition"][data-arg="league"]');
assert.equal(d.querySelectorAll(".tour-competition-phases > button").length, 4);

click('[data-action="Tour.viewStage"][data-arg="0"]');
assert.equal(d.querySelectorAll(".full-match").length, 16);
assert.equal(d.querySelectorAll(".tour-round-nav button").length, 10);
const first = api.selected().snapshot.league.rounds[0][0];
click(`[data-action="Tour.edit"][data-arg="${first.id}"]`);
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
// Corrections remain available while this round is still active.
click(`[data-action="Tour.edit"][data-arg="${first.id}"]`);
for (let i = 0; i < 3; i++) d.getElementById("b" + i).value = "18";
d.getElementById("scoreForm").dispatchEvent(
  new t.w.Event("submit", { bubbles: true, cancelable: true }),
);
assert.equal(api.selected().played, 1);
assert.equal(api.selected().snapshot.league.rounds[0][0].sets[0][1], 18);

const next = api.selected().snapshot.league.rounds[0][1];
click(`[data-action="Tour.match"][data-arg="${next.id}"]`);
click('[data-action="Tour.dialogSim"]');
assert.equal(api.selected().played, 2);
api.simMatch(api.selected().snapshot.league.rounds[10][0].id);
assert.equal(
  api.selected().played,
  2,
  "Later League phase cannot be simulated early",
);
click('[data-action="Tour.simRound"]');
select("table");
click('[data-action="Tour.round"][data-arg="0"]');
const table0 = d.querySelector(".tour-standings tbody").textContent;
api.showMatch(first.id);
const detailForm0 = [...d.querySelectorAll("#playoffMatchBody .form-strip")]
  .map((e) => e.textContent)
  .join("|");
assert.equal(d.querySelectorAll("#playoffMatchBody .form-strip").length, 2);
d.getElementById("playoffMatchDialog").close();

click('[data-action="Tour.simRound"]');
click('[data-action="Tour.round"][data-arg="0"]');
assert.equal(
  d.querySelector(".tour-standings tbody").textContent,
  table0,
  "Old League standings/form remain unchanged",
);
assert.equal(d.querySelectorAll(".tour-standings tbody tr").length, 32);
const navigationSnapshot = JSON.stringify(api.selected().snapshot);
select("matches");
assert.equal(
  api.model.round,
  0,
  "Switching to fixtures retains the historical round",
);
select("table");
assert.equal(
  api.model.round,
  0,
  "Switching back to standings retains the historical round",
);
assert.equal(d.querySelector(".tour-standings tbody").textContent, table0);
assert.equal(JSON.stringify(api.selected().snapshot), navigationSnapshot);
api.enter();
api.open(id);
assert.equal(
  api.model.section,
  "matches",
  "An unfinished season opens directly on its playable stage",
);
assert.equal(
  api.model.round,
  2,
  "Opening season resumes first unfinished round",
);
assert.equal(d.querySelectorAll(".tour-main-nav > button").length, 4);
assert(
  !d.querySelector('[data-action="Tour.exportOne"]').closest("details").open,
);
api.round("0");
select("table");

api.showTeam(first.a);
assert.equal(
  d.querySelectorAll("#teamLeagueSummary .tour-team-stats > span").length,
  3,
);
assert.equal(d.querySelectorAll("#teamLeagueRows tr").length, 31);
assert.equal(
  d.querySelectorAll("#teamLeagueRows .team-league-result").length,
  1,
  "Old-round team modal only counts results through that round",
);
assert(
  d
    .querySelector("#teamLeagueRows .tour-team-round")
    .textContent.startsWith("Vòng "),
);
assert(
  !d.querySelector("#teamLeagueRows").textContent.includes("L0-"),
  "Raw schedule IDs never appear as round labels",
);
assert.equal(
  d.querySelectorAll("#teamLeagueRows .team-league-sets > span").length,
  3,
);
d.getElementById("teamLeagueDialog").close();

api.showMatch(first.id);
assert.equal(
  [...d.querySelectorAll("#playoffMatchBody .form-strip")]
    .map((e) => e.textContent)
    .join("|"),
  detailForm0,
  "Old match detail forms do not leak later League games",
);
d.getElementById("playoffMatchDialog").close();

for (let stage = 0; stage < 8; stage++) {
  assert.equal(api.selected().snapshot.stage, stage);
  assert.equal(api.model.stage, stage);
  if (stage === 1) {
    const calendar = JSON.stringify(api.selected().snapshot);
    click('[data-action="Tour.competition"][data-arg="league"]');
    assert.equal(api.model.stage, 0);
    assert.equal(api.selected().snapshot.stage, 1);
    assert(
      d
        .querySelector('[data-competition-overview="league"]')
        .classList.contains("is-selected"),
    );
    assert(d.querySelector('[data-competition-overview="worldcup"] .is-live'));
    assert(
      d
        .querySelector(".tour-calendar-context")
        .textContent.includes("Vòng loại khu vực"),
    );
    assert(
      !d.querySelector('[data-action="Tour.simRound"]'),
      "Inspecting paused League cannot simulate current WorldCup matches",
    );
    assert.equal(JSON.stringify(api.selected().snapshot), calendar);
    click('[data-action="Tour.resume"]');
    assert.equal(api.model.stage, 1);
    click('[data-action="Tour.competition"][data-arg="worldcup"]');
    assert.equal(
      api.model.section,
      "matches",
      "World Cup opens active qualifying rather than a ticket detour",
    );
    select("matches");
    assert.equal(
      d.querySelectorAll("[data-regional-group]").length,
      6,
      "Europe opens on six compact group tables",
    );
    assert.equal(
      d.querySelectorAll(".tour-regional-compact tbody tr").length,
      39,
    );
    click('[data-action="Tour.group"][data-arg="0"][data-section="table"]');
    assert.equal(
      api.model.section,
      "table",
      "Group overview opens its exact standings in one click",
    );
    assert.equal(d.querySelectorAll(".tour-group-table").length, 1);
    select("matches");
    assert.equal(api.model.group, 0);
    assert.equal(d.querySelectorAll(".tour-group-table").length, 1);
    assert(d.querySelector(".tour-group-fixtures"));
    assert(d.querySelectorAll(".full-match").length > 0);
    click('[data-action="Tour.group"][data-arg="all"]');
    assert.equal(d.querySelectorAll("[data-regional-group]").length, 6);
    select("table");
    click('[data-action="Tour.region"][data-arg="CSV"]');
    assert.equal(d.querySelectorAll(".tour-group-table tbody tr").length, 6);
    select("playoff");
    assert(
      d.querySelector(".tour-empty").textContent.includes("không có playoff"),
    );
    click('[data-action="Tour.region"][data-arg="CEV"]');
  }
  if (stage === 2) {
    select("matches");
    assert.equal(d.querySelectorAll(".tour-round-nav button").length, 10);
    assert.equal(d.querySelector(".tour-round-nav button").dataset.arg, "10");
  }
  if (stage === 3) {
    assert.deepEqual(
      [...api.selected().snapshot.challenger.roster].sort(),
      [...api.selected().snapshot.roster].sort(),
    );
    select("matches");
    assert.equal(d.querySelectorAll("[data-swiss-node]").length, 15);
    assert.equal(d.querySelectorAll(".swiss-map-match").length, 16);
    click('[data-action="Tour.swissView"][data-arg="matches"]');
    assert.equal(d.querySelectorAll(".full-match").length, 16);
    click('[data-action="Tour.simRound"]');
    assert.equal(api.selected().snapshot.challenger.rounds.length, 2);
    select("table");
    click('[data-action="Tour.round"][data-arg="0"]');
    const swiss0 = d.querySelector(".tour-standings tbody").textContent;
    click('[data-action="Tour.simRound"]');
    click('[data-action="Tour.round"][data-arg="0"]');
    assert.equal(
      d.querySelector(".tour-standings tbody").textContent,
      swiss0,
      "Old Swiss standings/form remain unchanged",
    );
  }
  if (stage === 4) {
    select("matches");
    assert.equal(d.querySelectorAll(".tour-round-nav button").length, 11);
    assert.equal(d.querySelector(".tour-round-nav button").dataset.arg, "20");
  }
  if (stage === 5) {
    select("playoff");
    assert.equal(d.querySelectorAll(".tour-qualifier-branch").length, 3);
    assert.equal(d.querySelectorAll(".qualification-tree").length, 3);
    assert.equal(
      d.querySelectorAll('#content [data-action^="Full."]').length,
      0,
      "All qualifier actions belong to Tour",
    );
    api.qualifierStage("IC0");
    assert(
      api
        .selected()
        .snapshot.worldcup.intercontinental.branches[0].rounds.flat()
        .some((m) => m.sets),
    );
    assert(
      api
        .selected()
        .snapshot.worldcup.intercontinental.branches.slice(1)
        .every((b) => b.rounds.flat().every((m) => !m.sets)),
      "A branch's run button only simulates its own matches",
    );
  }
  if (stage === 6) {
    select("playoff");
    assert.equal(
      d.querySelectorAll(".full-match").length,
      4,
      "League Play-in has four matches",
    );
    click('[data-action="Tour.simRound"]');
    assert(
      !api.selected().snapshot.league.bracket.r20,
      "Original top12 format has no round20",
    );
    assert.equal(
      d.querySelectorAll(".full-tree-match").length,
      16,
      "Connected playoff tree is inherited",
    );
    api.stage("r16");
    assert(api.selected().snapshot.league.bracket.r16.every((m) => m.sets));
    assert(
      api.selected().snapshot.league.bracket.qf.every((m) => !m.sets),
      "Running one stage does not run its successor",
    );
  }
  if (stage === 7) {
    select("matches");
    const beforeBrowse = JSON.stringify(api.selected().snapshot);
    assert.equal(d.querySelectorAll("[data-world-group]").length, 6);
    assert.equal(
      d.querySelectorAll(".tour-world-group .full-group-team").length,
      24,
    );
    click('[data-action="Tour.group"][data-arg="2"][data-section="table"]');
    assert.equal(api.model.section, "table");
    select("matches");
    assert.equal(d.querySelectorAll("[data-world-group]").length, 1);
    assert.equal(d.querySelector("[data-world-group]").dataset.worldGroup, "2");
    assert.equal(d.querySelectorAll(".full-match").length, 2);
    select("table");
    assert.equal(
      d.querySelectorAll(".tour-world-tables .tour-group-table").length,
      1,
    );
    assert(
      d.querySelector(".tour-world-tables h3").textContent.includes("Bảng C"),
    );
    click('[data-action="Tour.group"][data-arg="all"]');
    assert.equal(
      d.querySelectorAll(".tour-world-tables .tour-group-table").length,
      6,
    );
    assert.equal(JSON.stringify(api.selected().snapshot), beforeBrowse);
    select("matches");
    assert.equal(
      d.querySelectorAll(".full-match").length,
      12,
      "One matchday spans all six World Cup groups",
    );
    click('[data-action="Tour.simRound"]');
    assert.equal(
      api
        .selected()
        .snapshot.worldcup.world.groups.flatMap((g) => g.rounds.flat())
        .filter((m) => m.sets).length,
      12,
    );
    select("table");
    click('[data-action="Tour.round"][data-arg="0"]');
    const world0 = [...d.querySelectorAll(".tour-group-table tbody")]
      .map((e) => e.textContent)
      .join("|");
    click('[data-action="Tour.simRound"]');
    click('[data-action="Tour.round"][data-arg="0"]');
    assert.equal(
      [...d.querySelectorAll(".tour-group-table tbody")]
        .map((e) => e.textContent)
        .join("|"),
      world0,
      "Old world group/third-place tables remain unchanged",
    );
  }
  if (api.model.section === "journey") select("matches");
  click('[data-action="Tour.finishStage"]');
  assert(T.stageDone(api.selected().snapshot));
  assert(T.validTour(api.selected().snapshot));
  if (stage === 1) {
    select("table");
    click('[data-action="Tour.group"][data-arg="0"]');
    assert.equal(d.querySelectorAll(".tour-group-table").length, 1);
    assert(!d.querySelector(".tour-regional-tickets").open);
    assert(!d.querySelector(".tour-group-table").closest("details"));
    select("playoff");
    assert(d.querySelector(".qualification-tree"));
  }
  if (stage === 3) {
    select("playoff");
    assert.equal(d.querySelectorAll(".full-tree-match").length, 16);
    assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  }
  assert(
    !d.querySelector('[data-action="Tour.simMatch"]'),
    "Completed stage offers no simulation",
  );
  click('[data-action="Tour.next"]');
}
assert.equal(api.selected().status, "completed");
assert.equal(api.selected().played, 964);
assert.equal(d.querySelectorAll(".tour-champions > section").length, 3);
assert.equal(d.querySelectorAll(".tour-journey-recap > li").length, 8);
assert(
  !d.querySelector(".tour-journey-disclosure").open,
  "Finished journey recap is collapsed",
);
assert.equal(d.querySelectorAll(".tour-summary-podium > li").length, 9);
for (const place of [1, 2, 3])
  assert.equal(d.querySelectorAll(`[data-medal-place="${place}"]`).length, 3);
const completed = JSON.stringify(api.selected().snapshot);
click('[data-action="Tour.section"][data-arg="qualifiers"]');
assert.equal(d.querySelectorAll("[data-qualified-team]").length, 24);
assert(
  d
    .querySelector(".tour-world-berths-heading")
    .textContent.includes("MỚI NHẤT"),
);

for (let stage = 0; stage < 8; stage++) {
  const competition =
    stage === 3
      ? "challenger"
      : [1, 5, 7].includes(stage)
        ? "worldcup"
        : "league";
  click(`[data-action="Tour.competition"][data-arg="${competition}"]`);
  click(`[data-action="Tour.viewStage"][data-arg="${stage}"]`);
  assert.equal(d.querySelectorAll("[data-competition-overview]").length, 3);
  assert.equal(
    d.querySelectorAll(".tour-competition-phases > button").length,
    competition === "league" ? 4 : competition === "worldcup" ? 3 : 1,
    "Only selectedcompetition phases appear",
  );
  for (const section of ["matches", "table", "playoff"]) {
    select(section);
    assert(d.querySelector(".tour-page"));
    if (stage === 1 && section !== "playoff") {
      assert.equal(
        d.querySelectorAll(".tour-qualified-list > div").length,
        21,
        "Regional history excludes later Play-in tickets",
      );
      assert(
        !d
          .querySelector(".tour-qualified-list")
          .textContent.includes("Play-in"),
      );
    }
    if (stage === 5 && section === "table") {
      assert.equal(
        d.querySelectorAll(".tour-qualified-list > div").length,
        24,
        "Play-in winners update their region's World Cup qualifiers",
      );
    }
    assert(!d.querySelector('[data-action="Tour.finishStage"]'));
    assert(!d.querySelector('[data-action="Tour.simMatch"]'));
    assert(!d.querySelector('[data-action="Tour.edit"]'));
  }
}
assert.equal(
  JSON.stringify(api.selected().snapshot),
  completed,
  "History browsing never changes the season",
);

click('[data-action="Tour.achievements"]');
assert.equal(d.querySelectorAll(".tour-country-card").length, 39);
const profileId = api.model.records[0].snapshot.roster.find(
  (id) => V.get(id).region === "CEV",
);
click(`[data-action="Tour.achievementTeam"][data-arg="${profileId}"]`);
assert.equal(d.querySelectorAll("[data-achievement-season]").length, 1);
assert.equal(
  d.querySelectorAll("[data-achievement-season] [data-competition]").length,
  3,
);
click('[data-action="Tour.achievementCompetition"][data-arg="league"]');
assert.equal(api.model.achievementCompetition, "league");
click('[data-action="Tour.achievementTeam"][data-arg=""]');
assert.equal(d.querySelectorAll(".tour-country-card").length, 39);
const data = t.data();
t.close();
const reload = ui("new", 81732, data),
  restored = reload.w.__tour;
restored.enter();
restored.open(id);
assert(T.validTour(restored.selected().snapshot));
assert.equal(restored.selected().played, 964);
assert.equal(
  reload.w.document.querySelectorAll(".tour-champions > section").length,
  3,
);
reload.close();
console.log(
  "PASS Tour UI: exact regional setup, shared roster, eight gated stages, manual/per-set editor, dialog simulation, historical League/Swiss/world/third-place tables, regional and intercontinental brackets, global World Cup matchdays, League top12/play-in, all completed history tabs read-only, three champions, compact summary, all three podiums and persistence",
);
