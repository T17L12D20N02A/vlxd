import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, Phone } from "@phosphor-icons/react/dist/ssr";
import { ContentBlocks } from "@/components/content-blocks";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
  getCmsApplication,
  listCmsApplications,
  listCmsProducts,
} from "@/lib/cms-store";
import { applications, getApplication, site } from "@/lib/content";

export function generateStaticParams() {
  return applications.map((application) => ({ slug: application.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const application = getApplication(slug);
  if (!application) return { title: "Ứng dụng công nghiệp" };
  return {
    title: application.title,
    description: application.excerpt,
  };
}

async function ApplicationDetailBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [application, allApps, allProducts] = await Promise.all([
    getCmsApplication(slug),
    listCmsApplications(false),
    listCmsProducts(false),
  ]);

  if (!application || application.status === "hidden") notFound();

  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const recommended = application.relatedProducts
    .map((productSlug) => bySlug.get(productSlug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const others = allApps
    .filter((item) => item.slug !== application.slug)
    .slice(0, 4);

  return (
    <>
      <PageHero
        title={application.title}
        description={application.excerpt}
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/ung-dung", label: "Ứng dụng" },
          { label: application.title },
        ]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-soft">
              <Image
                src={application.image}
                alt={application.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
            <ContentBlocks blocks={application.blocks} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="card bg-brand-dark p-6 text-white">
              <h2 className="text-[1.2rem] text-white">Tư vấn vật liệu cho dây chuyền</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#cfe0f3]">
                Chia sẻ model máy, nhiệt độ vận hành và khổ băng tải để nhận đề xuất vật tư phù hợp.
              </p>
              <div className="mt-5 grid gap-2.5">
                <Link href="/bao-gia" className="btn btn-primary w-full">
                  Nhận báo giá
                  <ArrowRight size={16} weight="bold" aria-hidden />
                </Link>
                <a href={site.hotlineHref} className="btn btn-ghost-light w-full">
                  <Phone size={16} weight="fill" aria-hidden />
                  {site.hotline}
                </a>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-[1.05rem]">Ứng dụng khác</h2>
              <ul className="mt-3 divide-y divide-line">
                {others.map((item) => (
                  <li key={item.slug} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/ung-dung/${item.slug}`}
                      className="text-sm font-bold text-ink transition hover:text-brand"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {recommended.length > 0 ? (
        <section className="border-t border-line bg-soft py-14 sm:py-16">
          <div className="container-page">
            <SectionHeading
              title="Sản phẩm phù hợp cho ứng dụng này"
              action={
                <Link
                  href="/san-pham"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                >
                  Xem tất cả sản phẩm
                  <ArrowRight size={15} weight="bold" aria-hidden />
                </Link>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

export default function ApplicationDetailPage({
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
      <ApplicationDetailBody params={params} />
    </Suspense>
  );
}
