import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChatCircleDots,
  FacebookLogo,
  TiktokLogo,
} from "@phosphor-icons/react/dist/ssr";
import { categories, site } from "@/lib/content";

const socials = [
  { href: site.facebook, label: "Facebook", Icon: FacebookLogo },
  { href: site.zalo, label: "Zalo", Icon: ChatCircleDots },
  { href: site.tiktok, label: "TikTok", Icon: TiktokLogo },
];

export function SiteFooter() {
  return (
    <footer className="bg-brand-deep text-[#9fb1c7]">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_0.9fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt=""
              width={40}
              height={42}
              className="h-11 w-auto rounded-md bg-white object-contain p-0.5"
            />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-[0.06em] text-white">
                VINA KHANG
              </span>
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8ea6c0]">
                Vật tư công nghiệp
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Công ty TNHH Thương mại Vina Khang cung cấp vật tư kỹ thuật cho sản
            xuất, gia công và vận hành công nghiệp.
          </p>
          <div className="mt-5 flex gap-2">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/8 text-white transition hover:bg-white/15"
              >
                <Icon size={19} aria-hidden />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
            Danh mục
          </h3>
          <ul className="mt-4 grid gap-2.5 text-sm">
            <li><Link className="transition hover:text-white" href="/">Trang chủ</Link></li>
            <li><Link className="transition hover:text-white" href="/san-pham">Sản phẩm</Link></li>
            <li><Link className="transition hover:text-white" href="/ung-dung">Ứng dụng</Link></li>
            <li><Link className="transition hover:text-white" href="/tin-tuc">Tin tức</Link></li>
            <li><Link className="transition hover:text-white" href="/tuyen-dung">Tuyển dụng</Link></li>
            <li><Link className="transition hover:text-white" href="/lien-he">Liên hệ</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
            Sản phẩm
          </h3>
          <ul className="mt-4 grid gap-2.5 text-sm">
            {categories.slice(0, 5).map((category) => (
              <li key={category.slug}>
                <Link
                  className="transition hover:text-white"
                  href={`/san-pham?danh-muc=${category.slug}`}
                >
                  {category.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="transition hover:text-white" href="/san-pham">
                Xem tất cả danh mục
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-white">
            Liên hệ
          </h3>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <span className="block text-[11px] uppercase tracking-wide text-[#8ea6c0]">Hotline / Zalo</span>
              <a href={site.hotlineHref} className="font-semibold text-white">{site.hotline}</a>
            </li>
            <li>
              <span className="block text-[11px] uppercase tracking-wide text-[#8ea6c0]">Email</span>
              <a href={`mailto:${site.email}`} className="text-white">{site.email}</a>
            </li>
            <li>
              <span className="block text-[11px] uppercase tracking-wide text-[#8ea6c0]">Văn phòng</span>
              <span>{site.address}</span>
            </li>
          </ul>
          <Link href="/bao-gia" className="btn btn-primary btn-sm mt-5">
            Nhận báo giá
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-[13px]">
        <div className="container-page flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Công ty TNHH Thương mại Vina Khang</p>
          <div className="flex flex-wrap items-center gap-4">
            <p>
              Website:{" "}
              <a href={`https://${site.website}`} className="transition hover:text-white">
                {site.website}
              </a>
            </p>
            <span aria-hidden className="text-white/20">·</span>
            <Link href="/bao-gia/tra-cuu" className="transition hover:text-white">
              Tra cứu báo giá
            </Link>
            <span aria-hidden className="text-white/20">·</span>
            <Link href="/quan-tri" className="transition hover:text-white">
              Quản trị
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
