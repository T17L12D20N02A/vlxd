import type { MetadataRoute } from "next";
import { applications, articles, jobs, products } from "@/lib/content";

const BASE = "https://vinakhang.com.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/san-pham",
    "/ung-dung",
    "/tin-tuc",
    "/tuyen-dung",
    "/lien-he",
    "/bao-gia",
    "/bao-gia/tra-cuu",
  ].map((route) => ({
    url: `${BASE}${route}`,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const productRoutes = products.map((product) => ({
    url: `${BASE}/san-pham/${product.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const applicationRoutes = applications.map((application) => ({
    url: `${BASE}/ung-dung/${application.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articleRoutes = articles.map((article) => ({
    url: `${BASE}/tin-tuc/${article.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const jobRoutes = jobs.map((job) => ({
    url: `${BASE}/tuyen-dung/${job.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...applicationRoutes,
    ...articleRoutes,
    ...jobRoutes,
  ];
}
