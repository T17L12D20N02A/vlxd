"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Eye,
  MagnifyingGlass,
  Plus,
  Sparkle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { FeaturedProductsBanner } from "@/components/featured-banner";
import type { CmsProduct } from "@/lib/cms-store";
import {
  BANNER_MAX_PRODUCTS,
  BANNER_MIN_PRODUCTS,
  DEFAULT_PRODUCT_IMAGE,
  type BannerSettings,
} from "@/lib/cms-utils";
import { cn } from "@/lib/format";

const INTERVAL_OPTIONS = [
  { value: 3000, label: "3 giây / sản phẩm" },
  { value: 4000, label: "4 giây / sản phẩm (Mặc định)" },
  { value: 5000, label: "5 giây / sản phẩm" },
  { value: 6500, label: "6.5 giây / sản phẩm" },
  { value: 8000, label: "8 giây / sản phẩm" },
];

export function BannerManagerSection({
  products,
  categories,
  draft,
  isDirty,
  busy,
  onChangeDraft,
  onSave,
}: {
  products: CmsProduct[];
  categories: Array<{ slug: string; label: string }>;
  draft: BannerSettings;
  isDirty: boolean;
  busy: boolean;
  onChangeDraft: (next: BannerSettings) => void;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const bySlug = useMemo(
    () => new Map(products.map((p) => [p.slug, p])),
    [products]
  );

  const selectedProducts = useMemo(
    () =>
      draft.productSlugs
        .map((slug) => bySlug.get(slug))
        .filter((p): p is CmsProduct => Boolean(p)),
    [draft.productSlugs, bySlug]
  );

  const selectedSet = useMemo(
    () => new Set(draft.productSlugs),
    [draft.productSlugs]
  );

  const count = selectedProducts.length;
  const isValidCount =
    count >= BANNER_MIN_PRODUCTS && count <= BANNER_MAX_PRODUCTS;

  const candidateProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.status === "show" &&
        (!catFilter || p.category === catFilter) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.englishName.toLowerCase().includes(q))
    );
  }, [products, query, catFilter]);

  function addProduct(slug: string) {
    if (selectedSet.has(slug) || draft.productSlugs.length >= BANNER_MAX_PRODUCTS) {
      return;
    }
    onChangeDraft({
      ...draft,
      productSlugs: [...draft.productSlugs, slug],
    });
  }

  function removeProduct(slug: string) {
    onChangeDraft({
      ...draft,
      productSlugs: draft.productSlugs.filter((s) => s !== slug),
    });
  }

  function moveProduct(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= draft.productSlugs.length) return;
    const next = [...draft.productSlugs];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChangeDraft({ ...draft, productSlugs: next });
  }

  function fillFromFeatured() {
    const visible = products.filter((p) => p.status === "show");
    const pool = [
      ...visible.filter((p) => p.featured),
      ...visible.filter((p) => !p.featured),
    ];
    const picked = pool.slice(0, 8).map((p) => p.slug);
    onChangeDraft({ ...draft, productSlugs: picked });
  }

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[1.5rem]">Banner sản phẩm nổi bật</h1>
            {isDirty ? (
              <span className="rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-xs font-bold text-[#8a5a00]">
                Chưa lưu thay đổi
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Chọn từ <strong>{BANNER_MIN_PRODUCTS}</strong> đến{" "}
            <strong>{BANNER_MAX_PRODUCTS}</strong> sản phẩm để chạy tự động ở
            khối Banner tiêu điểm và dải trượt trên trang chủ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="btn btn-outline btn-sm"
          >
            <Eye size={15} aria-hidden />
            {showPreview ? "Ẩn xem trước" : "Xem trước Banner"}
          </button>
          <button
            type="button"
            disabled={busy || !isValidCount}
            onClick={onSave}
            className="btn btn-primary btn-sm disabled:opacity-50"
          >
            {busy ? "Đang lưu..." : "Lưu cập nhật Banner"}
          </button>
        </div>
      </div>

      {/* Live Preview Drawer */}
      {showPreview ? (
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Bản xem trước trực tiếp (chưa cần tải lại trang chủ)
          </p>
          <div className="-mx-4">
            <FeaturedProductsBanner
              settings={{
                ...draft,
                enabled: true,
              }}
              products={selectedProducts}
            />
          </div>
        </div>
      ) : null}

      {/* General Banner Settings */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2.5 text-sm font-bold text-ink">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                onChangeDraft({ ...draft, enabled: e.target.checked })
              }
            />
            Hiển thị khối Banner chạy sản phẩm nổi bật ở trang chủ
          </label>

          <button
            type="button"
            onClick={fillFromFeatured}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-[#eaf1fa] px-3 py-1.5 text-xs font-bold text-brand hover:border-brand"
          >
            <Sparkle size={14} weight="fill" aria-hidden />
            Lấy nhanh 8 SP gắn sao Nổi bật
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label htmlFor="banner-title" className="label">
              Tiêu đề nhãn Banner
            </label>
            <input
              id="banner-title"
              value={draft.title}
              onChange={(e) =>
                onChangeDraft({ ...draft, title: e.target.value })
              }
              placeholder="Tâm điểm sản phẩm công nghiệp nổi bật"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="banner-interval" className="label">
              Tốc độ chuyển tự động
            </label>
            <select
              id="banner-interval"
              value={draft.intervalMs}
              onChange={(e) =>
                onChangeDraft({
                  ...draft,
                  intervalMs: Number(e.target.value) || 4000,
                })
              }
              className="field"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Count Validation Banner */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold",
          isValidCount
            ? "border-[#b7e4ce] bg-[#eefaf4] text-[#18794e]"
            : "border-[#f2d194] bg-[#fff9eb] text-[#8a5a00]"
        )}
      >
        <span className="inline-flex items-center gap-2">
          {isValidCount ? (
            <CheckCircle size={18} weight="fill" aria-hidden />
          ) : (
            <WarningCircle size={18} weight="fill" aria-hidden />
          )}
          Đang chọn {count} / {BANNER_MAX_PRODUCTS} sản phẩm trên Banner
        </span>
        <span className="text-xs">
          {count < BANNER_MIN_PRODUCTS
            ? `Cần chọn thêm ít nhất ${BANNER_MIN_PRODUCTS - count} sản phẩm nữa (tối thiểu ${BANNER_MIN_PRODUCTS}).`
            : count >= BANNER_MAX_PRODUCTS
              ? `Đã đạt mức tối đa ${BANNER_MAX_PRODUCTS} sản phẩm.`
              : `Hợp lệ — có thể chọn thêm tối đa ${BANNER_MAX_PRODUCTS - count} sản phẩm.`}
        </span>
      </div>

      {/* Two-Column Picker & Reorder Grid */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Selected Ordered List */}
        <div className="card overflow-hidden">
          <div className="border-b border-line bg-soft/60 px-5 py-3.5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">
              Thứ tự chạy trên Banner ({count}/{BANNER_MAX_PRODUCTS})
            </h2>
          </div>

          {selectedProducts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">
              Chưa có sản phẩm nào. Hãy chọn từ cột bên phải hoặc nhấn &ldquo;Lấy nhanh 8 SP gắn sao Nổi bật&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {selectedProducts.map((p, idx) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-soft/40"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand text-xs font-extrabold text-white">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-soft">
                    <Image
                      src={p.images[0] || DEFAULT_PRODUCT_IMAGE}
                      alt={p.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {p.categoryLabel}
                      {p.status === "hidden" ? " · (Đang ẩn)" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveProduct(idx, -1)}
                      title="Đưa lên trước"
                      aria-label={`Đưa ${p.name} lên trước`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:border-brand hover:text-brand disabled:opacity-35"
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedProducts.length - 1}
                      onClick={() => moveProduct(idx, 1)}
                      title="Đưa xuống sau"
                      aria-label={`Đưa ${p.name} xuống sau`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:border-brand hover:text-brand disabled:opacity-35"
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.slug)}
                      title="Gỡ khỏi Banner"
                      aria-label={`Gỡ ${p.name} khỏi Banner`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                    >
                      <X size={14} weight="bold" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Available Products Catalog Picker */}
        <div className="card overflow-hidden">
          <div className="space-y-2.5 border-b border-line bg-soft/60 p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-ink">
              Chọn sản phẩm đưa lên Banner
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <MagnifyingGlass
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Tìm sản phẩm để thêm vào Banner"
                  placeholder="Tìm tên sản phẩm, PTFE..."
                  className="field py-1.5 pl-8 text-xs"
                />
              </div>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                aria-label="Lọc nhóm sản phẩm cho Banner"
                className="field w-auto py-1.5 text-xs"
              >
                <option value="">Tất cả nhóm</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ul className="max-h-[460px] divide-y divide-line overflow-y-auto">
            {candidateProducts.slice(0, 60).map((p) => {
              const isSelected = selectedSet.has(p.slug);
              const isFull = count >= BANNER_MAX_PRODUCTS;
              return (
                <li
                  key={p.slug}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-soft/40"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line bg-soft">
                    <Image
                      src={p.images[0] || DEFAULT_PRODUCT_IMAGE}
                      alt={p.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">
                      {p.name}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {p.categoryLabel}
                    </p>
                  </div>
                  {isSelected ? (
                    <button
                      type="button"
                      onClick={() => removeProduct(p.slug)}
                      className="shrink-0 rounded-lg border border-brand/30 bg-[#eaf1fa] px-2.5 py-1 text-xs font-bold text-brand hover:border-[#c0392b] hover:bg-[#fde8e6] hover:text-[#c0392b]"
                    >
                      ✓ Đang ở Banner
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isFull}
                      onClick={() => addProduct(p.slug)}
                      title={
                        isFull
                          ? `Đã đủ tối đa ${BANNER_MAX_PRODUCTS} sản phẩm`
                          : "Thêm vào Banner"
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      <Plus size={12} weight="bold" aria-hidden />
                      Đưa lên Banner
                    </button>
                  )}
                </li>
              );
            })}
            {candidateProducts.length === 0 ? (
              <li className="p-6 text-center text-xs text-muted">
                Không tìm thấy sản phẩm hiển thị nào khớp từ khóa.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
