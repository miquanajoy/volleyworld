# World Cup Play-in — nhánh thắng–thua

Áp dụng cho Tour career (World Cup 32 đội), gồm cả lịch mùa 8 chặng và 10 chặng. Vòng loại khu vực và League Play-in giữ nguyên luật của chúng.

## Đội tham dự và số vé

`d` là số đội trong top 2 Challenger không nằm trong 16 đội playoff League.

| d   | League chưa có vé | Đại diện khu vực | Tổng đội | Vé từ nhánh thắng | Vé từ nhánh thua | Tổng vé Play-in | Trận BO5 |
| --- | ----------------- | ---------------- | -------- | ----------------- | ---------------- | --------------- | -------- |
| 0   | 16                | 16               | 32       | 8                 | 8                | 16              | 40       |
| 1   | 15                | 16               | 31       | 8                 | 7                | 15              | 39       |
| 2   | 14                | 16               | 30       | 8                 | 6                | 14              | 38       |

16 đội playoff League và top 2 Challenger đã có vé World Cup, không nằm trong nhánh. Không chuyển suất Challenger xuống đội hạng ba.

## Lịch nhánh

Hạt giống theo thứ hạng thế giới. Dùng khung 32 vị trí: 1/2 vị trí trống tạo suất miễn U1 cho hạt giống cao nhất khi có 31/30 đội. Miễn đấu không được ghi thành trận thắng, trận thua hay trận BO5 đã chơi.

1. U1: 16/15/14 trận. Đội thua chuyển xuống L1.
2. L1: 8/7/6 trận; các tuyến gặp vị trí trống được đi tiếp. Đội thua tại L1 có hai trận thua và bị loại.
3. U2: 8 trận. Tám đội thắng nhận vé ngay; đội thua xuống L2, ghép chéo để tránh tái đấu ngay.
4. L2: 8 trận. Với 32 đội, cả tám đội thắng nhận vé. Với 31/30 đội, xếp tám đội thắng theo hạt giống ban đầu: top 6/4 nhận vé; 2/4 đội còn lại vào L3.
5. L3 chỉ có khi `d > 0`: 1/2 trận theo cặp cao–thấp, chốt 1/2 vé cuối.

Đội đã giành vé không thi đấu tiếp. Tất cả 16 đội không có vé phải có đúng hai trận thua. Không bù suất bằng đội đã bị loại. Không tổ chức chung kết hay reset chung kết vì mục tiêu là chốt vé, không chọn nhà vô địch Play-in.

Tổng số trận là `40 - d`: 32 trận thua của 16 đội bị loại cộng 8/7/6 trận thua của các đội nhận vé nhánh thua.

## Lưu dữ liệu và bản cũ

Play-in mới có `double: { seeds, rounds }`; các mảng `draw`, `preliminary`, `final` cũ để rỗng. Bộ kiểm tra dựng lại từng vòng từ kết quả trước để kiểm tra tuyến, đối thủ, lượt miễn và quyền nhận vé. Dữ liệu không thể chứa trận tương lai hoặc đội đã có vé/bị loại quay lại nhánh.

- Mùa mới hoặc mùa chưa bốc thăm Play-in dùng thể thức mới.
- Play-in cũ chưa có kết quả được nâng cấp khi đọc/lập bản lưu.
- Play-in cũ đã có kết quả giữ nguyên các trận và thể thức để bảo toàn lịch sử.
- Bản lưu trước Play-in với tổng trận ước tính cũ vẫn được đọc, sau đó cập nhật tổng trận.

Vé mới được dùng để tính trụ hạng/thăng hạng, chia pot World Cup, giới hạn khu vực và đội hình mùa tiếp theo. Nhập điểm chỉ được phép trong vòng đang diễn ra; khi đã mở vòng sau, kết quả vòng trước bị khóa.

## Kiểm tra

`tests/features/world-cup-double-playin.cjs` chạy 3.000 nhánh hoàn chỉnh cho ba quy mô; kiểm tra số vé/trận, miễn đấu, số mạng, không tái tham dự sau khi chốt vé, nhập/sửa điểm, khóa vòng, giả mạo tuyến/kết quả, hai panel UI, tải lại và bản lưu cũ. `tour-career.cjs` kiểm tra 120 mùa nối tiếp và ba trường hợp trùng suất Challenger với kết quả Challenger hợp lệ; `tour-regional.cjs` kiểm tra lịch mùa 10 chặng và vòng loại khu vực không thay đổi.
