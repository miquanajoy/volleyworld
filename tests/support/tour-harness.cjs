const fs = require("node:fs"),
  vm = require("node:vm"),
  { JSDOM } = require("jsdom"),
  { deterministic } = require("./parity-harness.cjs");
function ui(_version, seed = 1742, storage) {
  const html = fs
    .readFileSync("index.html", "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, {
      url: "https://example.invalid/",
      runScripts: "outside-only",
    }),
    w = dom.window;
  deterministic(w, seed);
  w.confirm = () => true;
  w.setTimeout = () => 0;
  w.clearTimeout = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.VOLLEY_CONFIG = {
    supabaseUrl: "https://test.supabase.co",
    supabaseKey: "sb_publishable_test",
  };
  if (storage)
    for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  const run = (code) => vm.runInContext(code, dom.getInternalVMContext());
  run(fs.readFileSync(".test-build/tour-app.js", "utf8"));
  return {
    dom,
    w,
    run,
    data: () =>
      Object.fromEntries(
        Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]),
      ),
    close: () => w.close(),
  };
}
module.exports = { ui };
