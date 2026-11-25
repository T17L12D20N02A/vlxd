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
  variant = "hero",
  fallbackHero,
}: {
  settings: BannerSettings;
  products: Product[];
  variant?: "hero" | "preview";
  fallbackHero?: React.ReactNode;
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

  if (!settings.enabled || !current) {
    return fallbackHero ? <>{fallbackHero}</> : null;
  }

  function goPrev() {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % count);
  }

  const tickerItems = [...products, ...products];
  const isHero = variant === "hero";
  const HeadingTag = isHero ? "h1" : "h2";

  return (
    <section
      aria-label={settings.title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-brand-deep via-brand-dark to-[#0d4278] text-white",
        isHero
          ? ""
          : "rounded-3xl border border-line shadow-[0_24px_54px_-28px_rgba(8,48,90,0.65)]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_88%_-10%,rgba(232,160,32,0.18),transparent_58%)]"
      />

      {/* Main Hero Spotlight Slider */}
      <div
        className={cn(
          "relative grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12",
          isHero
            ? "container-page py-12 sm:py-14 lg:py-16"
            : "p-5 sm:p-8 lg:p-10"
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/6 px-3 py-1 text-xs font-semibold text-[#d8e6f6]">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              Công ty TNHH Thương mại Vina Khang
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-wider text-[#1b1200]">
              <Sparkle size={13} weight="fill" aria-hidden />
              Tiêu điểm {String(safeIndex + 1).padStart(2, "0")} /{" "}
              {String(count).padStart(2, "0")}
            </span>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-[#d8e6f6]">
              {current.categoryLabel}
            </span>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#9fbcd8]">
            {settings.title}
          </p>

          <HeadingTag className="mt-2 line-clamp-2 min-h-[2.3em] text-[2rem] leading-[1.12] text-white sm:text-[2.55rem] lg:text-[2.85rem]">
            <Link
              href={`/san-pham/${current.slug}`}
              className="transition-colors hover:text-accent"
            >
              {current.name}
            </Link>
          </HeadingTag>

          <p className="mt-1.5 min-h-[1.25rem] text-xs font-semibold uppercase tracking-wider text-accent">
            {current.englishName || "Vật tư kỹ thuật công nghiệp Vina Khang"}
          </p>

          <p className="mt-3 line-clamp-2 min-h-[3rem] max-w-xl text-[15.5px] leading-relaxed text-[#d8e6f6]">
            {current.lead || current.description[0] || settings.subtitle}
          </p>

          <dl className="mt-5 grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(current.miniSpecs.length > 0
              ? current.miniSpecs.slice(0, 3)
              : [
                  { label: "Nhiệt độ làm việc", value: "-73 → 260°C" },
                  { label: "Gia công quy cách", value: "Theo model máy" },
                  { label: "Cung ứng", value: "Giao hàng toàn quốc" },
                ]
            ).map((spec, idx) => (
              <div
                key={`${spec.label}-${idx}`}
                className="rounded-xl border border-white/15 bg-brand-deep/65 px-3.5 py-2.5"
              >
                <dt className="truncate text-[11px] uppercase tracking-wide text-[#9fbcd8]">
                  {spec.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-bold text-white">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/san-pham/${current.slug}`}
              className="btn btn-primary"
            >
              Xem quy cách &amp; chi tiết
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
            <Link href="/bao-gia" className="btn btn-ghost-light">
              Nhận báo giá nhanh
            </Link>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Sản phẩm nổi bật trước"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
                <CaretLeft size={17} weight="bold" aria-hidden />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Sản phẩm nổi bật tiếp theo"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
                <CaretRight size={17} weight="bold" aria-hidden />
              </button>
            </div>
          </div>

          {/* Slide Selector Dots + Trust Badges */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-center gap-1.5"
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
                      "h-2.5 rounded-full transition-all",
                      active
                        ? "w-8 bg-accent"
                        : "w-2.5 bg-white/30 hover:bg-white/60"
                    )}
                  />
                );
              })}
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#cfe0f3]">
              <li className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                Giao hàng toàn quốc
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                Gia công theo yêu cầu
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column Product Visual */}
        <Link
          href={`/san-pham/${current.slug}`}
          className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-2xl"
        >
          <Image
            src={current.images[0] || DEFAULT_PRODUCT_IMAGE}
            alt={current.name}
            width={720}
            height={540}
            priority={isHero}
            className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061f3b]/90 via-[#061f3b]/35 to-transparent p-4 sm:p-5">
            <p className="truncate text-xs font-semibold text-[#d8e6f6] sm:text-[13px]">
              Gia công cắt khổ, nối băng chuẩn kích thước từng model máy
            </p>
          </div>
        </Link>
      </div>

      {/* Full-Width Continuous Running Ticker Strip */}
      <div className="relative w-full max-w-full overflow-hidden border-t border-white/12 bg-[#05182e]/80 py-3.5">
        <div className="vk-marquee-track gap-3 px-4">
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
                <span className="max-w-[210px]">
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
    </section>
  );
}
