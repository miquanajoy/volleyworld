import * as V from "../../index";
import type { Tournament } from "../../types";
import { solve } from "./certificates";
import type {
  Checkpoint,
  QualificationEvents,
  QualificationReport,
  QualificationState,
} from "./types";

export const cache: Map<string, Checkpoint> = new Map();

export function checkpoint(s: Tournament, completed: number[]): Checkpoint {
  const key = JSON.stringify([
    V.ids(s),
    s.tie,
    completed.map((i) => [i, s.rounds[i].map((m) => [m.a, m.b, m.sets])]),
  ]);
  if (cache.has(key)) return cache.get(key)!;
  const included = new Set(completed),
    snapshot = {
      ...s,
      rounds: s.rounds.map((r, i) =>
        included.has(i) ? r : r.map((m) => ({ ...m, sets: null })),
      ),
    };
  const rows = V.standings(snapshot),
    remaining = snapshot.rounds.flat().filter((m) => !m.sets),
    final = remaining.length === 0;
  const certificates =
      final || !completed.length ? null : solve(rows, remaining),
    teams: Record<string, QualificationState> = {};
  // A certificate stays true under any completion of another round. Carry it
  // forward even if a later relaxed search hits its budget. Reconstruct from
  // results rather than storing flags, so edits/imports cannot preserve stale facts.
  const previous =
    completed.length && !final ? checkpoint(s, completed.slice(0, -1)) : null;
  rows.forEach((r, i) => {
    const a = certificates?.[r.id],
      old = previous?.teams[r.id] || ({} as Partial<QualificationState>);
    teams[r.id] = {
      direct: final ? i < 12 : !!a?.[12].clinched || !!old.direct,
      advance: final ? i < 20 : !!a?.[20].clinched || !!old.advance,
      noDirect: final ? i >= 12 : !!a?.[12].excluded || !!old.noDirect,
      out: final ? i >= 20 : !!a?.[20].excluded || !!old.out,
      limited: final ? false : !!(a?.[12].limited || a?.[20].limited),
    };
    const t = teams[r.id];
    t.advance = t.advance || t.direct;
    t.noDirect = t.noDirect || t.out;
    t.playin = t.advance && t.noDirect && !t.out;
  });
  const answer = {
    teams,
    rounds: [...completed],
    lastRound: completed.at(-1),
    final,
  };
  cache.set(key, answer);
  if (cache.size > 48) cache.delete(cache.keys().next().value!);
  return answer;
}

function completedRounds(s: Tournament): number[] {
  const completed = s.rounds
    .map((r, i) => ({
      i,
      done: r.every((m) => m.sets),
      order: Math.max(0, ...r.map((m) => m.resultOrder || 0)),
    }))
    .filter((r) => r.done)
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map((r) => r.i);
  return completed;
}

/** Rebuild the report at the moment this scheduled round was completed.
 * Completion order matters when players finish rounds out of schedule order.
 * Results remain the source of truth, so corrections invalidate cached proofs.
 */
export function reportAtRound(
  s: Tournament,
  round: number,
): QualificationReport | null {
  const completed = completedRounds(s),
    index = completed.indexOf(round);
  return index < 0 ? null : reportCompleted(s, completed.slice(0, index + 1));
}

export function report(s: Tournament): QualificationReport {
  return reportCompleted(s, completedRounds(s));
}

function reportCompleted(
  s: Tournament,
  completed: number[],
): QualificationReport {
  const current = checkpoint(s, completed),
    previous = completed.length ? checkpoint(s, completed.slice(0, -1)) : null;
  const events: QualificationEvents = {
    direct: [],
    advance: [],
    playin: [],
    noDirect: [],
    out: [],
  };
  for (const id of V.ids(s)) {
    const now = current.teams[id],
      old = previous?.teams[id] || ({} as Partial<QualificationState>);
    if (now.direct && !old.direct) events.direct.push(id);
    if (now.out && !old.out) events.out.push(id);
    if (now.playin && !old.playin) events.playin.push(id);
    if (now.advance && !old.advance && !now.direct && !now.playin)
      events.advance.push(id);
    if (now.noDirect && !old.noDirect && !now.out && !now.playin)
      events.noDirect.push(id);
  }
  return { ...current, events };
}
