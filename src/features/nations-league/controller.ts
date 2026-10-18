import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import * as N from "../../domain/nations-league/index";
import { simulate } from "../../domain/match/simulation";
import { score } from "../../domain/match/scoring";
import { leagueRoundSnapshot } from "../../domain/league/round-standings";
import { team } from "../../components/team";
import { $, esc } from "../../shared/dom";
import { toast } from "../../shared/feedback";
import { preserveBracketScroll } from "../../shared/bracket-scroll";
import { editFullScore } from "../matches/editor";
import { nationsCloud as cloud } from "./cloud";
import {
  nationsModel as model,
  selected,
  persist,
  clone,
  recordOf,
  backup,
} from "./model";
import * as view from "./views";
const render = () => getPorts().commands.render();
function run(action: () => unknown) {
  try {
    return action();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa thực hiện được.");
  }
}
function mutate(action: (s: N.NationsSeason) => void) {
  const row = selected();
  if (!row?.snapshot || row.status === "completed" || row.phase === "conflict")
    throw Error("Mùa này chỉ xem hoặc cần xử lý xung đột.");
  const old = row.snapshot,
    s = clone(old);
  action(s);
  N.advanceNations(s);
  N.stampNations(s);
  if (!N.validNationsSeason(s))
    throw Error("Tiến trình không hợp lệ; chưa thay đổi bản lưu.");
  backup(old);
  Object.assign(row, recordOf(s, row.revision), { dirty: true });
  if (!persist())
    toast("Chưa lưu được trên thiết bị. Hãy xuất file để giữ tiến trình.");
  cloud.queue(row);
  render();
}
export function enterNations() {
  cloud.initialize();
  store.seasonView = null;
  store.tab = "nations-league";
  model.selected = null;
  model.section = "overview";
  model.playoffTier = "A";
  render();
}
function add(s: N.NationsSeason) {
  if (!N.validNationsSeason(s)) throw Error("Không tạo được mùa hợp lệ.");
  const row = recordOf(s);
  row.dirty = true;
  model.records.push(row);
  model.selected = s.seasonId;
  model.section = "overview";
  model.playoffTier = "A";
  model.round = 0;
  if (!persist())
    toast("Chưa lưu được trên thiết bị. Hãy xuất file để giữ mùa mới.");
  cloud.queue(row);
  store.tab = "nations-league";
  render();
}
const nextNumber = () =>
  Math.max(0, ...model.records.map((r) => r.season_number)) + 1;
export function createNations() {
  cloud.initialize();
  run(() => add(N.freshNationsSeason(nextNumber())));
}
/** Continue a campaign from its latest season, loading cloud history if needed. */
export async function continueNations(id: string) {
  const scope = model.scope,
    token = model.token,
    selection = model.selected,
    tab = store.tab,
    row = model.records.find((r) => r.season_id === id);
  if (!row) return;
  if (row.phase === "conflict") {
    toast("Cần chọn bản lưu trước khi tiếp tục chuỗi mùa này.");
    return;
  }
  if (row.status !== "completed") {
    openNations(id);
    return;
  }
  try {
    const s = await cloud.load(id);
    if (
      scope !== model.scope ||
      token !== model.token ||
      model.selected !== selection ||
      store.tab !== tab
    )
      return;
    if (!s) throw Error("Chưa tải được mùa trước để áp dụng lên/xuống hạng.");
    openNations(id);
    await nextNationsSeason();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa tiếp tục được chuỗi mùa.");
  }
}
/** The shared footer must never turn a continuation into a fresh campaign. */
export function requestNationsSeason() {
  const row = selected();
  if (row?.status === "completed") return continueNations(row.season_id);
  if (!model.records.length) return createNations();
  enterNations();
  toast("Chọn Tiếp tục mùa hoặc Tạo mùa kế tiếp ở chuỗi bạn muốn chơi.");
}
export async function loadNationsTransfers(id: string) {
  const scope = model.scope,
    token = model.token,
    current = selected();
  if (!current?.snapshot || current.snapshot.previousSeasonId !== id) return;
  try {
    await cloud.load(id);
    if (
      scope === model.scope &&
      token === model.token &&
      selected() === current
    )
      render();
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa tải được kết quả mùa trước.");
  }
}
let creating = false;
export async function nextNationsSeason() {
  if (creating) return;
  const row = selected(),
    scope = model.scope;
  if (
    !row?.snapshot ||
    !N.nationsComplete(row.snapshot) ||
    row.phase === "conflict"
  )
    return;
  creating = true;
  try {
    await cloud.reload();
    if (model.scope !== scope || selected() !== row) return;
    if (row.phase === "conflict")
      throw Error("Cần xử lý xung đột mùa trước trước khi tạo mùa kế tiếp.");
    const existing = model.records.find(
      (r) =>
        r.campaign_id === row.campaign_id &&
        r.cycle_number === row.cycle_number + 1,
    );
    if (existing) {
      openNations(existing.season_id);
      return;
    }
    const s = N.freshNationsSeason(nextNumber(), row.snapshot);
    if (!N.validNationsTransition(row.snapshot, s))
      throw Error("Chuyển hạng không hợp lệ.");
    add(s);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa tạo được mùa tiếp theo.");
  } finally {
    creating = false;
  }
}
export function openNations(id: string) {
  if (!model.records.some((r) => r.season_id === id)) return;
  model.selected = id;
  model.section = "overview";
  model.playoffTier = "A";
  model.round = 0;
  store.tab = "nations-league";
  render();
}
export function sectionNations(key: string) {
  if (
    ![
      "overview",
      "groups",
      "playoff",
      "rules",
      ...N.tiers,
      ...N.tiers.flatMap((t) => [0, 1, 2, 3].map((i) => `${t}G${i}`)),
    ].includes(key)
  )
    return;
  const s = selected()?.snapshot;
  if (!s) return;
  const wasGroups =
    model.section === "groups" || /^[ABCD](G[0-3])?$/.test(model.section);
  model.section = key;
  if (!wasGroups) model.round = N.nationsCurrentRound(s);
  render();
}
export function roundNations(value: string) {
  const s = selected()?.snapshot,
    r = Number(value);
  if (!s || !Number.isInteger(r) || r < 0 || r > N.nationsCurrentRound(s))
    return;
  model.round = r;
  render();
}
export function nextNationsRound() {
  const s = selected()?.snapshot;
  if (!s || !N.nationsRoundMatches(s, model.round).every((m) => m.sets)) return;
  if (model.round < 5) model.round++;
  else model.section = "playoff";
  render();
}
export function simulateNationsRound() {
  run(() => mutate((s) => N.simulateNationsRound(s, model.round)));
}
export function drawNations() {
  run(() => {
    mutate(N.drawNationsPlayoff);
    model.section = "playoff";
    render();
  });
}
export function setNationsPlayoffTier(tier: string) {
  if (!N.tiers.includes(tier as N.Tier)) return;
  model.playoffTier = tier as N.Tier;
  model.section = "playoff";
  render();
}
export function simulateNationsStage(arg: string) {
  const [tier, stage] = arg.includes(":") ? arg.split(":") : ["A", arg];
  run(() =>
    mutate((s) => {
      if (!N.tiers.includes(tier as N.Tier))
        throw Error("Division không hợp lệ.");
      const b = N.nationsBracket(s, tier as N.Tier);
      const next = N.nationsOrder(tier as N.Tier).find((k) =>
        b?.[k].some((m) => !m.sets),
      );
      if (!b || !next || stage !== next)
        throw Error(
          "Cần hoàn tất vòng trước; Division A tranh hạng ba trước chung kết.",
        );
      b[next].filter((m) => !m.sets).forEach(simulate);
      N.advanceNations(s);
    }),
  );
}
export function finishNations() {
  if (confirm("Mô phỏng toàn bộ trận chưa đấu trong mùa Nations League này?"))
    run(() => mutate(N.finishNations));
}
export function simulateNationsMatch(id: string) {
  run(() => {
    mutate((s) => {
      const m = N.nationsMatches(s).find((m) => m.id === id);
      if (!m || m.sets || N.nationsMatchLocked(s, m))
        throw Error("Trận chưa sẵn sàng hoặc đã khóa.");
      simulate(m);
      N.advanceNations(s);
    });
    if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  });
}
export function editNationsMatch(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && N.nationsMatches(s).find((m) => m.id === id),
    scope = model.scope;
  if (!s || !m || view.readonly() || N.nationsMatchLocked(s, m)) return;
  if ($("playoffMatchDialog").open) $("playoffMatchDialog").close();
  editFullScore({
    match: m,
    current: () =>
      store.tab === "nations-league" &&
      model.scope === scope &&
      selected() === row &&
      row!.snapshot === s &&
      !view.readonly() &&
      !N.nationsMatchLocked(s, m),
    teamMarkup: (id) => view.nationsTeam(s, id),
    commit: (sets) => mutate((draft) => N.recordNationsScore(draft, id, sets)),
  });
}
let dialogContext: {
  scope: string;
  row: ReturnType<typeof selected>;
  snapshot: N.NationsSeason;
  id: string;
} | null = null;
export function showNationsMatch(id: string) {
  const row = selected(),
    s = row?.snapshot,
    m = s && N.nationsMatches(s).find((m) => m.id === id);
  if (!s || !m) return;
  dialogContext = { scope: model.scope, row, snapshot: s, id };
  const locked = view.readonly() || N.nationsMatchLocked(s, m);
  $("playoffMatchTitle").textContent = "Chi tiết trận đấu";
  $("playoffMatchBody").innerHTML = view.matchDetailHtml(s, m, locked);
  $("playoffMatchDialog").showModal();
}
export function actNationsDialog(edit = false) {
  const c = dialogContext;
  if (
    !c ||
    model.scope !== c.scope ||
    selected() !== c.row ||
    c.row?.snapshot !== c.snapshot
  ) {
    $("playoffMatchDialog").close();
    toast("Tiến trình đã thay đổi. Hãy mở lại trận đấu.");
    return;
  }
  if (edit) editNationsMatch(c.id);
  else simulateNationsMatch(c.id);
}
export function showNationsTeam(id: string, round?: number) {
  const s = selected()?.snapshot,
    g = s && N.nationsGroups(s).find((g) => g.teamIds.includes(id));
  if (!s || !g) return;
  const historical =
      round !== undefined && Number.isInteger(round) && round >= 0 && round < 6,
    matches = (
      historical
        ? leagueRoundSnapshot(g, round).rounds.flat()
        : N.nationsMatches(s)
    ).filter((m) => m.a === id || m.b === id);
  $("teamLeagueTitle").innerHTML = team(id);
  $("teamLeagueSummary").textContent =
    `Nations League · Mùa ${s.cycleNumber}${historical ? " · Tới vòng " + (round + 1) : ""} · ${matches.filter((m) => m.sets).length}/${matches.length} trận`;
  $("teamLeagueRows").innerHTML = matches
    .map((m) => {
      const own = m.a === id,
        [a, b] = score(m);
      return `<tr><td>${esc(m.id)}</td><td>${team(own ? m.b : m.a)}</td><td>${m.sets ? (own ? a : b) + "–" + (own ? b : a) : ""}</td><td>${m.sets ? m.sets.map(([x, y], i) => `S${i + 1} ${own ? x : y}–${own ? y : x}`).join(" · ") : ""}</td></tr>`;
    })
    .join("");
  $("teamLeagueDialog").showModal();
}
export async function exportNations(one = false) {
  const scope = model.scope,
    token = model.token,
    campaign = selected()?.campaign_id;
  try {
    const seasons: N.NationsSeason[] = [];
    for (const row of model.records
      .filter((r) => !one || r.campaign_id === campaign)
      .sort((a, b) => a.cycle_number - b.cycle_number)) {
      const s = await cloud.load(row.season_id);
      if (model.scope !== scope || model.token !== token) return;
      if (!s) throw Error("Thiếu dữ liệu một mùa; chưa xuất file.");
      seasons.push(clone(s));
    }
    const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                format: "volleyworld-nations-seasons",
                version: 1,
                seasons: N.nationsExportSeasons(seasons),
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "volleyworld-nations-league.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa xuất được.");
  }
}
export async function importNations(file?: File) {
  if (!file) return;
  const scope = model.scope,
    token = model.token;
  try {
    if (file.size > 20_000_000) throw Error("File quá lớn.");
    const data = JSON.parse(await file.text());
    if (model.scope !== scope || model.token !== token) return;
    if (
      data.format !== "volleyworld-nations-seasons" ||
      data.version !== 1 ||
      !Array.isArray(data.seasons) ||
      !data.seasons.length ||
      data.seasons.length > 100 ||
      !data.seasons.every(N.validNationsSeason)
    )
      throw Error("File Nations League không hợp lệ.");
    const seasons = data.seasons as N.NationsSeason[],
      ids = new Set(seasons.map((s) => s.seasonId)),
      slots = new Set(seasons.map((s) => s.campaignId + ":" + s.cycleNumber));
    if (ids.size !== seasons.length || slots.size !== seasons.length)
      throw Error("File có mùa bị trùng.");
    for (const s of seasons)
      if (s.cycleNumber > 1) {
        const parent = seasons.find((p) => p.seasonId === s.previousSeasonId);
        if (!parent || !N.validNationsTransition(parent, s))
          throw Error(
            "Thiếu mùa trước hoặc kết quả chuyển hạng không khớp. Hãy xuất cả chuỗi mùa.",
          );
      }
    if (
      !confirm(
        `Nhập ${seasons.length} mùa thành chuỗi Nations League mới? Các mùa đang có được giữ nguyên.`,
      )
    )
      return;
    const idMap = new Map(
        seasons.map((s) => [s.seasonId, crypto.randomUUID()]),
      ),
      campaignMap = new Map(
        [...new Set(seasons.map((s) => s.campaignId))].map((id) => [
          id,
          crypto.randomUUID(),
        ]),
      );
    let number = nextNumber() - 1;
    const incoming = [...seasons]
      .sort((a, b) => a.cycleNumber - b.cycleNumber)
      .map((s) => {
        const c = clone(s);
        c.seasonId = idMap.get(s.seasonId)!;
        c.campaignId = campaignMap.get(s.campaignId)!;
        c.previousSeasonId = s.previousSeasonId
          ? idMap.get(s.previousSeasonId)!
          : null;
        c.seasonNumber = ++number;
        const row = recordOf(c);
        row.dirty = true;
        return row;
      });
    model.records.push(...incoming);
    persist();
    incoming.forEach(cloud.queue);
    model.selected = null;
    render();
    toast("Đã nhập chuỗi mùa Nations League.");
  } catch (e) {
    toast(e instanceof Error ? e.message : "Chưa nhập được.");
  }
}
export function restoreNations() {
  run(() => {
    const row = selected();
    if (
      !row?.snapshot ||
      view.readonly() ||
      model.records.some((r) => r.previous_id === row.season_id)
    )
      return;
    const items = JSON.parse(
        localStorage.getItem(model.scope + "-backups") || "[]",
      ) as { state: N.NationsSeason }[],
      item = items.find(
        (b) =>
          b.state?.seasonId === row.season_id && N.validNationsSeason(b.state),
      );
    if (!item) {
      toast("Chưa có bản sao trước của mùa này.");
      return;
    }
    if (confirm("Khôi phục bản lưu trước của mùa Nations League này?"))
      mutate((s) => Object.assign(s, clone(item.state)));
  });
}
export async function showNationsHonours(id?: string) {
  if (id) model.honourTeam = id;
  model.selected = null;
  model.section = "honours";
  render();
  const token = model.token,
    ids = model.records.filter((r) => !r.snapshot).map((r) => r.season_id);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (index < ids.length) {
        if (token !== model.token) return;
        try {
          await cloud.load(ids[index++]);
        } catch {
          /* Explicit unavailable history shown in view. */
        }
      }
    }),
  );
  if (token === model.token && model.section === "honours") render();
}
const loading = new Set<string>();
export function renderNations() {
  cloud.initialize();
  preserveBracketScroll(
    $("content"),
    `nations:${model.scope}:${model.selected || "library"}`,
    () => {
      const row = selected(),
        s = row?.snapshot;
      $("saved").textContent = model.records.some((r) => r.phase === "conflict")
        ? "⚠ Nations League có xung đột"
        : model.records.some((r) => r.dirty)
          ? "● Nations League đã giữ trên thiết bị · chờ đồng bộ"
          : "● Nations League đã lưu";
      const footer = document.querySelector?.<HTMLButtonElement>(
        'footer [data-action="Seasons.requestNew"]',
      );
      if (footer)
        footer.textContent =
          row?.status === "completed"
            ? "Mùa kế tiếp · lên/xuống hạng"
            : "Quản lý mùa giải";
      let html = view.statusHtml();
      if (model.section === "honours") html += view.honoursHtml();
      else if (!row) html += view.libraryHtml();
      else if (!s) {
        html += `<section class="panel full-empty"><p>Đang tải mùa Nations League…</p><button data-action="Nations.library">← Các mùa</button><button data-action="Nations.open" data-arg="${esc(row.season_id)}">Thử tải lại</button></section>`;
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
        model.round = Math.min(model.round, N.nationsCurrentRound(s));
        html += view.headerHtml(s);
        html +=
          model.section === "playoff"
            ? view.playoffHtml(s)
            : model.section === "overview"
              ? view.overviewHtml(s)
              : model.section === "rules"
                ? view.rulesHtml(true, s)
                : view.groupsHtml(s);
      }
      $("content").innerHTML =
        html +
        '<input type="file" id="nationsImport" accept="application/json" data-action="Nations.importFile" data-trigger="change" hidden>';
    },
  );
}
