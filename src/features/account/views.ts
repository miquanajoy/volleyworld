import { esc } from "../../shared/dom";
import { accountState, configured, el } from "./model";
import { login } from "./controller";
import { model } from "../tour/model";
export function draw() {
  const target = el("cloudContent");
  if (!configured) {
    target.innerHTML =
      '<p class="cloud-message">Bạn đang chơi trên thiết bị. Có thể xuất file để giữ bản sao mùa giải.</p>';
    return;
  }
  if (!accountState.client) {
    target.innerHTML =
      '<p class="cloud-message">Đang kết nối dịch vụ đăng nhập…</p>';
    return;
  }
  if (!accountState.user) {
    target.innerHTML =
      '<p class="cloud-message">Đăng nhập để lưu và tiếp tục mùa Tour trên các thiết bị khác.</p><form id="loginForm"><label class="cloud-field">Email<input type="email" id="loginEmail" autocomplete="email" placeholder="ban@example.com" required></label><button class="primary" type="submit">Gửi liên kết đăng nhập</button></form><p id="loginMessage" class="cloud-message" role="status"></p>';
    el("loginForm").onsubmit = login;
    return;
  }
  const conflicts = model.records.filter((r) => r.phase === "conflict").length,
    dirty = model.records.filter((r) => r.dirty).length;
  target.innerHTML = `<p class="cloud-message">Đã đăng nhập: <b>${esc(accountState.user.email || "")}</b></p><section class="cloud-choice"><b>VolleyWorld Tour</b><p class="cloud-message">${model.records.length} mùa · ${conflicts ? `${conflicts} mùa cần chọn bản lưu` : dirty ? `${dirty} mùa chờ đồng bộ` : "Các mùa đã đồng bộ"}</p></section>${accountState.detail || model.error ? `<p class="cloud-message cloud-warn">${esc(accountState.detail || model.error)}</p>` : ""}<p class="cloud-message">Mỗi mùa lưu đầy đủ League, Challenger và World Cup. Xung đột được xử lý riêng trong mùa tương ứng.</p><div class="actions"><button class="primary" data-action="Cloud.syncNow" ${accountState.resetPending ? "disabled" : ""}>Lưu tiến trình Tour</button><button data-action="Cloud.retry">Kiểm tra đồng bộ</button><button data-action="Cloud.logout">Đăng xuất</button></div><p class="cloud-message">Nếu mất mạng, tiến trình vẫn được giữ trên thiết bị.</p>`;
}
