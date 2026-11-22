import {
  applications as staticApplications,
  articles as staticArticles,
  categories as staticCategories,
  jobs as staticJobs,
  products as staticProducts,
} from "./content";
import { dbQuery, hasDatabase, resetCmsToSeed } from "./db";
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

export const CATEGORY_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "vai", label: "Vải Teflon chịu nhiệt" },
  { slug: "bangkeo", label: "Băng keo chịu nhiệt" },
  { slug: "epkeo", label: "Băng tải máy ép keo" },
  { slug: "bangtai", label: "Băng tải Teflon" },
  { slug: "daydai", label: "Dây đai hàn nhiệt" },
];

export function categoryLabelFor(slug: string): string {
  return CATEGORY_OPTIONS.find((c) => c.slug === slug)?.label ?? slug;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
};

const DEFAULT_RECRUITMENT: RecruitmentSettings = {
  intro:
    "Đồng hành cùng đội ngũ cung ứng vật tư công nghiệp ổn định cho hơn 5000 khách hàng trên toàn quốc.",
  email: "vinakhangtrade@gmail.com",
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
        : ["/images/products/vai-chiu-nhiet-cao-cap.webp"],
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
    image: row.image || "/images/products/vai-chiu-nhiet-cao-cap.webp",
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
    image: row.image || "/images/products/vai-chiu-nhiet-cao-cap.webp",
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

export async function listCmsProducts(includeHidden = false): Promise<CmsProduct[]> {
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
  return CATEGORY_OPTIONS.map((cat) => ({
    slug: cat.slug,
    label: cat.label,
    count: items.filter((p) => p.category === cat.slug).length,
  }));
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
      tag: STATIC_APP_TAGS[a.slug] || a.title.split("–")[0]?.trim() || "Công nghiệp",
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
  return rows.map(mapJob);
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
    ? { ...DEFAULT_RECRUITMENT, ...rows[0].value }
    : DEFAULT_RECRUITMENT;
}

/* ---------- WRITES (PostgreSQL) ---------- */

function requireDb() {
  if (!hasDatabase()) {
    throw new Error(
      "Chưa kết nối PostgreSQL (DATABASE_URL). Hãy chạy qua Docker Compose hoặc cấu hình DATABASE_URL."
    );
  }
}

export async function saveCmsProduct(input: {
  originalSlug?: string;
  slug?: string;
  name: string;
  category: string;
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
  const slug = slugify(input.slug?.trim() || input.name);
  if (!slug) throw new Error("Tên hoặc slug sản phẩm không hợp lệ.");

  const categoryLabel = categoryLabelFor(input.category);
  const images =
    input.images && input.images.length > 0
      ? input.images
      : ["/images/products/vai-chiu-nhiet-cao-cap.webp"];

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_products WHERE slug = $1", [
      input.originalSlug,
    ]);
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
      input.name.trim(),
      input.category,
      categoryLabel,
      (input.englishName ?? "").trim(),
      (input.lead ?? "").trim(),
      JSON.stringify(input.miniSpecs ?? []),
      JSON.stringify(images),
      JSON.stringify(input.description ?? []),
      JSON.stringify(input.specs ?? []),
      JSON.stringify(input.applications ?? []),
      Boolean(input.featured),
      input.status === "hidden" ? "hidden" : "show",
    ]
  );
  return mapProduct(rows[0]);
}

export async function deleteCmsProduct(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_products WHERE slug = $1", [slug]);
}

export async function toggleCmsProductStatus(slug: string): Promise<CmsProduct | null> {
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

export async function duplicateCmsProduct(slug: string): Promise<CmsProduct | null> {
  requireDb();
  const current = await getCmsProduct(slug);
  if (!current) return null;
  const copySlug = `${current.slug}-copy-${Date.now().toString(36).slice(-4)}`;
  return saveCmsProduct({
    ...current,
    slug: copySlug,
    name: `${current.name} (bản sao)`,
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
  const slug = slugify(input.slug?.trim() || input.title);
  if (!slug) throw new Error("Tiêu đề hoặc slug ứng dụng không hợp lệ.");

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
      input.title.trim(),
      (input.tag ?? "").trim(),
      (input.image ?? "").trim() || "/images/products/vai-chiu-nhiet-cao-cap.webp",
      (input.excerpt ?? "").trim(),
      JSON.stringify(input.blocks ?? []),
      (input.video ?? "").trim(),
      JSON.stringify(input.relatedProducts ?? []),
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
  const slug = slugify(input.slug?.trim() || input.title);
  if (!slug) throw new Error("Tiêu đề hoặc slug bài viết không hợp lệ.");

  if (input.originalSlug && input.originalSlug !== slug) {
    await dbQuery("DELETE FROM cms_articles WHERE slug = $1", [
      input.originalSlug,
    ]);
  }

  const today = new Date().toLocaleDateString("vi-VN");
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
      input.title.trim(),
      (input.date ?? "").trim() || today,
      (input.author ?? "").trim() || "Vina Khang",
      (input.image ?? "").trim() || "/images/products/vai-chiu-nhiet-cao-cap.webp",
      (input.excerpt ?? "").trim(),
      JSON.stringify(input.blocks ?? []),
      (input.video ?? "").trim(),
      JSON.stringify(input.relatedProducts ?? []),
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
  const slug = slugify(input.slug?.trim() || input.title);
  if (!slug) throw new Error("Tên hoặc slug vị trí không hợp lệ.");

  const qty = Math.max(1, Number(input.qty) || 1);
  const jobType = (input.jobType ?? "").trim() || "Toàn thời gian";
  const location = (input.location ?? "").trim() || "TP. HCM";
  const salary = (input.salary ?? "").trim() || "Thỏa thuận";
  const facts: JobFact[] = [
    { label: "Số lượng", value: `${qty} người` },
    { label: "Hình thức", value: jobType },
    { label: "Địa điểm", value: location },
    { label: "Mức lương", value: salary },
  ];

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
      input.title.trim(),
      (input.department ?? "").trim() || "Tổng hợp",
      qty,
      jobType,
      location,
      salary,
      (input.deadline ?? "").trim(),
      JSON.stringify(facts),
      JSON.stringify(input.blocks ?? []),
      status,
    ]
  );
  return mapJob(rows[0]);
}

export async function deleteCmsJob(slug: string): Promise<void> {
  requireDb();
  await dbQuery("DELETE FROM cms_jobs WHERE slug = $1", [slug]);
}

export async function toggleCmsJobStatus(slug: string): Promise<CmsJob | null> {
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

export async function saveRecruitmentSettings(
  input: RecruitmentSettings
): Promise<RecruitmentSettings> {
  requireDb();
  const value: RecruitmentSettings = {
    intro: input.intro.trim(),
    email: input.email.trim(),
  };
  await dbQuery(
    `INSERT INTO cms_settings (key, value, updated_at)
     VALUES ('recruitment', $1::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(value)]
  );
  return value;
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
  return {
    exportedAt: new Date().toISOString(),
    products,
    applications,
    articles,
    jobs,
    settings: { recruitment },
  };
}

export { resetCmsToSeed };
