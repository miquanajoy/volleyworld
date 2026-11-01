const assert = require("node:assert/strict"),
  { ui } = require("../support/tour-harness.cjs");
(async () => {
  const t = ui("new", 27156),
    ls = t.w.localStorage;
  const reset = t.w.__applyAccountReset;
  function service(uid, stamp, error = false) {
    return {
      from(table) {
        assert.equal(table, "volleyworld_data_resets");
        const q = {
          select() {
            return q;
          },
          eq(k, v) {
            assert.equal(k, "user_id");
            assert.equal(v, uid);
            return q;
          },
          async maybeSingle() {
            return error
              ? { error: { message: "offline" } }
              : { data: stamp ? { reset_at: stamp } : null };
          },
        };
        return q;
      },
    };
  }
  for (const key of [
    "volleyworld-user-A",
    "volleyworld-user-A-seasons",
    "volleyworld-full-user-A",
    "volleyworld-challenger-user-A-backups",
    "volleyworld-nations-user-A",
    "volleyworld-tour-user-A",
  ])
    ls.setItem(key, "old");
  ls.setItem("volleyworld-full-user-B", "other");
  ls.setItem("volleyworld-challenger-guest", "guest");
  assert(await reset(service("A", "2026-11-01T06:00:00Z"), "A"));
  for (const key of [
    "volleyworld-user-A",
    "volleyworld-user-A-seasons",
    "volleyworld-full-user-A",
    "volleyworld-challenger-user-A-backups",
    "volleyworld-nations-user-A",
    "volleyworld-tour-user-A",
  ])
    assert.equal(ls.getItem(key), null, key);
  assert.equal(ls.getItem("volleyworld-full-user-B"), "other");
  assert.equal(ls.getItem("volleyworld-challenger-guest"), "guest");
  ls.setItem("volleyworld-tour-user-A", "new");
  await reset(service("A", "2026-11-01T06:00:00Z"), "A");
  assert.equal(ls.getItem("volleyworld-tour-user-A"), "new");
  await assert.rejects(() => reset(service("A", null, true), "A"));
  assert.equal(ls.getItem("volleyworld-tour-user-A"), "new");
  assert.equal(await reset(service("B", null), "B"), false);
  // Suspend invalidates every modal/account token and closes pending writes before a new session is activated.
  const tour = t.w.__tour;
  tour.enter();
  tour.create();
  tour.start();
  let requests = 0;
  const cloud = {
    from() {
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
      };
      return q;
    },
    async rpc() {
      requests++;
      return { data: [{ revision: 1, updated_at: new Date().toISOString() }] };
    },
  };
  await tour.tourCloud.switchAccount(cloud, "A");
  tour.create();
  tour.start();
  const token = tour.model.token;
  tour.tourCloud.suspend();
  assert(tour.model.token > token);
  assert.equal(tour.model.selected, null);
  assert.equal(tour.model.records.length, 0);
  assert.equal(tour.model.scope, "volleyworld-tour-switching");
  await new Promise((r) => setTimeout(r, 850));
  assert.equal(
    requests,
    0,
    "Suspended queued snapshot cannot be sent using a new authsession",
  );
  assert(ls.getItem("volleyworld-tour-user-A"));
  t.close();
  console.log(
    "PASS account reset: own account cache/backups purge, other account/guest retention, idempotent reset marker, failed-read retention, mode-writer suspension and pending-write cancellation",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
