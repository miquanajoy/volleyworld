import { get } from "../../data/teams";
import type { TourSeason } from "../../domain/tour/index";
import type { Region, Match } from "../../domain/types";
import type { TourViewState } from "./views";
import {
  seasonPointsRows,
  leagueTopFour,
} from "../../domain/career/season-points";
import {
  pointsRegionalRows,
  pointsRegionPhase,
  regionalPhaseIndex,
  pointsPhaseDone,
  pointsPhasePlaces,
  pointsRegionalSeeds,
} from "../../domain/career/points-regional";
import {
  regionalTourKeys,
  regionalTourQuota,
  regionalTourName,
} from "../../domain/career/regional-tour";
import {
  regionalDoublePlan,
  regionalDoublePreview,
} from "../../domain/career/regional-double";
import { regionalGroup } from "../../domain/full-season/regional";
import { fullStandings, fullLeagueDone } from "../../domain/full-season/league";
import { qualifierPlayers } from "../../domain/full-season/qualification";
import { leagueRoundSnapshot } from "../../domain/league/round-standings";
import { careerStatus } from "../../domain/career/tour";
import { team } from "../../components/team";
import { names } from "../../shared/dom";
import { doubleBracketFixture } from "./regional-view";
const regionName = (r: Region) => regionalTourName(r) || names[r];
const badge = (confirmed: boolean, provisional: boolean, automatic = false) =>
  confirmed
    ? `<span class="full-qualification" data-point-status="qualified">✓ ${automatic ? "Top 4 League · Vé World Cup" : "Đã giành vé"}</span>`
    : provisional
      ? '<span class="points-provisional" data-point-status="provisional">Tạm trong nhóm có suất</span>'
      : '<span class="points-pending">Chưa chốt vé</span>';
export function mainPointsHtml(s: TourSeason) {
  const rows = seasonPointsRows(s),
    auto = leagueTopFour(s);
  return `<section class="panel points-panel" data-main-points><div class="section-head"><div><span class="eyebrow">ĐIỂM MÙA · CẬP NHẬT MỚI NHẤT</span><h3>League + Challenger</h3><p class="sub">4 vé top 4 BXH League + 12 vé theo điểm · Điểm không mang sang mùa sau.</p></div><span class="badge">${rows.filter((r) => r.confirmed).length}/16 VÉ ĐÃ CHỐT</span></div><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>Đội</th><th>League</th><th>Challenger</th><th>Tổng</th><th>Tối đa còn có thể đạt</th><th>Trạng thái World Cup</th></tr></thead><tbody>${rows.map((r, i) => `<tr data-point-team="${r.id}" class="${r.confirmed ? "direct" : r.inQuota ? "in" : ""}"><td>${i + 1}</td><td><button class="tour-table-team" data-action="Tour.team" data-arg="${r.id}">${team(r.id)}</button></td><td>${r.league}</td><td>${r.challenger}</td><td><b>${r.points}</b></td><td>${r.max}</td><td>${badge(r.confirmed, r.inQuota, auto.includes(r.id))}</td></tr>`).join("")}</tbody></table></div><details class="points-policy"><summary>Phổ điểm & cách chốt vé</summary><p>Thắng vòng tròn League / Swiss: 5 điểm. Thắng Play-in hoặc playoff League: 20; playoff Challenger: 10.</p><p>Thưởng League: vô địch 400 · á quân 300 · hạng ba 240 · hạng tư 200 · tứ kết 150 · vòng 16 đội 80. Challenger: 300 / 180 / 120 / 100 / 60 / 25.</p><p>Mỗi giải chỉ nhận một thưởng thành tích cuối. 12 vé điểm bỏ qua bốn đội top 4 League. Bằng điểm: thành tích playoff League → Challenger → số trận thắng League → kết quả bốc thăm đã lưu của mùa.</p><p>Điểm thắng cập nhật trực tiếp; thưởng và điểm bảo đảm được chốt khi hết phase. “Đã giành vé” chỉ hiện khi mọi kịch bản còn lại đều không thể đẩy đội ra ngoài suất.</p></details></section>`;
}
export function regionPointsHtml(s: TourSeason, r: Region) {
  const rows = pointsRegionalRows(s.worldcup, r),
    q = regionalTourQuota(s.worldcup, r);
  return `<section class="panel points-panel" data-region-points="${r}"><div class="section-head"><div><span class="eyebrow">ĐIỂM VÒNG LOẠI · CẬP NHẬT MỚI NHẤT</span><h3>${regionName(r)} · Vé World Cup Play-in</h3><p class="sub">Tổng ba phase · Tạm trong nhóm có suất chưa đồng nghĩa đã giành vé.</p></div><span class="badge">${rows.filter((x) => x.confirmed).length}/${q} VÉ ĐÃ CHỐT</span></div><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>Đội</th><th>Phase 1</th><th>Phase 2</th><th>Phase 3</th><th>Tổng</th><th>Tối đa</th><th>Trạng thái Play-in</th></tr></thead><tbody>${rows.map((x, i) => `<tr data-point-team="${x.id}" class="${x.confirmed ? "direct" : x.inQuota ? "in" : ""}"><td>${i + 1}</td><td><button class="tour-table-team" data-action="Tour.team" data-arg="${x.id}">${team(x.id)}</button></td>${x.phases.map((p) => `<td>${p}</td>`).join("")}<td><b>${x.points}</b></td><td>${x.max}</td><td>${x.eligible ? badge(x.confirmed, x.inQuota) : '<span class="points-pending">Không còn sức chứa khu vực</span>'}</td></tr>`).join("")}</tbody></table></div><details class="points-policy"><summary>Điểm khu vực & điều kiện vé</summary><p>Phase 1–2: thắng vòng bảng 5, thắng playoff 10. Thưởng vô địch 200 · á quân 120 · hạng ba 80 · hạng tư 60 · tứ kết 30. Phase 3: thắng trận 10; thưởng 240 / 160 / 120 / 90 / 60 (hạng 5–6) / 40 (7–8) / 20 (9–12).</p><p>Đấu hết từng phase, chỉ cộng một thưởng thành tích. Tổng điểm → điểm Phase 3 → Phase 2 → BXH thế giới. Châu Mỹ dùng chung bảng nhưng vẫn giữ trần tối đa 16 đội mỗi liên đoàn tại World Cup.</p></details></section>`;
}
export const allPointsHtml = (s: TourSeason) =>
  `<div class="points-rankings">${mainPointsHtml(s)}${regionalTourKeys.map((r) => regionPointsHtml(s, r)).join("")}</div>`;
export function pointsWorldTicketsHtml(s: TourSeason) {
  const state = careerStatus(s),
    rows = seasonPointsRows(s);
  return `<section class="panel points-panel" data-points-wc-tickets><div class="section-head"><div><span class="eyebrow">VÉ WORLD CUP · CẬP NHẬT MỚI NHẤT</span><h3>${state.qualified.length}/32 đội đã giành vé World Cup</h3><p class="sub">4 vé top 4 League · 12 vé điểm · 16 vé qua Play-in.</p></div></div><div class="qualification-names">${state.qualified.map((id) => `<span data-qualified-team="${id}">${team(id)}<small>${rows.find((r) => r.id === id)?.automatic ? "Top 4 BXH League" : rows.find((r) => r.id === id)?.confirmed ? "Đủ điểm tích lũy" : "Thắng World Cup Play-in"}</small><b>✓</b></span>`).join("") || '<p class="sub">Chưa có đội chắc chắn giành vé.</p>'}</div></section><div class="points-regional-tickets">${regionalTourKeys
    .map((r) => {
      const confirmed = pointsRegionalRows(s.worldcup, r).filter(
        (x) => x.confirmed,
      );
      return `<section class="panel points-panel" data-playin-tickets="${r}"><h3>${regionName(r)} · ${confirmed.length}/${regionalTourQuota(s.worldcup, r)} vé Play-in</h3><div class="qualification-names">${confirmed.map((x) => `<span data-playin-qualified="${x.id}">${team(x.id)}<small>✓ Đủ điểm dự World Cup Play-in</small></span>`).join("") || '<p class="sub">Chưa chốt đại diện theo điểm.</p>'}</div></section>`;
    })
    .join("")}</div>${mainPointsHtml(s)}`;
}
export function pointsRegionalHtml(s: TourSeason, v: TourViewState) {
  const f = s.worldcup,
    r = v.region === "CSV" ? "NORCECA" : v.region,
    p = regionalPhaseIndex(v.stage);
  const nav = `<nav class="tour-region-nav challenger-region-tabs">${regionalTourKeys.map((k) => `<button data-action="Tour.region" data-arg="${k}" aria-pressed="${r === k}">${regionName(k)} · ${regionalTourQuota(f, k)} vé</button>`).join("")}</nav>`;
  const fixture = (m: Match) =>
    doubleBracketFixture(
      m,
      `${m.id.includes("G") ? "Vòng bảng" : m.id.endsWith("B") ? "Tranh hạng ba" : "Playoff"} · BO5`,
      false,
    );
  if (v.section === "table")
    return nav + regionPointsHtml(s, r) + phaseGroups();
  function phaseGroups() {
    if (p === 2) return "";
    const g = pointsRegionPhase(f, r, p),
      round = Math.max(0, Math.min(v.round, g.rounds.length - 1));
    return `<div class="full-groups">${g
      .groups!.map((_, i) => {
        const group = regionalGroup(g, i),
          snap = leagueRoundSnapshot(group, round);
        return `<section class="panel points-panel" data-points-group="${i}"><h3>Bảng ${"ABCD"[i]} · Phase ${p + 1}</h3><div class="table-wrap"><table class="full-standings"><thead><tr><th>#</th><th>Đội</th><th>W</th><th>L</th><th>HS set</th><th>Playoff</th></tr></thead><tbody>${fullStandings(
          snap,
        )
          .map(
            (t, j) =>
              `<tr class="${j < 2 ? "in" : ""}"><td>${j + 1}</td><td>${team(t.id)}</td><td>${t.w}</td><td>${t.l}</td><td>${t.sf - t.sa}</td><td>${fullLeagueDone(snap) && j < 2 ? "✓ Vào playoff" : j < 2 ? "Tạm top 2" : ""}</td></tr>`,
          )
          .join("")}</tbody></table></div></section>`;
      })
      .join("")}</div>`;
  }
  if (p < 2) {
    const g = pointsRegionPhase(f, r, p),
      round = Math.max(0, Math.min(v.round, g.rounds.length - 1));
    const roundNav = `<nav class="tour-round-nav">${g.rounds.map((_, i) => `<button data-action="Tour.round" data-arg="${i}" aria-pressed="${round === i}">Lượt ${i + 1}</button>`).join("")}</nav>`;
    const b = g.playoff;
    const tree = b
      ? `<section class="double-overview-panel"><h3>Playoff Phase ${p + 1} · Top 2 mỗi bảng</h3><div class="playoff-tree-scroll"><div class="regional-double-columns">${b.rounds.map((row, i) => `<section class="lower-tree-stage"><h4>${i === b.rounds.length - 1 ? "Chung kết" : "Vòng " + (i + 1)}</h4>${row.map(fixture).join("")}${!row.length ? `<p class="sub">${qualifierPlayers(b, i) ? "Được miễn đấu" : "Chờ vòng trước"}</p>` : ""}</section>`).join("")}${g.decider ? `<section class="lower-tree-stage"><h4>Tranh hạng ba</h4>${fixture(g.decider)}</section>` : ""}</div></div>${pointsPhaseDone(g) ? `<p class="sub">Vô địch: ${team(Object.keys(pointsPhasePlaces(g)).find((id) => pointsPhasePlaces(g)[id] === 1)!)} · Điểm thưởng phase đã chốt.</p>` : ""}</section>`
      : '<p class="sub">Playoff mở sau khi hoàn tất tất cả bảng trong khu vực.</p>';
    return (
      nav +
      `<p class="sub">Phase ${p + 1} · ${g.teamIds.length} đội · ${g.groups!.length} bảng · Top 2 vào playoff. Hết phase cộng điểm; chưa tự động trao vé chỉ vì vô địch.</p>` +
      regionPointsHtml(s, r) +
      (v.section === "playoff"
        ? tree
        : roundNav +
          phaseGroups() +
          `<div class="regional-tour-fixtures">${(g.rounds[round] || []).map(fixture).join("")}</div>` +
          tree)
    );
  }
  const seeds = pointsRegionalSeeds(f, r),
    b = f.career!.regionalTour!.brackets[r] || { rounds: [] };
  if (seeds.length < 2) return nav + regionPointsHtml(s, r);
  const plan = regionalDoublePlan(seeds, r + "D"),
    preview = regionalDoublePreview(seeds, r + "D", b);
  const panel = (kind: string, label: string) => {
    const columns = plan
        .map((stage, i) => ({ stage, i }))
        .filter((x) => x.stage.kind === kind),
      rows = Math.max(1, ...columns.map((x) => x.stage.pairs.length));
    return `<section class="double-overview-panel" aria-label="${label}"><h3>${label}</h3><div class="double-lower-scroll"><div class="regional-double-columns">${columns
      .map(
        ({ stage, i }) =>
          `<section class="lower-tree-stage"><h4>${kind === "grand" ? (stage.id.endsWith("R") ? "Reset nếu cần" : "Chung kết") : "Vòng " + stage.id.match(/\d+$/)?.[0]}</h4><div class="regional-double-nodes" style="grid-template-rows:repeat(${rows},132px)">${stage.pairs
            .map((_, j) => {
              const id = stage.id + "-" + j,
                m = b.rounds[i]?.find((m) => m.id === id) || null;
              return `<div data-regional-slot="${id}" class="lower-tree-node" style="grid-row:${j * (rows / stage.pairs.length) + 1}/span ${rows / stage.pairs.length}">${doubleBracketFixture(
                m,
                id + " · BO5",
                b.rounds.length === plan.length && !m,
                preview.get(id),
                stage.pairs[j].map((source) =>
                  typeof source === "object" && source
                    ? (source.loss ? "Thua " : "Thắng ") +
                      source.id
                        .slice(r.length + 1)
                        .replace(/-(\d+)$/, (_, n) => "-" + (Number(n) + 1))
                    : source
                      ? get(source).name
                      : "Miễn đấu",
                ),
              )}</div>`;
            })
            .join("")}</div></section>`,
      )
      .join("")}</div></div></section>`;
  };
  // Only actual current fixtures are editable; all historical cards open read-only details.
  return (
    nav +
    regionPointsHtml(s, r) +
    `<p class="sub">Phase 3 · Hạt giống theo điểm Phase 1 + 2 · Đấu hết nhánh đến nhà vô địch, sau đó chốt vé bằng tổng điểm.</p><div class="double-overview" data-regional-double>${panel("upper", "Nhánh thắng")}${panel("lower", "Nhánh thua")}${panel("grand", "Chung kết")}</div>`
  );
}
