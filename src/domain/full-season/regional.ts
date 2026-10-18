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
export function freshRegion(r: Region): RegionalLeague {
  const ids = regionTeams(r).map((t) => t.id),
    count = regionalGroupCount[r];
  if (count === 1) return fullLeague(ids, r);
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
    ...(["AVC", "CAVB"].includes(r) ? { decider: null } : {}),
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
  return fullLeagueDone(g) && (g.decider === undefined || !!g.decider?.sets);
}
export function regionQualifiers(g: RegionalLeague, r: Region): TeamId[] {
  if (!regionalDone(g))
    throw Error("Cần hoàn tất bảng và trận tranh suất khu vực.");
  if (!g.groups)
    return fullStandings(g)
      .slice(0, worldSlots[r])
      .map((t) => t.id);
  return [
    ...g.groups.flatMap((_, i) =>
      fullStandings(regionalGroup(g, i))
        .slice(0, groupDirectSlots[r])
        .map((t) => t.id),
    ),
    ...(g.decider?.sets ? [winner(g.decider)!] : []),
  ];
}
export function advanceRegions(s: FullSeason) {
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
  regionOrder.reduce(
    (n, r) =>
      n +
      s.regions[r].rounds.flat().length +
      (s.regions[r].groups && ["AVC", "CAVB"].includes(r) ? 1 : 0),
    52,
  );
export function regionalDescription(s: FullSeason, r: Region) {
  const g = s.regions[r];
  return g.groups
    ? `${g.groups.map((ids) => ids.length).join(" + ")} đội · top ${groupDirectSlots[r]} mỗi bảng${g.decider !== undefined ? " + 1 suất tranh BO5" : ""}`
    : `Vòng tròn ${g.teamIds.length} đội · top ${worldSlots[r]}`;
}
/** Conservative certificates: ties may still go either way until the final table.
 * A bounded solver may delay an announcement; it never declares an unproven berth.
 */
export function groupBerths(g: FullLeague, direct: number, decider = false) {
  const rows = fullStandings(g),
    remaining = g.rounds.flat().filter((m) => !m.sets),
    cutoffs = decider ? [direct, direct + 1] : [direct];
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
            ? certificates[t.id][direct + 1].clinched
            : i <= direct),
        eliminated: certificates
          ? certificates[t.id][decider ? direct + 1 : direct].excluded
          : i >= direct + (decider ? 1 : 0),
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
