# Loại trực tiếp: 16 suất trực tiếp + Play-in 17–24

Áp dụng khi xác nhận thiết lập một mùa **loại trực tiếp mới**. `playoffEntry: "top16"` phân biệt với các mùa cũ không có trường này. Không đổi Full Season hoặc nhánh thắng–thua.

- League: 32 đội, 31 vòng, 496 trận BO5.
- Top 16 vào thẳng playoff; top 12 được miễn vòng 20 đội.
- Play-in: P1 #17–#24, P2 #18–#23, P3 #19–#22, P4 #20–#21.
- Vòng 20: #13–thắng P4, #14–thắng P3, #15–thắng P2, #16–thắng P1. Giữ vị trí cặp đấu khi có bất ngờ.
- Sau khi cả bốn trận vòng 20 kết thúc, người chơi bốc thăm vòng 16. Seed 1: #1–#4; seed 2: #5–#8; seed 3: #9–#12; seed 4: bốn đội thắng vòng 20.
- Mỗi nhánh đủ bốn seed; S1–S4, S2–S3; đi theo nhánh cố định. Tranh hạng ba trước chung kết trong mô phỏng tự động.
- Tổng 520 trận: 496 league + 4 Play-in + 4 vòng 20 + 16 trận từ vòng 16 (gồm hạng ba).

## Thành tích và điểm

Hạng 1, 2, 3, 4; nhóm #5–#8, #9–#16, #17–#20 (thua vòng 20), #21–#24 (thua Play-in); #25–#32 theo thứ hạng league. Tổng kết hiển thị 24 đội đạt Play-in trở lên.

Giữ nguyên toàn bộ điểm cũ đến hạng 20. Chỉ mùa mới có thêm 10 điểm/đội cho nhóm #21–#24, thấp hơn 20 điểm của nhóm #17–#20; tổng điểm mùa mới 4.210. Các mùa cũ vẫn 4.170; các đội dừng ở league không được điểm.

## Tương thích và kiểm thử

- Giữ version 1, không chuyển đổi mùa đang chơi hoặc lịch sử. Khởi tạo lịch cơ sở `fresh()` vẫn hỗ trợ luật cũ; bước xác nhận thiết lập sản phẩm gắn mã luật mới.
- Validator kiểm tra mã thể thức, cặp Play-in, vòng 20, đội thắng/seed, nhánh và khóa kết quả vòng trước khi bốc thăm vòng 16. Không bốc thăm lại nhánh đã tạo.
- Cuộc đua dùng các ngưỡng 12/16/24 và tách cache theo bộ luật; lịch sử từng vòng vẫn tính tại thời điểm vòng đó hoàn tất.
- Cloud hiện cho phép snapshot version 1 và tối đa 531 trận/lịch sử; 520 trận nằm trong giới hạn, không cần đổi schema/RLS.
- `tests/features/expanded-single.cjs`: 30 mùa trọn vẹn (15.600 trận), bất ngờ Play-in, cặp cố định, seed, dữ liệu sai, nhập điểm, reload, lịch sử, xuất/nhập, 24 đội nhận điểm và tương thích luật cũ.
- Các kiểm thử differential giữ luật cũ để so sánh đúng hợp đồng dữ liệu; luật mới có bộ kiểm thử riêng.

Cloud RPC được kiểm thử bằng snapshot 520 trận và tài khoản tạm trong transaction rollback (`supabase/tests/expanded_single.sql`). Kiểm tra lưu active, lưu lịch sử, đọc lại vòng 20 và xung đột CAS; xác nhận không còn tài khoản thử sau rollback. Tạo fixture SQL bằng `node scripts/build-test.cjs` rồi `node scripts/expanded-single-sql-test.cjs /tmp/expanded-single-contract.sql`.
