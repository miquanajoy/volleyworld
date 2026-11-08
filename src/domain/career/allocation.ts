import { catalog, get, regionTeams } from "../../data/teams";
import type { Region } from "../types";
import { regionOrder } from "../full-season/types";
export function validCareerRoster(ids: string[]): boolean {
  return (
    Array.isArray(ids) &&
    ids.length === 32 &&
    new Set(ids).size === 32 &&
    ids.every((id) => !!get(id)) &&
    regionOrder.every(
      (r) => ids.filter((id) => get(id).region === r).length <= 16,
    )
  );
}
/** Bounded proportional apportionment: 16 places, minimum one where capacity allows.
 * The cap applies to the entire candidate population, not just eventual winners.
 * Fixed pools also cap non-European zones at eight (Americas combined).
 */
export function allocateCareerSlots(
  roster: string[],
  season = 1,
  fixedGroups = false,
): Record<Region, number> {
  if (!validCareerRoster(roster))
    throw Error("League cần 32 đội khác nhau, tối đa 16 đội mỗi khu vực.");
  const rows = regionOrder.map((r, i) => {
    const inside = roster.filter((id) => get(id).region === r).length,
      n = regionTeams(r).length - inside;
    const cap = Math.min(n, 16 - inside, fixedGroups && r !== "CEV" ? 8 : 16);
    return { r, i, n, cap, min: cap > 0 ? 1 : 0 };
  });
  let low = 0,
    high = 16;
  const value = (x: (typeof rows)[number], scale: number) =>
    Math.max(x.min, Math.min(x.cap, scale * x.n));
  const project = (scale: number) => {
    const values = rows.map((x) => value(x, scale));
    if (fixedGroups) {
      const ni = regionOrder.indexOf("NORCECA"),
        si = regionOrder.indexOf("CSV");
      if (values[ni] + values[si] > 8) {
        const n = rows[ni],
          c = rows[si];
        values[ni] = Math.max(
          Math.max(n.min, 8 - c.cap),
          Math.min(Math.min(n.cap, 8 - c.min), (8 * n.n) / (n.n + c.n)),
        );
        values[si] = 8 - values[ni];
      }
    }
    return values;
  };
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (project(mid).reduce((s, v) => s + v, 0) < 16) low = mid;
    else high = mid;
  }
  const values = project((low + high) / 2),
    slots = values.map((v, i) => Math.min(rows[i].cap, Math.floor(v + 1e-9)));
  const ranked = rows
    .map((x, i) => ({ ...x, rem: values[i] - slots[i] }))
    .sort(
      (a, b) =>
        b.rem - a.rem ||
        b.n - a.n ||
        ((a.i + season) % 5) - ((b.i + season) % 5),
    );
  let left = 16 - slots.reduce((a, b) => a + b, 0);
  for (const x of ranked) {
    if (
      left &&
      slots[x.i] < x.cap &&
      !(
        fixedGroups &&
        (x.r === "NORCECA" || x.r === "CSV") &&
        slots[regionOrder.indexOf("NORCECA")] +
          slots[regionOrder.indexOf("CSV")] >=
          8
      )
    ) {
      slots[x.i]++;
      left--;
    }
  }
  if (left !== 0 || slots.some((q, i) => q < rows[i].min || q > rows[i].cap))
    throw Error("Không thể phân đủ 16 suất tuyển chọn.");
  return Object.fromEntries(rows.map((x, i) => [x.r, slots[i]])) as Record<
    Region,
    number
  >;
}
export const outsideCareerTeams = (roster: string[], r: Region) =>
  catalog
    .filter((t) => t.region === r && !roster.includes(t.id))
    .map((t) => t.id);
