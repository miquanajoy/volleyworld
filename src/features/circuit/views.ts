import { winner, loser } from "../../domain/match/scoring";
import { medalPodiumHtml } from "../../components/podium";
import * as D from "../../domain/circuit/index";
import * as F from "../../domain/full-season/index";
import * as C from "../../domain/challenger/index";
import { team } from "../../components/team";
import { seasonMatchCard, seasonTeam } from "../../components/season-match";
import { worldPlayoffStatusHtml } from "../../components/world-playoff-status";
import { fullStandingsTable } from "../full-season/views";
import { connectedPlayoffTree } from "../full-season/playoff-tree";
import { swissTreeHtml } from "../challenger/swiss-tree";
import { bracketHtml } from "./bracket-view";
import { model, type CircuitRecord } from "./model";
import { esc } from "../../shared/dom";
const button = (action: string, label: string, arg = "", disabled = false) =>
  `<button data-action="Circuit.${action}" data-arg="${esc(arg)}" ${disabled ? "disabled" : ""}>${label}</button>`;
const regionNav = (action = "region", current = model.region) =>
  `<nav class="tour-region-nav challenger-region-tabs" aria-label="Khu vực">${D.regions.map((r) => `<button data-action="Circuit.${action}" data-arg="${r}" aria-pressed="${r === current}">${D.regionNames[r]}</button>`).join("")}</nav>`;
const tab = (section: string, label: string) =>
  `<button data-action="Circuit.section" data-arg="${section}" aria-current="${model.section === section ? "page" : "false"}">${label}</button>`;
function seasonCardHtml(r: CircuitRecord) {
  const s = r.snapshot,
    completed = r.status === "completed";
  const awards: [string, string[]][] = [
    [
      "First Stand",
      s?.firstStand
        ? D.bracketRanks(s.firstStand)
            .slice(0, 3)
            .map((t) => t.id)
        : [],
    ],
    ["Challenger", s?.challenger ? C.challengerPodium(s.challenger) : []],
    ["World Cup", r.podium],
  ];
  const count = s
    ? D.seasonMatchCount(s)
    : completed
      ? r.played
      : D.totalMatches;
  const progress = Math.min(100, (r.played / count) * 100);
  return `<article class="panel season-card tour-season-card ${completed ? "is-completed" : ""}" data-circuit-season="${esc(r.season_id)}"><div class="season-card-top"><span class="eyebrow">TOUR · MÙA ${r.season_number}</span><span class="badge ${completed ? "gold" : ""}">${r.phase === "conflict" ? "Có xung đột" : completed ? "Hoàn tất" : "Đang diễn ra"}</span></div><h3>Mùa ${r.season_number}</h3><p class="sub">${completed ? "Bảng huy chương của ba giải quốc tế" : s ? D.calendar[Math.min(s.stage, D.lastStage(s))][0] : "Đang tải tiến trình mùa giải"}</p>${completed ? `<div class="tour-history-awards">${awards.map(([name, ids]) => `<section data-history-competition="${name}"><h4>${name}</h4>${ids.length ? ids.map((id, i) => `<div class="tour-history-award medal-${i + 1}"><span class="tour-history-medal">${["🥇", "🥈", "🥉"][i]}</span>${team(id)}<small>${["Vô địch", "Á quân", "Hạng ba"][i]}</small></div>`).join("") : '<p class="tour-award-unavailable">Đang tải bảng huy chương…</p>'}</section>`).join("")}</div>` : `<div class="tour-card-progress"><div><span>TIẾN ĐỘ MÙA</span><b>${r.played}<small> / ${count} trận</small></b></div><div class="tour-progress" role="progressbar" aria-label="Tiến độ mùa ${r.season_number}" aria-valuenow="${r.played}" aria-valuemin="0" aria-valuemax="${count}"><i style="width:${progress}%"></i></div></div>`}<div class="tour-card-footer"><small>${r.phase === "conflict" ? "Cần chọn bản lưu" : r.dirty ? "Đã giữ trên thiết bị" : r.revision ? "Đã đồng bộ" : "Đã lưu"} · ${r.played}/${count} trận</small><div class="controls">${button("open", completed ? "Xem tổng kết mùa →" : "Tiếp tục mùa giải →", r.season_id)}${completed ? button("nextSeason", "Tiếp tục sang mùa kế tiếp →", r.season_id).replace("<button ", '<button class="primary" ') : ""}</div></div></article>`;
}
export function libraryHtml(records: CircuitRecord[]) {
  return `<div class="tour-page circuit-page"><section class="tour-hero"><div class="circuit-hero-copy"><span class="eyebrow">VOLLEYWORLD TOUR</span><h2>Bốn khu vực.<br>Một hành trình thế giới.</h2><p>League khu vực, First Stand, Challenger và World Cup.<br>Hai hạng đấu. Tranh tài quốc tế và giữ suất mùa sau.</p><div class="actions">${button("create", records.some((r) => r.status === "active") ? "Tiếp tục mùa giải →" : "Bắt đầu mùa giải →").replace("<button ", '<button class="primary" ')}${button("achievements", "Thành tích quốc gia ↗")}</div></div><div class="tour-hero-route" aria-label="Hành trình quốc tế"><span>LEAGUE KHU VỰC</span><i>↓</i><span>FIRST STAND · CHALLENGER</span><i>↓</i><strong>WORLD CUP</strong><small>4 KHU VỰC · 32 ĐỘI WORLD CUP</small></div></section><div class="full-library-toolbar">${button("export", "Xuất tiến trình")}${button("import", "Nhập tiến trình")}</div><div class="full-format-grid circuit-region-grid">${D.regions.map((r) => `<section class="panel full-region-summary"><h3>${D.regionNames[r]}</h3><p>16 đội hạng 1 · 8 đội hạng 2</p><strong>8 vé World Cup</strong></section>`).join("")}</div>${
    records.length
      ? `<h2>Các mùa giải</h2><div class="season-grid tour-season-grid circuit-history-grid">${[
          ...records,
        ]
          .sort((a, b) => b.season_number - a.season_number)
          .map(seasonCardHtml)
          .join("")}</div>`
      : `<section class="panel tour-empty"><h2>Sẵn sàng cho mùa giải đầu tiên?</h2><p>Chọn đội đầu mùa, chinh phục League khu vực và tranh vé đến World Cup.</p></section>`
  }</div>`;
}
export function setupHtml() {
  const draft = model.setup!,
    r = draft.region,
    ids = draft.selection[r][draft.tier],
    capacity = draft.tier === "upper" ? 16 : 8,
    full = ids.length >= capacity,
    locked = draft.tier === "upper" && !!draft.parent;
  return `<section class="panel tour-setup circuit-page"><span class="eyebrow">CHỌN ĐỘI ĐẦU MÙA</span><h2>${draft.parent ? "Mùa tiếp theo" : "Mùa đầu tiên"}</h2><p>16 đội hạng 1 và 8 đội hạng 2 mỗi khu vực. Danh sách giữ xuyên suốt cả mùa.</p>${regionNav("setupRegion", r)}<div class="controls">${(["upper", "lower"] as const).map((t) => `<button data-action="Circuit.setupTier" data-arg="${t}" aria-pressed="${draft.tier === t}">${t === "upper" ? "Hạng 1 · 16 đội" : "Hạng 2 · 8 đội"}</button>`).join("")}</div><p class="notice">${locked ? "Hạng 1 đã chốt từ mùa trước. Theo luật mới: 8 đội World Cup và 8 đội vượt qua Phase 6. Bạn tiếp tục chọn đội Hạng 2." : `Đã chọn ${ids.length}/${draft.tier === "upper" ? 16 : 8} đội · ${full ? "Đã đủ suất. Bỏ chọn một đội để thay thế." : "Chọn thêm đội để đủ suất."} Không trùng hai hạng.`}</p><div class="challenger-team-grid">${D.pool(
    r,
  )
    .map((id) => {
      const other =
        draft.selection[r][draft.tier === "upper" ? "lower" : "upper"].includes(
          id,
        );
      return `<button class="challenger-team-choice ${ids.includes(id) ? "is-selected" : ""}" data-action="Circuit.toggle" data-arg="${id}" aria-pressed="${ids.includes(id)}" ${locked || other || (full && !ids.includes(id)) ? "disabled" : ""}>${team(id)}<span>${other ? "Đã chọn ở hạng kia" : ids.includes(id) ? "✓" : "+"}</span></button>`;
    })
    .join(
      "",
    )}</div><div class="controls">${button("cancelSetup", "Quay lại")}${button("resetSelection", "Chọn mặc định")}${button("start", "Chốt đội & bắt đầu mùa", "", !D.validSelection(draft.selection))}</div></section>`;
}
const cards = (
  s: D.CircuitSeason,
  ms: import("../../domain/types").Match[],
  locked: boolean,
) =>
  `<div class="grid full-fixtures">${ms.map((m) => seasonMatchCard(m, (id) => seasonTeam(id, D.matches(s)), "Circuit", locked || !D.batch(s).some((x) => x.id === m.id), m.id + " · BO5")).join("")}</div>`;
const rounds = (groups: F.FullLeague[], round: number) =>
  `<nav class="tour-round-nav" aria-label="Lượt thi đấu">${groups[0].rounds.map((_, i) => `<button data-action="Circuit.round" data-arg="${i}" aria-pressed="${i === round}">Lượt ${i + 1}${groups.every((g) => g.rounds[i].every((m) => m.sets)) ? " ✓" : ""}</button>`).join("")}</nav>`;
function tables(
  s: D.CircuitSeason,
  groups: F.FullLeague[],
  slots: number,
  locked: boolean,
  berths?: ReturnType<typeof F.worldPlayoffBerths>,
) {
  const r = Math.min(model.round, groups[0].rounds.length - 1);
  return `${rounds(groups, r)}<nav class="full-group-nav">${button("group", "Tất cả bảng", "all")}${groups.map((_, i) => button("group", "Bảng " + String.fromCharCode(65 + i), String(i))).join("")}</nav><div class="tour-phase-groups circuit-group-grid">${groups.map((g, i) => (model.group !== null && model.group !== i ? "" : `<section class="panel tour-group-table"><h3>Bảng ${String.fromCharCode(65 + i)}</h3>${fullStandingsTable(g, slots, r, false, false, berths).replaceAll("Full.team", "Circuit.team")}${model.section === "matches" ? cards(s, g.rounds[r], locked) : ""}</section>`)).join("")}</div>`;
}
function regionHtml(s: D.CircuitSeason, locked: boolean) {
  const phase = D.phaseIndex(model.stage),
    p = s.regions[model.region].phases[phase]?.[model.tier];
  if (!p) return '<section class="panel tour-empty">Chặng chưa mở.</section>';
  return `${regionNav()}<div class="controls"><button data-action="Circuit.tier" data-arg="upper" aria-pressed="${model.tier === "upper"}">Hạng 1</button><button data-action="Circuit.tier" data-arg="lower" aria-pressed="${model.tier === "lower"}">Hạng 2</button></div>${phase === 1 && model.tier === "upper" && !s.phaseTwoDouble ? '<p class="notice">Playoff Phase 2 đã có kết quả trước bản cập nhật, nên giữ thể thức cũ để bảo toàn tiến trình. Mùa mới dùng nhánh thắng–thua.</p>' : ""}${p.groups.length && model.section !== "playoff" ? tables(s, p.groups, model.tier === "upper" ? 4 : 2, locked) : ""}${p.bracket && (model.section === "playoff" || !p.groups.length) ? bracketHtml(p.bracket, `${D.regionNames[model.region]} · Hạng ${model.tier === "upper" ? 1 : 2}`, D.bracketDone(p.bracket)) : model.section === "playoff" ? '<section class="panel tour-empty"><h3>Chờ hoàn tất vòng bảng</h3><p>Nhánh playoff tự mở sau lượt cuối.</p></section>' : ""}${
    D.leagueDone(p)
      ? `<section class="panel"><h3>Thứ hạng chính thức</h3><div class="table-wrap"><table class="full-standings circuit-final-standings"><thead><tr><th>Hạng</th><th>Đội tuyển</th><th>Thành tích</th></tr></thead><tbody>${D.leagueRanks(
          p,
        )
          .map(
            (t) =>
              `<tr class="${t.from <= 3 ? "is-podium" : ""}"><td><span class="circuit-rank rank-${t.from}">${t.from === t.to ? t.from : t.from + "–" + t.to}</span></td><td>${team(t.id)}</td><td>${t.from <= 3 ? ["🥇 Vô địch", "🥈 Á quân", "🥉 Hạng ba"][t.from - 1] : "Hoàn tất"}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`
      : ""
  }`;
}
export function pointsHtml(s: D.CircuitSeason) {
  return `${regionNav()}${([true, false] as const)
    .map((upper) => {
      const ticket = D.directTickets(s, model.region),
        qual = D.qualifiers(s, model.region),
        lower = D.points(s, model.region, false)
          .slice(0, 4)
          .map((t) => t.id),
        closed = D.stageDone(s, 4);
      return `<section class="panel circuit-points"><h3>${upper ? "Hạng 1 · Cuộc đua World Cup" : "Hạng 2 · Cuộc đua Play-in"}</h3><p class="sub">${D.integerPointPolicy(s) ? "Thưởng League: Phase 1 ×1 · Phase 2 ×2 · Phase 3 ×3." : "Luật điểm cũ được giữ để bảo toàn vé và nhánh đã chốt."} Điểm thắng trận cập nhật sau mỗi trận · Điểm thưởng cộng khi giải kết thúc. Vé được xét trước Play-in; điểm World Cup không thay đổi suất đã chốt.</p><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>Đội</th><th>Phase 1</th><th>First Stand</th><th>Phase 2</th><th>Challenger</th><th>Phase 3</th><th>World Cup</th><th>Tổng</th><th>Trạng thái</th></tr></thead><tbody>${D.points(
        s,
        model.region,
        upper,
        true,
      )
        .map(
          (t, i) =>
            `<tr class="${upper ? (qual.includes(t.id) ? "direct" : "") : closed && lower.includes(t.id) ? "direct" : ""}"><td>${i + 1}</td><td><button class="full-team-button" data-action="Circuit.team" data-arg="${t.id}">${team(t.id)}</button></td><td>${t.phase[0]}</td><td>${t.first}</td><td>${t.phase[1]}</td><td>${t.challenger}</td><td>${t.phase[2]}</td><td>${t.world}</td><td><b>${t.total}</b></td><td>${upper ? (ticket.league.includes(t.id) ? "✓ Vé League Phase 3" : ticket.points.includes(t.id) ? "✓ Vé điểm cả mùa" : qual.includes(t.id) ? "✓ Qua Play-in" : closed ? "Dự World Cup Play-in" : "Chưa chốt vé") : closed && lower.includes(t.id) ? "✓ Vé World Cup Play-in" : closed ? "Không dự Play-in" : i < 4 ? "Tạm trong Top 4" : "Chưa chốt vé"}</td></tr>`,
        )
        .join("")}</tbody></table></div></section>`;
    })
    .join("")}`;
}
function qualifierHtml(s: D.CircuitSeason) {
  return `<div class="full-format-grid">${D.regions
    .map((r) => {
      const tickets = D.directTickets(s, r),
        q = D.qualifiers(s, r);
      return `<section class="panel"><h3>${D.regionNames[r]}</h3><span class="badge">${q.length}/8 VÉ WORLD CUP</span><div class="qualification-names">${q.map((id) => `<span>${team(id)} <small>${tickets.league.includes(id) ? "League Phase 3" : tickets.points.includes(id) ? "Điểm cả mùa" : "World Cup Play-in"}</small></span>`).join("")}</div></section>`;
    })
    .join("")}</div>`;
}
function playinHtml(s: D.CircuitSeason) {
  const p = s.regions[model.region].playin;
  return (
    regionNav() +
    (p
      ? `<div class="circuit-group-grid">${p.groups.map((b, i) => `<section class="panel"><h3>Bảng ${String.fromCharCode(65 + i)} · Hai đội đi tiếp</h3>${bracketHtml(b, "Bảng " + String.fromCharCode(65 + i), D.bracketDone(b))}</section>`).join("")}</div>${p.bracket ? bracketHtml(p.bracket, "Tranh bốn vé World Cup", D.bracketDone(p.bracket)) : '<section class="panel tour-empty">Hoàn tất bốn bảng để mở nhánh tranh vé.</section>'}`
      : '<section class="panel tour-empty">Play-in chưa mở.</section>') +
    qualifierHtml(s)
  );
}
function promotionIcon(status: ReturnType<typeof D.promotionStatus>) {
  return status === "pending"
    ? '<span class="sub" aria-label="Chưa xác định">—</span>'
    : `<span class="circuit-promotion-status ${status === "eliminated" ? "is-eliminated" : "is-qualified"}" data-promotion-status="${status}" aria-label="${status === "eliminated" ? "Không giành suất Hạng 1" : "Đã có suất Hạng 1"}" title="${status === "safe" ? "Suất World Cup" : status === "qualified" ? "Suất Phase 6" : "Bị loại"}">${status === "eliminated" ? "×" : "✓"}</span>`;
}
function promotionHtml(s: D.CircuitSeason) {
  const r = model.region,
    z = s.regions[r],
    safe = D.qualifiers(s, r),
    entrants = D.promotionEntrants(s, r);
  const roster = (ids: string[]) =>
    ids
      .map(
        (id) =>
          `<span>${team(id)}${promotionIcon(D.promotionStatus(s, r, id))}</span>`,
      )
      .join("");
  return `${regionNav()}<section class="panel circuit-promotion-summary"><div class="section-head"><div><span class="eyebrow">HẠNG 1 MÙA SAU</span><h2>${D.regionNames[r]} · Tranh 8 suất còn lại</h2></div><span class="badge">${safe.length + D.promotionWinners(s, r).length}/16 SUẤT ĐÃ CHỐT</span></div><p class="sub">Chỉ 8 đội dự World Cup được an toàn. Thắng 2 trận giành suất, thua 2 trận bị loại. BO5 · Không cộng điểm tích lũy.</p><h3>Suất World Cup · ${safe.length}/8</h3><div class="qualification-names">${roster(safe)}</div></section>${
    !z.promotion
      ? `<section class="panel"><h3>Danh sách tranh suất · ${s.stage >= 6 ? entrants.length : "Chờ chốt vé World Cup"}</h3><p class="sub">Bốc thăm sau khi World Cup kết thúc. Điểm cả mùa, thứ hạng League Phase 3/2/1 rồi bốc thăm dùng chia hạt giống.</p>${s.stage >= 6 ? `<div class="qualification-names">${roster(entrants)}</div>` : ""}</section>`
      : `<div class="circuit-group-grid circuit-promotion-groups">${z.promotion.groups
          .map(
            (g, i) =>
              `<section class="panel tour-group-table" data-promotion-group="${i}"><h3>Bảng ${String.fromCharCode(65 + i)} · 2 suất Hạng 1</h3><div class="table-wrap"><table class="full-standings circuit-promotion-table"><thead><tr><th>Nhóm hạt giống</th><th>Đội tuyển</th><th>W</th><th>L</th><th>Suất</th></tr></thead><tbody>${g.seeds
                .map((id, pot) => {
                  const ms = D.bracketMatches(g).filter((m) => m.sets),
                    status = D.promotionStatus(s, r, id);
                  return `<tr><td>${pot + 1}</td><td><button class="full-team-button" data-action="Circuit.team" data-arg="${id}">${team(id)}</button></td><td>${ms.filter((m) => winner(m) === id).length}</td><td>${ms.filter((m) => loser(m) === id).length}</td><td>${promotionIcon(status)}</td></tr>`;
                })
                .join(
                  "",
                )}</tbody></table></div>${bracketHtml(g, "Bảng " + String.fromCharCode(65 + i), D.bracketDone(g))}</section>`,
          )
          .join("")}</div>`
  }`;
}
function challengerHtml(s: D.CircuitSeason, locked: boolean) {
  const c = s.challenger;
  if (!c)
    return '<section class="panel tour-empty">Challenger chưa mở.</section>';
  const round = Math.min(model.round, c.rounds.length - 1);
  if (model.section === "playoff")
    return c.bracket
      ? connectedPlayoffTree(
          c.bracket,
          locked,
          (id) => seasonTeam(id, C.challengerMatches(c)),
          { start: "qf", prefix: "Circuit", label: "Challenger · 8 đội" },
        )
      : '<section class="panel tour-empty">Tám đội vượt qua Swiss sẽ vào playoff.</section>';
  return `<nav class="tour-round-nav">${c.rounds.map((_, i) => button("round", "Swiss " + (i + 1), String(i))).join("")}</nav>${
    model.section === "table"
      ? `<section class="panel"><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>Đội</th><th>W</th><th>L</th><th>OMW</th><th>HS set</th></tr></thead><tbody>${C.challengerStandings(
          c,
          round,
        )
          .map(
            (t, i) =>
              `<tr><td>${i + 1}</td><td>${team(t.id)}${worldPlayoffStatusHtml({ qualified: t.w === 3, eliminated: t.l === 3 })}</td><td>${t.w}</td><td>${t.l}</td><td>${(t.omw * 100).toFixed(1)}%</td><td>${t.sf - t.sa}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`
      : `${swissTreeHtml(c, round).replaceAll("Challenger.", "Circuit.")}${cards(s, c.rounds[round], locked)}`
  }`;
}
function worldHtml(s: D.CircuitSeason, locked: boolean) {
  const w = s.world;
  if (!w) return qualifierHtml(s);
  if (model.section === "playoff")
    return w.bracket
      ? connectedPlayoffTree(
          w.bracket,
          locked,
          (id) => seasonTeam(id, D.matches(s)),
          { prefix: "Circuit", label: "World Cup" },
        )
      : '<section class="panel tour-empty">Top 2 mỗi bảng vào playoff 16 đội.</section>';
  const snapshot = F.worldAtRound(w, Math.min(model.round, 2));
  return tables(s, w.groups, 2, locked, F.worldPlayoffBerths(snapshot));
}
export function rulesHtml() {
  return `<section class="panel"><h2>Thể thức mùa giải</h2><p>Bốn khu vực · mỗi khu vực 16 đội hạng 1, 8 đội hạng 2.</p><p>Phase 1: hạng 1 nhánh thắng–thua, dừng ở hai đội đứng đầu; hạng 2 vòng bảng và playoff. First Stand: 8 đội, nhánh thắng–thua.</p><p>Phase 2: hạng 1 2 bảng × 8, Top 4 mỗi bảng vào playoff nhánh thắng–thua; Top 4 playoff dự Challenger. Chung kết tổng một trận, không reset. Nhánh thua xác định hạng 3/4. Challenger 16 đội Swiss, 8 đội playoff, có tranh hạng ba.</p><p>Phase 3: chia lại bảng theo hạt giống League Phase 2, playoff hạng 1 nhánh thắng–thua. Hai đội vào chung kết giành vé World Cup. Hạng 2 các phase: 2 bảng × 4, Top 2 vào bán kết, không tranh hạng ba.</p><p>World Cup: mỗi khu vực hai vé League Phase 3, hai vé điểm cả mùa và bốn vé Play-in. Play-in: 12 đội hạng 1 + Top 4 điểm hạng 2, bốn bảng sinh tử rồi nhánh thắng–thua tranh bốn vé.</p><p>Mọi trận BO5. Chung kết tổng một trận, không reset. World Cup 8 bảng × 4, Top 2 vào playoff loại trực tiếp và có tranh hạng ba.</p><h3>Điểm thưởng</h3><p>League thắng 5 điểm; quốc tế thắng 10 điểm. Hệ số thưởng League Phase 1/2/3: 1 / 2 / 3. Điểm được tính trực tiếp, không cần làm tròn.</p><div class="table-wrap"><table><thead><tr><th>Hạng</th><th>Hạng 1</th><th>Hạng 2</th><th>First Stand</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 7, 9, 13].map((rank) => `<tr><td>${rank}</td><td>${D.upperBonus(rank)}</td><td>${D.lowerBonus(rank)}</td><td>${D.internationalBonus(rank)}</td></tr>`).join("")}</tbody></table></div><p>Challenger thưởng bằng 2 lần First Stand ở cùng thứ hạng. World Cup thưởng bằng 3 lần First Stand ở cùng thứ hạng. Điểm World Cup ghi riêng sau khi chốt vé, không thay đổi các suất đã trao. Play-in quyết định vé bằng kết quả trận đấu, không cộng vào điểm xét vé đã chốt.</p><p>Phase 6: sau World Cup, 16 đội còn lại mỗi khu vực chia 4 bảng sinh tử GSL. Thắng 2 trận giành suất Hạng 1, thua 2 trận bị loại; mỗi bảng lấy 2 đội. Mọi trận BO5, không cộng điểm. Điểm cả mùa và thứ hạng League Phase 3/2/1 dùng chia hạt giống; hòa hoàn toàn bốc thăm và lưu cố định. Mùa sau: 8 đội World Cup và 8 đội vượt qua Phase 6 vào Hạng 1. Hạng 2 tiếp tục chọn đầu mùa. Mùa đã hoàn tất trước bản cập nhật giữ luật kế thừa cũ.</p></section>`;
}
function internationalPreviewHtml(s: D.CircuitSeason, stage: number) {
  const capacity = D.internationalCapacity(stage),
    count = D.internationalTicketCount(s, stage),
    total = capacity * 4;
  const ready = stage <= s.stage;
  const condition =
    stage === 1
      ? "Hoàn tất League Phase 1 của cả bốn khu vực để bắt đầu First Stand."
      : stage === 3
        ? "Hoàn tất League Phase 2 của cả bốn khu vực để bắt đầu Challenger."
        : "Hoàn tất League Phase 3 và World Cup Play-in để bắt đầu World Cup.";
  return `<section class="panel circuit-ticket-preview" data-international-preview="${stage}"><div class="section-head"><div><span class="eyebrow">${ready ? "DANH SÁCH THAM DỰ" : "THEO DÕI VÉ · CẬP NHẬT SAU MỖI TRẬN"}</span><h2>${D.calendar[stage][0]}</h2></div><span class="badge">${count}/${total} ĐỘI ĐÃ CÓ VÉ</span></div><p class="sub">${ready ? "Các đội đã giành quyền tham dự giải." : condition + " Có thể xem đội đã có vé ngay từ bây giờ."}</p><div class="full-format-grid">${D.regions
    .map((r) => {
      const tickets = D.internationalTickets(s, stage, r);
      return `<section class="panel full-region-summary" data-ticket-region="${r}"><h3>${D.regionNames[r]}</h3><span class="badge">${tickets.length}/${capacity} VÉ</span><div class="qualification-names">${tickets.map((t) => `<span data-international-team="${t.id}">${team(t.id)}<small>✓ ${t.route}</small></span>`).join("")}${Array.from({ length: Math.max(0, capacity - tickets.length) }, () => '<span class="sub circuit-ticket-waiting">Chờ xác định đội giành vé</span>').join("")}</div></section>`;
    })
    .join(
      "",
    )}</div>${!ready ? '<p class="notice">Chưa mở bốc thăm và thi đấu. Vé chỉ được ghi nhận khi đã chắc chắn.</p>' : ""}</section>`;
}
export function seasonHtml(s: D.CircuitSeason, locked: boolean) {
  const stages = s.promotionEnabled ? D.calendar : D.calendar.slice(0, 7),
    count = D.seasonMatchCount(s),
    scopedPending = (
      [0, 2, 4, 5, 7].includes(s.stage)
        ? D.regionalBatch(
            s,
            model.region,
            [0, 2, 4].includes(s.stage) ? model.tier === "upper" : undefined,
          )
        : D.batch(s)
    ).some((m) => !m.sets),
    read = locked || model.stage !== s.stage,
    phase = D.phaseIndex(model.stage);
  let body = "";
  if (model.section === "journey")
    body = `<div class="tour-journey-grid">${stages.map(([title, sub], i) => `<section class="panel tour-journey-card"><span class="eyebrow">${i <= 1 ? "PHASE 1" : i <= 3 ? "PHASE 2" : i === 4 ? "PHASE 3" : i === 5 ? "PHASE 4" : i === 6 ? "PHASE 5" : "PHASE 6"}</span><h3>${title}</h3><p>${sub}</p><span class="badge">${i < s.stage ? "✓ HOÀN TẤT" : i === s.stage ? "ĐANG ĐẤU" : "CHƯA MỞ"}</span>${button("viewStage", i < s.stage ? "Xem kết quả" : i > s.stage && (D.internationalStage(i) || i === 7) ? "Xem đội đã có vé" : "Vào giải", String(i), i > s.stage && !D.internationalStage(i) && i !== 7)}</section>`).join("")}</div>${qualifierHtml(s)}${
      D.complete(s)
        ? `<section class="panel"><h2>World Cup · Top 3</h2><div class="season-medals">${D.podium(
            s,
          )
            .map((id, i) => `<span>${["🥇", "🥈", "🥉"][i]} ${team(id)}</span>`)
            .join(
              "",
            )}</div>${button("nextSeason", "Bắt đầu mùa tiếp theo", s.seasonId)}</section>`
        : ""
    }`;
  else if (model.stage > s.stage && D.internationalStage(model.stage))
    body = internationalPreviewHtml(s, model.stage);
  else if (model.section === "points") body = pointsHtml(s);
  else if (model.section === "qualifiers") body = qualifierHtml(s);
  else if (model.section === "rules") body = rulesHtml();
  else if (model.stage === 7) body = promotionHtml(s);
  else if (model.section === "teams" && D.internationalStage(model.stage))
    body = internationalPreviewHtml(s, model.stage);
  else if (model.section === "teams")
    body =
      regionNav() +
      `<div class="circuit-group-grid">${(["upper", "lower"] as const).map((t) => `<section class="panel"><h3>Hạng ${t === "upper" ? 1 : 2}</h3><div class="qualification-names">${s.regions[model.region][t].map((id) => `<span>${team(id)}</span>`).join("")}</div></section>`).join("")}</div>`;
  else if ([0, 2, 4].includes(model.stage)) body = regionHtml(s, read);
  else if (model.stage === 1)
    body = s.firstStand
      ? medalPodiumHtml(
          D.bracketRanks(s.firstStand)
            .slice(0, 3)
            .map((t) => t.id),
          team,
          false,
        ) +
        bracketHtml(
          s.firstStand,
          "Volleyball World First Stand",
          D.bracketDone(s.firstStand),
        )
      : "";
  else if (model.stage === 3) body = challengerHtml(s, read);
  else if (model.stage === 5) body = playinHtml(s);
  else body = worldHtml(s, read);
  return `<div class="tour-page circuit-page"><div class="section-head tour-season-heading"><div><span class="eyebrow">VOLLEYWORLD TOUR · MÙA ${s.seasonNumber}</span><h1>${model.section === "journey" ? "Hành trình mùa giải" : stages[model.stage][0]}</h1><p class="sub">${D.played(s)}/${count} trận · ${D.complete(s) ? "Mùa đã hoàn tất" : stages[s.stage][0]}</p></div><div class="controls">${button("enter", "← Các mùa")}${button("achievements", "Thành tích quốc gia")}${button("exportOne", "Xuất mùa này")}${button("requestReset", "Bắt đầu lại chuỗi mùa")}</div></div><nav class="tour-section-nav controls">${tab("journey", "Hành trình")}${tab("matches", "Lịch đấu")}${tab("table", "BXH")}${tab("playoff", "Nhánh playoff")}${tab("points", "Điểm tích lũy")}${tab("qualifiers", "Vé World Cup")}${tab("teams", "Đội tuyển")}${tab("rules", "Thể thức")}</nav>${model.section !== "journey" ? `<nav class="tour-round-nav">${stages.map(([label], i) => button("viewStage", label, String(i), i > s.stage && !D.internationalStage(i) && i !== 7)).join("")}</nav>` : ""}${!read && !D.complete(s) && !["journey", "rules", "teams", "points", "qualifiers"].includes(model.section) ? `<section class="panel circuit-stage-actions"><p>${stages[s.stage][1]}${[0, 2, 4].includes(s.stage) ? ` · ${D.regionNames[model.region]} · Hạng ${model.tier === "upper" ? 1 : 2} · Phase ${phase + 1}` : ""}</p><div class="controls">${D.stageDone(s) ? button("next", s.stage === D.lastStage(s) ? "Hoàn tất mùa giải" : "Qua chặng tiếp theo →") : button("simRound", "Chạy lượt tiếp theo", "", !scopedPending)}${button("finishStage", [0, 2, 4, 5, 7].includes(s.stage) ? "Mô phỏng hết khu vực đang xem" : "Mô phỏng hết giải", "", !scopedPending)}${button("finish", "Mô phỏng hết mùa")}</div></section>` : ""}${body}</div>`;
}
