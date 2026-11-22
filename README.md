# Vina Khang — Website Vật Liệu Teflon Chịu Nhiệt & Hệ Thống Quản Trị CMS

Website giới thiệu sản phẩm công nghiệp, giỏ yêu cầu báo giá, tra cứu tiến độ và hệ thống quản trị CMS + PostgreSQL cho **Công ty TNHH Thương mại Vina Khang**.

## Công nghệ sử dụng
- **Frontend & Backend**: Next.js 16 (App Router, Turbopack, Cache Components, Standalone output), React 19, TypeScript, Tailwind CSS v4.
- **Database**: PostgreSQL 16 (`pg` driver, tự động khởi tạo schema và seed dữ liệu gốc từ `src/data/content.json`). Có fallback lưu JSON nội bộ khi chạy local không cấu hình `DATABASE_URL`.
- **Kiểm thử**: Vitest (unit test) + Playwright (E2E trên Chromium).
- **Triển khai**: Docker & Docker Compose (`postgres:16-alpine` + `node:22-alpine`).

## Chạy nhanh bằng Docker (khuyến nghị cho Demo / Production)

```powershell
# 1. (Tùy chọn) Tạo file .env từ mẫu và đổi mật khẩu quản trị
Copy-Item .env.example .env

# 2. Build và khởi chạy PostgreSQL + Web
docker compose up -d --build --wait

# 3. Kiểm tra sức khỏe hệ thống
curl http://localhost:3000/api/health
# Kỳ vọng: {"mode":"postgres","ok":true}
```

- Website: `http://localhost:3000`
- Quản trị CMS: `http://localhost:3000/quan-tri` (mật khẩu mặc định: `vinakhang` — đổi qua `ADMIN_PASSWORD`)
- PostgreSQL host port mặc định: `5433` (đổi qua `POSTGRES_PORT`)

### Lưu ý khi deploy demo lên VPS / Server
- Nếu deploy qua **HTTP/IP** (chưa có SSL): giữ `COOKIE_SECURE=false` trong `.env`.
- Nếu deploy sau **HTTPS** (Nginx / Caddy / Cloudflare): đặt `COOKIE_SECURE=true`, đổi `ADMIN_PASSWORD` và `ADMIN_SECRET` mạnh.

## Phát triển local & Kiểm thử

```powershell
npm install
npm run dev          # Chạy dev server tại http://localhost:3000
npm test             # Chạy unit test (Vitest)
npm run lint         # Kiểm tra ESLint
npm run build        # Build production + kiểm tra TypeScript
npm run test:e2e     # Chạy E2E test (Playwright Chromium)
```
