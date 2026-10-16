const fs = require("node:fs"),
  esbuild = require("esbuild");
fs.mkdirSync(".test-build", { recursive: true });
fs.writeFileSync(
  ".test-build/package.json",
  JSON.stringify({ type: "commonjs" }),
);
for (const [name, entry, format] of [
  ["engine", "src/domain/index.ts", "cjs"],
  ["career-ranking", "src/features/achievements/rankings.ts", "cjs"],
  ["points-policy", "src/domain/honours/points.ts", "cjs"],
  ["achievement-model", "src/features/achievements/model.ts", "cjs"],
  ["qualification", "src/domain/league/qualification/index.ts", "cjs"],
  ["sync-core", "src/data/cloud/write-queue.ts", "cjs"],
  ["app", "tests/support/compat-app.ts", "iife"],
])
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "browser",
    format,
    target: "es2022",
    define: { __VOLLEY_CONFIG__: "globalThis.__TEST_CONFIG" },
    banner: { js: "globalThis.__TEST_CONFIG=globalThis.VOLLEY_CONFIG||{};" },
    outfile: ".test-build/" + name + ".js",
    external: ["@supabase/supabase-js"],
  });
fs.writeFileSync(".test-build/seasons.js", "// Composed by compat-app\n");
fs.writeFileSync(".test-build/settings.js", "// Composed by compat-app\n");
fs.writeFileSync(
  ".test-build/cloud.js",
  `__installAccount(); void __initializeCloud(typeof testClient==='undefined'?undefined:()=>testClient);`,
);
esbuild.buildSync({
  entryPoints: ["src/data/cloud/write-queue.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "SyncCore",
  target: "es2022",
  outfile: ".test-build/sync-core.js",
  footer: {
    js: "if(typeof module!=='undefined')module.exports=SyncCore;globalThis.CloudWriter=SyncCore.CloudWriter;",
  },
});

esbuild.buildSync({
  entryPoints: ["src/domain/index.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "V",
  target: "es2022",
  outfile: ".test-build/engine-browser.js",
});

// Differential rules/UI tests hold score generation at the frozen baseline.
// The real new engine is exercised separately by simulation-v2 and build tests.
const legacySimulation = fs
  .readFileSync("tests/fixtures/main/engine.js", "utf8")
  .match(/^function simulate\(m\).*$/m)?.[0];
if (!legacySimulation) throw Error("Missing frozen simulation reference");
const paritySimulation = {
  name: "frozen-parity-simulation",
  setup(build) {
    build.onLoad({ filter: /domain\/match\/simulation\.ts$/ }, (args) => {
      const source = fs.readFileSync(args.path, "utf8"),
        pattern = /export function simulate\(m: Match\) \{[\s\S]*?^\}/m;
      if (!pattern.test(source)) throw Error("Simulation wrapper changed");
      return {
        contents: source.replace(pattern, "export " + legacySimulation),
        loader: "ts",
      };
    });
  },
};
(async () => {
  for (const [name, entry, format, globalName] of [
    ["parity-engine", "src/domain/index.ts", "cjs", undefined],
    ["parity-engine-browser", "src/domain/index.ts", "iife", "V"],
    ["parity-app", "tests/support/compat-app.ts", "iife", undefined],
  ])
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: "browser",
      format,
      globalName,
      target: "es2022",
      plugins: [paritySimulation],
      define: { __VOLLEY_CONFIG__: "globalThis.__TEST_CONFIG" },
      banner: { js: "globalThis.__TEST_CONFIG=globalThis.VOLLEY_CONFIG||{};" },
      outfile: ".test-build/" + name + ".js",
      external: ["@supabase/supabase-js"],
    });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
