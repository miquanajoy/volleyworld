const assert = require("node:assert/strict"),
  { ui } = require("../support/parity-harness.cjs"),
  { buildSync } = require("esbuild"),
  vm = require("node:vm");
const t = ui("new");
const rows = ["single", "double", null, undefined, "unexpected"].map(
  (format, i) => ({
    season_id: `metadata-${i}`,
    season_number: i + 10,
    status: "completed",
    created_at: "2026-10-16T00:00:00Z",
    ended_at: "2026-10-16T01:00:00Z",
    podium: [],
    played: 516,
    ...(format === undefined ? {} : { playoff_format: format }),
  }),
);
const before = t.run("JSON.stringify(state)");
t.w.Seasons.mergeRemote(rows, "volleyworld-v1-seasons");
t.w.Seasons.home();
const labels = () =>
  [...t.w.document.querySelectorAll(".season-format-label")].map(
    (x) => x.textContent,
  );
const expected = [
  "Loại trực tiếp",
  "Loại trực tiếp",
  "Nhánh thắng – nhánh thua",
  "Loại trực tiếp",
  "Chưa tải thể thức",
  "Chưa tải thể thức",
];
assert.deepEqual(labels(), expected);
assert(t.w.Seasons.localRecords().every((r) => !r.snapshot));
// Older API/cache records lacking the projection must not erase a known format.
t.w.Seasons.mergeRemote(
  rows.map(({ playoff_format, ...row }) => row),
  "volleyworld-v1-seasons",
);
t.w.Seasons.home();
assert.deepEqual(labels(), expected);
t.w.Seasons.mergeRemote(
  [{ ...rows[1], playoff_format: "single" }],
  "different-account-seasons",
);
t.w.Seasons.home();
assert.deepEqual(labels(), expected);
assert.equal(t.run("JSON.stringify(state)"), before);
const saved = t.data();
t.close();
const reloaded = ui("new", 1742, saved);
reloaded.w.Seasons.home();
assert.deepEqual(
  [...reloaded.w.document.querySelectorAll(".season-format-label")].map(
    (x) => x.textContent,
  ),
  expected,
);
reloaded.close();
// Exercise the repository query itself: only the JSON format scalar is fetched,
// while account filtering, paging and lazy snapshot loading stay unchanged.
const bundled = buildSync({
  entryPoints: ["src/data/repositories/cloud-saves.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
}).outputFiles[0].text;
const context = { module: { exports: {} }, exports: {} };
vm.runInNewContext(bundled, context);
const calls = [];
const query = Object.fromEntries(
  ["select", "eq", "order", "range"].map((method) => [
    method,
    (...args) => {
      calls.push([method, ...args]);
      return query;
    },
  ]),
);
context.module.exports.readHistoryPage(
  {
    from: (table) => {
      assert.equal(table, "volleyworld_seasons");
      return query;
    },
  },
  "account-a",
  2,
);
assert(calls[0][1].includes("playoff_format:snapshot->>playoffFormat"));
assert(!calls[0][1].split(",").includes("snapshot"));
assert.deepEqual(calls[1], ["eq", "user_id", "account-a"]);
assert.deepEqual(calls.at(-1), ["range", 200, 299]);
console.log(
  "PASS season format metadata: single/double/legacy cards without snapshots, unknown fallback, cache merge/reload, stale account isolation, immutable active state and scoped lightweight cloud query",
);
