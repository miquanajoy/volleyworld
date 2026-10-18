const assert = require("node:assert/strict"),
  F = require("../../.test-build/full-engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x)),
  tick = () => new Promise((r) => setTimeout(r, 10));
const remote = new Map();
let offline = false,
  delayedRead = null,
  delayedWrite = null;
function service(uid) {
  return {
    from(table) {
      assert.equal(table, "volleyworld_full_seasons");
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
          if (delayedRead) await delayedRead;
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
      assert.equal(name, "save_volleyworld_full_season");
      if (delayedWrite) await delayedWrite;
      if (offline) return { error: { message: "offline" } };
      assert(F.validFullSeason(p_state));
      const rows = remote.get(uid) || new Map(),
        old = rows.get(p_state.seasonId);
      if ((old?.revision || 0) !== p_expected_revision)
        return { error: { message: "SAVE_CONFLICT" } };
      if (
        old &&
        F.worldComplete(old.state) &&
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
    status: F.worldComplete(r.state) ? "completed" : "active",
    played: F.fullMatches(r.state).filter((m) => m.sets).length,
    podium: F.worldPodium(r.state),
    revision: r.revision,
    updated_at: r.updated_at,
  };
}
(async () => {
  const t = ui("new", 81),
    full = t.w.__full,
    d = t.w.document;
  full.enterFull();
  full.createFull();
  const guest = t.w.localStorage.getItem("volleyworld-full-guest");
  assert(guest);
  await full.switchFullAccount(service("A"), "A");
  assert.equal(full.fullModel.records.length, 0);
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), guest);
  full.createFull();
  let row = full.fullModel.records[0],
    id = row.season_id;
  let saved = await full.saveFullNow();
  assert(saved.online);
  assert.equal(row.revision, 1);
  assert(!row.dirty);
  const fixture = row.snapshot.regions.CSV.rounds[0][0].id;
  offline = true;
  full.simulateFullMatch(fixture);
  saved = await full.saveFullNow();
  assert(!saved.online && row.dirty);
  assert.equal(
    JSON.parse(t.w.localStorage.getItem("volleyworld-full-user-A"))[0].played,
    1,
  );
  offline = false;
  await full.reloadFullCloud();
  saved = await full.saveFullNow();
  assert(saved.online);
  assert.equal(row.revision, 2);
  assert(!row.dirty);
  // Another device and this device edit different games from the same revision.
  const online = remote.get("A").get(id);
  F.finishFullSeason(online.state);
  online.revision++;
  full.simulateFullMatch(row.snapshot.regions.CSV.rounds[0][1].id);
  saved = await full.saveFullNow();
  assert(!saved.online);
  assert.equal(row.phase, "conflict");
  assert(row.dirty);
  await full.resolveFullConflict(true);
  row = full.fullModel.records[0];
  assert.equal(row.status, "completed");
  assert.equal(row.played, 543);
  assert.equal(row.revision, 3);
  assert(!row.dirty);
  assert(F.validFullSeason(row.snapshot));
  // Reload metadata, then pull the selected snapshot without changing the classic season.
  const classic = t.run("JSON.stringify(state)");
  row.snapshot = undefined;
  await full.loadFullSnapshot(id);
  assert(F.worldComplete(row.snapshot));
  assert.equal(t.run("JSON.stringify(state)"), classic);
  // An old account's pending snapshot response cannot enter a new account's records.
  row.snapshot = undefined;
  let release;
  delayedRead = new Promise((r) => (release = r));
  const oldRead = full.loadFullSnapshot(id);
  await full.switchFullAccount(service("B"), "B");
  release();
  await oldRead;
  delayedRead = null;
  assert.equal(full.fullModel.records.length, 0);
  assert.equal(full.fullModel.scope, "volleyworld-full-user-B");
  // A completed export can be imported as a separate immutable season in another account.
  await full.importFull({
    size: 200000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-full-seasons",
        version: 1,
        seasons: [online.state],
      }),
  });
  assert.equal(full.fullModel.records.length, 1);
  assert.notEqual(full.fullModel.records[0].season_id, id);
  saved = await full.saveFullNow();
  assert(saved.online);
  assert.equal(remote.get("A").size, 1);
  assert.equal(remote.get("B").size, 1);
  // A write already in flight for B does not acknowledge or replace C's progress.
  full.createFull();
  let unblock;
  delayedWrite = new Promise((r) => (unblock = r));
  const writing = full.saveFullNow();
  await tick();
  await full.switchFullAccount(service("C"), "C");
  unblock();
  const result = await writing;
  delayedWrite = null;
  assert.equal(result.status, "account-changed");
  assert.equal(full.fullModel.records.length, 0);
  // Number collisions at creation are rebased on a refresh rather than overwriting a season.
  full.createFull();
  row = full.fullModel.records[0];
  const other = F.freshFullSeason(1);
  remote.set(
    "C",
    new Map([
      [
        other.seasonId,
        { state: other, revision: 1, updated_at: new Date().toISOString() },
      ],
    ]),
  );
  await full.reloadFullCloud();
  assert.equal(row.season_number, 2);
  saved = await full.saveFullNow();
  assert(saved.online);
  assert.equal(remote.get("C").size, 2);
  await full.switchFullAccount(null, null);
  assert.equal(t.w.localStorage.getItem("volleyworld-full-guest"), guest);
  assert.equal(full.fullModel.records.length, 1);
  t.close();
  console.log(
    "PASS Full Season cloud: account-scoped guest retention, CAS/offline retry, explicit conflict/immutable remote history, lazy snapshots, cross-account stale reads/writes, import as new seasons and creation-number collisions",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
