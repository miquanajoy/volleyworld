const assert = require("node:assert/strict"),
  F = require("../../.test-build/circuit-engine.js"),
  { ui } = require("../support/circuit-harness.cjs");
const copy = (x) => JSON.parse(JSON.stringify(x));
const remote = new Map();
let offline = false,
  delayedRead = null,
  delayedWrite = null;
let activeReads = 0,
  maxReads = 0;
function service(uid) {
  return {
    from(table) {
      assert.equal(table, "volleyworld_circuit_seasons");
      const filters = {};
      let columns = "";
      const q = {
        delete() {
          return {
            async eq(key, value) {
              assert.equal(key, "user_id");
              assert.equal(value, uid);
              if (offline) return { error: { message: "offline" } };
              remote.delete(uid);
              return { error: null };
            },
          };
        },
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
      assert.equal(name, "save_volleyworld_circuit_season");
      if (delayedWrite) await delayedWrite;
      if (offline) return { error: { message: "offline" } };
      assert(F.validCircuit(p_state));
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
    played: F.played(r.state),
    podium: F.podium(r.state),
    revision: r.revision,
    updated_at: r.updated_at,
  };
}

(async () => {
  const a = ui("new", 8192),
    c = a.w.__circuit;
  c.create();
  c.start();
  const guest = a.w.localStorage.getItem("volleyworld-circuit-v2-guest");
  assert(guest);
  await c.cloud.switchAccount(service("A"), "A");
  assert.equal(c.model.records.length, 0);
  c.create();
  c.start();
  await c.cloud.saveNow();
  assert.equal(remote.get("A").size, 1);
  const id = c.selected().season_id;
  assert.equal(c.selected().revision, 1);
  c.simRound();
  await c.cloud.saveNow();
  assert.equal(c.selected().revision, 2);
  offline = true;
  c.simRound();
  const played = c.selected().played;
  await c.cloud.saveNow();
  assert(c.selected().dirty);
  assert.equal(c.selected().played, played);
  offline = false;
  await c.cloud.saveNow();
  assert(!c.selected().dirty);
  const last = remote.get("A").get(id);
  last.revision++;
  F.simulateBatch(last.state);
  c.simRound();
  await c.cloud.saveNow();
  assert.equal(c.selected().phase, "conflict");
  await c.cloud.resolve(true);
  assert.equal(c.selected().revision, last.revision);
  await c.cloud.switchAccount(service("B"), "B");
  assert.equal(c.model.records.length, 0);
  c.create();
  c.start();
  await c.cloud.saveNow();
  assert.equal(remote.get("B").size, 1);
  await c.cloud.switchAccount(service("A"), "A");
  assert.equal(c.model.records.length, 1);
  await c.open(id);
  assert.equal(c.selected().season_id, id);
  const beforeB = copy([...remote.get("B").values()]);
  assert(await c.cloud.resetAll());
  assert.equal(c.model.records.length, 0);
  assert.deepEqual(copy([...remote.get("B").values()]), beforeB);
  await c.cloud.switchAccount(null, null);
  assert.equal(a.w.localStorage.getItem("volleyworld-circuit-v2-guest"), guest);
  a.close();
  console.log(
    "PASS circuit cloud:account/guest isolation;CAS writes;offline retention;stale revision conflict;remote resolution;scoped reset and unchanged other account",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
