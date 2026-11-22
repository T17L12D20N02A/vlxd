import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import {
  findByPhone,
  getRequest,
  type StoredRequest,
} from "@/lib/requests-store";

export const metadata: Metadata = {
  title: "Tra cứu yêu cầu báo giá",
  description:
    "Tra cứu trạng thái xử lý yêu cầu báo giá tại Vina Khang bằng mã yêu cầu (VK-...) hoặc số điện thoại.",
};

async function LookupResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  let matches: StoredRequest[] = [];
  if (query) {
    const byCode = await getRequest(query);
    if (byCode) {
      matches = [byCode];
    } else {
      matches = await findByPhone(query);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form
        method="get"
        action="/bao-gia/tra-cuu"
        className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Nhập mã yêu cầu (VD: VK-261122-001) hoặc số điện thoại..."
            aria-label="Mã yêu cầu hoặc số điện thoại"
            className="field pl-10"
            required
          />
        </div>
        <button type="submit" className="btn btn-brand shrink-0">
          Tra cứu
        </button>
      </form>

      {query ? (
        matches.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Tìm thấy <strong className="text-ink">{matches.length}</strong> yêu cầu cho{" "}
              <strong className="text-ink">&ldquo;{query}&rdquo;</strong>
            </p>
            {matches.map((record) => {
              const totalItems = record.items.reduce((sum, item) => sum + item.qty, 0);
              return (
                <Link
                  key={record.code}
                  href={`/bao-gia/${record.code}`}
                  className="card flex flex-col gap-3 p-5 transition hover:border-brand sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-base font-extrabold text-brand">
                        {record.code}
                      </span>
                      <StatusBadge status={record.status} />
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-ink">
                      {record.name}
                      {record.company ? ` · ${record.company}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {record.items.length} mặt hàng ({totalItems} sản phẩm) · Gửi lúc{" "}
                      {formatDateTime(record.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                    Xem chi tiết
                    <ArrowRight size={15} weight="bold" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-base font-bold text-ink">
              Không tìm thấy yêu cầu phù hợp với &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1.5 text-sm text-muted">
              Kiểm tra lại mã yêu cầu (định dạng VK-YYMMDD-NNN) hoặc số điện thoại bạn đã đăng ký.
            </p>
          </div>
        )
      ) : (
        <div className="card bg-soft/60 p-6 text-sm text-muted">
          <p>
            Sau khi gửi yêu cầu báo giá, hệ thống cấp một mã riêng dạng{" "}
            <strong className="font-mono text-ink">VK-YYMMDD-001</strong>. Bạn có thể dùng mã này
            hoặc số điện thoại để theo dõi tiến độ xử lý bất cứ lúc nào.
          </p>
        </div>
      )}
    </div>
  );
}

export default function QuoteLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <>
      <PageHero
        title="Tra cứu yêu cầu báo giá"
        description="Nhập mã yêu cầu hoặc số điện thoại để kiểm tra trạng thái báo giá từ Vina Khang."
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/bao-gia", label: "Báo giá" },
          { label: "Tra cứu" },
        ]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <Suspense
            fallback={
              <div className="mx-auto max-w-3xl h-36 animate-pulse rounded-2xl border border-line bg-soft" />
            }
          >
            <LookupResults searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
