import { displayState } from "../../app/selectors";
import { team } from "../../components/team";
import * as V from "../../domain/index";
import * as Qualification from "../../domain/league/qualification/index";
import type {
  QualificationReport,
  QualificationState,
} from "../../domain/league/qualification/types";

export function qualificationData(s = displayState()) {
  return Qualification?.report(s) || null;
}
export function qualificationBadge(t: Partial<QualificationState> | undefined) {
  if (!t) return "";
  const label = t.direct
      ? "Chắc playoff trực tiếp"
      : t.out
        ? "Đã bị loại"
        : t.playin
          ? "Chắc dự vòng Play-in"
          : t.advance
            ? "Chắc suất Play-in trở lên"
            : t.noDirect
              ? "Hết cơ hội vào thẳng"
              : "Chưa chốt",
    kind = t.direct
      ? "direct"
      : t.out
        ? "out"
        : t.playin || t.advance
          ? "advance"
          : t.noDirect
            ? "no-direct"
            : "pending";
  return label
    ? `<span class="qualification-badge q-${kind}">${label}</span>`
    : "";
}
export function qualificationNews(q: QualificationReport | null) {
  if (!q || !q.rounds.length) return "";
  const messages: [keyof QualificationReport["events"], string][] = [
    ["direct", "Đã chắc suất playoff trực tiếp"],
    ["advance", "Đã chắc suất Play-in trở lên"],
    ["playin", "Đã chắc chắn tham dự vòng Play-in"],
    [
      "noDirect",
      "Đã hết cơ hội vào thẳng playoff; chưa bị xác nhận loại khỏi top 20",
    ],
    ["out", "Đã chính thức bị loại khỏi cuộc đua top 20"],
  ];
  const events = messages.filter(([key]) => q.events[key].length);
  return `<section class="qualification-news panel" aria-label="Thông báo suất đi tiếp"><div class="qualification-heading"><span class="eyebrow">CUỘC ĐUA PLAYOFF</span><span class="badge">SAU VÒNG ${q.lastRound! + 1} · ${q.rounds.length}/31 VÒNG HOÀN TẤT</span></div>${events.length ? events.map(([key, text]) => `<div class="qualification-event q-${key === "playin" ? "advance" : key}"><b>${text}</b><div class="qualification-names">${q.events[key].map((id) => team(id)).join("")}</div></div>`).join("") : '<p class="sub">Chưa có suất mới được xác nhận ở vòng vừa hoàn tất.</p>'}<details class="qualification-explain"><summary>Cách xác định chắc suất</summary><p>Chỉ xét các vòng đã hoàn tất, không tính điểm ở vòng còn dở. Kiểm tra cả lịch đối đầu còn lại, số trận thắng, hiệu số set và hiệu số điểm. Chỉ công bố khi chứng minh được; nếu còn vướng đối đầu hoặc chưa đủ bằng chứng thì giữ trạng thái chưa chốt. Khi league kết thúc, dùng đầy đủ luật xếp hạng của giải.</p><p>Sửa điểm cũ sẽ tính lại các suất. Vùng màu trong BXH thể hiện vị trí hiện tại; huy hiệu thể hiện suất đã chắc chắn.</p></details></section>`;
}
export function qualificationEntries(q: QualificationReport | null) {
  if (!q) return "";
  const groups: [
    "direct" | "playin" | "pending",
    string,
    number | null,
    string,
  ][] = [
    ["direct", "Vào thẳng playoff", 12, "Chờ thứ hạng cuối cùng để chia seed."],
    [
      "playin",
      "Đã ghi danh vòng Play-in",
      8,
      "Chắc nằm trong hạng 13–20. Chờ thứ hạng cuối để ghép cặp.",
    ],
    [
      "pending",
      "Chắc đi tiếp · chờ loại suất",
      null,
      "Đã chắc top 20. Chưa chốt suất trực tiếp hay Play-in.",
    ],
  ];
  return `<div class="qualification-entry-grid">${groups
    .map(([key, title, max, help]) => {
      const ids = V.ids(displayState()).filter((id) =>
        key === "pending"
          ? q.teams[id!].advance && !q.teams[id!].direct && !q.teams[id!].playin
          : q.teams[id!][key],
      );
      return `<section class="panel qualification-entry"><div class="qualification-heading"><h3>${title}</h3><span class="badge">${ids.length}${max ? " / " + max : ""}</span></div><p class="sub">${help}</p><div class="qualification-names">${ids.length ? ids.map((id) => team(id)).join("") : '<span class="sub">Chưa có đội được xác nhận.</span>'}</div></section>`;
    })
    .join("")}</div>`;
}
