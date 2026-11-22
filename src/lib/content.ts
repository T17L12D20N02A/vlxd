import contentData from "@/data/content.json";
import type {
  Application,
  Article,
  Category,
  Content,
  Job,
  Product,
} from "./types";

const content = contentData as Content;

export const site = {
  name: "Vina Khang",
  legalName: "Công ty TNHH Thương mại Vina Khang",
  tagline: "Vật tư công nghiệp",
  description:
    "Vina Khang cung cấp vải Teflon, băng keo chịu nhiệt, băng tải máy ép keo và dây đai hàn nhiệt, gia công theo kích thước từng model máy.",
  hotline: "0932 149 717",
  hotlineHref: "tel:0932149717",
  zalo: "https://zalo.me/0932149717",
  email: "vinakhangtrade@gmail.com",
  address: "101/3Q Ấp Mỹ Hòa 1, Xã Bà Điểm, TP. HCM",
  website: "vinakhang.com.vn",
  facebook: "https://www.facebook.com/vinakhang.com.vn",
  tiktok: "https://www.tiktok.com/@vina.khang",
} as const;

export const products: Product[] = content.products;
export const articles: Article[] = content.articles;
export const applications: Application[] = content.applications;
export const jobs: Job[] = content.jobs;
export const categories: Category[] = content.categories;

export const categoryMeta: Record<string, { description: string }> = {
  vai: { description: "Vải, tấm chống dính và vải công nghiệp" },
  bangkeo: { description: "Dạng cuộn 13-300 mm và dạng tấm có keo" },
  epkeo: { description: "Loại đúc liền và loại có mối nối" },
  bangtai: { description: "Bề mặt kín hoặc dạng lưới" },
  daydai: { description: "Dùng cho máy hàn miệng túi liên tục" },
};

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getApplication(slug: string): Application | undefined {
  return applications.find((application) => application.slug === slug);
}

export function getJob(slug: string): Job | undefined {
  return jobs.find((job) => job.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function featuredProducts(): Product[] {
  const featured = products.filter((product) => product.featured);
  return featured.length > 0 ? featured : products.slice(0, 6);
}

export function productsByCategory(categorySlug: string): Product[] {
  return products.filter((product) => product.category === categorySlug);
}

export function relatedProducts(slug: string, limit = 3): Product[] {
  const current = getProduct(slug);
  if (!current) return products.slice(0, limit);

  const sameCategory = products.filter(
    (product) => product.slug !== slug && product.category === current.category
  );
  const others = products.filter(
    (product) => product.slug !== slug && product.category !== current.category
  );

  return [...sameCategory, ...others].slice(0, limit);
}

export function relatedArticles(slug: string, limit = 3): Article[] {
  return articles.filter((article) => article.slug !== slug).slice(0, limit);
}

export function articleCountByProduct(slug: string): number {
  return articles.filter((article) => article.relatedProducts.includes(slug)).length;
}
