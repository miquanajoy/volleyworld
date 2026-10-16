import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import type { CloudConfiguration } from "./src/data/contracts.ts";
const defaults = JSON.parse(
  readFileSync(
    new URL("./supabase/public-config.json", import.meta.url),
    "utf8",
  ),
) as CloudConfiguration;
if (
  Boolean(process.env.SUPABASE_URL) !==
  Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)
)
  throw Error("Set both cloud environment overrides, or neither.");
const url = process.env.SUPABASE_URL || defaults.supabaseUrl || "",
  key = process.env.SUPABASE_PUBLISHABLE_KEY || defaults.supabaseKey || "";
if (Boolean(url) !== Boolean(key))
  throw Error("Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
if (url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("SUPABASE_URL must use HTTPS.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const payload = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (payload.role !== "anon") throw Error();
    } catch {
      throw Error(
        "Only a publishable key or legacy anon key can be used in the browser. Never use a secret/service role key.",
      );
    }
  }
}
export default defineConfig({
  define: {
    __VOLLEY_CONFIG__: JSON.stringify({ supabaseUrl: url, supabaseKey: key }),
  },
  build: { target: "es2022" },
});
