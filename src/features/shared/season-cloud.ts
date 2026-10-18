import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  fetchFullSeason,
  writeFullSeason,
} from "../../data/repositories/full-seasons";
import type { AppTab } from "../../app/store";
import { store } from "../../app/store";
import { getPorts } from "../../app/ports";
import { CloudWriter } from "../../data/cloud/write-queue";
import { toast } from "../../shared/feedback";
export interface SeasonIdentity {
  seasonId: string;
  seasonNumber: number;
  createdAt: string;
}
export interface ArchiveRecord<S> {
  season_id: string;
  season_number: number;
  created_at: string;
  status: "active" | "completed";
  played: number;
  podium: string[];
  revision: number;
  updated_at?: string;
  snapshot?: S;
  dirty?: boolean;
  phase?: string;
  remoteRevision?: number;
  remoteSeasonId?: string;
}
interface ArchiveModel<R> {
  scope: string;
  records: R[];
  loadedScope: string;
  token: number;
  selected: string | null;
  section: string;
  error: string;
  loading: boolean;
}
interface CloudConfig<S extends SeasonIdentity, R extends ArchiveRecord<S>> {
  model: ArchiveModel<R>;
  tab: AppTab;
  prefix: string;
  label: string;
  persist: () => boolean;
  readScope: (key: string) => R[];
  recordOf: (s: S, revision?: number) => R;
  selected: () => R | undefined;
  backup: (s: S) => void;
  validRecord: (r: unknown) => r is R;
  validState: (s: unknown) => s is S;
  complete: (s: S) => boolean;
  list: (
    client: SupabaseClient,
    uid: string,
    page: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
  fetch: typeof fetchFullSeason;
  write: (
    client: SupabaseClient,
    state: S,
    revision: number,
  ) => ReturnType<typeof writeFullSeason>;
  sameSlot?: (a: R, b: R) => boolean;
  parentId?: (s: S) => string | null;
}
/** Shared CAS, offline retry and account isolation for multi-season modes. */
export function createSeasonCloud<
  S extends SeasonIdentity,
  R extends ArchiveRecord<S>,
>(config: CloudConfig<S, R>) {
  const {
    model,
    persist: persistFull,
    readScope,
    recordOf,
    selected: selectedFull,
    backup,
    validRecord,
  } = config;
  let client: SupabaseClient | null = null,
    uid: string | null = null,
    ready = false;
  const writers = new Map<string, CloudWriter<S>>();
  const accountWaiters = new Set<() => void>();
  function redraw() {
    if (store.tab === config.tab) getPorts().commands.render();
  }
  function initialize() {
    if (!model.loadedScope) {
      model.records = readScope(model.scope);
      model.loadedScope = model.scope;
    }
  }
  async function switchAccount(
    nextClient: SupabaseClient | null,
    nextUid: string | null,
  ) {
    for (const resolve of accountWaiters) resolve();
    accountWaiters.clear();
    if (model.loadedScope) persistFull();
    for (const w of writers.values()) w.close();
    writers.clear();
    client = nextClient;
    uid = nextUid;
    ready = !uid;
    model.token++;
    model.scope = uid
      ? config.prefix + "-user-" + uid
      : config.prefix + "-guest";
    model.records = readScope(model.scope);
    model.loadedScope = model.scope;
    model.selected = null;
    model.section = "overview";
    model.error = "";
    redraw();
    if (uid) await reload();
  }
  function writerFor(row: R) {
    if (!client || !uid || !ready || row.phase === "conflict") return null;
    const existing = writers.get(row.season_id);
    if (existing && !existing.paused) return existing;
    existing?.close();
    const token = model.token,
      scope = model.scope,
      service = client;
    const writer = new CloudWriter<S>(
      async (state, revision) => {
        const parentId = config.parentId?.(state),
          parent = parentId
            ? model.records.find((r) => r.season_id === parentId)
            : undefined;
        if (parent?.dirty) {
          if (parent.snapshot) writerFor(parent)?.enqueue(parent.snapshot);
          await writers.get(parent.season_id)?.flush();
          if (parent.dirty)
            throw Error(
              "Cần lưu thành công mùa trước trước khi đồng bộ mùa kế tiếp.",
            );
        }
        if (token !== model.token || scope !== model.scope)
          throw Error("ACCOUNT_CHANGED");
        const { data, error } = await config.write(service, state, revision);
        if (error) throw Error(error.message);
        if (!Array.isArray(data) || !data[0])
          throw Error(`Chưa xác nhận lưu ${config.label}.`);
        return data[0];
      },
      (phase, result) => {
        if (token !== model.token || scope !== model.scope) return;
        row.phase = phase;
        if (result && "revision" in result) {
          row.revision = result.revision;
          row.updated_at = result.updated_at;
          if (phase === "saved") row.dirty = false;
          if (
            phase === "saved" &&
            !model.records.some(
              (r) => r.phase === "conflict" || r.phase === "error",
            )
          )
            model.error = "";
          persistFull();
        }
        if (phase === "error")
          model.error = `Chưa lưu ${config.label} online. Bản thiết bị được giữ; hãy thử đồng bộ lại.`;
        if (phase === "conflict")
          model.error = `${config.label} có thay đổi trên thiết bị khác. Chọn bản cần giữ.`;
        redraw();
      },
    );
    writer.activate(row.revision);
    writers.set(row.season_id, writer);
    return writer;
  }
  function queue(row: R) {
    if (row.snapshot) writerFor(row)?.enqueue(row.snapshot);
  }
  async function reload() {
    initialize();
    if (!uid || !client) {
      ready = true;
      return;
    }
    const token = model.token,
      service = client,
      user = uid;
    model.loading = true;
    model.error = "";
    redraw();
    try {
      const remote: R[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await config.list(service, user, page);
        if (error) throw error;
        if (token !== model.token) return;
        const pageRows = data || [];
        if (!pageRows.every(validRecord))
          throw Error(`${config.label} metadata không hợp lệ.`);
        remote.push(...pageRows);
        if (!data || data.length < 100) break;
      }
      let number = Math.max(
        0,
        ...remote.map((r) => r.season_number),
        ...model.records.map((r) => r.season_number),
      );
      for (const row of model.records) {
        const online = remote.find((r) => r.season_id === row.season_id);
        const sameSlot =
          !online &&
          config.sameSlot &&
          remote.find((r) => config.sameSlot!(row, r));
        if (row.dirty && sameSlot) {
          writers.get(row.season_id)?.close();
          writers.delete(row.season_id);
          row.phase = "conflict";
          row.remoteSeasonId = sameSlot.season_id;
          continue;
        }
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
            writers.get(row.season_id)?.close();
            writers.delete(row.season_id);
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
        if (!model.records.some((r) => r.season_id === row.season_id))
          model.records.push({ ...row });
      model.records.sort((a, b) => a.season_number - b.season_number);
      ready = true;
      for (const row of model.records)
        if (row.dirty && row.phase !== "conflict") queue(row);
      persistFull();
    } catch {
      if (token === model.token) {
        model.error = `Chưa tải được ${config.label} online. Tiến trình trên thiết bị vẫn được giữ.`;
        ready = false;
      }
    } finally {
      if (token === model.token) {
        model.loading = false;
        redraw();
      }
    }
  }
  async function load(id: string) {
    const row = model.records.find((r) => r.season_id === id);
    if (!row) return;
    if (row.snapshot) return row.snapshot;
    if (!uid || !client)
      throw Error(`Cần kết nối mạng để tải mùa ${config.label} này.`);
    const token = model.token,
      { data, error } = await config.fetch(client, uid, id);
    if (token !== model.token) return;
    if (error || !data || !config.validState(data.state))
      throw Error(`Không tải được dữ liệu ${config.label} hợp lệ.`);
    if (row.dirty) return row.snapshot;
    Object.assign(row, recordOf(data.state, data.revision), {
      updated_at: data.updated_at,
    });
    persistFull();
    return row.snapshot;
  }
  async function resolve(useRemote: boolean) {
    const row = selectedFull();
    if (!row || !uid || !client) return;
    const token = model.token,
      scope = model.scope,
      { data, error } = await config.fetch(
        client,
        uid,
        row.remoteSeasonId || row.season_id,
      );
    if (token !== model.token || scope !== model.scope) return;
    if (error || !data || !config.validState(data.state)) {
      toast("Chưa tải được bản online để xử lý xung đột.");
      return;
    }
    if (row.snapshot) backup(row.snapshot);
    writers.get(row.season_id)?.close();
    writers.delete(row.season_id);
    if (useRemote) {
      const oldId = row.season_id;
      model.records = model.records.filter(
        (r) => r === row || r.season_id !== data.state.seasonId,
      );
      Object.assign(row, recordOf(data.state, data.revision), {
        dirty: false,
        phase: "saved",
        remoteRevision: undefined,
        remoteSeasonId: undefined,
      });
      if (model.selected === oldId) model.selected = row.season_id;
    } else {
      if (data.state.seasonId !== row.season_id) {
        toast(
          "Chuỗi đã có mùa này trên cloud. Xuất bản thiết bị để giữ, rồi dùng bản online; có thể nhập bản xuất thành chuỗi mới.",
        );
        return;
      }
      if (!row.snapshot) return;
      // Completed seasons are immutable: preserve the local alternative as a new season.
      if (config.complete(data.state)) {
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
      queue(row);
    }
    model.error = "";
    persistFull();
    redraw();
  }
  async function saveInternal() {
    initialize();
    const local = persistFull(),
      token = model.token;
    if (!uid) {
      toast(
        local
          ? `Đã lưu ${config.label} trên thiết bị. Đăng nhập để lưu online.`
          : `Chưa lưu được. Hãy xuất file ${config.label}.`,
      );
      return { local, online: false, status: "local" };
    }
    if (!ready) await reload();
    if (token !== model.token)
      return { local, online: false, status: "account-changed" };
    for (const row of model.records) if (row.dirty) queue(row);
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
    if (token !== model.token)
      return { local, online: false, status: "account-changed" };
    const online = ready && !model.records.some((r) => r.dirty);
    toast(
      online
        ? `Đã lưu ${config.label} online.`
        : `${config.label} chưa đồng bộ hoàn tất. Bản trên thiết bị được giữ.`,
    );
    return { local, online, status: online ? "saved" : "error" };
  }
  function pending() {
    return !!uid && model.records.some((r) => r.dirty);
  }

  let manualBusy = false;
  async function saveNow() {
    if (manualBusy) return { status: "busy" };
    manualBusy = true;
    const button = document.getElementById("saveProgress");
    if (button) {
      (button as HTMLButtonElement).disabled = true;
      button.textContent = "Đang lưu…";
    }
    try {
      return await saveInternal();
    } finally {
      manualBusy = false;
      if (button) {
        (button as HTMLButtonElement).disabled = false;
        button.textContent = "Lưu tiến trình";
      }
    }
  }

  return {
    initialize,
    switchAccount,
    queue,
    reload,
    load,
    resolve,
    saveNow,
    pending,
  };
}
