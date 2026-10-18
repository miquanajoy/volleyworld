import { preserveBracketScroll } from "../../shared/bracket-scroll";
import { leagueRoundSnapshot } from "../../domain/league/round-standings";
import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import * as F from "../../domain/full-season/index";
import { simulate } from "../../domain/match/simulation";
import { score } from "../../domain/match/scoring";
import { regionTeams } from "../../data/teams";
import type {
  FullLeague,
  FullSeason,
  WorldStage,
} from "../../domain/full-season/types";
import { $, esc, names } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { team } from "../../components/team";
import { editFullScore } from "../matches/editor";
import {
  fullModel,
  selectedFull,
  clone,
  recordOf,
  persistFull,
  fullBackup,
} from "./model";
import {
  initializeFullScope,
  loadFullSnapshot,
  queueFull,
  reloadFullCloud,
  resolveFullConflict,
  saveFullNow,
} from "./cloud";
import * as view from "./views";
const loading = new Set<string>();
function source(s: FullSeason): FullLeague | undefined {
  if (
    F.regionOrder.includes(fullModel.section as (typeof F.regionOrder)[number])
  )
    return s.regions[fullModel.section as (typeof F.regionOrder)[number]];
  const regional = fullModel.section.match(/^(CEV|AVC|NORCECA|CAVB)G([0-2])$/);
  if (regional)
    return F.regionalGroup(
      s.regions[regional[1] as (typeof F.regionOrder)[number]],
      Number(regional[2]),
    );
  if (/^WG[0-5]$/.test(fullModel.section))
    return s.world?.groups[Number(fullModel.section.slice(2))];
}
function mutate(action: (s: FullSeason) => void) {
  const row = selectedFull();
  if (!row?.snapshot || row.status === "completed" || row.phase === "conflict")
    throw Error("Mùa này chỉ xem hoặc cần xử lý xung đột.");
  const old = row.snapshot,
    s = clone(old);
  action(s);
  F.advanceRegions(s);
  F.stampFull(s);
  if (!F.validFullSeason(s))
    throw Error("Tiến trình Full Season không hợp lệ; chưa thay đổi bản lưu.");
  fullBackup(old);
  Object.assign(row, recordOf(s, row.revision), { dirty: true });
  if (!persistFull())
    toast("Chưa lưu được trên thiết bị. Hãy xuất file Full Season.");
  queueFull(row);
  getPorts().commands.render();
}
function run(action: () => unknown) {
  try {
    return action();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa thực hiện được.");
  }
}
export function enterFull() {
  initializeFullScope();
  store.seasonView = null;
  store.tab = "full-season";
  fullModel.selected = null;
  fullModel.section = "overview";
  getPorts().commands.render();
}
export function createFull() {
  initializeFullScope();
  const number =
      Math.max(0, ...fullModel.records.map((r) => r.season_number)) + 1,
    s = F.freshFullSeason(number),
    row = recordOf(s);
  row.dirty = true;
  fullModel.records.push(row);
  fullModel.selected = s.seasonId;
  fullModel.section = "overview";
  fullModel.round = 0;
  if (!persistFull())
    toast("Chưa lưu được trên thiết bị. Hãy xuất file để giữ mùa mới.");
  queueFull(row);
  getPorts().commands.render();
}
export async function openFull(id: string) {
  fullModel.selected = id;
  fullModel.section = "overview";
  fullModel.round = 0;
  store.tab = "full-season";
  getPorts().commands.render();
}
export function sectionFull(section: string) {
  if (
    ![
      "overview",
      "world",
      "playoff",
      ...F.regionOrder,
      ...F.regionOrder.flatMap((r) =>
        Array.from({ length: F.regionalGroupCount[r] }, (_, i) => `${r}G${i}`),
      ),
      ...Array.from({ length: 6 }, (_, i) => "WG" + i),
    ].includes(section)
  )
    return;
  const s = selectedFull()?.snapshot;
  if (!s) return;
  if (
    (section === "world" ||
      section === "playoff" ||
      section.startsWith("WG")) &&
    !s.world
  )
    return;
  fullModel.section = section;
  const league = source(s);
  const unfinished =
    league?.rounds.findIndex((r) => r.some((m) => !m.sets)) ?? -1;
  fullModel.round = league
    ? unfinished < 0
      ? league.rounds.length - 1
      : unfinished
    : 0;
  getPorts().commands.render();
}
export function setFullRound(value: string) {
  const s = selectedFull()?.snapshot,
    g = s && source(s),
    r = Number(value);
  if (!g || !Number.isInteger(r) || r < 0 || r >= g.rounds.length) return;
  fullModel.round = r;
  getPorts().commands.render();
}
export function nextFullRound() {
  const s = selectedFull()?.snapshot,
    g = s && source(s);
  if (!g || !g.rounds[fullModel.round]?.every((m) => m.sets)) return;
  if (fullModel.round < g.rounds.length - 1) fullModel.round++;
  else
    fullModel.section =
      F.regionOrder.find((r) => fullModel.section.startsWith(`${r}G`)) ||
      "overview";
  getPorts().commands.render();
}
export function simulateFullMatch(id: string) {
  run(() =>
    mutate((s) => {
      const m = F.fullMatches(s).find((m) => m.id === id);
      if (!m || m.sets || F.fullMatchLocked(s, m))
        throw Error("Trận chưa sẵn sàng hoặc đã khóa.");
      simulate(m);
      F.advanceWorld(s);
    }),
  );
}
export function simulateFullRound(all = false) {
  run(() => {
    if (all && !confirm("Mô phỏng các trận chưa đấu của league này?")) return;
    mutate((s) => {
      const g = source(s);
      if (!g) throw Error("Chưa chọn giải.");
      const matches = all ? F.leagueMatches(g) : g.rounds[fullModel.round];
      if (matches.some((m) => F.fullMatchLocked(s, m)))
        throw Error("Kết quả đã khóa vì giai đoạn tiếp theo đã được tạo.");
      matches.filter((m) => !m.sets).forEach(simulate);
      if (all) fullModel.round = g.rounds.length - 1;
    });
  });
}
export function drawFullWorld() {
  run(() => mutate(F.drawWorld));
}
export function drawFullPlayoff() {
  run(() => mutate(F.drawWorldPlayoff));
}
export function simulateFullStage(stage: string) {
  run(() =>
    mutate((s) => {
      if (!F.worldStages.includes(stage as WorldStage))
        throw Error("Vòng không hợp lệ.");
      const ms = s.world?.bracket?.[stage as WorldStage];
      if (!ms?.length) throw Error("Cần kết thúc vòng trước.");
      ms.filter((m) => !m.sets).forEach(simulate);
      F.advanceWorld(s);
    }),
  );
}
export function finishFull() {
  if (
    confirm(
      "Mô phỏng toàn bộ trận chưa đấu của mùa Full Season này, gồm 5 khu vực và giải thế giới?",
    )
  )
    run(() => mutate(F.finishFullSeason));
}
export function editFullMatch(id: string) {
  const row = selectedFull(),
    s = row?.snapshot,
    m = s && F.fullMatches(s).find((m) => m.id === id);
  if (
    !s ||
    !m ||
    row!.status === "completed" ||
    row!.phase === "conflict" ||
    F.fullMatchLocked(s, m)
  )
    return;
  const scope = fullModel.scope;
  editFullScore({
    match: m,
    current: () =>
      store.tab === "full-season" &&
      fullModel.scope === scope &&
      selectedFull() === row &&
      row!.snapshot === s &&
      row!.status !== "completed" &&
      row!.phase !== "conflict" &&
      !F.fullMatchLocked(s, m),
    teamMarkup: (id) => view.fullTeam(id, s, source(s)),
    commit: (sets) => mutate((draft) => F.recordFullScore(draft, id, sets)),
  });
}
export function showFullMatch(id: string) {
  const s = selectedFull()?.snapshot,
    m = s && F.fullMatches(s).find((m) => m.id === id);
  if (!s || !m) return;
  $("playoffMatchTitle").textContent = "Chi tiết trận Full Season";
  $("playoffMatchBody").innerHTML =
    `<h3>${team(m.a)} – ${team(m.b)}</h3><p>${m.sets ? `Kết quả ${score(m).join("–")}` : "Chưa thi đấu"}</p>${m.sets ? m.sets.map(([a, b], i) => `<p>Set ${i + 1}: <b>${a}–${b}</b></p>`).join("") : ""}`;
  $("playoffMatchDialog").showModal();
}
export function showFullTeam(id: string, round?: number) {
  const s = selectedFull()?.snapshot;
  if (!s) return;
  const g = source(s),
    historical =
      g &&
      round !== undefined &&
      Number.isInteger(round) &&
      round >= 0 &&
      round < g.rounds.length,
    matches = (
      g
        ? F.leagueMatches(historical ? leagueRoundSnapshot(g, round!) : g)
        : F.fullMatches(s)
    ).filter((m) => m.a === id || m.b === id);
  $("teamLeagueTitle").innerHTML = team(id);
  $("teamLeagueSummary").textContent =
    `Full Season ${s.seasonNumber}${historical ? ` · Tới vòng ${round! + 1}` : ""} · ${matches.filter((m) => m.sets).length}/${matches.length} trận`;
  $("teamLeagueRows").innerHTML = matches
    .map((m) => {
      const own = m.a === id,
        [a, b] = score(m);
      return `<tr><td>${esc(m.id)}</td><td>${team(own ? m.b : m.a)}</td><td>${m.sets ? `${own ? a : b}–${own ? b : a}` : ""}</td><td>${m.sets ? m.sets.map(([x, y], i) => `S${i + 1} ${own ? x : y}–${own ? y : x}`).join(" · ") : ""}</td></tr>`;
    })
    .join("");
  $("teamLeagueDialog").showModal();
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportFull(one = false) {
  const token = fullModel.token,
    scope = fullModel.scope,
    ids =
      one && fullModel.selected
        ? [fullModel.selected]
        : fullModel.records.map((r) => r.season_id),
    seasons: FullSeason[] = [];
  try {
    for (const id of ids) {
      const s = await loadFullSnapshot(id);
      if (token !== fullModel.token || scope !== fullModel.scope) return;
      if (!s) throw Error("Thiếu dữ liệu một mùa; chưa xuất file.");
      seasons.push(clone(s));
    }
    download(
      { format: "volleyworld-full-seasons", version: 1, seasons },
      one
        ? "volleyworld-full-season.json"
        : "volleyworld-full-season-history.json",
    );
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa xuất được.");
  }
}
export async function importFull(file?: File) {
  if (!file) return;
  const token = fullModel.token,
    scope = fullModel.scope;
  try {
    if (file.size > 20_000_000) throw Error("File Full Season quá lớn.");
    const data = JSON.parse(await file.text());
    if (token !== fullModel.token || scope !== fullModel.scope) return;
    if (
      data.format !== "volleyworld-full-seasons" ||
      data.version !== 1 ||
      !Array.isArray(data.seasons) ||
      !data.seasons.length ||
      data.seasons.length > 100 ||
      !data.seasons.every(F.validFullSeason)
    )
      throw Error("File Full Season không hợp lệ.");
    if (
      !confirm(
        `Nhập ${data.seasons.length} mùa thành các mùa Full Season mới? Các mùa đang có được giữ nguyên.`,
      )
    )
      return;
    let number = Math.max(0, ...fullModel.records.map((r) => r.season_number));
    const incoming = data.seasons.map((s: FullSeason) => {
      const copy = clone(s);
      copy.seasonId = crypto.randomUUID();
      copy.seasonNumber = ++number;
      const r = recordOf(copy);
      r.dirty = true;
      return r;
    });
    fullModel.records.push(...incoming);
    persistFull();
    incoming.forEach(queueFull);
    fullModel.selected = null;
    getPorts().commands.render();
    toast("Đã nhập Full Season. Bấm Lưu tiến trình để xác nhận đồng bộ.");
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa nhập được file.");
  }
}
export function restoreFull() {
  run(() => {
    const row = selectedFull();
    if (!row?.snapshot || row.status === "completed") return;
    const backups = JSON.parse(
        localStorage.getItem(fullModel.scope + "-backups") || "[]",
      ),
      backup = backups.find(
        (r: { state: FullSeason }) =>
          r.state?.seasonId === row.season_id && F.validFullSeason(r.state),
      );
    if (!backup) {
      toast("Chưa có bản sao trước của mùa này.");
      return;
    }
    if (confirm("Khôi phục bản lưu trước của Full Season này?"))
      mutate((s) => Object.assign(s, clone(backup.state)));
  });
}
let honourTeam = "POL";
export async function showFullHonours(id?: string) {
  if (id) honourTeam = id;
  fullModel.selected = null;
  fullModel.section = "honours";
  getPorts().commands.render();
  const token = fullModel.token,
    scope = fullModel.scope,
    ids = fullModel.records.filter((r) => !r.snapshot).map((r) => r.season_id);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (index < ids.length) {
        const id = ids[index++];
        if (token !== fullModel.token || scope !== fullModel.scope) return;
        try {
          await loadFullSnapshot(id);
        } catch {
          /* Missing history is displayed explicitly. */
        }
      }
    }),
  );
  if (token === fullModel.token && fullModel.section === "honours")
    getPorts().commands.render();
}
function honoursHtml() {
  return `<div class="section-head"><div><h2>Thành tích Full Season</h2><p class="sub">Xem riêng kết quả khu vực và thế giới. Không cộng vào BXH điểm của chế độ 32 đội.</p></div><button data-action="Full.library">← Các mùa Full Season</button></div><label>Quốc gia<select aria-label="Chọn quốc gia Full Season" data-action="Full.honourTeam" data-trigger="change">${F.regionOrder
    .map(
      (r) =>
        `<optgroup label="${names[r]}">${regionTeams(r)
          .map(
            (t) =>
              `<option value="${t.id}" ${honourTeam === t.id ? "selected" : ""}>${t.flag} ${t.name}</option>`,
          )
          .join("")}</optgroup>`,
    )
    .join(
      "",
    )}</select></label><section class="panel full-honours"><div class="table-wrap"><table><thead><tr><th>MÙA</th><th>KHU VỰC</th><th>GIẢI THẾ GIỚI</th></tr></thead><tbody>${fullModel.records
    .map((row) => {
      const s = row.snapshot,
        r = F.regionOrder.find((r) =>
          s?.regions[r].teamIds.includes(honourTeam),
        ),
        qualified =
          s && r && F.regionalDone(s.regions[r])
            ? F.regionQualifiers(s.regions[r], r).includes(honourTeam)
            : false,
        p = s && F.worldPlacements(s)[honourTeam];
      const label = p
        ? p.from <= 3
          ? ["🥇", "🥈", "🥉"][p.from - 1]
          : p.from === p.to
            ? `#${p.from}`
            : `#${p.from}–#${p.to}`
        : s && !s.world
          ? r && F.regionalDone(s.regions[r])
            ? qualified
              ? "Chờ giải thế giới"
              : "-"
            : "Chưa xác định"
          : s?.world?.groups.some((g) => g.teamIds.includes(honourTeam))
            ? "Đang diễn ra"
            : "-";
      return `<tr><td>SS ${row.season_number}</td><td>${!s ? "Chưa tải được" : r && F.regionalDone(s.regions[r]) ? F.regionalHonour(s, r, honourTeam) : "Đang diễn ra"}</td><td>${s ? label : "Chưa tải được"}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div></section><button data-action="Full.honours">Thử tải lại lịch sử</button>`;
}
export function renderFull() {
  initializeFullScope();
  preserveBracketScroll(
    $("content"),
    `full:${fullModel.scope}:${fullModel.selected || "library"}`,
    renderFullContent,
  );
}
function renderFullContent() {
  const row = selectedFull(),
    s = row?.snapshot;
  $("saved").textContent = fullModel.records.some((r) => r.phase === "conflict")
    ? "⚠ Full Season có xung đột"
    : fullModel.records.some((r) => r.dirty)
      ? "● Full Season đã giữ trên thiết bị · chờ đồng bộ"
      : "● Full Season đã lưu";
  let html = view.fullStatusHtml();
  if (fullModel.section === "honours") html += honoursHtml();
  else if (!row) html += view.libraryHtml();
  else if (!s) {
    html +=
      '<div class="panel full-empty"><p>Đang tải mùa Full Season…</p><button data-action="Full.library">← Các mùa Full Season</button><button data-action="Full.open" data-arg="' +
      esc(row.season_id) +
      '">Thử tải lại</button></div>';
    const key = fullModel.scope + row.season_id;
    if (!loading.has(key)) {
      loading.add(key);
      const token = fullModel.token;
      void loadFullSnapshot(row.season_id)
        .then(() => {
          if (token === fullModel.token) getPorts().commands.render();
        })
        .catch((e) => {
          if (token === fullModel.token)
            toast(e instanceof Error ? e.message : "Chưa tải được mùa.");
        })
        .finally(() => loading.delete(key));
    }
  } else {
    html += view.selectedHeader(s);
    const g = source(s),
      region = F.regionOrder.find(
        (r) => fullModel.section === r || fullModel.section.startsWith(`${r}G`),
      ),
      grouped = region && s.regions[region].groups,
      groupIndex = region ? Number(fullModel.section.split("G").at(-1)) : 0;
    html +=
      region && grouped && fullModel.section === region
        ? view.regionHtml(s, region, row.status === "completed")
        : g
          ? view.leagueHtml(
              s,
              g,
              fullModel.section.startsWith("WG")
                ? `Bảng ${"ABCDEF"[Number(fullModel.section.slice(2))]}`
                : region
                  ? `${names[region]}${grouped ? ` · Bảng ${"ABC"[groupIndex]}` : ""}`
                  : "Khu vực",
              fullModel.section.startsWith("WG")
                ? 2
                : region
                  ? grouped
                    ? F.groupDirectSlots[region]
                    : F.worldSlots[region]
                  : 0,
              row.status === "completed",
              !!(region && grouped && s.regions[region].decider !== undefined),
            )
          : fullModel.section === "world"
            ? view.worldHtml(s)
            : fullModel.section === "playoff"
              ? view.playoffHtml(s, row.status === "completed")
              : view.overviewHtml(s);
  }
  $("content").innerHTML =
    html +
    '<input type="file" id="fullImport" accept="application/json" data-action="Full.importFile" data-trigger="change" hidden>';
}
export { reloadFullCloud, resolveFullConflict, saveFullNow };
