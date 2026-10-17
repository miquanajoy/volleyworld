import {
  switchFullAccount,
  saveFullNow,
  fullCloudPending,
  reloadFullCloud,
} from "../full-season/cloud";
import type { User } from "@supabase/supabase-js";
import { getPorts } from "../../app/ports";
import { store } from "../../app/store";
import { CloudWriter } from "../../data/cloud/write-queue";
import type {
  CloudPhase,
  CloudSaveRow,
  ManualSaveResult,
  StoredBackup,
  WriteAcknowledgement,
} from "../../data/contracts";
import {
  KEY,
  readTournament,
  writeTournament,
} from "../../data/local/tournament-storage";
import { addBackup, readBackups } from "../../data/repositories/backups";
import {
  readCloudSave,
  readHistoryPage,
  readSeasonSnapshot,
  writeCloudSave,
} from "../../data/repositories/cloud-saves";
import * as V from "../../domain/index";
import type { Tournament } from "../../domain/types";
import { toast } from "../../shared/feedback";
import { accountState, cfg, configured, el, text } from "./model";
import { draw } from "./views";
export const storageKey = () =>
  accountState.user ? "volleyworld-user-" + accountState.user!.id : KEY;
export function snapshot() {
  return JSON.parse(JSON.stringify(store.state));
}
export function backup() {
  try {
    addBackup(localStorage, {
      time: new Date().toISOString(),
      account: accountState.user?.id || null,
      state: snapshot(),
      history: getPorts().seasons.localRecords(),
    });
  } catch {}
}
export function apply(s: Tournament) {
  store.seasonView = null;
  store.tab = "home";
  getPorts().settings?.discard();
  if (!V.validState(s)) throw Error("Tiến độ không hợp lệ.");
  store.state = V.ensureSeason(JSON.parse(JSON.stringify(s)));
  store.round = Math.max(
    0,
    store.state.rounds.findIndex((r) => r.some((m) => !m.sets)),
  );
  try {
    writeTournament(localStorage, storageKey(), store.state);
  } catch {}
  getPorts().commands.render();
}
export function status(p: CloudPhase, message = "") {
  accountState.phase = p;
  accountState.detail = typeof message === "string" ? message : "";
  const labels = {
    loading: "Đang kết nối…",
    local: "● Lưu trên thiết bị",
    choose: "⚠ Chọn tiến độ để đồng bộ",
    pending: "● Chờ đồng bộ",
    saving: "● Đang lưu online…",
    saved:
      "☁ Đã lưu online" +
      (accountState.loadedAt
        ? " lúc " + new Date(accountState.loadedAt!).toLocaleTimeString("vi-VN")
        : ""),
    conflict: "⚠ Có tiến độ từ thiết bị khác",
    error: "⚠ Chưa đồng bộ · bản máy đã giữ",
  };
  if (store.tab !== "full-season") text("saved", labels[p] || labels.local);
  text("accountButton", accountState.user ? "☁ Tài khoản" : "☁ Đăng nhập");
  if (el("cloudDialog").open) draw();
}
export function changed(s: Tournament) {
  if (!accountState.user || !accountState.writer) return;
  if (accountState.ready) accountState.writer!.enqueue(s);
  else status(accountState.phase);
}
export async function readRemote(): Promise<CloudSaveRow | null> {
  const { data, error } = await readCloudSave(
    accountState.client!,
    accountState.user!.id,
  );
  if (error) throw error;
  if (data && !V.validState(data.state))
    throw Error("Tiến độ online không hợp lệ.");
  return data;
}
export function makeWriter(base: number) {
  accountState.writer?.close();
  const uid = accountState.user!.id,
    token = accountState.epoch;
  accountState.writer = new CloudWriter(
    async (payload, rev) => {
      const historyScope = storageKey(),
        archives = getPorts().seasons.pendingFor(payload);
      const { data, error } = await writeCloudSave(
        accountState.client!,
        payload,
        rev,
        archives,
      );
      if (error) throw Error(error.message);
      if (!Array.isArray(data) || !data[0])
        throw Error("Máy chủ chưa xác nhận lưu.");
      if (accountState.epoch === token && accountState.user?.id === uid)
        getPorts().seasons.ack(archives, historyScope + "-seasons");
      return data[0];
    },
    (p, result) => {
      if (accountState.epoch !== token || accountState.user?.id !== uid) return;
      if (p === "conflict") {
        accountState.ready = false;
        status("conflict");
        void reviewConflict(token);
      } else if (p === "error") {
        accountState.ready = false;
        status(
          "error",
          "Không thể lưu online. Tiến độ trên thiết bị được giữ nguyên. Bạn có thể thử lại.",
        );
      } else {
        if (p === "saved") {
          accountState.loadedAt = (result as WriteAcknowledgement).updated_at;
          if (getPorts().seasons.pendingFor(store.state).length)
            accountState.writer!.enqueue(snapshot());
        }
        status(p);
      }
    },
  );
  accountState.writer.activate(base);
  accountState.ready = true;
}
export async function reviewConflict(token: number) {
  try {
    const row = await readRemote();
    if (token !== accountState.epoch) return;
    accountState.remote = row;
    status("conflict");
    open();
  } catch {
    if (token === accountState.epoch)
      status("error", "Không thể tải bản online. Hãy thử lại khi có mạng.");
  }
}
export async function acceptOnline() {
  if (!accountState.remote) return;
  if (
    !confirm(
      "Dùng tiến độ online? Bản trên máy sẽ được giữ trong bản sao khôi phục gần nhất.",
    )
  )
    return;
  backup();
  getPorts().seasons.acceptRemote();
  apply(accountState.remote.state);
  void loadHistory();
  accountState.loadedAt = accountState.remote.updated_at;
  makeWriter(accountState.remote.revision);
  status("saved");
  toast("Đã tải tiến độ online");
}
export async function acceptLocal() {
  if (
    !accountState.client ||
    !accountState.user ||
    accountState.phase === "loading"
  )
    return;
  if (
    accountState.remote &&
    !confirm("Đưa tiến độ thiết bị này lên thay bản online đang hiển thị?")
  )
    return;
  backup();
  const rev = accountState.remote?.revision || 0;
  makeWriter(rev);
  accountState.writer!.enqueue(snapshot());
  await accountState.writer!.flush();
}
export async function switchUser(next: User | null) {
  if (next?.id === accountState.user?.id) return;
  accountState.epoch++;
  const token = accountState.epoch;
  accountState.writer?.close();
  accountState.writer = null;
  accountState.ready = false;
  accountState.remote = null;
  accountState.loadedAt = null;
  if (accountState.user) {
    try {
      writeTournament(localStorage, storageKey(), store.state);
    } catch {}
  }
  const guestArchives =
    !accountState.user && next ? getPorts().seasons.localRecords() : null;
  accountState.user = next;
  void switchFullAccount(accountState.client, next?.id || null);
  if (!accountState.user) {
    let guest;
    try {
      guest = readTournament(localStorage, KEY);
    } catch {}
    apply(guest && V.validState(guest) ? guest : V.fresh());
    status("local");
    return;
  }
  let candidate;
  try {
    candidate = readTournament(localStorage, storageKey());
  } catch {}
  if (candidate && V.validState(candidate)) apply(candidate);
  else {
    let guest;
    try {
      guest = readTournament(localStorage, KEY);
    } catch {}
    apply(guest && V.validState(guest) ? guest : V.fresh());
    getPorts().seasons.adopt(guestArchives);
  }
  status("loading");
  void loadHistory();
  try {
    const row = await readRemote();
    if (token !== accountState.epoch) return;
    accountState.remote = row;
    if (row && JSON.stringify(row.state) === JSON.stringify(store.state)) {
      accountState.loadedAt = row.updated_at;
      makeWriter(row.revision);
      status("saved");
    } else {
      status("choose");
      open();
    }
  } catch {
    if (token === accountState.epoch) {
      status(
        "error",
        "Đăng nhập thành công, nhưng chưa tải được tiến độ online. Hãy thử lại.",
      );
      open();
    }
  }
}
export async function retry() {
  if (!accountState.user) return;
  const token = accountState.epoch;
  status("loading");
  void loadHistory();
  try {
    const row = await readRemote();
    if (token !== accountState.epoch) return;
    accountState.remote = row;
    if (row && JSON.stringify(row.state) === JSON.stringify(store.state)) {
      makeWriter(row.revision);
      accountState.loadedAt = row.updated_at;
      status("saved");
    } else {
      accountState.ready = false;
      accountState.writer?.close();
      accountState.writer = null;
      status("choose");
      open();
    }
  } catch {
    if (token === accountState.epoch)
      status("error", "Chưa kết nối được. Tiến độ trên thiết bị vẫn được giữ.");
  }
}
export async function syncNow() {
  if (!accountState.ready) {
    await retry();
    return;
  }
  accountState.writer!.enqueue(snapshot());
  await accountState.writer!.flush();
}
export async function manualSave(): Promise<ManualSaveResult> {
  if (store.tab === "full-season") return saveFullNow();
  if (accountState.manualBusy) return { status: "busy" };
  accountState.manualBusy = true;
  const button = el("saveProgress"),
    token = accountState.epoch;
  if (button) {
    button.disabled = true;
    button.textContent = "Đang lưu…";
  }
  let local = false;
  try {
    local = getPorts().commands.save();
    if (!accountState.user) {
      status("local");
      toast(
        local
          ? "Đã lưu trên thiết bị. Đăng nhập để lưu online."
          : "Chưa lưu được trên thiết bị. Hãy xuất tiến độ để giữ bản sao.",
      );
      return { local, online: false, status: "local" };
    }
    if (!accountState.ready) {
      await retry();
      if (token !== accountState.epoch)
        return { local, online: false, status: "account-changed" };
      if (!accountState.ready) {
        toast(
          accountState.phase === "choose" || accountState.phase === "conflict"
            ? "Đã lưu trên thiết bị. Chọn bản tiến độ trong Tài khoản để lưu online."
            : local
              ? "Chưa đồng bộ online. Tiến độ trên thiết bị được giữ."
              : "Chưa lưu được tiến độ. Hãy xuất file để giữ bản sao.",
        );
        return { local, online: false, status: accountState.phase };
      }
    }
    accountState.writer!.enqueue(snapshot());
    await accountState.writer!.flush();
    if (token !== accountState.epoch)
      return { local, online: false, status: "account-changed" };
    const online =
      accountState.ready &&
      accountState.phase === "saved" &&
      !accountState.writer!.pending;
    toast(
      online
        ? "Đã lưu tiến trình online lúc " +
            new Date(accountState.loadedAt!).toLocaleTimeString("vi-VN")
        : accountState.phase === "conflict"
          ? "Có tiến độ từ thiết bị khác. Chọn bản cần giữ trong Tài khoản."
          : local
            ? "Chưa đồng bộ online. Tiến độ trên thiết bị được giữ."
            : "Chưa lưu được tiến độ. Hãy xuất file để giữ bản sao.",
    );
    return { local, online, status: accountState.phase };
  } catch {
    toast(
      local
        ? "Chưa đồng bộ online. Tiến độ trên thiết bị được giữ."
        : "Chưa lưu được tiến độ. Hãy xuất file để giữ bản sao.",
    );
    return { local, online: false, status: "error" };
  } finally {
    accountState.manualBusy = false;
    if (button) {
      button.disabled = false;
      button.textContent = "Lưu tiến trình";
    }
  }
}
export async function refresh() {
  if (
    !accountState.user ||
    !accountState.ready ||
    accountState.writer?.pending ||
    accountState.writer?.running
  )
    return;
  const token = accountState.epoch;
  try {
    const row = await readRemote();
    if (token !== accountState.epoch || !accountState.ready) return;
    if (row && row.revision !== accountState.writer!.revision) {
      accountState.ready = false;
      accountState.writer!.close();
      accountState.remote = row;
      status("conflict");
      open();
    }
  } catch {
    /* Keep local play available; writes report connectivity failures. */
  }
}
export function open() {
  draw();
  if (!el("cloudDialog").open) el("cloudDialog").showModal();
}
export async function loadHistory() {
  if (!accountState.user) return;
  const token = accountState.epoch,
    historyScope = storageKey() + "-seasons";
  try {
    let rows = [];
    for (let page = 0; ; page++) {
      const { data, error } = await readHistoryPage(
        accountState.client!,
        accountState.user!.id,
        page,
      );
      if (error) throw error;
      if (token !== accountState.epoch) return;
      rows.push(...(data || []));
      if (!data || data.length < 100) break;
    }
    if (token === accountState.epoch)
      getPorts().seasons.mergeRemote(rows, historyScope);
  } catch {
    if (token === accountState.epoch)
      getPorts().seasons.historyFailed(historyScope);
  }
}
export async function fetchSeason(id: string) {
  if (!accountState.user) throw Error("Cần đăng nhập để tải lịch sử.");
  const token = accountState.epoch;
  const { data, error } = await readSeasonSnapshot(
    accountState.client!,
    accountState.user!.id,
    id,
  );
  if (error || token !== accountState.epoch)
    throw Error("Không tải được lịch sử.");
  return data?.snapshot;
}
export async function login(e: SubmitEvent) {
  e.preventDefault();
  let email = el("loginEmail").value.trim(),
    button = (e.currentTarget as HTMLFormElement).querySelector("button")!;
  button.disabled = true;
  text("loginMessage", "Đang gửi liên kết…");
  try {
    const { error } = await accountState.client!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) throw error;
    text(
      "loginMessage",
      "Kiểm tra email (cả thư rác) và mở liên kết đăng nhập. Nếu chưa nhận được, thử lại sau hoặc liên hệ chủ web.",
    );
  } catch {
    text(
      "loginMessage",
      "Chưa gửi được email. Hãy kiểm tra địa chỉ hoặc thử lại sau.",
    );
  } finally {
    button.disabled = false;
  }
}
export async function logout() {
  if (
    accountState.writer?.pending ||
    accountState.phase === "saving" ||
    fullCloudPending()
  ) {
    if (
      !confirm(
        "Một số tiến độ chưa đồng bộ. Bản trên thiết bị sẽ được giữ lại cho lần đăng nhập sau. Vẫn đăng xuất?",
      )
    )
      return;
  }
  accountState.ready = false;
  accountState.writer?.close();
  const { error } = await accountState.client!.auth.signOut({ scope: "local" });
  if (error) {
    status("error", "Chưa đăng xuất được. Hãy thử lại.");
    return;
  }
  await switchUser(null);
  draw();
  toast("Đã đăng xuất. Tiến độ khách được khôi phục.");
}
export function restoreBackup() {
  try {
    const items: StoredBackup[] = readBackups(localStorage),
      b = items.find((x) => x.account === (accountState.user?.id || null));
    if (!b || !V.validState(b.state)) {
      toast("Chưa có bản sao khôi phục cho tài khoản này.");
      return;
    }
    if (
      !confirm(
        "Khôi phục tiến độ trước đó (" +
          new Date(b.time).toLocaleString("vi-VN") +
          ")?",
      )
    )
      return;
    const restored = b.state;
    backup();
    if (b.history) getPorts().seasons.restoreRecords(b.history);
    apply(restored);
    getPorts().commands.save();
    draw();
    toast("Đã khôi phục bản trước");
  } catch {
    toast("Không đọc được bản sao khôi phục.");
  }
}
export async function init(
  factory?: typeof import("@supabase/supabase-js").createClient,
) {
  if (!configured) {
    status("local");
    return;
  }
  try {
    const createClient =
      factory ?? (await import("@supabase/supabase-js")).createClient;
    accountState.client = createClient(cfg.supabaseUrl!, cfg.supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    accountState.client!.auth.onAuthStateChange((_event, session) =>
      setTimeout(() => {
        void switchUser(session?.user || null);
      }, 0),
    );
    const { data, error } = await accountState.client!.auth.getSession();
    if (error) throw error;
    if (data.session) await switchUser(data.session.user);
    else status("local");
  } catch {
    status(
      "error",
      "Không kết nối được dịch vụ đăng nhập. Bạn vẫn chơi trên thiết bị được.",
    );
  }
}
export function initializeAccountEvents() {
  window.addEventListener("online", () => {
    if (accountState.user) {
      void retry();
      void reloadFullCloud();
    }
  });
  window.addEventListener("focus", () => {
    void refresh();
    if (store.tab === "full-season") void reloadFullCloud();
  });
  window.addEventListener("beforeunload", (e) => {
    if (
      accountState.user &&
      (accountState.writer?.pending ||
        accountState.writer?.running ||
        fullCloudPending())
    ) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
