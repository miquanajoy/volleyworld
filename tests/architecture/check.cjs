const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  crypto = require("node:crypto");
const files = fs
  .readdirSync("src", { recursive: true })
  .filter((f) => f.endsWith(".ts"));
for (const file of files) {
  const s = fs.readFileSync("src/" + file, "utf8"),
    sf = ts.createSourceFile(file, s, 99, true);
  assert(!/@ts-(ignore|nocheck)/.test(s), file + " disables checking");
  assert(!/\b(eval|new Function)\s*\(/.test(s), file + " evaluates code");
  assert(
    !/\bon(?:click|input|change|submit)\s*=\s*["']/.test(s),
    file + " inline script",
  );
  assert(
    !/window\.(V|Seasons|Settings|Cloud|state|render|VOLLEY_CONFIG)\b/.test(s),
    file + " global app API",
  );
  function check(n) {
    assert(n.kind !== ts.SyntaxKind.AnyKeyword, file + " blanket any");
    if (ts.isImportDeclaration(n)) {
      const target = n.moduleSpecifier.text;
      if (file.startsWith("domain/")) {
        assert(target.startsWith("."), file + " impure package");
        const resolved = path.posix.normalize(
          path.posix.join(path.posix.dirname(file), target),
        );
        assert(
          resolved.startsWith("domain/") || resolved === "data/teams",
          file + " impure import " + target,
        );
      }
      if (file.startsWith("data/"))
        assert(
          !/app\/|features\/|shared\/dom/.test(target),
          file + " inverted dependency",
        );
    }
    ts.forEachChild(n, check);
  }
  check(sf);
  if (file.startsWith("domain/"))
    assert(
      !/\b(document|window|localStorage|fetch)\b/.test(s),
      file + " browser dependency",
    );
}
const html = fs.readFileSync("index.html", "utf8");
assert(!/\bon\w+=/.test(html));
assert(html.includes('type="module"'));
assert(!/dist\//.test(html));
const hashes = JSON.parse(
  fs.readFileSync("tests/fixtures/main/SHA256.json", "utf8"),
);
for (const [file, hash] of Object.entries(hashes))
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync("tests/fixtures/main/" + file))
      .digest("hex"),
    hash,
    "modified main fixture " + file,
  );
assert.deepEqual(
  fs.readFileSync("src/styles/app.css"),
  fs.readFileSync("tests/fixtures/main/style.css"),
);
console.log(
  `PASS architecture: ${files.length} TypeScript modules; strict pure-domain/import boundaries; no blanket any, global app API, eval or inline scripts; frozen baseline and CSS`,
);
