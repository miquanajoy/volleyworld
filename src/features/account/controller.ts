import type { User } from "@supabase/supabase-js";
import { tourCloud } from "../tour/cloud";
import { applyAccountReset } from "../../data/repositories/account-reset";
import { renderApplication } from "../../app/ports";
import { toast } from "../../shared/feedback";
import { accountState, cfg, configured, el, text } from "./model";
import { draw } from "./views";
import { restore } from "../tour/controller";
type ArchivePort = Pick<
  typeof tourCloud,
  "suspend" | "switchAccount" | "saveNow" | "reload" | "pending"
>;
let activeArchive: ArchivePort = tourCloud;
let restoreActive = restore;
export function registerAccountArchive(
  archive: ArchivePort,
  restoreFn: () => void,
) {
  activeArchive = archive;
  restoreActive = restoreFn;
}
export function status(phase: typeof accountState.phase, detail = "") {
  accountState.phase = phase;
  accountState.detail = detail;
  text(
    "accountButton",
    cfg.previewLocal
      ? "Bản chơi thử"
      : accountState.user
        ? "☁ Tài khoản"
        : "☁ Đăng nhập",
  );
  if (el("cloudDialog").open) draw();
}
export async function switchUser(next: User | null) {
  if (next?.id === accountState.user?.id && !accountState.resetPending) return;
  const token = ++accountState.epoch;
  activeArchive.suspend();
  accountState.user = next;
  accountState.ready = false;
  accountState.resetPending = !!next;
  status("loading");
  renderApplication();
  try {
    if (next && accountState.client)
      await applyAccountReset(accountState.client, next.id);
    if (token !== accountState.epoch) return;
    accountState.resetPending = false;
    await activeArchive.switchAccount(accountState.client, next?.id || null);
    if (token !== accountState.epoch) return;
    accountState.ready = true;
    status(next ? "saved" : "local");
    renderApplication();
  } catch (e) {
    if (token === accountState.epoch) {
      status(
        "error",
        e instanceof Error ? e.message : "Chưa tải được dữ liệu.",
      );
      renderApplication();
    }
  }
}
export function open() {
  draw();
  if (!el("cloudDialog").open) el("cloudDialog").showModal();
}
export async function manualSave() {
  if (accountState.resetPending)
    return { local: false, online: false, status: "account-changed" };
  return activeArchive.saveNow();
}
export async function syncNow() {
  await manualSave();
  draw();
}
export async function retry() {
  if (accountState.resetPending) {
    await switchUser(accountState.user);
    return;
  }
  await activeArchive.reload();
  draw();
}
export function restoreBackup() {
  if (accountState.resetPending) return;
  restoreActive();
}
export async function login(e: Event) {
  e.preventDefault();
  if (!accountState.client) return;
  const input = el("loginEmail") as HTMLInputElement,
    button = (e.target as HTMLFormElement).querySelector("button")!;
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  button.disabled = true;
  text("loginMessage", "Đang gửi liên kết…");
  try {
    const { error } = await accountState.client.auth.signInWithOtp({
      email: input.value.trim(),
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    if (error) throw error;
    text(
      "loginMessage",
      "Đã gửi liên kết đăng nhập. Hãy kiểm tra email và thư rác.",
    );
  } catch {
    text("loginMessage", "Chưa gửi được email. Hãy thử lại.");
  } finally {
    button.disabled = false;
  }
}
export async function logout() {
  if (!accountState.client) return;
  if (
    activeArchive.pending() &&
    !confirm(
      "Một số tiến trình chưa đồng bộ; bản thiết bị sẽ được giữ. Vẫn đăng xuất?",
    )
  )
    return;
  const { error } = await accountState.client.auth.signOut({ scope: "local" });
  if (error) {
    status("error", "Chưa đăng xuất được.");
    return;
  }
  await switchUser(null);
  draw();
  toast("Đã đăng xuất. Tiến trình khách được giữ riêng.");
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
    accountState.client.auth.onAuthStateChange((_event, session) =>
      setTimeout(() => {
        void switchUser(session?.user || null);
      }, 0),
    );
    const { data, error } = await accountState.client.auth.getSession();
    if (error) throw error;
    if (data.session) await switchUser(data.session.user);
    else status("local");
  } catch {
    status(
      "error",
      "Chưa kết nối được đăng nhập. Tiến trình thiết bị vẫn được giữ.",
    );
  }
}
export function initializeAccountEvents() {
  window.addEventListener("online", () => {
    if (accountState.user) void retry();
  });
  window.addEventListener("focus", () => {
    if (accountState.user && !accountState.resetPending)
      void activeArchive.reload();
  });
  window.addEventListener("beforeunload", (e) => {
    if (activeArchive.pending()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}
