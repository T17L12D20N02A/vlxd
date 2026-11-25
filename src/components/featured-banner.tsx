"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Sparkle,
} from "@phosphor-icons/react";
import { DEFAULT_PRODUCT_IMAGE, type BannerSettings } from "@/lib/cms-utils";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/types";

export function FeaturedProductsBanner({
  settings,
  products,
}: {
  settings: BannerSettings;
  products: Product[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = products.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const current = products[safeIndex];

  useEffect(() => {
    if (!settings.enabled || count <= 1 || paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, settings.intervalMs || 4000);
    return () => window.clearInterval(timer);
  }, [settings.enabled, settings.intervalMs, count, paused]);

  if (!settings.enabled || !current) return null;

  function goPrev() {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % count);
  }

  // Duplicate items for seamless -50% CSS marquee loop
  const tickerItems = [...products, ...products];

  return (
    <section
      aria-label={settings.title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="pt-12 sm:pt-14"
    >
      <div className="container-page">
        <div className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand-deep via-brand-dark to-[#0d4278] text-white shadow-[0_24px_54px_-28px_rgba(8,48,90,0.65)]">
          {/* Top Spotlight Auto-Slider */}
          <div className="grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10 lg:p-10">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-wider text-[#1b1200]">
                  <Sparkle size={13} weight="fill" aria-hidden />
                  Tiêu điểm {String(safeIndex + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </span>
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-[#d8e6f6]">
                  {current.categoryLabel}
                </span>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9fbcd8]">
                {settings.title}
              </p>

              <h2 className="mt-1.5 text-[1.55rem] leading-tight text-white sm:text-[1.95rem]">
                <Link
                  href={`/san-pham/${current.slug}`}
                  className="hover:text-accent transition-colors"
                >
                  {current.name}
                </Link>
              </h2>

              {current.englishName ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-accent">
                  {current.englishName}
                </p>
              ) : null}

              <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-[#d8e6f6] sm:text-[15px]">
                {current.lead ||
                  current.description[0] ||
                  settings.subtitle}
              </p>

              {current.miniSpecs.length > 0 ? (
                <dl className="mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                  {current.miniSpecs.slice(0, 3).map((spec, idx) => (
                    <div
                      key={`${spec.label}-${idx}`}
                      className="rounded-xl border border-white/12 bg-white/8 px-3 py-2"
                    >
                      <dt className="truncate text-[10.5px] uppercase tracking-wide text-[#9fbcd8]">
                        {spec.label}
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-bold text-white sm:text-[13px]">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/san-pham/${current.slug}`}
                  className="btn btn-primary btn-sm"
                >
                  Xem quy cách &amp; chi tiết
                  <ArrowRight size={15} weight="bold" aria-hidden />
                </Link>
                <Link href="/bao-gia" className="btn btn-ghost-light btn-sm">
                  Nhận báo giá nhanh
                </Link>

                {/* Prev / Next + Dots */}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Sản phẩm nổi bật trước"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <CaretLeft size={16} weight="bold" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Sản phẩm nổi bật tiếp theo"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <CaretRight size={16} weight="bold" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Slide Selector Pills */}
              <div
                className="mt-4 flex flex-wrap items-center gap-1.5"
                role="tablist"
                aria-label="Chọn sản phẩm trên banner"
              >
                {products.map((p, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`Chuyển tới ${p.name}`}
                      onClick={() => setActiveIndex(idx)}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        active
                          ? "w-7 bg-accent"
                          : "w-2 bg-white/30 hover:bg-white/60"
                      )}
                    />
                  );
                })}
              </div>
            </div>

            {/* Product Spotlight Image */}
            <Link
              href={`/san-pham/${current.slug}`}
              className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-white/8"
            >
              <Image
                src={current.images[0] || DEFAULT_PRODUCT_IMAGE}
                alt={current.name}
                width={640}
                height={480}
                className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061f3b]/85 via-[#061f3b]/30 to-transparent p-4">
                <p className="truncate text-xs font-semibold text-[#cfe0f3]">
                  Gia công cắt khổ, nối băng theo kích thước từng model máy
                </p>
              </div>
            </Link>
          </div>

          {/* Bottom Continuous Running Ticker Strip */}
          <div className="w-full max-w-full overflow-hidden border-t border-white/12 bg-[#05182e]/75 py-3">
            <div className="vk-marquee-track gap-3 px-3">
              {tickerItems.map((item, idx) => {
                const isSecondCopy = idx >= count;
                const realIdx = idx % count;
                const active = realIdx === safeIndex;
                return (
                  <button
                    key={`${item.slug}-${idx}`}
                    type="button"
                    tabIndex={isSecondCopy ? -1 : 0}
                    aria-hidden={isSecondCopy ? true : undefined}
                    onClick={() => setActiveIndex(realIdx)}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition",
                      active
                        ? "border-accent bg-white/14 text-white"
                        : "border-white/10 bg-white/5 text-[#cfe0f3] hover:border-white/30 hover:text-white"
                    )}
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10">
                      <Image
                        src={item.images[0] || DEFAULT_PRODUCT_IMAGE}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                    <span className="max-w-[200px]">
                      <span className="block truncate text-xs font-bold">
                        {item.name}
                      </span>
                      <span className="block truncate text-[10.5px] text-[#9fbcd8]">
                        {item.categoryLabel}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
