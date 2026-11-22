"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  EnvelopeSimple,
  List,
  MapPin,
  Phone,
  ShoppingCartSimple,
  X,
} from "@phosphor-icons/react";
import { site } from "@/lib/content";
import { cn } from "@/lib/format";
import { useQuote } from "./quote-provider";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/san-pham", label: "Sản phẩm" },
  { href: "/ung-dung", label: "Ứng dụng" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/tuyen-dung", label: "Tuyển dụng" },
  { href: "/lien-he", label: "Liên hệ" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count, ready } = useQuote();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <>
      <div className="hidden bg-brand-dark text-[#cfe0f3] lg:block">
        <div className="container-page flex h-10 items-center justify-between text-[13px]">
          <div className="flex items-center gap-7">
            <a
              href={site.hotlineHref}
              className="inline-flex items-center gap-1.5 transition hover:text-white"
            >
              <Phone size={14} weight="fill" aria-hidden />
              Hotline:
              <strong className="font-semibold text-white">{site.hotline}</strong>
            </a>
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center gap-1.5 transition hover:text-white"
            >
              <EnvelopeSimple size={14} aria-hidden />
              {site.email}
            </a>
          </div>
          <p className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden />
            {site.address}
          </p>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Vina Khang - Trang chủ">
            <Image
              src="/images/logo.png"
              alt=""
              width={40}
              height={42}
              priority
              className="h-11 w-auto object-contain"
            />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-[0.06em] text-ink">
                VINA KHANG
              </span>
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted">
                Vật tư công nghiệp
              </span>
            </span>
          </Link>

          <nav className="hidden lg:block" aria-label="Điều hướng chính">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3.5 py-2 text-[15px] font-semibold transition",
                      isActive(pathname, item.href)
                        ? "bg-soft text-brand"
                        : "text-ink hover:bg-soft hover:text-brand"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/bao-gia"
              aria-label={`Giỏ yêu cầu báo giá${ready && count > 0 ? `, ${count} sản phẩm` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-brand hover:text-brand"
            >
              <ShoppingCartSimple size={20} aria-hidden />
              {ready && count > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-[#1b1200]">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>

            <Link href="/bao-gia" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Nhận báo giá
            </Link>

            <button
              type="button"
              onClick={() => setOpenPath(open ? null : pathname)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Đóng menu" : "Mở menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-brand hover:text-brand lg:hidden"
            >
              {open ? <X size={20} aria-hidden /> : <List size={20} aria-hidden />}
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          hidden={!open}
          className="border-t border-line bg-white lg:hidden"
        >
          <nav className="container-page py-3" aria-label="Điều hướng di động">
            <ul className="grid gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-[15px] font-semibold",
                      isActive(pathname, item.href)
                        ? "bg-soft text-brand"
                        : "text-ink hover:bg-soft"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 border-t border-line pt-3 text-sm">
              <a href={site.hotlineHref} className="inline-flex items-center gap-2 font-semibold text-brand">
                <Phone size={16} weight="fill" aria-hidden />
                {site.hotline}
              </a>
              <p className="inline-flex items-start gap-2 text-muted">
                <MapPin size={16} aria-hidden />
                {site.address}
              </p>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
