import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { listCmsApplications } from "@/lib/cms-store";

export const metadata: Metadata = {
  title: "Ứng dụng",
  description:
    "Ứng dụng vải Teflon, băng keo chịu nhiệt và băng tải PTFE trong may mặc, giày dép, đóng gói, in chuyển nhiệt và chế biến thực phẩm.",
};

async function ApplicationsGrid() {
  await connection();
  const applications = await listCmsApplications(false);

  return (
    <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {applications.map((application) => (
        <Link
          key={application.slug}
          href={`/ung-dung/${application.slug}`}
          className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-24px_rgba(15,27,45,0.45)]"
        >
          <div className="relative aspect-[3/2] overflow-hidden bg-soft">
            <Image
              src={application.image}
              alt={application.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            {application.tag ? (
              <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[11.5px] font-bold text-[#1b1200] shadow-sm">
                {application.tag}
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h2 className="text-[18px] leading-snug group-hover:text-brand">
              {application.title}
            </h2>
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted">
              {application.excerpt}
            </p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-brand">
              Xem giải pháp
              <ArrowRight
                size={15}
                weight="bold"
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <>
      <PageHero
        title="Ứng dụng vật liệu Teflon trong công nghiệp"
        description="Giải pháp chống dính, chịu nhiệt và truyền tải ổn định cho từng dây chuyền sản xuất đặc thù."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Ứng dụng" }]}
      />

      <section className="py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl border border-line bg-soft"
                />
              ))}
            </div>
          }
        >
          <ApplicationsGrid />
        </Suspense>
      </section>
    </>
  );
}
