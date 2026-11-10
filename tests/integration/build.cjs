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
  click('[data-action="Tour.create"]');
  assert(w.document.querySelector(".tour-selection-intro"));
  click('[data-action="Tour.start"]');
  assert(w.document.querySelector("[data-regional-setup]"));
  click('[data-action="Tour.start"]');
  assert.equal(w.document.querySelectorAll(".tour-journey-card").length, 10);
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
  const preview = !!w.document.querySelector("[data-preview-local]");
  if (process.env.VOLLEY_PREVIEW_LOCAL === "1")
    assert(preview, "Preview build must display local-only notice");
  const storageKey = preview
    ? "volleyworld-tour-merit-preview-guest"
    : "volleyworld-tour-guest";
  if (preview) {
    click('[data-action="Cloud.open"]');
    assert(
      !w.document.querySelector("#loginForm"),
      "Preview has no login or real account writes",
    );
    assert(
      w.document
        .querySelector("#cloudContent")
        .textContent.includes("chơi thử độc lập"),
    );
    w.document.getElementById("cloudDialog").close();
  }
  let record = JSON.parse(w.localStorage.getItem(storageKey))[0];
  assert.equal(record.played, 1);
  assert.equal(record.snapshot.league.playoffEntry, undefined);
  click('[data-action="Tour.simRound"]');
  record = JSON.parse(w.localStorage.getItem(storageKey))[0];
  assert.equal(record.played, 16);
  assert(record.snapshot.career);
  assert(record.total_matches > 0);
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
  record = JSON.parse(w.localStorage.getItem(storageKey))[0];
  assert.equal(record.played, record.total_matches);
  assert.equal(record.snapshot.worldcup.world.groups.length, 8);
  assert.equal(record.status, "completed");
  assert.equal(
    w.document.querySelectorAll(".tour-champions > section").length,
    3,
  );
  assert.equal(w.document.querySelectorAll("[data-medal-place]").length, 9);
  const previous = record.snapshot;
  click('[data-action="Tour.nextSeason"]');
  assert(w.document.querySelector("[data-regional-setup]"));
  click('[data-action="Tour.start"]');
  const records = JSON.parse(w.localStorage.getItem(storageKey));
  assert.equal(records.length, 2);
  assert.equal(records[1].snapshot.career.previousSeasonId, previous.seasonId);
  assert.deepEqual(
    [...records[1].snapshot.roster].sort(),
    previous.worldcup.world.groups.flatMap((g) => g.teamIds).sort(),
  );
  assert.equal(w.document.querySelector(".tour-selection-intro"), null);
  click('[data-action="Tour.achievements"]');
  const medalistIds = new Set(
    records.flatMap((r) => Object.values(r.honours || {}).flat()),
  );
  const medalCards = [...w.document.querySelectorAll(".tour-country-card")];
  assert(medalCards.length > 0);
  assert(
    medalCards.every((el) => medalistIds.has(el.dataset.arg)),
    "production profiles only list medalists",
  );
  click('[data-action="Tour.achievementTeam"]');
  assert.equal(
    w.document.querySelectorAll("[data-achievement-season]").length,
    2,
  );
  assert.equal(w.localStorage.getItem("volleyworld-v1"), null);
  if (preview) {
    assert.equal(
      networkCalls.length,
      0,
      "Preview never connects to auth or production database",
    );
    assert.equal(
      w.localStorage.getItem("volleyworld-tour-guest"),
      null,
      "Preview does not use production guest storage",
    );
  }
  assert.equal(errors.length, 0, errors.map(String).join("\n"));
  dom.window.close();
  console.log(
    "PASS local career Tour production bundle: real Vite ESM/SDK, no network writes, World Cup32, inherited next season, per-set/forced editor, nine medals and team history",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
