const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { JSDOM } = require("jsdom");
const fixture = "tests/fixtures/main/";
function deterministic(w, seed = 1742) {
  let n = seed,
    uuid = 0;
  w.Math.random = () =>
    (n = (Math.imul(1664525, n) + 1013904223) >>> 0) / 4294967296;
  const NativeDate = w.Date;
  w.Date = class extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : ["2026-10-16T12:00:00.000Z"]));
    }
    static now() {
      return 1792152000000;
    }
  };
  Object.defineProperty(w.crypto, "randomUUID", {
    configurable: true,
    value: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}`,
  });
}
function domain(version, seed) {
  const ctx = vm.createContext({
    module: { exports: {} },
    console,
    crypto: {},
    Date: class extends Date {
      constructor(...a) {
        super(...(a.length ? a : ["2026-10-16T12:00:00Z"]));
      }
      static now() {
        return 1792152000000;
      }
    },
  });
  ctx.Math = Object.create(Math);
  deterministic(ctx, seed);
  vm.runInContext(
    fs.readFileSync(
      version === "main" ? fixture + "engine.js" : ".test-build/engine.js",
      "utf8",
    ),
    ctx,
  );
  return { ctx, V: ctx.module.exports };
}
function ui(version, seed = 1742, storage) {
  const html = fs
    .readFileSync(
      version === "main" ? fixture + "index.html" : "index.html",
      "utf8",
    )
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, {
      url: "https://example.invalid/",
      runScripts: "dangerously",
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
  if (storage)
    for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  const execute = (code) => vm.runInContext(code, dom.getInternalVMContext());
  if (version === "main") {
    for (const f of ["engine", "qualification", "seasons", "app", "settings"])
      execute(fs.readFileSync(fixture + f + ".js", "utf8"));
  } else {
    execute(fs.readFileSync(".test-build/engine-browser.js", "utf8"));
    execute(fs.readFileSync(".test-build/app.js", "utf8"));
    w.__initializeActions();
  }
  const run = (code) => execute(code),
    data = () =>
      Object.fromEntries(
        Object.keys(w.localStorage)
          .sort()
          .map((k) => [k, w.localStorage.getItem(k)]),
      );
  return { dom, w, run, data, close: () => w.close() };
}
function canonical(app, id = "body") {
  const src =
      id === "body" ? app.w.document.body : app.w.document.getElementById(id),
    copy = src.cloneNode(true);
  // Approved product changes have their own feature suite. Compare the remaining
  // main contract without pretending the new honours/podium/round UI is identical.
  const remove = (selectors) =>
    copy.querySelectorAll(selectors).forEach((el) => el.remove());
  // Completed-season presentation is covered by season-summary.cjs. Keep the
  // legacy heading/podium comparison and all persisted-state comparisons.
  if (app.run("tab") === "season-results") {
    const content = id === "content" ? copy : copy.querySelector("#content");
    if (content) {
      const heading = content.querySelector(".season-result-heading"),
        podium = content.querySelector(".podium-grid");
      content.replaceChildren(...[heading, podium].filter(Boolean));
    }
  }
  remove(
    '#heroSettings, [data-action="navigate"][data-arg="achievements"], .playoff-champion, .live-podium, #toast',
  );
  if (app.run("tab") === "league")
    remove(".qualification-news, .round-race-pending");
  remove(
    '[onclick="simRound()"], [data-action="simRound"], [data-action="nextLeagueRound"]',
  );
  for (const el of [copy, ...copy.querySelectorAll("*")]) {
    for (const a of [...el.attributes])
      if (/^on/i.test(a.name) || /^data-(action|trigger|arg\d*)$/.test(a.name))
        el.removeAttribute(a.name);
  }
  return copy.outerHTML.replace(/\s+<\/body>$/, "</body>");
}
function normalizeLegacyData(value) {
  return JSON.parse(
    JSON.stringify(value, (key, value) =>
      key === "setupConfirmed" ? undefined : value,
    ),
  );
}
function normalizeStorage(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      JSON.stringify(normalizeLegacyData(JSON.parse(value))),
    ]),
  );
}
function equivalent(a, b, label) {
  assert.equal(
    JSON.stringify(normalizeLegacyData(b.run("state"))),
    JSON.stringify(normalizeLegacyData(a.run("state"))),
    label + " state",
  );
  assert.deepEqual(
    normalizeStorage(b.data()),
    normalizeStorage(a.data()),
    label + " storage",
  );
  for (const id of [
    "body",
    "content",
    "seasonBar",
    "stats",
    "nav",
    "editor",
    "playoffMatchDialog",
    "teamLeagueDialog",
    "seasonDecision",
  ])
    assert.equal(canonical(b, id), canonical(a, id), label + " #" + id);
}
module.exports = {
  domain,
  ui,
  canonical,
  equivalent,
  fixture,
  deterministic,
  normalizeLegacyData,
};
