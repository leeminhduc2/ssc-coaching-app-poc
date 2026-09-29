# Vận hành bản PoC

## Chạy và kiểm tra sức khỏe

`npm run dev` chạy web 5173 và API 3001. `GET /api/v1/health` kiểm tra tiến trình; `/api/v1/ready` truy vấn PostgreSQL. OpenAPI sinh tại `/api/docs-json`, giao diện Swagger `/api/docs`.

Database Docker: `docker compose -f infra/compose.yaml up -d --wait`. Cụm PostgreSQL native do script tạo nằm riêng trong `.local/pgdata`, chỉ lắng nghe localhost:55432. Không thay cấu hình PostgreSQL khác của máy.

## Seed và dữ liệu demo

`npm run db:seed` có thể chạy lại, không ghi đè thao tác người dùng. Bốn tài khoản demo và fixture được định danh ổn định. Để có dữ liệu hoàn toàn mới, tạo database tên khác, cập nhật `DATABASE_URL`, chạy migration rồi seed; giữ database cũ để tránh mất dữ liệu.

Khóa `FIELD_ENCRYPTION_KEY` cần giữ cùng bản sao lưu. Nếu mất khóa, liên kết VOD đã mã hóa không thể khôi phục. Không log hoặc xuất khóa trong tài liệu/ảnh kiểm thử.

## Migration và rollback

1. Sao lưu database trước khi thay schema (`pg_dump` hoặc snapshot của nhà cung cấp).
2. Chạy `npm ci`, `npm run db:generate`, `npm run db:migrate`.
3. Chạy typecheck, unit, build, E2E và readiness.
4. Nếu application lỗi, quay về artifact ứng dụng trước tương thích schema; không tự chạy migration ngược để xóa dữ liệu.
5. Nếu cần khôi phục dữ liệu, restore vào database mới và kiểm chứng trước khi chuyển kết nối.

Migration thứ hai bổ sung uniqueness cho subscription active/slot coaching, check constraint và trigger bảo vệ vòng kế thừa/cross-use credit. Có thể kiểm tra trên database trống bằng `prisma migrate deploy`.

## Xử lý ngoại lệ

- Drive thiếu quyền: học viên chọn kiểm tra lại. Trong PoC kết quả accessible được mô phỏng rõ ở UI.
- Không còn lượt: kiểm tra yêu cầu đang reserved; học viên có thể hủy trước khi coach nhận. Admin hoàn lượt ngoại lệ cần lý do, có audit.
- Review không xuất hiện: kiểm tra trạng thái completed, `ReviewResult` và `AccessGrant`. Không sửa URL để vượt quyền.
- Thanh toán treo: bản PoC xử lý đồng bộ; gửi lại cùng Idempotency-Key trả kết quả cũ. Không cập nhật payment trực tiếp.
- Không có worker/failed jobs thật trong PoC. Trước tích hợp queue cần bổ sung retry/backoff, outbox, dead-letter và cảnh báo.

## Trước triển khai công khai

Tách database staging/production và secrets, tắt demo login/fixture, thay adapter payment/Drive/email/media, triển khai HTTPS và cookie Secure, xác thực email thật, rate limit dùng kho dùng chung, backup/restore test, monitoring, load test và kiểm thử quyền đầy đủ. Đăng ký/đánh giá dự án với Riot theo chính sách áp dụng. PoC không phải sản phẩm thương mại đã được phê duyệt.
