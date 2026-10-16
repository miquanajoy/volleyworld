const assert = require("node:assert/strict"),
  V = require("../../.test-build/engine.js"),
  A = require("../../.test-build/achievement-model.js");
for (const format of ["single", "double"])
  for (let n = 0; n < 12; n++) {
    const s = V.fresh(undefined, format);
    V.finishAll(s);
    const placements = new Map(
      V.ids(s).map((id) => [id, V.finalPlacement(s, id)]),
    );
    assert.equal(placements.size, 32);
    for (const p of placements.values())
      assert(p && p.from >= 1 && p.to <= 32 && p.from <= p.to);
    const count = (from, to) =>
      [...placements.values()].filter((p) => p.from === from && p.to === to)
        .length;
    const groups =
      format === "single"
        ? [
            [1, 1, 1],
            [2, 2, 1],
            [3, 3, 1],
            [4, 4, 1],
            [5, 8, 4],
            [9, 16, 8],
            [17, 20, 4],
          ]
        : [
            [1, 1, 1],
            [2, 2, 1],
            [3, 3, 1],
            [4, 4, 1],
            [5, 6, 2],
            [7, 8, 2],
            [9, 12, 4],
            [13, 16, 4],
            [17, 20, 4],
          ];
    for (const [from, to, total] of groups)
      assert.equal(count(from, to), total, format + from + "–" + to);
    for (let rank = 21; rank <= 32; rank++) assert.equal(count(rank, rank), 1);
    for (const [id, p] of placements) {
      const b = s.bracket;
      if (format === "single") {
        if (p.from === 5) assert(b.qf.some((m) => V.loser(m) === id));
        if (p.from === 9) assert(b.r16.some((m) => V.loser(m) === id));
      } else {
        for (const [key, from] of [
          ["lower1", 13],
          ["lower2", 9],
          ["lower3", 7],
          ["lower4", 5],
          ["lower5", 4],
        ])
          if (p.from === from) assert(b[key].some((m) => V.loser(m) === id));
      }
    }
    const podium = V.podium(s);
    for (let i = 0; i < 3; i++)
      assert.deepEqual(placements.get(podium[i]), { from: i + 1, to: i + 1 });
    const row = {
      season_id: s.seasonId,
      season_number: 1,
      status: "completed",
      podium,
      snapshot: s,
    };
    assert.equal(A.achievement(row, "VIE").kind, "absent");
    assert.equal(
      A.achievement({ ...row, snapshot: undefined }, podium[1]).placement.from,
      2,
    );
    assert.equal(
      A.achievement(
        { ...row, snapshot: undefined },
        V.ids(s).find((x) => !podium.includes(x)),
      ).kind,
      "unavailable",
    );
    assert.equal(
      A.achievement({ ...row, status: "cancelled" }, podium[0]).kind,
      "cancelled",
    );
    assert.equal(
      A.achievement({ ...row, status: "active" }, podium[0]).kind,
      "pending",
    );
    assert.deepEqual(
      A.medalCounts([row, row, { ...row, status: "cancelled" }], podium[0]),
      [2, 0, 0],
    );
    assert.equal(
      A.achievement({ ...row, podium: undefined }, podium[0]).placement.from,
      1,
    );
    assert.deepEqual(
      A.medalCounts(
        [{ ...row, podium: undefined, snapshot: undefined }],
        podium[0],
      ),
      [0, 0, 0],
    );
    assert.equal(V.finalPlacement(s, "VIE"), null);
    assert(V.validState({ ...s, setupConfirmed: true }));
    assert(V.validState({ ...s, setupConfirmed: undefined }));
    assert(!V.validState({ ...s, setupConfirmed: "yes" }));
  }
assert.equal(V.finalPlacement(V.fresh(), "POL"), null);
console.log(
  "PASS honours classifications: 24 full single/double seasons, every team accounted for, medals, knockout ties, league positions, play-in, absence, cancelled/unfinished and uncached history",
);
