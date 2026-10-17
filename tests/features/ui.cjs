const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  V = require("../../.test-build/engine.js"),
  { ui } = require("../support/parity-harness.cjs");
const tick = () => new Promise((r) => setTimeout(r, 10));
const click = (t, selector) => {
  const el = t.w.document.querySelector(selector);
  assert(el, "missing " + selector);
  el.click();
};
const setup = (t) => {
  click(t, "#heroAction");
  assert.equal(t.run("tab"), "settings");
  for (const name of ["next", "review", "apply"])
    click(t, `[data-action="Settings.${name}"]`);
  assert.equal(t.run("tab"), "league");
};
const buildPlayoff = (t, format) =>
  t.run(
    `state=V.fresh(undefined,'${format}');state.rounds.flat().forEach(V.simulate);V.startPlayin(state);state.playin.forEach(V.simulate);V.draw(state);for(const d of V.playoffStages(state)){if(['final','bronze','gf','reset'].includes(d.key)&&'${format}'==='single'||['gf','reset'].includes(d.key)&&'${format}'==='double')break;state.bracket[d.key].forEach(V.simulate);V.advance(state)}save();navigate('playoff')`,
  );
(async () => {
  const t = ui("new");
  assert.equal(t.w.document.getElementById("heroSettings"), null);
  const before = t.run("JSON.stringify(state)");
  click(t, "#heroAction");
  assert.equal(t.run("tab"), "settings");
  click(t, '[data-action="Settings.setPlayoffFormat"][data-arg="double"]');
  assert.equal(t.run("JSON.stringify(state)"), before);
  click(t, '[data-action="navigate"][data-arg="home"]');
  setup(t);
  assert(t.run("state.setupConfirmed"));
  const id = t.run("state.seasonId");
  assert.equal(
    JSON.parse(t.w.localStorage.getItem("volleyworld-v1")).setupConfirmed,
    true,
  );
  const reload = ui("new", 1742, t.data());
  click(reload, "#heroAction");
  assert.equal(reload.run("tab"), "league");
  reload.close();
  assert(t.w.document.querySelector('[data-action="simRound"]'));
  click(t, '[data-action="simOne"]');
  assert(
    t.w.document.querySelector('[data-action="simRound"]'),
    "partial round keeps run button",
  );
  const result = t.run("JSON.stringify(state.rounds[0][0].sets)");
  click(t, '[data-action="simRound"]');
  assert.equal(t.run("JSON.stringify(state.rounds[0][0].sets)"), result);
  assert(!t.w.document.querySelector('[data-action="simRound"]'));
  assert(
    t.w.document
      .querySelector('[data-action="nextLeagueRound"]')
      .textContent.includes("Qua vòng tiếp theo"),
  );
  click(t, '[data-action="nextLeagueRound"]');
  assert.equal(t.run("round"), 1);
  assert(t.w.document.querySelector('[data-action="simRound"]'));
  t.run("round=30;renderLeague()");
  click(t, '[data-action="simRound"]');
  assert(
    t.w.document
      .querySelector('[data-action="nextLeagueRound"]')
      .textContent.includes("Tới vòng chưa hoàn tất"),
  );
  click(t, '[data-action="nextLeagueRound"]');
  assert.equal(t.run("round"), 1);
  t.run(
    "state.rounds.flat().filter(m=>!m.sets).forEach(V.simulate);save();round=30;renderLeague()",
  );
  assert(
    t.w.document
      .querySelector('[data-action="nextLeagueRound"]')
      .textContent.includes("Qua giai đoạn Play-in"),
  );
  click(t, '[data-action="nextLeagueRound"]');
  assert.equal(t.run("tab"), "playoff");
  assert.equal(t.run("state.playin.length"), 4);
  assert.equal(t.run("state.bracket"), null);
  t.run("V.simulate(state.playin[0]);save()");
  const playin = t.run("JSON.stringify(state.playin)");
  t.run('round=30;navigate("league")');
  click(t, '[data-action="nextLeagueRound"]');
  assert.equal(
    t.run("JSON.stringify(state.playin)"),
    playin,
    "revisiting round 31 never resets play-in scores",
  );
  assert.equal(t.run("state.seasonId"), id);
  // The editor reserves the same recent-form and live-score columns for both teams.
  const style = t.w.document.createElement("style");
  style.textContent =
    fs.readFileSync("src/styles/app.css", "utf8") +
    "\n" +
    fs.readFileSync("src/styles/enhancements.css", "utf8");
  t.w.document.head.append(style);
  t.run(
    'state=V.fresh();save();navigate("league");editMatch(state.rounds.flat().find(m=>[m.a,m.b].includes("POL")&&[m.a,m.b].includes("ITA")).id)',
  );
  const info = [
    ...t.w.document.querySelectorAll(".editor-team-row > .match-team-info"),
  ];
  assert.equal(info.length, 2);
  for (const el of info) {
    assert(el.querySelector(":scope > .form-strip"));
    assert.equal(t.w.getComputedStyle(el).display, "grid");
    assert(t.w.getComputedStyle(el).gridTemplateColumns.includes("96px"));
  }
  for (const el of t.w.document.querySelectorAll(".live-set-score")) {
    assert(el.hidden);
    assert.equal(t.w.getComputedStyle(el).visibility, "hidden");
  }
  t.w.document.getElementById("a0").value = "25";
  t.w.document.getElementById("b0").value = "20";
  t.w.document
    .getElementById("b0")
    .dispatchEvent(new t.w.Event("input", { bubbles: true }));
  assert(!t.w.document.getElementById("liveScore0").hidden);
  assert.equal(t.w.document.getElementById("liveScore0").textContent, "1");
  t.w.document.getElementById("editor").close();
  // Normal playoff: silver is awarded when the final finishes, even before bronze.
  buildPlayoff(t, "single");
  t.run(
    "V.simulate(state.bracket.final[0]);V.advance(state);save();renderPlayoff()",
  );
  assert(!t.run("V.complete(state)"));
  assert.equal(
    t.w.document.querySelectorAll(".live-podium [data-place]").length,
    3,
  );
  assert(
    t.w.document
      .querySelector('.live-podium [data-place="2"]')
      .textContent.includes(
        t.run("V.get(V.loser(state.bracket.final[0])).name"),
      ),
  );
  assert(
    t.w.document
      .querySelector('.live-podium [data-place="3"]')
      .textContent.includes("Chờ kết quả"),
  );
  t.run("V.simulate(state.bracket.bronze[0]);save();renderPlayoff()");
  assert(
    !t.w.document
      .querySelector('.live-podium [data-place="3"]')
      .textContent.includes("Chờ kết quả"),
  );
  for (const reset of [false, true]) {
    buildPlayoff(t, "double");
    t.run(
      `state.bracket.gf[0].sets=${reset ? "[[20,25],[20,25],[20,25]]" : "[[25,20],[25,20],[25,20]]"};V.advance(state);save();renderPlayoff()`,
    );
    if (reset) {
      assert(t.w.document.querySelector(".live-podium"));
      assert(
        t.w.document
          .querySelector('.live-podium [data-place="1"]')
          .textContent.includes("Chờ chung kết tổng"),
      );
      t.run(
        "V.simulate(state.bracket.reset[0]);V.advance(state);save();renderPlayoff()",
      );
    }
    assert(t.run("V.complete(state)"));
    const medals = t.run("V.podium(state)");
    for (let i = 0; i < 3; i++)
      assert(
        t.w.document
          .querySelector(`.live-podium [data-place="${i + 1}"]`)
          .textContent.includes(V.get(medals[i]).name),
      );
  }
  t.close();
  // Season-by-season honours, non-participation, incomplete/cancelled seasons.
  const make = (n, format) => {
      const s = V.fresh(undefined, format);
      s.seasonNumber = n;
      V.finishAll(s);
      return s;
    },
    s1 = make(1, "single"),
    s2 = make(2, "double"),
    s3 = V.fresh(V.defaultIds.filter((x) => x !== "POL").concat("VIE"));
  s3.seasonNumber = 3;
  V.simulate(s3.rounds[0][0]);
  const active = V.fresh();
  active.seasonNumber = 4;
  const row = (s, status = "completed") => ({
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    status,
    created_at: s.seasonCreatedAt,
    ended_at: "2026-10-16T12:00:00Z",
    podium: status === "completed" ? V.podium(s) : [],
    played: V.matches(s).filter((m) => m.sets).length,
    snapshot: s,
  });
  const records = [row(s1), row(s2), row(s3, "cancelled")],
    h = ui("new");
  h.w.bundle = JSON.parse(
    JSON.stringify({
      format: "volleyworld-seasons",
      version: 1,
      active,
      history: records,
    }),
  );
  h.run('state=Seasons.importAll(bundle);save();navigate("achievements")');
  click(h, '[data-action="achievementRegion"][data-arg="AVC"]');
  assert.equal(
    h.w.document.querySelectorAll(".achievement-country").length,
    V.regionTeams("AVC").length,
  );
  click(h, '[data-action="achievementTeam"][data-arg="VIE"]');
  const season = (n) =>
    h.w.document.querySelector(
      `.achievement-season[data-season="${[s1, s2, s3, active][n - 1].seasonId}"]`,
    );
  assert.equal(
    season(1).querySelector(".achievement-placement").textContent,
    "-",
  );
  assert.equal(
    season(2).querySelector(".achievement-placement").textContent,
    "-",
  );
  assert(season(3).textContent.includes("Đã hủy"));
  assert.equal(
    season(4).querySelector(".achievement-placement").textContent,
    "-",
  );
  const champion = V.podium(s1)[0];
  click(
    h,
    `[data-action="achievementRegion"][data-arg="${V.get(champion).region}"]`,
  );
  click(h, `[data-action="achievementTeam"][data-arg="${champion}"]`);
  assert.equal(
    season(1).querySelector(".achievement-placement").textContent,
    "🥇",
  );
  assert(season(1).textContent.includes("SS 1"));
  assert(season(4).textContent.includes("Chưa bắt đầu"));
  const qfloser = V.loser(s1.bracket.qf[0]);
  click(
    h,
    `[data-action="achievementRegion"][data-arg="${V.get(qfloser).region}"]`,
  );
  click(h, `[data-action="achievementTeam"][data-arg="${qfloser}"]`);
  assert(season(1).textContent.includes("#5–#8 · SS 1"));
  // Uncached history: fetch actual snapshot; failed fetch stays unknown, not '-'.
  h.w.metadata = records.map(({ snapshot, ...r }) => ({ ...r, synced: true }));
  h.run("Seasons.restoreRecords(metadata)");
  let calls = 0;
  h.w.fetchHistory = async (id) => {
    calls++;
    return JSON.parse(
      JSON.stringify(records.find((r) => r.season_id === id).snapshot),
    );
  };
  h.run("__ports().cloud.fetchSeason=fetchHistory");
  click(h, '[data-action="achievementRegion"][data-arg="AVC"]');
  click(h, '[data-action="achievementTeam"][data-arg="VIE"]');
  await tick();
  assert(calls >= 3);
  assert.equal(
    season(1).querySelector(".achievement-placement").textContent,
    "-",
  );
  assert(season(3).textContent.includes("Đã hủy"));
  h.run("Seasons.restoreRecords(metadata)");
  h.w.fetchHistory = async () => {
    throw Error("offline");
  };
  h.run("__ports().cloud.fetchSeason=fetchHistory");
  click(h, '[data-action="achievementTeam"][data-arg="VIE"]');
  await tick();
  assert(season(1).textContent.includes("Chưa tải được"));
  assert(!season(1).textContent.includes("Không tham gia"));
  let release;
  h.w.fetchHistory = () =>
    new Promise((r) => {
      release = r;
    });
  h.run("__ports().cloud.fetchSeason=fetchHistory");
  click(h, '[data-action="achievementTeam"][data-arg="VIE"]');
  await tick();
  h.w.otherKey = () => "different-account";
  h.run('__ports().cloud.storageKey=otherKey;navigate("home")');
  const safe = h.w.document.getElementById("content").innerHTML;
  if (release) release(s1);
  await tick();
  assert.equal(
    h.w.document.getElementById("content").innerHTML,
    safe,
    "stale history fetch must not overwrite account UI",
  );
  h.close();
  console.log(
    "PASS feature UI: mandatory setup/reload, partial/completed/last-round CTA and play-in preservation; aligned form columns/live score; silver for single/GF/reset; regional honours and every season; absent/cancelled/pending/offline/scoped remote history",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
