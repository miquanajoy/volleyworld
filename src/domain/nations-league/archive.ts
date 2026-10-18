import type { NationsSeason } from "./types";
import { validNationsSeason, validNationsTransition } from "./validation";
/** Export every branch as a complete independent chain, including offline alternatives.
 * Imports require unambiguous parent links; a concurrent next-cycle conflict must
 * never turn an otherwise valid backup into an unimportable file.
 */
export function nationsExportSeasons(
  seasons: NationsSeason[],
): NationsSeason[] {
  if (
    !seasons.every(validNationsSeason) ||
    new Set(seasons.map((s) => s.seasonId)).size !== seasons.length
  )
    throw Error("Có mùa không hợp lệ; chưa xuất file.");
  const roots = seasons.filter((s) => s.cycleNumber === 1),
    paths: NationsSeason[][] = [],
    visited = new Set<string>();
  function walk(path: NationsSeason[]) {
    const parent = path.at(-1)!;
    visited.add(parent.seasonId);
    const children = seasons.filter(
      (s) => s.previousSeasonId === parent.seasonId,
    );
    for (const child of children) {
      if (!validNationsTransition(parent, child))
        throw Error("Kết quả chuyển hạng không khớp; chưa xuất file.");
      walk([...path, child]);
    }
    if (!children.length) paths.push(path);
  }
  roots.forEach((root) => walk([root]));
  if (visited.size !== seasons.length)
    throw Error("Thiếu mùa trước; cần tải đủ chuỗi mùa để xuất file.");
  const campaigns = new Set<string>();
  return paths.flatMap((path) => {
    const duplicate = campaigns.has(path[0].campaignId);
    campaigns.add(path[0].campaignId);
    if (!duplicate) return path;
    const campaignId = crypto.randomUUID(),
      ids = new Map(path.map((s) => [s.seasonId, crypto.randomUUID()]));
    return path.map((s) => ({
      ...s,
      seasonId: ids.get(s.seasonId)!,
      campaignId,
      previousSeasonId: s.previousSeasonId
        ? ids.get(s.previousSeasonId)!
        : null,
    }));
  });
}
