import productCategories from "@/data/product-categories.json";
import type {
  Block,
  JobFact,
  MiniSpec,
  Spec,
} from "./types";

export const DEFAULT_PRODUCT_IMAGE =
  "/images/products/vai-chiu-nhiet-cao-cap.webp";

export const DEFAULT_JOB_BENEFITS = [
  "Lương thỏa thuận theo năng lực, xét điều chỉnh định kỳ hằng năm.",
  "Đóng BHXH, BHYT, BHTN đầy đủ theo quy định pháp luật.",
  "Thưởng lễ, Tết, lương tháng 13 và phụ cấp theo vị trí công việc.",
  "Được hướng dẫn kiến thức chuyên môn vật liệu công nghiệp và quy trình gia công.",
].join("\n");

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

/**
 * Returns YYYY-MM-DD in Vietnam timezone (Asia/Ho_Chi_Minh),
 * preventing UTC 00:00–07:00 off-by-one date bugs.
 */
export function todayIsoVN(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Returns DD/MM/YYYY in Vietnam timezone (Asia/Ho_Chi_Minh).
 */
export function todayDisplayVN(now: Date = new Date()): string {
  const [year, month, day] = todayIsoVN(now).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Parses YYYY-MM-DD or DD/MM/YYYY into YYYY-MM-DD, or "" if invalid.
 */
export function normalizeDeadlineIso(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }
  return "";
}

/**
 * Checks whether a job deadline has passed compared to today in Vietnam time.
 */
export function isJobExpired(deadline: string, now: Date = new Date()): boolean {
  const iso = normalizeDeadlineIso(deadline);
  if (!iso) return false;
  return iso < todayIsoVN(now);
}

/**
 * Resolves target slug:
 * - Uses explicit `slug` if provided
 * - Preserves `originalSlug` when editing an existing item if `slug` input was cleared
 * - Falls back to `fallbackTitle` only when creating a new item
 */
export function resolveTargetSlug(input: {
  originalSlug?: string;
  slug?: string;
  fallbackTitle: string;
}): string {
  const explicit = slugify(input.slug?.trim() ?? "");
  if (explicit) return explicit;
  const original = slugify(input.originalSlug?.trim() ?? "");
  if (original) return original;
  return slugify(input.fallbackTitle);
}

/**
 * Generates a guaranteed-unique copy slug:
 * `foo` -> `foo-copy`, `foo-copy-2`, `foo-copy-3`, ...
 */
export function nextCopySlug(
  sourceSlug: string,
  existingSlugs: Iterable<string>
): string {
  const taken = new Set(Array.from(existingSlugs, (s) => s.toLowerCase()));
  const stem = sourceSlug.replace(/-copy(?:-\d+)?$/i, "") || "ban-sao";
  const first = `${stem}-copy`;
  if (!taken.has(first.toLowerCase())) return first;
  let index = 2;
  while (taken.has(`${stem}-copy-${index}`.toLowerCase())) {
    index += 1;
  }
  return `${stem}-copy-${index}`;
}

/**
 * Strips dangerous HTML/script payloads from plain text fields.
 */
export function sanitizePlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .trim();
}

/**
 * Validates and normalizes image URLs:
 * - Blocks `javascript:`, `vbscript:`, non-image `data:` URIs
 * - Auto-upgrades external `http://` URLs to `https://` to prevent mixed content
 */
export function sanitizeImageUrl(
  raw: unknown,
  options?: { trackUpgrades?: string[] }
): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^(javascript|vbscript|file):/i.test(trimmed)) {
    throw new Error("Đường dẫn ảnh chứa giao thức không an toàn.");
  }

  if (/^data:/i.test(trimmed)) {
    if (!/^data:image\/(webp|png|jpeg|jpg|gif);base64,/i.test(trimmed)) {
      throw new Error("Chỉ chấp nhận ảnh định dạng WebP, PNG, JPEG hoặc GIF.");
    }
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (/^http:\/\//i.test(trimmed)) {
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed)) {
      return trimmed;
    }
    const upgraded = trimmed.replace(/^http:\/\//i, "https://");
    options?.trackUpgrades?.push(trimmed);
    return upgraded;
  }

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  throw new Error(
    `Đường dẫn ảnh "${trimmed.slice(0, 48)}" không hợp lệ (hãy dùng /images/... hoặc https://...).`
  );
}

/**
 * Validates video or external link URLs, blocking `javascript:` / `data:` injection
 * and upgrading external `http://` to `https://`.
 */
export function sanitizeSafeUrl(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    throw new Error("Đường dẫn liên kết/video không an toàn (chặn javascript:/data:).");
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    /^(https:\/\/|mailto:|tel:)/i.test(trimmed)
  ) {
    return trimmed;
  }

  if (/^http:\/\//i.test(trimmed)) {
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  throw new Error(
    `Liên kết "${trimmed.slice(0, 48)}" không hợp lệ (chỉ hỗ trợ https://, /, mailto:, tel:).`
  );
}

export function parseLinesToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of paragraphs) {
    if (/^#{2,3}\s+/.test(part)) {
      const cleaned = sanitizePlainText(part.replace(/^#{2,3}\s+/, ""));
      if (cleaned) blocks.push({ type: "h", text: cleaned });
    } else if (
      part.split("\n").every((line) => /^[-*•]\s+/.test(line.trim()))
    ) {
      const items = part
        .split("\n")
        .map((line) => sanitizePlainText(line.trim().replace(/^[-*•]\s+/, "")))
        .filter(Boolean);
      if (items.length > 0) blocks.push({ type: "list", items });
    } else {
      const cleaned = sanitizePlainText(part);
      if (cleaned) blocks.push({ type: "p", text: cleaned });
    }
  }
  return blocks;
}

export function blocksToText(blocks: Block[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((block) => {
      if (block.type === "h") return `## ${block.text}`;
      if (block.type === "list") {
        return block.items.map((item) => `- ${item}`).join("\n");
      }
      return block.text;
    })
    .join("\n\n");
}

export function sanitizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    if (b.type === "h") {
      const text = sanitizePlainText(b.text);
      if (text) out.push({ type: "h", text });
    } else if (b.type === "list" && Array.isArray(b.items)) {
      const items = b.items
        .map((entry) => sanitizePlainText(entry))
        .filter(Boolean);
      if (items.length > 0) out.push({ type: "list", items });
    } else if (b.type === "p" || typeof b.text === "string") {
      const text = sanitizePlainText(b.text);
      if (text) out.push({ type: "p", text });
    }
  }
  return out;
}

export function sanitizeMiniSpecs(raw: unknown): MiniSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const label = sanitizePlainText(rec.label);
      const value = sanitizePlainText(rec.value);
      return label || value ? { label, value } : null;
    })
    .filter((item): item is MiniSpec => Boolean(item));
}

export function sanitizeSpecs(raw: unknown): Spec[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const label = sanitizePlainText(rec.label);
      const value = sanitizePlainText(rec.value);
      return label || value ? { label, value } : null;
    })
    .filter((item): item is Spec => Boolean(item));
}

export type NormalizedSnapshot = {
  products: Array<{
    slug: string;
    name: string;
    category: string;
    categoryLabel: string;
    englishName: string;
    lead: string;
    miniSpecs: MiniSpec[];
    images: string[];
    description: string[];
    specs: Spec[];
    applications: string[];
    featured: boolean;
    status: "show" | "hidden";
  }>;
  applications: Array<{
    slug: string;
    title: string;
    tag: string;
    image: string;
    excerpt: string;
    blocks: Block[];
    video: string;
    relatedProducts: string[];
    status: "show" | "hidden";
  }>;
  articles: Array<{
    slug: string;
    title: string;
    date: string;
    author: string;
    image: string;
    excerpt: string;
    blocks: Block[];
    video: string;
    relatedProducts: string[];
    status: "show" | "hidden";
  }>;
  jobs: Array<{
    slug: string;
    title: string;
    department: string;
    qty: number;
    jobType: string;
    location: string;
    salary: string;
    deadline: string;
    facts: JobFact[];
    blocks: Block[];
    status: "open" | "paused" | "closed";
  }>;
  recruitment?: {
    intro: string;
    email: string;
    defaultBenefits?: string;
  };
};

export type SnapshotValidationResult = {
  snapshot: NormalizedSnapshot;
  warnings: string[];
  counts: {
    products: number;
    applications: number;
    articles: number;
    jobs: number;
  };
};

/**
 * Strictly validates and sanitizes an imported JSON backup file before preview/DB write.
 */
export function validateAndNormalizeSnapshot(
  raw: unknown
): SnapshotValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("File JSON không hợp lệ (cần một đối tượng JSON ở cấp gốc).");
  }

  const obj = raw as Record<string, unknown>;
  for (const key of ["products", "applications", "articles", "jobs"] as const) {
    if (!Array.isArray(obj[key])) {
      throw new Error(
        `File sao lưu thiếu hoặc sai định dạng danh sách "${key}" (phải là mảng).`
      );
    }
  }

  const warnings: string[] = [];
  const upgradedUrls: string[] = [];
  let strippedOrphans = 0;

  const catMap = new Map(productCategories.map((c) => [c.slug, c.label]));
  const productSlugs = new Set<string>();
  const products: NormalizedSnapshot["products"] = [];

  for (const item of obj.products as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const name = sanitizePlainText(p.name);
    let slug = slugify(String(p.slug ?? name));
    if (!name || !slug) {
      warnings.push("Bỏ qua 1 sản phẩm thiếu tên hoặc slug hợp lệ.");
      continue;
    }
    if (productSlugs.has(slug)) {
      slug = nextCopySlug(slug, productSlugs);
      warnings.push(`Tự động đổi slug sản phẩm trùng thành "${slug}".`);
    }
    productSlugs.add(slug);

    const category = slugify(String(p.category ?? "vai")) || "vai";
    const categoryLabel =
      sanitizePlainText(p.categoryLabel) || catMap.get(category) || category;

    const rawImages = Array.isArray(p.images) ? p.images : [];
    const images = rawImages
      .map((img) => {
        try {
          return sanitizeImageUrl(img, { trackUpgrades: upgradedUrls });
        } catch {
          warnings.push(`Đã bỏ qua 1 ảnh không hợp lệ ở sản phẩm "${name}".`);
          return "";
        }
      })
      .filter(Boolean);

    products.push({
      slug,
      name,
      category,
      categoryLabel,
      englishName: sanitizePlainText(p.englishName),
      lead: sanitizePlainText(p.lead),
      miniSpecs: sanitizeMiniSpecs(p.miniSpecs),
      images: images.length > 0 ? images : [DEFAULT_PRODUCT_IMAGE],
      description: Array.isArray(p.description)
        ? p.description.map((d) => sanitizePlainText(d)).filter(Boolean)
        : [],
      specs: sanitizeSpecs(p.specs),
      applications: Array.isArray(p.applications)
        ? p.applications.map((a) => sanitizePlainText(a)).filter(Boolean)
        : [],
      featured: Boolean(p.featured),
      status: p.status === "hidden" ? "hidden" : "show",
    });
  }

  const appSlugs = new Set<string>();
  const applications: NormalizedSnapshot["applications"] = [];
  for (const item of obj.applications as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const title = sanitizePlainText(a.title);
    let slug = slugify(String(a.slug ?? title));
    if (!title || !slug) {
      warnings.push("Bỏ qua 1 bài ứng dụng thiếu tiêu đề.");
      continue;
    }
    if (appSlugs.has(slug)) {
      slug = nextCopySlug(slug, appSlugs);
      warnings.push(`Tự động đổi slug bài ứng dụng trùng thành "${slug}".`);
    }
    appSlugs.add(slug);

    let image = DEFAULT_PRODUCT_IMAGE;
    try {
      image =
        sanitizeImageUrl(a.image, { trackUpgrades: upgradedUrls }) ||
        DEFAULT_PRODUCT_IMAGE;
    } catch {
      warnings.push(`Ảnh bài ứng dụng "${title}" không hợp lệ, dùng ảnh mặc định.`);
    }

    let video = "";
    try {
      video = sanitizeSafeUrl(a.video);
    } catch {
      warnings.push(`Đã lược bỏ link video không an toàn ở "${title}".`);
    }

    const rawRelated = Array.isArray(a.relatedProducts) ? a.relatedProducts : [];
    const relatedProducts = rawRelated
      .map((s) => slugify(String(s)))
      .filter((s) => {
        if (!s) return false;
        if (!productSlugs.has(s)) {
          strippedOrphans += 1;
          return false;
        }
        return true;
      });

    applications.push({
      slug,
      title,
      tag: sanitizePlainText(a.tag) || "Công nghiệp",
      image,
      excerpt: sanitizePlainText(a.excerpt),
      blocks: sanitizeBlocks(a.blocks),
      video,
      relatedProducts: Array.from(new Set(relatedProducts)),
      status: a.status === "hidden" ? "hidden" : "show",
    });
  }

  const articleSlugs = new Set<string>();
  const articles: NormalizedSnapshot["articles"] = [];
  for (const item of obj.articles as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const title = sanitizePlainText(a.title);
    let slug = slugify(String(a.slug ?? title));
    if (!title || !slug) {
      warnings.push("Bỏ qua 1 bài tin tức thiếu tiêu đề.");
      continue;
    }
    if (articleSlugs.has(slug)) {
      slug = nextCopySlug(slug, articleSlugs);
      warnings.push(`Tự động đổi slug bài tin tức trùng thành "${slug}".`);
    }
    articleSlugs.add(slug);

    let image = DEFAULT_PRODUCT_IMAGE;
    try {
      image =
        sanitizeImageUrl(a.image, { trackUpgrades: upgradedUrls }) ||
        DEFAULT_PRODUCT_IMAGE;
    } catch {
      warnings.push(`Ảnh bài tin tức "${title}" không hợp lệ, dùng ảnh mặc định.`);
    }

    let video = "";
    try {
      video = sanitizeSafeUrl(a.video);
    } catch {
      warnings.push(`Đã lược bỏ link video không an toàn ở "${title}".`);
    }

    const rawRelated = Array.isArray(a.relatedProducts) ? a.relatedProducts : [];
    const relatedProducts = rawRelated
      .map((s) => slugify(String(s)))
      .filter((s) => {
        if (!s) return false;
        if (!productSlugs.has(s)) {
          strippedOrphans += 1;
          return false;
        }
        return true;
      });

    articles.push({
      slug,
      title,
      date: sanitizePlainText(a.date) || todayDisplayVN(),
      author: sanitizePlainText(a.author) || "Vina Khang",
      image,
      excerpt: sanitizePlainText(a.excerpt),
      blocks: sanitizeBlocks(a.blocks),
      video,
      relatedProducts: Array.from(new Set(relatedProducts)),
      status: a.status === "hidden" ? "hidden" : "show",
    });
  }

  const jobSlugs = new Set<string>();
  const jobs: NormalizedSnapshot["jobs"] = [];
  for (const item of obj.jobs as unknown[]) {
    if (!item || typeof item !== "object") continue;
    const j = item as Record<string, unknown>;
    const title = sanitizePlainText(j.title);
    let slug = slugify(String(j.slug ?? title));
    if (!title || !slug) {
      warnings.push("Bỏ qua 1 vị trí tuyển dụng thiếu tiêu đề.");
      continue;
    }
    if (jobSlugs.has(slug)) {
      slug = nextCopySlug(slug, jobSlugs);
      warnings.push(`Tự động đổi slug vị trí trùng thành "${slug}".`);
    }
    jobSlugs.add(slug);

    const qty = Math.max(1, Number(j.qty) || 1);
    const jobType = sanitizePlainText(j.jobType) || "Toàn thời gian";
    const location = sanitizePlainText(j.location) || "TP. HCM";
    const salary = sanitizePlainText(j.salary) || "Thỏa thuận";
    const deadline = normalizeDeadlineIso(String(j.deadline ?? ""));
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

    jobs.push({
      slug,
      title,
      department: sanitizePlainText(j.department) || "Tổng hợp",
      qty,
      jobType,
      location,
      salary,
      deadline,
      facts,
      blocks: sanitizeBlocks(j.blocks),
      status:
        j.status === "paused" || j.status === "closed" ? j.status : "open",
    });
  }

  if (upgradedUrls.length > 0) {
    warnings.push(
      `Đã tự động nâng cấp ${upgradedUrls.length} đường dẫn ảnh từ http:// sang https://.`
    );
  }
  if (strippedOrphans > 0) {
    warnings.push(
      `Đã tự động dọn ${strippedOrphans} ID sản phẩm liên quan mồ côi không còn tồn tại.`
    );
  }

  let recruitment: NormalizedSnapshot["recruitment"];
  const settingsObj =
    obj.settings && typeof obj.settings === "object"
      ? (obj.settings as Record<string, unknown>)
      : null;
  const recRaw =
    settingsObj?.recruitment && typeof settingsObj.recruitment === "object"
      ? (settingsObj.recruitment as Record<string, unknown>)
      : null;
  if (recRaw) {
    recruitment = {
      intro: sanitizePlainText(recRaw.intro),
      email: sanitizePlainText(recRaw.email),
      defaultBenefits:
        typeof recRaw.defaultBenefits === "string"
          ? sanitizePlainText(recRaw.defaultBenefits)
          : undefined,
    };
  }

  return {
    snapshot: {
      products,
      applications,
      articles,
      jobs,
      recruitment,
    },
    warnings,
    counts: {
      products: products.length,
      applications: applications.length,
      articles: articles.length,
      jobs: jobs.length,
    },
  };
}
