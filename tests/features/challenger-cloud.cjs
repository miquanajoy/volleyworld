const assert = require("node:assert/strict"),
  F = require("../../.test-build/challenger-engine.js"),
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
      assert.equal(table, "volleyworld_challenger_seasons");
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
      assert.equal(name, "save_volleyworld_challenger_season");
      if (delayedWrite) await delayedWrite;
      if (offline) return { error: { message: "offline" } };
      assert(F.validChallenger(p_state));
      const rows = remote.get(uid) || new Map(),
        old = rows.get(p_state.seasonId);
      if ((old?.revision || 0) !== p_expected_revision)
        return { error: { message: "SAVE_CONFLICT" } };
      if (
        old &&
        F.challengerComplete(old.state) &&
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
    status: F.challengerComplete(r.state) ? "completed" : "active",
    played: F.challengerMatches(r.state).filter((m) => m.sets).length,
    podium: F.challengerPodium(r.state),
    revision: r.revision,
    updated_at: r.updated_at,
  };
}
(async () => {
  const t = ui("new", 81),
    full = t.w.__challenger,
    d = t.w.document;
  full.enter();
  full.create();
  full.start();
  const guest = t.w.localStorage.getItem("volleyworld-challenger-guest");
  assert(guest);
  await full.challengerCloud.switchAccount(service("A"), "A");
  assert.equal(full.model.records.length, 0);
  assert.equal(t.w.localStorage.getItem("volleyworld-challenger-guest"), guest);
  full.create();
  full.start();
  let row = full.model.records[0],
    id = row.season_id;
  let saved = await full.challengerCloud.saveNow();
  assert(saved.online);
  assert.equal(row.revision, 1);
  assert(!row.dirty);
  const fixture = row.snapshot.rounds[0][0].id;
  offline = true;
  full.simMatch(fixture);
  saved = await full.challengerCloud.saveNow();
  assert(!saved.online && row.dirty);
  assert.equal(
    JSON.parse(t.w.localStorage.getItem("volleyworld-challenger-user-A"))[0]
      .played,
    1,
  );
  offline = false;
  await full.challengerCloud.reload();
  saved = await full.challengerCloud.saveNow();
  assert(saved.online);
  assert.equal(row.revision, 2);
  assert(!row.dirty);
  // Another device and this device edit different games from the same revision.
  const online = remote.get("A").get(id);
  F.finishChallenger(online.state);
  online.revision++;
  full.simMatch(row.snapshot.rounds[0][1].id);
  saved = await full.challengerCloud.saveNow();
  assert(!saved.online);
  assert.equal(row.phase, "conflict");
  assert(row.dirty);
  await full.challengerCloud.resolve(true);
  row = full.model.records[0];
  assert.equal(row.status, "completed");
  assert.equal(row.played, 82);
  assert.equal(row.revision, 3);
  assert(!row.dirty);
  assert(F.validChallenger(row.snapshot));
  // Reload metadata, then pull the selected snapshot without changing the classic season.
  const classic = t.run("JSON.stringify(state)");
  row.snapshot = undefined;
  await full.challengerCloud.load(id);
  assert(F.challengerComplete(row.snapshot));
  assert.equal(t.run("JSON.stringify(state)"), classic);
  // An old account's pending snapshot response cannot enter a new account's records.
  row.snapshot = undefined;
  let release;
  delayedRead = new Promise((r) => (release = r));
  const oldRead = full.challengerCloud.load(id);
  await full.challengerCloud.switchAccount(service("B"), "B");
  release();
  await oldRead;
  delayedRead = null;
  assert.equal(full.model.records.length, 0);
  assert.equal(full.model.scope, "volleyworld-challenger-user-B");
  // A completed export can be imported as a separate immutable season in another account.
  await full.importSeasons({
    size: 200000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-challenger-seasons",
        version: 1,
        seasons: [online.state],
      }),
  });
  assert.equal(full.model.records.length, 1);
  assert.notEqual(full.model.records[0].season_id, id);
  saved = await full.challengerCloud.saveNow();
  assert(saved.online);
  assert.equal(remote.get("A").size, 1);
  assert.equal(remote.get("B").size, 1);
  // A write already in flight for B does not acknowledge or replace C's progress.
  full.create();
  full.start();
  let unblock;
  delayedWrite = new Promise((r) => (unblock = r));
  const writing = full.challengerCloud.saveNow();
  await tick();
  await full.challengerCloud.switchAccount(service("C"), "C");
  unblock();
  const result = await writing;
  delayedWrite = null;
  assert.equal(result.status, "account-changed");
  assert.equal(full.model.records.length, 0);
  // Number collisions at creation are rebased on a refresh rather than overwriting a season.
  full.create();
  full.start();
  row = full.model.records[0];
  const other = F.freshChallenger(1);
  remote.set(
    "C",
    new Map([
      [
        other.seasonId,
        { state: other, revision: 1, updated_at: new Date().toISOString() },
      ],
    ]),
  );
  await full.challengerCloud.reload();
  assert.equal(row.season_number, 2);
  saved = await full.challengerCloud.saveNow();
  assert(saved.online);
  assert.equal(remote.get("C").size, 2);
  await full.challengerCloud.switchAccount(null, null);
  assert.equal(t.w.localStorage.getItem("volleyworld-challenger-guest"), guest);
  assert.equal(full.model.records.length, 1);
  t.close();
  console.log(
    "PASS Challenger cloud: account-scoped guest retention, CAS/offline retry, explicit conflict/immutable remote history, lazy snapshots, cross-account stale reads/writes, import as new seasons and creation-number collisions",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
