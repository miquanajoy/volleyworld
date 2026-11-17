import * as D from "../../domain/circuit/index";
import { get } from "../../data/teams";
import { seasonTeam } from "../../components/season-match";
import { seasonMatchDetailHtml } from "../../components/season-match-detail";
import { team } from "../../components/team";
import { editFullScore } from "../matches/editor";
import { store } from "../../app/store";
import { renderApplication } from "../../app/ports";
import { $, esc } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { preserveBracketScroll } from "../../shared/bracket-scroll";
import { accountState } from "../account/model";
import {
  model,
  selected,
  recordOf,
  persist,
  backup,
  clone,
  purgeLegacyData,
  validRecord,
  prefix,
} from "./model";
import { circuitCloud as cloud } from "./cloud";
import * as view from "./views";
import { achievementsHtml } from "./achievements";
export { model, selected };
export { cloud };
const render = () => renderApplication();
const locked = () =>
  !selected()?.snapshot ||
  selected()?.status === "completed" ||
  selected()?.phase === "conflict" ||
  accountState.resetPending;
function run(action: () => unknown) {
  try {
    return action();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa thực hiện được.");
  }
}
function mutate(action: (s: D.CircuitSeason) => void) {
  const row = selected();
  if (!row?.snapshot || locked())
    throw Error("Mùa chỉ xem hoặc cần giải quyết xung đột.");
  const s = clone(row.snapshot);
  action(s);
  if (!D.validCircuit(s))
    throw Error("Tiến trình không hợp lệ; bản lưu trước được giữ.");
  backup(row.snapshot);
  const previousRecord = { ...row };
  Object.assign(row, recordOf(s, row.revision), { dirty: true });
  if (!persist()) {
    Object.assign(row, previousRecord);
    throw Error("Chưa lưu được thiết bị. Hãy xuất tiến trình.");
  }
  cloud.queue(row);
  render();
}
export function enter() {
  model.selected = null;
  model.setup = null;
  model.section = "journey";
  model.reset = false;
  render();
}
export async function open(id: string) {
  await cloud.load(id);
  const row = model.records.find((r) => r.season_id === id);
  if (!row?.snapshot) return;
  model.selected = id;
  model.setup = null;
  model.stage = Math.min(row.snapshot.stage, 6);
  model.section = row.status === "completed" ? "journey" : "matches";
  model.group = null;
  syncRound();
  render();
}
export function create() {
  const active = model.records.find((r) => r.status === "active");
  if (active) {
    void open(active.season_id);
    return;
  }
  const last = model.records.at(-1);
  if (last?.status === "completed") {
    void nextSeason(last.season_id);
    return;
  }
  model.setup = {
    selection: D.defaultSelection(),
    parent: null,
    region: "CEV",
    tier: "upper",
    scope: model.scope,
    token: model.token,
  };
  render();
}
export async function nextSeason(id: string) {
  await cloud.load(id);
  const previous = model.records.find((r) => r.season_id === id)?.snapshot;
  if (!previous || !D.complete(previous)) return;
  const existing = model.records.find(
    (r) => r.snapshot?.previousSeasonId === id,
  );
  if (existing) {
    await open(existing.season_id);
    return;
  }
  model.setup = {
    selection: D.inheritedSelection(previous),
    parent: id,
    region: "CEV",
    tier: "lower",
    scope: model.scope,
    token: model.token,
  };
  render();
}
const draft = () =>
  model.setup?.scope === model.scope && model.setup.token === model.token
    ? model.setup
    : null;
export function start() {
  run(() => {
    const d = draft();
    if (!d) return;
    const previous = d.parent
      ? model.records.find((r) => r.season_id === d.parent)?.snapshot
      : undefined;
    if (d.parent && !previous) throw Error("Không tìm thấy mùa trước.");
    const s = D.freshCircuit(
        previous ? previous.seasonNumber + 1 : 1,
        d.selection,
        previous,
      ),
      row = recordOf(s);
    row.dirty = true;
    model.records.push(row);
    if (!persist()) {
      model.records.pop();
      throw Error("Chưa lưu được mùa mới.");
    }
    model.selected = s.seasonId;
    model.setup = null;
    model.stage = 0;
    model.round = 0;
    model.section = "journey";
    cloud.queue(row);
    render();
  });
}
function syncRound() {
  const s = selected()?.snapshot;
  if (!s) return;
  let rounds: import("../../domain/types").Match[][] = [];
  if ([0, 2, 4].includes(model.stage)) {
    const p =
      s.regions[model.region].phases[D.phaseIndex(model.stage)]?.[model.tier];
    rounds = p?.groups[0]?.rounds || [];
  } else if (model.stage === 3) rounds = s.challenger?.rounds || [];
  else if (model.stage === 6) rounds = s.world?.groups[0].rounds || [];
  const pending = rounds.findIndex((r) => r.some((m) => !m.sets));
  model.round = Math.max(0, pending < 0 ? rounds.length - 1 : pending);
}
const editable = (id: string) => {
  const s = selected()?.snapshot;
  return (
    !!s &&
    !locked() &&
    model.stage === s.stage &&
    D.batch(s).some((m) => m.id === id)
  );
};
export function simMatch(id: string) {
  run(() => {
    if (!editable(id)) return;
    mutate((s) => {
      const m = D.batch(s).find((m) => m.id === id)!;
      if (!m.sets) {
        importSimulate(m);
        D.advance(s);
      }
    });
  });
}
import { simulate as importSimulate } from "../../domain/match/simulation";
export function edit(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && D.matches(s).find((m) => m.id === id),
    scope = model.scope,
    token = model.token;
  if (!s || !m || !editable(id)) return;
  if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  editFullScore({
    match: m,
    current: () =>
      store.tab === "circuit" &&
      model.scope === scope &&
      model.token === token &&
      selected() === row &&
      row?.snapshot === s &&
      editable(id),
    teamMarkup: (id) => seasonTeam(id, D.matches(s)),
    commit: (sets) => mutate((d) => D.recordScore(d, id, sets)),
  });
}
let dialog: null | {
  id: string;
  scope: string;
  token: number;
  snapshot: D.CircuitSeason;
} = null;
export function showMatch(id: string) {
  const s = selected()?.snapshot,
    m = s && D.matches(s).find((m) => m.id === id);
  if (!s || !m) return;
  dialog = { id, scope: model.scope, token: model.token, snapshot: s };
  $("playoffMatchTitle").textContent = "Chi tiết trận · VolleyWorld Tour";
  $("playoffMatchBody").innerHTML = seasonMatchDetailHtml(m, !editable(id), {
    edition: `MÙA ${s.seasonNumber}`,
    label: D.calendar[model.stage][0],
    prefix: "Circuit",
    renderTeam: (id) => seasonTeam(id, D.matches(s)),
    lockMessage: "Kết quả đã chốt hoặc trận chưa đến lịch thi đấu.",
  });
  $("playoffMatchDialog").showModal();
}
function actDialog(editing: boolean) {
  if (
    !dialog ||
    model.scope !== dialog.scope ||
    model.token !== dialog.token ||
    selected()?.snapshot !== dialog.snapshot
  ) {
    $("playoffMatchDialog").close();
    return;
  }
  if (editing) edit(dialog.id);
  else {
    simMatch(dialog.id);
    $("playoffMatchDialog").close();
  }
}
export function showTeam(id: string) {
  const s = selected()?.snapshot;
  if (!s || !get(id)) return;
  const ms = D.matches(s).filter((m) => m.a === id || m.b === id);
  $("teamLeagueTitle").textContent = get(id).name;
  $("teamLeagueSummary").innerHTML =
    `<h3>${team(id)}</h3><p>${ms.filter((m) => m.sets).length} trận đã đấu trong mùa ${s.seasonNumber}</p><div class="table-wrap"><table class="full-standings"><thead><tr><th>Trận</th><th>Đối thủ</th><th>Kết quả</th></tr></thead><tbody>${ms.map((m) => `<tr><td>${esc(m.id)}</td><td>${team(m.a === id ? m.b : m.a)}</td><td>${m.sets ? m.sets.map(([a, b]) => `${a}–${b}`).join(" · ") : "Chưa đấu"}</td></tr>`).join("")}</tbody></table></div>`;
  $("teamLeagueRows").innerHTML = "";
  $("teamLeagueDialog").showModal();
}
export function simRound() {
  run(() => {
    const s = selected()?.snapshot;
    if (!s || model.stage !== s.stage) return;
    mutate((d) =>
      D.simulateBatch(
        d,
        [0, 2, 4, 5].includes(d.stage) ? model.region : undefined,
        [0, 2, 4].includes(d.stage) ? model.tier === "upper" : undefined,
      ),
    );
    syncRound();
    render();
  });
}
export function finishStage() {
  const s = selected()?.snapshot;
  if (
    !s ||
    model.stage !== s.stage ||
    !confirm("Mô phỏng các trận còn lại của khu vực/mâm đang xem?")
  )
    return;
  run(() => {
    mutate((d) =>
      D.finishStage(
        d,
        [0, 2, 4, 5].includes(d.stage) ? model.region : undefined,
        [0, 2, 4].includes(d.stage) ? model.tier === "upper" : undefined,
      ),
    );
    syncRound();
    render();
  });
}
export function finish() {
  if (!confirm("Mô phỏng toàn bộ mùa giải?")) return;
  run(() => {
    mutate(D.finishSeason);
    model.stage = 6;
    model.section = "journey";
    render();
  });
}
export function next() {
  run(() => {
    mutate(D.nextStage);
    model.stage = Math.min(selected()!.snapshot!.stage, 6);
    model.group = null;
    model.section = D.complete(selected()!.snapshot!) ? "journey" : "matches";
    syncRound();
    render();
  });
}
export function viewStage(value: string) {
  const n = Number(value),
    s = selected()?.snapshot;
  if (!s || !Number.isInteger(n) || n < 0 || n > 6 || n > s.stage) return;
  model.stage = n;
  model.group = null;
  model.section = "matches";
  syncRound();
  render();
}
export async function achievements() {
  model.setup = null;
  model.section = "achievements";
  render();
  for (const row of model.records) {
    if (!row.snapshot) await cloud.load(row.season_id);
  }
  render();
}
export async function exportSeasons(one = false) {
  const scope = model.scope;
  const rows = one
    ? [selected()].filter((r): r is NonNullable<typeof r> => !!r)
    : [...model.records];
  for (const row of rows) if (!row.snapshot) await cloud.load(row.season_id);
  if (scope !== model.scope) return;
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          { format: "volleyworld-circuit-v2", records: rows },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "volleyworld-circuit.json";
  a.click();
  URL.revokeObjectURL(url);
}
function importSeasons() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", async () => {
    const scope = model.scope,
      token = model.token;
    try {
      const data = JSON.parse(await input.files![0].text()) as {
        format: string;
        records: unknown[];
      };
      if (scope !== model.scope || token !== model.token) return;
      if (
        data.format !== "volleyworld-circuit-v2" ||
        !Array.isArray(data.records) ||
        !data.records.every(validRecord)
      )
        throw Error("Bản nhập không đúng thể thức mùa mới.");
      const rows = data.records;
      if (rows.some((r) => !r.snapshot))
        throw Error("Bản nhập thiếu dữ liệu mùa giải.");
      const additions = rows.filter(
        (row) => !model.records.some((r) => r.season_id === row.season_id),
      );
      if (
        new Set(additions.map((r) => r.season_id)).size !== additions.length ||
        new Set(additions.map((r) => r.season_number)).size !==
          additions.length ||
        additions.some((row) =>
          model.records.some((r) => r.season_number === row.season_number),
        )
      )
        throw Error("Trùng số mùa trong bản nhập.");
      const before = [...model.records];
      model.records.push(
        ...additions.map((row) => ({ ...row, revision: 0, dirty: true })),
      );
      if (!persist()) {
        model.records = before;
        throw Error("Chưa lưu được bản nhập.");
      }
      for (const row of model.records.filter((r) => r.dirty)) cloud.queue(row);
      render();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không nhập được dữ liệu.");
    }
  });
  input.click();
}
export function restore() {
  run(() => {
    const raw = localStorage.getItem(model.scope + "-backup");
    if (!raw) return;
    const s: unknown = JSON.parse(raw);
    if (!D.validCircuit(s) || s.seasonId !== model.selected || locked())
      throw Error("Bản khôi phục không hợp lệ.");
    mutate((current) => Object.assign(current, clone(s)));
  });
}
export function renderCircuit() {
  store.tab = "circuit";
  cloud.initialize();
  if (model.setup && !draft()) model.setup = null;
  for (const id of ["homeHero", "stats", "nav", "seasonBar"]) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  $("saved").textContent = model.records.some((r) => r.phase === "conflict")
    ? "⚠ Có xung đột dữ liệu"
    : model.records.some((r) => r.dirty)
      ? "● Đã giữ trên thiết bị"
      : "● Đã lưu";
  preserveBracketScroll(
    $("content"),
    `circuit:${model.scope}:${model.selected}:${model.region}:${model.tier}:${model.stage}`,
    () => {
      $("content").innerHTML =
        `${model.error ? `<p class="notice">${esc(model.error)} <button data-action="Circuit.sync">Thử lại</button></p>` : ""}${selected()?.phase === "conflict" ? '<div class="notice">Có tiến trình khác trên thiết bị khác. <button data-action="Circuit.remote">Dùng bản online</button><button data-action="Circuit.local">Giữ bản thiết bị</button></div>' : ""}${model.reset ? '<section class="panel notice"><h3>Bắt đầu lại chuỗi mùa?</h3><p>Toàn bộ mùa giải và thành tích trong tài khoản hiện tại sẽ bị xóa.</p><button data-action="Circuit.confirmReset">Xóa & bắt đầu lại</button><button data-action="Circuit.cancelReset">Hủy</button></section>' : ""}${model.section === "achievements" ? achievementsHtml(model.records) : draft() ? view.setupHtml() : selected()?.snapshot ? view.seasonHtml(selected()!.snapshot!, locked()) : selected() ? '<section class="panel">Đang tải mùa giải…</section>' : view.libraryHtml(model.records)}`;
    },
  );
}
export function initializeCircuit() {
  document
    .querySelectorAll<HTMLElement>("footer [data-action]")
    .forEach((el) => {
      const action = el.dataset.action;
      el.dataset.action =
        action === "exportSave"
          ? "Circuit.export"
          : action === "Tour.import"
            ? "Circuit.import"
            : action === "Tour.create"
              ? "Circuit.create"
              : action;
    });
  const edition = document.querySelector("header .edition");
  if (edition) edition.textContent = "BỐN KHU VỰC · MỘT HÀNH TRÌNH";

  const brand = document.querySelector<HTMLElement>(".brand");
  if (brand) brand.dataset.action = "Circuit.enter";
  purgeLegacyData();
  cloud.initialize();
}
const arg = (e: HTMLElement) => e.dataset.arg || "";
const update = (fn: () => void) => {
  fn();
  render();
};
export const actions: Record<string, (e: HTMLElement) => unknown> = {
  "Circuit.enter": enter,
  "Circuit.create": create,
  "Circuit.start": start,
  "Circuit.open": (e) => open(arg(e)),
  "Circuit.nextSeason": (e) => nextSeason(arg(e)),
  "Circuit.cancelSetup": () =>
    update(() => {
      model.setup = null;
    }),
  "Circuit.setupRegion": (e) =>
    update(() => {
      const d = draft(),
        r = arg(e) as D.CircuitRegion;
      if (d && D.regions.includes(r)) d.region = r;
    }),
  "Circuit.setupTier": (e) =>
    update(() => {
      const d = draft();
      if (d && (arg(e) === "upper" || arg(e) === "lower"))
        d.tier = arg(e) as "upper" | "lower";
    }),
  "Circuit.toggle": (e) =>
    update(() => {
      const d = draft(),
        id = arg(e);
      if (!d || !get(id) || (d.tier === "upper" && d.parent)) return;
      const z = d.selection[d.region];
      if (
        !D.pool(d.region).includes(id) ||
        z[d.tier === "upper" ? "lower" : "upper"].includes(id)
      )
        return;
      z[d.tier] = z[d.tier].includes(id)
        ? z[d.tier].filter((x) => x !== id)
        : [...z[d.tier], id];
    }),
  "Circuit.resetSelection": () =>
    update(() => {
      const d = draft();
      if (d)
        d.selection = d.parent
          ? D.inheritedSelection(
              model.records.find((r) => r.season_id === d.parent)!.snapshot!,
            )
          : D.defaultSelection();
    }),
  "Circuit.section": (e) =>
    update(() => {
      const key = arg(e);
      if (
        [
          "journey",
          "matches",
          "table",
          "playoff",
          "points",
          "qualifiers",
          "teams",
          "rules",
        ].includes(key)
      )
        model.section = key;
    }),
  "Circuit.viewStage": (e) => viewStage(arg(e)),
  "Circuit.region": (e) =>
    update(() => {
      const r = arg(e) as D.CircuitRegion;
      if (D.regions.includes(r)) {
        model.region = r;
        model.group = null;
        syncRound();
      }
    }),
  "Circuit.tier": (e) =>
    update(() => {
      if (["upper", "lower"].includes(arg(e))) {
        model.tier = arg(e) as "upper" | "lower";
        model.group = null;
        syncRound();
      }
    }),
  "Circuit.round": (e) =>
    update(() => {
      const n = Number(arg(e));
      if (Number.isInteger(n) && n >= 0 && n < 7) model.round = n;
    }),
  "Circuit.group": (e) =>
    update(() => {
      const n = Number(arg(e));
      if (arg(e) === "all") model.group = null;
      else if (Number.isInteger(n) && n >= 0 && n < 8) model.group = n;
    }),
  "Circuit.stage": (e) =>
    run(() =>
      mutate((s) => {
        const key = arg(e);
        if (!["r16", "qf", "sf", "bronze", "final"].includes(key))
          throw Error("Vòng chưa mở.");
        const b =
          s.stage === 3
            ? s.challenger?.bracket
            : s.stage === 6
              ? s.world?.bracket
              : null;
        const row = b?.[key as keyof NonNullable<typeof b>] || [];
        const available = D.batch(s);
        if (
          !row.length ||
          row.some((m) => !available.some((a) => a.id === m.id))
        )
          throw Error("Hoàn tất vòng trước trước khi tiếp tục.");
        row.filter((m) => !m.sets).forEach(importSimulate);
        D.advance(s);
      }),
    ),
  "Circuit.simRound": simRound,
  "Circuit.finishStage": finishStage,
  "Circuit.finish": finish,
  "Circuit.next": next,
  "Circuit.match": (e) => showMatch(arg(e)),
  "Circuit.simMatch": (e) => simMatch(arg(e)),
  "Circuit.edit": (e) => edit(arg(e)),
  "Circuit.dialogSim": () => actDialog(false),
  "Circuit.dialogEdit": () => actDialog(true),
  "Circuit.team": (e) => showTeam(arg(e)),
  "Circuit.achievements": achievements,
  "Circuit.achievementCompetition": (e) =>
    update(() => {
      if (["all", "league", "first", "challenger", "world"].includes(arg(e))) {
        model.achievement = arg(e);
        model.achievementTeam = null;
      }
    }),
  "Circuit.achievementRegion": (e) =>
    update(() => {
      model.achievementRegion = arg(e);
      model.achievementTeam = null;
    }),
  "Circuit.teamHistory": (e) =>
    update(() => {
      model.achievementTeam = arg(e);
    }),
  "Circuit.export": () => exportSeasons(),
  "Circuit.exportOne": () => exportSeasons(true),
  "Circuit.import": importSeasons,
  "Circuit.restore": restore,
  "Circuit.sync": () => cloud.reload(),
  "Circuit.remote": () => cloud.resolve(true),
  "Circuit.local": () => cloud.resolve(false),
  "Circuit.requestReset": () =>
    update(() => {
      model.reset = true;
    }),
  "Circuit.cancelReset": () =>
    update(() => {
      model.reset = false;
    }),
  "Circuit.confirmReset": async () => {
    if (await cloud.resetAll()) {
      model.reset = false;
      model.selected = null;
      model.section = "journey";
      model.setup = null;
      render();
    }
  },
};
export const storagePrefix = prefix;
