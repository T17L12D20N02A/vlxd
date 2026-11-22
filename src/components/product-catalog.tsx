"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { ProductCard } from "@/components/product-card";
import { filterProducts, type ProductQuery } from "@/lib/catalog";
import type { Category, Product } from "@/lib/types";

type ProductCatalogProps = {
  products: Product[];
  categories: Category[];
};

export function ProductCatalog({ products, categories }: ProductCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("danh-muc") ?? "";
  const q = searchParams.get("q") ?? "";
  const sort: NonNullable<ProductQuery["sort"]> =
    searchParams.get("sap-xep") === "ten" ? "ten" : "mac-dinh";

  function updateUrl(next: { category?: string; q?: string; sort?: string }) {
    const params = new URLSearchParams();
    if (next.category) params.set("danh-muc", next.category);
    if (next.q?.trim()) params.set("q", next.q.trim());
    if (next.sort === "ten") params.set("sap-xep", "ten");
    const qs = params.toString();
    router.replace(qs ? `/san-pham?${qs}` : "/san-pham", { scroll: false });
  }

  function handleCategory(nextCategory: string) {
    updateUrl({ category: nextCategory, q, sort });
  }

  function handleSort(nextSort: NonNullable<ProductQuery["sort"]>) {
    updateUrl({ category, q, sort: nextSort });
  }

  function handleClear() {
    router.replace("/san-pham", { scroll: false });
  }

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        category: category || undefined,
        q: q || undefined,
        sort,
      }),
    [products, category, q, sort]
  );

  const hasFilters = Boolean(category || q.trim() || sort !== "mac-dinh");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-soft/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={q}
              onChange={(event) => {
                updateUrl({ category, q: event.target.value, sort });
              }}
              placeholder="Tìm tên sản phẩm, quy cách, PTFE..."
              aria-label="Tìm kiếm sản phẩm"
              className="field pl-10 pr-9"
            />
            {q ? (
              <button
                type="button"
                onClick={() => updateUrl({ category, q: "", sort })}
                aria-label="Xóa từ khóa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:bg-soft hover:text-ink"
              >
                <X size={15} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="catalog-sort" className="text-xs font-bold uppercase tracking-wider text-muted">
              Sắp xếp
            </label>
            <select
              id="catalog-sort"
              value={sort}
              onChange={(event) =>
                handleSort(event.target.value === "ten" ? "ten" : "mac-dinh")
              }
              className="field w-auto py-2 pr-8 text-sm"
            >
              <option value="mac-dinh">Mặc định</option>
              <option value="ten">Tên A → Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo danh mục">
          <button
            type="button"
            onClick={() => handleCategory("")}
            data-active={category === "" ? "true" : undefined}
            className="chip"
          >
            Tất cả
            <span className="text-xs opacity-75">({products.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => handleCategory(cat.slug)}
              data-active={category === cat.slug ? "true" : undefined}
              className="chip"
            >
              {cat.label}
              <span className="text-xs opacity-75">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p>
          Hiển thị <strong className="font-bold text-ink">{filtered.length}</strong> /{" "}
          {products.length} sản phẩm
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={handleClear}
            className="font-semibold text-brand hover:underline"
          >
            Xóa bộ lọc
          </button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-base font-bold text-ink">
            Không tìm thấy sản phẩm phù hợp.
          </p>
          <p className="mt-2 text-sm text-muted">
            Thử đổi từ khóa khác hoặc xem toàn bộ danh mục vật tư Teflon của Vina Khang.
          </p>
          <button type="button" onClick={handleClear} className="btn btn-brand btn-sm mt-5">
            Xem tất cả sản phẩm
          </button>
        </div>
      )}
    </div>
  );
}
