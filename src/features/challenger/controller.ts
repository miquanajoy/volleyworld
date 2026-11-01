import { get } from "../../data/teams";
import { setupHtml } from "./setup";
import * as C from "../../domain/challenger/index";
import type { WorldStage } from "../../domain/full-season/types";
import { simulate } from "../../domain/match/simulation";
import { score } from "../../domain/match/scoring";
import { store } from "../../app/store";
import { getPorts } from "../../app/ports";
import { $, esc } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { preserveBracketScroll } from "../../shared/bracket-scroll";
import { team } from "../../components/team";
import { editFullScore } from "../matches/editor";
import { challengerCloud as cloud } from "./cloud";
import { model, selected, clone, recordOf, persist, backup } from "./model";
import * as view from "./views";
const render = () => getPorts().commands.render();
function run(action: () => unknown) {
  try {
    return action();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa thực hiện được.");
  }
}
function mutate(action: (s: C.ChallengerSeason) => void) {
  const row = selected();
  if (!row?.snapshot || view.readonly())
    throw Error("Mùa này chỉ xem hoặc cần xử lý xung đột.");
  const old = row.snapshot,
    s = clone(old);
  action(s);
  C.advanceChallenger(s);
  C.stampChallenger(s);
  if (!C.validChallenger(s))
    throw Error("Tiến trình không hợp lệ; bản lưu được giữ.");
  backup(old);
  Object.assign(row, recordOf(s, row.revision), { dirty: true });
  if (!persist()) toast("Chưa lưu được trên thiết bị. Hãy xuất tiến trình.");
  cloud.queue(row);
  render();
}
export function enter() {
  cloud.initialize();
  store.seasonView = null;
  store.tab = "challenger";
  model.selected = null;
  model.setup = null;
  model.section = "overview";
  render();
}
const nextNumber = () =>
  Math.max(0, ...model.records.map((r) => r.season_number)) + 1;
export function create() {
  cloud.initialize();
  model.setup = {
    scope: model.scope,
    token: model.token,
    editId: null,
    ids: C.challengerRoster(),
    region: "CEV",
    error: "",
  };
  store.tab = "challenger";
  render();
}
export function editRoster() {
  const row = selected();
  if (!row?.snapshot || row.played || view.readonly()) return;
  model.setup = {
    scope: model.scope,
    token: model.token,
    editId: row.season_id,
    ids: [...row.snapshot.roster],
    region: "CEV",
    error: "",
  };
  render();
}
export function cancelSetup() {
  model.setup = null;
  render();
}
export function setupRegion(region: string) {
  if (
    !model.setup ||
    model.setup.scope !== model.scope ||
    model.setup.token !== model.token ||
    !["CEV", "AVC", "NORCECA", "CAVB", "CSV"].includes(region)
  )
    return;
  model.setup.region = region;
  render();
}
export function toggleTeam(id: string) {
  const draft = model.setup;
  if (
    !draft ||
    draft.scope !== model.scope ||
    draft.token !== model.token ||
    !get(id)
  )
    return;
  draft.ids = draft.ids.includes(id)
    ? draft.ids.filter((x) => x !== id)
    : [...draft.ids, id];
  draft.error = "";
  render();
}
export function resetRoster() {
  if (
    model.setup &&
    model.setup.scope === model.scope &&
    model.setup.token === model.token
  ) {
    model.setup.ids = C.challengerRoster();
    model.setup.error = "";
    render();
  }
}
export function start() {
  const draft = model.setup;
  if (!draft || draft.scope !== model.scope || draft.token !== model.token)
    return;
  if (!C.validChallengerRoster(draft.ids)) {
    draft.error =
      "Cần đúng 32 đội; châu Âu 2–16, châu Á 2–12, Bắc/Trung Mỹ 2–12, châu Phi 2–8, Nam Mỹ 2–6.";
    render();
    return;
  }
  run(() => {
    if (draft.editId) {
      const row = selected();
      if (row?.season_id !== draft.editId || row.played || view.readonly())
        throw Error(
          "Mùa đã bắt đầu hoặc tiến trình đã thay đổi. Không thể đổi đội.",
        );
      mutate((s) => {
        const fresh = C.freshChallenger(s.seasonNumber, draft.ids);
        Object.assign(s, fresh, {
          seasonId: s.seasonId,
          createdAt: s.createdAt,
        });
      });
    } else {
      const s = C.freshChallenger(nextNumber(), draft.ids),
        row = recordOf(s);
      row.dirty = true;
      model.records.push(row);
      model.selected = s.seasonId;
      model.section = "overview";
      model.round = 0;
      if (!persist()) toast("Chưa lưu được trên thiết bị. Hãy xuất mùa mới.");
      cloud.queue(row);
    }
    model.setup = null;
    model.swissView = "tree";
    render();
  });
}
export function swissView(value: string) {
  if (value !== "tree" && value !== "matches") return;
  model.swissView = value;
  render();
}
export function open(id: string) {
  model.setup = null;
  if (!model.records.some((r) => r.season_id === id)) return;
  model.selected = id;
  model.section = "overview";
  model.round = selected()?.snapshot?.rounds.length
    ? selected()!.snapshot!.rounds.length - 1
    : 0;
  store.tab = "challenger";
  render();
}
export function section(key: string) {
  if (
    !["overview", "swiss", "table", "playoff", "rules"].includes(key) ||
    !selected()?.snapshot
  )
    return;
  const old = model.section;
  model.section = key;
  if (!["swiss", "table"].includes(old))
    model.round = selected()!.snapshot!.rounds.length - 1;
  render();
}
export function round(value: string) {
  const r = Number(value),
    s = selected()?.snapshot;
  if (!s || !Number.isInteger(r) || r < 0 || r >= s.rounds.length) return;
  model.round = r;
  render();
}
export function next() {
  const s = selected()?.snapshot;
  if (!s || !s.rounds[model.round].every((m) => m.sets)) return;
  if (model.round < s.rounds.length - 1) {
    model.round++;
    render();
  } else if (C.swissDone(s)) {
    model.section = "playoff";
    render();
  } else
    run(() => {
      mutate(C.drawSwissRound);
      model.round++;
      render();
    });
}
export function simRound() {
  if (model.round !== selected()?.snapshot?.rounds.length! - 1) return;
  run(() => mutate(C.simulateChallengerRound));
}
export function draw() {
  run(() => mutate(C.drawChallengerPlayoff));
}
export function stage(key: string) {
  run(() => mutate((s) => C.simulateChallengerStage(s, key as WorldStage)));
}
export function finish() {
  if (confirm("Mô phỏng toàn bộ trận chưa đấu của mùa Challenger này?"))
    run(() => mutate(C.finishChallenger));
}
export function simMatch(id: string) {
  run(() => {
    mutate((s) => {
      const m = C.challengerMatches(s).find((m) => m.id === id);
      if (!m || m.sets || C.challengerLocked(s, m))
        throw Error("Trận chưa mở hoặc đã có kết quả.");
      simulate(m);
    });
    if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  });
}
export function edit(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && C.challengerMatches(s).find((m) => m.id === id),
    scope = model.scope;
  if (!s || !m || view.readonly() || C.challengerLocked(s, m)) return;
  if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  editFullScore({
    match: m,
    current: () =>
      store.tab === "challenger" &&
      scope === model.scope &&
      selected() === row &&
      row!.snapshot === s &&
      !view.readonly() &&
      !C.challengerLocked(s, m),
    teamMarkup: (id) => view.teamLine(s, id),
    commit: (sets) =>
      mutate((draft) => C.recordChallengerScore(draft, id, sets)),
  });
}
let dialog: {
  scope: string;
  row: ReturnType<typeof selected>;
  snapshot: C.ChallengerSeason;
  id: string;
} | null = null;
export function showMatch(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && C.challengerMatches(s).find((m) => m.id === id);
  if (!s || !m) return;
  dialog = { scope: model.scope, row, snapshot: s, id };
  $("playoffMatchTitle").textContent = "Chi tiết trận Challenger";
  $("playoffMatchBody").innerHTML = view.detailHtml(s, m);
  $("playoffMatchDialog").showModal();
}
export function actDialog(editing = false) {
  const c = dialog;
  if (
    !c ||
    store.tab !== "challenger" ||
    model.scope !== c.scope ||
    selected() !== c.row ||
    c.row?.snapshot !== c.snapshot
  ) {
    $("playoffMatchDialog").close();
    toast("Tiến trình đã thay đổi. Hãy mở lại trận đấu.");
    return;
  }
  if (editing) edit(c.id);
  else simMatch(c.id);
}
export function showTeam(id: string, through?: number) {
  const s = selected()?.snapshot;
  if (!s || !s.roster.includes(id)) return;
  const historical =
      through !== undefined &&
      Number.isInteger(through) &&
      through >= 0 &&
      through < s.rounds.length,
    matches = (
      historical
        ? s.rounds.slice(0, through! + 1).flat()
        : C.challengerMatches(s)
    ).filter((m) => m.a === id || m.b === id);
  $("teamLeagueTitle").innerHTML = team(id);
  $("teamLeagueSummary").textContent =
    `Challenger · Mùa ${s.seasonNumber}${historical ? ` · Đến vòng ${through! + 1}` : ""} · ${matches.filter((m) => m.sets).length}/${matches.length} trận`;
  $("teamLeagueRows").innerHTML = matches
    .map((m) => {
      const own = m.a === id,
        result = score(m),
        r = s.rounds.findIndex((row) => row.includes(m));
      return `<tr><td>${r >= 0 ? `Swiss · Vòng ${r + 1}` : "Playoff"}</td><td>${team(own ? m.b : m.a)}</td><td>${m.sets ? `${result[own ? 0 : 1]}–${result[own ? 1 : 0]}` : ""}</td><td>${m.sets ? m.sets.map(([a, b], i) => `S${i + 1} ${own ? a : b}–${own ? b : a}`).join(" · ") : ""}</td></tr>`;
    })
    .join("");
  $("teamLeagueDialog").showModal();
}
export async function exportSeasons(one = false) {
  const scope = model.scope,
    token = model.token,
    id = model.selected;
  try {
    const seasons: C.ChallengerSeason[] = [];
    for (const row of model.records.filter((r) => !one || r.season_id === id)) {
      const s = await cloud.load(row.season_id);
      if (scope !== model.scope || token !== model.token) return;
      if (!s) throw Error("Thiếu dữ liệu một mùa; chưa xuất file.");
      seasons.push(clone(s));
    }
    const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { format: "volleyworld-challenger-seasons", version: 1, seasons },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "volleyworld-challenger.json";
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
    if (file.size > 20_000_000) throw Error("File quá lớn.");
    const data = JSON.parse(await file.text());
    if (scope !== model.scope || token !== model.token) return;
    if (
      data.format !== "volleyworld-challenger-seasons" ||
      data.version !== 1 ||
      !Array.isArray(data.seasons) ||
      !data.seasons.length ||
      data.seasons.length > 100 ||
      !data.seasons.every(C.validChallenger) ||
      new Set(data.seasons.map((s: C.ChallengerSeason) => s.seasonId)).size !==
        data.seasons.length
    )
      throw Error("File Challenger không hợp lệ.");
    if (
      !confirm(
        `Nhập ${data.seasons.length} mùa Challenger mới? Các mùa hiện tại được giữ nguyên.`,
      )
    )
      return;
    let number = nextNumber() - 1;
    const incoming = (data.seasons as C.ChallengerSeason[]).map((s) => {
      const c = clone(s);
      c.seasonId = crypto.randomUUID();
      c.seasonNumber = ++number;
      return { ...recordOf(c), dirty: true };
    });
    model.records.push(...incoming);
    persist();
    incoming.forEach(cloud.queue);
    model.selected = null;
    model.section = "overview";
    render();
    toast("Đã nhập các mùa Challenger.");
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa nhập được.");
  }
}
export function restore() {
  run(() => {
    const row = selected();
    if (!row?.snapshot || view.readonly()) return;
    const items = JSON.parse(
        localStorage.getItem(model.scope + "-backups") || "[]",
      ) as { state: C.ChallengerSeason }[],
      item = items.find(
        (b) =>
          b.state?.seasonId === row.season_id && C.validChallenger(b.state),
      );
    if (!item) {
      toast("Chưa có bản sao trước của mùa này.");
      return;
    }
    if (confirm("Khôi phục tiến trình trước của mùa Challenger này?"))
      mutate((s) => {
        Object.assign(s, clone(item.state));
        model.round = s.rounds.length - 1;
      });
  });
}
const loading = new Set<string>();
export function renderChallenger() {
  cloud.initialize();
  preserveBracketScroll(
    $("content"),
    `challenger:${model.scope}:${model.selected || "library"}`,
    () => {
      const row = selected(),
        s = row?.snapshot;
      $("saved").textContent = model.records.some((r) => r.phase === "conflict")
        ? "⚠ Challenger có xung đột"
        : model.records.some((r) => r.dirty)
          ? "● Challenger đã giữ trên thiết bị · chờ đồng bộ"
          : "● Challenger đã lưu";
      let html = view.statusHtml();
      if (
        model.setup?.scope === model.scope &&
        model.setup.token === model.token
      )
        html += setupHtml();
      else if (!row) html += view.libraryHtml();
      else if (!s) {
        html += `<section class="panel full-empty"><h3>Đang tải mùa Challenger…</h3><button data-action="Challenger.enter">← Các mùa</button><button data-action="Challenger.open" data-arg="${esc(row.season_id)}">Thử lại</button></section>`;
        const key = model.scope + row.season_id;
        if (!loading.has(key)) {
          loading.add(key);
          const token = model.token;
          void cloud
            .load(row.season_id)
            .then(() => {
              if (token === model.token) render();
            })
            .catch((e) => {
              if (token === model.token)
                toast(e instanceof Error ? e.message : "Chưa tải được mùa.");
            })
            .finally(() => loading.delete(key));
        }
      } else {
        model.round = Math.min(model.round, s.rounds.length - 1);
        html += view.headerHtml(s);
        html +=
          model.section === "swiss"
            ? view.swissHtml(s)
            : model.section === "table"
              ? view.tableHtml(s)
              : model.section === "playoff"
                ? view.playoffHtml(s)
                : model.section === "rules"
                  ? view.rulesHtml()
                  : view.overviewHtml(s);
      }
      $("content").innerHTML =
        html +
        '<input type="file" id="challengerImport" accept="application/json" data-action="Challenger.importFile" data-trigger="change" hidden>';
    },
  );
}
