# BXH theo vòng và biến động thứ hạng

## Cách tính

- BXH vòng X chỉ tính kết quả đã nhập của vòng 1–X; loại kết quả ở vòng X+1 trở đi, kể cả khi được nhập trước.
- Dùng nguyên luật xếp hạng của mùa: W/L, hiệu số set, hiệu số điểm, đối đầu và thứ tự bốc thăm đã lưu. Không bốc thăm lại khi xem lịch sử.
- Chênh lệch = thứ hạng ở vòng X−1 − thứ hạng ở vòng X. Dương: ↑ xanh lá; âm: ↓ cam đỏ; bằng 0: = vàng đậm.
- Trước khi vòng 1 có kết quả: chưa hiển thị ký hiệu. Khi vòng 1 có kết quả, so với thứ hạng trước vòng 1. Các vòng sau luôn có ký hiệu, bao gồm dấu = nếu chưa có kết quả mới.
- Vòng dở ghi rõ “Đang đấu · tạm thời”. Không đợi đủ mọi trận mới cập nhật BXH.
- Bộ chọn “Hiện tại” mặc định theo vòng có số thứ tự lớn nhất đã có kết quả; chưa chơi thì vòng 1. Có thể chọn riêng từng vòng, kể cả vòng chưa đấu.

## Giao diện và dữ liệu

Giải 32 đội có bộ chọn vòng trong trang BXH và phần BXH của lịch sử mùa. Phong độ và kết quả trong hộp chi tiết đội dùng cùng mốc vòng; các trận tương lai vẫn có lịch nhưng chưa hiện kết quả. Tìm kiếm không thay đổi thứ hạng toàn bảng hoặc chênh lệch.

Các league khu vực và bảng thế giới Full Season dùng cùng công thức. Khi xem một league, bộ chọn vòng sẵn có điều khiển cả lịch trận và BXH. Đội nghỉ lượt không bị cộng thêm trận.

Tất cả được suy ra từ kết quả đã lưu. Không đổi snapshot của mùa, không thêm cột DB và không cần chuyển đổi mùa cũ. Lựa chọn vòng chỉ là trạng thái giao diện; tải lại trang mặc định về “Hiện tại”. Sửa kết quả cũ sẽ tính lại các BXH chịu ảnh hưởng.

## Kiểm thử

`tests/features/standings-movement.cjs` bao gồm 93 mốc vòng thuộc các luật playoff cũ/mới và nhánh thắng–thua, các trường hợp ↑/↓/= đã biết, vòng 1 trống, vòng dở, vòng tương lai, nhập lệch thứ tự, sửa điểm, reload, bất biến dữ liệu, tìm kiếm, phong độ/chi tiết theo mốc vòng, lịch sử mùa, màu và Full Season có đội nghỉ lượt.

`tests/integration/build.cjs` kiểm tra bộ chọn vòng và ký hiệu trên bundle production thực tế; bộ regression/parity tiếp tục kiểm tra dữ liệu và luật xếp hạng cũ.
