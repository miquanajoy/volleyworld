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
  ])
    assert.equal(w[name], undefined, "production global leak " + name);
  const click = (selector) => {
    const el = w.document.querySelector(selector);
    assert(el, "missing " + selector);
    el.click();
  };
  click("#heroSettings");
  assert(
    w.document
      .getElementById("content")
      .textContent.includes("Tùy chỉnh giải đấu"),
  );
  click('[data-action="navigate"][data-arg="home"]');
  click("#heroAction");
  click('[data-action="simOne"]');
  const snapshot = JSON.parse(w.localStorage.getItem("volleyworld-v1"));
  assert.equal(snapshot.rounds.flat().filter((m) => m.sets).length, 1);
  click('[data-action="navigate"][data-arg="table"]');
  assert.equal(w.document.querySelectorAll("#rows tr").length, 32);
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
  assert.equal(errors.length, 0, errors.map(String).join("\n"));
  dom.window.close();
  console.log(
    "PASS production build: emitted HTML/assets resolve; actual Vite ESM and bundled Supabase SDK initialize; guest setup/start/simulation/table/account/manual-save work; no test/global API leaks or DOM runtime errors",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
