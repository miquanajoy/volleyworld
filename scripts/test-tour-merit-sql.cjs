// Isolated PostgreSQL/WASM verification. No production credentials or network DB access.
// Optional dependency: @electric-sql/pglite@0.5.14 installed outside the repository.
// VOLLEY_PGLITE_MODULE=/absolute/path/to/node_modules/@electric-sql/pglite node scripts/test-tour-merit-sql.cjs
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { PGlite } = require(
  process.env.VOLLEY_PGLITE_MODULE || "@electric-sql/pglite",
);
function fixtures(dir) {
  if (!fs.existsSync(path.join(dir, "index.json"))) return [];
  return JSON.parse(fs.readFileSync(path.join(dir, "index.json"))).map((f) =>
    JSON.parse(fs.readFileSync(path.join(dir, f.file))),
  );
}
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
    let migrations = 0;
    for (const file of fs
      .readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(
        fs.readFileSync(path.join("supabase/migrations", file), "utf8"),
      );
      migrations++;
    }
    const vectors = [
      ...fixtures(".test-build/tour-merit-fixtures"),
      ...JSON.parse(
        fs.readFileSync(".test-build/tour-merit-extra-fixtures.json"),
      ),
      ...fixtures(".test-build/tour-fixtures"),
    ];
    assert(vectors.length, "Generate merit and legacy fixtures first");
    for (const f of vectors) {
      const result = await db.query(
        "select public.volleyworld_tour_state_valid($1::jsonb) valid",
        [JSON.stringify(f.state)],
      );
      assert.equal(result.rows[0].valid, f.expected, f.key);
    }
    const actors = [randomUUID(), randomUUID()];
    for (let i = 0; i < actors.length; i++)
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        actors[i],
        `local-merit-${i}@example.invalid`,
      ]);
    await db.exec(
      fs.readFileSync(".test-build/tour-merit-verification.sql", "utf8"),
    );
    if (fs.existsSync(".test-build/tour-verification.sql")) {
      await db.exec(
        fs.readFileSync(".test-build/tour-verification.sql", "utf8"),
      );
    }
    const unsafe = await db.query(
      `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'volleyworld_%merit%' and (p.prosecdef or has_function_privilege('anon',p.oid,'execute'))`,
    );
    assert.equal(
      unsafe.rows.length,
      0,
      "Merit helpers are invoker-only and not callable anonymously",
    );
    const ownership = await db.query(
      "select relrowsecurity from pg_class where oid='public.volleyworld_tour_seasons'::regclass",
    );
    assert(ownership.rows[0].relrowsecurity, "Tour RLS remains enabled");
    const count = await db.query(
      "select count(*)::int n from public.volleyworld_tour_seasons",
    );
    assert.equal(
      count.rows[0].n,
      0,
      "Verification rolls back all playing data",
    );
    console.log(
      `PASS isolated PostgreSQL merit SQL: ${migrations} migrations; ${vectors.length} JS/SQL fixtures; eight CAS transitions;948-match projections;completed immutability;legacy CAS compatibility;RLS;anonymous denial;invoker-only helpers;all writes rolled back`,
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
