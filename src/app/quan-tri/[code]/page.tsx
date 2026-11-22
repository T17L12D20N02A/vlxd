import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft, Clock, Phone } from "@phosphor-icons/react/dist/ssr";
import { changeStatus } from "@/app/actions";
import { PageHero } from "@/components/page-hero";
import { StatusBadge } from "@/components/status-badge";
import { isAdmin } from "@/lib/auth";
import { getProduct } from "@/lib/content";
import { formatDateTime, telHref } from "@/lib/format";
import {
  canTransition,
  STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/request";
import { getRequest } from "@/lib/requests-store";

export const metadata: Metadata = {
  title: "Xử lý yêu cầu báo giá",
  robots: { index: false, follow: false },
};

const ALL_STATUSES: QuoteStatus[] = [
  "moi",
  "dang-xu-ly",
  "da-bao-gia",
  "hoan-tat",
  "huy",
];

async function AdminRequestDetailBody({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await connection();
  if (!(await isAdmin())) {
    redirect("/quan-tri/dang-nhap");
  }

  const { code } = await params;
  const record = await getRequest(code);
  if (!record) notFound();

  const nextStatuses = ALL_STATUSES.filter((next) =>
    canTransition(record.status, next)
  );

  return (
    <>
      <PageHero
        title={`Xử lý yêu cầu ${record.code}`}
        description={`Tạo lúc ${formatDateTime(record.createdAt)} · Cập nhật ${formatDateTime(record.updatedAt)}`}
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/quan-tri", label: "Quản trị" },
          { label: record.code },
        ]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={record.status} />
          <Link href="/quan-tri" className="btn btn-ghost-light btn-sm">
            <ArrowLeft size={15} aria-hidden />
            Quay lại danh sách
          </Link>
        </div>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-[1.15rem]">Thông tin khách hàng</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Họ tên
                  </dt>
                  <dd className="mt-0.5 font-bold text-ink">{record.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Số điện thoại
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={telHref(record.phone)}
                      className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
                    >
                      <Phone size={14} weight="fill" aria-hidden />
                      {record.phone}
                    </a>
                  </dd>
                </div>
                {record.email ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Email
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      <a
                        href={`mailto:${record.email}`}
                        className="text-brand hover:underline"
                      >
                        {record.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {record.company ? (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Công ty / Xưởng
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {record.company}
                    </dd>
                  </div>
                ) : null}
                {record.address ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Địa chỉ giao hàng
                    </dt>
                    <dd className="mt-0.5 font-semibold text-ink">
                      {record.address}
                    </dd>
                  </div>
                ) : null}
                {record.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Ghi chú quy cách
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-line text-ink">
                      {record.note}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-line bg-soft/70 px-6 py-4">
                <h2 className="text-[1.1rem]">
                  Danh sách sản phẩm ({record.items.length} dòng)
                </h2>
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
                          <p className="text-xs text-muted">
                            {product.categoryLabel}
                          </p>
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
          </div>

          <aside className="space-y-6">
            <div className="card p-6">
              <h2 className="text-[1.1rem]">Cập nhật trạng thái</h2>
              {nextStatuses.length > 0 ? (
                <div className="mt-4 grid gap-2.5">
                  {nextStatuses.map((next) => (
                    <form key={next} action={changeStatus}>
                      <input type="hidden" name="code" value={record.code} />
                      <input type="hidden" name="status" value={next} />
                      <button
                        type="submit"
                        className={
                          next === "huy"
                            ? "btn btn-outline btn-sm w-full border-[#c0392b] text-[#c0392b] hover:bg-[#c0392b] hover:text-white"
                            : "btn btn-brand btn-sm w-full"
                        }
                      >
                        Chuyển sang: {STATUS_LABELS[next]}
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Yêu cầu này đã ở trạng thái cuối ({STATUS_LABELS[record.status]}).
                </p>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-[1.1rem]">Lịch sử xử lý</h2>
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
          </aside>
        </div>
      </section>
    </>
  );
}

export default function AdminRequestDetailPage({
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
      <AdminRequestDetailBody params={params} />
    </Suspense>
  );
}
