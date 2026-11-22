import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { ContentBlocks } from "@/components/content-blocks";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
  getCmsArticle,
  listCmsArticles,
  listCmsProducts,
} from "@/lib/cms-store";
import { articles, getArticle } from "@/lib/content";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Bài viết kỹ thuật" };
  return {
    title: article.title,
    description: article.excerpt,
  };
}

async function ArticleDetailBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [article, allArticles, allProducts] = await Promise.all([
    getCmsArticle(slug),
    listCmsArticles(false),
    listCmsProducts(false),
  ]);

  if (!article || article.status === "hidden") notFound();

  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const recommended = article.relatedProducts
    .map((productSlug) => bySlug.get(productSlug))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const others = allArticles
    .filter((item) => item.slug !== article.slug)
    .slice(0, 4);

  return (
    <>
      <PageHero
        title={article.title}
        description={article.excerpt}
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/tin-tuc", label: "Tin tức" },
          { label: article.title },
        ]}
      >
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-[#cfe0f3]">
          <CalendarBlank size={15} aria-hidden />
          {article.date}
        </p>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <article>
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-soft">
              <Image
                src={article.image}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
            <ContentBlocks blocks={article.blocks} />
          </article>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="card p-6">
              <h2 className="text-[1.05rem]">Bài viết liên quan</h2>
              <ul className="mt-4 divide-y divide-line">
                {others.map((item) => (
                  <li key={item.slug} className="py-3.5 first:pt-0 last:pb-0">
                    <Link href={`/tin-tuc/${item.slug}`} className="group block">
                      <span className="block text-xs font-semibold text-muted">
                        {item.date}
                      </span>
                      <span className="mt-1 block text-sm font-bold leading-snug text-ink group-hover:text-brand">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card bg-soft p-6">
              <h2 className="text-[1.05rem]">Cần tư vấn kỹ thuật?</h2>
              <p className="mt-2 text-sm text-muted">
                Gửi quy cách cần dùng để Vina Khang gợi ý đúng độ dày và báo giá nhanh.
              </p>
              <Link href="/bao-gia" className="btn btn-brand btn-sm mt-4 w-full">
                Yêu cầu báo giá
                <ArrowRight size={15} weight="bold" aria-hidden />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {recommended.length > 0 ? (
        <section className="border-t border-line bg-soft py-14 sm:py-16">
          <div className="container-page">
            <SectionHeading
              title="Sản phẩm được nhắc đến trong bài"
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

export default function ArticleDetailPage({
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
      <ArticleDetailBody params={params} />
    </Suspense>
  );
}
