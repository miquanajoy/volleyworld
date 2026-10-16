# Kế hoạch Full Season Mode

Trạng thái: **Chỉ lưu kế hoạch. Chưa triển khai. Chờ người dùng yêu cầu “start”.**

Branch triển khai: `feature/full-season-mode`.

Kế hoạch được chốt trong trao đổi ngày 16–17/10/2026. Branch đã nhận các cập nhật mới nhất từ main, bao gồm trang tổng kết mùa gọn và bảng thành tích cuối mùa. Việc lưu tài liệu này không thay đổi ứng dụng hoặc DB.

## 1. Phạm vi đã chốt

Thêm chế độ chơi Full Season: một mùa gồm năm giải khu vực, sau đó là một giải thế giới. Giữ phong cách giao diện hiện tại. Số đội, suất dự giải và thể thức của chế độ này cố định, người chơi không tùy chỉnh.

Chế độ giải đấu hiện tại tiếp tục được giữ lại. Khi triển khai cần bảo toàn tiến trình, lịch sử và cách tính thành tích của chế độ hiện tại.

## 2. Năm giải khu vực

Toàn bộ 100 đội trong catalog game hiện tại tham dự giải của khu vực mình, bao gồm cả các đội đang nằm trong danh sách dự phòng của chế độ hiện tại. Dùng dữ liệu có sẵn, không tự cập nhật BXH hoặc thêm quốc gia mới.

**Chỉ thi đấu league vòng tròn một lượt. Không có playoff khu vực.** Đây là quyết định thay thế đề xuất playoff khu vực ban đầu.

| Khu vực                 | Mã      | Đội tham dự | Suất giải thế giới |
| ----------------------- | ------- | ----------: | -----------------: |
| Châu Âu                 | CEV     |          39 |              Top 9 |
| Châu Á – Châu Đại Dương | AVC     |          24 |              Top 5 |
| Bắc, Trung Mỹ và Caribe | NORCECA |          18 |              Top 4 |
| Châu Phi                | CAVB    |          13 |              Top 3 |
| Nam Mỹ                  | CSV     |           6 |              Top 3 |
| **Tổng**                |         |     **100** |             **24** |

- Mỗi cặp đội gặp nhau đúng một lần trong khu vực.
- Mọi trận BO5; set 1–4 tới 25, set 5 tới 15, phải hơn hai điểm.
- Khu vực có số đội lẻ có một đội nghỉ mỗi vòng; không tạo trận giả hoặc tính đội nghỉ là thắng.
- Xếp hạng theo quy tắc hiện tại: số trận thắng → hiệu số set → hiệu số điểm → đối đầu → bốc thăm.
- Hiệu số điểm là điểm ghi được trừ điểm để thua.
- Lấy suất dự thế giới trực tiếp từ BXH cuối khu vực; không tổ chức trận tranh suất phụ.

## 3. Giải thế giới

Chỉ xác định đủ 24 đại diện sau khi cả năm giải khu vực hoàn tất.

### Vòng bảng

- 24 đội, sáu bảng A–F, mỗi bảng bốn đội.
- Bốc thăm có chia hạt giống: bốn nhóm, mỗi nhóm sáu đội; mỗi bảng một đội từ mỗi nhóm.
- Trong mỗi bảng thi đấu vòng tròn một lượt, BO5.
- Hai đội đầu mỗi bảng vào playoff: 12 đội.
- Bốn đội hạng ba tốt nhất trong sáu bảng nhận bốn suất còn lại.
- Tổng cộng 16 đội vào playoff.

### Playoff

- Loại trực tiếp BO5: vòng 16 đội → tứ kết → bán kết → chung kết.
- Bốc thăm phân nhánh một lần, sau đó giữ nguyên nhánh; không bốc thăm lại mỗi vòng.
- Có trận tranh hạng ba.

## 4. Mặc định đã đề xuất, dùng làm cơ sở khi bắt đầu

Các mục dưới là đề xuất của trợ lý đã được nhắc lại trong bản tổng hợp; người dùng chưa yêu cầu thay đổi. Phân biệt với các yêu cầu cốt lõi ở trên và trình bày rõ khi triển khai.

- Chia nhóm hạt giống thế giới theo thứ hạng trong catalog game hiện tại. Kết quả league khu vực quyết định suất dự giải; không tự đưa hệ thống điểm tích lũy vào việc chia seed.
- Mỗi bảng tối đa hai đội cùng khu vực. Thuật toán bốc thăm phải tìm được phân bố hợp lệ, không dùng vòng lặp thử ngẫu nhiên vô hạn.
- BXH trong bảng dùng số trận thắng → hiệu số set → hiệu số điểm → đối đầu → bốc thăm.
- So sánh các đội hạng ba giữa các bảng bằng số trận thắng → hiệu số set → hiệu số điểm → bốc thăm; không áp dụng đối đầu giữa các bảng.
- Vòng 16 ưu tiên đội nhất bảng gặp đội hạng ba và tránh tái đấu cùng bảng. Đây mới là định hướng, chưa có bảng ghép cặp hoàn chỉnh; cần định nghĩa thuật toán cho đủ cả 16 đội và kiểm chứng tính khả thi trước khi code UI.
- Kết quả bốc thăm và quyết định phá hòa phải được lưu ổn định, không thay đổi khi render hoặc tải lại.

## 5. Giao diện và tiến trình

- Cho phép chọn chế độ giải đấu hiện tại hoặc Full Season khi tạo mùa.
- Full Season không có bước tùy chỉnh số đội, suất hoặc thể thức.
- Một trang tổng quan mùa chứa tiến trình năm khu vực và giải thế giới.
- Có thể chuyển qua lại giữa năm khu vực để nhập điểm, mô phỏng và xem BXH.
- Giải thế giới chưa bắt đầu khi các khu vực chưa hoàn tất; hiển thị rõ điều kiện mở khóa.
- Giữ các cách thao tác quen thuộc: nhập điểm từng set, mô phỏng trận/vòng, xem kết quả và chi tiết đội.
- Lưu/tiếp tục được toàn bộ mùa, gồm các giải khu vực, đại diện, bốc thăm, vòng bảng và playoff thế giới.
- Xem lại kết quả từng giải trong lịch sử mùa.
- Tận dụng giao diện tổng kết gọn mới: một bộ Top 3, bảng thành tích và các mục chi tiết bấm mở; điều chỉnh nội dung theo quy mô từng giải.

## 6. Các quyết định kỹ thuật cần hoàn thiện khi start

Không xem các mục này là đã được triển khai hoặc đã chốt thiết kế:

1. Mô hình dữ liệu Full Season và cách phân biệt với save giải 32 đội hiện tại; không ép dữ liệu mới vào các giả định cố định 32 đội/31 vòng.
2. Lưu cloud, archive, backup, export/import và tương thích save cũ. Kiểm tra giới hạn/validation DB trước khi đề xuất migration; không sửa DB trong giai đoạn lưu kế hoạch.
3. Ghép cặp vòng 16 đủ 16 đội, phù hợp sáu nhất bảng, sáu nhì bảng và bốn hạng ba; quy định cách xử lý ràng buộc bốc thăm nếu cần.
4. Phân loại thứ hạng cuối giải thế giới: cần bao gồm cả các đội dừng ở vòng bảng, không tái sử dụng nguyên nhóm hạng 17–20 của Play-in cũ.
5. Cách tích hợp thành tích/điểm qua các mùa giữa hai chế độ. Chưa có quyết định gộp bảng điểm hoặc thang điểm Full Season; không tự áp dụng thang 4.170 điểm của chế độ cũ cho giải 24 đội hay giải khu vực.
6. Hành vi sửa kết quả khu vực sau khi đã sinh giải thế giới và sửa vòng bảng sau khi đã sinh playoff, để không tạo suất hoặc nhánh sai.

## 7. Trình tự triển khai dự kiến

1. Đồng bộ main vào branch feature và đọc lại tài liệu này khi người dùng yêu cầu start.
2. Khảo sát các giả định cố định trong engine, lưu trữ và UI; hoàn thiện đặc tả dữ liệu và ghép cặp.
3. Xây dựng lịch league với số đội chẵn/lẻ, BXH khu vực và chọn đúng 24 đại diện.
4. Xây dựng chia seed/bốc thăm sáu bảng, vòng bảng và chọn bốn hạng ba.
5. Xây dựng playoff cố định và trận tranh hạng ba.
6. Tích hợp UI tổng quan mùa, điều hướng từng giải, lưu/tiếp tục và lịch sử.
7. Kiểm thử toàn bộ mùa và hồi quy chế độ cũ; chỉ merge main khi có yêu cầu phù hợp.

## 8. Tiêu chí kiểm thử

- Lịch khu vực: đúng số trận n(n−1)/2, không trùng cặp, không tự gặp, không đấu hai trận cùng vòng; đội nghỉ đúng ở khu vực lẻ.
- Tổng cộng 1.263 trận khu vực: CEV 741, AVC 276, NORCECA 153, CAVB 78, CSV 15.
- Đúng 24 đại diện, không trùng, đúng quota 9/5/4/3/3 và đúng BXH cuối.
- Sáu bảng đủ bốn đội, mỗi nhóm seed một đội/bảng; tối đa hai đội cùng khu vực nếu giữ mặc định này.
- Vòng bảng có 36 trận; sáu đội hạng ba được so sánh công bằng và chỉ chọn bốn đội.
- Playoff có 16 đội và 16 trận tính cả tranh hạng ba; nhánh cố định, đúng vô địch/á quân/hạng ba.
- Một Full Season hoàn tất có 1.315 trận nếu giữ nguyên toàn bộ thể thức trên.
- Kiểm chứng các trường hợp bằng thành tích, BO5 năm set, sửa điểm và tải lại không đổi bốc thăm.
- Kiểm thử lưu/khôi phục ở từng giai đoạn, mất mạng, xung đột nhiều thiết bị, lịch sử bất biến và tách biệt tài khoản.
- Hồi quy giao diện, điểm/thứ hạng và save cũ; chạy typecheck, build và bộ kiểm thử liên quan.

## 9. Điểm dừng hiện tại

Chỉ tạo và commit tài liệu kế hoạch trên `feature/full-season-mode`. Không triển khai chế độ mới, không merge kế hoạch này vào main và không thay đổi dữ liệu người chơi cho tới khi có yêu cầu tiếp theo.
