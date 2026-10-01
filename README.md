# SSC Academy — PoC nền tảng coaching hội viên

Ứng dụng tiếng Việt triển khai từ hai tài liệu PRD/TRD trong thư mục gốc. React + Vite, NestJS, Prisma và PostgreSQL; dữ liệu được lưu ở máy chủ. Các tích hợp thanh toán, Google Drive, email và video sử dụng chế độ mô phỏng, không thu tiền thật.

## Mở bản chạy tại máy này

- Giao diện: http://localhost:5173
- API và Swagger: http://localhost:3001/api/docs
- PostgreSQL riêng của dự án: `127.0.0.1:55432`, database `ssc`.

Nếu dịch vụ đã dừng, chạy trong PowerShell tại thư mục dự án:

```powershell
.\scripts\dev.ps1
```

Script chọn Node >= 22 đã cài (nếu Node mặc định quá cũ), khởi động cụm PostgreSQL riêng trong `.local/pgdata`, áp dụng migration và seed. Không thay Node mặc định hay cơ sở dữ liệu khác trên máy. PostgreSQL native chỉ lắng nghe localhost; cấu hình trust này chỉ dành cho demo cục bộ.

## Cài đặt trên máy khác

Cần Node.js >= 22, npm và Docker Desktop hoặc PostgreSQL 17.

```bash
npm ci
node scripts/setup.mjs
docker compose -f infra/compose.yaml up -d --wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`setup.mjs` tạo `.env` với khóa mã hóa ngẫu nhiên; không ghi đè cấu hình hiện có. Nếu sử dụng PostgreSQL khác, chỉnh `DATABASE_URL`. Không đổi `FIELD_ENCRYPTION_KEY` sau khi đã seed nếu chưa có kế hoạch mã hóa lại nguồn VOD.

## Tài khoản trải nghiệm

Chọn tài khoản ở cuối trang chủ hoặc trong sidebar để chuyển ngay giữa các quyền lợi. Chuyển tài khoản giữ nguyên dữ liệu riêng của từng người.

| Email | Quyền |
|---|---|
| `diamond@ssc.demo` | Kim Cương: thư viện, tiến độ, lưu bài |
| `master@ssc.demo` | Cao Thủ: thêm 1 lượt VOD Review |
| `grandmaster@ssc.demo` | Đại Cao Thủ: thêm 1 buổi coaching |
| `challenger@ssc.demo` | Thách Đấu: thêm Academy đã ghi danh |
| `coach-1@ssc.demo` | Coach Hải Đăng |
| `coach-2@ssc.demo` | Coach Minh Khang |
| `admin@ssc.demo` | Quản trị viên |

Mật khẩu chung: `Demo@12345`. Đây là tài khoản giả, tuyệt đối không dùng lại cho sản phẩm thật. Endpoint chuyển tài khoản chỉ bật khi `DEMO_MODE=true`.

## Kịch bản demo

1. Từ trang chủ, chọn gói → đăng ký → checkout. Có ba kịch bản thành công, thất bại, hủy và mã ưu đãi mẫu `SSC10`.
2. Chọn Cao Thủ. Tìm kiếm bài học, lọc chủ đề/coach/phiên bản/trình độ, lưu bài, phát video mẫu và đánh dấu hoàn thành. Tải lại trang để kiểm tra tiến độ.
3. Gửi VOD bằng `https://drive.google.com/file/d/demo-file-123456/view`. Chọn “Coach chưa được cấp quyền” để thử kiểm tra lại; chọn “Không tìm thấy tệp” để thử hoàn lượt. Không cần tệp Drive thật.
4. Chuyển Coach Hải Đăng, cập nhật hồ sơ/ảnh công khai, rồi tiếp nhận → bắt đầu → nhập tổng kết → hoàn thành. Trở lại tài khoản học viên để thấy thông báo và video trong “VOD của tôi”.
5. Chọn Đại Cao Thủ, đặt coaching ở giờ còn trống. Đổi/hủy trước ít nhất 24 giờ. Coach có thể hoàn thành buổi học mẫu để học viên thấy tổng kết.
6. Dùng tài khoản mới để ứng tuyển Academy. Chuyển admin để duyệt; quay lại tài khoản mới để xem kế hoạch tuần và đánh dấu nhiệm vụ.
7. Admin tạo/sửa/vô hiệu hóa/khôi phục tài khoản, reset mật khẩu, chỉnh gói/giá, quản lý nội dung, hoàn lượt có lý do và xem nhật ký vận hành.

Hai VOD cá nhân được seed cho mỗi tài khoản Cao Thủ trở lên. Các tài khoản fixture riêng cung cấp trạng thái chờ quyền, chờ nhận, đã phân công, đang phân tích, đã hủy/từ chối. Có lịch đã hoàn thành và lịch sắp tới. Hồ sơ, thành tích, giá và phiên bản nội dung đều mang tính minh họa; không phải meta TFT hiện tại.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm audit
```

E2E cần API + web đang chạy và Chrome trên máy Windows. Trên CI, Playwright dùng Chromium cài bằng `npx playwright install --with-deps chromium`. Kiểm thử tạo tài khoản `@ssc.test` riêng, không xóa dữ liệu demo. Dùng database kiểm thử riêng khi đưa vào pipeline. Xem ánh xạ yêu cầu tại [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).

Bản kiểm tra tại máy phát triển: 20 unit + 17 integration/E2E đạt; build/lint/typecheck đạt, audit không có cảnh báo. OpenAPI runtime có tại `/api/docs-json`; bản tham chiếu ban đầu nằm ở [docs/openapi.json](docs/openapi.json). Pipeline GitHub Actions được chuẩn bị nhưng chưa chạy từ xa.

## Cấu trúc

```text
apps/web/src/            Giao diện responsive tiếng Việt, TanStack Query, router
apps/api/src/modules/   Auth, catalog, coaching, membership, Academy, admin, health
apps/api/src/service.ts Quy tắc nghiệp vụ, phân quyền, transaction và sổ lượt
apps/api/src/domain.ts  Kế thừa quyền lợi, Drive parser, mã hóa AES-GCM
prisma/                 Mô hình quan hệ, migration và dữ liệu demo
tests/                  Unit, API integration, E2E và kiểm tra accessibility
infra/                  PostgreSQL Docker Compose
docs/                   Nghiệm thu, nguồn tài nguyên, vận hành, API
```

## Ảnh hồ sơ coach trong bản demo

Backend nhận ảnh JPEG, PNG hoặc WebP tối đa 5 MiB khi admin tạo/chuyển tài
khoản coach hoặc khi coach cập nhật hồ sơ. Ảnh được lưu mặc định tại
`.local/uploads/coaches` và phục vụ qua `/api/uploads/coaches/...`. Có thể đặt
`UPLOAD_DIR` để đổi thư mục lưu. Đây là filesystem local cho demo; khi triển
khai nhiều instance hoặc container không có volume cần thay bằng object storage.

Backend luôn kiểm tra session, vai trò, entitlement và quyền sở hữu. Mật khẩu bcrypt, cookie HttpOnly/SameSite, session lưu hash; nguồn Drive mã hóa AES-256-GCM. Mutation yêu cầu header chống CSRF; thao tác tiêu thụ lượt có khóa chống lặp và khóa transaction PostgreSQL. Lượt được tính từ sổ sử dụng của cả chu kỳ, kể cả khi đổi gói. VOD cá nhân giữ explicit access grant sau khi hạ gói.

## Ranh giới PoC

- Video phát là clip minh họa 60 giây do dự án tạo; thời lượng bài học là metadata mẫu. Không cung cấp streaming/DRM thật.
- Drive không gọi Google API; kiểm tra trạng thái được người demo chọn. Không yêu cầu công khai tệp thật.
- Checkout và webhook chỉ có provider mô phỏng. Không nhập/lưu thông tin thẻ. Email xác minh/reset ở mức demo, không gửi email thật.
- Academy có xét duyệt, checklist tuần và mục tiêu mẫu; không có quản lý khóa học nhiều tuần, chat, scrim hay analytics nâng cao.
- NestJS được chia module theo nghiệp vụ, dùng chung application service để giữ transaction gọn. Các bảng danh mục đơn giản (rank, vùng, tag đa trị, provider) được rút gọn thành giá trị nguyên tử trong PoC. Không tuyên bố đã triển khai toàn bộ hạ tầng production trong TRD.
- Chưa triển khai staging/public, backup tự động, worker, SLO tải thật hoặc kết nối dịch vụ thương mại. Runbook nêu các bước cần thực hiện trước khi mở công khai.

## Thiết kế và tài nguyên

Áp dụng workflow UI/UX từ [ui-ux-pro-max của nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): phân cấp thông tin, màu tối, focus bàn phím, tương phản, responsive, reduced motion, trạng thái form và kiểm tra trình duyệt. Màu xanh ngọc và phông Be Vietnam Pro được chọn để phù hợp tiếng Việt; đề xuất của skill được điều chỉnh cho màn hình học tập.

Tài nguyên Riot có ghi nguồn và thông báo không được Riot bảo trợ. Bản PoC chạy cục bộ miễn phí, không phải sản phẩm đã được Riot phê duyệt. [Nguồn tài nguyên và giới hạn sử dụng](docs/ASSETS.md).
