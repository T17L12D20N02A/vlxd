import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Phone } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { ProductCatalog } from "@/components/product-catalog";
import { listCmsCategories, listCmsProducts } from "@/lib/cms-store";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description:
    "Danh mục vật liệu Teflon chịu nhiệt của Vina Khang: vải Teflon, băng keo chịu nhiệt, băng tải máy ép keo, băng tải lưới và dây đai hàn nhiệt.",
};

async function LiveCatalog() {
  await connection();
  const [products, categories] = await Promise.all([
    listCmsProducts(false),
    listCmsCategories(),
  ]);
  return <ProductCatalog products={products} categories={categories} />;
}

export default function ProductsPage() {
  return (
    <>
      <PageHero
        title="Danh mục sản phẩm Teflon chịu nhiệt"
        description="Vật liệu PTFE phủ sợi thủy tinh sẵn quy cách tiêu chuẩn và nhận gia công cắt khổ, nối băng theo kích thước từng model máy."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Sản phẩm" }]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <Suspense
            fallback={
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[360px] animate-pulse rounded-2xl border border-line bg-soft"
                  />
                ))}
              </div>
            }
          >
            <LiveCatalog />
          </Suspense>
        </div>
      </section>

      <section className="bg-soft py-12 sm:py-14">
        <div className="container-page flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-white p-7 sm:p-9 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-[1.45rem]">Cần gia công kích thước riêng cho model máy?</h2>
            <p className="mt-2 max-w-2xl text-[15px] text-muted">
              Chọn các sản phẩm cần báo giá vào giỏ yêu cầu hoặc gọi trực tiếp để đội ngũ kỹ thuật Vina Khang tư vấn đúng độ dày và quy cách.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/bao-gia" className="btn btn-primary">
              Mở giỏ báo giá
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
            <a href={site.hotlineHref} className="btn btn-outline">
              <Phone size={16} weight="fill" aria-hidden />
              {site.hotline}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
