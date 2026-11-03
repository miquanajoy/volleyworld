# VolleyWorld Tour — World Cup 32 và chuỗi mùa

Triển khai trên `feature/world-cup-merit-berths`. Giữ các thành phần UI League, Challenger, vòng loại, nhánh playoff, nhập điểm và tổng kết hiện có. Không merge main hoặc thay đổi DB production.

## Đội hình và lịch mùa

Mùa đầu chọn 32 đội cho cả League và Challenger: CEV 7, AVC 7, NORCECA 7, CAVB 5, CSV 6. Mùa tiếp theo tự lấy đúng 32 đội đã dự World Cup mùa trước; không chọn lại. Trần mỗi khu vực là 16 đội, không áp lại quota mùa đầu.

| Chặng | Nội dung           | Điều kiện hoàn tất                                                |
| ----- | ------------------ | ----------------------------------------------------------------- |
| 1     | League Phase 1     | Vòng 1–10                                                         |
| 2     | Tuyển chọn khu vực | Các đội ngoài League tranh 16 suất World Cup Play-in              |
| 3     | League Phase 2     | Vòng 11–20                                                        |
| 4     | Challenger         | Swiss, playoff, huy chương; hai đội vào chung kết có vé World Cup |
| 5     | League Phase 3     | Vòng 21–31 và bốn trận League Play-in; xác định đủ 16 đội playoff |
| 6     | World Cup Play-in  | Hoàn tất vòng sơ bộ nếu có, rồi các trận quyết định vé            |
| 7     | League Playoff     | Nhánh 16 đội loại trực tiếp, tranh ba trước chung kết             |
| 8     | World Cup          | Tám bảng bốn đội, chỉ nhất/nhì vào playoff 16 đội                 |

Top 12 League vào thẳng playoff. Hạng 13–20 đấu 13–20, 14–19, 15–18, 16–17. Hạt giống bốn nhóm và nhánh cố định giữ nguyên. Đủ 16 đội playoff là có vé World Cup, không cần chờ thắng vòng 16 đội. Không cấp vé cho người dẫn đầu một Phase.

## Phân 16 suất tuyển chọn khu vực

Khóa suất ngay khi tạo mùa. Với mỗi khu vực, `n` là số đội ngoài League; trần suất `c = min(n, 16 − số đội League khu vực)`. Có khả năng nhận suất thì tối thiểu một, hết khả năng thì không suất.

Phân tỷ lệ theo `n`, chặn sàn/trần rồi chia phần dư lớn nhất đến đúng 16. Hòa phần dư: ưu tiên nhiều đội ngoài League, cuối cùng thứ tự khu vực luân phiên theo mùa. Mùa đầu: CEV 7, AVC 4, NORCECA 3, CAVB 2, CSV 0. Cách phân này bảo đảm kể cả mọi ứng viên cùng khu vực đều thắng thì World Cup và League mùa sau vẫn không quá 16 đội khu vực đó; không phát sinh trận xử lý vượt trần.

Không suất thì không tổ chức trận vô nghĩa; nếu số đội bằng số suất thì ghi nhận trực tiếp. Các trường hợp còn lại chia `ceil(n/6)` bảng cân bằng có hạt giống, thường 3–6 đội/bảng. Suất trực tiếp chia đều cho bảng; phần còn lại xác định bằng các nhánh loại trực tiếp một đội thắng mỗi nhánh. Đội không cần qua trận vì nhánh chỉ có một đội được ghi nhận sẵn.

So sánh ứng viên giữa bảng theo thứ hạng bảng, tỷ lệ thắng, hiệu số set/trận, hiệu số điểm/trận rồi thứ hạng thế giới đầu mùa. Không dùng tổng thắng đơn thuần khi các bảng khác số trận.

## Trùng suất Challenger và League

Gọi `d` là số đội top 2 Challenger nằm ngoài League playoff 16 (`0`, `1` hoặc `2`). Không chuyển vé Challenger cho đội hạng ba.

| d   | Đội League phải dự World Cup Play-in | Sơ bộ ngoài League | Trận cuối | Vé từ Play-in | Tổng World Cup   |
| --- | ------------------------------------ | ------------------ | --------- | ------------- | ---------------- |
| 0   | 16                                   | 0                  | 16        | 16            | 16 + 16 = 32     |
| 1   | 15                                   | 1                  | 15        | 15            | 16 + 1 + 15 = 32 |
| 2   | 14                                   | 2                  | 14        | 14            | 16 + 2 + 14 = 32 |

Luôn có 16 đại diện tuyển chọn khu vực. Trong số này, `2d` đội có thứ hạng thế giới thấp nhất đầu mùa đấu `d` trận sơ bộ (cao gặp thấp); còn lại được chờ sẵn. Sau đó bốc thăm các đại diện ngoài League gặp các đội League chưa có vé. Tổng Play-in luôn 16 trận BO5, không có vé miễn phí cho đội League. Hai đội Challenger đã có vé không phải dự Play-in, nên không tồn tại tình huống mất vé do thua Play-in.

## Hạt giống và vòng bảng World Cup

| Pot | Tám đội                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Tám đội thắng vòng 16 đội League playoff                                                                     |
| 2   | Tám đội thua vòng 16 đội League playoff                                                                      |
| 3   | Các đội top 2 Challenger ngoài League playoff, bổ sung đội thắng World Cup Play-in theo BXH thế giới đầu mùa |
| 4   | Tám đội thắng World Cup Play-in còn lại                                                                      |

Mỗi bảng một đội mỗi pot, tối đa hai đội một khu vực. Thuật toán ghép cặp đồ thị bảo đảm tìm được bảng hợp lệ, không phụ thuộc thử bốc thăm may rủi hữu hạn. Chạy đồng thời lượt 1 của cả tám bảng trước lượt 2, rồi lượt 3. Chỉ top 2 vào playoff; không lấy đội hạng ba. Nhánh cố định A1–B2, C1–D2, E1–F2, G1–H2 ở nửa trên, các cặp đảo ngược ở nửa dưới. Tranh ba trước chung kết. World Cup có 64 trận.

## Trụ hạng, thăng hạng và reset

- Đội League có vé World Cup: trụ hạng, gồm vé League playoff, Challenger hoặc World Cup Play-in.
- Đội ngoài League có vé World Cup: thăng hạng.
- Đội League không có vé World Cup: xuống hạng. Số đội thăng và xuống luôn bằng nhau.
- Chỉ mở mùa tiếp theo khi World Cup hoàn tất; đội hình kế thừa chính xác 32 đội dự World Cup. Mùa trước giữ nguyên kết quả và thành tích.
- Muốn chọn đội lại phải reset chuỗi sau xác nhận. Có lựa chọn xuất bản sao trước khi xóa; xuất thất bại thì không xóa. Chỉ xóa tiến trình, lịch sử, thành tích và bản sao của chuỗi được chọn; giữ tài khoản và các chuỗi/mùa cũ khác.

## Lưu trữ và tương thích

Preview này lưu trong trình duyệt, không khởi tạo kết nối Supabase và không ghi DB. Dùng xuất/nhập để chuyển thiết bị. Dữ liệu mới có `rules: career-v1`; lịch sử legacy và merit-v1 vẫn đọc/chơi bằng luật cũ. Các mùa career không vào hàng đợi cloud. Bản build production có Supabase sẽ chặn tạo/nhập/tiếp mùa career cho đến khi có migration server tương ứng; migration merit24 cũ không đại diện cho luật career32.

Số trận thay đổi theo đội hình và các bảng tuyển chọn. Mùa đầu là 833 trận: League 516 + Challenger 82 + tuyển chọn 155 + World Cup Play-in 16 + World Cup 64.

## Kiểm chứng

- Toàn bộ 19.076 phân bố League32 hợp lệ: đủ 16 suất khu vực, đúng sàn và trần.
- 120 mùa theo chuỗi: lịch tám chặng, kế thừa đội hình, số vé/thăng/xuống và trần khu vực.
- Cả ba tình huống trùng vé `d = 0/1/2`, dùng kết quả Challenger thật và kiểm tra nguồn vé/hạt giống.
- Kiểm tra trạng thái giả mạo, lịch sai, trận tương lai, route playoff, pot, chỉ top 2 và thứ tự huy chương.
- UI tạo mùa, mô phỏng, nhập điểm, vé sớm, tổng kết ba giải, thành tích, mùa tiếp theo, reset, xuất/nhập, tải lại và cách ly tài khoản.
- Toàn bộ regression, kiến trúc, định dạng, TypeScript và bản Vite ESM thực tế; CSS baseline cũ giữ nguyên.
