const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const build = (t, format) =>
  t.run(
    `state=V.fresh(undefined,'${format}');state.rounds.flat().forEach(V.simulate);V.startPlayin(state);state.playin.forEach(V.simulate);V.draw(state);save();navigate('playoff')`,
  );
const submit = (t) => {
  for (let i = 0; i < 3; i++) {
    t.w.document.getElementById("a" + i).value = "25";
    t.w.document.getElementById("b" + i).value = "20";
  }
  t.w.document
    .getElementById("scoreForm")
    .dispatchEvent(
      new t.w.Event("submit", { bubbles: true, cancelable: true }),
    );
};
(async () => {
  const t = ui("new", 674),
    d = t.w.document;
  build(t, "double");
  for (const { key } of V.playoffStages(t.run("state"))) {
    if (key === "lower4") break;
    t.w.simStage(key);
  }
  const upper = d.querySelector(".playoff-tree-scroll"),
    lower = d.querySelector(".double-lower-scroll");
  upper.scrollLeft = 268;
  lower.scrollLeft = 934;
  lower.scrollTop = 13;
  const match = t.run("state.bracket.lower4[0].id");
  d.querySelector(
    `[data-action="openPlayoffMatch"][data-arg="${match}"]`,
  ).click();
  assert(d.getElementById("playoffMatchDialog").open);
  d.querySelector('#playoffMatchBody [data-action="playoffSimOne"]').click();
  assert(t.run("!!state.bracket.lower4[0].sets"));
  assert(!d.getElementById("playoffMatchDialog").open);
  assert.notEqual(
    d.querySelector(".double-lower-scroll"),
    lower,
    "regression requires a real DOM replacement",
  );
  assert.equal(d.querySelector(".double-lower-scroll").scrollLeft, 934);
  assert.equal(d.querySelector(".double-lower-scroll").scrollTop, 13);
  assert.equal(
    d.querySelector(".playoff-tree-scroll").scrollLeft,
    268,
    "upper/lower positions are independent",
  );
  const other = t.run("state.bracket.lower4[1].id");
  d.querySelector(
    `[data-action="openPlayoffMatch"][data-arg="${other}"]`,
  ).click();
  d.querySelector('#playoffMatchBody [data-action="playoffEditMatch"]').click();
  assert(d.getElementById("editor").open);
  submit(t);
  assert(t.run("!!state.bracket.lower4[1].sets"));
  assert.equal(t.run("state.bracket.lower5.length"), 1);
  assert.equal(d.querySelector(".double-lower-scroll").scrollLeft, 934);
  assert.equal(d.querySelector(".playoff-tree-scroll").scrollLeft, 268);
  t.w.simStage("lower5");
  assert.equal(d.querySelector(".double-lower-scroll").scrollLeft, 934);
  const before = t.run("JSON.stringify(state)");
  t.run("render()");
  assert.equal(d.querySelector(".double-lower-scroll").scrollLeft, 934);
  assert.equal(t.run("JSON.stringify(state)"), before);
  // History rebuilds content twice (playoff + table) before assembling disclosures.
  t.run("V.finishAll(state);save();render()");
  const id = t.run("state.seasonId");
  await t.w.Seasons.view(id);
  d.querySelector('[data-season-section="playoff"]').open = true;
  d.querySelector(".playoff-tree-scroll").scrollLeft = 206;
  d.querySelector(".double-lower-scroll").scrollLeft = 845;
  const archived = t.run("JSON.stringify(seasonView.snapshot)");
  t.w.setDoubleView("overview");
  assert(d.querySelector('[data-season-section="playoff"]').open);
  assert.equal(d.querySelector(".double-lower-scroll").scrollLeft, 845);
  assert.equal(d.querySelector(".playoff-tree-scroll").scrollLeft, 206);
  assert.equal(t.run("JSON.stringify(seasonView.snapshot)"), archived);
  t.run("seasonView=null");
  build(t, "single");
  t.w.setPlayoffLayout("tree");
  assert.equal(
    d.querySelector(".playoff-tree-scroll").scrollLeft,
    0,
    "another season must not inherit the previous scroll",
  );
  d.querySelector(".playoff-tree-scroll").scrollLeft = 510;
  const single = t.run("state.bracket.r16[0].id");
  t.w.openPlayoffMatch(single);
  d.querySelector('#playoffMatchBody [data-action="playoffSimOne"]').click();
  assert.equal(d.querySelector(".playoff-tree-scroll").scrollLeft, 510);
  t.w.simStage("r16");
  assert.equal(d.querySelector(".playoff-tree-scroll").scrollLeft, 510);
  t.close();
  // Full Season uses a different renderer and cloned snapshots after every score.
  const s = F.freshFullSeason(1);
  F.finishFullSeason(s);
  const b = s.world.bracket;
  b.r16.forEach((m) => {
    m.sets = null;
    delete m.resultOrder;
  });
  for (const k of ["qf", "sf", "final", "bronze"]) b[k] = [];
  assert(F.validFullSeason(s));
  const row = {
    season_id: s.seasonId,
    season_number: 1,
    created_at: s.createdAt,
    status: "active",
    played: 527,
    podium: [],
    revision: 0,
    snapshot: s,
    dirty: true,
  };
  const f = ui("new", 71, { "volleyworld-full-guest": JSON.stringify([row]) }),
    fd = f.w.document;
  fd.querySelector('[data-action="Full.enter"]').click();
  fd.querySelector('[data-action="Full.open"]').click();
  fd.querySelector('[data-action="Full.section"][data-arg="playoff"]').click();
  fd.querySelector(".full-bracket").scrollLeft = 630;
  fd.querySelector('[data-action="Full.simMatch"]').click();
  assert.equal(fd.querySelector(".full-bracket").scrollLeft, 630);
  fd.querySelector('[data-action="Full.stage"][data-arg="r16"]').click();
  assert.equal(fd.querySelector(".full-bracket").scrollLeft, 630);
  f.close();
  console.log(
    "PASS bracket scroll: real modal simulation/manual save, new lower rounds, separate upper/lower offsets, single tree, read-only archive composition, new-season reset, no score changes from rerender and Full Season cloned snapshots",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
