"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowRight,
  Minus,
  PaperPlaneTilt,
  Plus,
  ShoppingCartSimple,
  Trash,
} from "@phosphor-icons/react";
import { submitQuote } from "@/app/actions";
import { useQuote } from "@/components/quote-provider";
import { initialQuoteFormState } from "@/lib/form-state";
import { MAX_QTY } from "@/lib/quote";
import type { Product } from "@/lib/types";

export function QuoteWorkspace({ products }: { products: Product[] }) {
  const { items, ready, add, updateQty, remove, clear } = useQuote();
  const [state, action, pending] = useActionState(
    submitQuote,
    initialQuoteFormState
  );

  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const detailed = items
    .map((item) => {
      const product = bySlug.get(item.slug);
      return product ? { ...item, product } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const suggested = products
    .filter((product) => !items.some((item) => item.slug === product.slug))
    .slice(0, 4);

  function handleSubmit() {
    try {
      window.sessionStorage.setItem("vk_quote_submitted", "1");
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-soft/70 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <ShoppingCartSimple size={20} className="text-brand" aria-hidden />
              <h2 className="text-[1.15rem]">
                Danh sách sản phẩm cần báo giá
                {ready ? ` (${detailed.length})` : ""}
              </h2>
            </div>
            {ready && detailed.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="text-xs font-bold text-muted transition hover:text-[#c0392b]"
              >
                Xóa tất cả
              </button>
            ) : null}
          </div>

          {!ready ? (
            <div className="p-6 space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-soft" />
              <div className="h-20 animate-pulse rounded-xl bg-soft" />
            </div>
          ) : detailed.length > 0 ? (
            <ul className="divide-y divide-line">
              {detailed.map(({ product, qty }) => (
                <li
                  key={product.slug}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <Link
                      href={`/san-pham/${product.slug}`}
                      className="relative h-18 w-22 shrink-0 overflow-hidden rounded-xl border border-line bg-soft"
                    >
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </Link>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                        {product.categoryLabel}
                      </span>
                      <Link
                        href={`/san-pham/${product.slug}`}
                        className="mt-0.5 block text-[15px] font-bold leading-snug text-ink hover:text-brand"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        Giá báo theo quy cách &amp; số lượng
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="inline-flex items-center rounded-full border border-line bg-white">
                      <button
                        type="button"
                        onClick={() => updateQty(product.slug, qty - 1)}
                        aria-label={`Giảm số lượng ${product.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-soft"
                      >
                        <Minus size={14} weight="bold" aria-hidden />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_QTY}
                        value={qty}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next) && next >= 1) {
                            updateQty(product.slug, next);
                          }
                        }}
                        aria-label={`Số lượng ${product.name}`}
                        className="w-12 border-0 bg-transparent text-center text-sm font-bold text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(product.slug, qty + 1)}
                        aria-label={`Tăng số lượng ${product.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition hover:bg-soft"
                      >
                        <Plus size={14} weight="bold" aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(product.slug)}
                      aria-label={`Xóa ${product.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-[#fdecec] hover:text-[#c0392b]"
                    >
                      <Trash size={17} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center">
              <p className="text-base font-bold text-ink">
                Giỏ yêu cầu báo giá đang trống
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Chọn sản phẩm từ danh mục hoặc thêm nhanh các mặt hàng phổ biến bên dưới.
              </p>
              <Link href="/san-pham" className="btn btn-brand btn-sm mt-5">
                Xem danh mục sản phẩm
                <ArrowRight size={15} weight="bold" aria-hidden />
              </Link>
            </div>
          )}
        </div>

        {suggested.length > 0 ? (
          <div className="card p-6">
            <h3 className="text-base">Thêm nhanh sản phẩm phổ biến</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {suggested.map((product) => (
                <div
                  key={product.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted">{product.categoryLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(product.slug, 1)}
                    className="btn btn-outline btn-sm shrink-0 px-3 py-1.5 text-xs"
                  >
                    <Plus size={13} weight="bold" aria-hidden />
                    Thêm
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="card p-6 sm:p-7 lg:sticky lg:top-24">
        <h2 className="text-[1.25rem]">Thông tin nhận báo giá</h2>
        <p className="mt-1.5 text-sm text-muted">
          Điền thông tin liên hệ và ghi chú quy cách (khổ rộng, độ dày, model máy nếu có).
        </p>

        <form
          action={action}
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
          noValidate
        >
          <input type="hidden" name="items" value={JSON.stringify(items)} />

          {state.errors.items ? (
            <p
              role="alert"
              className="rounded-xl border border-[#f5c6cb] bg-[#fdecec] px-4 py-3 text-xs font-bold text-[#c0392b]"
            >
              {state.errors.items}
            </p>
          ) : null}

          <div>
            <label htmlFor="quote-name" className="label">
              Họ và tên <span className="text-[#c0392b]">*</span>
            </label>
            <input
              id="quote-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              aria-invalid={Boolean(state.errors.name)}
              className="field"
            />
            {state.errors.name ? (
              <p className="mt-1 text-xs font-semibold text-[#c0392b]">
                {state.errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="quote-phone" className="label">
                Số điện thoại / Zalo <span className="text-[#c0392b]">*</span>
              </label>
              <input
                id="quote-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="0932 149 717"
                aria-invalid={Boolean(state.errors.phone)}
                className="field"
              />
              {state.errors.phone ? (
                <p className="mt-1 text-xs font-semibold text-[#c0392b]">
                  {state.errors.phone}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="quote-email" className="label">
                Email
              </label>
              <input
                id="quote-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ten@congty.vn"
                aria-invalid={Boolean(state.errors.email)}
                className="field"
              />
              {state.errors.email ? (
                <p className="mt-1 text-xs font-semibold text-[#c0392b]">
                  {state.errors.email}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="quote-company" className="label">
              Công ty / Xưởng sản xuất
            </label>
            <input
              id="quote-company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="Công ty TNHH..."
              className="field"
            />
          </div>

          <div>
            <label htmlFor="quote-address" className="label">
              Địa chỉ giao hàng
            </label>
            <input
              id="quote-address"
              name="address"
              type="text"
              autoComplete="street-address"
              placeholder="Quận/Huyện, Tỉnh/TP"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="quote-note" className="label">
              Ghi chú quy cách / kích thước máy
            </label>
            <textarea
              id="quote-note"
              name="note"
              rows={4}
              placeholder="Ví dụ: Vải 0.13mm khổ 1m, băng tải ép keo 600x1950mm..."
              className="field resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            <PaperPlaneTilt size={17} weight="fill" aria-hidden />
            {pending ? "Đang gửi yêu cầu..." : "Gửi yêu cầu báo giá"}
          </button>
        </form>
      </div>
    </div>
  );
}
