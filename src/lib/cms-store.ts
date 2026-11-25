import {
  applications as staticApplications,
  articles as staticArticles,
  categories as staticCategories,
  jobs as staticJobs,
  products as staticProducts,
} from "./content";
import productCategories from "@/data/product-categories.json";
import {
  DEFAULT_BANNER_SETTINGS,
  DEFAULT_JOB_BENEFITS,
  DEFAULT_PRODUCT_IMAGE,
  isJobExpired,
  nextCopySlug,
  normalizeDeadlineIso,
  resolveBannerProductSlugs,
  resolveTargetSlug,
  sanitizeBlocks,
  sanitizeImageUrl,
  sanitizeMiniSpecs,
  sanitizePlainText,
  sanitizeSafeUrl,
  sanitizeSpecs,
  slugify,
  todayDisplayVN,
  validateAndNormalizeSnapshot,
  validateBannerSettingsInput,
  type BannerSettings,
  type SnapshotValidationResult,
} from "./cms-utils";
import { dbQuery, ensureSchema, getPool, hasDatabase, resetCmsToSeed } from "./db";
import type {
  Application,
  Article,
  Block,
  Category,
  Job,
  JobFact,
  MiniSpec,
  Product,
  Spec,
} from "./types";

export { slugify };

export const CATEGORY_OPTIONS: Array<{ slug: string; label: string }> =
  productCategories;

export function categoryLabelFor(slug: string): string {
  return CATEGORY_OPTIONS.find((c) => c.slug === slug)?.label ?? slug;
}

export type CmsProduct = Product & {
  status: "show" | "hidden";
  updatedAt: string;
};

export type CmsApplication = Application & {
  tag: string;
  video: string;
  status: "show" | "hidden";
  updatedAt: string;
};

export type CmsArticle = Article & {
  author: string;
  video: string;
  status: "show" | "hidden";
  updatedAt: string;
};

export type CmsJob = Job & {
  qty: number;
  jobType: string;
  location: string;
  salary: string;
  deadline: string;
  status: "open" | "paused" | "closed";
  updatedAt: string;
};

export type RecruitmentSettings = {
  intro: string;
  email: string;
  defaultBenefits?: string;
};

export { DEFAULT_JOB_BENEFITS };
export type { BannerSettings };

const DEFAULT_RECRUITMENT: RecruitmentSettings = {
  intro:
    "Đồng hành cùng đội ngũ cung ứng vật tư công nghiệp ổn định cho hơn 5000 khách hàng trên toàn quốc.",
  email: "vinakhangtrade@gmail.com",
  defaultBenefits: DEFAULT_JOB_BENEFITS,
};

type ProductRow = {
  slug: string;
  name: string;
  category: string;
  category_label: string;
  english_name: string;
  lead: string;
  mini_specs: MiniSpec[];
  images: string[];
  description: string[];
  specs: Spec[];
  applications: string[];
  featured: boolean;
  status: "show" | "hidden";
  updated_at: Date | string;
};

type ApplicationRow = {
  slug: string;
  title: string;
  tag: string;
  image: string;
  excerpt: string;
  blocks: Block[];
  video: string;
  related_products: string[];
  status: "show" | "hidden";
  updated_at: Date | string;
};

type ArticleRow = {
  slug: string;
  title: string;
  date: string;
  author: string;
  image: string;
  excerpt: string;
  blocks: Block[];
  video: string;
  related_products: string[];
  status: "show" | "hidden";
  updated_at: Date | string;
};

type JobRow = {
  slug: string;
  title: string;
  department: string;
  qty: number;
  job_type: string;
  location: string;
  salary: string;
  deadline: string;
  facts: JobFact[];
  blocks: Block[];
  status: "open" | "paused" | "closed";
  updated_at: Date | string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapProduct(row: ProductRow): CmsProduct {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    categoryLabel: row.category_label,
    englishName: row.english_name,
    lead: row.lead,
    miniSpecs: Array.isArray(row.mini_specs) ? row.mini_specs : [],
    images:
      Array.isArray(row.images) && row.images.length > 0
        ? row.images
        : [DEFAULT_PRODUCT_IMAGE],
    description: Array.isArray(row.description) ? row.description : [],
    specs: Array.isArray(row.specs) ? row.specs : [],
    applications: Array.isArray(row.applications) ? row.applications : [],
    featured: Boolean(row.featured),
    status: row.status === "hidden" ? "hidden" : "show",
    updatedAt: toIso(row.updated_at),
  };
}

function mapApplication(row: ApplicationRow): CmsApplication {
  return {
    slug: row.slug,
    title: row.title,
    tag: row.tag,
    image: row.image || DEFAULT_PRODUCT_IMAGE,
    excerpt: row.excerpt,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    video: row.video || "",
    relatedProducts: Array.isArray(row.related_products)
      ? row.related_products
      : [],
    status: row.status === "hidden" ? "hidden" : "show",
    updatedAt: toIso(row.updated_at),
  };
}

function mapArticle(row: ArticleRow): CmsArticle {
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    author: row.author || "Vina Khang",
    image: row.image || DEFAULT_PRODUCT_IMAGE,
    excerpt: row.excerpt,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    video: row.video || "",
    relatedProducts: Array.isArray(row.related_products)
      ? row.related_products
      : [],
    status: row.status === "hidden" ? "hidden" : "show",
    updatedAt: toIso(row.updated_at),
  };
}

function mapJob(row: JobRow): CmsJob {
  return {
    slug: row.slug,
    title: row.title,
    department: row.department,
    qty: Number(row.qty) || 1,
    jobType: row.job_type || "Toàn thời gian",
    location: row.location || "TP. HCM",
    salary: row.salary || "Thỏa thuận",
    deadline: row.deadline || "",
    facts: Array.isArray(row.facts) ? row.facts : [],
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    status:
      row.status === "paused" || row.status === "closed" ? row.status : "open",
    updatedAt: toIso(row.updated_at),
  };
}

/* ---------- READS ---------- */

export async function listCmsProducts(
  includeHidden = false
): Promise<CmsProduct[]> {
  if (!hasDatabase()) {
    return staticProducts.map((p) => ({
      ...p,
      status: "show",
      updatedAt: "2026-11-14T10:00:00.000Z",
    }));
  }
  const where = includeHidden ? "" : "WHERE status = 'show'";
  const { rows } = await dbQuery<ProductRow>(
    `SELECT * FROM cms_products ${where} ORDER BY sort_order ASC, updated_at DESC`
  );
  return rows.map(mapProduct);
}

export async function getCmsProduct(slug: string): Promise<CmsProduct | null> {
  if (!hasDatabase()) {
    const found = staticProducts.find((p) => p.slug === slug);
    return found
      ? { ...found, status: "show", updatedAt: "2026-11-14T10:00:00.000Z" }
      : null;
  }
  const { rows } = await dbQuery<ProductRow>(
    "SELECT * FROM cms_products WHERE slug = $1",
    [slug]
  );
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function listCmsCategories(): Promise<Category[]> {
  if (!hasDatabase()) return staticCategories;
  const items = await listCmsProducts(false);
  const known = new Set(CATEGORY_OPTIONS.map((c) => c.slug));
  const extraCategories: Category[] = [];
  for (const item of items) {
    if (!known.has(item.category)) {
      known.add(item.category);
      extraCategories.push({
        slug: item.category,
        label: item.categoryLabel || item.category,
        count: items.filter((p) => p.category === item.category).length,
      });
    }
  }
  return [
    ...CATEGORY_OPTIONS.map((cat) => ({
      slug: cat.slug,
      label: cat.label,
      count: items.filter((p) => p.category === cat.slug).length,
    })),
    ...extraCategories,
  ];
}

const STATIC_APP_TAGS: Record<string, string> = {
  "may-mac-ep-keo": "May mặc",
  "giay-dep-ep-dan": "Giày dép",
  "dong-goi-han-mieng-tui": "Đóng gói",
  "che-bien-thuc-pham": "Thực phẩm",
  "in-chuyen-nhiet": "In ấn",
  "thiet-bi-ep-nhiet": "Ép nhiệt",
  "say-xu-ly-be-mat": "Sấy",
  "boc-phu-bao-ve-thiet-bi": "Bảo vệ",
};

export async function listCmsApplications(
  includeHidden = false
): Promise<CmsApplication[]> {
  if (!hasDatabase()) {
    return staticApplications.map((a) => ({
      ...a,
      tag:
        STATIC_APP_TAGS[a.slug] ||
        a.title.split("–")[0]?.trim() ||
        "Công nghiệp",
      video: "",
      status: "show",
      updatedAt: "2026-11-14T10:00:00.000Z",
    }));
  }
  const where = includeHidden ? "" : "WHERE status = 'show'";
  const { rows } = await dbQuery<ApplicationRow>(
    `SELECT * FROM cms_applications ${where} ORDER BY sort_order ASC, updated_at DESC`
  );
  return rows.map(mapApplication);
}

export async function getCmsApplication(
  slug: string
): Promise<CmsApplication | null> {
  if (!hasDatabase()) {
    const found = staticApplications.find((a) => a.slug === slug);
    return found
      ? {
        ...found,
        tag: found.title.split("–")[0]?.trim() || "Công nghiệp",
        video: "",
        status: "show",
        updatedAt: "2026-11-14T10:00:00.000Z",
      }
      : null;
  }
  const { rows } = await dbQuery<ApplicationRow>(
    "SELECT * FROM cms_applications WHERE slug = $1",
    [slug]
  );
  return rows[0] ? mapApplication(rows[0]) : null;
}

export async function listCmsArticles(
  includeHidden = false
): Promise<CmsArticle[]> {
  if (!hasDatabase()) {
    return staticArticles.map((a) => ({
      ...a,
      author: "Vina Khang",
      video: "",
      status: "show",
      updatedAt: "2026-11-14T10:00:00.000Z",
    }));
  }
  const where = includeHidden ? "" : "WHERE status = 'show'";
  const { rows } = await dbQuery<ArticleRow>(
    `SELECT * FROM cms_articles ${where} ORDER BY sort_order ASC, updated_at DESC`
  );
  return rows.map(mapArticle);
}

export async function getCmsArticle(slug: string): Promise<CmsArticle | null> {
  if (!hasDatabase()) {
    const found = staticArticles.find((a) => a.slug === slug);
    return found
      ? {
        ...found,
        author: "Vina Khang",
        video: "",
        status: "show",
        updatedAt: "2026-11-14T10:00:00.000Z",
      }
      : null;
  }
  const { rows } = await dbQuery<ArticleRow>(
    "SELECT * FROM cms_articles WHERE slug = $1",
    [slug]
  );
  return rows[0] ? mapArticle(rows[0]) : null;
}

export async function listCmsJobs(includeAll = false): Promise<CmsJob[]> {
  if (!hasDatabase()) {
    return staticJobs.map((j) => ({
      ...j,
      qty: 1,
      jobType: "Toàn thời gian",
      location: "TP. HCM",
      salary: "Thỏa thuận",
      deadline: "",
      status: "open",
      updatedAt: "2026-11-14T10:00:00.000Z",
    }));
  }
  const where = includeAll ? "" : "WHERE status = 'open'";
  const { rows } = await dbQuery<JobRow>(
    `SELECT * FROM cms_jobs ${where} ORDER BY sort_order ASC, updated_at DESC`
  );
  const mapped = rows.map(mapJob);
  if (includeAll) return mapped;
  return mapped.filter((job) => !isJobExpired(job.deadline));
}

export async function getCmsJob(slug: string): Promise<CmsJob | null> {
  if (!hasDatabase()) {
    const found = staticJobs.find((j) => j.slug === slug);
    return found
      ? {
        ...found,
        qty: 1,
        jobType: "Toàn thời gian",
        location: "TP. HCM",
        salary: "Thỏa thuận",
        deadline: "",
        status: "open",
        updatedAt: "2026-11-14T10:00:00.000Z",
      }
      : null;
  }
  const { rows } = await dbQuery<JobRow>(
    "SELECT * FROM cms_jobs WHERE slug = $1",
    [slug]
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function getRecruitmentSettings(): Promise<RecruitmentSettings> {
  if (!hasDatabase()) return DEFAULT_RECRUITMENT;
  const { rows } = await dbQuery<{ value: RecruitmentSettings }>(
    "SELECT value FROM cms_settings WHERE key = 'recruitment'"
  );
  return rows[0]?.value
    ? {
      ...DEFAULT_RECRUITMENT,
      ...rows[0].value,
      defaultBenefits:
        rows[0].value.defaultBenefits || DEFAULT_JOB_BENEFITS,
    }
    : DEFAULT_RECRUITMENT;
}

export async function getBannerSettings(
  providedProducts?: CmsProduct[]
): Promise<BannerSettings> {
  const products = providedProducts ?? (await listCmsProducts(false));
  if (!hasDatabase()) {
    return {
      ...DEFAULT_BANNER_SETTINGS,
      productSlugs: resolveBannerProductSlugs(undefined, products),
    };
  }
  const { rows } = await dbQuery<{ value: Partial<BannerSettings> }>(
    "SELECT value FROM cms_settings WHERE key = 'home_banner'"
  );
  const stored = rows[0]?.value;
  const rawInterval =
    Number(stored?.intervalMs) || DEFAULT_BANNER_SETTINGS.intervalMs;
  return {
    enabled: stored?.enabled === undefined ? true : Boolean(stored.enabled),
    title: stored?.title?.trim() || DEFAULT_BANNER_SETTINGS.title,
    subtitle: stored?.subtitle?.trim() || DEFAULT_BANNER_SETTINGS.subtitle,
    intervalMs: Math.min(10_000, Math.max(2_500, Math.round(rawInterval))),
    productSlugs: resolveBannerProductSlugs(stored?.productSlugs, products),
  };
}

export async function getResolvedBannerData(): Promise<{
  settings: BannerSettings;
  products: CmsProduct[];
  allVisibleProducts: CmsProduct[];
}> {
  const visibleProducts = await listCmsProducts(false);
  const settings = await getBannerSettings(visibleProducts);
  const bySlug = new Map(visibleProducts.map((p) => [p.slug, p]));
  const ordered = settings.productSlugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is CmsProduct => Boolean(p));
  return {
    settings,
    products: ordered,
    allVisibleProducts: visibleProducts,
  };
}

/* ---------- WRITES (PostgreSQL) ---------- */

function requireDb() {
  if (!hasDatabase()) {
    throw new Error(
      "Chưa kết nối PostgreSQL (DATABASE_URL). Hãy chạy qua Docker Compose hoặc cấu hình DATABASE_URL."
    );
  }
}

const ENTITY_TABLE = {
  products: "cms_products",
  applications: "cms_applications",
  articles: "cms_articles",
  jobs: "cms_jobs",
} as const;

type CmsEntityKey = keyof typeof ENTITY_TABLE;

async function assertSlugAvailable(
  entity: CmsEntityKey,
  targetSlug: string,
  originalSlug?: string
): Promise<void> {
  if (originalSlug && originalSlug === targetSlug) return;
  const table = ENTITY_TABLE[entity];
  const { rows } = await dbQuery<{ slug: string }>(
    `SELECT slug FROM ${table} WHERE slug = $1 LIMIT 1`,
    [targetSlug]
  );
  if (rows.length > 0) {
    throw new Error(
      `Đường dẫn (slug) "${targetSlug}" đã tồn tại. Vui lòng nhập đường dẫn khác.`
    );
  }
}

async function listExistingSlugs(entity: CmsEntityKey): Promise<string[]> {
  const table = ENTITY_TABLE[entity];
  const { rows } = await dbQuery<{ slug: string }>(`SELECT slug FROM ${table}`);
  return rows.map((r) => r.slug);
}

/**
 * Replaces `oldSlug` with `newSlug` (or removes `oldSlug` when `newSlug` is null)
 * across `related_products` JSONB arrays in `cms_applications` and `cms_articles`.
 */
async function syncRelatedProductReferences(
  oldSlug: string,
  newSlug: string | null
): Promise<void> {
  for (const table of ["cms_applications", "cms_articles"] as const) {
    if (newSlug) {
      await dbQuery(
        `UPDATE ${table}
         SET related_products = (
           SELECT COALESCE(jsonb_agg(DISTINCT CASE WHEN elem = $1 THEN $2 ELSE elem END), '[]'::jsonb)
           FROM jsonb_array_elements_text(related_products) AS elem
         ),
         updated_at = NOW()
         WHERE related_products ? $1`,
        [oldSlug, newSlug]
      );
    } else {
      await dbQuery(
        `UPDATE ${table}
         SET related_products = (
           SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
           FROM jsonb_array_elements_text(related_products) AS elem
           WHERE elem <> $1
         ),
         updated_at = NOW()
         WHERE related_products ? $1`,
        [oldSlug]
      );
    }
  }

  // Also keep `home_banner` productSlugs in sync when a product is renamed or deleted
  const { rows } = await dbQuery<{ value: Partial<BannerSettings> }>(
    "SELECT value FROM cms_settings WHERE key = 'home_banner'"
  );
  if (rows[0]?.value && Array.isArray(rows[0].value.productSlugs)) {
    const nextSlugs = newSlug
      ? Array.from(
          new Set(
            rows[0].value.productSlugs.map((s) => (s === oldSlug ? newSlug : s))
          )
        )
      : rows[0].value.productSlugs.filter((s) => s !== oldSlug);
    await dbQuery(
      `UPDATE cms_settings
       SET value = $1::jsonb, updated_at = NOW()
       WHERE key = 'home_banner'`,
      [JSON.stringify({ ...rows[0].value, productSlugs: nextSlugs })]
    );
  }
}

export async function saveCmsProduct(input: {
  originalSlug?: string;
  slug?: string;
  name: string;
  category: string;
  categoryLabel?: string;
  englishName?: string;
  lead?: string;
  miniSpecs?: MiniSpec[];
  images?: string[];
  description?: string[];
  specs?: Spec[];
  applications?: string[];
  featured?: boolean;
  status?: "show" | "hidden";
}): Promise<CmsProduct> {
  requireDb();
  const cleanName = sanitizePlainText(input.name);
  if (!cleanName) throw new Error("Vui lòng nhập tên sản phẩm.");

  const slug = resolveTargetSlug({
    originalSlug: input.originalSlug,
    slug: input.slug,
    fallbackTitle: cleanName,
  });
  if (!slug) throw new Error("Tên hoặc slug sản phẩm không hợp lệ.");

  await assertSlugAvailable("products", slug, input.originalSlug);

  const category = slugify(input.category || "vai") || "vai";
  const categoryLabel =
    sanitizePlainText(input.categoryLabel) || categoryLabelFor(category);

  const cleanedImages = (input.images ?? [])
    .map((img) => sanitizeImageUrl(img))
    .filter(Boolean);
  const images =
    cleanedImages.length > 0 ? cleanedImages : [DEFAULT_PRODUCT_IMAGE];

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_products WHERE slug = $1", [
      input.originalSlug,
    ]);
    await syncRelatedProductReferences(input.originalSlug, slug);
  }

  const { rows } = await dbQuery<ProductRow>(
    `INSERT INTO cms_products (
      slug, name, category, category_label, english_name, lead,
      mini_specs, images, description, specs, applications, featured, status, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      category_label = EXCLUDED.category_label,
      english_name = EXCLUDED.english_name,
      lead = EXCLUDED.lead,
      mini_specs = EXCLUDED.mini_specs,
      images = EXCLUDED.images,
      description = EXCLUDED.description,
      specs = EXCLUDED.specs,
      applications = EXCLUDED.applications,
      featured = EXCLUDED.featured,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *`,
    [
      slug,
      cleanName,
      category,
      categoryLabel,
      sanitizePlainText(input.englishName),
      sanitizePlainText(input.lead),
      JSON.stringify(sanitizeMiniSpecs(input.miniSpecs)),
      JSON.stringify(images),
      JSON.stringify(
        (input.description ?? []).map((d) => sanitizePlainText(d)).filter(Boolean)
      ),
      JSON.stringify(sanitizeSpecs(input.specs)),
      JSON.stringify(
        (input.applications ?? []).map((a) => sanitizePlainText(a)).filter(Boolean)
      ),
      Boolean(input.featured),
      input.status === "hidden" ? "hidden" : "show",
    ]
  );
  return mapProduct(rows[0]);
}

export async function deleteCmsProduct(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_products WHERE slug = $1", [slug]);
  await syncRelatedProductReferences(slug, null);
}

export async function toggleCmsProductStatus(
  slug: string
): Promise<CmsProduct | null> {
  requireDb();
  const { rows } = await dbQuery<ProductRow>(
    `UPDATE cms_products
     SET status = CASE WHEN status = 'show' THEN 'hidden' ELSE 'show' END,
         updated_at = NOW()
     WHERE slug = $1
     RETURNING *`,
    [slug]
  );
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function duplicateCmsProduct(
  slug: string
): Promise<CmsProduct | null> {
  requireDb();
  const current = await getCmsProduct(slug);
  if (!current) return null;
  const existing = await listExistingSlugs("products");
  const copySlug = nextCopySlug(current.slug, existing);
  return saveCmsProduct({
    ...current,
    originalSlug: undefined,
    slug: copySlug,
    name: `${current.name.replace(/\s*\(bản sao(?:\s*\d+)?\)$/i, "")} (bản sao)`,
    status: "hidden",
    featured: false,
  });
}

export async function saveCmsApplication(input: {
  originalSlug?: string;
  slug?: string;
  title: string;
  tag?: string;
  image?: string;
  excerpt?: string;
  blocks?: Block[];
  video?: string;
  relatedProducts?: string[];
  status?: "show" | "hidden";
}): Promise<CmsApplication> {
  requireDb();
  const cleanTitle = sanitizePlainText(input.title);
  if (!cleanTitle) throw new Error("Vui lòng nhập tiêu đề bài ứng dụng.");

  const slug = resolveTargetSlug({
    originalSlug: input.originalSlug,
    slug: input.slug,
    fallbackTitle: cleanTitle,
  });
  if (!slug) throw new Error("Tiêu đề hoặc slug ứng dụng không hợp lệ.");

  await assertSlugAvailable("applications", slug, input.originalSlug);

  const image = sanitizeImageUrl(input.image) || DEFAULT_PRODUCT_IMAGE;
  const video = sanitizeSafeUrl(input.video);
  const existingProducts = new Set(await listExistingSlugs("products"));
  const relatedProducts = Array.from(
    new Set(
      (input.relatedProducts ?? [])
        .map((s) => slugify(String(s)))
        .filter((s) => s && existingProducts.has(s))
    )
  );

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_applications WHERE slug = $1", [
      input.originalSlug,
    ]);
  }

  const { rows } = await dbQuery<ApplicationRow>(
    `INSERT INTO cms_applications (
      slug, title, tag, image, excerpt, blocks, video, related_products, status, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      tag = EXCLUDED.tag,
      image = EXCLUDED.image,
      excerpt = EXCLUDED.excerpt,
      blocks = EXCLUDED.blocks,
      video = EXCLUDED.video,
      related_products = EXCLUDED.related_products,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *`,
    [
      slug,
      cleanTitle,
      sanitizePlainText(input.tag) || "Công nghiệp",
      image,
      sanitizePlainText(input.excerpt),
      JSON.stringify(sanitizeBlocks(input.blocks)),
      video,
      JSON.stringify(relatedProducts),
      input.status === "hidden" ? "hidden" : "show",
    ]
  );
  return mapApplication(rows[0]);
}

export async function deleteCmsApplication(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_applications WHERE slug = $1", [slug]);
}

export async function toggleCmsApplicationStatus(
  slug: string
): Promise<CmsApplication | null> {
  requireDb();
  const { rows } = await dbQuery<ApplicationRow>(
    `UPDATE cms_applications
     SET status = CASE WHEN status = 'show' THEN 'hidden' ELSE 'show' END,
         updated_at = NOW()
     WHERE slug = $1
     RETURNING *`,
    [slug]
  );
  return rows[0] ? mapApplication(rows[0]) : null;
}

export async function duplicateCmsApplication(
  slug: string
): Promise<CmsApplication | null> {
  requireDb();
  const current = await getCmsApplication(slug);
  if (!current) return null;
  const existing = await listExistingSlugs("applications");
  const copySlug = nextCopySlug(current.slug, existing);
  return saveCmsApplication({
    ...current,
    originalSlug: undefined,
    slug: copySlug,
    title: `${current.title.replace(/\s*\(bản sao(?:\s*\d+)?\)$/i, "")} (bản sao)`,
    status: "hidden",
  });
}

export async function saveCmsArticle(input: {
  originalSlug?: string;
  slug?: string;
  title: string;
  date?: string;
  author?: string;
  image?: string;
  excerpt?: string;
  blocks?: Block[];
  video?: string;
  relatedProducts?: string[];
  status?: "show" | "hidden";
}): Promise<CmsArticle> {
  requireDb();
  const cleanTitle = sanitizePlainText(input.title);
  if (!cleanTitle) throw new Error("Vui lòng nhập tiêu đề bài viết.");

  const slug = resolveTargetSlug({
    originalSlug: input.originalSlug,
    slug: input.slug,
    fallbackTitle: cleanTitle,
  });
  if (!slug) throw new Error("Tiêu đề hoặc slug bài viết không hợp lệ.");

  await assertSlugAvailable("articles", slug, input.originalSlug);

  const image = sanitizeImageUrl(input.image) || DEFAULT_PRODUCT_IMAGE;
  const video = sanitizeSafeUrl(input.video);
  const existingProducts = new Set(await listExistingSlugs("products"));
  const relatedProducts = Array.from(
    new Set(
      (input.relatedProducts ?? [])
        .map((s) => slugify(String(s)))
        .filter((s) => s && existingProducts.has(s))
    )
  );

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_articles WHERE slug = $1", [
      input.originalSlug,
    ]);
  }

  const today = todayDisplayVN();
  const { rows } = await dbQuery<ArticleRow>(
    `INSERT INTO cms_articles (
      slug, title, date, author, image, excerpt, blocks, video, related_products, status, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      date = EXCLUDED.date,
      author = EXCLUDED.author,
      image = EXCLUDED.image,
      excerpt = EXCLUDED.excerpt,
      blocks = EXCLUDED.blocks,
      video = EXCLUDED.video,
      related_products = EXCLUDED.related_products,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *`,
    [
      slug,
      cleanTitle,
      sanitizePlainText(input.date) || today,
      sanitizePlainText(input.author) || "Vina Khang",
      image,
      sanitizePlainText(input.excerpt),
      JSON.stringify(sanitizeBlocks(input.blocks)),
      video,
      JSON.stringify(relatedProducts),
      input.status === "hidden" ? "hidden" : "show",
    ]
  );
  return mapArticle(rows[0]);
}

export async function deleteCmsArticle(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_articles WHERE slug = $1", [slug]);
}

export async function toggleCmsArticleStatus(
  slug: string
): Promise<CmsArticle | null> {
  requireDb();
  const { rows } = await dbQuery<ArticleRow>(
    `UPDATE cms_articles
     SET status = CASE WHEN status = 'show' THEN 'hidden' ELSE 'show' END,
         updated_at = NOW()
     WHERE slug = $1
     RETURNING *`,
    [slug]
  );
  return rows[0] ? mapArticle(rows[0]) : null;
}

export async function duplicateCmsArticle(
  slug: string
): Promise<CmsArticle | null> {
  requireDb();
  const current = await getCmsArticle(slug);
  if (!current) return null;
  const existing = await listExistingSlugs("articles");
  const copySlug = nextCopySlug(current.slug, existing);
  return saveCmsArticle({
    ...current,
    originalSlug: undefined,
    slug: copySlug,
    title: `${current.title.replace(/\s*\(bản sao(?:\s*\d+)?\)$/i, "")} (bản sao)`,
    date: todayDisplayVN(),
    status: "hidden",
  });
}

export async function saveCmsJob(input: {
  originalSlug?: string;
  slug?: string;
  title: string;
  department?: string;
  qty?: number;
  jobType?: string;
  location?: string;
  salary?: string;
  deadline?: string;
  blocks?: Block[];
  status?: "open" | "paused" | "closed";
}): Promise<CmsJob> {
  requireDb();
  const cleanTitle = sanitizePlainText(input.title);
  if (!cleanTitle) throw new Error("Vui lòng nhập tên vị trí tuyển dụng.");

  const slug = resolveTargetSlug({
    originalSlug: input.originalSlug,
    slug: input.slug,
    fallbackTitle: cleanTitle,
  });
  if (!slug) throw new Error("Tên hoặc slug vị trí không hợp lệ.");

  await assertSlugAvailable("jobs", slug, input.originalSlug);

  const qty = Math.max(1, Number(input.qty) || 1);
  const jobType = sanitizePlainText(input.jobType) || "Toàn thời gian";
  const location = sanitizePlainText(input.location) || "TP. HCM";
  const salary = sanitizePlainText(input.salary) || "Thỏa thuận";
  const deadline = normalizeDeadlineIso(input.deadline ?? "");
  const facts: JobFact[] = [
    { label: "Số lượng", value: `${qty} người` },
    { label: "Hình thức", value: jobType },
    { label: "Địa điểm", value: location },
    { label: "Mức lương", value: salary },
  ];
  if (deadline) {
    const [y, m, d] = deadline.split("-");
    facts.push({ label: "Hạn nộp", value: `${d}/${m}/${y}` });
  }

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_jobs WHERE slug = $1", [input.originalSlug]);
  }

  const status =
    input.status === "paused" || input.status === "closed"
      ? input.status
      : "open";

  const { rows } = await dbQuery<JobRow>(
    `INSERT INTO cms_jobs (
      slug, title, department, qty, job_type, location, salary, deadline, facts, blocks, status, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      department = EXCLUDED.department,
      qty = EXCLUDED.qty,
      job_type = EXCLUDED.job_type,
      location = EXCLUDED.location,
      salary = EXCLUDED.salary,
      deadline = EXCLUDED.deadline,
      facts = EXCLUDED.facts,
      blocks = EXCLUDED.blocks,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *`,
    [
      slug,
      cleanTitle,
      sanitizePlainText(input.department) || "Tổng hợp",
      qty,
      jobType,
      location,
      salary,
      deadline,
      JSON.stringify(facts),
      JSON.stringify(sanitizeBlocks(input.blocks)),
      status,
    ]
  );
  return mapJob(rows[0]);
}

export async function deleteCmsJob(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_jobs WHERE slug = $1", [slug]);
}

export async function toggleCmsJobStatus(
  slug: string
): Promise<CmsJob | null> {
  requireDb();
  const { rows } = await dbQuery<JobRow>(
    `UPDATE cms_jobs
     SET status = CASE WHEN status = 'open' THEN 'paused' ELSE 'open' END,
         updated_at = NOW()
     WHERE slug = $1
     RETURNING *`,
    [slug]
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function duplicateCmsJob(slug: string): Promise<CmsJob | null> {
  requireDb();
  const current = await getCmsJob(slug);
  if (!current) return null;
  const existing = await listExistingSlugs("jobs");
  const copySlug = nextCopySlug(current.slug, existing);
  return saveCmsJob({
    ...current,
    originalSlug: undefined,
    slug: copySlug,
    title: `${current.title.replace(/\s*\(bản sao(?:\s*\d+)?\)$/i, "")} (bản sao)`,
    status: "paused",
  });
}

export async function bulkUpdateCmsStatus(
  entity: CmsEntityKey,
  slugs: string[],
  status: string
): Promise<number> {
  requireDb();
  const cleanSlugs = slugs.map((s) => slugify(s)).filter(Boolean);
  if (cleanSlugs.length === 0) return 0;

  const table = ENTITY_TABLE[entity];
  const validStatus =
    entity === "jobs"
      ? status === "paused" || status === "closed"
        ? status
        : "open"
      : status === "hidden"
        ? "hidden"
        : "show";

  const res = await dbQuery(
    `UPDATE ${table}
     SET status = $1, updated_at = NOW()
     WHERE slug = ANY($2::text[])`,
    [validStatus, cleanSlugs]
  );
  return res.rowCount ?? 0;
}

export async function bulkDeleteCms(
  entity: CmsEntityKey,
  slugs: string[]
): Promise<number> {
  requireDb();
  const cleanSlugs = slugs.map((s) => slugify(s)).filter(Boolean);
  if (cleanSlugs.length === 0) return 0;

  const table = ENTITY_TABLE[entity];
  const res = await dbQuery(
    `DELETE FROM ${table} WHERE slug = ANY($1::text[])`,
    [cleanSlugs]
  );

  if (entity === "products") {
    for (const slug of cleanSlugs) {
      await syncRelatedProductReferences(slug, null);
    }
  }
  return res.rowCount ?? 0;
}

export async function saveRecruitmentSettings(
  input: RecruitmentSettings
): Promise<RecruitmentSettings> {
  requireDb();
  const value: RecruitmentSettings = {
    intro: sanitizePlainText(input.intro),
    email: sanitizePlainText(input.email),
    defaultBenefits:
      typeof input.defaultBenefits === "string"
        ? sanitizePlainText(input.defaultBenefits)
        : DEFAULT_JOB_BENEFITS,
  };
  await dbQuery(
    `INSERT INTO cms_settings (key, value, updated_at)
     VALUES ('recruitment', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(value)]
  );
  return value;
}

export async function saveBannerSettings(input: {
  enabled?: unknown;
  title?: unknown;
  subtitle?: unknown;
  intervalMs?: unknown;
  productSlugs?: unknown;
}): Promise<BannerSettings> {
  requireDb();
  const existingSlugs = new Set(await listExistingSlugs("products"));
  const validated = validateBannerSettingsInput(input, existingSlugs);
  await dbQuery(
    `INSERT INTO cms_settings (key, value, updated_at)
     VALUES ('home_banner', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(validated)]
  );
  return validated;
}

export async function exportCmsSnapshot() {
  const [products, applications, articles, jobs, recruitment] =
    await Promise.all([
      listCmsProducts(true),
      listCmsApplications(true),
      listCmsArticles(true),
      listCmsJobs(true),
      getRecruitmentSettings(),
    ]);
  const banner = await getBannerSettings(products);
  return {
    exportedAt: new Date().toISOString(),
    products,
    applications,
    articles,
    jobs,
    settings: { recruitment, banner },
  };
}

/**
 * Replaces CMS content tables atomically from a validated JSON snapshot
 * while keeping `quote_requests` and `contact_messages` untouched.
 */
export async function importCmsSnapshot(
  raw: unknown
): Promise<SnapshotValidationResult> {
  requireDb();
  await ensureSchema();
  const validated = validateAndNormalizeSnapshot(raw);
  const { snapshot } = validated;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE cms_products, cms_applications, cms_articles, cms_jobs"
    );

    for (let i = 0; i < snapshot.products.length; i += 1) {
      const p = snapshot.products[i];
      await client.query(
        `INSERT INTO cms_products (
          slug, name, category, category_label, english_name, lead,
          mini_specs, images, description, specs, applications, featured, status, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,NOW())`,
        [
          p.slug,
          p.name,
          p.category,
          p.categoryLabel,
          p.englishName,
          p.lead,
          JSON.stringify(p.miniSpecs),
          JSON.stringify(p.images),
          JSON.stringify(p.description),
          JSON.stringify(p.specs),
          JSON.stringify(p.applications),
          p.featured,
          p.status,
          i,
        ]
      );
    }

    for (let i = 0; i < snapshot.applications.length; i += 1) {
      const a = snapshot.applications[i];
      await client.query(
        `INSERT INTO cms_applications (
          slug, title, tag, image, excerpt, blocks, video, related_products, status, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10,NOW())`,
        [
          a.slug,
          a.title,
          a.tag,
          a.image,
          a.excerpt,
          JSON.stringify(a.blocks),
          a.video,
          JSON.stringify(a.relatedProducts),
          a.status,
          i,
        ]
      );
    }

    for (let i = 0; i < snapshot.articles.length; i += 1) {
      const a = snapshot.articles[i];
      await client.query(
        `INSERT INTO cms_articles (
          slug, title, date, author, image, excerpt, blocks, video, related_products, status, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10,$11,NOW())`,
        [
          a.slug,
          a.title,
          a.date,
          a.author,
          a.image,
          a.excerpt,
          JSON.stringify(a.blocks),
          a.video,
          JSON.stringify(a.relatedProducts),
          a.status,
          i,
        ]
      );
    }

    for (let i = 0; i < snapshot.jobs.length; i += 1) {
      const j = snapshot.jobs[i];
      await client.query(
        `INSERT INTO cms_jobs (
          slug, title, department, qty, job_type, location, salary, deadline, facts, blocks, status, sort_order, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,NOW())`,
        [
          j.slug,
          j.title,
          j.department,
          j.qty,
          j.jobType,
          j.location,
          j.salary,
          j.deadline,
          JSON.stringify(j.facts),
          JSON.stringify(j.blocks),
          j.status,
          i,
        ]
      );
    }

    if (snapshot.recruitment) {
      await client.query(
        `INSERT INTO cms_settings (key, value, updated_at)
         VALUES ('recruitment', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [
          JSON.stringify({
            ...DEFAULT_RECRUITMENT,
            ...snapshot.recruitment,
          }),
        ]
      );
    }

    if (snapshot.banner) {
      await client.query(
        `INSERT INTO cms_settings (key, value, updated_at)
         VALUES ('home_banner', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(snapshot.banner)]
      );
    }

    await client.query("COMMIT");
    return validated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { resetCmsToSeed };
