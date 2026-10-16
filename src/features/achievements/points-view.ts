import { store } from "../../app/store";
import { team } from "../../components/team";
import { placementPoints } from "../../domain/honours/points";
import type { SeasonTile } from "../../domain/types";
import { names } from "../../shared/dom";
import { careerRanking, careerSummary, seasonPoints } from "./rankings";
export const pointNumber = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n);
export function seasonPointHtml(row: SeasonTile, id: string): string {
  const points = seasonPoints(row, id);
  if (points === null)
    return '<span class="sub season-points">Điểm: chưa đủ dữ liệu</span>';
  return `<span class="season-points ${points ? "earned-points" : ""}">+${pointNumber(points)} điểm${row.status === "cancelled" ? " · Mùa đã hủy" : row.status !== "completed" ? " · Chưa chốt mùa" : ""}</span>`;
}
export function careerSummaryHtml(rows: SeasonTile[], id: string): string {
  const summary = careerSummary(rows, id);
  return `<div class="career-summary" aria-label="Điểm tích lũy"><div><small>ĐIỂM QUA CÁC MÙA</small><strong>${summary.missing ? "Chưa đủ dữ liệu" : pointNumber(summary.points)}</strong></div><p class="sub">${summary.missing ? `Đã xác nhận ${pointNumber(summary.points)} điểm · còn ${summary.missing} mùa chưa tải được.` : `${summary.seasons} mùa đạt Play-in trở lên · chỉ cộng mùa đã hoàn tất.`}</p></div>`;
}
export function pointsRulesHtml(): string {
  const single = [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 8],
      [9, 16],
      [17, 20],
    ],
    double = [
      [5, 6],
      [7, 8],
      [9, 12],
      [13, 16],
    ];
  const rows = (list: number[][]) =>
    list
      .map(
        ([from, to]) =>
          `<tr><td>${from === to ? "#" + from : `#${from}–#${to}`}</td><td>${pointNumber(placementPoints({ from, to }))}</td></tr>`,
      )
      .join("");
  return `<details class="panel points-rules"><summary>Thang điểm & cách xếp hạng</summary><div><p>Chỉ những đội có ít nhất một mùa vào Play-in hoặc tiến xa hơn được ghi tên trên BXH. Mỗi mùa đã hoàn tất có cùng trọng số; tổng điểm cộng dồn qua các mùa. Mùa đang chơi, bị hủy hoặc dừng ở league nhận 0 điểm.</p><div class="points-tables"><section><h3>Hạng chung / playoff thường</h3><table><thead><tr><th>HẠNG</th><th>ĐIỂM / MÙA</th></tr></thead><tbody>${rows(single)}</tbody></table></section><section><h3>Nhóm hạng nhánh thắng–thua</h3><table><thead><tr><th>HẠNG</th><th>ĐIỂM / MÙA</th></tr></thead><tbody>${rows(double)}</tbody></table><p class="sub">Top 4 và nhóm 17–20 dùng cùng thang điểm bên cạnh.</p></section></div><p>Điểm gốc giảm theo căn bậc hai của thứ hạng, chuẩn hóa vô địch = 1.000 và hạng 21 = 0. Nhóm bằng hạng lấy trung bình điểm gốc của các vị trí rồi làm tròn đến 10 điểm. Tổng phân bổ mỗi mùa đều là 4.170 điểm ở cả hai thể thức.</p><p>Đồng điểm xét số huy chương vàng, bạc, rồi đồng; vẫn bằng nhau thì đồng hạng.</p></div></details>`;
}
export function rankingHtml(rows: SeasonTile[], loading: boolean): string {
  const ranking = careerRanking(
      rows,
      store.achievementWorldwide ? undefined : store.achievementRegion,
    ),
    scope = store.achievementWorldwide
      ? "Toàn thế giới"
      : names[store.achievementRegion];
  if (!ranking.complete)
    return `<section class="panel ranking-unavailable" role="status"><h3>${loading ? "Đang tổng hợp điểm qua các mùa…" : "Chưa đủ lịch sử để xếp hạng"}</h3><p>Còn ${ranking.missing} mùa cần tải đầy đủ để tính đúng điểm của mọi đội.</p>${loading ? "" : `<button data-action="achievementView" data-arg="ranking">Thử tải lại lịch sử</button>`}</section>`;
  if (!ranking.entries.length)
    return `<section class="panel ranking-unavailable"><h3>Chưa có đội đủ điều kiện ở ${scope}</h3><p class="sub">Hoàn tất một mùa giải để các đội đạt Play-in trở lên được ghi điểm.</p></section>`;
  return `<section class="panel career-ranking"><div class="career-ranking-heading"><h3>BXH điểm · ${scope}</h3><p class="sub">${ranking.seasonCount} mùa hoàn tất · ${ranking.entries.length} đội đủ điều kiện · bấm đội để xem từng mùa</p></div><div class="table-wrap"><table class="career-ranking-table" aria-label="Bảng điểm qua các mùa"><colgroup><col class="career-col-rank"><col class="career-col-team"><col class="career-col-points"><col class="career-col-seasons"><col class="career-col-medal"><col class="career-col-medal"><col class="career-col-medal"></colgroup><thead><tr><th>#</th><th>ĐỘI TUYỂN</th><th>ĐIỂM</th><th title="Số mùa ghi điểm">MÙA</th><th aria-label="Huy chương vàng">🥇</th><th aria-label="Huy chương bạc">🥈</th><th aria-label="Huy chương đồng">🥉</th></tr></thead><tbody>${ranking.entries.map((e) => `<tr data-career-team="${e.id}" class="${store.achievementTeam === e.id ? "selected-career-team" : ""}"><td><span class="career-rank ${e.rank <= 3 ? `career-rank-${e.rank}` : ""}">${e.rank}</span></td><td><button class="career-team-button" data-action="achievementTeam" data-arg="${e.id}">${team(e.id)}<span aria-hidden="true">↗</span></button></td><td class="career-points"><span>${pointNumber(e.points)}</span></td><td>${e.seasons}</td><td>${e.gold}</td><td>${e.silver}</td><td>${e.bronze}</td></tr>`).join("")}</tbody></table></div></section>`;
}
