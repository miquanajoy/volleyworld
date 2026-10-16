import type { FlowEdge } from "./types";

export function network(n: number) {
  const g: FlowEdge[][] = Array.from({ length: n }, () => []);
  function edge(a: number, b: number, c: number) {
    const x = { to: b, c, rev: g[b].length },
      y = { to: a, c: 0, rev: g[a].length };
    g[a].push(x);
    g[b].push(y);
  }
  function flow(s: number, t: number) {
    let result = 0;
    for (;;) {
      const level = Array(n).fill(-1),
        q = [s];
      level[s] = 0;
      for (let h = 0; h < q.length; h++)
        for (const e of g[q[h]])
          if (e.c > 0 && level[e.to] < 0) {
            level[e.to] = level[q[h]] + 1;
            q.push(e.to);
          }
      if (level[t] < 0) return { value: result, reachable: new Set(q) };
      const next = Array(n).fill(0);
      function send(v: number, f: number): number {
        if (v === t) return f;
        for (; next[v] < g[v].length; next[v]++) {
          const e = g[v][next[v]];
          if (e.c && level[e.to] === level[v] + 1) {
            const d = send(e.to, Math.min(f, e.c));
            if (d) {
              e.c -= d;
              g[e.to][e.rev].c += d;
              return d;
            }
          }
        }
        return 0;
      }
      let d;
      while ((d = send(s, 1e9))) result += d;
    }
  }
  return { edge, flow };
}
