import * as T from "../../domain/tour/index";
import * as F from "../../domain/full-season/index";
import * as V from "../../domain/index";
import {
  regionalDoublePlan,
  regionalDoublePreview,
} from "../../domain/career/regional-double";
import { team } from "../../components/team";
import { names } from "../../shared/dom";
import type { Region } from "../../domain/types";
import type { TourViewState } from "./views";

const regionName = (r: Region) => T.regionalTourName(r) || names[r];

export function regionalTourHtml(s: T.TourSeason, v: TourViewState) {
  const f = s.worldcup,
    r = v.region === "CSV" ? "NORCECA" : v.region,
    g = f.regions[r],
    status = T.regionalTourStatus(f, r);
  const quota = T.regionalTourQuota(f, r);
  const nav = `<nav class="tour-region-nav challenger-region-tabs" aria-label="Vòng loại khu vực">${T.regionalTourKeys.map((key) => `<button data-action="Tour.region" data-arg="${key}" aria-pressed="${key === r}">${regionName(key)} <small>${T.regionalTourQuota(f, key)} vé</small></button>`).join("")}</nav>`;
  const capacityNote =
    r === "NORCECA"
      ? '<p class="sub">Châu Mỹ dùng chung BXH; khi trao vé vẫn xét trần đội của Bắc/Trung Mỹ & Caribe và Nam Mỹ.</p>'
      : "";
  if (!g.rounds.length)
    return (
      nav +
      capacityNote +
      `<section class="panel tour-empty"><h3>${regionName(r)}</h3><p>${quota ? "Đủ suất cho tất cả đội đã chọn, không cần thi đấu." : "Khu vực không có suất mùa này."}</p>${g.teamIds.map((id) => team(id)).join("")}</section>`
    );
  const split = T.regionalTourSplit(g),
    start = v.stage === 3 ? split : 0,
    end = v.stage === 1 ? split : g.rounds.length;
  const round = Math.max(start, Math.min(v.round, end - 1));
  const confirmed =
    v.stage === 6 || (v.stage === 3 && round === end - 1) ? status.early : [];
  const bracket = f.career!.regionalTour!.brackets[r];
  const table = `<div class="full-groups tour-regional-overview">${g
    .groups!.map((_, i) => {
      const group = F.regionalGroup(g, i),
        snapshot = V.leagueRoundSnapshot(
          group,
          v.stage === 6 ? group.rounds.length - 1 : round,
        );
      return `<section class="panel tour-regional-group" data-regional-group="${i}"><div class="section-head"><h3>${g.groups!.length > 1 ? "Bảng " + (i + 1) : "BXH " + regionName(r)}</h3><span class="badge">${quota} SUẤT KHU VỰC</span></div><div class="table-wrap"><table class="tour-regional-compact"><thead><tr><th>#</th><th>Đội</th><th>W</th><th>L</th><th>HS SET</th></tr></thead><tbody>${F.fullStandings(
        snapshot,
      )
        .map(
          (t, j) =>
            `<tr class="${confirmed.includes(t.id) ? "direct" : ""}"><td>${j + 1}</td><td><button class="tour-table-team" data-action="Tour.team" data-arg="${t.id}">${team(t.id)}</button>${confirmed.includes(t.id) ? '<span class="full-qualification">✓ Vé sớm World Cup Play-in</span>' : ""}</td><td>${t.w}</td><td>${t.l}</td><td>${t.sf - t.sa}</td></tr>`,
        )
        .join("")}</tbody></table></div></section>`;
    })
    .join("")}</div>`;
  if (v.stage !== 6) {
    const fixtures = g.rounds[round] || [];
    return (
      nav +
      capacityNote +
      `<nav class="tour-round-nav" aria-label="Lượt vòng loại">${g.rounds
        .slice(start, end)
        .map(
          (row, i) =>
            `<button data-action="Tour.round" data-arg="${start + i}" aria-pressed="${round === start + i}">Lượt ${start + i + 1}${row.every((m) => m.sets) ? " ✓" : ""}</button>`,
        )
        .join(
          "",
        )}</nav>${table}${v.section === "table" ? "" : `<div class="full-fixtures regional-tour-fixtures">${fixtures.map((m) => fixture(m, "Lượt " + (round + 1), false)).join("")}</div>`}`
    );
  }
  if (v.section === "table") return nav + capacityNote + table;
  const seeds = T.regionalTourSeeds(g),
    plan = regionalDoublePlan(seeds, r + "D");
  const preview = regionalDoublePreview(
    seeds,
    r + "D",
    bracket || { rounds: [] },
  );
  const decided = status.done;
  const namesPanel = `<section class="panel tour-regional-group regional-tour-berths"><div class="section-head"><h3>Vé World Cup Play-in</h3><span class="badge">${status.entrants.length}/${quota} ĐÃ CHỐT</span></div><div class="qualification-names">${status.entrants.map((id) => `<span>${team(id)} <small>${status.early.includes(id) ? "Vé sớm" : "Qua nhánh"}</small></span>`).join("")}</div></section>`;
  const panel = (
    kind: "upper" | "lower" | "grand",
    label: string,
    sub: string,
  ) => {
    const columns = plan
      .map((stage, i) => ({ stage, i }))
      .filter(({ stage }) => stage.kind === kind);
    const rows = Math.max(1, ...columns.map(({ stage }) => stage.pairs.length));
    const code = (id: string) =>
      id
        .slice(r.length + 1)
        .replace(/-(\d+)$/, (_, n) => "-" + (Number(n) + 1));
    const markup = columns
      .map(({ stage, i }, column) => {
        const span = rows / stage.pairs.length;
        const next = columns[column + 1]?.stage;
        return `<section class="lower-tree-stage"><div class="double-stage-title"><h3>${kind === "grand" ? (stage.id.endsWith("R") ? "Trận reset" : "Trận 1") : "Vòng " + stage.id.match(/\d+$/)?.[0]}</h3><span class="badge">${bracket?.rounds[i]?.filter((m) => m.sets).length || 0} đã đấu</span></div><div class="regional-double-nodes" style="grid-template-rows:repeat(${rows},${kind === "upper" ? 106 : 132}px)">${stage.pairs
          .map((pair, j) => {
            const id = stage.id + "-" + j,
              m = bracket?.rounds[i]?.find((x) => x.id === id) || null;
            const route = pair
              .map((source) =>
                typeof source === "object" && source
                  ? (source.loss ? "Thua " : "Thắng ") + code(source.id)
                  : source
                    ? V.get(source).name
                    : "Miễn đấu",
              )
              .join(" × ");
            const tile = fixture(
              m,
              `${code(id)} · BO5`,
              decided || (!!bracket?.rounds[i] && !m),
              preview.get(id),
            );
            const classes = kind === "upper" ? "tree-node" : "lower-tree-node";
            const links =
              (next ? " has-next" : "") +
              (column ? " has-prev" : "") +
              (next && next.pairs.length < stage.pairs.length && j % 2 === 0
                ? " join-upper"
                : "");
            return `<div data-regional-slot="${id}" class="${classes}${kind === "grand" ? "" : links}" style="grid-row:${j * span + 1} / span ${span}">${kind === "upper" ? tile : `<div>${tile}<p class="double-route">${route}</p></div>`}</div>`;
          })
          .join("")}</div></section>`;
      })
      .join("");
    return `<section class="double-overview-panel" aria-label="${label}"><div class="section-head"><div><span class="eyebrow">WORLD CUP PLAY-IN · ${regionName(r)}</span><h3>${label}</h3><p class="sub">${sub}</p></div></div><div class="${kind === "upper" ? "playoff-tree-scroll" : "double-lower-scroll"}" role="region" tabindex="0" aria-label="${label} · Cuộn ngang"><div class="regional-double-columns">${markup}</div></div></section>`;
  };
  return (
    nav +
    capacityNote +
    namesPanel +
    `<div class="double-overview" data-regional-double>${panel("upper", "Nhánh thắng", "Thua lần đầu chuyển xuống nhánh thua.")}${panel("lower", "Nhánh thua", decided ? "Đã chốt đủ đại diện. Các trận không cần thiết không được mở." : "Thua lần hai bị loại. Cùng vòng bị loại thì xét BXH Phase 1.")}${!decided || plan.some((p, i) => p.kind === "grand" && bracket?.rounds[i]?.length) ? panel("grand", "Chung kết tổng", "Chỉ mở nếu vẫn cần phân định vé.") : ""}</div>`
  );
}
function fixture(
  m: import("../../domain/types").Match | null,
  label: string,
  closed: boolean,
  known?: [string | null | undefined, string | null | undefined],
) {
  if (!m)
    return `<div class="bracket-match is-waiting" aria-disabled="true"><span class="bracket-match-head"><span>${label}</span><span class="bracket-state">${closed ? "Không cần thi đấu" : known?.every((id) => !!id) ? "Chờ lịch thi đấu" : "Chờ đối thủ"}</span></span>${(known || [undefined, undefined]).map((id) => `<span class="bracket-team-line"><span class="bracket-team-name">${id ? team(id) : `<span class="waiting-team-icon">?</span><span>${id === null ? "Miễn đấu" : "Chờ kết quả"}</span>`}</span><b class="bracket-set-score">–</b></span>`).join("")}</div>`;
  const points = V.score(m),
    win = m.sets && V.winner(m);
  return `<button class="bracket-match ${m.sets ? "is-finished" : ""}" data-action="Tour.match" data-arg="${m.id}"><span class="bracket-match-head"><span>${label}</span><span class="bracket-state">${m.sets ? "✓ Đã đấu" : "Chi tiết ↗"}</span></span>${[m.a, m.b].map((id, i) => `<span class="bracket-team-line ${win === id ? "is-winner" : win ? "is-loser" : ""}"><span class="bracket-team-name">${team(id)}</span><b class="bracket-set-score">${m.sets ? points[i] : "–"}</b></span>`).join("")}</button>`;
}
