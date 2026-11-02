import { achievementsHtml } from "./achievements";
import * as T from "../../domain/tour/index";
import * as F from "../../domain/full-season/index";
import * as C from "../../domain/challenger/index";
import * as V from "../../domain/index";
import type { Region } from "../../domain/types";
import { store } from "../../app/store";
import { renderApplication } from "../../app/ports";
import { $, esc } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { preserveBracketScroll } from "../../shared/bracket-scroll";
import { seasonTeam } from "../../components/season-match";
import { seasonMatchDetailHtml } from "../../components/season-match-detail";
import { team } from "../../components/team";
import { editFullScore } from "../matches/editor";
import { model, selected, clone, persist, backup, recordOf } from "./model";
import { tourCloud as cloud } from "./cloud";
import * as view from "./views";
const render = () => renderApplication();
const readonly = () =>
  !selected()?.snapshot ||
  selected()?.status === "completed" ||
  selected()?.phase === "conflict";
const active = () => !readonly() && model.stage === selected()?.snapshot?.stage;
function run(action: () => unknown) {
  try {
    return action();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa thực hiện được.");
  }
}
function mutate(action: (s: T.TourSeason) => void) {
  const row = selected();
  if (!row?.snapshot || readonly())
    throw Error("Mùa chỉ xem hoặc cần xử lý xung đột.");
  const s = clone(row.snapshot);
  action(s);
  if (!T.validTour(s))
    throw Error("Tiến trình không hợp lệ. Bản lưu trước được giữ.");
  backup(row.snapshot);
  Object.assign(row, recordOf(s, row.revision), { dirty: true });
  if (!persist()) toast("Chưa lưu được trên thiết bị. Hãy xuất tiến trình.");
  cloud.queue(row);
  render();
}
export function enter() {
  cloud.initialize();
  store.seasonView = null;
  store.tab = "tour";
  model.selected = null;
  model.group = null;
  model.setup = null;
  model.section = "journey";
  render();
}
export function create() {
  cloud.initialize();
  model.setup = {
    ids: T.defaultRoster(),
    region: "CEV",
    scope: model.scope,
    token: model.token,
  };
  store.tab = "tour";
  render();
}
export function cancelSetup() {
  model.setup = null;
  render();
}
const draft = () =>
  model.setup?.scope === model.scope && model.setup.token === model.token
    ? model.setup
    : null;
export function setupRegion(r: string) {
  const d = draft();
  if (d && F.regionOrder.includes(r as Region)) {
    d.region = r as Region;
    render();
  }
}
export function toggleTeam(id: string) {
  const d = draft();
  if (!d || !V.get(id)) return;
  d.ids = d.ids.includes(id) ? d.ids.filter((x) => x !== id) : [...d.ids, id];
  render();
}
export function resetRoster() {
  const d = draft();
  if (d) {
    d.ids = T.defaultRoster();
    render();
  }
}
export function start() {
  const d = draft();
  if (!d) return;
  run(() => {
    if (!T.validRoster(d.ids))
      throw Error("Cần đúng 7 Âu, 7 Á, 6 Nam Mỹ, 7 Bắc/Trung Mỹ và 5 Phi.");
    const s = T.freshMeritTour(
        Math.max(0, ...model.records.map((r) => r.season_number)) + 1,
        d.ids,
      ),
      r = recordOf(s);
    r.dirty = true;
    model.records.push(r);
    model.selected = s.seasonId;
    model.setup = null;
    model.stage = 0;
    model.section = "journey";
    model.round = 0;
    if (!persist()) toast("Chưa lưu trên thiết bị. Hãy xuất file.");
    cloud.queue(r);
    render();
  });
}
function currentRound(s: T.TourSeason, stage: number): number {
  if ([0, 2, 4].includes(stage)) {
    const [a, b] = T.phaseBounds(stage);
    const r = s.league.rounds
      .slice(a, b)
      .findIndex((row) => row.some((m) => !m.sets));
    return r < 0 ? b - 1 : a + r;
  }
  if (stage === 3) return Math.max(0, (s.challenger?.rounds.length || 1) - 1);
  if (stage === 7 && s.worldcup.world)
    return F.worldCurrentRound(s.worldcup.world);
  const g = s.worldcup.regions[model.region];
  const pending = g.rounds.findIndex((row) => row.some((m) => !m.sets));
  return pending < 0 ? g.rounds.length - 1 : pending;
}
export function open(id: string) {
  if (!model.records.some((r) => r.season_id === id)) return;
  model.setup = null;
  model.selected = id;
  const snapshot = selected()?.snapshot;
  model.section = snapshot && !T.complete(snapshot) ? "matches" : "journey";
  model.stage = Math.min(7, snapshot?.stage || 0);
  model.group = null;
  if (snapshot) model.round = currentRound(snapshot, model.stage);
  store.tab = "tour";
  render();
}
export function section(key: string) {
  if (
    ![
      "journey",
      "matches",
      "table",
      "playoff",
      "teams",
      "rules",
      "qualifiers",
    ].includes(key)
  )
    return;
  const oldStage = model.stage;
  model.section = key;
  const s = selected()?.snapshot;
  if (s && key === "journey") model.stage = Math.min(s.stage, 7);
  if (s && key === "qualifiers")
    model.stage =
      [1, T.qualificationStage(s), 7].filter((n) => n <= s.stage).at(-1) ?? 1;
  if (s && model.stage !== oldStage) model.round = currentRound(s, model.stage);
  render();
}
export function competition(key: string) {
  const s = selected()?.snapshot;
  if (!s || !["league", "challenger", "worldcup"].includes(key)) return;
  const phases =
    key === "league"
      ? [0, 2, 4, T.leagueStage(s)]
      : key === "challenger"
        ? [3]
        : [1, T.qualificationStage(s), 7];
  model.stage = phases.filter((n) => n <= s.stage).at(-1) ?? phases[0];
  model.group = null;
  model.round = currentRound(s, model.stage);
  model.section =
    model.stage > s.stage && key === "worldcup"
      ? "qualifiers"
      : model.section === "table"
        ? "table"
        : "matches";
  render();
}
export function resume() {
  const s = selected()?.snapshot;
  if (!s) return;
  model.stage = Math.min(7, s.stage);
  model.group = null;
  model.round = currentRound(s, model.stage);
  model.section = T.complete(s) ? "journey" : "matches";
  render();
}
export function viewStage(value: string, targetSection?: string) {
  const n = Number(value),
    s = selected()?.snapshot;
  if (!s || !Number.isInteger(n) || n < 0 || n > 7 || n > s.stage) return;
  model.stage = n;
  model.group = null;
  model.round = currentRound(s, n);
  model.section =
    targetSection && ["table", "playoff", "matches"].includes(targetSection)
      ? targetSection
      : "matches";
  render();
}
export function round(value: string) {
  const r = Number(value);
  if (!Number.isInteger(r) || r < 0 || r > 30) return;
  model.round = r;
  render();
}
export function region(value: string) {
  if (!F.regionOrder.includes(value as Region)) return;
  model.region = value as Region;
  model.group = null;
  const s = selected()?.snapshot;
  if (s) model.round = currentRound(s, model.stage);
  render();
}
export function group(value: string, targetSection?: string) {
  const s = selected()?.snapshot;
  if (!s || ![1, 7].includes(model.stage)) return;
  if (value === "all") {
    model.group = null;
    render();
    return;
  }
  const index = Number(value),
    groups =
      model.stage === 7
        ? s.worldcup.world?.groups || []
        : s.worldcup.regions[model.region].groups || [
            s.worldcup.regions[model.region].teamIds,
          ];
  if (!Number.isInteger(index) || index < 0 || index >= groups.length) return;
  model.group = index;
  if (targetSection && ["table", "matches"].includes(targetSection))
    model.section = targetSection;
  render();
}
export function swissView(value: string) {
  if (value !== "tree" && value !== "matches") return;
  model.swissView = value;
  render();
}
export function next() {
  run(() => {
    const s = selected()?.snapshot;
    if (!s || !active()) return;
    if (!T.stageDone(s))
      throw Error("Hoàn tất chặng hiện tại trước khi tiếp tục.");
    mutate(T.nextStage);
    const fresh = selected()!.snapshot!;
    model.stage = Math.min(7, fresh.stage);
    model.group = null;
    model.round = currentRound(fresh, model.stage);
    model.section = T.complete(fresh) ? "journey" : "matches";
    render();
  });
}
export function simRound() {
  if (!active()) return;
  run(() => {
    mutate(T.simulateBatch);
    const s = selected()!.snapshot!;
    model.round = currentRound(s, s.stage);
    render();
  });
}
export function qualifierStage(prefix: string) {
  if (
    !active() ||
    !(T.merit(selected()!.snapshot!) ? [6] : [1, 5]).includes(
      selected()!.snapshot!.stage,
    )
  )
    return;
  run(() =>
    mutate((s) =>
      T.simulateMatches(
        s,
        T.batch(s)
          .filter((m) => m.id.startsWith(prefix + "K"))
          .map((m) => m.id),
      ),
    ),
  );
}
export function stage(key: string) {
  if (
    !active() ||
    ![3, T.leagueStage(selected()!.snapshot!), 7].includes(
      selected()!.snapshot!.stage,
    )
  )
    return;
  run(() =>
    mutate((s) => {
      const b =
        s.stage === 3
          ? s.challenger!.bracket
          : s.stage === T.leagueStage(s)
            ? s.league.bracket
            : s.worldcup.world!.bracket;
      const ms = b?.[
        key as import("../../domain/types").StageKey as keyof typeof b
      ] as import("../../domain/types").Match[] | undefined;
      if (!Array.isArray(ms)) throw Error("Vòng chưa mở.");
      T.simulateMatches(
        s,
        ms.map((m) => m.id),
      );
    }),
  );
}
export function finishStage() {
  if (!active()) return;
  if (confirm("Mô phỏng các trận còn lại của chặng này?"))
    run(() => {
      mutate(T.finishStage);
      const s = selected()!.snapshot!;
      model.round = currentRound(s, s.stage);
      render();
    });
}
export function finish() {
  if (readonly()) return;
  if (confirm("Mô phỏng toàn bộ chặng còn lại và kết thúc mùa Tour?"))
    run(() => {
      mutate(T.finishTour);
      model.section = "journey";
      model.stage = 7;
      render();
    });
}
const editable = (id: string) => {
  const s = selected()?.snapshot;
  return !!s && active() && T.batch(s).some((m) => m.id === id);
};
export function simMatch(id: string) {
  if (
    !editable(id) ||
    T.matches(selected()!.snapshot!).find((m) => m.id === id)?.sets
  )
    return;
  run(() =>
    mutate((s) => {
      const m = T.batch(s).find((m) => m.id === id)!;
      V.simulate(m);
      T.advance(s);
    }),
  );
}
export function edit(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && T.matches(s).find((m) => m.id === id),
    scope = model.scope,
    token = model.token;
  if (!s || !m || !editable(id)) return;
  if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  editFullScore({
    match: m,
    current: () =>
      store.tab === "tour" &&
      scope === model.scope &&
      token === model.token &&
      selected() === row &&
      row!.snapshot === s &&
      editable(id),
    teamMarkup: (id) => seasonTeam(id, competitionMatches(s, m.id)),
    commit: (sets) => mutate((d) => T.recordScore(d, id, sets)),
  });
}
function competitionMatches(s: T.TourSeason, id: string) {
  if ([0, 2, 4].includes(model.stage))
    return s.league.rounds.slice(0, model.round + 1).flat();
  if (model.stage === T.leagueStage(s)) return V.matches(s.league);
  if (model.stage === 3 && s.challenger)
    return model.section === "playoff"
      ? C.challengerMatches(s.challenger)
      : s.challenger.rounds.slice(0, model.round + 1).flat();
  if (model.stage === 1) {
    const g =
      s.worldcup.regions[
        V.get(T.matches(s).find((m) => m.id === id)?.a || s.roster[0]).region
      ];
    return [
      ...g.rounds.slice(0, model.round + 1).flat(),
      ...(model.section === "playoff" ? F.qualifierMatches(g.playoff) : []),
    ];
  }
  if (model.stage === T.qualificationStage(s))
    return [
      ...F.regionOrder.flatMap((r) => [
        ...s.worldcup.regions[r].rounds.flat(),
        ...F.qualifierMatches(s.worldcup.regions[r].playoff),
      ]),
      ...(s.worldcup.intercontinental?.branches.flatMap(F.qualifierMatches) ||
        []),
    ];
  const w = s.worldcup.world;
  return w
    ? [
        ...w.groups.flatMap((g) => g.rounds.slice(0, model.round + 1).flat()),
        ...(model.section === "playoff"
          ? F.worldPlayOrder.flatMap((k) => w.bracket?.[k] || [])
          : []),
      ]
    : [];
}
let dialog: null | {
  id: string;
  scope: string;
  token: number;
  row: ReturnType<typeof selected>;
  snapshot: T.TourSeason;
} = null;
export function showMatch(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && T.matches(s).find((m) => m.id === id);
  if (!s || !m) return;
  dialog = { id, scope: model.scope, token: model.token, row, snapshot: s };
  $("playoffMatchTitle").textContent = "Chi tiết trận · VolleyWorld Tour";
  $("playoffMatchBody").innerHTML = seasonMatchDetailHtml(m, !editable(id), {
    edition: `TOUR · MÙA ${s.seasonNumber}`,
    label: T.calendar(s)[Math.min(model.stage, 7)][0],
    prefix: "Tour",
    renderTeam: (id) => seasonTeam(id, competitionMatches(s, m.id)),
    lockMessage: "Kết quả đã được chốt hoặc trận chưa đến lịch thi đấu.",
  });
  $("playoffMatchDialog").showModal();
}
export function actDialog(editing = false) {
  const c = dialog;
  if (
    !c ||
    store.tab !== "tour" ||
    model.scope !== c.scope ||
    model.token !== c.token ||
    selected() !== c.row ||
    c.row?.snapshot !== c.snapshot
  ) {
    $("playoffMatchDialog").close();
    toast("Tiến trình đã thay đổi. Hãy mở lại trận.");
    return;
  }
  if (editing) edit(c.id);
  else {
    simMatch(c.id);
    $("playoffMatchDialog").close();
  }
}
export function showTeam(id: string) {
  const s = selected()?.snapshot;
  if (!s || !V.get(id)) return;
  let source: import("../../domain/types").Match[];
  if ([0, 2, 4].includes(model.stage))
    source = s.league.rounds.flatMap((row, i) =>
      row.map((m) =>
        i > model.round ? { ...m, sets: null, resultOrder: undefined } : m,
      ),
    );
  else if (model.stage === T.leagueStage(s)) source = V.matches(s.league);
  else if (model.stage === 3 && s.challenger)
    source =
      model.section === "playoff"
        ? C.challengerMatches(s.challenger)
        : s.challenger.rounds.flatMap((row, i) =>
            row.map((m) =>
              i > model.round
                ? { ...m, sets: null, resultOrder: undefined }
                : m,
            ),
          );
  else if (model.stage === 1) {
    const g = s.worldcup.regions[V.get(id).region];
    source =
      model.section === "playoff"
        ? F.qualifierMatches(g.playoff)
        : g.rounds.flatMap((row, i) =>
            row.map((m) =>
              i > model.round
                ? { ...m, sets: null, resultOrder: undefined }
                : m,
            ),
          );
  } else if (model.stage === T.qualificationStage(s))
    source = [
      ...F.regionOrder.flatMap((r) =>
        F.qualifierMatches(s.worldcup.regions[r].playoff),
      ),
      ...(s.worldcup.intercontinental?.branches.flatMap(F.qualifierMatches) ||
        []),
    ];
  else if (s.worldcup.world) {
    const w = s.worldcup.world;
    source =
      model.section === "playoff"
        ? F.worldPlayOrder.flatMap((k) => w.bracket?.[k] || [])
        : w.groups.flatMap((g) =>
            g.rounds.flatMap((row, i) =>
              row.map((m) =>
                i > model.round
                  ? { ...m, sets: null, resultOrder: undefined }
                  : m,
              ),
            ),
          );
  } else source = [];
  const ms = source.filter((m) => m.a === id || m.b === id);
  $("teamLeagueTitle").innerHTML = team(id);
  const played = ms.filter((m) => m.sets),
    wins = played.filter((m) => V.winner(m) === id).length;
  const form = F.fullForm(ms, id);
  const edition = [0, 2, 4, T.leagueStage(s)].includes(model.stage)
    ? "World League"
    : model.stage === 3
      ? "Challenger"
      : model.stage === 1
        ? "Vòng loại khu vực"
        : model.stage === T.qualificationStage(s)
          ? "World Cup Play-in"
          : "World Cup";
  $("teamLeagueSummary").innerHTML =
    `<div class="tour-team-stats"><span><b>${played.length}<small>/${ms.length}</small></b>ĐÃ ĐẤU</span><span class="is-win"><b>${wins}</b>THẮNG</span><span class="is-loss"><b>${played.length - wins}</b>THUA</span></div><div class="tour-team-context"><p class="sub">Mùa ${s.seasonNumber} · ${edition}${[0, 2, 4, 3, 7].includes(model.stage) && model.section !== "playoff" ? ` · Đến vòng ${model.round + 1}` : ""}</p><div class="team-league-form"><span class="form-strip" aria-label="5 trận gần nhất, cũ đến mới">${Array.from({ length: 5 - form.length }, () => '<span class="form-dot empty">–</span>').join("")}${form.map((f) => `<span class="form-dot ${f.win ? "form-win" : "form-loss"}" title="${esc(f.opponent)}">${f.win ? "W" : "L"}</span>`).join("")}</span><span class="sub">5 trận gần nhất · cũ → mới</span></div></div>`;
  const label = (m: import("../../domain/types").Match): string => {
    let round = s.league.rounds.findIndex((row) =>
      row.some((x) => x.id === m.id),
    );
    if (round >= 0) return `Vòng ${round + 1}`;
    round =
      s.challenger?.rounds.findIndex((row) => row.some((x) => x.id === m.id)) ??
      -1;
    if (round >= 0) return `Swiss · Vòng ${round + 1}`;
    for (const r of F.regionOrder) {
      round = s.worldcup.regions[r].rounds.findIndex((row) =>
        row.some((x) => x.id === m.id),
      );
      if (round >= 0) return `Vòng ${round + 1}`;
    }
    if (s.worldcup.world) {
      for (const g of s.worldcup.world.groups) {
        round = g.rounds.findIndex((row) => row.some((x) => x.id === m.id));
        if (round >= 0) return `Vòng bảng · Lượt ${round + 1}`;
      }
    }
    if (
      s.league.playin?.some((x) => x.id === m.id) ||
      model.stage === T.qualificationStage(s)
    )
      return "Play-in";
    for (const [key, name] of [
      ["r20", "Vòng 20 đội"],
      ["r16", "Vòng 16 đội"],
      ["qf", "Tứ kết"],
      ["sf", "Bán kết"],
      ["bronze", "Tranh hạng ba"],
      ["final", "Chung kết"],
    ] as const) {
      if (
        s.league.bracket?.[key]?.some((x) => x.id === m.id) ||
        s.challenger?.bracket?.[key as "r16"]?.some((x) => x.id === m.id) ||
        s.worldcup.world?.bracket?.[key as "r16"]?.some((x) => x.id === m.id)
      )
        return name;
    }
    return "Playoff khu vực";
  };
  $("teamLeagueRows").innerHTML = ms
    .map((m) => {
      const own = m.a === id,
        r = V.score(m),
        win = V.winner(m) === id;
      return `<tr class="${m.sets ? "" : "is-upcoming"}"><td><span class="tour-team-round">${label(m)}</span></td><td>${team(own ? m.b : m.a)}</td><td>${m.sets ? `<span class="team-league-result ${win ? "won" : "lost"}"><b>${r[own ? 0 : 1]}–${r[own ? 1 : 0]}</b><span>${win ? "Thắng" : "Thua"}</span></span>` : '<span class="team-league-unplayed" aria-label="Chưa có kết quả"></span>'}</td><td class="team-league-sets">${m.sets ? m.sets.map(([x, y], i) => `<span>S${i + 1} <b>${own ? x : y}–${own ? y : x}</b></span>`).join("") : ""}</td></tr>`;
    })
    .join("");
  $("teamLeagueDialog").showModal();
}
export async function exportSeasons(one = false) {
  const scope = model.scope,
    token = model.token,
    id = model.selected;
  try {
    const seasons: T.TourSeason[] = [];
    for (const r of model.records.filter((r) => !one || r.season_id === id)) {
      const s = await cloud.load(r.season_id);
      if (scope !== model.scope || token !== model.token) return;
      if (!s) throw Error("Chưa tải đủ dữ liệu.");
      seasons.push(clone(s));
    }
    const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { format: "volleyworld-tour-seasons", version: 1, seasons },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "volleyworld-tour.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa xuất được.");
  }
}
export async function importSeasons(file?: File) {
  if (!file) return;
  const scope = model.scope,
    token = model.token;
  try {
    if (file.size > 30_000_000) throw Error("File quá lớn.");
    const d = JSON.parse(await file.text());
    if (scope !== model.scope || token !== model.token) return;
    if (
      d.format !== "volleyworld-tour-seasons" ||
      d.version !== 1 ||
      !Array.isArray(d.seasons) ||
      !d.seasons.length ||
      d.seasons.length > 100 ||
      !d.seasons.every(T.validTour)
    )
      throw Error("File Tour không hợp lệ.");
    if (!confirm(`Nhập ${d.seasons.length} mùa Tour mới?`)) return;
    let n = Math.max(0, ...model.records.map((r) => r.season_number));
    for (const source of d.seasons as T.TourSeason[]) {
      const s = clone(source);
      s.seasonId = crypto.randomUUID();
      s.seasonNumber = ++n;
      s.createdAt = new Date().toISOString();
      const r = recordOf(s);
      r.dirty = true;
      model.records.push(r);
      cloud.queue(r);
    }
    persist();
    model.selected = null;
    render();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa nhập được.");
  }
}
export function restore() {
  run(() => {
    const row = selected();
    if (!row?.snapshot || readonly()) return;
    const rows = JSON.parse(
        localStorage.getItem(model.scope + "-backups") || "[]",
      ) as { state: T.TourSeason }[],
      b = rows.find(
        (b) => b.state?.seasonId === row.season_id && T.validTour(b.state),
      );
    if (!b) throw Error("Chưa có bản sao trước.");
    if (confirm("Khôi phục bản lưu Tour trước đó?")) {
      mutate((s) => Object.assign(s, clone(b.state)));
      model.stage = Math.min(7, selected()!.snapshot!.stage);
      model.section = "journey";
      render();
    }
  });
}
const achievementLoads = new Set<string>(),
  achievementFailed = new Set<string>();
export function achievements() {
  cloud.initialize();
  model.setup = null;
  model.selected = null;
  model.section = "achievements";
  store.tab = "tour";
  render();
}
export function achievementRegion(value: string) {
  if (!F.regionOrder.includes(value as Region)) return;
  model.achievementRegion = value as Region;
  model.achievementTeam = null;
  render();
}
export function achievementTeam(id: string) {
  if (id && !V.get(id)) return;
  model.achievementTeam = id || null;
  render();
}
export function achievementCompetition(value: string) {
  if (!["all", "league", "challenger", "worldcup"].includes(value)) return;
  model.achievementCompetition = value as typeof model.achievementCompetition;
  render();
}
function ensureAchievementHistory() {
  if (model.section !== "achievements") return;
  const token = model.token,
    scope = model.scope;
  let available =
    3 - [...achievementLoads].filter((k) => k.startsWith(scope + ":")).length;
  for (const row of model.records) {
    const key = scope + ":" + row.season_id;
    if (available <= 0) break;
    if (row.snapshot || achievementLoads.has(key) || achievementFailed.has(key))
      continue;
    available--;
    achievementLoads.add(key);
    void cloud
      .load(row.season_id)
      .catch(() => {
        if (token === model.token) {
          achievementFailed.add(key);
          model.error =
            "Chưa tải đủ lịch sử thành tích. Bấm Thử lại để tải tiếp.";
        }
      })
      .finally(() => {
        achievementLoads.delete(key);
        if (token === model.token && model.section === "achievements") render();
      });
  }
}
export async function sync() {
  achievementFailed.clear();
  await cloud.reload();
  if (model.section === "achievements") {
    ensureAchievementHistory();
    render();
  }
}
const loading = new Set<string>();
export function renderTour() {
  cloud.initialize();
  preserveBracketScroll(
    $("content"),
    `tour:${model.scope}:${model.selected || "library"}`,
    () => {
      const row = selected(),
        s = row?.snapshot;
      $("saved").textContent = model.records.some((r) => r.phase === "conflict")
        ? "⚠ Tour có xung đột"
        : model.records.some((r) => r.dirty)
          ? "● Tour đã giữ trên thiết bị · chờ đồng bộ"
          : "● Tour đã lưu";
      let html = `${model.error ? `<p class="notice">${esc(model.error)} <button data-action="Tour.sync">Thử lại</button></p>` : ""}${row?.phase === "conflict" ? '<div class="notice">Có tiến trình khác trên thiết bị khác. <button data-action="Tour.exportOne">Xuất bản thiết bị</button><button data-action="Tour.remote">Dùng bản online</button><button data-action="Tour.local">Giữ bản thiết bị</button></div>' : ""}`;
      if (model.section === "achievements" && !draft()) {
        html += achievementsHtml(
          model.records,
          model.achievementRegion,
          model.achievementTeam,
          model.achievementCompetition,
        );
        ensureAchievementHistory();
      } else if (draft()) html += view.setupHtml(draft()!.ids, draft()!.region);
      else if (!row) html += view.libraryHtml(model.records);
      else if (!s) {
        html +=
          '<section class="panel full-empty"><h3>Đang tải mùa Tour…</h3><button data-action="Tour.enter">← Các mùa</button></section>';
        const key = model.scope + row.season_id;
        if (!loading.has(key)) {
          loading.add(key);
          const token = model.token;
          void cloud
            .load(row.season_id)
            .then(() => {
              if (token === model.token) {
                if (model.selected === row.season_id)
                  model.stage = Math.min(7, selected()?.snapshot?.stage || 0);
                render();
              }
            })
            .catch((e) => {
              if (token === model.token)
                toast(e instanceof Error ? e.message : "Chưa tải được.");
            })
            .finally(() => loading.delete(key));
        }
      } else {
        model.stage = Math.max(0, Math.min(model.stage, 7));
        html += view.seasonHtml(s, model, readonly());
      }
      $("content").innerHTML =
        (__VOLLEY_CONFIG__.previewLocal
          ? '<aside class="tour-preview-notice" data-preview-local role="note"><strong>Bản chơi thử · Vé World Cup mới</strong><span>Tiến trình lưu riêng trên trình duyệt này. Không đăng nhập hoặc ghi vào tài khoản thật. Bạn có thể xuất file để giữ bản sao.</span></aside>'
          : "") +
        html +
        '<input type="file" id="tourImport" accept="application/json" data-action="Tour.importFile" data-trigger="change" hidden>';
    },
  );
}
