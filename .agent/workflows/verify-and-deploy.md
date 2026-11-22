# Workflow: Kiểm thử toàn diện & Deploy Demo (Docker + PostgreSQL)

Dùng quy trình này trước khi bàn giao bản demo hoặc sau mỗi đợt chỉnh sửa lớn.

## Bước 1 — Kiểm tra code & unit test
```powershell
npm test
npm run lint
npm run build
```
Đảm bảo 0 lỗi TypeScript, 0 lỗi/cảnh báo ESLint và toàn bộ unit test xanh.

## Bước 2 — Khởi chạy stack Docker (PostgreSQL 16 + Next.js)
```powershell
docker compose up -d --build --wait
docker compose ps
```
Kiểm tra endpoint sức khỏe:
```powershell
curl.exe -s http://localhost:3000/api/health
```
Kết quả bắt buộc: `{"mode":"postgres","ok":true}`.

## Bước 3 — Chạy kiểm thử E2E trên stack Docker
```powershell
npm run test:e2e
```
Toàn bộ 7 test trong `e2e/app.spec.ts` phải xanh, bao gồm luồng tạo sản phẩm trong `/quan-tri` → hiển thị trực tiếp trên `/san-pham` → xóa sạch.

## Bước 4 — Dọn dữ liệu test trước khi demo
```powershell
docker compose exec -T db psql -U vinakhang -d vinakhang -c "DELETE FROM quote_requests WHERE name = 'Nguyễn Test E2E'; DELETE FROM contact_messages WHERE name = 'Trần Liên Hệ';"
```

## Bước 5 — Checklist deploy demo lên server/VPS
- [ ] Tạo `.env` từ `.env.example`.
- [ ] Đổi `ADMIN_PASSWORD`, `ADMIN_SECRET`, `POSTGRES_PASSWORD`.
- [ ] Đặt `COOKIE_SECURE=true` nếu chạy sau HTTPS (hoặc giữ `false` nếu demo qua HTTP/IP).
- [ ] Mở cổng `3000` (hoặc reverse proxy Nginx/Caddy trỏ về `127.0.0.1:3000`).
- [ ] Không mở cổng `5433` ra public internet trên server thật.
