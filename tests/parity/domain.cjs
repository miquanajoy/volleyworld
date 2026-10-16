const assert = require("node:assert/strict"),
  { domain } = require("../support/parity-harness.cjs");
const json = (x) => JSON.stringify(x);
let seasons = 0,
  checkpoints = 0;
for (const format of ["single", "double"])
  for (let seed = 1; seed <= 20; seed++) {
    const a = domain("main", seed),
      b = domain("new", seed),
      x = a.V.fresh(undefined, format),
      y = b.V.fresh(undefined, format);
    assert.equal(json(y), json(x), "fresh " + format + seed);
    assert.equal(json(b.V.catalog), json(a.V.catalog));
    assert.equal(json(b.V.limits), json(a.V.limits));
    for (let r = 0; r < 31; r++) {
      for (let i = 0; i < 16; i++) {
        a.V.simulate(x.rounds[r][i]);
        b.V.simulate(y.rounds[r][i]);
      }
      a.V.stampResults(x);
      b.V.stampResults(y);
      assert.equal(
        json(b.V.standings(y)),
        json(a.V.standings(x)),
        "standings " + format + seed + "/" + r,
      );
      assert.equal(json(y), json(x), "round " + format + seed + "/" + r);
      assert.equal(b.V.validState(y), a.V.validState(x));
      checkpoints++;
    }
    a.V.startPlayin(x);
    b.V.startPlayin(y);
    for (let i = 0; i < 4; i++) {
      a.V.simulate(x.playin[i]);
      b.V.simulate(y.playin[i]);
    }
    a.V.draw(x);
    b.V.draw(y);
    assert.equal(json(y), json(x), "draw");
    while (!a.V.complete(x)) {
      const stage = a.V.playoffStages(x).find((d) =>
        x.bracket[d.key].some((m) => !m.sets),
      );
      assert(stage);
      for (let i = 0; i < x.bracket[stage.key].length; i++) {
        a.V.simulate(x.bracket[stage.key][i]);
        b.V.simulate(y.bracket[stage.key][i]);
      }
      a.V.advance(x);
      b.V.advance(y);
      assert.equal(
        json(y),
        json(x),
        "playoff " + format + seed + "/" + stage.key,
      );
      assert.equal(json(b.V.podium(y)), json(a.V.podium(x)));
    }
    assert(b.V.validState(JSON.parse(json(x))));
    assert(a.V.validState(JSON.parse(json(y))));
    assert.equal(
      json(b.V.recentForm(y, y.rounds[0][0].a)),
      json(a.V.recentForm(x, x.rounds[0][0].a)),
    );
    assert.equal(b.V.totalMatches(y), a.V.totalMatches(x));
    seasons++;
  }
for (const sample of [
  [],
  [
    [25, 20],
    [25, 20],
    [25, 20],
  ],
  [
    [25, 24],
    [25, 20],
    [25, 20],
  ],
  [[0, 0]],
  [
    [25, 23],
    [23, 25],
    [26, 24],
    [20, 25],
    [17, 15],
  ],
  [
    [25, 20],
    [25, 20],
    [25, 20],
    [25, 20],
  ],
]) {
  const a = domain("main", 1).V,
    b = domain("new", 1).V;
  assert.equal(
    json(b.inspectScoreInputs(sample)),
    json(a.inspectScoreInputs(sample)),
  );
}
console.log(
  `PASS differential domain: ${seasons} identical complete seasons; ${checkpoints} round/state/standings checkpoints; identical catalogs, scoring, draws, playoff routes, form, podium and cross-version save acceptance`,
);
// Qualification certificates are compared independently, including edited and out-of-order rounds.
const fs = require("node:fs"),
  vm = require("node:vm");
for (const seed of [7, 19]) {
  const a = domain("main", seed),
    b = domain("new", seed);
  vm.runInContext(
    fs.readFileSync("tests/fixtures/main/qualification.js", "utf8"),
    a.ctx,
  );
  const qa = a.ctx.module.exports;
  vm.runInContext(
    fs.readFileSync(".test-build/qualification.js", "utf8"),
    b.ctx,
  );
  const qb = b.ctx.module.exports;
  const x = a.V.fresh(),
    y = b.V.fresh();
  for (const r of [
    0,
    3,
    1,
    2,
    ...Array.from({ length: 27 }, (_, i) => i + 4),
  ]) {
    for (let i = 0; i < 16; i++) {
      a.V.simulate(x.rounds[r][i]);
      b.V.simulate(y.rounds[r][i]);
    }
    a.V.stampResults(x);
    b.V.stampResults(y);
    assert.equal(
      json(qb.report(y)),
      json(qa.report(x)),
      "qualification " + seed + "/" + r,
    );
  }
  x.rounds[5][0].sets = null;
  y.rounds[5][0].sets = null;
  assert.equal(json(qb.report(y)), json(qa.report(x)), "edited certificate");
}
console.log(
  "PASS differential qualification: 62 completed/out-of-order round reports and edited-result recomputation match main",
);
