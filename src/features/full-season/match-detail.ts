import * as F from "../../domain/full-season/index";
import type { Match } from "../../domain/types";
import { seasonMatchDetailHtml } from "../../components/season-match-detail";
import { names } from "../../shared/dom";
import { fullTeam } from "./views";

function qualifierRound(b: F.QualifierBracket, round: number) {
  const size = 2 ** (b.rounds.length - round);
  return round === 0 && 2 ** b.rounds.length !== b.seeds.length
    ? "Sơ loại"
    : size === 8
      ? "Tứ kết"
      : size === 4
        ? "Bán kết"
        : "Tranh vé World Cup";
}
function matchLabel(s: F.FullSeason, m: Match) {
  for (const r of F.regionOrder) {
    const g = s.regions[r],
      playoff = g.playoff?.rounds.findIndex((row) => row.includes(m)) ?? -1,
      round = g.rounds.findIndex((row) => row.includes(m));
    if (playoff >= 0)
      return `${names[r]} · Playoff khu vực · ${qualifierRound(g.playoff!, playoff)}`;
    if (g.decider === m) return `${names[r]} · Tranh vé World Cup`;
    if (round >= 0) {
      const group = g.groups?.findIndex((ids) => ids.includes(m.a)) ?? -1;
      return `${names[r]}${group >= 0 ? ` · Bảng ${group + 1}` : ""} · Vòng ${round + 1}`;
    }
  }
  for (const [i, b] of (s.intercontinental?.branches || []).entries()) {
    const r = b.rounds.findIndex((row) => row.includes(m));
    if (r >= 0)
      return `Play-in liên khu vực · Nhánh ${"ABC"[i]} · ${qualifierRound(b, r)}`;
  }
  const group =
    s.world?.groups.findIndex((g) => g.rounds.flat().includes(m)) ?? -1;
  if (group >= 0) {
    const round = s.world!.groups[group].rounds.findIndex((row) =>
      row.includes(m),
    );
    return `World Cup · Bảng ${"ABCDEF"[group]} · Vòng ${round + 1}`;
  }
  const labels = {
    r16: "Vòng 16 đội",
    qf: "Tứ kết",
    sf: "Bán kết",
    final: "Chung kết",
    bronze: "Tranh hạng ba",
  };
  const stage = F.worldStages.find((k) => s.world?.bracket?.[k].includes(m));
  return stage ? `World Cup · ${labels[stage]}` : "World Cup";
}

export function fullMatchDetailHtml(
  s: F.FullSeason,
  m: Match,
  locked: boolean,
  lockMessage: string,
) {
  return seasonMatchDetailHtml(m, locked, {
    edition: `WORLD CUP · MÙA ${s.seasonNumber}`,
    label: matchLabel(s, m),
    prefix: "Full",
    renderTeam: (id) => fullTeam(id, s),
    lockMessage,
  });
}
