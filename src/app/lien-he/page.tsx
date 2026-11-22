import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChatCircleDots,
  Clock,
  EnvelopeSimple,
  MapPin,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Liên hệ",
  description:
    "Liên hệ Công ty TNHH Thương mại Vina Khang qua hotline, Zalo, email hoặc biểu mẫu trực tuyến để được tư vấn vật tư Teflon chịu nhiệt.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Liên hệ Vina Khang"
        description="Cần tư vấn quy cách vải Teflon, gia công băng tải theo kích thước máy hoặc hợp tác cung ứng? Gửi tin nhắn hoặc gọi trực tiếp cho chúng tôi."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Liên hệ" }]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-5">
            <div className="card p-6 sm:p-7">
              <h2 className="text-[1.25rem]">{site.legalName}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Cung cấp vật liệu Teflon chịu nhiệt và gia công theo kích thước model máy trên toàn quốc.
              </p>

              <ul className="mt-6 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-brand">
                    <Phone size={18} weight="fill" aria-hidden />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                      Hotline / Zalo
                    </span>
                    <a
                      href={site.hotlineHref}
                      className="text-base font-extrabold text-ink hover:text-brand"
                    >
                      {site.hotline}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-brand">
                    <EnvelopeSimple size={18} aria-hidden />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                      Email
                    </span>
                    <a
                      href={`mailto:${site.email}`}
                      className="font-semibold text-ink hover:text-brand"
                    >
                      {site.email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-brand">
                    <MapPin size={18} aria-hidden />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                      Địa chỉ văn phòng
                    </span>
                    <p className="font-medium text-ink">{site.address}</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft text-brand">
                    <Clock size={18} aria-hidden />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                      Giờ làm việc
                    </span>
                    <p className="font-medium text-ink">
                      Thứ 2 – Thứ 7: 08:00 – 17:30
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-2.5 border-t border-line pt-5">
                <a
                  href={site.zalo}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-brand btn-sm"
                >
                  <ChatCircleDots size={16} aria-hidden />
                  Nhắn Zalo
                </a>
                <Link href="/bao-gia" className="btn btn-outline btn-sm">
                  Tạo yêu cầu báo giá
                  <ArrowRight size={15} weight="bold" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-[1.35rem]">Gửi tin nhắn trực tiếp</h2>
            <p className="mt-1.5 text-sm text-muted">
              Để lại số điện thoại và nhu cầu sử dụng, Vina Khang sẽ liên hệ tư vấn cụ thể.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
