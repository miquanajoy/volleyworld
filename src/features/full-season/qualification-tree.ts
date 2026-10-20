import * as F from "../../domain/full-season/index";
import type { TeamId } from "../../domain/types";
import { score, winner } from "../../domain/match/scoring";
import { esc } from "../../shared/dom";
import { team } from "../../components/team";
import { fullTeam } from "./views";
import { selectedFull } from "./model";

type Entrant = { id?: TeamId; waiting?: string; bye?: boolean } | null;

/** Display-only routes: a pending match never becomes a persisted match. */
export function qualifierTreeHtml(
  s: F.FullSeason,
  b: F.QualifierBracket,
  prefix: string,
) {
  const locked =
      selectedFull()?.status === "completed" ||
      selectedFull()?.phase === "conflict",
    size = 2 ** b.rounds.length,
    preliminary = size !== b.seeds.length,
    rows = preliminary ? size / 2 : size,
    win = F.qualifierWinner(b),
    next = b.rounds.findIndex((row) => row.some((m) => !m.sets));
  let players: Entrant[] = F.seedSlots(b.seeds.length).map((n) =>
    b.seeds[n - 1] ? { id: b.seeds[n - 1] } : null,
  );
  const columns = b.rounds.map((matches, r) => {
    const nominal = size / 2 ** r,
      label =
        r === 0 && preliminary
          ? "Sơ loại"
          : nominal === 8
            ? "Tứ kết"
            : nominal === 4
              ? "Bán kết"
              : "Tranh vé World Cup",
      letter =
        r === 0 && preliminary
          ? "P"
          : nominal === 8
            ? "Q"
            : nominal === 4
              ? "S"
              : "F",
      advancing: Entrant[] = [],
      nodes: string[] = [];
    for (let i = 0; i < players.length; i += 2) {
      const a = players[i],
        c = players[i + 1],
        index = i / 2;
      if (!a || !c) {
        const entrant = a || c;
        advancing.push(entrant ? { ...entrant, bye: true } : null);
        continue;
      }
      const m = matches.find((m) => m.id === `${prefix}K${r}-${index}`),
        result = m ? score(m) : null,
        winning = m?.sets ? winner(m) : null,
        code = `${letter}${r === 0 && preliminary ? nodes.length + 1 : index + 1}`,
        span = r === 0 && preliminary ? 2 : rows / (nominal / 2),
        position = r === 0 && preliminary ? Math.floor(index / 2) : index,
        tag = m ? "button" : "div";
      advancing.push(winning ? { id: winning } : { waiting: `Thắng ${code}` });
      nodes.push(
        `<div class="qualification-node ${r > 0 && !(r === 1 && preliminary && !b.rounds[0].some((m) => Math.floor(Number(m.id.split("-").at(-1)) / 2) === index)) ? "has-incoming" : ""} ${r < b.rounds.length - 1 ? "has-outgoing" : ""} ${r < b.rounds.length - 1 && index % 2 === 0 && !(r === 0 && preliminary) ? "joins-next" : ""}" style="grid-row:${position * span + 1} / span ${span};--qualification-join:${span * 64}px"><${tag} class="bracket-match full-tree-match ${m?.sets ? "is-finished" : ""}" ${m ? `type="button" data-action="Full.match" data-arg="${m.id}"` : 'aria-disabled="true"'} data-qualification-match="${prefix}K${r}-${index}" aria-label="${esc(`${code} · ${label}`)}"><span class="bracket-match-head"><span>${code} · ${label}</span><span class="bracket-state">${m?.sets ? "✓ Đã đấu" : m ? "Chi tiết ↗" : "Chờ vòng trước"}</span></span>${[a, c].map((entrant, side) => `<span class="full-tree-side ${winning === entrant.id ? "is-winner" : winning ? "is-loser" : ""}">${entrant.id ? `<span class="qualification-team" data-team="${entrant.id}" ${entrant.bye ? 'data-bye="true"' : ""}><span class="qualification-seed" title="${entrant.bye ? "Được miễn sơ loại" : "Hạt giống"}">S${b.seeds.indexOf(entrant.id) + 1}${entrant.bye ? " ↪" : ""}</span>${fullTeam(entrant.id, s)}</span>` : `<span class="full-tree-waiting"><span class="waiting-team-icon">?</span><span>${esc(entrant.waiting || "Chờ đội tuyển")}</span></span>`}<b class="bracket-set-score">${m?.sets ? result![side] : "–"}</b></span>`).join("")}</${tag}></div>`,
      );
    }
    players = advancing;
    return `<section class="qualification-round" aria-label="${label}"><div class="section-head"><div><span class="eyebrow">VÒNG ${r + 1}</span><h4>${label}</h4></div>${!locked && r === next ? `<button data-action="Full.qualifierStage" data-arg="${prefix}">Chạy vòng</button>` : ""}</div><div class="qualification-nodes" style="grid-template-rows:repeat(${rows},64px)">${nodes.join("")}</div></section>`;
  });
  return `${win ? `<section class="panel qualification-winner"><span>✓ GIÀNH VÉ WORLD CUP</span>${team(win)}</section>` : ""}<p class="sub qualification-seed-note">${b.seeds.length} đội · BO5 · Nhánh cố định${preliminary ? ` · ${size - b.seeds.length} hạt giống được miễn sơ loại (↪), đã có sẵn ở vòng tiếp theo` : ""}. Seed: hạng bảng → tỷ lệ thắng → HS set/trận → HS điểm/trận → BXH thế giới.</p><p class="tree-scroll-hint">Đọc từ trái sang phải · Bấm vào trận để xem chi tiết · Cuộn ngang để xem toàn bộ nhánh.</p><div class="full-bracket qualification-tree" role="region" tabindex="0" aria-label="Nhánh tranh vé World Cup có thể cuộn ngang">${columns.join("")}</div>`;
}
