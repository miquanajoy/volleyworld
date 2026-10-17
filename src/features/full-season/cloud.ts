import type { SupabaseClient } from "@supabase/supabase-js";
import { store } from "../../app/store";
import { getPorts } from "../../app/ports";
import { CloudWriter } from "../../data/cloud/write-queue";
import {
  fetchFullSeason,
  listFullSeasons,
  writeFullSeason,
} from "../../data/repositories/full-seasons";
import type { FullSeason } from "../../domain/full-season/types";
import { validFullSeason } from "../../domain/full-season/validation";
import { toast } from "../../shared/feedback";
import {
  fullModel,
  persistFull,
  readScope,
  recordOf,
  selectedFull,
  type FullRecord,
  fullBackup,
  validFullRecord,
} from "./model";
let client: SupabaseClient | null = null,
  uid: string | null = null,
  ready = false;
const writers = new Map<string, CloudWriter<FullSeason>>();
const accountWaiters = new Set<() => void>();
function redraw() {
  if (store.tab === "full-season") getPorts().commands.render();
}
export function initializeFullScope() {
  if (!fullModel.loadedScope) {
    fullModel.records = readScope(fullModel.scope);
    fullModel.loadedScope = fullModel.scope;
  }
}
export async function switchFullAccount(
  nextClient: SupabaseClient | null,
  nextUid: string | null,
) {
  for (const resolve of accountWaiters) resolve();
  accountWaiters.clear();
  if (fullModel.loadedScope) persistFull();
  for (const w of writers.values()) w.close();
  writers.clear();
  client = nextClient;
  uid = nextUid;
  ready = !uid;
  fullModel.token++;
  fullModel.scope = uid
    ? "volleyworld-full-user-" + uid
    : "volleyworld-full-guest";
  fullModel.records = readScope(fullModel.scope);
  fullModel.loadedScope = fullModel.scope;
  fullModel.selected = null;
  fullModel.section = "overview";
  fullModel.error = "";
  redraw();
  if (uid) await reloadFullCloud();
}
function writerFor(row: FullRecord) {
  if (!client || !uid || !ready || row.phase === "conflict") return null;
  const existing = writers.get(row.season_id);
  if (existing && !existing.paused) return existing;
  existing?.close();
  const token = fullModel.token,
    scope = fullModel.scope,
    service = client;
  const writer = new CloudWriter<FullSeason>(
    async (state, revision) => {
      const { data, error } = await writeFullSeason(service, state, revision);
      if (error) throw Error(error.message);
      if (!Array.isArray(data) || !data[0])
        throw Error("Chưa xác nhận lưu Full Season.");
      return data[0];
    },
    (phase, result) => {
      if (token !== fullModel.token || scope !== fullModel.scope) return;
      row.phase = phase;
      if (result && "revision" in result) {
        row.revision = result.revision;
        row.updated_at = result.updated_at;
        if (phase === "saved") row.dirty = false;
        if (
          phase === "saved" &&
          !fullModel.records.some(
            (r) => r.phase === "conflict" || r.phase === "error",
          )
        )
          fullModel.error = "";
        persistFull();
      }
      if (phase === "error")
        fullModel.error =
          "Chưa lưu Full Season online. Bản thiết bị được giữ; hãy thử đồng bộ lại.";
      if (phase === "conflict")
        fullModel.error =
          "Full Season có thay đổi trên thiết bị khác. Chọn bản cần giữ.";
      redraw();
    },
  );
  writer.activate(row.revision);
  writers.set(row.season_id, writer);
  return writer;
}
export function queueFull(row: FullRecord) {
  if (row.snapshot) writerFor(row)?.enqueue(row.snapshot);
}
export async function reloadFullCloud() {
  initializeFullScope();
  if (!uid || !client) {
    ready = true;
    return;
  }
  const token = fullModel.token,
    service = client,
    user = uid;
  fullModel.loading = true;
  fullModel.error = "";
  redraw();
  try {
    const remote: FullRecord[] = [];
    for (let page = 0; ; page++) {
      const { data, error } = await listFullSeasons(service, user, page);
      if (error) throw error;
      if (token !== fullModel.token) return;
      if (!(data || []).every(validFullRecord))
        throw Error("Full Season metadata không hợp lệ.");
      remote.push(...(data || []));
      if (!data || data.length < 100) break;
    }
    let number = Math.max(
      0,
      ...remote.map((r) => r.season_number),
      ...fullModel.records.map((r) => r.season_number),
    );
    for (const row of fullModel.records) {
      const online = remote.find((r) => r.season_id === row.season_id);
      if (row.dirty) {
        if (
          !online &&
          row.revision === 0 &&
          remote.some((r) => r.season_number === row.season_number) &&
          row.snapshot
        ) {
          row.snapshot.seasonNumber = ++number;
          row.season_number = number;
        }
        if (online && online.revision !== row.revision) {
          row.phase = "conflict";
          row.remoteRevision = online.revision;
        } else {
          row.phase = "pending";
        }
      } else if (online && online.revision !== row.revision) {
        writers.get(row.season_id)?.close();
        writers.delete(row.season_id);
        Object.assign(row, online, { snapshot: undefined });
      }
    }
    for (const row of remote)
      if (!fullModel.records.some((r) => r.season_id === row.season_id))
        fullModel.records.push({ ...row });
    fullModel.records.sort((a, b) => a.season_number - b.season_number);
    ready = true;
    for (const row of fullModel.records)
      if (row.dirty && row.phase !== "conflict") queueFull(row);
    persistFull();
  } catch {
    if (token === fullModel.token) {
      fullModel.error =
        "Chưa tải được Full Season online. Tiến trình trên thiết bị vẫn được giữ.";
      ready = false;
    }
  } finally {
    if (token === fullModel.token) {
      fullModel.loading = false;
      redraw();
    }
  }
}
export async function loadFullSnapshot(id: string) {
  const row = fullModel.records.find((r) => r.season_id === id);
  if (!row) return;
  if (row.snapshot) return row.snapshot;
  if (!uid || !client)
    throw Error("Cần kết nối mạng để tải mùa Full Season này.");
  const token = fullModel.token,
    { data, error } = await fetchFullSeason(client, uid, id);
  if (token !== fullModel.token) return;
  if (error || !data || !validFullSeason(data.state))
    throw Error("Không tải được dữ liệu Full Season hợp lệ.");
  if (row.dirty) return row.snapshot;
  Object.assign(row, recordOf(data.state, data.revision), {
    updated_at: data.updated_at,
  });
  persistFull();
  return row.snapshot;
}
export async function resolveFullConflict(useRemote: boolean) {
  const row = selectedFull();
  if (!row || !uid || !client) return;
  const token = fullModel.token,
    scope = fullModel.scope,
    { data, error } = await fetchFullSeason(client, uid, row.season_id);
  if (token !== fullModel.token || scope !== fullModel.scope) return;
  if (error || !data || !validFullSeason(data.state)) {
    toast("Chưa tải được bản online để xử lý xung đột.");
    return;
  }
  if (row.snapshot) fullBackup(row.snapshot);
  writers.get(row.season_id)?.close();
  writers.delete(row.season_id);
  if (useRemote) {
    Object.assign(row, recordOf(data.state, data.revision), {
      dirty: false,
      phase: "saved",
      remoteRevision: undefined,
    });
  } else {
    if (!row.snapshot) return;
    // Completed seasons are immutable: preserve the local alternative as a new season.
    if (
      data.state.world?.bracket?.final[0]?.sets &&
      data.state.world?.bracket?.bronze[0]?.sets
    ) {
      toast(
        "Mùa online đã hoàn tất. Hãy xuất bản thiết bị nếu cần giữ kết quả khác.",
      );
      return;
    }
    row.revision = data.revision;
    row.phase = "pending";
    row.remoteRevision = undefined;
    row.dirty = true;
    ready = true;
    queueFull(row);
  }
  fullModel.error = "";
  persistFull();
  redraw();
}
async function saveFullNowInternal() {
  initializeFullScope();
  const local = persistFull(),
    token = fullModel.token;
  if (!uid) {
    toast(
      local
        ? "Đã lưu Full Season trên thiết bị. Đăng nhập để lưu online."
        : "Chưa lưu được. Hãy xuất file Full Season.",
    );
    return { local, online: false, status: "local" };
  }
  if (!ready) await reloadFullCloud();
  if (token !== fullModel.token)
    return { local, online: false, status: "account-changed" };
  for (const row of fullModel.records) if (row.dirty) queueFull(row);
  let onAccountChange: () => void = () => {};
  const accountChange = new Promise<void>((resolve) => {
    onAccountChange = resolve;
    accountWaiters.add(resolve);
  });
  try {
    await Promise.race([
      Promise.all([...writers.values()].map((w) => w.flush())),
      accountChange,
    ]);
  } finally {
    accountWaiters.delete(onAccountChange);
  }
  if (token !== fullModel.token)
    return { local, online: false, status: "account-changed" };
  const online = ready && !fullModel.records.some((r) => r.dirty);
  toast(
    online
      ? "Đã lưu Full Season online."
      : "Full Season chưa đồng bộ hoàn tất. Bản trên thiết bị được giữ.",
  );
  return { local, online, status: online ? "saved" : "error" };
}
export function fullCloudPending() {
  return !!uid && fullModel.records.some((r) => r.dirty);
}

let manualBusy = false;
export async function saveFullNow() {
  if (manualBusy) return { status: "busy" };
  manualBusy = true;
  const button = document.getElementById("saveProgress");
  if (button) {
    (button as HTMLButtonElement).disabled = true;
    button.textContent = "Đang lưu…";
  }
  try {
    return await saveFullNowInternal();
  } finally {
    manualBusy = false;
    if (button) {
      (button as HTMLButtonElement).disabled = false;
      button.textContent = "Lưu tiến trình";
    }
  }
}
