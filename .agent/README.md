# Agent Handoff — Vina Khang (`vlxd`)

Tài liệu khởi động nhanh cho các AI agent làm việc tiếp trên dự án này.

## 1. Tổng quan dự án
- **Nghiệp vụ**: Website B2B cho Công ty TNHH Thương mại Vina Khang (vải Teflon, băng keo chịu nhiệt, băng tải máy ép keo, băng tải lưới, dây đai hàn nhiệt).
- **Mô hình bán hàng**: Báo giá theo quy cách & kích thước máy — **không bịa giá bán lẻ**. Luồng chính: Giỏ yêu cầu báo giá → Gửi yêu cầu (`VK-YYMMDD-NNN`) → Tra cứu theo mã/SĐT → Xử lý trạng thái trong Quản trị.
- **Stack**: Next.js `16.4.6` (`cacheComponents: true`, `output: "standalone"`), React `19.3.0`, Tailwind CSS v4, PostgreSQL 16 (`pg`), Vitest, Playwright, Docker Compose.

## 2. Bản đồ thư mục chính
- `src/data/content.json` + `public/images/`: Nội dung gốc tự chứa (11 sản phẩm, 8 bài viết, 8 ứng dụng, 8 vị trí tuyển dụng, 13 ảnh local).
- `src/lib/db.ts`: Singleton `pg.Pool`, tự động tạo 7 bảng PostgreSQL và seed từ `content.json` nếu bảng `cms_products` rỗng.
- `src/lib/cms-store.ts`: Lớp đọc/ghi CMS (Sản phẩm, Ứng dụng, Tin tức, Tuyển dụng, Cài đặt tuyển dụng). Tự động dùng PostgreSQL khi có `DATABASE_URL`, fallback về `content.json` khi build/chưa cấu hình DB.
- `src/lib/requests-store.ts` & `src/lib/contacts-store.ts`: Lưu yêu cầu báo giá & tin nhắn liên hệ (PostgreSQL khi có `DATABASE_URL`, fallback JSON tại `data/`).
- `src/lib/quote.ts`, `src/lib/request.ts`, `src/lib/contact.ts`, `src/lib/catalog.ts`: Logic thuần đã phủ 45 unit test.
- `src/lib/auth.ts`: Xác thực cookie HMAC (`vk_admin`), hỗ trợ `ADMIN_PASSWORD`, `ADMIN_SECRET`, `COOKIE_SECURE`.
- `src/app/actions.ts`: Server Actions (`submitQuote`, `submitContact`, `adminLogin`, `adminLogout`, `changeStatus`).
- `src/app/api/admin/cms/route.ts`: REST API CMS có bảo vệ `isAdmin()`, tự `revalidatePath` sau mỗi thay đổi.
- `src/app/api/health/route.ts`: Healthcheck động (`await connection()`) trả `{"mode":"postgres"|"json","ok":true|false}`.
- `src/components/admin-cms.tsx`: Giao diện CMS quản trị tại `/quan-tri` (sidebar + bảng CRUD + modal chỉnh sửa + xuất/khôi phục JSON).
- `e2e/app.spec.ts` + `playwright.config.ts`: 7 kịch bản E2E xuyên suốt cả storefront, giỏ báo giá, tra cứu, liên hệ, quản trị và CRUD PostgreSQL.
- `Dockerfile` + `docker-compose.yml`: Stack chạy `postgres:16-alpine` (host port `5433`) và `web` (port `3000`).

## 3. Lệnh hay dùng
```powershell
npm test                  # 45 unit tests (Vitest)
npm run lint              # ESLint (React 19 strict hooks)
npm run build             # Next.js 16 standalone + TypeScript check
docker compose up -d --build --wait
npm run test:e2e          # 7 Playwright E2E tests (Chromium)
```
