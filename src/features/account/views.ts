import { store } from "../../app/store";
import type { CloudPhase } from "../../data/contracts";
import type { Tournament } from "../../domain/types";
import { esc } from "../../shared/dom";
import { login } from "./controller";
import { accountState, configured, el } from "./model";
export function summary(s: Tournament) {
  let n = s.rounds.flat().filter((m) => m.sets).length;
  return `${n}/496 trận league${s.bracket ? " · Playoff" : s.playin ? " · Play-in" : ""}`;
}
export function draw() {
  const target = el("cloudContent");
  if (!configured) {
    target.innerHTML =
      '<p class="cloud-message">Lưu online đang được chuẩn bị. Bạn vẫn có thể chơi và lưu tiến độ trên thiết bị, hoặc xuất file để chuyển máy.</p>';
    return;
  }
  if (!accountState.client) {
    target.innerHTML = `<p class="cloud-message">${accountState.phase === "error" ? "Chưa kết nối được dịch vụ đăng nhập. Kiểm tra mạng rồi tải lại trang." : "Đang kết nối dịch vụ đăng nhập…"}</p>`;
    return;
  }
  if (!accountState.user) {
    target.innerHTML = `<p class="cloud-message">Đăng nhập bằng liên kết gửi đến email để lưu cùng một giải trên nhiều thiết bị.</p><form id="loginForm"><label class="cloud-field">Email<input type="email" id="loginEmail" autocomplete="email" placeholder="ban@example.com" required></label><button class="primary" type="submit">Gửi liên kết đăng nhập</button></form><p id="loginMessage" class="cloud-message" role="status"></p>`;
    el("loginForm").onsubmit = login;
    return;
  }
  const choose =
      accountState.phase === "choose" || accountState.phase === "conflict",
    needRetry = accountState.phase === "error";
  target.innerHTML = `<p class="cloud-message">Đã đăng nhập: <b>${esc(accountState.user.email)}</b></p>${choose ? `<p class="cloud-message cloud-warn">${accountState.phase === "conflict" ? "Tiến độ online đã thay đổi trên thiết bị khác." : "Chọn tiến độ để bắt đầu đồng bộ."} Web sẽ không tự ghi đè hai bản.</p><div class="cloud-choice"><b>Bản trên thiết bị này</b><span class="cloud-message">${summary(store.state)}</span><br><button data-action="Cloud.acceptLocal">Dùng bản này & lưu online</button></div>${accountState.remote ? `<div class="cloud-choice"><b>Bản online</b><span class="cloud-message">${summary(accountState.remote.state)}<br>Cập nhật: ${esc(new Date(accountState.remote.updated_at).toLocaleString("vi-VN"))}</span><br><button class="primary" data-action="Cloud.acceptOnline">Tiếp tục từ bản online</button></div>` : '<p class="cloud-message">Tài khoản chưa có tiến độ online. Chọn bản trên thiết bị để lưu lần đầu.</p>'}` : `<p class="cloud-message cloud-state">${esc(accountState.detail || ({ loading: "Đang tải tiến độ…", pending: "Đang chờ lưu tiến độ.", saving: "Đang lưu online…", saved: "Tiến độ đã đồng bộ." } as Partial<Record<CloudPhase, string>>)[accountState.phase] || "Tiến độ trên máy được giữ.")}${accountState.loadedAt ? "<br>Lần lưu online: " + esc(new Date(accountState.loadedAt!).toLocaleString("vi-VN")) : ""}</p><div class="actions"><button class="primary" ${accountState.phase === "loading" ? "disabled" : ""} data-action="Cloud.syncNow">${needRetry ? "Thử kết nối lại" : "Lưu online ngay"}</button><button ${accountState.phase === "loading" ? "disabled" : ""} data-action="Cloud.retry">Kiểm tra bản online</button></div>`}<div class="actions" style="margin-top:20px"><button data-action="Cloud.restoreBackup">Khôi phục bản trước</button><button data-action="Cloud.logout">Đăng xuất</button></div><p class="cloud-message">Nếu mất mạng, tiến độ vẫn lưu trên thiết bị. Khi kết nối lại, bấm lưu online để tiếp tục đồng bộ.</p>`;
}
