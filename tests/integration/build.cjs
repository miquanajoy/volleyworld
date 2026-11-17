const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { JSDOM, VirtualConsole } = require("jsdom"),
  { deterministic } = require("../support/parity-harness.cjs");
(async () => {
  const html = fs.readFileSync("dist/index.html", "utf8"),
    scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((x) => x[1]),
    styles = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(
      (x) => x[1],
    );
  assert.equal(scripts.length, 1);
  assert(styles.length);
  for (const url of [...scripts, ...styles])
    assert(fs.existsSync(path.join("dist", url)), "missing asset " + url);
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  vc.on("error", (e) => errors.push(e));
  const dom = new JSDOM(
      html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ""),
      {
        url: "https://example.invalid/",
        runScripts: "outside-only",
        virtualConsole: vc,
      },
    ),
    w = dom.window,
    ctx = dom.getInternalVMContext();
  deterministic(w, 1742);
  w.confirm = () => true;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const networkCalls = [];
  Object.assign(w, {
    TextEncoder,
    TextDecoder,
    Headers,
    Request,
    Response,
    AbortController,
    fetch: async (...args) => {
      networkCalls.push(args[0]);
      throw Error("Unexpected network in guest build test");
    },
  });
  const modules = new Map();
  async function load(file) {
    file = path.resolve(file);
    assert(file.startsWith(path.resolve("dist") + path.sep));
    if (modules.has(file)) return modules.get(file);
    const mod = new vm.SourceTextModule(fs.readFileSync(file, "utf8"), {
      context: ctx,
      identifier: file,
      initializeImportMeta(meta) {
        meta.url =
          "https://example.invalid/" +
          path.relative("dist", file).replaceAll(path.sep, "/");
      },
      importModuleDynamically: async (specifier, ref) => {
        const child = await load(
          path.resolve(path.dirname(ref.identifier), specifier),
        );
        if (child.status === "unlinked") await child.link(linker);
        if (child.status === "linked") await child.evaluate();
        return child;
      },
    });
    modules.set(file, mod);
    return mod;
  }
  const linker = (specifier, ref) =>
    load(path.resolve(path.dirname(ref.identifier), specifier));
  const main = await load(path.join("dist", scripts[0]));
  await main.link(linker);
  await main.evaluate();
  await new Promise((r) => setTimeout(r, 150));
  assert(w.document.querySelector(".tour-hero"));
  assert.equal(
    w.localStorage.getItem("volleyworld-v1"),
    null,
    "No standalone League save on startup",
  );
  assert.equal(w.document.querySelector('[data-action^="Nations."]'), null);
  assert.equal(w.document.querySelector('[data-action^="Full."]'), null);
  assert.equal(w.document.querySelector('[data-action^="Challenger."]'), null);
  for (const name of [
    "V",
    "Seasons",
    "Settings",
    "Cloud",
    "state",
    "render",
    "__tour",
    "__full",
    "__nations",
    "__challenger",
  ])
    assert.equal(w[name], undefined, "production API leak " + name);
  const click = (selector) => {
    const e = w.document.querySelector(selector);
    assert(e, "missing " + selector);
    assert(!e.disabled, "disabled " + selector);
    e.click();
  };
  click('[data-action="Circuit.create"]');
  assert(w.document.querySelector(".tour-setup"));
  click('[data-action="Circuit.start"]');
  assert.equal(w.document.querySelectorAll(".tour-journey-card").length, 7);
  click('[data-action="Circuit.viewStage"][data-arg="0"]');
  click('[data-action="Circuit.match"]');
  click('[data-action="Circuit.dialogEdit"]');
  assert(w.document.getElementById("editor").open);
  click('[data-action="simulateEditorSet"]:not([hidden])');
  w.document.getElementById("generatedWinner").value = "1";
  w.document.getElementById("generatedLosses").value = "2";
  click('[data-action="generateScore"]');
  w.document
    .getElementById("scoreForm")
    .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(!w.document.getElementById("editor").open);
  const key = "volleyworld-circuit-v2-guest";
  let record = JSON.parse(w.localStorage.getItem(key))[0];
  assert.equal(record.played, 1);
  click('[data-action="Circuit.finish"]');
  record = JSON.parse(w.localStorage.getItem(key))[0];
  assert.equal(record.status, "completed");
  assert.equal(record.played, 1071);
  assert.equal(record.snapshot.world.groups.length, 8);
  assert.equal(record.podium.length, 3);
  click('[data-action="Circuit.achievements"]');
  await new Promise((r) => setTimeout(r, 20));
  assert(w.document.querySelector(".tour-country-card"));
  click('[data-action="Circuit.achievementCompetition"][data-arg="world"]');
  assert.equal(w.document.querySelectorAll(".tour-country-card").length, 3);
  click('[data-action="Circuit.enter"]');
  click('[data-action="Circuit.nextSeason"]');
  await new Promise((r) => setTimeout(r, 20));
  assert(w.document.querySelector(".tour-setup"));
  click('[data-action="Circuit.start"]');
  const records = JSON.parse(w.localStorage.getItem(key));
  assert.equal(records.length, 2);
  assert.equal(records[1].season_number, 2);
  const previous = records[0].snapshot,
    next = records[1].snapshot;
  for (const region of ["CEV", "AVC", "NORCECA", "CAVB"]) {
    const wc = previous.world.groups
      .flatMap((g) => g.teamIds)
      .filter(
        (id) =>
          previous.regions[region].upper.includes(id) ||
          previous.regions[region].lower.includes(id),
      );
    assert.equal(wc.length, 8);
    assert(wc.every((id) => next.regions[region].upper.includes(id)));
  }
  assert.equal(networkCalls.length, 0, "Guest circuit must not write to cloud");
  assert.equal(errors.length, 0, errors.map((e) => e.message).join("\n"));
  w.close();
  console.log(
    "PASS regional circuit production bundle: real Vite ESM/SDK; inherited score editor;1071 matches;World Cup32;medalist filters;WC qualifiers inherit next season;guest isolated",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
