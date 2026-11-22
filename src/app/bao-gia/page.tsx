import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { QuoteWorkspace } from "@/components/quote-workspace";
import { listCmsProducts } from "@/lib/cms-store";

export const metadata: Metadata = {
  title: "Yêu cầu báo giá",
  description:
    "Chọn sản phẩm Teflon chịu nhiệt vào giỏ yêu cầu báo giá và gửi thông số quy cách cho Công ty TNHH Thương mại Vina Khang.",
};

async function LiveQuoteWorkspace() {
  await connection();
  const products = await listCmsProducts(false);
  return <QuoteWorkspace products={products} />;
}

export default function QuotePage() {
  return (
    <>
      <PageHero
        title="Giỏ yêu cầu báo giá"
        description="Vina Khang báo giá theo đúng quy cách, độ dày, kích thước gia công và số lượng đặt hàng."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Báo giá" }]}
      >
        <Link href="/bao-gia/tra-cuu" className="btn btn-ghost-light btn-sm">
          <MagnifyingGlass size={16} aria-hidden />
          Tra cứu yêu cầu đã gửi
        </Link>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-2xl border border-line bg-soft" />
            }
          >
            <LiveQuoteWorkspace />
          </Suspense>
        </div>
      </section>
    </>
  );
}
