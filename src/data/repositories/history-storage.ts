import type { SeasonRecord } from "../../domain/types";
export function readHistory(storage: Storage, key: string): unknown {
  try {
    return JSON.parse(storage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
/** Preserve main's five locally cached, acknowledged snapshots and pending writes. */
export function writeHistory(
  storage: Storage,
  key: string,
  records: SeasonRecord[],
): void {
  const recent = records
    .filter((r) => r.snapshot && r.synced)
    .sort((a, b) => b.season_number - a.season_number)
    .slice(0, 5)
    .map((r) => r.season_id);
  storage.setItem(
    key,
    JSON.stringify(
      records.map((r) =>
        r.synced && !recent.includes(r.season_id)
          ? { ...r, snapshot: undefined }
          : r,
      ),
    ),
  );
}
