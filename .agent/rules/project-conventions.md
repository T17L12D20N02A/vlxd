# Quy tắc bắt buộc cho dự án Vina Khang (`vlxd`)

1. **Không bịa giá sản phẩm**: Toàn bộ luồng bán hàng là yêu cầu báo giá theo quy cách/model máy. Không thêm giá tiền giả định.
2. **Next.js 16 Cache Components (`cacheComponents: true`)**:
   - Không dùng `export const dynamic = "force-dynamic"`.
   - Mọi route/component đọc dữ liệu động (`cookies()`, `searchParams`, `params` không pre-render, `dbQuery`, `Date.now()`) phải gọi `await connection()` từ `next/server` và bọc trong `<Suspense>`.
   - Các API route động (như `/api/health`) phải gọi `await connection()` nếu cần kiểm tra trạng thái runtime.
3. **React 19 ESLint (`react-hooks/set-state-in-effect`)**:
   - Không gọi `setState` đồng bộ bên trong `useEffect`.
   - Dùng `useSyncExternalStore` cho `localStorage` (xem `src/components/quote-provider.tsx`), dẫn xuất state từ URL params hoặc state key thay vì sync bằng effect.
4. **PostgreSQL + Fallback an toàn**:
   - Mọi thao tác đọc/ghi dữ liệu phải đi qua `src/lib/cms-store.ts`, `src/lib/requests-store.ts`, `src/lib/contacts-store.ts`.
   - Giữ fallback khi `DATABASE_URL` chưa đặt để `next build` trong Docker (builder stage không có DB) luôn thành công.
   - Luôn gọi `revalidatePath` sau khi thay đổi dữ liệu CMS hoặc trạng thái báo giá.
5. **Icon Phosphor**:
   - Server Components import từ `@phosphor-icons/react/dist/ssr`, Client Components import từ `@phosphor-icons/react`.
   - Dùng `Stack` (không có `Layers` trong bản Phosphor đang cài).
6. **Kiểm chứng trước khi báo xong**:
   - Luôn chạy `npm test`, `npm run lint`, và khi đụng Docker/DB phải xác nhận `/api/health` trả `{"mode":"postgres","ok":true}` cùng `npm run test:e2e`.
