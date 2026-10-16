const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const seeded = (seed) => () =>
  (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
const rng = seeded(81027),
  report = [];
for (const [a, b] of [
  ["USA", "RUS"],
  ["POL", "ITA"],
  ["POL", "JPN"],
  ["POL", "CHI"],
  ["POL", "BAH"],
]) {
  const n = 60000,
    odds = V.setWinProbability(V.get(a).rating, V.get(b).rating),
    expected = V.matchWinProbability(odds);
  let wins = 0,
    normal = 0,
    low = 0,
    deuce = 0;
  const counts = new Map();
  for (let i = 0; i < n; i++) {
    const m = { id: "probe", a, b, sets: null };
    V.simulateWithRandom(m, rng);
    assert(V.validate(m.sets));
    const [aw, bw] = V.score(m);
    wins += aw === 3;
    const key = `${aw}-${bw}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    m.sets.forEach(([x, y], index) => {
      if (index < 4) {
        normal++;
        low += Math.min(x, y) <= 15;
        deuce += Math.max(x, y) > 25;
      }
    });
  }
  assert(Math.abs(wins / n - expected) < 0.012, `${a}/${b}: win distribution`);
  const outcomes = {
    "3-0": odds ** 3,
    "3-1": 3 * odds ** 3 * (1 - odds),
    "3-2": 6 * odds ** 3 * (1 - odds) ** 2,
    "2-3": 6 * (1 - odds) ** 3 * odds ** 2,
    "1-3": 3 * (1 - odds) ** 3 * odds,
    "0-3": (1 - odds) ** 3,
  };
  for (const [key, p] of Object.entries(outcomes))
    assert(Math.abs((counts.get(key) || 0) / n - p) < 0.012, key);
  if (a === "USA") {
    assert(low / normal < 0.02);
    assert(deuce / normal > 0.12 && deuce / normal < 0.16);
  }
  if (a === "POL" && b === "ITA") assert(low / normal < 0.025);
  if (a === "POL") assert(wins < n && wins / n > 0.5);
  report.push({
    pair: `${a}-${b}`,
    winPct: +((wins / n) * 100).toFixed(2),
    upsetPct: +((1 - wins / n) * 100).toFixed(2),
    blowoutSetPct: +((low / normal) * 100).toFixed(2),
  });
}
assert(Math.abs(1 - V.matchWinProbability(0.85) - 0.026611875) < 1e-10);
let last = 0.5;
for (let gap = 0; gap <= 1000; gap += 5) {
  const p = V.setWinProbability(gap, 0);
  assert(p >= last && p <= 0.85);
  assert(Math.abs(p + V.setWinProbability(0, gap) - 1) < 1e-12);
  last = p;
}
for (const side of [0, 1])
  for (const losses of [0, 1, 2])
    for (let i = 0; i < 500; i++) {
      const m = { a: "POL", b: "BAH" },
        before = JSON.stringify(m),
        sets = V.simulateChosenResult(m, side, losses, rng);
      assert(V.validate(sets));
      assert.equal(JSON.stringify(m), before);
      assert.deepEqual(
        V.score({ ...m, sets }),
        side === 0 ? [3, losses] : [losses, 3],
      );
      assert.equal(sets.length, 3 + losses);
    }
for (const value of [0, 1 - Number.EPSILON])
  for (const index of [0, 4])
    for (const side of [0, 1]) {
      const set = V.simulateSet(
        { a: "POL", b: "BAH" },
        index,
        side,
        () => value,
      );
      assert(Number.isFinite(set[0]) && Number.isFinite(set[1]));
      const target = index === 4 ? 15 : 25;
      assert(Math.max(...set) >= target);
      assert(Math.abs(set[0] - set[1]) >= 2);
    }
assert.throws(() => V.simulateSet({ a: "POL", b: "ITA" }, 5));
(async () => {
  const t = ui("new", 83),
    d = t.w.document;
  t.run("navigate('league');editMatch(state.rounds[0][0].id)");
  const before = t.run("JSON.stringify(state)"),
    storage = JSON.stringify(t.data());
  const visible = () =>
    [...d.querySelectorAll(".set-block")].filter((el) => !el.hidden).length;
  const play = () =>
    [...d.querySelectorAll(".set-play")].filter((el) => !el.hidden);
  assert.equal(visible(), 1);
  assert.equal(play().length, 1);
  assert.equal(d.getElementById("liveScore0").hidden, true);
  // Duplicate clicks on a finished set cannot reroll it or alter the tournament.
  const first = play()[0];
  first.click();
  const firstPair = [
    d.getElementById("a0").value,
    d.getElementById("b0").value,
  ];
  first.click();
  assert.deepEqual(
    [d.getElementById("a0").value, d.getElementById("b0").value],
    firstPair,
  );
  assert.equal(visible(), 2);
  while (play().length) play()[0].click();
  assert(t.run("updateScoreEditor().valid"));
  assert.equal(t.run("JSON.stringify(state)"), before);
  assert.equal(JSON.stringify(t.data()), storage);
  d.querySelector('[data-action="clearEditorSets"][data-arg="0"]').click();
  assert.equal(visible(), 1);
  // Half-entered or invalid set does not unlock the next simulation.
  d.getElementById("a0").value = "25";
  d.getElementById("a0").dispatchEvent(
    new t.w.Event("input", { bubbles: true }),
  );
  assert.equal(play().length, 0);
  assert.equal(visible(), 1);
  d.getElementById("b0").value = "24";
  d.getElementById("b0").dispatchEvent(
    new t.w.Event("input", { bubbles: true }),
  );
  assert.equal(play().length, 0);
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("setError0").hidden);
  assert.equal(d.activeElement.id, "a0");
  for (const side of [0, 1])
    for (const losses of [0, 1, 2]) {
      d.getElementById("generatedWinner").value = String(side);
      d.getElementById("generatedLosses").value = String(losses);
      d.querySelector('[data-action="generateScore"]').click();
      const result = t.run("updateScoreEditor()");
      assert(result.valid);
      assert.deepEqual(
        Array.from(result.score),
        side === 0 ? [3, losses] : [losses, 3],
      );
      assert.equal(visible(), 3 + losses);
      assert.equal(play().length, 0);
      assert.equal(t.run("JSON.stringify(state)"), before);
    }
  // Cancel discards the generated preview; reopening starts clean.
  d.querySelector('[data-action="closeDialog"][data-arg="editor"]').click();
  t.run("editMatch(state.rounds[0][0].id)");
  assert.equal(visible(), 1);
  assert.equal(t.run("JSON.stringify(state)"), before);
  d.getElementById("generatedWinner").value = "1";
  d.getElementById("generatedLosses").value = "2";
  d.querySelector('[data-action="generateScore"]').click();
  d.getElementById("scoreForm").dispatchEvent(
    new t.w.Event("submit", { bubbles: true, cancelable: true }),
  );
  assert(!d.getElementById("editor").open);
  assert.equal(t.run("state.rounds[0][0].sets.length"), 5);
  assert(t.run("V.validState(state)"));
  const after = t.run("JSON.stringify(state)");
  t.run("editMatch(state.rounds[0][0].id)");
  assert.equal(visible(), 5);
  assert.equal(t.run("JSON.stringify(state)"), after);
  // A season switch invalidates the open preview even when fixture IDs repeat.
  const oldDraft = Array.from(d.querySelectorAll(".set-row input")).map(
    (el) => el.value,
  );
  t.run("state=V.fresh()");
  const switched = t.run("JSON.stringify(state)");
  d.querySelector('[data-action="generateScore"]').click();
  d.querySelector('[data-action="clearEditorSets"][data-arg="0"]').click();
  assert.deepEqual(
    Array.from(d.querySelectorAll(".set-row input")).map((el) => el.value),
    oldDraft,
  );
  assert.equal(t.run("JSON.stringify(state)"), switched);
  t.close();
  console.log(
    "PASS simulation v2: 300,000 matches, six-outcome calibration, monotone symmetric odds and upset floor, close-team margins, 3,000 forced previews, progressive set UI, errors/cancel/save and unchanged draft storage",
  );
  console.log(
    "Simulation calibration (game policy, not real-world frequencies): " +
      JSON.stringify(report),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
