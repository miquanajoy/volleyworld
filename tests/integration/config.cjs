const { spawnSync } = require("node:child_process"),
  assert = require("node:assert/strict");
for (const [name, overrides, message] of [
  [
    "partial override",
    { SUPABASE_URL: "https://example.supabase.co" },
    "Set both cloud environment overrides",
  ],
  [
    "insecure endpoint",
    {
      SUPABASE_URL: "http://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    "must use HTTPS",
  ],
  [
    "secret key",
    {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
    },
    "Only a publishable key",
  ],
  [
    "service role",
    {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY:
        "e30." +
        Buffer.from(JSON.stringify({ role: "service_role" })).toString(
          "base64url",
        ) +
        ".invalid",
    },
    "Only a publishable key",
  ],
]) {
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_PUBLISHABLE_KEY;
  Object.assign(env, overrides);
  const r = spawnSync(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "build"],
    { env, encoding: "utf8", timeout: 30000 },
  );
  assert(r.status !== 0, name + " must reject");
  assert((r.stdout + r.stderr).includes(message), name + " rejection reason");
}
console.log(
  "PASS build configuration: paired overrides, HTTPS and publishable/legacy-anon key restrictions preserved; secret/service-role keys rejected",
);
