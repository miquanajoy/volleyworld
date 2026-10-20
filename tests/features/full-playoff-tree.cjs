const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
function fixture(format = "groups") {
  const s = F.freshFullSeason(1, format);
  F.finishFullSeason(s);
  s.world.bracket.r16.forEach((m) => {
    m.sets = null;
    delete m.resultOrder;
  });
  for (const k of ["qf", "sf", "final", "bronze"]) s.world.bracket[k] = [];
  assert(F.validFullSeason(s));
  return {
    season_id: s.seasonId,
    season_number: 1,
    created_at: s.createdAt,
    status: "active",
    played: F.fullTotalMatches(s) - 16,
    podium: [],
    revision: 0,
    snapshot: s,
    dirty: true,
  };
}
for (const format of ["groups", "legacy"]) {
  const row = fixture(format),
    t = ui("new", 482, { "volleyworld-full-guest": JSON.stringify([row]) }),
    d = t.w.document;
  const click = (q) => {
    const e = d.querySelector(q);
    assert(e, q);
    e.click();
  };
  click('[data-action="Full.enter"]');
  click('[data-action="Full.open"]');
  click('[data-action="Full.section"][data-arg="playoff"]');
  const original = t.w.localStorage.getItem("volleyworld-full-guest");
  assert.equal(d.querySelectorAll(".full-playoff-tree .tree-stage").length, 4);
  assert.equal(d.querySelectorAll(".full-tree-match").length, 16);
  assert.equal(d.querySelectorAll(".full-tree-match.is-waiting").length, 8);
  assert.equal(d.querySelectorAll(".tree-node.has-next").length, 14);
  assert.equal(d.querySelectorAll(".tree-node.join-upper").length, 7);
  assert.equal(d.querySelectorAll(".full-tree-match button").length, 0);
  assert.equal(d.querySelectorAll(".full-tree-match .form-dot").length, 80);
  assert(
    d.querySelector(".full-playoff-tree").textContent.includes("Thắng R1"),
  );
  assert(d.querySelector(".full-playoff-tree").textContent.includes("Thua S1"));
  const columns = [...d.querySelectorAll(".full-playoff-tree .tree-stage")];
  assert.equal(columns[1].firstElementChild.style.gridRow, "1 / span 4");
  assert.equal(columns[2].firstElementChild.style.gridRow, "1 / span 8");
  assert.equal(columns[3].firstElementChild.style.gridRow, "1 / span 16");
  const medals = d.querySelector(".full-bracket-medals");
  assert.equal(medals.children[0].dataset.worldStage, "final");
  assert.equal(medals.children[1].dataset.worldStage, "bronze");
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), original);
  d.querySelector(".full-bracket").scrollLeft = 490;
  click('.full-tree-match[data-action="Full.match"]');
  assert(d.getElementById("playoffMatchDialog").open);
  assert.equal(
    d.querySelectorAll(".full-match-scoreboard .full-match-team").length,
    2,
  );
  assert.equal(
    d.querySelectorAll(".full-match-scoreboard .form-dot").length,
    10,
  );
  assert.equal(d.querySelector(".full-match-score strong").textContent, "VS");
  assert(
    d.querySelector(".full-match-meta").textContent.includes("Vòng 16 đội"),
  );
  assert(!d.querySelector(".full-match-sets"));
  assert.equal(
    t.w.localStorage.getItem("volleyworld-full-guest"),
    original,
    "Opening detail must not change saved progress",
  );
  assert(d.querySelector('[data-action="Full.dialogSim"]'));
  assert(d.querySelector('[data-action="Full.dialogEdit"]'));
  click('[data-action="Full.dialogSim"]');
  assert(!d.getElementById("playoffMatchDialog").open);
  assert.equal(d.querySelector(".full-bracket").scrollLeft, 490);
  let current = JSON.parse(
    t.w.localStorage.getItem("volleyworld-full-guest"),
  )[0].snapshot;
  const winner = V.winner(current.world.bracket.r16[0]);
  assert(
    d
      .querySelector('[data-world-stage="qf"]')
      .firstElementChild.textContent.includes(V.get(winner).name),
  );
  click('.full-tree-match[data-action="Full.match"]');
  const played = current.world.bracket.r16[0];
  assert.equal(
    d.querySelector(".full-match-score strong").textContent,
    V.score(played).join("–"),
  );
  assert.equal(d.querySelectorAll(".full-match-team.is-winner").length, 1);
  assert.equal(
    d.querySelectorAll(".full-match-sets tbody td").length,
    played.sets.length * 2,
  );
  assert.equal(
    d.querySelectorAll(".full-match-sets .set-winner").length,
    played.sets.length,
  );
  assert(!d.querySelector('[data-action="Full.dialogSim"]'));
  click('[data-action="Full.dialogEdit"]');
  assert(!d.getElementById("playoffMatchDialog").open);
  assert(d.getElementById("editor").open);
  for (let i = 0; i < 5; i++) {
    d.getElementById("a" + i).value = i < 3 ? "25" : "";
    d.getElementById("b" + i).value = i < 3 ? "20" : "";
  }
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  assert.equal(d.querySelector(".full-bracket").scrollLeft, 490);
  click('[data-action="Full.stage"][data-arg="r16"]');
  assert.equal(d.querySelectorAll(".full-tree-match.is-waiting").length, 4);
  assert.equal(
    d.querySelectorAll(
      '[data-world-stage="qf"] .full-tree-match[data-action="Full.match"]',
    ).length,
    4,
  );
  current = JSON.parse(t.w.localStorage.getItem("volleyworld-full-guest"))[0]
    .snapshot;
  assert(F.validFullSeason(current));
  // A dialog from a different account/snapshot cannot act on identically named matches.
  click('[data-world-stage="qf"] .full-tree-match[data-action="Full.match"]');
  const before = t.w.localStorage.getItem("volleyworld-full-guest");
  const scope = t.w.__full.fullModel.scope;
  t.w.__full.fullModel.scope = "different-account";
  click('[data-action="Full.dialogEdit"]');
  assert(!d.getElementById("editor").open);
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), before);
  t.w.__full.fullModel.scope = scope;
  // The final stage remains fixed and history exposes details without mutation controls.
  for (const key of ["qf", "sf", "bronze", "final"])
    click(`[data-action="Full.stage"][data-arg="${key}"]`);
  assert.equal(d.querySelectorAll(".podium-grid").length, 1);
  const finished = t.w.localStorage.getItem("volleyworld-full-guest");
  click('.full-tree-match[data-action="Full.match"]');
  assert(!d.querySelector('[data-action="Full.dialogSim"]'));
  assert(!d.querySelector('[data-action="Full.dialogEdit"]'));
  assert(d.querySelector(".full-match-lock").textContent.includes("Chỉ xem"));
  assert(d.querySelector(".full-match-sets"));
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), finished);
  t.close();
}
console.log(
  "PASS Full Season connected tree: legacy/new seasons, 16 fixed slots, connector geometry, known-winner previews, compact forms, medal order, modal sim/manual edit, preserved scroll, stale-account protection and immutable history",
);
