const fs = require("node:fs"),
  { spawnSync } = require("node:child_process");
for (const file of fs
  .readdirSync("tests/legacy")
  .filter((f) => f.endsWith(".cjs"))) {
  const r = spawnSync(process.execPath, [file], {
    cwd: "tests/legacy",
    encoding: "utf8",
  });
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  if (r.status) process.exitCode = 1;
}
