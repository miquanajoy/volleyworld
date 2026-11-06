import { regionalTourStatus, regionalTourTotal } from "./regional-tour";
import { get } from "../../data/teams";
import { shuffle } from "../shared/random";
import type { Region } from "../types";
import {
  fullLeague,
  fullLeagueDone,
  fullStandings,
} from "../full-season/league";
import { regionalGroup } from "../full-season/regional";
import {
  advanceQualifier,
  createQualifier,
  qualifierWinner,
} from "../full-season/qualification";
import {
  regionOrder,
  type FullSeason,
  type RegionalLeague,
} from "../full-season/types";
import { allocateCareerSlots, outsideCareerTeams } from "./allocation";
export function freshCareerQualification(
  roster: string[],
  number: number,
): FullSeason {
  const slots = allocateCareerSlots(roster, number);
  const regions = Object.fromEntries(
    regionOrder.map((r) => {
      const ids = outsideCareerTeams(roster, r),
        q = slots[r];
      if (!q || q === ids.length)
        return [
          r,
          {
            teamIds: ids,
            tie: shuffle(ids),
            groups: ids.length ? [ids] : [],
            rounds: [],
            qualifierBranches: [],
          },
        ];
      const count = Math.ceil(ids.length / 6),
        groups: string[][] = Array.from({ length: count }, () => []),
        pots = Array.from({ length: Math.ceil(ids.length / count) }, (_, i) =>
          ids.slice(i * count, (i + 1) * count),
        );
      pots.forEach((p) => shuffle(p).forEach((id, i) => groups[i].push(id)));
      const leagues = groups.map((g, i) => fullLeague(g, `${r}G${i}`));
      return [
        r,
        {
          teamIds: ids,
          tie: shuffle(ids),
          groups,
          pots,
          qualifierBranches: null,
          rounds: Array.from(
            { length: Math.max(...leagues.map((g) => g.rounds.length)) },
            (_, i) => leagues.flatMap((g) => g.rounds[i] || []),
          ),
        },
      ];
    }),
  ) as FullSeason["regions"];
  return {
    version: 1,
    mode: "full-season",
    seasonId: crypto.randomUUID(),
    seasonNumber: number,
    createdAt: new Date().toISOString(),
    regionalFormat: "career-v1",
    career: { leagueRoster: [...roster], slots, playin: null },
    regions,
    world: null,
  };
}
export function careerRegionalLayout(s: FullSeason, r: Region) {
  const g = s.regions[r],
    q = s.career!.slots[r],
    sizes = (g.groups || []).map((ids) => ids.length);
  if (!q) return { direct: sizes.map(() => 0), remaining: 0, contenders: 0 };
  if (q === g.teamIds.length)
    return { direct: sizes, remaining: 0, contenders: 0 };
  const base = Math.floor(q / sizes.length),
    direct = sizes.map((n) => Math.min(base, n - 1)),
    remaining = q - direct.reduce((a, b) => a + b, 0);
  return {
    direct,
    remaining,
    contenders: remaining ? (base === 0 ? 2 : 1) : 0,
  };
}
export function careerRegionalDirect(s: FullSeason, r: Region) {
  const g = s.regions[r],
    l = careerRegionalLayout(s, r);
  return (g.groups || []).flatMap((_, i) =>
    fullStandings(regionalGroup(g, i))
      .slice(0, l.direct[i])
      .map((t) => t.id),
  );
}
export function careerRegionalCandidates(s: FullSeason, r: Region) {
  const g = s.regions[r],
    l = careerRegionalLayout(s, r);
  return (g.groups || [])
    .flatMap((_, i) =>
      fullStandings(regionalGroup(g, i))
        .slice(l.direct[i], l.direct[i] + l.contenders)
        .map((t, j) => ({ ...t, rank: l.direct[i] + j + 1 })),
    )
    .sort((a, b) => {
      const an = a.w + a.l,
        bn = b.w + b.l;
      return (
        a.rank - b.rank ||
        b.w * an - a.w * bn ||
        (b.sf - b.sa) * an - (a.sf - a.sa) * bn ||
        (b.pf - b.pa) * an - (a.pf - a.pa) * bn ||
        get(a.id).rank - get(b.id).rank
      );
    })
    .map((t) => t.id);
}
export function careerRegionalBranchSeeds(s: FullSeason, r: Region) {
  const l = careerRegionalLayout(s, r),
    pool = careerRegionalCandidates(s, r),
    branches: string[][] = Array.from({ length: l.remaining }, () => []);
  pool.forEach((id, i) => {
    const band = Math.floor(i / l.remaining),
      pos = i % l.remaining;
    branches[band % 2 ? l.remaining - 1 - pos : pos].push(id);
  });
  return branches;
}
export function advanceCareerRegions(s: FullSeason) {
  for (const r of regionOrder) {
    const g = s.regions[r];
    if (g.qualifierBranches === null && fullLeagueDone(g))
      g.qualifierBranches = careerRegionalBranchSeeds(s, r).map((ids, i) =>
        createQualifier(ids, `${r}B${i}`),
      );
    g.qualifierBranches?.forEach((b, i) => advanceQualifier(b, `${r}B${i}`));
  }
}
export const careerRegionalDone = (g: RegionalLeague) =>
  fullLeagueDone(g) &&
  Array.isArray(g.qualifierBranches) &&
  g.qualifierBranches.every((b) => !!qualifierWinner(b));
export function careerRegionEntrants(s: FullSeason, r: Region) {
  if (s.career?.regionalTour) {
    const status = regionalTourStatus(s, r);
    return status.done ? status.entrants : [];
  }
  if (!careerRegionalDone(s.regions[r])) return [];
  return [
    ...careerRegionalDirect(s, r),
    ...s.regions[r].qualifierBranches!.map((b) => qualifierWinner(b)!),
  ];
}
export function careerRegionalTotal(s: FullSeason) {
  if (s.career?.regionalTour) return regionalTourTotal(s);
  return regionOrder.reduce((n, r) => {
    const g = s.regions[r],
      l = careerRegionalLayout(s, r);
    return (
      n +
      g.rounds.flat().length +
      (l.remaining ? careerRegionalCandidates(s, r).length - l.remaining : 0)
    );
  }, 0);
}
