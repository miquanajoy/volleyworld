const fs = require("node:fs"),
  C = require("../.test-build/challenger-engine.js"),
  V = require("../.test-build/engine.js");
const clone = (x) => JSON.parse(JSON.stringify(x));
const s = C.freshChallenger(),
  fixtures = [];
function add(key) {
  if (!C.validChallenger(s)) throw Error(key);
  fixtures.push({ key, state: clone(s) });
}
add("fresh");
C.recordChallengerScore(s, s.rounds[0][0].id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
add("manual-partial");
for (let r = 0; r < 5; r++) {
  C.simulateChallengerRound(s);
  add("swiss-complete-" + r);
  if (r < 4) {
    C.drawSwissRound(s);
    add("swiss-draw-" + (r + 1));
  }
}
C.drawChallengerPlayoff(s);
add("playoff-draw");
for (const k of ["r16", "qf", "sf", "bronze", "final"]) {
  C.simulateChallengerStage(s, k);
  add("playoff-" + k);
}
const mutations = [
  (s) => (s.rounds[1][0].a = s.rounds[1][1].a),
  (s) => (s.rounds[0][0].a = "INVALID"),
  (s) => s.tie.pop(),
  (s) => s.roster.reverse(),
  (s) => s.rounds[4].pop(),
  (s) =>
    (s.rounds[0][0].sets = [
      [25, 24],
      [25, 0],
      [25, 0],
    ]),
  (s) => (s.rounds[0][0].resultOrder = s.rounds[0][1].resultOrder),
  (s) => (s.bracket.r16[0].a = s.bracket.r16[1].a),
  (s) => (s.bracket.qf[0].a = s.bracket.qf[0].b),
  (s) => {
    s.bracket.bronze[0].sets = null;
    delete s.bracket.bronze[0].resultOrder;
  },
  (s) => (s.rounds[0][0].sets = null),
];
const invalid = mutations.map((change, i) => {
  const bad = clone(s);
  change(bad);
  if (C.validChallenger(bad)) throw Error("invalid fixture accepted " + i);
  return { key: "bad-" + i, state: bad };
});
const opening = clone(fixtures[0].state),
  a = opening.rounds[0][0],
  b = opening.rounds[0].find(
    (m) => m !== a && V.get(m.b).region === V.get(a.a).region,
  );
if (!b) throw Error("No same-region negative fixture");
[a.b, b.b] = [b.b, a.b];
if (C.validChallenger(opening)) throw Error("Region protection not validated");
invalid.push({ key: "bad-opening-same-region", state: opening });
const customIds = Object.entries({
  CEV: 16,
  AVC: 6,
  NORCECA: 6,
  CAVB: 2,
  CSV: 2,
}).flatMap(([r, n]) =>
  V.regionTeams(r)
    .slice(-n)
    .map((t) => t.id),
);
const custom = C.freshChallenger(2, customIds),
  customFixtures = [{ key: "custom-fresh", state: clone(custom) }];
const changed = [...customIds],
  out = changed.find((id) => V.get(id).region === "CEV"),
  replacement = V.regionTeams("CEV").find((t) => !changed.includes(t.id)).id;
changed[changed.indexOf(out)] = replacement;
const edited = C.freshChallenger(2, changed);
edited.seasonId = custom.seasonId;
edited.createdAt = custom.createdAt;
customFixtures.push({ key: "custom-edit", state: clone(edited) });
C.recordChallengerScore(edited, edited.rounds[0][0].id, [
  [25, 20],
  [25, 20],
  [25, 20],
]);
customFixtures.push({ key: "custom-started", state: clone(edited) });
C.finishChallenger(edited);
customFixtures.push({ key: "custom-complete", state: clone(edited) });
if (!customFixtures.every((f) => C.validChallenger(f.state)))
  throw Error("Invalid custom fixture");
const quote = (s) => "'" + JSON.stringify(s).replaceAll("'", "''") + "'::jsonb";
const values = [
  ...fixtures.map((f, i) => `(${i},'${f.key}',${quote(f.state)},true)`),
  ...customFixtures.map(
    (f, i) => `(${50 + i},'${f.key}',${quote(f.state)},true)`,
  ),
  ...invalid.map((f, i) => `(${100 + i},'${f.key}',${quote(f.state)},false)`),
].join(",\n");
const template = fs.readFileSync("supabase/tests/challenger.sql", "utf8");
fs.writeFileSync(
  ".test-build/challenger-verification.sql",
  template.replace(
    "__FIXTURE_JSON__",
    quote([
      ...fixtures.map((f, i) => ({ ...f, seq: i, expected: true })),
      ...customFixtures.map((f, i) => ({ ...f, seq: 50 + i, expected: true })),
      ...invalid.map((f, i) => ({ ...f, seq: 100 + i, expected: false })),
    ]),
  ),
);
fs.writeFileSync(
  ".test-build/challenger-readonly.sql",
  `with fixtures(seq,key,state,expected) as (values ${values}) select key, public.volleyworld_challenger_state_valid(state)=expected as passed from fixtures order by seq;`,
);
console.log(
  `Prepared ${fixtures.length + customFixtures.length} valid and ${invalid.length} invalid JS/SQL fixtures; verification always rolls back`,
);
