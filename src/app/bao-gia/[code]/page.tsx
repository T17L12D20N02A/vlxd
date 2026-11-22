import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { ClearQuoteOnSubmit } from "@/components/clear-quote-on-submit";
import { PageHero } from "@/components/page-hero";
import { StatusBadge } from "@/components/status-badge";
import { getProduct, site } from "@/lib/content";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/request";
import { getRequest } from "@/lib/requests-store";

export const metadata: Metadata = {
  title: "Chi tiết yêu cầu báo giá",
  robots: { index: false, follow: false },
};

async function QuoteReceiptBody({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await connection();
  const { code } = await params;
  const record = await getRequest(code);
  if (!record) notFound();

  return (
    <>
      <ClearQuoteOnSubmit />
      <PageHero
        title={`Yêu cầu báo giá ${record.code}`}
        description={`Gửi lúc ${formatDateTime(record.createdAt)} · Cập nhật gần nhất ${formatDateTime(record.updatedAt)}`}
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/bao-gia", label: "Báo giá" },
          { label: record.code },
        ]}
      >
        <StatusBadge status={record.status} />
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-2xl border border-[#b7e1c7] bg-[#e6f4ec] p-5 text-sm text-[#1f6b41]">
              <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <p className="font-bold">Yêu cầu của bạn đã được ghi nhận</p>
                <p className="mt-1">
                  Lưu lại mã <strong className="font-mono">{record.code}</strong> hoặc dùng số điện thoại{" "}
                  <strong>{record.phone}</strong> để tra cứu tiến độ xử lý tại mục Tra cứu.
                </p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-line bg-soft/70 px-6 py-4">
                <h2 className="text-[1.1rem]">Sản phẩm yêu cầu báo giá</h2>
              </div>
              <ul className="divide-y divide-line">
                {record.items.map((item) => {
                  const product = getProduct(item.slug);
                  return (
                    <li
                      key={item.slug}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >
                      <div>
                        {product ? (
                          <Link
                            href={`/san-pham/${product.slug}`}
                            className="font-bold text-ink hover:text-brand"
                          >
                            {product.name}
                          </Link>
                        ) : (
                          <span className="font-bold text-ink">{item.slug}</span>
                        )}
                        {product ? (
                          <p className="text-xs text-muted">{product.categoryLabel}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-soft px-3 py-1 text-sm font-bold text-ink">
                        SL: {item.qty}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="text-[1.1rem]">Thông tin liên hệ</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Người gửi
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink">{record.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Số điện thoại
                  </dt>
                  <dd className="mt-0.5 font-semibold text-ink">{record.phone}</dd>
                </div>
                {record.email ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Email
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">{record.email}</dd>
                  </div>
                ) : null}
                {record.company ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Công ty / Xưởng
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">{record.company}</dd>
                  </div>
                ) : null}
                {record.address ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Địa chỉ giao hàng
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">{record.address}</dd>
                  </div>
                ) : null}
                {record.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Ghi chú quy cách
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line text-ink">{record.note}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card p-6">
              <h2 className="text-[1.1rem]">Lịch sử trạng thái</h2>
              <ol className="mt-4 space-y-4 border-l-2 border-line pl-4">
                {record.history.map((entry, index) => (
                  <li key={`${entry.status}-${entry.at}-${index}`} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand"
                    />
                    <p className="text-sm font-bold text-ink">
                      {STATUS_LABELS[entry.status]}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                      <Clock size={13} aria-hidden />
                      {formatDateTime(entry.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card bg-soft p-6">
              <h2 className="text-base">Cần báo giá gấp?</h2>
              <p className="mt-1.5 text-sm text-muted">
                Gọi trực tiếp hotline và đọc mã{" "}
                <strong className="font-mono text-ink">{record.code}</strong> để được ưu tiên xử lý.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a href={site.hotlineHref} className="btn btn-brand btn-sm">
                  <Phone size={15} weight="fill" aria-hidden />
                  {site.hotline}
                </a>
                <Link href="/bao-gia/tra-cuu" className="btn btn-outline btn-sm">
                  <ArrowLeft size={15} aria-hidden />
                  Tra cứu mã khác
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default function QuoteDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="h-64 animate-pulse rounded-2xl border border-line bg-soft" />
        </div>
      }
    >
      <QuoteReceiptBody params={params} />
    </Suspense>
  );
}
