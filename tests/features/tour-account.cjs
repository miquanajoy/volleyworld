const { startMeritFixture } = require("../support/tour-fixtures.cjs");
const assert = require("node:assert/strict"),
  { ui } = require("../support/tour-harness.cjs");
const tick = () => new Promise((r) => setTimeout(r, 10));
(async () => {
  const t = ui("new", 31741),
    api = t.w.__tour,
    account = t.w.__account,
    state = account.accountState,
    ls = t.w.localStorage;
  assert.equal(ls.getItem("volleyworld-v1"), null);
  let hold = null,
    uid = "A";
  const tables = [],
    writes = [];
  const client = {
    from(table) {
      tables.push(table);
      assert(
        ["volleyworld_data_resets", "volleyworld_tour_seasons"].includes(table),
      );
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        order() {
          return q;
        },
        async range() {
          return { data: [] };
        },
        async maybeSingle() {
          if (hold) await hold;
          return { data: null };
        },
      };
      return q;
    },
    async rpc(name, { p_state }) {
      assert.equal(name, "save_volleyworld_tour_season");
      writes.push({ uid, id: p_state.seasonId });
      return { data: [{ revision: 1, updated_at: new Date().toISOString() }] };
    },
  };
  state.client = client;
  await account.switchUser({ id: "A", email: "a@example.invalid" });
  assert.equal(api.model.scope, "volleyworld-tour-user-A");
  api.create();
  startMeritFixture(api);
  await account.manualSave();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].uid, "A");
  const oldId = api.selected().season_id;
  let release;
  hold = new Promise((r) => (release = r));
  uid = "B";
  const switching = account.switchUser({ id: "B", email: "b@example.invalid" });
  await tick();
  assert(state.resetPending);
  assert.equal(api.model.scope, "volleyworld-tour-switching");
  assert.equal(api.model.records.length, 0);
  t.w.document.querySelector('[data-action="Tour.create"]')?.click();
  assert.equal(api.model.setup, null);
  assert.equal((await account.manualSave()).status, "account-changed");
  assert.equal(writes.length, 1);
  release();
  hold = null;
  await switching;
  assert.equal(api.model.scope, "volleyworld-tour-user-B");
  assert.equal(api.model.records.length, 0);
  assert(!state.resetPending);
  api.create();
  startMeritFixture(api);
  await account.manualSave();
  assert.equal(writes.at(-1).uid, "B");
  assert.notEqual(writes.at(-1).id, oldId);
  assert(ls.getItem("volleyworld-tour-user-A"));
  assert(ls.getItem("volleyworld-tour-user-B"));
  for (const key of [
    "volleyworld-v1",
    "volleyworld-user-A",
    "volleyworld-user-B",
    "volleyworld-full-user-A",
    "volleyworld-challenger-user-A",
  ])
    assert.equal(ls.getItem(key), null);
  assert(
    tables.every(
      (x) =>
        x === "volleyworld_data_resets" || x === "volleyworld_tour_seasons",
    ),
  );
  t.close();
  console.log(
    "PASS Tour-only account runtime: only Tour/reset requests, no standalone save keys, CAS manual save, session switching suspends writes and UI, account-isolated local histories",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
