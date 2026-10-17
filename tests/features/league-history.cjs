const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  Q = require("../../.test-build/qualification.js"),
  { ui } = require("../support/parity-harness.cjs");
const json = (x) => JSON.stringify(x);
const s = V.fresh(),
  saved = [];
for (let round = 0; round < 31; round++) {
  s.rounds[round].forEach(V.simulate);
  V.stampResults(s);
  saved.push(json(Q.report(s)));
}
for (let r = 0; r < 31; r++)
  assert.equal(
    json(Q.reportAtRound(s, r)),
    saved[r],
    "round " + (r + 1) + " cannot inherit future results",
  );
const reloaded = JSON.parse(json(s));
for (const r of [0, 12, 25, 30])
  assert.equal(json(Q.reportAtRound(reloaded, r)), saved[r], "reload " + r);
// A score correction reconstructs history; stale certificates are never retained.
reloaded.rounds[12][0].sets = [
  [25, 0],
  [25, 0],
  [25, 0],
];
const snap = JSON.parse(json(reloaded));
for (let r = 13; r < 31; r++)
  for (const m of snap.rounds[r]) {
    m.sets = null;
    delete m.resultOrder;
  }
assert.equal(json(Q.reportAtRound(reloaded, 12)), json(Q.report(snap)));
const out = V.fresh();
out.rounds[5].forEach(V.simulate);
V.stampResults(out);
const first = json(Q.report(out));
out.rounds[0].forEach(V.simulate);
V.stampResults(out);
assert.equal(
  json(Q.reportAtRound(out, 5)),
  first,
  "actual completion order preserved",
);
assert.equal(
  Q.reportAtRound(out, 4),
  null,
  "unfinished round has no final announcement",
);
const t = ui("new");
t.run('state.rounds[0].forEach(V.simulate);save();round=0;navigate("league")');
const before = t.w.document.querySelector(".qualification-news").outerHTML;
t.run(
  "state.rounds.slice(1,31).flat().forEach(V.simulate);save();round=0;renderLeague()",
);
assert.equal(
  t.w.document.querySelector(".qualification-news").outerHTML,
  before,
);
t.run("round=30;renderLeague()");
assert(
  t.w.document
    .querySelector(".qualification-news")
    .textContent.includes("SAU VÒNG 31"),
);
t.run("round=0;renderLeague()");
assert.equal(
  t.w.document.querySelector(".qualification-news").outerHTML,
  before,
);
for (const format of ["single", "expanded", "double"]) {
  t.run(
    `state=V.fresh(undefined,'${format === "double" ? "double" : "single"}');${format === "expanded" ? "state.playoffEntry='top16';" : ""}state.rounds[0].forEach(V.simulate);save();navigate('table')`,
  );
  assert(
    t.w.document.querySelector(".qualification-news"),
    "ongoing league keeps race on standings",
  );
  t.run("navigate('playoff')");
  assert(t.w.document.querySelector(".qualification-news"));
  assert(t.w.document.querySelector(".qualification-entry-grid"));
  t.run(
    "state.rounds.flat().filter(m=>!m.sets).forEach(V.simulate);save();navigate('table')",
  );
  const completed = t.run("JSON.stringify(state)");
  assert(!t.w.document.querySelector(".qualification-news"));
  t.w.selectStandingsRound("0");
  assert(
    !t.w.document.querySelector(".qualification-news"),
    "completed league hides race even when revisiting old standings",
  );
  t.run("navigate('league');round=30;renderLeague()");
  assert(
    t.w.document
      .querySelector(".qualification-news")
      .textContent.includes("SAU VÒNG 31"),
  );
  t.run("round=0;renderLeague()");
  assert(
    t.w.document
      .querySelector(".qualification-news")
      .textContent.includes("SAU VÒNG 1"),
  );
  t.run("navigate('playoff')");
  assert(!t.w.document.querySelector(".qualification-news"));
  assert(!t.w.document.querySelector(".qualification-entry-grid"));
  assert(t.w.document.querySelector('[data-action="startPlayin"]'));
  assert.equal(
    t.run("JSON.stringify(state)"),
    completed,
    "visibility changes do not change scores or progression",
  );
  t.w.startPlayin();
  assert(!t.w.document.querySelector(".qualification-news"));
  assert(t.w.document.querySelector(".playin-matches"));
}
t.close();
console.log(
  "PASS round history: 31 immutable-as-of comparisons, reload, corrected scores, out-of-order completion, unfinished round and real UI backward navigation",
);
