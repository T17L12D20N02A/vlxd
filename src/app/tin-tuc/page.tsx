import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { listCmsArticles } from "@/lib/cms-store";

export const metadata: Metadata = {
  title: "Tin tức & Kiến thức",
  description:
    "Kiến thức chọn vải Teflon, băng tải máy ép keo, độ dày băng keo chịu nhiệt và cách bảo quản vật tư PTFE bền bỉ.",
};

async function ArticlesList() {
  await connection();
  const articles = await listCmsArticles(false);
  const [lead, ...rest] = articles;

  return (
    <div className="container-page space-y-10">
      {lead ? (
        <Link
          href={`/tin-tuc/${lead.slug}`}
          className="group card grid overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-30px_rgba(15,27,45,0.5)] lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="relative aspect-[16/10] bg-soft lg:aspect-auto lg:min-h-[320px]">
            <Image
              src={lead.image}
              alt={lead.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
              Bài viết nổi bật · {lead.date}
            </span>
            <h2 className="mt-3 text-[1.5rem] leading-snug group-hover:text-brand sm:text-[1.75rem]">
              {lead.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              {lead.excerpt}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              Đọc bài viết
              <ArrowRight size={15} weight="bold" aria-hidden />
            </span>
          </div>
        </Link>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((article) => (
          <Link
            key={article.slug}
            href={`/tin-tuc/${article.slug}`}
            className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-24px_rgba(15,27,45,0.45)]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-soft">
              <Image
                src={article.image}
                alt={article.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <span className="text-xs font-semibold text-muted">
                {article.date}
              </span>
              <h2 className="mt-2 text-[17px] leading-snug group-hover:text-brand">
                {article.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                {article.excerpt}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-brand">
                Đọc tiếp
                <ArrowRight size={15} weight="bold" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <>
      <PageHero
        title="Kiến thức & tin tức kỹ thuật"
        description="Hướng dẫn lựa chọn quy cách, phân biệt chất liệu và kinh nghiệm bảo quản vật tư Teflon trong sản xuất."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Tin tức" }]}
      />

      <section className="py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="container-page h-96 animate-pulse rounded-2xl border border-line bg-soft" />
          }
        >
          <ArticlesList />
        </Suspense>
      </section>
    </>
  );
}
