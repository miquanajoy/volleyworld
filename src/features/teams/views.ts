import { displayState } from "../../app/selectors";
import * as V from "../../domain/index";
import { $, names } from "../../shared/dom";

export function renderTeams() {
  $("content").innerHTML =
    `<div class="section-head"><div><h2>32 đội tuyển tham dự</h2><p class="sub">Danh sách đang dự giải · bộ BXH tham chiếu 13/10/2026</p></div><span class="badge">${Object.values(V.quotas(V.ids(displayState()))).join(" / ")}</span></div><div class="region-grid">${Object.entries(
      names,
    )
      .map(
        ([r, n]) =>
          `<div class="panel region-card"><span class="badge">${r} · ${V.participants(displayState()).filter((t) => t.region === r).length} SUẤT</span><h3 style="margin-top:12px">${n}</h3>${V.participants(
            displayState(),
          )
            .filter((t) => t.region === r)
            .map(
              (t) =>
                `<div class="team"><span class="flag">${t.flag}</span>${t.name}<small>#${t.rank}</small></div>`,
            )
            .join("")}</div>`,
      )
      .join(
        "",
      )}</div><p class="sub" style="margin-top:20px">Nguồn dữ liệu ban đầu: <a href="https://www.volleyballer.jp/senior_world_ranking_men/" target="_blank" rel="noopener">bảng tổng hợp FIVB của Volleyballer</a>, ngày 13/10/2026. Bộ đội cố định cho mùa giả lập; không tự cập nhật trực tiếp. Nga được giữ theo bộ BXH đã chọn, không mô phỏng điều kiện tham dự thực tế. Sức mạnh mô phỏng dựa trên điểm BXH, có yếu tố ngẫu nhiên; không phải dự đoán chính thức.</p>`;
}
export function renderRules() {
  const rules = [
    [
      "01 / Phân bổ suất",
      "Giải luôn có 32 đội. Mặc định: CEV 14, NORCECA 6, AVC 5, CSV 5, CAVB 2; bạn có thể thay đổi số suất và chọn đội ở nút Tùy chỉnh thể thức ở trang chủ, trước khi mùa giải bắt đầu. Danh sách đội và dự phòng xếp theo BXH khu vực.",
    ],
    [
      "02 / League phase",
      "Vòng tròn một lượt: 31 vòng × 16 trận = 496 trận. Mỗi đội gặp 31 đối thủ đúng một lần. Tất cả trận BO5, thắng 3 set để thắng trận.",
    ],
    [
      "03 / Xếp hạng",
      "Xét số trận thắng giảm dần, số trận thua tăng dần, hiệu số set, hiệu số điểm. Nếu còn bằng nhau: số trận thắng đối đầu giữa các đội cùng nhóm bằng chỉ số; cuối cùng dùng thứ tự bốc thăm cố định từ đầu mùa. Không dùng điểm 3–2–1–0.",
    ],
    [
      "04 / Điểm số",
      "Set 1–4 đến 25, set 5 đến 15, luôn cách biệt ít nhất 2 điểm. Hiệu số set = set thắng − set thua. Hiệu số điểm = điểm ghi − điểm chịu; ghi 140, chịu 120 là +20.",
    ],
    [
      "05 / Play-in",
      "Top 12 vào thẳng playoff. Hạng 13–20 đấu BO5 loại trực tiếp: 13 vs 20, 14 vs 19, 15 vs 18, 16 vs 17. Hạng 21–32 bị loại.",
    ],
    [
      "06 / Seed & bốc thăm",
      "Seed 1: hạng 1–4; seed 2: 5–8; seed 3: 9–12; seed 4: bốn đội thắng vòng Play-in. Mỗi nhánh A–D có đủ bốn seed. Vòng 16 đội: S1 vs S4 và S2 vs S3.",
    ],
    [
      "07 / " + V.formatName(displayState()),
      V.isDouble(displayState())
        ? "Playoff 16 đội theo hai nhánh cố định. Thua lần đầu xuống nhánh thua; thua lần hai bị loại. Đội thắng mỗi nhánh gặp nhau ở chung kết tổng. Nếu đại diện nhánh thua thắng trận đầu, đánh thêm một trận BO5 quyết định. Hạng ba là đội thua chung kết nhánh thua. Vòng Play-in vẫn loại trực tiếp."
        : "Hai đội thắng vòng 16 trong cùng nhánh gặp nhau ở tứ kết. Thắng nhánh A gặp B, C gặp D ở bán kết. Không bốc thăm lại. Hai đội thắng vào chung kết, hai đội thua tranh hạng ba.",
    ],
    [
      "08 / Cách chơi & lưu",
      "Mô phỏng từng trận, từng vòng hoặc toàn bộ league. Có thể nhập điểm từng set thủ công. Kết quả vòng trước bị khóa khi đã tạo vòng tiếp theo để giữ đúng nhánh. Tiến độ tự lưu trên trình duyệt; dùng Xuất / Nhập tiến độ để chuyển thiết bị.",
    ],
  ];
  $("content").innerHTML =
    `<div class="section-head"><h2>Luật giải đấu</h2><span class="badge">CUSTOM WORLD CUP</span></div><div class="rule-grid">${rules.map(([h, p]) => `<div class="panel rule"><h3>${h}</h3><p>${p}</p></div>`).join("")}</div>`;
}
