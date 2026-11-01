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
  Object.assign(w, {
    TextEncoder,
    TextDecoder,
    Headers,
    Request,
    Response,
    AbortController,
    fetch: async () => {
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
  click('[data-action="Tour.create"]');
  assert(w.document.querySelector(".tour-selection-intro"));
  click('[data-action="Tour.start"]');
  assert.equal(w.document.querySelectorAll(".tour-journey-card").length, 8);
  click('[data-action="Tour.viewStage"][data-arg="0"]');
  click('[data-action="Tour.edit"]');
  assert(w.document.getElementById("editor").open);
  click('[data-action="simulateEditorSet"]:not([hidden])');
  assert.equal(
    w.document.querySelectorAll(".set-block:not([hidden])").length,
    2,
  );
  w.document.getElementById("generatedWinner").value = "1";
  w.document.getElementById("generatedLosses").value = "2";
  click('[data-action="generateScore"]');
  w.document
    .getElementById("scoreForm")
    .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(!w.document.getElementById("editor").open);
  let record = JSON.parse(w.localStorage.getItem("volleyworld-tour-guest"))[0];
  assert.equal(record.played, 1);
  assert.equal(record.snapshot.league.playoffEntry, undefined);
  click('[data-action="Tour.simRound"]');
  record = JSON.parse(w.localStorage.getItem("volleyworld-tour-guest"))[0];
  assert.equal(record.played, 16);
  assert.equal(record.total_matches, 964);
  click('[data-action="Tour.section"][data-arg="table"]');
  assert.equal(
    w.document.querySelectorAll(".tour-standings tbody tr").length,
    32,
  );
  click('[data-action="Tour.team"]');
  assert(w.document.getElementById("teamLeagueDialog").open);
  assert(w.document.querySelector(".tour-team-stats"));
  assert(
    w.document
      .querySelector("#teamLeagueRows td")
      .textContent.includes("Vòng 1"),
  );
  click('[data-action="closeDialog"][data-arg="teamLeagueDialog"]');
  click("#saveProgress");
  await new Promise((r) => setTimeout(r, 10));
  assert(w.document.getElementById("toast").textContent.includes("Tour"));
  click('[data-action="Tour.finish"]');
  record = JSON.parse(w.localStorage.getItem("volleyworld-tour-guest"))[0];
  assert.equal(record.played, 964);
  assert.equal(record.status, "completed");
  assert.equal(
    w.document.querySelectorAll(".tour-champions > section").length,
    3,
  );
  assert.equal(w.document.querySelectorAll("[data-medal-place]").length, 9);
  click('[data-action="Tour.achievements"]');
  assert.equal(w.document.querySelectorAll(".tour-country-card").length, 39);
  click('[data-action="Tour.achievementTeam"]');
  assert.equal(
    w.document.querySelectorAll("[data-achievement-season]").length,
    1,
  );
  assert.equal(w.localStorage.getItem("volleyworld-v1"), null);
  assert.equal(errors.length, 0, errors.map(String).join("\n"));
  dom.window.close();
  console.log(
    "PASS production single-mode Tour: real Vite ESM/SDK, no standalone lobby/save, fixed original playoffs, per-set/forced editor, friendly team history, nine medals across three titles, team achievements and manual save",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
