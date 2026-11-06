const { startMeritFixture } = require("../support/tour-fixtures.cjs");
const assert = require("node:assert/strict"),
  F = require("../../.test-build/tour-engine.js"),
  { ui } = require("../support/tour-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x)),
  tick = () => new Promise((r) => setTimeout(r, 10));
const remote = new Map();
let offline = false,
  delayedRead = null,
  delayedWrite = null;
let activeReads = 0,
  maxReads = 0;
function service(uid) {
  return {
    from(table) {
      assert.equal(table, "volleyworld_tour_seasons");
      const filters = {};
      let columns = "";
      const q = {
        select(s) {
          columns = s;
          return q;
        },
        eq(k, v) {
          filters[k] = v;
          return q;
        },
        order() {
          return q;
        },
        async range(a, b) {
          if (offline) return { error: { message: "offline" } };
          assert.equal(filters.user_id, uid);
          const rows = [...(remote.get(uid)?.values() || [])]
            .sort((a, b) => a.state.seasonNumber - b.state.seasonNumber)
            .slice(a, b + 1);
          return {
            data: rows.map((x) => ({ ...meta(x), snapshot: undefined })),
          };
        },
        async maybeSingle() {
          activeReads++;
          maxReads = Math.max(maxReads, activeReads);
          if (delayedRead) await delayedRead;
          activeReads--;
          if (offline) return { error: { message: "offline" } };
          assert.equal(filters.user_id, uid);
          const r = remote.get(uid)?.get(filters.season_id);
          return {
            data: r
              ? {
                  state: copy(r.state),
                  revision: r.revision,
                  updated_at: r.updated_at,
                }
              : null,
          };
        },
      };
      return q;
    },
    async rpc(name, { p_state, p_expected_revision }) {
      assert.equal(name, "save_volleyworld_tour_season");
      if (delayedWrite) await delayedWrite;
      if (offline) return { error: { message: "offline" } };
      assert(F.validTour(p_state));
      const rows = remote.get(uid) || new Map(),
        old = rows.get(p_state.seasonId);
      if ((old?.revision || 0) !== p_expected_revision)
        return { error: { message: "SAVE_CONFLICT" } };
      if (
        old &&
        F.complete(old.state) &&
        JSON.stringify(old.state) !== JSON.stringify(p_state)
      )
        return { error: { message: "SAVE_CONFLICT: immutable" } };
      const row = {
        state: copy(p_state),
        revision: (old?.revision || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      rows.set(p_state.seasonId, row);
      remote.set(uid, rows);
      return { data: [{ revision: row.revision, updated_at: row.updated_at }] };
    },
  };
}
function meta(r) {
  return {
    season_id: r.state.seasonId,
    season_number: r.state.seasonNumber,
    created_at: r.state.createdAt,
    status: F.complete(r.state) ? "completed" : "active",
    played: F.matches(r.state).filter((m) => m.sets).length,
    podium: F.podium(r.state),
    total_matches: F.seasonTotal(r.state),
    honours: {
      league: require("../../.test-build/engine.js").podium(r.state.league),
      challenger: r.state.challenger
        ? require("../../.test-build/challenger-engine.js").challengerPodium(
            r.state.challenger,
          )
        : [],
      worldcup: require("../../.test-build/full-engine.js").worldPodium(
        r.state.worldcup,
      ),
    },
    revision: r.revision,
    updated_at: r.updated_at,
  };
}
(async () => {
  const t = ui("new", 81),
    full = t.w.__tour,
    d = t.w.document;
  full.enter();
  full.create();
  startMeritFixture(full);
  const guest = t.w.localStorage.getItem("volleyworld-tour-guest");
  assert(guest);
  await full.tourCloud.switchAccount(service("A"), "A");
  assert.equal(full.model.records.length, 0);
  assert.equal(t.w.localStorage.getItem("volleyworld-tour-guest"), guest);
  full.create();
  startMeritFixture(full);
  let row = full.model.records[0],
    id = row.season_id;
  let saved = await full.tourCloud.saveNow();
  assert(saved.online);
  assert.equal(row.revision, 1);
  assert(!row.dirty);
  const fixture = row.snapshot.league.rounds[0][0].id;
  offline = true;
  full.simMatch(fixture);
  saved = await full.tourCloud.saveNow();
  assert(!saved.online && row.dirty);
  assert.equal(
    JSON.parse(t.w.localStorage.getItem("volleyworld-tour-user-A"))[0].played,
    1,
  );
  offline = false;
  await full.tourCloud.reload();
  saved = await full.tourCloud.saveNow();
  assert(saved.online);
  assert.equal(row.revision, 2);
  assert(!row.dirty);
  // Another device and this device edit different games from the same revision.
  const online = remote.get("A").get(id);
  F.finishTour(online.state);
  online.revision++;
  full.simMatch(row.snapshot.league.rounds[0][1].id);
  saved = await full.tourCloud.saveNow();
  assert(!saved.online);
  assert.equal(row.phase, "conflict");
  assert(row.dirty);
  await full.tourCloud.resolve(true);
  row = full.model.records[0];
  assert.equal(row.status, "completed");
  assert.equal(row.played, 948);
  assert.equal(row.revision, 3);
  assert(!row.dirty);
  assert(F.validTour(row.snapshot));
  // Reload metadata, then pull the selected snapshot without changing the classic season.
  const classic = t.run("JSON.stringify(state)");
  row.snapshot = undefined;
  await full.tourCloud.load(id);
  assert(F.complete(row.snapshot));
  assert.equal(t.run("JSON.stringify(state)"), classic);
  // An old account's pending snapshot response cannot enter a new account's records.
  row.snapshot = undefined;
  let release;
  delayedRead = new Promise((r) => (release = r));
  const oldRead = full.tourCloud.load(id);
  await full.tourCloud.switchAccount(service("B"), "B");
  release();
  await oldRead;
  delayedRead = null;
  assert.equal(full.model.records.length, 0);
  assert.equal(full.model.scope, "volleyworld-tour-user-B");
  // A completed export can be imported as a separate immutable season in another account.
  await full.importSeasons({
    size: 200000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-tour-seasons",
        version: 1,
        seasons: [online.state],
      }),
  });
  assert.equal(full.model.records.length, 1);
  assert.notEqual(full.model.records[0].season_id, id);
  saved = await full.tourCloud.saveNow();
  assert(saved.online);
  assert.equal(remote.get("A").size, 1);
  assert.equal(remote.get("B").size, 1);
  // A write already in flight for B does not acknowledge or replace C's progress.
  full.create();
  startMeritFixture(full);
  let unblock;
  delayedWrite = new Promise((r) => (unblock = r));
  const writing = full.tourCloud.saveNow();
  await tick();
  await full.tourCloud.switchAccount(service("C"), "C");
  unblock();
  const result = await writing;
  delayedWrite = null;
  assert.equal(result.status, "account-changed");
  assert.equal(full.model.records.length, 0);
  // Number collisions at creation are rebased on a refresh rather than overwriting a season.
  full.create();
  startMeritFixture(full);
  row = full.model.records[0];
  const other = F.freshTour(1);
  remote.set(
    "C",
    new Map([
      [
        other.seasonId,
        { state: other, revision: 1, updated_at: new Date().toISOString() },
      ],
    ]),
  );
  await full.tourCloud.reload();
  assert.equal(row.season_number, 2);
  saved = await full.tourCloud.saveNow();
  assert(saved.online);
  assert.equal(remote.get("C").size, 2);
  await full.tourCloud.switchAccount(null, null);
  assert.equal(t.w.localStorage.getItem("volleyworld-tour-guest"), guest);
  assert.equal(full.model.records.length, 1);
  // Older history is loaded at most three snapshots at a time, without UI/account leakage.
  const archive = new Map();
  for (let n = 1; n <= 8; n++) {
    const s = F.freshTour(n);
    F.finishTour(s);
    archive.set(s.seasonId, {
      state: s,
      revision: 1,
      updated_at: new Date().toISOString(),
    });
  }
  remote.set("H", archive);
  await full.tourCloud.switchAccount(service("H"), "H");
  assert(full.model.records.every((r) => !r.snapshot));
  assert(
    full.model.records.every(
      (r) =>
        r.honours.league.length === 3 &&
        r.honours.challenger.length === 3 &&
        r.honours.worldcup.length === 3,
    ),
  );
  let releaseHistory;
  delayedRead = new Promise((r) => (releaseHistory = r));
  maxReads = 0;
  full.achievements();
  await tick();
  assert.equal(activeReads, 3);
  assert.equal(maxReads, 3);
  releaseHistory();
  delayedRead = null;
  for (let n = 0; n < 100 && !full.model.records.every((r) => r.snapshot); n++)
    await tick();
  assert(full.model.records.every((r) => r.snapshot));
  assert(maxReads <= 3);
  assert.equal(
    remote.get("H").size,
    8,
    "Read-only achievements never create seasons",
  );
  full.model.records.forEach((r) => (r.snapshot = undefined));
  let releaseStale;
  delayedRead = new Promise((r) => (releaseStale = r));
  full.achievements();
  await tick();
  await full.tourCloud.switchAccount(service("I"), "I");
  releaseStale();
  delayedRead = null;
  await tick();
  assert.equal(full.model.records.length, 0);
  assert.equal(full.model.scope, "volleyworld-tour-user-I");
  full.create();
  full.start();
  full.start();
  const localCareer = full.selected().snapshot;
  assert(F.regionalFormat(localCareer));
  full.resume();
  full.simRound();
  const careerSave = await full.tourCloud.saveNow();
  assert.equal(careerSave.status, "local");
  assert(!remote.get("I")?.has(localCareer.seasonId));
  await full.tourCloud.reload();
  assert.equal(full.selected().snapshot.seasonId, localCareer.seasonId);
  await full.tourCloud.switchAccount(service("H"), "H");
  assert(!full.model.records.some((r) => r.season_id === localCareer.seasonId));
  await full.tourCloud.switchAccount(service("I"), "I");
  assert(
    full.model.records.some(
      (r) => r.season_id === localCareer.seasonId && r.played === 16,
    ),
  );
  t.close();
  console.log(
    "PASS Tour cloud: account-scoped guest retention, CAS/offline retry, explicit conflict/immutable remote history, lazy snapshots, cross-account stale reads/writes, import as new seasons and creation-number collisions",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
