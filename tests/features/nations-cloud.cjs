const assert = require("node:assert/strict"),
  N = require("../../.test-build/nations-engine.js"),
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
      assert.equal(table, "volleyworld_nations_seasons");
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
      assert.equal(name, "save_volleyworld_nations_season");
      if (delayedWrite) await delayedWrite;
      if (offline) return { error: { message: "offline" } };
      assert(N.validNationsSeason(p_state));
      const rows = remote.get(uid) || new Map(),
        old = rows.get(p_state.seasonId);
      if ((old?.revision || 0) !== p_expected_revision)
        return { error: { message: "SAVE_CONFLICT" } };
      if (
        old &&
        N.nationsComplete(old.state) &&
        JSON.stringify(old.state) !== JSON.stringify(p_state)
      )
        return { error: { message: "SAVE_CONFLICT: immutable" } };
      if (
        !old &&
        [...rows.values()].some(
          (r) =>
            r.state.campaignId === p_state.campaignId &&
            r.state.cycleNumber === p_state.cycleNumber,
        )
      )
        return { error: { message: "SAVE_CONFLICT: cycle" } };
      if (p_state.cycleNumber > 1) {
        const parent = rows.get(p_state.previousSeasonId);
        if (!parent || !N.validNationsTransition(parent.state, p_state))
          return { error: { message: "INVALID_NATIONS_TRANSITION" } };
      }
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
    campaign_id: r.state.campaignId,
    cycle_number: r.state.cycleNumber,
    previous_id: r.state.previousSeasonId,
    season_number: r.state.seasonNumber,
    created_at: r.state.createdAt,
    status: N.nationsComplete(r.state) ? "completed" : "active",
    played: N.nationsMatches(r.state).filter((m) => m.sets).length,
    podium: N.nationsPodium(r.state),
    revision: r.revision,
    updated_at: r.updated_at,
  };
}
(async () => {
  const t = ui("new", 897),
    n = t.w.__nations,
    c = n.nationsCloud;
  n.enterNations();
  n.createNations();
  const guest = t.w.localStorage.getItem("volleyworld-nations-guest");
  await c.switchAccount(service("A"), "A");
  assert.equal(n.nationsModel.records.length, 0);
  assert.equal(t.w.localStorage.getItem("volleyworld-nations-guest"), guest);
  n.createNations();
  let root = n.selected();
  assert((await c.saveNow()).online);
  assert.equal(root.revision, 1);
  offline = true;
  n.simulateNationsRound();
  assert(!(await c.saveNow()).online);
  assert(root.dirty);
  offline = false;
  await c.reload();
  assert((await c.saveNow()).online);
  assert.equal(root.revision, 2);
  // Parent not yet persisted as complete: child writer must flush the parent first.
  n.finishNations();
  assert(root.dirty);
  await n.nextNationsSeason();
  const child = n.selected();
  assert.equal(child.cycle_number, 2);
  assert((await c.saveNow()).online);
  assert(N.nationsComplete(remote.get("A").get(root.season_id).state));
  assert(remote.get("A").has(child.season_id));
  // Another device creates the same next cycle. Local alternative is retained and explicit.
  n.openNations(root.season_id);
  const other = N.freshNationsSeason(3, root.snapshot);
  remote.get("A").delete(child.season_id);
  remote.get("A").set(other.seasonId, {
    state: other,
    revision: 1,
    updated_at: new Date().toISOString(),
  });
  // Emulate unsent child branch from an offline device.
  child.dirty = true;
  child.revision = 0;
  await c.reload();
  assert.equal(child.phase, "conflict");
  assert.equal(child.remoteSeasonId, other.seasonId);
  assert(!(await c.saveNow()).online);
  n.openNations(child.season_id);
  await c.resolve(false);
  assert.equal(n.selected().season_id, child.season_id);
  assert.equal(n.selected().phase, "conflict");
  await c.resolve(true);
  assert.equal(n.selected().season_id, other.seasonId);
  assert.equal(
    n.nationsModel.records.filter(
      (r) => r.campaign_id === root.campaign_id && r.cycle_number === 2,
    ).length,
    1,
  );
  root.snapshot = undefined;
  const classic = t.run("JSON.stringify(state)");
  assert(N.nationsComplete(await c.load(root.season_id)));
  assert.equal(t.run("JSON.stringify(state)"), classic);
  root.snapshot = undefined;
  let release;
  delayedRead = new Promise((r) => (release = r));
  const reading = c.load(root.season_id);
  await c.switchAccount(service("B"), "B");
  release();
  await reading;
  delayedRead = null;
  assert.equal(n.nationsModel.records.length, 0);
  // Import a chain into a different account: parent ordering and identities are remapped.
  const parent = remote.get("A").get(root.season_id).state;
  await n.importNations({
    size: 200000,
    text: async () =>
      JSON.stringify({
        format: "volleyworld-nations-seasons",
        version: 1,
        seasons: [parent, other],
      }),
  });
  assert.equal(n.nationsModel.records.length, 2);
  assert((await c.saveNow()).online);
  assert.equal(remote.get("B").size, 2);
  assert.equal(remote.get("A").size, 2);
  n.createNations();
  let unblock;
  delayedWrite = new Promise((r) => (unblock = r));
  const writing = c.saveNow();
  await tick();
  await c.switchAccount(service("C"), "C");
  unblock();
  assert.equal((await writing).status, "account-changed");
  delayedWrite = null;
  assert.equal(n.nationsModel.records.length, 0);
  n.createNations();
  const local = n.selected(),
    another = N.freshNationsSeason(1);
  remote.set(
    "C",
    new Map([
      [
        another.seasonId,
        { state: another, revision: 1, updated_at: new Date().toISOString() },
      ],
    ]),
  );
  await c.reload();
  assert.equal(local.season_number, 2);
  assert((await c.saveNow()).online);
  assert.equal(remote.get("C").size, 2);
  await c.switchAccount(null, null);
  assert.equal(t.w.localStorage.getItem("volleyworld-nations-guest"), guest);
  assert.equal(n.nationsModel.records.length, 1);
  t.close();
  console.log(
    "PASS Nations League cloud: account/guest isolation, CAS/offline retry, parent-first save, duplicate next-cycle conflicts without overwrite, explicit resolution, lazy reads, stale account protection, imported chain order and archive-number collisions",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
