import { podiumHtml } from "../../components/podium";
import { displayState, isReadOnly } from "../../app/selectors";
import { store } from "../../app/store";
import { formHtml, leagueRank, team } from "../../components/team";
import * as V from "../../domain/index";
import type { Bracket, Match, StageKey, Tournament } from "../../domain/types";
import { $ } from "../../shared/dom";
import {
  qualificationData,
  qualificationEntries,
  qualificationNews,
} from "../league/qualification-view";
export function playoffSlot(
  m: Match | null | undefined,
  label: string,
  waiting: (string | null)[] = ["Chờ đội tuyển", "Chờ đội tuyển"],
) {
  const actual = !!m,
    id = m?.id,
    seed = displayState().bracket?.seeds,
    score = m ? V.score(m) : [0, 0],
    win = m && V.winner(m),
    ids = [m?.a, m?.b];
  return `<${actual ? "button" : "div"} ${actual ? `type="button" data-action="openPlayoffMatch" data-arg="${id}" aria-label="${label}: ${V.get(m.a).name} gặp ${V.get(m.b).name}. ${m.sets ? `Tỉ số ${score[0]}–${score[1]}.` : "Chưa đấu."} Xem chi tiết trận."` : 'aria-label="' + label + ' · Chờ kết quả vòng trước"'} class="bracket-match ${m?.sets ? "is-finished" : ""} ${!actual ? "is-waiting" : ""}"><span class="bracket-match-head"><span>${label}</span><span class="bracket-state">${m?.sets ? "✓ Đã đấu" : actual ? "Chi tiết ↗" : "Chờ vòng trước"}</span></span>${ids
    .map((teamId, i) => {
      const t = V.get(teamId),
        known = t || V.get(waiting[i] ?? undefined);
      return `<span class="bracket-team-line ${win && win === teamId ? "is-winner" : win ? "is-loser" : ""}"><span class="bracket-team-name" title="${known?.name || waiting[i]}">${known ? `<span class="team-rank" title="Thứ hạng trên BXH league">#${leagueRank(known.id)}</span><span class="flag">${known.flag}</span><span>${known.name}</span>` : `<span class="waiting-team-icon">?</span><span>${waiting[i]}</span>`}</span>${known ? formHtml(known.id) : ""}${known && seed?.[known.id] ? `<span class="bracket-seed">S${seed[known.id]}</span>` : ""}<b class="bracket-set-score">${m?.sets ? score[i] : "–"}</b></span>`;
    })
    .join("")}</${actual ? "button" : "div"}>`;
}
export function playoffWinner(m: Match | null | undefined, fallback: string) {
  return m?.sets ? V.winner(m) : fallback;
}
export function playoffStageAction(b: Bracket) {
  if (isReadOnly()) return "";
  if (
    V.expandedSingle(displayState()) &&
    !b.r16.length &&
    b.r20?.every((m) => m.sets)
  )
    return '<button class="primary" data-action="drawBracket">Bốc thăm vòng 16 đội →</button>';
  for (const { key, label } of V.playoffOrder(displayState()))
    if (b[key]!.some((m) => !m.sets))
      return `<button class="primary" data-action="simStage" data-arg="${key}">Mô phỏng ${label.toLowerCase()} →</button>`;
  return '<span class="badge gold">MÙA GIẢI ĐÃ HOÀN TẤT</span>';
}
export function playoffQuarter(b: Bracket, i: number) {
  const letter = "ABCD"[i],
    other = "BADC"[i],
    q = b.qf[i],
    winner = q && V.winner(q);
  return `<section class="playoff-quarter quarter-${letter.toLowerCase()}"><div class="quarter-heading"><span class="quarter-letter">${letter}</span><div><h3>Nhánh ${letter}</h3><p>Thắng nhánh → Bán kết ${i < 2 ? 1 : 2} · gặp nhánh ${other}</p></div><span class="quarter-status">${winner ? "Đã có đội đi tiếp" : "4 đội → 1 suất"}</span></div><div class="quarter-round-labels"><span>VÒNG 16 ĐỘI</span><span>TỨ KẾT</span></div><div class="quarter-layout"><div class="quarter-openers">${[0, 1].map((j) => playoffSlot(b.r16[i * 2 + j], `R${i * 2 + j + 1} · Nhánh ${letter}`)).join("")}</div><div class="quarter-connectors" aria-hidden="true"><i></i><i></i><i></i></div><div class="quarter-decider">${playoffSlot(q, `Q${i + 1} · Tứ kết`, [playoffWinner(b.r16[i * 2], `Thắng R${i * 2 + 1}`), playoffWinner(b.r16[i * 2 + 1], `Thắng R${i * 2 + 2}`)])}</div></div><div class="quarter-advancer"><span>ĐẠI DIỆN NHÁNH ${letter}</span>${winner ? team(winner) : '<span class="sub">Chưa xác định</span>'}</div></section>`;
}
export function playoffFinals(b: Bracket, withSemis = true) {
  let html = withSemis
    ? `<div class="playoff-section-heading"><div><span class="eyebrow">04 ĐỘI · 01 NHÀ VÔ ĐỊCH</span><h3>Chặng cuối</h3></div><p class="sub">A + B → Bán kết 1 · C + D → Bán kết 2</p></div><div class="playoff-semis">${[0, 1].map((i) => `<section class="finals-fixture"><div class="finals-fixture-label">BÁN KẾT ${i + 1} <span>Nhánh ${"ABCD"[i * 2]} × ${"ABCD"[i * 2 + 1]}</span></div>${playoffSlot(b.sf[i], `S${i + 1} · Bán kết`, [playoffWinner(b.qf[i * 2], `Thắng nhánh ${"ABCD"[i * 2]}`), playoffWinner(b.qf[i * 2 + 1], `Thắng nhánh ${"ABCD"[i * 2 + 1]}`)])}</section>`).join("")}</div>`
    : "";
  html += `<div class="playoff-medal-matches"><section class="finals-fixture final-gold"><div class="finals-fixture-label">🏆 CHUNG KẾT <span>Hai đội thắng bán kết</span></div>${playoffSlot(b.final[0], "F · Chung kết", [playoffWinner(b.sf[0], "Thắng bán kết 1"), playoffWinner(b.sf[1], "Thắng bán kết 2")])}</section><section class="finals-fixture"><div class="finals-fixture-label">🥉 TRANH HẠNG BA <span>Hai đội thua bán kết</span></div>${playoffSlot(b.bronze[0], "B · Tranh hạng ba", [b.sf[0]?.sets ? V.loser(b.sf[0]) : "Thua bán kết 1", b.sf[1]?.sets ? V.loser(b.sf[1]) : "Thua bán kết 2"])}</section></div>`;
  return html;
}
export function playoffTree(b: Bracket, upperOnly = false) {
  const stages: [StageKey, string, number][] = [
    ["r16", "Vòng 16 đội", 8],
    ["qf", "Tứ kết", 4],
    ["sf", "Bán kết", 2],
    ["final", upperOnly ? "Chung kết nhánh thắng" : "Chung kết", 1],
  ];
  return `<p class="tree-scroll-hint">Đọc từ trái sang phải · cuộn ngang để xem trọn sơ đồ trên màn hình nhỏ.</p><div class="playoff-tree-scroll" tabindex="0" role="region" aria-label="Sơ đồ playoff đầy đủ, có thể cuộn ngang"><div class="playoff-tree-head">${stages.map(([, title, n]) => `<div><b>${title}</b><span>${n} trận</span></div>`).join("")}</div><div class="playoff-tree">${stages
    .map(
      ([key, title, n], stage) =>
        `<div class="tree-stage">${Array.from({ length: n }, (_, i) => {
          let waiting;
          if (key === "qf")
            waiting = [
              playoffWinner(b.r16[i * 2], `Thắng R${i * 2 + 1}`),
              playoffWinner(b.r16[i * 2 + 1], `Thắng R${i * 2 + 2}`),
            ];
          if (key === "sf")
            waiting = [
              playoffWinner(b.qf[i * 2], `Thắng nhánh ${"ABCD"[i * 2]}`),
              playoffWinner(
                b.qf[i * 2 + 1],
                `Thắng nhánh ${"ABCD"[i * 2 + 1]}`,
              ),
            ];
          if (key === "final")
            waiting = [
              playoffWinner(b.sf[0], "Thắng bán kết 1"),
              playoffWinner(b.sf[1], "Thắng bán kết 2"),
            ];
          if (key === "final" && !upperOnly)
            return `<div class="tree-node tree-medal-stack" style="grid-row:1 / span 16"><div class="tree-final-slot has-prev">${playoffSlot(b.final[0], "F · Chung kết", waiting)}</div><div class="tree-bronze"><h3>🥉 Tranh hạng ba</h3>${playoffSlot(b.bronze[0], "B · Tranh hạng ba", [b.sf[0]?.sets ? V.loser(b.sf[0]) : "Thua bán kết 1", b.sf[1]?.sets ? V.loser(b.sf[1]) : "Thua bán kết 2"])}</div></div>`;
          return `<div class="tree-node ${stage < 3 ? "has-next" : ""} ${stage ? "has-prev" : ""} ${i % 2 === 0 && stage < 3 ? "join-upper" : ""} ${stage === 0 ? "tree-branch-" + Math.floor(i / 2) : ""}" style="grid-row:${i * (16 / n) + 1} / span ${16 / n}">${playoffSlot(b[key]![i], key === "r16" ? `R${i + 1} · Nhánh ${"ABCD"[Math.floor(i / 2)]}` : key === "qf" ? `Q${i + 1} · Nhánh ${"ABCD"[i]}` : title, waiting)}</div>`;
        }).join("")}</div>`,
    )
    .join("")}</div></div>`;
}
export function playinSectionHtml(s: Tournament) {
  const b = s.bracket,
    pDone = s.playin!.every((m) => m.sets),
    slots = V.entrySlots(s);
  return `<details class="playin-section" ${b ? "" : "open"}><summary><span><span class="eyebrow">VÒNG PLAY-IN</span><b>8 đội · 4 suất vào Playoff</b></span><span class="badge">${s.playin!.filter((m) => m.sets).length}/4 ĐÃ ĐẤU ${b ? "· XEM LẠI" : ""}</span></summary><div class="playin-body"><div class="section-head"><p class="sub">Hạng ${slots.direct + 1}–${slots.advance} · một trận BO5 loại trực tiếp</p>${isReadOnly() ? "" : !pDone ? '<button class="primary" data-action="simPlayin">Mô phỏng vòng Play-in →</button>' : !b ? `<button class="primary" data-action="drawBracket">${V.expandedSingle(s) ? "Tạo vòng 20 đội" : "Bốc thăm playoff"} →</button>` : ""}</div><div class="playin-matches">${s.playin!.map((m, i) => playoffSlot(m, `HẠNG ${slots.direct + 1 + i} vs ${slots.advance - i}`)).join("")}</div></div></details>`;
}
export function round20Html(s: Tournament) {
  const b = s.bracket!;
  return `<details class="playin-section round20-section" ${b.r16.length ? "" : "open"}><summary><span><span class="eyebrow">VÒNG 20 ĐỘI</span><b>Hạng 13–16 × 4 đội thắng Play-in</b></span><span class="badge">${b.r20!.filter((m) => m.sets).length}/4 ĐÃ ĐẤU</span></summary><div class="playin-body"><p class="sub">Top 12 miễn vòng này. Bốn đội thắng vào seed 4 của vòng 16 đội. Ghép cố định: #13–P4, #14–P3, #15–P2, #16–P1; không đổi cặp khi có bất ngờ.</p><div class="playin-matches">${b.r20!.map((m, i) => playoffSlot(m, `D${i + 1} · Vòng 20 đội`)).join("")}</div></div></details>`;
}
export function doubleStagePanel(s: Tournament, key: StageKey) {
  const def = V.playoffStages(s).find((d) => d.key === key)!,
    slots = V.stageSlots(s, key),
    done = s.bracket![key]!.filter((m) => m.sets).length;
  return `<section class="double-stage-panel ${def.kind === "lower" ? "lower-stage" : ""}"><div class="double-stage-title"><h3>${def.label}</h3><span class="badge">${done}/${def.count}</span></div><div class="double-stage-matches">${slots.map(({ m, waiting }, i) => `<div>${playoffSlot(m, `${def.kind === "lower" ? "LB" + key.slice(5) + "-" : def.kind === "grand" ? "GF" : def.prefix}${i + 1 + (def.offset || 0)} · BO5`, waiting)}${def.pairs ? `<p class="double-route">${def.pairs[i].map(([out, src, j]) => `${out === "l" ? "Thua" : out === "w" ? "Thắng" : "Đại diện"} ${src === "final" ? "CK nhánh thắng" : src === "sf" ? "bán kết nhánh thắng" : src === "qf" ? "tứ kết nhánh thắng" : src === "r16" ? "vòng 16" : src.startsWith("lower") ? "LB" + src.slice(5) : "GF"}${src === "final" || src === "gf" ? "" : " · " + (j + 1)}`).join(" × ")}</p>` : ""}</div>`).join("")}</div></section>`;
}
export function doubleOverview(s: Tournament) {
  const b = s.bracket!;
  const lower = V.playoffStages(s).filter((d) => d.kind === "lower");
  return `<div class="double-overview"><section class="double-overview-panel" aria-label="Nhánh thắng"><div class="section-head"><div><span class="eyebrow">NHÁNH THẮNG · 16 ĐỘI · ${b.r16.length} TRẬN MỞ MÀN</span><h3>Nhánh thắng</h3><p class="sub">Thắng để đi tiếp · thua lần đầu xuống nhánh thua.</p></div></div>${playoffTree(b, true)}</section><section class="double-overview-panel" aria-label="Nhánh thua"><div class="section-head"><div><span class="eyebrow">CƠ HỘI THỨ HAI</span><h3>Nhánh thua</h3><p class="sub">Thua thêm một trận sẽ bị loại · thua chung kết nhánh thua nhận hạng ba.</p></div></div><p class="tree-scroll-hint">LB1 → LB6 · các đội rơi từ nhánh thắng được ghi ở từng trận.</p><div class="double-lower-scroll" tabindex="0" role="region" aria-label="Sơ đồ nhánh thua, có thể cuộn ngang"><div class="double-lower-tree">${lower
    .map((d, stage) => {
      const next = lower[stage + 1];
      return `<section class="lower-tree-stage"><div class="double-stage-title"><h3>${d.label}</h3><span class="badge">${b[d.key]!.filter((m) => m.sets).length}/${d.count}</span></div><div class="lower-tree-nodes">${V.stageSlots(
        s,
        d.key,
      )
        .map(
          ({ m, waiting }, i) =>
            `<div class="lower-tree-node ${next ? "has-next" : ""} ${stage ? "has-prev" : ""} ${next && next.count < d.count && i % 2 === 0 ? "join-upper" : ""}" style="grid-row:${i * (8 / d.count) + 1} / span ${8 / d.count}"><div>${playoffSlot(m, `LB${stage + 1}-${i + 1} · BO5`, waiting)}<p class="double-route">${d.pairs![i].map(([out, src, j]) => `${out === "l" ? "Thua" : "Thắng"} ${src.startsWith("lower") ? "LB" + src.slice(5) + "-" + (j + 1) : src === "final" ? "CK nhánh thắng" : src === "r16" ? "R" + (j + 1) : src === "qf" ? "Q" + (j + 1) : "S" + (j + 1)}`).join(" × ")}</p></div></div>`,
        )
        .join("")}</div></section>`;
    })
    .join(
      "",
    )}</div></div></section><section class="double-overview-panel" aria-label="Chung kết tổng"><div class="section-head"><div><span class="eyebrow">TRANH NGÔI VÔ ĐỊCH</span><h3>Chung kết tổng</h3><p class="sub">Đại diện nhánh thua thắng trận đầu → đánh thêm trận reset.</p></div></div><div class="double-grand-grid">${doubleStagePanel(s, "gf")}${b.gf?.[0]?.sets && V.winner(b.gf[0]) === b.gf[0].a ? '<div class="double-stage-panel reset-not-needed"><h3>✓ Không cần trận reset</h3><p>Đại diện nhánh thắng đã vô địch.</p></div>' : doubleStagePanel(s, "reset")}</div></section></div>`;
}
export function doublePlayoffHtml(s: Tournament) {
  const b = s.bracket!,
    stages = V.playoffStages(s),
    played = (kind: import("../../domain/types").StageDefinition["kind"]) =>
      stages
        .filter((d) => d.kind === kind)
        .reduce((n, d) => n + b[d.key]!.filter((m) => m.sets).length, 0),
    gf = b.gf![0],
    resetRequired = !!(gf?.sets && V.winner(gf) === gf.b);
  let body = store.doubleView === "overview" ? doubleOverview(s) : "";
  if (store.doubleView === "upper")
    body = `<div class="playoff-toolbar"><div class="playoff-view-switch" role="group" aria-label="Cách xem nhánh thắng"><button data-action="setPlayoffLayout" data-arg="branches" aria-pressed="${store.playoffLayout === "branches"}">Theo nhánh</button><button data-action="setPlayoffLayout" data-arg="tree" aria-pressed="${store.playoffLayout === "tree"}">Sơ đồ đầy đủ</button></div><p class="sub">Thua lần đầu xuống nhánh thua · Thắng nhánh này vào chung kết tổng</p></div>${store.playoffLayout === "tree" ? playoffTree(b, true) : `<div class="playoff-quarters">${[0, 1, 2, 3].map((i) => playoffQuarter(b, i)).join("")}</div><div class="double-upper-end">${doubleStagePanel(s, "sf")}${doubleStagePanel(s, "final")}</div>`}`;
  if (store.doubleView === "lower")
    body = `<div class="double-help"><b>Một cơ hội cuối cùng</b><p>Thua thêm một trận sẽ bị loại. Các đội từ nhánh thắng rơi xuống theo sơ đồ cố định; thua chung kết nhánh thua đứng hạng ba.</p></div><div class="double-lower-grid">${stages
      .filter((d) => d.kind === "lower")
      .map((d) => doubleStagePanel(s, d.key))
      .join("")}</div>`;
  if (store.doubleView === "grand")
    body = `<div class="double-help"><b>Chung kết tổng có reset</b><p>Đại diện nhánh thắng chưa thua trận nào. Nếu họ thắng trận 1 thì vô địch; nếu đại diện nhánh thua thắng trận 1 thì hai đội thi đấu thêm một trận BO5 quyết định.</p></div><div class="double-grand-grid">${doubleStagePanel(s, "gf")}${gf?.sets && !resetRequired ? '<section class="double-stage-panel reset-not-needed"><span>✓</span><h3>Không cần trận reset</h3><p>Đại diện nhánh thắng đã thắng trận chung kết tổng đầu tiên.</p></section>' : doubleStagePanel(s, "reset")}</div>`;
  return `<section class="playoff-dashboard"><div><span class="eyebrow">DOUBLE ELIMINATION · BO5</span><h2>Nhánh thắng – nhánh thua</h2><p>16 đội · thua hai lần mới bị loại · chung kết tổng có reset</p></div><div class="playoff-dashboard-action"><span class="badge">${V.complete(s) ? "MÙA GIẢI HOÀN TẤT" : "30–31 TRẬN PLAYOFF"}</span>${playoffStageAction(b)}</div></section>${store.tab === "season-results" ? "" : podiumHtml(s)}<div class="double-tabs" role="group" aria-label="Chọn nhánh playoff">${[
    [
      "overview",
      "Tổng thể",
      played("upper") +
        played("lower") +
        played("grand") +
        "/" +
        (resetRequired ? "31" : gf?.sets ? "30" : "30–31"),
    ],
    ["upper", "Nhánh thắng", played("upper") + "/15"],
    ["lower", "Nhánh thua", played("lower") + "/14"],
    [
      "grand",
      "Chung kết tổng",
      played("grand") + "/" + (resetRequired ? "2" : gf?.sets ? "1" : "1–2"),
    ],
  ]
    .map(
      ([key, title, count]) =>
        `<button data-action="setDoubleView" data-arg="${key}" aria-pressed="${store.doubleView === key}"><b>${title}</b><span>${count} trận</span></button>`,
    )
    .join("")}</div>${body}`;
}
export function renderPlayoff() {
  const s = displayState(),
    slots = V.entrySlots(s);
  if (isReadOnly() && !s.playin) {
    $("content").innerHTML =
      '<div class="notice">Mùa này chưa có vòng Play-in hoặc nhánh playoff.</div>';
    return;
  }
  if (!V.leagueDone(s)) {
    $("content").innerHTML =
      `<div class="notice"><span class="badge">CHẶNG TIẾP THEO</span><h2 style="margin-top:12px">Con đường đến chức vô địch</h2><p>Hoàn tất 31 vòng league để xác định ${slots.direct} đội vào thẳng playoff và 8 đội dự vòng Play-in.</p><button class="primary" data-action="navigate" data-arg="league">Tiếp tục league →</button></div>${qualificationNews(qualificationData(s))}${qualificationEntries(qualificationData(s))}<div class="rule-grid"><div class="panel rule"><h3>01 / Vòng Play-in</h3><p>Hạng ${slots.direct + 1}–${slots.advance} · ghép đội cao nhất gặp thấp nhất, tiếp tục tương tự. Bốn trận BO5, bốn vé đi tiếp.</p></div><div class="panel rule"><h3>02 / ${V.formatName(s)}</h3><p>${V.isDouble(s) ? "16 đội: thua lần đầu xuống nhánh thua, thua lần hai bị loại. Chung kết tổng có reset; không có trận tranh hạng ba riêng." : (V.expandedSingle(s) ? "Top 12 miễn vòng 20. Hạng 13–16 gặp bốn đội thắng Play-in; bốn đội thắng vòng 20 vào seed 4. " : "") + "Bốn nhánh, mỗi nhánh đủ seed 1–4. Bốc thăm một lần, sau đó đi theo nhánh đến chung kết."}</p></div></div>`;
    return;
  }
  if (!s.playin) {
    $("content").innerHTML =
      `<div class="notice"><h2>Đã xác định top ${slots.advance}</h2><p>${slots.direct} đội đầu vào thẳng playoff.${V.expandedSingle(s) ? " Top 12 được miễn vòng 20 đội." : ""} Tạo các cặp Play-in theo thứ hạng league.</p><button class="primary" data-action="startPlayin">Tạo vòng Play-in →</button></div>`;
    return;
  }
  const b = s.bracket;
  if (b && V.expandedSingle(s) && !b.r16.length) {
    $("content").innerHTML =
      `<section class="playoff-dashboard"><div><span class="eyebrow">PLAYOFF 20 ĐỘI · BO5</span><h2>Chặng mở màn playoff</h2><p>Top 12 chờ ở vòng 16 đội · hạng 13–16 gặp đội thắng Play-in.</p></div><div class="playoff-dashboard-action">${playoffStageAction(b)}</div></section><section class="panel round20-byes"><span class="eyebrow">12 ĐỘI ĐƯỢC MIỄN VÒNG 20</span><div class="qualification-names">${V.standings(
        s,
      )
        .slice(0, 12)
        .map((t) => team(t.id, false, s))
        .join("")}</div></section>${round20Html(s)}${playinSectionHtml(s)}`;
    return;
  }
  if (b && V.isDouble(s)) {
    $("content").innerHTML = doublePlayoffHtml(s) + playinSectionHtml(s);
    return;
  }
  let html = "";
  if (b) {
    const next = (
        [
          ["r16", "Vòng 16 đội"],
          ["qf", "Tứ kết"],
          ["sf", "Bán kết"],
          ["bronze", "Tranh hạng ba"],
          ["final", "Chung kết"],
        ] as [StageKey, string][]
      ).find(([key]) => !b[key]!.length || b[key]!.some((m) => !m.sets)),
      champion = b.final[0] && V.winner(b.final[0]);
    html += `<section class="playoff-dashboard"><div><span class="eyebrow">THE ROAD TO WORLD CHAMPION</span><h2>Đường đến ngôi vô địch</h2><p>Bốn nhánh cố định. Một hành trình đến chiếc cúp.</p></div><div class="playoff-dashboard-action"><span class="badge">${champion ? "ĐÃ CÓ NHÀ VÔ ĐỊCH" : next?.[1] || "Tranh hạng ba"}</span>${playoffStageAction(b)}</div></section><div class="playoff-toolbar"><div class="playoff-view-switch" role="group" aria-label="Cách xem playoff"><button data-action="setPlayoffLayout" data-arg="branches" aria-pressed="${store.playoffLayout === "branches"}">Theo nhánh</button><button data-action="setPlayoffLayout" data-arg="tree" aria-pressed="${store.playoffLayout === "tree"}">Sơ đồ đầy đủ</button></div><p class="sub">Bấm vào trận để xem điểm từng set hoặc thi đấu · S1–S4 là seed</p></div>`;
    if (store.tab !== "season-results") html += podiumHtml(s);
    html +=
      store.playoffLayout === "branches"
        ? `<div class="playoff-quarters">${[0, 1, 2, 3].map((i) => playoffQuarter(b, i)).join("")}</div>${playoffFinals(b)}`
        : playoffTree(b);
  }
  if (b?.r20) html += round20Html(s);
  html += playinSectionHtml(s);
  $("content").innerHTML = html;
}
