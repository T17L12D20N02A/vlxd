import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRight,
  CaretRight,
  CheckCircle,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { AddToQuote } from "@/components/add-to-quote";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { SectionHeading } from "@/components/section-heading";
import {
  getCmsProduct,
  listCmsArticles,
  listCmsProducts,
} from "@/lib/cms-store";
import { getProduct, products, site } from "@/lib/content";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return { title: "Chi tiết sản phẩm" };
  }
  return {
    title: product.name,
    description: product.lead,
    openGraph: {
      title: product.name,
      description: product.lead,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

async function ProductDetailBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [product, allProducts, allArticles] = await Promise.all([
    getCmsProduct(slug),
    listCmsProducts(false),
    listCmsArticles(false),
  ]);

  if (!product || product.status === "hidden") notFound();

  const sameCategory = allProducts.filter(
    (p) => p.slug !== product.slug && p.category === product.category
  );
  const others = allProducts.filter(
    (p) => p.slug !== product.slug && p.category !== product.category
  );
  const related = [...sameCategory, ...others].slice(0, 3);
  const linkedArticles = allArticles
    .filter((article) => article.relatedProducts.includes(product.slug))
    .slice(0, 3);

  return (
    <>
      <div className="border-b border-line bg-soft/60">
        <div className="container-page py-3.5">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
              <li>
                <Link href="/" className="transition hover:text-brand">
                  Trang chủ
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <CaretRight size={12} aria-hidden />
                <Link href="/san-pham" className="transition hover:text-brand">
                  Sản phẩm
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <CaretRight size={12} aria-hidden />
                <Link
                  href={`/san-pham?danh-muc=${product.category}`}
                  className="transition hover:text-brand"
                >
                  {product.categoryLabel}
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-ink font-semibold">
                <CaretRight size={12} aria-hidden />
                <span aria-current="page">{product.name}</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <section className="py-10 sm:py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <ProductGallery images={product.images} name={product.name} />

          <div>
            <Link
              href={`/san-pham?danh-muc=${product.category}`}
              className="inline-block rounded-full bg-[#eaf1fa] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-brand"
            >
              {product.categoryLabel}
            </Link>
            <h1 className="mt-3 text-[1.85rem] leading-tight sm:text-[2.25rem]">
              {product.name}
            </h1>
            {product.englishName ? (
              <p className="mt-1.5 text-sm font-medium text-muted">
                {product.englishName}
              </p>
            ) : null}
            <p className="mt-4 text-[16px] leading-relaxed text-body">
              {product.lead}
            </p>

            {product.miniSpecs.length > 0 ? (
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {product.miniSpecs.map((spec) => (
                  <div
                    key={`${spec.label}-${spec.value}`}
                    className="rounded-xl border border-line bg-soft/70 px-3.5 py-3"
                  >
                    <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                      {spec.label}
                    </dt>
                    <dd className="mt-1 text-[15px] font-extrabold text-ink">
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-6 rounded-2xl border border-line bg-soft/50 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink">
                  Báo giá theo quy cách &amp; số lượng
                </span>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-bold text-[#8a5a00]">
                  Liên hệ báo giá
                </span>
              </div>
              <AddToQuote slug={product.slug} />
              <div className="mt-4 flex flex-wrap gap-2.5 border-t border-line pt-4">
                <Link href="/bao-gia" className="btn btn-primary btn-sm">
                  Gửi yêu cầu báo giá
                  <ArrowRight size={15} weight="bold" aria-hidden />
                </Link>
                <a href={site.hotlineHref} className="btn btn-outline btn-sm">
                  <Phone size={15} weight="fill" aria-hidden />
                  Gọi {site.hotline}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-soft/50 py-12 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            {product.description.length > 0 ? (
              <div className="card p-6 sm:p-8">
                <h2 className="text-[1.35rem]">Mô tả sản phẩm</h2>
                <div className="mt-4 space-y-3.5 text-[15.5px] leading-relaxed text-body">
                  {product.description.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {product.applications.length > 0 ? (
              <div className="card p-6 sm:p-8">
                <h2 className="text-[1.35rem]">Ứng dụng tiêu biểu</h2>
                <ul className="mt-4 grid gap-3">
                  {product.applications.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-[15px] text-ink"
                    >
                      <CheckCircle
                        size={20}
                        weight="fill"
                        className="mt-0.5 shrink-0 text-brand"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            {product.specs.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="border-b border-line bg-soft px-6 py-4">
                  <h2 className="text-[1.2rem]">Thông số kỹ thuật</h2>
                </div>
                <dl className="divide-y divide-line">
                  {product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="grid gap-1 px-6 py-3.5 sm:grid-cols-[0.44fr_0.56fr] sm:gap-4"
                    >
                      <dt className="text-sm font-semibold text-muted">
                        {spec.label}
                      </dt>
                      <dd className="text-sm font-semibold text-ink">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {linkedArticles.length > 0 ? (
              <div className="card p-6">
                <h2 className="text-[1.1rem]">Tài liệu &amp; kiến thức liên quan</h2>
                <ul className="mt-3 divide-y divide-line">
                  {linkedArticles.map((article) => (
                    <li key={article.slug} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/tin-tuc/${article.slug}`}
                        className="group block"
                      >
                        <span className="block text-xs font-semibold text-muted">
                          {article.date}
                        </span>
                        <span className="mt-0.5 block text-sm font-bold text-ink group-hover:text-brand">
                          {article.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="container-page">
          <SectionHeading
            title="Sản phẩm liên quan"
            action={
              <Link
                href="/san-pham"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              >
                Xem toàn bộ sản phẩm
                <ArrowRight size={15} weight="bold" aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-soft" />
        </div>
      }
    >
      <ProductDetailBody params={params} />
    </Suspense>
  );
}
