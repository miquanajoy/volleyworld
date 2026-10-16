import { network } from "./flow";
import type { SearchResult, WinEdge } from "./types";

// A game contributes exactly one win. Integral max flow assigns that win to one
// endpoint. A failed cut identifies teams of which at least one must be relaxed.
export function feasible(
  kind: "lower" | "upper",
  values: number[],
  edges: WinEdge[],
  mask: number,
) {
  const n = values.length,
    source = n + edges.length,
    sink = source + 1,
    net = network(sink + 1);
  let required = 0;
  if (kind === "lower") {
    values.forEach((v, i) => {
      const demand = mask & (1 << i) ? 0 : v;
      net.edge(source, i, demand);
      required += demand;
    });
    edges.forEach(([a, b], j) => {
      net.edge(a, n + j, 1);
      net.edge(b, n + j, 1);
      net.edge(n + j, sink, 1);
    });
  } else {
    values.forEach((v, i) =>
      net.edge(i, sink, mask & (1 << i) ? edges.length : v),
    );
    edges.forEach(([a, b], j) => {
      net.edge(source, n + j, 1);
      net.edge(n + j, a, 1);
      net.edge(n + j, b, 1);
    });
    required = edges.length;
  }
  const f = net.flow(source, sink);
  return {
    ok: f.value === required,
    conflict: values
      .map((_, i) => i)
      .filter(
        (i) =>
          !(mask & (1 << i)) &&
          f.reachable.has(i) &&
          (kind !== "lower" || values[i] > 0),
      ),
  };
}

export function search(
  kind: "lower" | "upper",
  values: number[],
  edges: WinEdge[],
  allowed: number,
  maxNodes: number,
): SearchResult {
  let visited = 0;
  const memo = new Map<number, SearchResult>();
  function visit(mask: number, left: number): SearchResult {
    if (visited++ >= maxNodes) return null;
    if (memo.has(mask)) return memo.get(mask)!;
    const f = feasible(kind, values, edges, mask);
    if (f.ok) return true;
    if (left === 0 || !f.conflict.length) {
      memo.set(mask, false);
      return false;
    }
    f.conflict.sort((a, b) =>
      kind === "lower" ? values[b] - values[a] : values[a] - values[b],
    );
    let unknown = false;
    for (const i of f.conflict) {
      const r = visit(mask | (1 << i), left - 1);
      if (r === true) return true;
      if (r === null) unknown = true;
    }
    const r = unknown ? null : false;
    memo.set(mask, r);
    return r;
  }
  return visit(0, allowed);
}
