import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { KEY } from "../../data/local/tournament-storage";
import {
  readHistory,
  writeHistory,
} from "../../data/repositories/history-storage";
import * as V from "../../domain/index";
import type {
  SaveBundle,
  SeasonRecord,
  SeasonTile,
  SeasonTournament,
  Tournament,
} from "../../domain/types";
import { toast } from "../../shared/feedback";
export const seasonsState = {
  scoped: null as string | null,
  records: [] as SeasonRecord[],
  historyError: "",
  busy: false,
};
export const copy = <T>(s: T): T => JSON.parse(JSON.stringify(s));
export const key = () => (getPorts().cloud?.storageKey() || KEY) + "-seasons";
export function scope() {
  const k = key();
  if (k === seasonsState.scoped) return;
  seasonsState.scoped = k;
  seasonsState.historyError = "";
  try {
    const raw = readHistory(localStorage, k);
    seasonsState.records = Array.isArray(raw) ? raw.filter(validRecord) : [];
  } catch {
    seasonsState.records = [];
  }
  store.seasonView = null;
}
export function validRecord(r: SeasonRecord) {
  return (
    !!r &&
    typeof r.season_id === "string" &&
    /^[a-zA-Z0-9-]{1,100}$/.test(r.season_id) &&
    Number.isSafeInteger(r.season_number) &&
    r.season_number > 0 &&
    ["completed", "cancelled"].includes(r.status) &&
    (!r.snapshot ||
      (V.validState(r.snapshot) &&
        r.snapshot.seasonId === r.season_id &&
        r.snapshot.seasonNumber === r.season_number &&
        (r.status !== "completed" || V.complete(r.snapshot))))
  );
}
export function persist() {
  try {
    writeHistory(localStorage, seasonsState.scoped!, seasonsState.records);
    return true;
  } catch {
    seasonsState.historyError =
      "Bộ nhớ thiết bị đã đầy. Hãy xuất tiến độ và đồng bộ online trước khi tạo thêm mùa.";
    toast(seasonsState.historyError);
    return false;
  }
}
export function medals(s: Tournament) {
  return V.podium(s);
}
export function played(s: Tournament) {
  return (
    s.rounds.flat().filter((m) => m.sets).length +
    (s.playin || []).filter((m) => m.sets).length +
    V.matches(s)
      .filter(
        (m) => !s.rounds.flat().includes(m) && !(s.playin || []).includes(m),
      )
      .filter((m) => m.sets).length
  );
}
export function progress(s: Tournament) {
  if (V.complete(s))
    return `Đã hoàn tất · ${played(s)}/${V.totalMatches(s)} trận`;
  if (!V.started(s)) return "Chưa có trận đấu nào";
  if (s.bracket)
    return `Playoff · ${played(s)}/${V.totalMatches(s)} trận toàn giải · ${V.formatName(s)}`;
  if (s.playin)
    return `Play-in · ${s.playin.filter((m) => m.sets).length}/4 trận`;
  return `League · ${s.rounds.flat().filter((m) => m.sets).length}/496 trận · ${s.rounds.filter((r) => r.every((m) => m.sets)).length}/31 vòng`;
}
export function archive(
  s: SeasonTournament,
  status: "completed" | "cancelled",
) {
  scope();
  V.ensureSeason(s);
  if (seasonsState.records.some((r) => r.season_id === s.seasonId))
    return persist();
  seasonsState.records.push({
    season_id: s.seasonId,
    season_number: s.seasonNumber,
    status,
    created_at: s.seasonCreatedAt,
    ended_at: new Date().toISOString(),
    podium: medals(s),
    played: played(s),
    snapshot: copy(s),
    synced: false,
  });
  return persist();
}
export function capture(s: Tournament) {
  scope();
  V.ensureSeason(s);
  if (V.complete(s)) archive(V.ensureSeason(s), "completed");
}
export function pendingFor(s: Tournament) {
  scope();
  return seasonsState.records
    .filter(
      (r) =>
        !r.synced &&
        r.snapshot &&
        (r.season_id !== s.seasonId ||
          (r.status === "completed" && V.complete(s))),
    )
    .slice(0, 10)
    .map(copy);
}
export function ack(batch: SeasonRecord[], expectedScope: string) {
  if (key() !== expectedScope) return;
  scope();
  const ids = new Set(batch.map((r) => r.season_id));
  seasonsState.records.forEach((r) => {
    if (ids.has(r.season_id)) r.synced = true;
  });
  persist();
}
export function mergeRemote(list: SeasonRecord[], expectedScope: string) {
  if (key() !== expectedScope) return;
  scope();
  seasonsState.historyError = "";
  for (const row of list) {
    if (!validRecord(row)) continue;
    const i = seasonsState.records.findIndex(
      (r) => r.season_id === row.season_id,
    );
    if (i < 0) seasonsState.records.push({ ...row, synced: true });
    else if (seasonsState.records[i].synced)
      seasonsState.records[i] = {
        ...row,
        snapshot: seasonsState.records[i].snapshot,
        synced: true,
      };
  }
  persist();
  if (["home", "history", "achievements"].includes(store.tab))
    getPorts().commands.render();
}
export function adopt(list: SeasonRecord[] | null) {
  scope();
  for (const row of list || [])
    if (
      validRecord(row) &&
      row.snapshot &&
      !seasonsState.records.some((r) => r.season_id === row.season_id)
    )
      seasonsState.records.push({ ...copy(row), synced: false });
  persist();
}
export function historyFailed(expectedScope: string) {
  if (key() !== expectedScope) return;
  scope();
  seasonsState.historyError =
    "Chưa tải được lịch sử online. Các mùa trên thiết bị và mùa đang chơi vẫn được giữ.";
  if (["home", "history", "achievements"].includes(store.tab))
    getPorts().commands.render();
}
export function restoreRecords(list: SeasonRecord[]) {
  scope();
  if (!Array.isArray(list) || !list.every(validRecord)) return false;
  seasonsState.records = copy(list);
  return persist();
}
export function acceptRemote() {
  scope();
  seasonsState.records = seasonsState.records.filter((r) => r.synced);
  persist();
}
export function all(): SeasonTile[] {
  scope();
  V.ensureSeason(store.state);
  const active: SeasonTile = {
    season_id: store.state.seasonId,
    season_number: store.state.seasonNumber,
    status: V.complete(store.state)
      ? "completed"
      : V.started(store.state)
        ? "active"
        : "ready",
    created_at: store.state.seasonCreatedAt,
    podium: medals(store.state),
    played: played(store.state),
    snapshot: store.state,
    current: true,
  };
  return [
    ...seasonsState.records.filter((r) => r.season_id !== active.season_id),
    active,
  ].sort((a, b) => a.season_number - b.season_number);
}
export function localRecords() {
  scope();
  return copy(seasonsState.records);
}
export async function exportAll(): Promise<SaveBundle> {
  const active = copy(store.state),
    scopeKey = key(),
    list = localRecords();
  for (const row of list) {
    if (!row.snapshot)
      row.snapshot = await getPorts().cloud?.fetchSeason(row.season_id);
    if (!row.snapshot) throw Error("Cần kết nối mạng để xuất toàn bộ lịch sử.");
  }
  if (scopeKey !== key()) throw Error("Tài khoản đã thay đổi.");
  return { format: "volleyworld-seasons", version: 1, active, history: list };
}
export function importAll(bundle: SaveBundle) {
  if (
    bundle?.format !== "volleyworld-seasons" ||
    !V.validState(bundle.active) ||
    !Array.isArray(bundle.history) ||
    !bundle.history.every((r) => validRecord(r) && r.snapshot)
  )
    throw Error("File lịch sử không hợp lệ.");
  scope();
  seasonsState.records = bundle.history.map((r) => ({
    ...copy(r),
    synced: false,
  }));
  persist();
  return bundle.active;
}
