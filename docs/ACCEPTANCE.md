# Đối chiếu nghiệm thu PoC

| Yêu cầu PRD/TRD | Triển khai | Bằng chứng kiểm tra |
|---|---|---|
| Landing, coach, bốn gói, giao diện Việt | `/`, `/coaches`, `/membership` | Build + kiểm tra ảnh desktop/mobile |
| Một shell, entitlement kế thừa | `membership()`, `inherit()`, layout `/app` | Unit + E2E chuyển cả bốn tier |
| Auth, quay lại checkout | Cookie session, đăng ký, đăng nhập, quên/reset, verify demo | E2E đăng ký → checkout → học |
| Checkout success/failed/cancelled, idempotency | Mock payment transaction | API integration cả ba trạng thái và gửi trùng |
| Thư viện, khóa, tìm/lọc/lưu/tiến độ | Catalog API và giao diện VOD | E2E tìm kiếm, khóa public/member, tải lại tiến độ |
| VOD Drive và sổ lượt | Whitelist URL, AES-GCM, reserved/consumed/released | Unit parser/encryption + integration thiếu quyền, không có tệp, hoàn lượt |
| Không dùng một lượt hai lần | Advisory lock theo user + transaction + idempotency | Hai request đồng thời: một thành công, một 409 |
| Coach trả kết quả, quyền riêng tư | Result video + explicit access grant + notification | E2E coach complete, chặn IDOR, giữ VOD sau hạ gói |
| Đổi gói không tăng lượt sai | Sổ lượt xuyên các subscription trong cùng chu kỳ | Regression nâng gói rồi hoàn reservation cũ |
| Coaching 1-1 | Khung giờ mẫu, giữ credit, đổi/hủy >=24h, tổng kết | Integration đặt/đổi/hủy; dữ liệu mẫu có buổi hoàn thành |
| Academy ứng tuyển và xét duyệt | Enrollment + checklist tuần | E2E chặn member duyệt, admin duyệt, học viên hoàn thành task |
| Admin | Gói/giá, nội dung, hồ sơ coach, hoàn lượt, audit | Chặn role sai; kiểm tra giao diện admin |
| Responsive, keyboard, accessibility | CSS 375/768/1024/1440, focus, labels, reduced-motion | E2E overflow + axe WCAG 2 A/AA mức serious/critical |
| PostgreSQL, Prisma migration | Schema, 2 migration, seed | Migration database mới, typecheck và build |
| Riêng tư và bảo mật tối thiểu | Bcrypt, opaque session hash, CSRF header, CORS, HMAC webhook | Chặn CSRF, webhook giả, IDOR và role sai |

Các chức năng bên ngoài được mô phỏng có ghi rõ ở UI: Drive, email, thanh toán, nội dung video và lịch hẹn. Chi tiết triển khai hạ tầng production (Redis/BullMQ, media signed token thật, webhook provider thật, monitoring/SLO/load test) nằm ngoài bản chạy cục bộ và không được coi là đã kiểm chứng.

## Kết quả xác nhận tại máy phát triển

- 14 unit test và 13 integration/E2E test đạt.
- Lint, TypeScript strict mode và build web/API đạt.
- `npm audit`: 0 cảnh báo.
- 20 route/trạng thái được duyệt trên Chrome, không phát hiện lỗi JavaScript hoặc tràn ngang; ảnh desktop và mobile đã được kiểm tra.
- Cả hai migration cùng seed chạy thành công trên một database PostgreSQL mới, độc lập với dữ liệu demo đang dùng.
- Axe trên dashboard không có lỗi WCAG 2 A/AA mức serious hoặc critical. Đây là kiểm tra tự động trên màn hình đại diện, không phải chứng nhận accessibility toàn bộ sản phẩm.
- Workflow CI đã được chuẩn bị; chưa chạy trên GitHub vì repository chưa được publish.
