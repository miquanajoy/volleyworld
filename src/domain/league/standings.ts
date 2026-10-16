import { score, winner } from "../match/scoring";
import { participants } from "../tournament/roster";
import type { Standing, Tournament } from "../types";

export function standings(s: Tournament): Standing[] {
  let rows = participants(s).map((t) => ({
      ...t,
      w: 0,
      l: 0,
      sf: 0,
      sa: 0,
      pf: 0,
      pa: 0,
    })),
    map = Object.fromEntries(rows.map((t) => [t.id, t]));
  for (const m of s.rounds.flat()) {
    if (!m.sets) continue;
    let [a, b] = score(m),
      x = map[m.a],
      y = map[m.b];
    x.sf += a;
    x.sa += b;
    y.sf += b;
    y.sa += a;
    a > b ? (x.w++, y.l++) : (y.w++, x.l++);
    for (const [p, q] of m.sets) {
      x.pf += p;
      x.pa += q;
      y.pf += q;
      y.pa += p;
    }
  }
  const primary = (a: Standing, b: Standing) =>
    b.w - a.w ||
    a.l - b.l ||
    b.sf - b.sa - (a.sf - a.sa) ||
    b.pf - b.pa - (a.pf - a.pa);
  rows.sort(primary);
  for (let i = 0; i < rows.length;) {
    let j = i + 1;
    while (j < rows.length && !primary(rows[i], rows[j])) j++;
    const group = rows.slice(i, j),
      ids = new Set(group.map((x) => x.id)),
      hw = Object.fromEntries(group.map((x) => [x.id, 0]));
    for (const m of s.rounds.flat())
      if (m.sets && ids.has(m.a) && ids.has(m.b)) hw[winner(m)!]++;
    group.sort(
      (a, b) =>
        hw[b.id] - hw[a.id] || s.tie.indexOf(a.id) - s.tie.indexOf(b.id),
    );
    rows.splice(i, j - i, ...group);
    i = j;
  }
  return rows;
}

export const leagueDone = (s: Tournament) =>
  s.rounds.flat().every((m) => m.sets);
