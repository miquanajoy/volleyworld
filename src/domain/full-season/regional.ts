import {
  advanceQualification,
  qualificationGroups,
  qualifierWinner,
} from "./qualification";
import { regionTeams } from "../../data/teams";
import { solve } from "../league/qualification/index";
import { winner } from "../match/scoring";
import { shuffle } from "../shared/random";
import type { Region, TeamId } from "../types";
import { fullLeague, fullLeagueDone, fullStandings } from "./league";
import {
  regionOrder,
  worldSlots,
  type FullLeague,
  type FullSeason,
  type RegionalLeague,
} from "./types";
export const regionalGroupCount: Record<Region, number> = {
  CEV: 3,
  AVC: 2,
  NORCECA: 2,
  CAVB: 2,
  CSV: 1,
};
export const groupDirectSlots: Record<Region, number> = {
  CEV: 3,
  AVC: 2,
  NORCECA: 2,
  CAVB: 1,
  CSV: 3,
};
export function freshRegion(r: Region, qualification = false): RegionalLeague {
  const ids = regionTeams(r).map((t) => t.id),
    count = qualification ? qualificationGroups[r] : regionalGroupCount[r];
  if (count === 1)
    return {
      ...fullLeague(ids, r),
      ...(qualification ? { directSlots: 2 as const } : {}),
    };
  const groups: TeamId[][] = Array.from({ length: count }, () => []),
    pots = Array.from({ length: Math.ceil(ids.length / count) }, (_, i) =>
      ids.slice(i * count, (i + 1) * count),
    );
  pots.forEach((p) => shuffle(p).forEach((id, i) => groups[i].push(id)));
  const leagues = groups.map((g, i) => fullLeague(g, `${r}G${i}`));
  return {
    teamIds: ids,
    tie: shuffle(ids),
    groups,
    pots,
    rounds: Array.from(
      { length: Math.max(...leagues.map((g) => g.rounds.length)) },
      (_, i) => leagues.flatMap((g) => g.rounds[i] || []),
    ),
    ...(qualification
      ? { directSlots: 1 as const, playoff: null }
      : ["AVC", "CAVB"].includes(r)
        ? { decider: null }
        : {}),
  };
}
export function regionalGroup(g: RegionalLeague, index: number): FullLeague {
  if (!g.groups) return g;
  const ids = g.groups[index];
  if (!ids) throw Error("Bảng khu vực không hợp lệ.");
  return {
    teamIds: ids,
    tie: g.tie.filter((id) => ids.includes(id)),
    rounds: g.rounds
      .map((row) => row.filter((m) => ids.includes(m.a) && ids.includes(m.b)))
      .filter((row) => row.length),
  };
}
export function regionalDone(g: RegionalLeague) {
  return (
    fullLeagueDone(g) &&
    (g.decider === undefined || !!g.decider?.sets) &&
    (g.playoff === undefined || !!qualifierWinner(g.playoff))
  );
}
export function regionQualifiers(g: RegionalLeague, r: Region): TeamId[] {
  if (!regionalDone(g))
    throw Error("Cần hoàn tất bảng và trận tranh suất khu vực.");
  if (!g.groups)
    return fullStandings(g)
      .slice(0, g.directSlots || worldSlots[r])
      .map((t) => t.id);
  return [
    ...g.groups.flatMap((_, i) =>
      fullStandings(regionalGroup(g, i))
        .slice(0, g.directSlots || groupDirectSlots[r])
        .map((t) => t.id),
    ),
    ...(g.decider?.sets ? [winner(g.decider)!] : []),
    ...(qualifierWinner(g.playoff) ? [qualifierWinner(g.playoff)!] : []),
  ];
}
export function advanceRegions(s: FullSeason) {
  if (s.regionalFormat === "qualification-v2") {
    advanceQualification(s);
    return;
  }
  for (const r of regionOrder) {
    const g = s.regions[r];
    if (g.decider !== null || !g.groups || !fullLeagueDone(g)) continue;
    const ids = g.groups.map(
      (_, i) => fullStandings(regionalGroup(g, i))[groupDirectSlots[r]].id,
    );
    g.decider = { id: `${r}D0`, a: ids[0], b: ids[1], sets: null };
  }
}
export const fullTotalMatches = (s: FullSeason) =>
  s.regionalFormat === "qualification-v2"
    ? 366
    : regionOrder.reduce(
        (n, r) =>
          n +
          s.regions[r].rounds.flat().length +
          (s.regions[r].groups && ["AVC", "CAVB"].includes(r) ? 1 : 0),
        52,
      );
export function regionalDescription(s: FullSeason, r: Region) {
  const g = s.regions[r];
  return g.groups
    ? `${g.groups.map((ids) => ids.length).join(" + ")} đội · top ${g.directSlots || groupDirectSlots[r]} mỗi bảng${g.playoff !== undefined ? " đi thẳng · hạng 2–3 dự playoff khu vực" : ""}${g.decider !== undefined ? " + 1 suất tranh BO5" : ""}`
    : `Vòng tròn ${g.teamIds.length} đội · top ${g.directSlots || worldSlots[r]}${g.directSlots ? " đi thẳng · hạng 3 dự Play-in" : ""}`;
}
/** Conservative certificates: ties may still go either way until the final table.
 * A bounded solver may delay an announcement; it never declares an unproven berth.
 */
export function groupBerths(
  g: FullLeague,
  direct: number,
  decider = false,
  contenderSlots = direct + 1,
) {
  const rows = fullStandings(g),
    remaining = g.rounds.flat().filter((m) => !m.sets),
    cutoffs = decider ? [direct, contenderSlots] : [direct];
  const certificates = remaining.length
    ? solve(rows, remaining, cutoffs, 96)
    : null;
  return Object.fromEntries(
    rows.map((t, i) => [
      t.id,
      {
        qualified: certificates
          ? certificates[t.id][direct].clinched
          : i < direct,
        contender:
          decider &&
          (certificates
            ? certificates[t.id][contenderSlots].clinched
            : i < contenderSlots),
        eliminated: certificates
          ? certificates[t.id][decider ? contenderSlots : direct].excluded
          : i >= (decider ? contenderSlots : direct),
      },
    ]),
  );
}
export function regionalHonour(s: FullSeason, r: Region, id: TeamId) {
  const g = s.regions[r],
    i = g.groups?.findIndex((ids) => ids.includes(id)),
    table = fullStandings(i === undefined ? g : regionalGroup(g, i)),
    rank = table.findIndex((t) => t.id === id) + 1;
  return g.groups
    ? `#${rank} bảng ${String.fromCharCode(65 + i!)}`
    : rank <= 3
      ? ["🥇", "🥈", "🥉"][rank - 1]
      : `#${rank}`;
}
