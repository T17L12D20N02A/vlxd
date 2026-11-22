import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRight,
  Briefcase,
  EnvelopeSimple,
  Phone,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/page-hero";
import { getRecruitmentSettings, listCmsJobs } from "@/lib/cms-store";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tuyển dụng",
  description:
    "Cơ hội nghề nghiệp tại Công ty TNHH Thương mại Vina Khang: kinh doanh, kỹ thuật, gia công, kho vận, kế toán và marketing.",
};

async function JobsList() {
  await connection();
  const [jobs, settings] = await Promise.all([
    listCmsJobs(false),
    getRecruitmentSettings(),
  ]);
  const hrEmail = settings.email || site.email;

  return (
    <div className="container-page space-y-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            num: "01",
            title: "Môi trường chuyên nghiệp",
            desc: "Đội ngũ gắn bó, định hướng chất lượng và sự hài lòng của khách hàng.",
          },
          {
            num: "02",
            title: "Học hỏi chuyên môn",
            desc: "Được hướng dẫn kiến thức vật liệu Teflon/PTFE và quy trình gia công.",
          },
          {
            num: "03",
            title: "Thu nhập rõ ràng",
            desc: "Lương thỏa thuận theo năng lực, xét điều chỉnh định kỳ.",
          },
          {
            num: "04",
            title: "Phát triển lâu dài",
            desc: "Cơ hội mở rộng vai trò cùng sự phát triển của công ty.",
          },
        ].map((item) => (
          <div key={item.num} className="card p-5">
            <span className="text-2xl font-extrabold leading-none text-line">
              {item.num}
            </span>
            <h2 className="mt-3 text-base">{item.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {jobs.map((job) => (
          <Link
            key={job.slug}
            href={`/tuyen-dung/${job.slug}`}
            className="group card flex flex-col p-6 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_16px_36px_-26px_rgba(15,27,45,0.45)]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1fa] px-3 py-1 text-xs font-bold text-brand">
                <Briefcase size={14} aria-hidden />
                {job.department}
              </span>
            </div>

            <h2 className="mt-3 text-[1.2rem] leading-snug group-hover:text-brand">
              {job.title}
            </h2>

            {job.facts.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-2.5">
                {job.facts.slice(0, 4).map((fact) => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-lg bg-soft px-3 py-2"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-ink">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-brand">
              Xem chi tiết vị trí
              <ArrowRight
                size={15}
                weight="bold"
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>

      <div className="card flex flex-col items-start justify-between gap-6 bg-soft/70 p-7 sm:p-8 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-[1.35rem]">Cách thức ứng tuyển</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {settings.intro} Gửi CV về email{" "}
            <strong className="text-ink">{hrEmail}</strong> (tiêu đề ghi rõ vị trí ứng tuyển)
            hoặc liên hệ trực tiếp qua hotline.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${hrEmail}`} className="btn btn-brand btn-sm">
            <EnvelopeSimple size={16} aria-hidden />
            Gửi CV qua email
          </a>
          <a href={site.hotlineHref} className="btn btn-outline btn-sm">
            <Phone size={16} weight="fill" aria-hidden />
            {site.hotline}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function CareersPage() {
  return (
    <>
      <PageHero
        title="Tuyển dụng tại Vina Khang"
        description="Đồng hành cùng đội ngũ cung ứng vật tư công nghiệp ổn định cho hơn 5000 khách hàng trên toàn quốc."
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Tuyển dụng" }]}
      />

      <section className="py-12 sm:py-16">
        <Suspense
          fallback={
            <div className="container-page h-96 animate-pulse rounded-2xl border border-line bg-soft" />
          }
        >
          <JobsList />
        </Suspense>
      </section>
    </>
  );
}
