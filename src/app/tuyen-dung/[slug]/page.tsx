import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Briefcase,
  EnvelopeSimple,
  MapPin,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { ContentBlocks } from "@/components/content-blocks";
import { PageHero } from "@/components/page-hero";
import {
  getCmsJob,
  getRecruitmentSettings,
  listCmsJobs,
} from "@/lib/cms-store";
import { isJobExpired } from "@/lib/cms-utils";
import { getJob, jobs, site } from "@/lib/content";

export function generateStaticParams() {
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = getJob(slug);
  if (!job) return { title: "Tuyển dụng" };
  return {
    title: `${job.title} - Tuyển dụng`,
    description: `Thông tin tuyển dụng vị trí ${job.title} (${job.department}) tại Công ty TNHH Thương mại Vina Khang.`,
  };
}

async function JobDetailBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [job, allJobs, settings] = await Promise.all([
    getCmsJob(slug),
    listCmsJobs(false),
    getRecruitmentSettings(),
  ]);

  if (!job || job.status !== "open" || isJobExpired(job.deadline)) notFound();

  const hrEmail = settings.email || site.email;
  const otherJobs = allJobs.filter((item) => item.slug !== job.slug).slice(0, 4);

  return (
    <>
      <PageHero
        title={job.title}
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { href: "/tuyen-dung", label: "Tuyển dụng" },
          { label: job.title },
        ]}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
          <Briefcase size={14} aria-hidden />
          {job.department}
        </span>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            {job.facts.length > 0 ? (
              <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {job.facts.map((fact) => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-xl border border-line bg-soft/70 p-4"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-sm font-extrabold text-ink">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <ContentBlocks blocks={job.blocks} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="card p-6">
              <h2 className="text-[1.15rem]">Ứng tuyển vị trí này</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Gửi hồ sơ về bộ phận nhân sự Vina Khang hoặc liên hệ trực tiếp qua hotline.
              </p>
              <div className="mt-4 space-y-2.5 text-sm">
                <a
                  href={`mailto:${hrEmail}?subject=${encodeURIComponent(`Ứng tuyển ${job.title}`)}`}
                  className="btn btn-primary w-full"
                >
                  <EnvelopeSimple size={16} aria-hidden />
                  Gửi CV qua Email
                </a>
                <a href={site.hotlineHref} className="btn btn-outline w-full">
                  <Phone size={16} weight="fill" aria-hidden />
                  {site.hotline}
                </a>
              </div>
              <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-xs text-muted">
                <MapPin size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                {site.address}
              </p>
            </div>

            <div className="card p-6">
              <h2 className="text-[1.05rem]">Vị trí khác đang tuyển</h2>
              <ul className="mt-3 divide-y divide-line">
                {otherJobs.map((item) => (
                  <li key={item.slug} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/tuyen-dung/${item.slug}`} className="group block">
                      <span className="block text-xs font-semibold text-muted">
                        {item.department}
                      </span>
                      <span className="mt-0.5 block text-sm font-bold text-ink group-hover:text-brand">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default function JobDetailPage({
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
      <JobDetailBody params={params} />
    </Suspense>
  );
}
