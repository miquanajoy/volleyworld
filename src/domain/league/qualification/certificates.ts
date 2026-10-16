import type {
  Certificate,
  Certificates,
  QualificationRow,
  RemainingMatch,
  SearchResult,
  Totals,
  WinEdge,
} from "./types";
import { search } from "./winflow";

export const cmp = (a: Totals, b: Totals): number =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export const total = (t: QualificationRow): Totals => [
  t.w,
  t.sf - t.sa,
  t.pf - t.pa,
];

export function scenario(
  rows: QualificationRow[],
  remaining: RemainingMatch[],
  target: number,
  best: boolean,
) {
  const current = rows.map(total),
    count = Array(rows.length).fill(0),
    index = new Map(rows.map((r, i) => [r.id, i]));
  const other = rows.map((_, i) => i).filter((i) => i !== target),
    local = new Map(other.map((i, j) => [i, j])),
    edges: WinEdge[] = [];
  let ownRemaining = 0;
  for (const m of remaining) {
    const a = index.get(m.a)!,
      b = index.get(m.b)!;
    if (a === target || b === target) {
      ownRemaining++;
      const rival = a === target ? b : a;
      const sign = best ? -1 : 1;
      current[rival][0] += best ? 0 : 1;
      current[rival][1] += sign * 3;
      current[rival][2] += sign * 75;
    } else {
      count[a]++;
      count[b]++;
      edges.push([local.get(a)!, local.get(b)!]);
    }
  }
  const own = total(rows[target]);
  own[0] += best ? ownRemaining : 0;
  own[1] += (best ? 3 : -3) * ownRemaining;
  own[2] += (best ? 75 : -75) * ownRemaining;
  return { own, edges, other, current, count };
}

export function threshold(
  rows: QualificationRow[],
  remaining: RemainingMatch[],
  target: number,
  k: number,
  maxNodes: number,
): Certificate {
  const worst = scenario(rows, remaining, target, false),
    best = scenario(rows, remaining, target, true);
  let possible = 0,
    automatic = 0;
  const needs = worst.other.map((i) => {
    const [w, sd, pd] = worst.current[i],
      r = worst.count[i];
    let need = r + 1;
    // At x wins, max SD = 3x - (r-x); at that SD, max PD = 75x+44(r-x).
    for (let x = 0; x <= r; x++)
      if (
        cmp([w + x, sd + 4 * x - r, pd + 75 * x + 44 * (r - x)], worst.own) >= 0
      ) {
        need = x;
        break;
      }
    if (need <= r) {
      possible++;
      if (need === 0) automatic++;
    }
    return need;
  });
  let clinched = possible < k,
    clinchSearch: SearchResult = true;
  if (!clinched && automatic < k) {
    // Impossible candidates are removed up front. Their games still supply wins
    // to the other endpoint, so retain their network vertex with zero demand.
    const demands = needs.map((v, j) =>
      v > worst.count[worst.other[j]] ? 0 : v,
    );
    // Restrict branch removals to positive demands. Zero-demand impossible teams
    // do not contribute to `possible` or to the permitted number of removals.
    clinchSearch = search(
      "lower",
      demands,
      worst.edges,
      possible - k,
      maxNodes,
    );
    clinched = clinchSearch === false;
  }
  if (clinched) return { clinched: true, excluded: false, limited: false };
  let forced = 0;
  const caps = best.other.map((i) => {
    const [w, sd, pd] = best.current[i],
      r = best.count[i];
    let cap = -1;
    // At x wins, min SD = x - 3(r-x); at that SD, min PD = -44x-75(r-x).
    for (let x = 0; x <= r; x++)
      if (
        cmp(
          [w + x, sd + 4 * x - 3 * r, pd - 44 * x - 75 * (r - x)],
          best.own,
        ) <= 0
      )
        cap = x;
    if (cap < 0) {
      forced++;
      return r;
    }
    return cap;
  });
  let excluded = forced >= k,
    excludeSearch: SearchResult = true;
  if (!excluded) {
    excludeSearch = search("upper", caps, best.edges, k - 1 - forced, maxNodes);
    excluded = excludeSearch === false;
  }
  return {
    clinched: false,
    excluded,
    limited: clinchSearch === null || excludeSearch === null,
  };
}

export function solve(
  rows: QualificationRow[],
  remaining: RemainingMatch[],
  cutoffs = [12, 20],
  maxNodes = 96,
): Certificates {
  const result: Certificates = {};
  for (let i = 0; i < rows.length; i++) {
    const r: Record<number, Certificate> = {};
    for (const k of cutoffs) r[k] = threshold(rows, remaining, i, k, maxNodes);
    result[rows[i].id] = r;
  }
  return result;
}
