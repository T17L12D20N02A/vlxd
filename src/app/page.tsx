import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle,
  GridFour,
  Stack,
  LinkSimple,
  Phone,
  Ruler,
  Scissors,
  ShieldCheck,
  SquaresFour,
  Sticker,
  Truck,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { FeaturedProductsBanner } from "@/components/featured-banner";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { getResolvedBannerData } from "@/lib/cms-store";
import {
  DEFAULT_BANNER_SETTINGS,
  resolveBannerProductSlugs,
} from "@/lib/cms-utils";
import {
  articles,
  categories,
  categoryMeta,
  featuredProducts,
  getApplication,
  products,
  site,
} from "@/lib/content";

const CATEGORY_ICONS: Record<string, typeof Stack> = {
  vai: Stack,
  bangkeo: Sticker,
  epkeo: Ruler,
  bangtai: GridFour,
  daydai: LinkSimple,
};

const STATS = [
  { value: "5000+", label: "Khách hàng tin dùng", Icon: Users },
  { value: "18+", label: "Năm kinh nghiệm", Icon: CalendarCheck },
  { value: "5", label: "Nhóm sản phẩm chính", Icon: SquaresFour },
  { value: "Toàn quốc", label: "Giao hàng, cung ứng ổn định", Icon: Truck },
];

const HERO_SPECS = [
  { value: "-73 → 260°C", label: "Nhiệt độ làm việc" },
  { value: "0.08-0.35 mm", label: "Độ dày vải Teflon" },
  { value: "1 m / 1.2 m", label: "Khổ vải tiêu chuẩn" },
  { value: "200-1800 mm", label: "Khổ băng tải ép keo" },
];

const WHY = [
  {
    title: "Đúng vật liệu, đúng ứng dụng",
    body: "Tư vấn quy cách, độ dày, màu sắc phù hợp từng thiết bị và quy trình sản xuất.",
    Icon: ShieldCheck,
  },
  {
    title: "Gia công theo yêu cầu",
    body: "Cắt khổ, nối băng, gia cố biên theo kích thước model máy của bạn.",
    Icon: Scissors,
  },
  {
    title: "Cung ứng ổn định, đúng hẹn",
    body: "Hơn 5000 khách hàng tin dùng, giao hàng toàn quốc và hỗ trợ kỹ thuật sau bán.",
    Icon: Truck,
  },
];

const HOME_APPLICATIONS = [
  "may-mac-ep-keo",
  "giay-dep-ep-dan",
  "dong-goi-han-mieng-tui",
  "che-bien-thuc-pham",
]
  .map((slug) => getApplication(slug))
  .filter((application): application is NonNullable<typeof application> => Boolean(application));

const STATIC_BANNER_SLUGS = resolveBannerProductSlugs(undefined, products);
const STATIC_BANNER_PRODUCTS = STATIC_BANNER_SLUGS.map((s) =>
  products.find((p) => p.slug === s)
).filter((p): p is NonNullable<typeof p> => Boolean(p));

function ClassicFallbackHero() {
  return (
    <section className="relative overflow-hidden bg-brand-dark text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_88%_-10%,rgba(232,160,32,0.18),transparent_58%)]"
      />
      <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-[1.12fr_0.88fr] lg:py-20">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#d8e6f6]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Công ty TNHH Thương mại Vina Khang
          </p>
          <h1 className="mt-5 text-[2.35rem] leading-[1.08] text-white sm:text-[3rem] lg:text-[3.35rem]">
            Vật liệu Teflon chịu nhiệt{" "}
            <span className="text-accent">cho sản xuất công nghiệp</span>
          </h1>
          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-[#d8e6f6]">
            Vải Teflon, băng keo, băng tải máy ép keo và dây đai hàn nhiệt, gia
            công theo kích thước từng model máy.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/san-pham" className="btn btn-primary">
              Xem sản phẩm
              <ArrowRight size={17} weight="bold" aria-hidden />
            </Link>
            <Link href="/bao-gia" className="btn btn-ghost-light">
              Nhận báo giá
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5">
            <Image
              src="/images/products/vai-chiu-nhiet-cao-cap.webp"
              alt="Cuộn vải Teflon phủ PTFE màu nâu của Vina Khang"
              width={720}
              height={540}
              priority
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 text-[13px]">
            {HERO_SPECS.map((spec) => (
              <div key={spec.label} className="bg-brand-deep/80 px-4 py-3">
                <dt className="text-[11.5px] uppercase tracking-wide text-[#9fbcd8]">
                  {spec.label}
                </dt>
                <dd className="mt-0.5 text-[15px] font-bold text-white">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

async function LiveFeaturedBannerSection() {
  await connection();
  const { settings, products: bannerProducts } = await getResolvedBannerData();
  return (
    <FeaturedProductsBanner
      settings={settings}
      products={bannerProducts}
      variant="hero"
      fallbackHero={<ClassicFallbackHero />}
    />
  );
}

async function LiveFeaturedGridSection() {
  await connection();
  const { allVisibleProducts } = await getResolvedBannerData();
  const liveFeatured = allVisibleProducts.filter((p) => p.featured);
  const displayList =
    liveFeatured.length > 0 ? liveFeatured : allVisibleProducts.slice(0, 6);

  return (
    <section id="san-pham" className="py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          title="Sản phẩm nổi bật"
          description="Vật liệu Teflon PTFE phủ sợi thủy tinh, sẵn quy cách chuẩn và gia công theo yêu cầu."
          action={
            <Link
              href="/san-pham"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
            >
              Xem tất cả {allVisibleProducts.length} sản phẩm
              <ArrowRight size={15} weight="bold" aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayList.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const featured = featuredProducts();
  const [lead, ...rest] = articles;

  return (
    <>
      <Suspense
        fallback={
          <FeaturedProductsBanner
            settings={{
              ...DEFAULT_BANNER_SETTINGS,
              productSlugs: STATIC_BANNER_SLUGS,
            }}
            products={STATIC_BANNER_PRODUCTS}
            variant="hero"
          />
        }
      >
        <LiveFeaturedBannerSection />
      </Suspense>

      <section className="relative z-10 pt-8 sm:pt-10">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-[0_18px_40px_-28px_rgba(15,27,45,0.35)] lg:grid-cols-4">
            {STATS.map(({ value, label, Icon }) => (
              <div key={label} className="flex items-center gap-3.5 bg-white px-5 py-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-brand">
                  <Icon size={22} aria-hidden />
                </span>
                <span>
                  <span className="block text-[19px] font-extrabold leading-tight text-ink">
                    {value}
                  </span>
                  <span className="block text-[12.5px] text-muted">{label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="gioi-thieu" className="py-16 sm:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal className="relative">
            <div className="overflow-hidden rounded-2xl border border-line bg-soft">
              <Image
                src="/images/about-yard.jpg"
                alt="Sản phẩm vải, băng keo và băng tải Teflon của Vina Khang tại hội chợ"
                width={1280}
                height={960}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 right-5 rounded-xl bg-accent px-5 py-3 text-[#1b1200] shadow-lg">
              <span className="block text-[26px] font-extrabold leading-none">18+</span>
              <span className="text-[12px] font-semibold">năm kinh nghiệm</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent">
              Giới thiệu doanh nghiệp
            </p>
            <h2 className="mt-3 text-[1.8rem] leading-tight sm:text-[2.1rem]">
              Vina Khang, giải pháp vật tư công nghiệp chất lượng
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-body">
              Công ty TNHH Thương mại Vina Khang hoạt động trong lĩnh vực thương
              mại và cung cấp vật tư kỹ thuật phục vụ sản xuất, gia công và vận
              hành trong công nghiệp.
            </p>
            <p className="mt-3 text-[16px] leading-relaxed text-body">
              Chúng tôi lấy chất lượng sản phẩm và sự hài lòng của khách hàng làm
              trọng tâm, giúp doanh nghiệp nâng cao hiệu quả sản xuất và tối ưu
              chi phí vận hành.
            </p>
            <ul className="mt-6 grid gap-3">
              {[
                "Chọn đúng vật liệu để tăng chất lượng thành phẩm",
                "Tối ưu hiệu suất vận hành và tuổi thọ thiết bị",
                "Gia công cắt khổ, nối băng theo từng model máy",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] font-medium text-ink">
                  <CheckCircle size={21} weight="fill" className="mt-0.5 shrink-0 text-brand" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/san-pham" className="btn btn-brand mt-7">
              Xem sản phẩm
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-soft py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            title="5 nhóm sản phẩm chính"
            description="Từ vật liệu tấm cuộn đến băng tải gia công theo model máy, đáp ứng nhu cầu gia nhiệt, ép dán và đóng gói."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.slice(0, 5).map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] ?? Stack;
              return (
                <Link
                  key={category.slug}
                  href={`/san-pham?danh-muc=${category.slug}`}
                  className="group card flex flex-col p-5 transition hover:-translate-y-1 hover:border-brand hover:shadow-[0_16px_36px_-26px_rgba(15,27,45,0.5)]"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-[#8a5a00]">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[16px] leading-snug group-hover:text-brand">
                    {category.label}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    {categoryMeta[category.slug]?.description}
                  </p>
                  <span className="mt-auto pt-4 text-[12px] font-semibold text-muted">
                    {category.count} sản phẩm
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <section id="san-pham" className="py-16 sm:py-20">
            <div className="container-page">
              <SectionHeading
                title="Sản phẩm nổi bật"
                description="Vật liệu Teflon PTFE phủ sợi thủy tinh, sẵn quy cách chuẩn và gia công theo yêu cầu."
                action={
                  <Link
                    href="/san-pham"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                  >
                    Xem tất cả {products.length} sản phẩm
                    <ArrowRight size={15} weight="bold" aria-hidden />
                  </Link>
                }
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            </div>
          </section>
        }
      >
        <LiveFeaturedGridSection />
      </Suspense>

      <section className="bg-brand-dark py-16 text-white sm:py-20">
        <div className="container-page">
          <SectionHeading
            title="Giải pháp cho nhiều ngành sản xuất"
            description="Chọn lĩnh vực để xem vật liệu và quy cách phù hợp với dây chuyền của bạn."
            inverted
            action={
              <Link
                href="/ung-dung"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
              >
                Xem tất cả ứng dụng
                <ArrowRight size={15} weight="bold" aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOME_APPLICATIONS.map((application) => (
              <Link
                key={application.slug}
                href={`/ung-dung/${application.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/5 transition hover:border-accent/60 hover:bg-white/8"
              >
                <Image
                  src={application.image}
                  alt={application.title}
                  width={720}
                  height={480}
                  className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="flex flex-1 flex-col p-4">
                  <span className="text-[15px] font-bold leading-snug text-white">
                    {application.title}
                  </span>
                  <span className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#b6cbe3]">
                    {application.excerpt}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading title="Đồng hành cùng sản xuất của bạn" />
          <div className="divide-y divide-line border-y border-line">
            {WHY.map(({ title, body, Icon }) => (
              <div key={title} className="grid gap-4 py-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-soft text-brand">
                  <Icon size={24} aria-hidden />
                </span>
                <div className="max-w-3xl">
                  <h3 className="text-[17px]">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-soft py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            title="Kiến thức và tin tức mới"
            action={
              <Link
                href="/tin-tuc"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              >
                Xem tất cả tin tức
                <ArrowRight size={15} weight="bold" aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            {lead ? (
              <Link
                href={`/tin-tuc/${lead.slug}`}
                className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_20px_44px_-30px_rgba(15,27,45,0.5)]"
              >
                <Image
                  src={lead.image}
                  alt={lead.title}
                  width={720}
                  height={480}
                  className="aspect-[16/10] w-full object-cover"
                />
                <div className="p-6">
                  <p className="text-[12.5px] font-semibold text-muted">{lead.date}</p>
                  <h3 className="mt-2 text-[20px] leading-snug group-hover:text-brand">
                    {lead.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{lead.excerpt}</p>
                </div>
              </Link>
            ) : null}

            <div className="divide-y divide-line rounded-2xl border border-line bg-white">
              {rest.slice(0, 4).map((article) => (
                <Link
                  key={article.slug}
                  href={`/tin-tuc/${article.slug}`}
                  className="group flex items-start gap-4 p-5 transition hover:bg-soft/60"
                >
                  <Image
                    src={article.image}
                    alt=""
                    width={96}
                    height={96}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <span>
                    <span className="block text-[12px] font-semibold text-muted">{article.date}</span>
                    <span className="mt-1 block text-[15px] font-bold leading-snug text-ink group-hover:text-brand">
                      {article.title}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand py-14 text-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-[1.7rem] text-white">
              Cần báo giá hoặc tư vấn vật liệu phù hợp?
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] text-[#cfe0f3]">
              Gửi thông số kỹ thuật hoặc kích thước model máy, đội ngũ Vina Khang
              phản hồi trong thời gian sớm nhất.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/bao-gia" className="btn btn-primary">
              Nhận báo giá
              <ArrowRight size={16} weight="bold" aria-hidden />
            </Link>
            <a href={site.hotlineHref} className="btn btn-ghost-light">
              <Phone size={16} weight="fill" aria-hidden />
              {site.hotline}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
