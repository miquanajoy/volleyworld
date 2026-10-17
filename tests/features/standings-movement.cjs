const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const json = (x) => JSON.stringify(x),
  snapshot = (s) => JSON.parse(json(s));
// First result compares with the SAME persisted preseason tie order, not world ranks.
const first = V.fresh(),
  opening = first.rounds[0][0];
first.tie = [
  opening.b,
  opening.a,
  ...first.tie.filter((id) => ![opening.a, opening.b].includes(id)),
];
assert(
  Object.values(V.roundStandings(first, 0).changes).every((x) => x === null),
);
opening.sets = [
  [25, 20],
  [25, 20],
  [25, 20],
];
let view = V.roundStandings(first, 0);
assert.equal(view.rows[0].id, opening.a);
assert.equal(view.changes[opening.a], 1);
assert.equal(view.changes[opening.b], -31);
assert.equal(V.leagueRoundStatus(first, 0), "Đang đấu · tạm thời");
assert(
  Object.values(V.roundStandings(first, 1).changes).every((x) => x === 0),
  "unplayed subsequent round has equals signs",
);
for (const format of ["legacy", "expanded", "double"]) {
  const s = V.fresh(undefined, format === "double" ? "double" : "single");
  if (format === "expanded") s.playoffEntry = "top16";
  s.rounds.forEach((r) => r.forEach(V.simulate));
  V.stampResults(s);
  const before = json(s);
  for (let r = 0; r < 31; r++) {
    const v = V.roundStandings(s, r),
      baseline = V.standings({ ...s, rounds: s.rounds.slice(0, r + 1) }),
      previous = V.standings({ ...s, rounds: s.rounds.slice(0, r) });
    assert.equal(json(v.rows), json(baseline));
    assert.equal(
      v.rows.reduce((n, t) => n + t.w, 0),
      16 * (r + 1),
    );
    assert.equal(
      Object.values(v.changes).reduce((a, b) => a + b, 0),
      0,
    );
    for (const [i, t] of v.rows.entries())
      assert.equal(
        v.changes[t.id],
        previous.findIndex((x) => x.id === t.id) - i,
      );
    assert(
      v.snapshot.rounds
        .slice(r + 1)
        .flat()
        .every((m) => !m.sets && m.resultOrder === undefined),
    );
  }
  assert.equal(
    json(s),
    before,
    "reading history must not mutate or stamp results",
  );
  const r3 = json(V.roundStandings(s, 2));
  s.rounds[25][0].sets = [
    [0, 25],
    [0, 25],
    [0, 25],
  ];
  assert.equal(
    json(V.roundStandings(s, 2)),
    r3,
    "future correction cannot affect old round",
  );
  s.rounds[0][0].sets = [
    [25, 0],
    [25, 0],
    [25, 0],
  ];
  assert.notEqual(
    json(V.roundStandings(s, 2)),
    r3,
    "past correction recomputes history",
  );
  const old = V.roundStandings(snapshot(s), 2);
  assert.equal(
    json(old),
    json(V.roundStandings(s, 2)),
    "old saves can derive history without migration",
  );
  assert.throws(() => V.roundStandings(s, 31));
  assert.throws(() => V.roundStandings(s, NaN));
}
const out = V.fresh();
out.rounds[8].forEach(V.simulate);
assert.equal(V.latestLeagueRound(out), 8);
assert(V.roundStandings(out, 3).rows.every((t) => t.w + t.l === 0));
(async () => {
  const t = ui("new", 237),
    d = t.w.document;
  const fs = require("node:fs"),
    css = d.createElement("style");
  css.textContent = fs.readFileSync("src/styles/enhancements.css", "utf8");
  d.head.append(css);
  t.run("navigate('table')");
  assert.equal(d.querySelectorAll("#rows .rank-movement").length, 0);
  assert.equal(
    t.w.getComputedStyle(d.querySelector(".rank-legend .rank-up")).color,
    "rgb(22, 116, 67)",
  );
  assert.equal(
    t.w.getComputedStyle(d.querySelector(".rank-legend .rank-down")).color,
    "rgb(194, 76, 42)",
  );
  assert.equal(
    t.w.getComputedStyle(d.querySelector(".rank-legend .rank-same")).color,
    "rgb(152, 107, 0)",
  );
  const choose = (value) => {
    const el = d.getElementById("standingsRound");
    el.value = value;
    el.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  };
  choose("1");
  assert.equal(d.querySelectorAll("#rows .rank-same").length, 32);
  choose("latest");
  t.run(
    "state.rounds.slice(0,4).flat().forEach(V.simulate);V.stampResults(state);save();renderTable()",
  );
  assert.equal(d.querySelectorAll("#rows .rank-movement").length, 32);
  const full = json(t.run("state")),
    store = t.data(),
    expected = t.run("V.roundStandings(state,2)");
  choose("2");
  assert(
    d.querySelector(".standings-round-note").textContent.includes("vòng 3"),
  );
  const rows = [...d.querySelectorAll("#rows tr")];
  for (const [i, row] of rows.entries()) {
    const id = row.querySelector('[data-action="showTeamLeague"]').dataset.arg;
    assert.equal(id, expected.rows[i].id);
    assert.equal(
      Number(row.querySelector(".rank-movement").dataset.change),
      expected.changes[id],
    );
    assert(
      row
        .querySelector(".rank-movement")
        .getAttribute("aria-label")
        .includes("vòng 2"),
    );
    assert.equal(Number(row.cells[4].textContent), 3);
  }
  const topId = rows[0].querySelector('[data-action="showTeamLeague"]').dataset
    .arg;
  const search = d.getElementById("search");
  search.value = topId;
  search.dispatchEvent(new t.w.Event("input", { bubbles: true }));
  assert.equal(d.querySelectorAll("#rows tr").length, 1);
  assert.equal(
    Number(d.querySelector("#rows .rank-movement").dataset.change),
    expected.changes[topId],
  );
  d.querySelector('[data-action="showTeamLeague"]').click();
  assert(
    d.getElementById("teamLeagueSummary").textContent.includes("Tới vòng 3"),
  );
  assert.equal(
    d.querySelectorAll("#teamLeagueRows .team-league-result").length,
    3,
  );
  assert.equal(d.querySelectorAll("#teamLeagueRows tr").length, 31);
  assert.equal(
    d.querySelectorAll("#teamLeagueSummary .form-dot:not(.empty)").length,
    3,
  );
  d.getElementById("teamLeagueDialog").close();
  assert.equal(json(t.run("state")), full);
  assert.deepEqual(t.data(), store);
  const reload = ui("new", 237, t.data());
  reload.run("navigate('table')");
  assert(
    reload.w.document
      .querySelector(".standings-round-note")
      .textContent.includes("vòng 4"),
  );
  reload.close();
  t.run(
    "search='';state=V.fresh();state.playoffEntry='top16';V.finishAll(state);save();navigate('table')",
  );
  assert.equal(
    d.getElementById("standingsRound").value,
    "latest",
    "new season resets the selector",
  );
  const active = json(t.run("state")),
    id = t.run("state.seasonId");
  await t.w.Seasons.view(id);
  const disclosure = d.querySelector('[data-season-section="league"]');
  disclosure.open = true;
  choose("2");
  assert(d.querySelector(".season-result-heading"));
  assert(d.querySelector('[data-season-section="league"]').open);
  assert.equal(d.querySelectorAll(".medal-card").length, 3);
  assert.equal(d.querySelectorAll("#rows .rank-movement").length, 32);
  assert.equal(json(t.run("state")), active);
  assert.equal(json(t.run("seasonView.snapshot")), active);
  t.close();
  // Full Season's existing round selector controls that round's league table too.
  const f = ui("new", 67),
    fd = f.w.document;
  fd.querySelector('[data-action="Full.enter"]').click();
  fd.querySelector('[data-action="Full.create"]').click();
  fd.querySelector('[data-action="Full.section"][data-arg="CSV"]').click();
  assert.equal(fd.querySelectorAll(".full-standings .rank-movement").length, 0);
  fd.querySelector('[data-action="Full.simLeague"]').click();
  assert.equal(fd.querySelector('[data-action="Full.round"]').value, "4");
  assert(
    [...fd.querySelectorAll(".full-standings tbody tr")].every(
      (row) => Number(row.cells[2].textContent) === 5,
    ),
  );
  fd.querySelector('[data-action="Full.section"][data-arg="overview"]').click();
  fd.querySelector('[data-action="Full.section"][data-arg="CSV"]').click();
  assert.equal(
    fd.querySelector('[data-action="Full.round"]').value,
    "4",
    "completed league opens at final standings",
  );
  const original = f.w.localStorage.getItem("volleyworld-full-guest");
  const select = fd.querySelector('[data-action="Full.round"]');
  select.value = "1";
  select.dispatchEvent(new f.w.Event("change", { bubbles: true }));
  assert.equal(fd.querySelectorAll(".full-standings .rank-movement").length, 6);
  assert(
    [...fd.querySelectorAll(".full-standings tbody tr")].every(
      (row) => Number(row.cells[2].textContent) === 2,
    ),
  );
  fd.querySelector('.full-standings [data-action="Full.team"]').click();
  assert(
    fd.getElementById("teamLeagueSummary").textContent.includes("Tới vòng 2"),
  );
  assert.equal(f.w.localStorage.getItem("volleyworld-full-guest"), original);
  f.close();
  // Odd regional schedules retain the bye: a change of rank never adds a match.
  const league = F.fullLeague(
    V.regionTeams("CAVB").map((t) => t.id),
    "ODD",
  );
  F.simulateLeague(league, 0);
  const snap = V.leagueRoundSnapshot(league, 0);
  assert.equal(F.fullStandings(snap).filter((t) => t.w + t.l === 0).length, 1);
  console.log(
    "PASS standings movement: 93 round snapshots in legacy/expanded/double, known up/down/equal, round-1 empty, partial/future/out-of-order/edit/reload, no mutations, search invariance, historical form/details, archive panel retention, Full Season and odd-league byes",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
