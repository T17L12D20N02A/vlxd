import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

type Crumb = {
  href?: string;
  label: string;
};

type PageHeroProps = {
  title: string;
  description?: string;
  crumbs: Crumb[];
  children?: React.ReactNode;
};

export function PageHero({ title, description, crumbs, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand-dark text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-[320px] w-[320px] rounded-full bg-accent/10"
      />
      <div className="container-page relative py-12 sm:py-14">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#b6cbe3]">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <CaretRight size={12} aria-hidden /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-4 max-w-3xl text-[1.9rem] leading-tight text-white sm:text-[2.3rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#b6cbe3]">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
