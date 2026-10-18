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
  assert(w.document.getElementById("content").textContent.includes("Mùa 1"));
  assert(
    !w.document.getElementById("saved").textContent.includes("Chưa đồng bộ"),
    "real bundled SDK must initialize guest state",
  );
  for (const name of [
    "V",
    "Seasons",
    "Settings",
    "Cloud",
    "state",
    "render",
    "__installAccount",
    "__full",
  ])
    assert.equal(w[name], undefined, "production global leak " + name);
  const click = (selector) => {
    const el = w.document.querySelector(selector);
    assert(el, "missing " + selector);
    el.click();
  };
  click("#heroAction");
  assert(
    w.document
      .getElementById("content")
      .textContent.includes("Tùy chỉnh giải đấu"),
  );
  click('[data-action="Settings.next"]');
  click('[data-action="Settings.review"]');
  click('[data-action="Settings.apply"]');
  const beforeDraft = w.localStorage.getItem("volleyworld-v1");
  click('[data-action="editMatch"]');
  assert.equal(
    w.document.querySelectorAll(".set-block:not([hidden])").length,
    1,
  );
  click('[data-action="simulateEditorSet"]:not([hidden])');
  assert.equal(
    w.document.querySelectorAll(".set-block:not([hidden])").length,
    2,
  );
  w.document.getElementById("generatedWinner").value = "1";
  w.document.getElementById("generatedLosses").value = "2";
  click('[data-action="generateScore"]');
  assert.equal(w.document.getElementById("liveScore1").textContent, "3");
  assert.equal(w.localStorage.getItem("volleyworld-v1"), beforeDraft);
  w.document
    .getElementById("scoreForm")
    .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  assert(!w.document.getElementById("editor").open);
  assert.equal(
    JSON.parse(w.localStorage.getItem("volleyworld-v1")).rounds[0][0].sets
      .length,
    5,
  );
  click('[data-action="simOne"]');
  const snapshot = JSON.parse(w.localStorage.getItem("volleyworld-v1"));
  assert.equal(snapshot.rounds.flat().filter((m) => m.sets).length, 2);
  click('[data-action="navigate"][data-arg="table"]');
  assert.equal(w.document.querySelectorAll("#rows tr").length, 32);
  assert.equal(w.document.querySelectorAll("#rows .rank-movement").length, 32);
  const progressBeforeHistory = w.localStorage.getItem("volleyworld-v1"),
    roundSelector = w.document.getElementById("standingsRound");
  roundSelector.value = "1";
  roundSelector.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert.equal(w.document.querySelectorAll("#rows .rank-same").length, 32);
  assert(
    w.document
      .querySelector(".standings-round-note")
      .textContent.includes("vòng 2"),
  );
  assert.equal(w.localStorage.getItem("volleyworld-v1"), progressBeforeHistory);
  const latestSelector = w.document.getElementById("standingsRound");
  latestSelector.value = "latest";
  latestSelector.dispatchEvent(new w.Event("change", { bubbles: true }));
  click("#accountButton");
  assert(
    w.document
      .getElementById("cloudContent")
      .textContent.includes("Đăng nhập bằng liên kết"),
    "actual SDK login form",
  );
  click("#saveProgress");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(w.document.getElementById("saveProgress").disabled, false);
  assert(
    w.document
      .getElementById("toast")
      .textContent.includes("Đã lưu trên thiết bị"),
  );
  click('[data-action="closeDialog"][data-arg="cloudDialog"]');
  click('#nav [data-action="navigate"][data-arg="achievements"]');
  click('[data-action="achievementView"][data-arg="ranking"]');
  click('[data-action="achievementWorld"]');
  assert(
    w.document
      .querySelector(".ranking-unavailable")
      .textContent.includes("Chưa có đội đủ điều kiện"),
  );
  assert(
    w.document.querySelector(".points-rules").textContent.includes("4.170"),
  );
  // Exercise the expanded single-elimination flow through the actual Vite bundle.
  assert.equal(
    JSON.parse(w.localStorage.getItem("volleyworld-v1")).playoffEntry,
    "top16",
  );
  click('[data-action="navigate"][data-arg="league"]');
  click('[data-action="simLeague"]');
  click('[data-action="navigate"][data-arg="playoff"]');
  click('[data-action="startPlayin"]');
  click('[data-action="simPlayin"]');
  click('[data-action="drawBracket"]');
  assert.equal(
    w.document.querySelectorAll(
      '.round20-section [data-action="openPlayoffMatch"]',
    ).length,
    4,
  );
  click('[data-action="simStage"][data-arg="r20"]');
  click('[data-action="drawBracket"]');
  click('[data-action="setPlayoffLayout"][data-arg="tree"]');
  w.document.querySelector(".playoff-tree-scroll").scrollLeft = 480;
  for (const key of ["r16", "qf", "sf", "bronze", "final"]) {
    click(`[data-action="simStage"][data-arg="${key}"]`);
    assert.equal(
      w.document.querySelector(".playoff-tree-scroll").scrollLeft,
      480,
      "actual production render must retain bracket position",
    );
  }
  const completedClassic = JSON.parse(w.localStorage.getItem("volleyworld-v1"));
  assert.equal(completedClassic.bracket.r20.length, 4);
  assert(
    completedClassic.bracket.bronze[0].resultOrder <
      completedClassic.bracket.final[0].resultOrder,
  );
  assert.equal(
    w.document.querySelectorAll(".live-podium .medal-card").length,
    3,
  );
  const classicBeforeFull = w.localStorage.getItem("volleyworld-v1");
  click('[data-action="navigate"][data-arg="home"]');
  click('[data-action="Full.enter"]');
  click('[data-action="Full.create"]');
  assert(w.document.querySelector('[data-action="Full.drawWorld"]').disabled);
  click('[data-action="Full.section"][data-arg="CSV"]');
  click('[data-action="Full.simLeague"]');
  click('[data-action="Full.section"][data-arg="overview"]');
  assert(w.document.querySelector('[data-action="Full.drawWorld"]').disabled);
  click('[data-action="Full.finish"]');
  const full = JSON.parse(w.localStorage.getItem("volleyworld-full-guest"))[0];
  assert.equal(full.played, 543);
  assert.equal(full.status, "completed");
  assert.equal(
    w.document.querySelectorAll(".full-season-summary .medal-card").length,
    3,
  );
  assert.equal(
    w.document.querySelectorAll(".full-finals-table tbody tr").length,
    24,
  );
  assert.equal(w.localStorage.getItem("volleyworld-v1"), classicBeforeFull);
  // The third mode must work through production ESM, including a second cycle.
  const fullBeforeNations = w.localStorage.getItem("volleyworld-full-guest");
  click('[data-action="navigate"][data-arg="home"]');
  click('[data-action="Nations.enter"]');
  click('[data-action="Nations.create"]');
  click('[data-action="Nations.section"][data-arg="groups"]');
  assert.equal(w.document.querySelectorAll(".full-match").length, 32);
  click('[data-action="Nations.simRound"]');
  assert(w.document.querySelector('[data-action="Nations.next"]'));
  click('[data-action="Nations.next"]');
  click('[data-action="Nations.finish"]');
  let nations = JSON.parse(w.localStorage.getItem("volleyworld-nations-guest"));
  assert.equal(nations[0].played, 200);
  assert.equal(nations[0].status, "completed");
  click('[data-action="Nations.section"][data-arg="overview"]');
  assert.equal(
    w.document.querySelectorAll(".full-season-summary .medal-card").length,
    3,
  );
  click('footer [data-action="Seasons.requestNew"]');
  await new Promise((r) => setTimeout(r, 10));
  nations = JSON.parse(w.localStorage.getItem("volleyworld-nations-guest"));
  assert.equal(nations.length, 2);
  assert.equal(nations[1].cycle_number, 2);
  assert.equal(nations[1].previous_id, nations[0].season_id);
  assert.equal(nations[1].campaign_id, nations[0].campaign_id);
  assert.equal(w.document.querySelectorAll("[data-transfer-team]").length, 24);
  click("#saveProgress");
  await new Promise((r) => setTimeout(r, 10));
  assert(
    w.document.getElementById("toast").textContent.includes("Nations League"),
  );
  assert.equal(
    w.localStorage.getItem("volleyworld-full-guest"),
    fullBeforeNations,
  );
  assert.equal(w.localStorage.getItem("volleyworld-v1"), classicBeforeFull);
  assert.equal(errors.length, 0, errors.map(String).join("\n"));
  dom.window.close();
  console.log(
    "PASS production build: emitted HTML/assets resolve; actual Vite ESM and bundled Supabase SDK initialize; guest setup/start/simulation/table/account/manual-save work; no test/global API leaks or DOM runtime errors",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
