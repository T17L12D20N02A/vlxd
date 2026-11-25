"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Briefcase,
  CaretLeft,
  CaretRight,
  ChatCircleText,
  CheckCircle,
  Copy,
  Database,
  DownloadSimple,
  Eye,
  EyeSlash,
  FileArrowUp,
  MagnifyingGlass,
  Newspaper,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  SignOut,
  Sparkle,
  SquaresFour,
  Stack,
  Star,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { adminLogout } from "@/app/actions";
import {
  ArticleLikeModal,
  ConfirmDialog,
  JobEditorModal,
  ProductEditorModal,
} from "@/components/admin/admin-modals";
import { BannerManagerSection } from "@/components/admin/banner-manager";
import { StatusBadge } from "@/components/status-badge";
import CATEGORY_OPTIONS from "@/data/product-categories.json";
import type {
  CmsApplication,
  CmsArticle,
  CmsJob,
  CmsProduct,
  RecruitmentSettings,
} from "@/lib/cms-store";
import {
  DEFAULT_JOB_BENEFITS,
  DEFAULT_PRODUCT_IMAGE,
  blocksToText,
  isJobExpired,
  validateAndNormalizeSnapshot,
  type BannerSettings,
  type SnapshotValidationResult,
} from "@/lib/cms-utils";
import type { ContactMessage } from "@/lib/contacts-store";
import { cn, formatDateTime, telHref } from "@/lib/format";
import { STATUS_LABELS, type QuoteStatus } from "@/lib/request";
import type { StoredRequest } from "@/lib/requests-store";

type TabKey =
  | "dashboard"
  | "requests"
  | "contacts"
  | "banner"
  | "products"
  | "applications"
  | "articles"
  | "jobs"
  | "data";

const VALID_TABS: readonly TabKey[] = [
  "dashboard",
  "requests",
  "contacts",
  "banner",
  "products",
  "applications",
  "articles",
  "jobs",
  "data",
];

function parseTabParam(raw: string | null): TabKey {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) {
    return raw as TabKey;
  }
  return "dashboard";
}

type SortKey = "default" | "title-asc" | "title-desc" | "updated-desc";

const PAGE_SIZE = 20;

export type AdminInitialData = {
  dbMode: "postgres" | "json";
  products: CmsProduct[];
  applications: CmsApplication[];
  articles: CmsArticle[];
  jobs: CmsJob[];
  recruitment: RecruitmentSettings;
  banner: BannerSettings;
  requests: StoredRequest[];
  contacts: ContactMessage[];
};

function StatusPill({
  status,
  expired = false,
}: {
  status: string;
  expired?: boolean;
}) {
  if (expired && status === "open") {
    return (
      <span className="inline-flex rounded-full bg-[#fde8e6] px-2.5 py-0.5 text-xs font-bold text-[#c0392b]">
        Quá hạn nộp
      </span>
    );
  }
  if (status === "show") {
    return (
      <span className="inline-flex rounded-full bg-[#e4f6ee] px-2.5 py-0.5 text-xs font-bold text-[#1e9e6a]">
        Hiển thị
      </span>
    );
  }
  if (status === "open") {
    return (
      <span className="inline-flex rounded-full bg-[#e4f6ee] px-2.5 py-0.5 text-xs font-bold text-[#1e9e6a]">
        Đang tuyển
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="inline-flex rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-xs font-bold text-[#8a5a00]">
        Tạm dừng
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#eef1f5] px-2.5 py-0.5 text-xs font-bold text-[#6b7788]">
      {status === "closed" ? "Đã đóng" : "Ẩn"}
    </span>
  );
}

function PaginationBar({
  page,
  totalItems,
  pageSize = PAGE_SIZE,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-soft/30 px-5 py-3 text-xs text-muted">
      <span>
        Hiển thị <strong className="text-ink">{start}</strong>–
        <strong className="text-ink">{end}</strong> trong tổng số{" "}
        <strong className="text-ink">{totalItems}</strong> mục
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Trang trước"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink hover:border-brand disabled:opacity-40"
        >
          <CaretLeft size={14} weight="bold" aria-hidden />
        </button>
        <span className="px-2 font-semibold text-ink">
          Trang {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Trang sau"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink hover:border-brand disabled:opacity-40"
        >
          <CaretRight size={14} weight="bold" aria-hidden />
        </button>
      </div>
    </div>
  );
}

type ConfirmActionState = {
  title: string;
  description: string;
  warnings?: string[];
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<void> | void;
} | null;

export function AdminCms({ initial }: { initial: AdminInitialData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTabParam(searchParams.get("muc"));

  const [data, setData] = useState<AdminInitialData>(initial);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [page, setPage] = useState(1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    text: string;
    kind: "ok" | "err";
  } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmActionState>(null);

  // Modal state for CRUD editors
  const [productModal, setProductModal] = useState<CmsProduct | "new" | null>(
    null
  );
  const [appModal, setAppModal] = useState<CmsApplication | "new" | null>(null);
  const [articleModal, setArticleModal] = useState<CmsArticle | "new" | null>(
    null
  );
  const [jobModal, setJobModal] = useState<CmsJob | "new" | null>(null);

  // Recruitment settings local state + dirty guard
  const [recIntro, setRecIntro] = useState(initial.recruitment.intro);
  const [recEmail, setRecEmail] = useState(initial.recruitment.email);
  const [recBenefits, setRecBenefits] = useState(
    initial.recruitment.defaultBenefits || DEFAULT_JOB_BENEFITS
  );
  const [bannerDraft, setBannerDraft] = useState<BannerSettings>(initial.banner);

  const importInputRef = useRef<HTMLInputElement>(null);

  const isRecruitmentDirty =
    recIntro !== data.recruitment.intro ||
    recEmail !== data.recruitment.email ||
    recBenefits !== (data.recruitment.defaultBenefits || DEFAULT_JOB_BENEFITS);

  const isBannerDirty =
    JSON.stringify(bannerDraft) !== JSON.stringify(data.banner);

  useEffect(() => {
    if (!isRecruitmentDirty && !isBannerDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isRecruitmentDirty, isBannerDirty]);

  function notify(text: string, kind: "ok" | "err" = "ok") {
    const id = Date.now();
    setToast({ id, text, kind });
    const duration = kind === "err" ? 10_000 : 4_200;
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  }

  async function reload() {
    const res = await fetch("/api/admin/cms", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được dữ liệu quản trị.");
    const next = (await res.json()) as AdminInitialData;
    setData(next);
    setRecIntro(next.recruitment.intro);
    setRecEmail(next.recruitment.email);
    setRecBenefits(next.recruitment.defaultBenefits || DEFAULT_JOB_BENEFITS);
    setBannerDraft(next.banner);
  }

  async function mutate<TItem = unknown>(
    entity: string,
    action: string,
    payload: Record<string, unknown> = {},
    successMsg?: string
  ): Promise<{ ok: boolean; item?: TItem }> {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action, payload }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        item?: TItem;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Thao tác thất bại.");
      }
      await reload();
      if (successMsg) notify(successMsg, "ok");
      return { ok: true, item: json.item };
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
        "err"
      );
      return { ok: false };
    } finally {
      setBusy(false);
    }
  }

  function applyTabSwitch(next: TabKey) {
    setSearch("");
    setCatFilter("");
    setStatusFilter("");
    setSortBy("default");
    setPage(1);
    setSelectedSlugs([]);
    const href = next === "dashboard" ? "/quan-tri" : `/quan-tri?muc=${next}`;
    router.replace(href, { scroll: false });
  }

  function switchTab(next: TabKey) {
    if (next === tab) return;
    if (tab === "banner" && isBannerDirty) {
      setConfirmState({
        title: "Chưa lưu cấu hình Banner",
        description:
          "Bạn có thay đổi chưa lưu ở mục Banner sản phẩm nổi bật. Chuyển tab sẽ bỏ các thay đổi này.",
        confirmLabel: "Chuyển tab",
        danger: true,
        run: () => {
          setBannerDraft(data.banner);
          setConfirmState(null);
          applyTabSwitch(next);
        },
      });
      return;
    }
    if (tab === "jobs" && isRecruitmentDirty) {
      setConfirmState({
        title: "Chưa lưu cài đặt tuyển dụng",
        description:
          "Bạn có thay đổi chưa lưu ở mục Nội dung chung trang Tuyển dụng. Chuyển tab sẽ bỏ các thay đổi này.",
        confirmLabel: "Chuyển tab",
        danger: true,
        run: () => {
          setRecIntro(data.recruitment.intro);
          setRecEmail(data.recruitment.email);
          setRecBenefits(
            data.recruitment.defaultBenefits || DEFAULT_JOB_BENEFITS
          );
          setConfirmState(null);
          applyTabSwitch(next);
        },
      });
      return;
    }
    applyTabSwitch(next);
  }

  // Build deduplicated Image Library from all existing items
  const mediaLibrary = useMemo(() => {
    const urls = new Set<string>();
    for (const p of data.products) {
      for (const img of p.images) {
        if (img && !img.startsWith("data:")) urls.add(img);
      }
    }
    for (const a of data.applications) {
      if (a.image && !a.image.startsWith("data:")) urls.add(a.image);
    }
    for (const a of data.articles) {
      if (a.image && !a.image.startsWith("data:")) urls.add(a.image);
    }
    return Array.from(urls);
  }, [data.products, data.applications, data.articles]);

  // All categories including any custom ones in DB
  const categoryOptions = useMemo(() => {
    const known = new Map(CATEGORY_OPTIONS.map((c) => [c.slug, c.label]));
    for (const p of data.products) {
      if (!known.has(p.category)) {
        known.set(p.category, p.categoryLabel || p.category);
      }
    }
    return Array.from(known, ([slug, label]) => ({ slug, label }));
  }, [data.products]);

  // Reference count map: how many applications & articles link to each product slug
  const productReferenceMap = useMemo(() => {
    const counts = new Map<string, { apps: number; articles: number }>();
    for (const app of data.applications) {
      for (const s of app.relatedProducts) {
        const cur = counts.get(s) ?? { apps: 0, articles: 0 };
        cur.apps += 1;
        counts.set(s, cur);
      }
    }
    for (const art of data.articles) {
      for (const s of art.relatedProducts) {
        const cur = counts.get(s) ?? { apps: 0, articles: 0 };
        cur.articles += 1;
        counts.set(s, cur);
      }
    }
    return counts;
  }, [data.applications, data.articles]);

  /* ---------------- FILTERED & SORTED LISTS ---------------- */

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.products.filter(
      (p) =>
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.englishName.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q)) &&
        (!catFilter || p.category === catFilter) &&
        (!statusFilter ||
          (statusFilter === "featured"
            ? p.featured
            : p.status === statusFilter))
    );
    if (sortBy === "title-asc") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    if (sortBy === "title-desc") {
      return [...list].sort((a, b) => b.name.localeCompare(a.name, "vi"));
    }
    if (sortBy === "updated-desc") {
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [data.products, search, catFilter, statusFilter, sortBy]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.applications.filter(
      (a) =>
        (!q ||
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.tag.toLowerCase().includes(q)) &&
        (!statusFilter || a.status === statusFilter)
    );
    if (sortBy === "title-asc") {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, "vi"));
    }
    if (sortBy === "title-desc") {
      return [...list].sort((a, b) => b.title.localeCompare(a.title, "vi"));
    }
    if (sortBy === "updated-desc") {
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [data.applications, search, statusFilter, sortBy]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.articles.filter(
      (a) =>
        (!q ||
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)) &&
        (!statusFilter || a.status === statusFilter)
    );
    if (sortBy === "title-asc") {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, "vi"));
    }
    if (sortBy === "title-desc") {
      return [...list].sort((a, b) => b.title.localeCompare(a.title, "vi"));
    }
    if (sortBy === "updated-desc") {
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [data.articles, search, statusFilter, sortBy]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.jobs.filter((j) => {
      const expired = isJobExpired(j.deadline);
      const matchQuery =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.slug.toLowerCase().includes(q);
      const matchStatus =
        !statusFilter ||
        (statusFilter === "expired"
          ? expired
          : statusFilter === "open"
            ? j.status === "open" && !expired
            : j.status === statusFilter);
      return matchQuery && matchStatus;
    });
    if (sortBy === "title-asc") {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, "vi"));
    }
    if (sortBy === "title-desc") {
      return [...list].sort((a, b) => b.title.localeCompare(a.title, "vi"));
    }
    if (sortBy === "updated-desc") {
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [data.jobs, search, statusFilter, sortBy]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.requests.filter(
      (r) =>
        (!q ||
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.company.toLowerCase().includes(q)) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [data.requests, search, statusFilter]);

  function paginate<T>(items: T[]): T[] {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }

  const pagedProducts = paginate(filteredProducts);
  const pagedApps = paginate(filteredApps);
  const pagedArticles = paginate(filteredArticles);
  const pagedJobs = paginate(filteredJobs);
  const pagedRequests = paginate(filteredRequests);

  /* ---------------- KPI & DASHBOARD HEALTH METRICS ---------------- */

  const visibleProductsCount = data.products.filter(
    (p) => p.status === "show"
  ).length;
  const hiddenProductsCount = data.products.length - visibleProductsCount;
  const featuredProductsCount = data.products.filter((p) => p.featured).length;

  const visibleAppsCount = data.applications.filter(
    (a) => a.status === "show"
  ).length;
  const hiddenAppsCount = data.applications.length - visibleAppsCount;

  const visibleArticlesCount = data.articles.filter(
    (a) => a.status === "show"
  ).length;
  const hiddenArticlesCount = data.articles.length - visibleArticlesCount;

  const activeOpenJobs = data.jobs.filter(
    (j) => j.status === "open" && !isJobExpired(j.deadline)
  );
  const expiredOpenJobs = data.jobs.filter(
    (j) => j.status === "open" && isJobExpired(j.deadline)
  );
  const totalNeeded = activeOpenJobs.reduce((sum, j) => sum + (j.qty || 1), 0);
  const newQuoteRequestsCount = data.requests.filter(
    (r) => r.status === "moi"
  ).length;

  // Content completeness checks for Dashboard "Cần hoàn thiện"
  const productsMissingLead = data.products.filter(
    (p) => !p.lead.trim() || p.description.length === 0
  );
  const articlesUsingDefaultImg = data.articles.filter(
    (a) => !a.image.trim() || a.image === DEFAULT_PRODUCT_IMAGE
  );
  const appsMissingExcerpt = data.applications.filter(
    (a) => !a.excerpt.trim() || a.blocks.length === 0
  );

  const healthAlerts = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      detail: string;
      actionLabel: string;
      onAction: () => void;
    }> = [];

    if (newQuoteRequestsCount > 0) {
      items.push({
        id: "new-quotes",
        label: `${newQuoteRequestsCount} yêu cầu báo giá mới tiếp nhận`,
        detail: "Cần phản hồi và cập nhật trạng thái xử lý cho khách hàng.",
        actionLabel: "Xử lý ngay",
        onAction: () => {
          applyTabSwitch("requests");
          setStatusFilter("moi");
        },
      });
    }

    if (expiredOpenJobs.length > 0) {
      items.push({
        id: "expired-jobs",
        label: `${expiredOpenJobs.length} vị trí tuyển dụng đã quá hạn nộp`,
        detail:
          "Đang tự động ẩn trên website công khai; hãy gia hạn hoặc chuyển sang Đã đóng.",
        actionLabel: "Kiểm tra",
        onAction: () => {
          applyTabSwitch("jobs");
          setStatusFilter("expired");
        },
      });
    }

    const totalHidden =
      hiddenProductsCount + hiddenAppsCount + hiddenArticlesCount;
    if (totalHidden > 0) {
      items.push({
        id: "hidden-items",
        label: `${totalHidden} mục nội dung đang ở trạng thái Ẩn (bản nháp)`,
        detail: `${hiddenProductsCount} sản phẩm · ${hiddenAppsCount} bài ứng dụng · ${hiddenArticlesCount} tin tức.`,
        actionLabel: "Xem bản nháp",
        onAction: () => {
          applyTabSwitch(
            hiddenProductsCount > 0
              ? "products"
              : hiddenAppsCount > 0
                ? "applications"
                : "articles"
          );
          setStatusFilter("hidden");
        },
      });
    }

    if (articlesUsingDefaultImg.length > 0) {
      items.push({
        id: "article-default-img",
        label: `${articlesUsingDefaultImg.length} bài tin tức đang dùng chung ảnh sản phẩm mặc định`,
        detail: "Nên bổ sung ảnh minh họa riêng cho từng bài viết kỹ thuật.",
        actionLabel: "Cập nhật ảnh",
        onAction: () => applyTabSwitch("articles"),
      });
    }

    if (productsMissingLead.length > 0) {
      items.push({
        id: "products-missing-desc",
        label: `${productsMissingLead.length} sản phẩm thiếu mô tả ngắn hoặc chi tiết`,
        detail: "Hoàn thiện mô tả giúp tăng điểm SEO và tư vấn rõ quy cách.",
        actionLabel: "Rà soát",
        onAction: () => applyTabSwitch("products"),
      });
    }

    if (appsMissingExcerpt.length > 0) {
      items.push({
        id: "apps-missing-excerpt",
        label: `${appsMissingExcerpt.length} bài ứng dụng thiếu tóm tắt hoặc nội dung`,
        detail: "Cần bổ sung tóm tắt đầy đủ trước khi xuất bản.",
        actionLabel: "Bổ sung",
        onAction: () => applyTabSwitch("applications"),
      });
    }

    if (featuredProductsCount > 8) {
      items.push({
        id: "too-many-featured",
        label: `Đang đánh dấu nổi bật ${featuredProductsCount} sản phẩm`,
        detail:
          "Nên giữ khoảng 6–8 sản phẩm chủ lực để khu vực Nổi bật ở trang chủ có trọng tâm.",
        actionLabel: "Lọc nổi bật",
        onAction: () => {
          applyTabSwitch("products");
          setStatusFilter("featured");
        },
      });
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    newQuoteRequestsCount,
    expiredOpenJobs.length,
    hiddenProductsCount,
    hiddenAppsCount,
    hiddenArticlesCount,
    articlesUsingDefaultImg.length,
    productsMissingLead.length,
    appsMissingExcerpt.length,
    featuredProductsCount,
  ]);

  /* ---------------- BULK & DELETE HELPERS ---------------- */

  function toggleSelectOne(slug: string, checked: boolean) {
    setSelectedSlugs((prev) =>
      checked
        ? Array.from(new Set([...prev, slug]))
        : prev.filter((s) => s !== slug)
    );
  }

  function toggleSelectPage(pageSlugs: string[], checked: boolean) {
    setSelectedSlugs((prev) => {
      if (checked) return Array.from(new Set([...prev, ...pageSlugs]));
      const pageSet = new Set(pageSlugs);
      return prev.filter((s) => !pageSet.has(s));
    });
  }

  function confirmDeleteProduct(p: CmsProduct) {
    const refs = productReferenceMap.get(p.slug);
    const warnings: string[] = [];
    if (refs && (refs.apps > 0 || refs.articles > 0)) {
      warnings.push(
        `Sản phẩm này đang được gắn liên quan trong ${refs.apps} bài ứng dụng và ${refs.articles} bài tin tức. Khi xóa, hệ thống sẽ tự động gỡ ID này để không để lại liên kết mồ côi.`
      );
    }
    setConfirmState({
      title: `Xóa sản phẩm "${p.name}"?`,
      description: `Thao tác này sẽ xóa sản phẩm (${p.slug}) khỏi cơ sở dữ liệu PostgreSQL.`,
      warnings,
      confirmLabel: "Xóa sản phẩm",
      danger: true,
      run: async () => {
        setConfirmState(null);
        setSelectedSlugs((prev) => prev.filter((s) => s !== p.slug));
        await mutate(
          "products",
          "delete",
          { slug: p.slug },
          "Đã xóa sản phẩm và dọn sạch liên kết liên quan."
        );
      },
    });
  }

  function confirmBulkDelete(
    entity: "products" | "applications" | "articles" | "jobs",
    label: string
  ) {
    if (selectedSlugs.length === 0) return;
    const warnings: string[] = [];
    if (entity === "products") {
      let refCount = 0;
      for (const s of selectedSlugs) {
        const r = productReferenceMap.get(s);
        if (r) refCount += r.apps + r.articles;
      }
      if (refCount > 0) {
        warnings.push(
          `Có ${refCount} lượt tham chiếu ở bài ứng dụng/tin tức sẽ được tự động dọn sạch.`
        );
      }
    }
    const slugsToDelete = [...selectedSlugs];
    setConfirmState({
      title: `Xóa ${slugsToDelete.length} ${label} đã chọn?`,
      description:
        "Các mục đã chọn sẽ bị xóa khỏi PostgreSQL. Vui lòng xuất bản sao lưu JSON trước nếu cần giữ bản dự phòng.",
      warnings,
      confirmLabel: `Xóa ${slugsToDelete.length} mục`,
      danger: true,
      run: async () => {
        setConfirmState(null);
        const res = await mutate(
          entity,
          "bulk-delete",
          { slugs: slugsToDelete },
          `Đã xóa ${slugsToDelete.length} ${label}.`
        );
        if (res.ok) setSelectedSlugs([]);
      },
    });
  }

  async function handleBulkStatus(
    entity: "products" | "applications" | "articles" | "jobs",
    status: string,
    msg: string
  ) {
    if (selectedSlugs.length === 0) return;
    const res = await mutate(
      entity,
      "bulk-status",
      { slugs: selectedSlugs, status },
      msg
    );
    if (res.ok) setSelectedSlugs([]);
  }

  async function handleJsonFileSelected(file: File) {
    let parsed: unknown;
    try {
      const rawText = await file.text();
      parsed = JSON.parse(rawText);
    } catch {
      notify("Không đọc được tệp JSON (cú pháp JSON bị lỗi).", "err");
      return;
    }

    let validated: SnapshotValidationResult;
    try {
      validated = validateAndNormalizeSnapshot(parsed);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Cấu trúc tệp sao lưu không hợp lệ.",
        "err"
      );
      return;
    }

    const { counts, warnings } = validated;
    setConfirmState({
      title: "Xác nhận nhập & ghi đè dữ liệu CMS?",
      description: `Tệp "${file.name}" hợp lệ gồm ${counts.products} sản phẩm, ${counts.applications} bài ứng dụng, ${counts.articles} bài tin tức và ${counts.jobs} vị trí tuyển dụng. Toàn bộ bảng nội dung CMS hiện tại sẽ được thay thế bằng bản sao lưu này (giữ nguyên yêu cầu báo giá và tin nhắn liên hệ).`,
      warnings,
      confirmLabel: "Xác nhận ghi đè dữ liệu CMS",
      danger: true,
      run: async () => {
        setConfirmState(null);
        await mutate(
          "system",
          "import",
          { snapshot: parsed },
          `Đã nhập thành công ${counts.products} sản phẩm, ${counts.applications} ứng dụng, ${counts.articles} tin tức và ${counts.jobs} vị trí.`
        );
      },
    });
  }

  const navItems: Array<{
    key: TabKey;
    label: string;
    group: string;
    count?: number;
    badgeTone?: "accent" | "default";
    Icon: typeof SquaresFour;
  }> = [
    {
      key: "dashboard",
      label: "Tổng quan",
      group: "Tổng quan",
      Icon: SquaresFour,
    },
    {
      key: "requests",
      label: "Yêu cầu báo giá",
      group: "Khách hàng",
      count: data.requests.length,
      badgeTone: newQuoteRequestsCount > 0 ? "accent" : "default",
      Icon: Receipt,
    },
    {
      key: "contacts",
      label: "Tin nhắn liên hệ",
      group: "Khách hàng",
      count: data.contacts.length,
      Icon: ChatCircleText,
    },
    {
      key: "banner",
      label: "Banner nổi bật",
      group: "Nội dung website",
      count: data.banner.productSlugs.length,
      Icon: Sparkle,
    },
    {
      key: "products",
      label: "Sản phẩm",
      group: "Nội dung website",
      count: data.products.length,
      Icon: Package,
    },
    {
      key: "applications",
      label: "Ứng dụng",
      group: "Nội dung website",
      count: data.applications.length,
      Icon: Stack,
    },
    {
      key: "articles",
      label: "Tin tức",
      group: "Nội dung website",
      count: data.articles.length,
      Icon: Newspaper,
    },
    {
      key: "jobs",
      label: "Tuyển dụng",
      group: "Nội dung website",
      count: data.jobs.length,
      Icon: Briefcase,
    },
    {
      key: "data",
      label: "Dữ liệu & sao lưu",
      group: "Hệ thống",
      Icon: Database,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-112px)] bg-soft/60">
      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          {/* Sticky Sidebar safe on 768px-height laptop screens */}
          <aside className="rounded-2xl bg-brand-dark p-4 text-[#cfe0f3] shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-extrabold tracking-wide text-white">
                  VINA KHANG CMS
                </p>
                <p className="text-[11px] uppercase tracking-wider text-[#9fb8d4]">
                  {data.dbMode === "postgres"
                    ? "PostgreSQL · Đã kết nối"
                    : "Chế độ JSON nội bộ"}
                </p>
              </div>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  data.dbMode === "postgres" ? "bg-[#2ecc71]" : "bg-accent"
                )}
                role="img"
                aria-label={
                  data.dbMode === "postgres"
                    ? "Đang kết nối PostgreSQL"
                    : "Đang dùng lưu trữ JSON"
                }
                title={
                  data.dbMode === "postgres"
                    ? "Đang kết nối PostgreSQL"
                    : "Đang dùng lưu trữ JSON"
                }
              />
            </div>

            <nav className="mt-4 space-y-1" aria-label="Menu quản trị">
              {navItems.map((item, idx) => {
                const prevGroup = idx > 0 ? navItems[idx - 1].group : "";
                const active = tab === item.key;
                const Icon = item.Icon;
                return (
                  <div key={item.key}>
                    {item.group !== prevGroup ? (
                      <p className="px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7f9bbd]">
                        {item.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => switchTab(item.key)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                        active
                          ? "bg-white/14 text-white"
                          : "text-[#cfe0f3] hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <Icon size={18} aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {typeof item.count === "number" ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            item.badgeTone === "accent"
                              ? "bg-accent text-brand-dark"
                              : "bg-white/14 text-white"
                          )}
                        >
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </nav>

            <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              <Link
                href="/"
                className="text-xs font-semibold text-[#cfe0f3] hover:text-white"
              >
                ↗ Xem website
              </Link>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  <SignOut size={14} aria-hidden />
                  Đăng xuất
                </button>
              </form>
            </div>
          </aside>

          {/* Main content area */}
          <div className="min-w-0 space-y-6">
            {toast ? (
              <div
                role={toast.kind === "err" ? "alert" : "status"}
                aria-live={toast.kind === "err" ? "assertive" : "polite"}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md",
                  toast.kind === "err" ? "bg-[#c0392b]" : "bg-[#1f6b41]"
                )}
              >
                <span>{toast.text}</span>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Đóng thông báo"
                  className="rounded p-0.5 hover:bg-white/15"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            ) : null}

            {/* DASHBOARD */}
            {tab === "dashboard" ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-[1.6rem]">Tổng quan quản trị</h1>
                    <p className="mt-1 text-sm text-muted">
                      Quản lý đồng bộ sản phẩm, ứng dụng, tin tức, tuyển dụng, yêu cầu báo giá và sao lưu PostgreSQL.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        applyTabSwitch("products");
                        setProductModal("new");
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Thêm sản phẩm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        applyTabSwitch("articles");
                        setArticleModal("new");
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Thêm tin tức
                    </button>
                  </div>
                </div>

                {/* Consistent KPI cards with visible / hidden / open breakdown */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => switchTab("requests")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Yêu cầu báo giá
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-brand">
                      {data.requests.length}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {newQuoteRequestsCount > 0
                        ? `${newQuoteRequestsCount} yêu cầu mới chờ xử lý`
                        : "Đã tiếp nhận & phân loại"}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("contacts")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Tin nhắn liên hệ
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {data.contacts.length}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Gửi từ biểu mẫu tư vấn kỹ thuật
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("products")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Sản phẩm ({data.products.length})
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {visibleProductsCount}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Hiển thị · {hiddenProductsCount} ẩn ·{" "}
                      {featuredProductsCount} nổi bật
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("applications")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Bài ứng dụng ({data.applications.length})
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {visibleAppsCount}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Hiển thị · {hiddenAppsCount} ẩn
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("articles")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Bài tin tức ({data.articles.length})
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {visibleArticlesCount}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Hiển thị · {hiddenArticlesCount} ẩn
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab("jobs")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Tuyển dụng ({data.jobs.length} vị trí)
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {activeOpenJobs.length}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Đang tuyển ({totalNeeded} người)
                      {expiredOpenJobs.length > 0
                        ? ` · ${expiredOpenJobs.length} quá hạn`
                        : ""}
                    </p>
                  </button>
                </div>

                {/* Dashboard Needs Attention / Content Health */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <div className="flex items-center gap-2">
                      {healthAlerts.length > 0 ? (
                        <WarningCircle
                          size={18}
                          weight="fill"
                          className="text-[#d97706]"
                          aria-hidden
                        />
                      ) : (
                        <CheckCircle
                          size={18}
                          weight="fill"
                          className="text-[#1e9e6a]"
                          aria-hidden
                        />
                      )}
                      <h2 className="text-base">
                        Mục cần kiểm tra &amp; hoàn thiện ({healthAlerts.length})
                      </h2>
                    </div>
                  </div>
                  {healthAlerts.length > 0 ? (
                    <div className="divide-y divide-line">
                      {healthAlerts.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                        >
                          <div>
                            <p className="text-sm font-bold text-ink">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted">{item.detail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={item.onAction}
                            className="btn btn-outline btn-sm py-1.5 text-xs"
                          >
                            {item.actionLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm text-muted">
                      Tất cả nội dung và vị trí tuyển dụng đều đầy đủ, không có mục quá hạn hay chờ xử lý.
                    </p>
                  )}
                </div>

                {/* Recent Quote Requests */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="text-base">Yêu cầu báo giá gần đây</h2>
                    <button
                      type="button"
                      onClick={() => switchTab("requests")}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  {data.requests.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                          <tr>
                            <th className="px-5 py-3 font-bold">Mã</th>
                            <th className="px-5 py-3 font-bold">Khách hàng</th>
                            <th className="px-5 py-3 font-bold">Trạng thái</th>
                            <th className="px-5 py-3 font-bold text-right">
                              Xử lý
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {data.requests.slice(0, 5).map((r) => (
                            <tr key={r.code} className="hover:bg-soft/40">
                              <td className="px-5 py-3.5 font-mono font-bold text-brand">
                                <Link
                                  href={`/quan-tri/${r.code}`}
                                  className="hover:underline"
                                >
                                  {r.code}
                                </Link>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="font-bold text-ink">{r.name}</p>
                                <p className="text-xs text-muted">{r.phone}</p>
                              </td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={r.status} />
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <Link
                                  href={`/quan-tri/${r.code}`}
                                  className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                                >
                                  Chi tiết
                                  <ArrowRight
                                    size={13}
                                    weight="bold"
                                    aria-hidden
                                  />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="p-6 text-sm text-muted">
                      Chưa có yêu cầu báo giá nào.
                    </p>
                  )}
                </div>

                {/* Recent Contacts */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="text-base">Tin nhắn liên hệ mới nhất</h2>
                    <button
                      type="button"
                      onClick={() => switchTab("contacts")}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  {data.contacts.length > 0 ? (
                    <div className="divide-y divide-line">
                      {data.contacts.slice(0, 4).map((c) => (
                        <div key={c.id} className="p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-ink">
                              {c.name}{" "}
                              <span className="font-normal text-muted">
                                · {c.phone}
                              </span>
                            </p>
                            <span className="text-xs text-muted">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-body">{c.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-6 text-sm text-muted">
                      Chưa có tin nhắn liên hệ nào.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {/* QUOTE REQUESTS TAB */}
            {tab === "requests" ? (
              <div className="space-y-4">
                <h1 className="text-[1.5rem]">
                  Yêu cầu báo giá ({filteredRequests.length}/
                  {data.requests.length})
                </h1>
                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                    <div className="relative max-w-xs flex-1">
                      <MagnifyingGlass
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Tìm yêu cầu báo giá"
                        placeholder="Tìm mã VK-, tên, SĐT, công ty..."
                        className="field py-2 pl-9 text-sm"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc trạng thái báo giá"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      {(Object.keys(STATUS_LABELS) as QuoteStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-bold">Mã</th>
                          <th className="px-5 py-3 font-bold">Khách hàng</th>
                          <th className="px-5 py-3 font-bold">Sản phẩm</th>
                          <th className="px-5 py-3 font-bold">Thời gian</th>
                          <th className="px-5 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">
                            Xử lý
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedRequests.map((r) => (
                          <tr key={r.code} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5 font-mono font-bold text-brand">
                              <Link
                                href={`/quan-tri/${r.code}`}
                                className="hover:underline"
                              >
                                {r.code}
                              </Link>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-ink">{r.name}</p>
                              <p className="text-xs text-muted">
                                {r.phone}
                                {r.company ? ` · ${r.company}` : ""}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              {r.items.length} dòng (
                              {r.items.reduce((s, i) => s + i.qty, 0)} SP)
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted">
                              {formatDateTime(r.createdAt)}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <Link
                                href={`/quan-tri/${r.code}`}
                                className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                              >
                                Xử lý
                                <ArrowRight
                                  size={13}
                                  weight="bold"
                                  aria-hidden
                                />
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {pagedRequests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-5 py-8 text-center text-sm text-muted"
                            >
                              Không tìm thấy yêu cầu báo giá phù hợp.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    page={page}
                    totalItems={filteredRequests.length}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ) : null}

            {/* CONTACTS TAB */}
            {tab === "contacts" ? (
              <div className="space-y-4">
                <h1 className="text-[1.5rem]">
                  Tin nhắn liên hệ ({data.contacts.length})
                </h1>
                {data.contacts.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {data.contacts.map((c) => (
                      <div key={c.id} className="card p-5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-brand">
                            {c.id}
                          </span>
                          <span className="text-xs text-muted">
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 font-bold text-ink">{c.name}</p>
                        <p className="text-xs text-muted">
                          <a
                            href={telHref(c.phone)}
                            className="font-semibold text-brand hover:underline"
                          >
                            {c.phone}
                          </a>
                          {c.email ? ` · ${c.email}` : ""}
                        </p>
                        <p className="mt-3 whitespace-pre-line text-sm text-body">
                          {c.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card p-8 text-center text-sm text-muted">
                    Chưa có tin nhắn liên hệ nào.
                  </div>
                )}
              </div>
            ) : null}

            {/* BANNER CMS TAB */}
            {tab === "banner" ? (
              <BannerManagerSection
                products={data.products}
                categories={categoryOptions}
                draft={bannerDraft}
                isDirty={isBannerDirty}
                busy={busy}
                onChangeDraft={setBannerDraft}
                onSave={() =>
                  void mutate(
                    "banner",
                    "save",
                    bannerDraft,
                    `Đã lưu Banner trang chủ (${bannerDraft.productSlugs.length} sản phẩm).`
                  )
                }
              />
            ) : null}

            {/* PRODUCTS CMS TAB */}
            {tab === "products" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[1.5rem]">
                      Quản lý sản phẩm ({filteredProducts.length}/
                      {data.products.length})
                    </h1>
                    <p className="text-sm text-muted">
                      {visibleProductsCount} hiển thị · {hiddenProductsCount} ẩn ·{" "}
                      {featuredProductsCount} nổi bật ·{" "}
                      {data.banner.productSlugs.length}/10 trên Banner.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => switchTab("banner")}
                      className="btn btn-outline btn-sm"
                    >
                      <Sparkle size={15} weight="fill" aria-hidden />
                      Banner trang chủ ({data.banner.productSlugs.length}/10)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductModal("new")}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Thêm sản phẩm
                    </button>
                  </div>
                </div>

                <div className="card overflow-hidden">
                  {/* Search, Category, Status & Sort Toolbar */}
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                      <MagnifyingGlass
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Tìm kiếm sản phẩm"
                        placeholder="Tìm tên, slug, mã tiếng Anh..."
                        className="field py-2 pl-9 text-sm"
                      />
                    </div>
                    <select
                      value={catFilter}
                      onChange={(e) => {
                        setCatFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc theo nhóm sản phẩm"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả nhóm</option>
                      {categoryOptions.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc theo trạng thái sản phẩm"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="show">Hiển thị</option>
                      <option value="hidden">Ẩn (Bản nháp)</option>
                      <option value="featured">Đang nổi bật</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      aria-label="Sắp xếp sản phẩm"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="default">Thứ tự mặc định</option>
                      <option value="updated-desc">Mới cập nhật</option>
                      <option value="title-asc">Tên A → Z</option>
                      <option value="title-desc">Tên Z → A</option>
                    </select>
                  </div>

                  {/* Bulk Action Bar */}
                  {selectedSlugs.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#eaf1fa] px-4 py-2.5 text-xs font-semibold text-brand">
                      <span>Đã chọn {selectedSlugs.length} sản phẩm</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "products",
                              "show",
                              "Đã bật hiển thị các sản phẩm đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Hiện đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "products",
                              "hidden",
                              "Đã ẩn các sản phẩm đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Ẩn đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirmBulkDelete("products", "sản phẩm")
                          }
                          className="rounded-lg bg-[#c0392b] px-2.5 py-1 text-white hover:bg-[#a5281b]"
                        >
                          Xóa đã chọn
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSlugs([])}
                          className="px-2 py-1 text-muted hover:text-ink"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label="Chọn tất cả sản phẩm trang hiện tại"
                              checked={
                                pagedProducts.length > 0 &&
                                pagedProducts.every((p) =>
                                  selectedSlugs.includes(p.slug)
                                )
                              }
                              onChange={(e) =>
                                toggleSelectPage(
                                  pagedProducts.map((p) => p.slug),
                                  e.target.checked
                                )
                              }
                            />
                          </th>
                          <th className="px-4 py-3 font-bold">Sản phẩm</th>
                          <th className="px-4 py-3 font-bold">Nhóm</th>
                          <th className="px-4 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedProducts.map((p) => {
                          const refs = productReferenceMap.get(p.slug);
                          const refTotal =
                            (refs?.apps ?? 0) + (refs?.articles ?? 0);
                          return (
                            <tr key={p.slug} className="hover:bg-soft/40">
                              <td className="px-4 py-3.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Chọn sản phẩm ${p.name}`}
                                  checked={selectedSlugs.includes(p.slug)}
                                  onChange={(e) =>
                                    toggleSelectOne(p.slug, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-soft">
                                    <Image
                                      src={p.images[0] || DEFAULT_PRODUCT_IMAGE}
                                      alt={p.name}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                    />
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="font-bold text-ink">
                                        {p.name}
                                      </p>
                                      {p.featured ? (
                                        <span
                                          title="Hiển thị nổi bật trang chủ"
                                          className="inline-flex items-center gap-0.5 rounded-full bg-[#fff4d6] px-2 py-0.5 text-[10.5px] font-bold text-[#9a6500]"
                                        >
                                          <Star
                                            size={11}
                                            weight="fill"
                                            aria-hidden
                                          />
                                          Nổi bật
                                        </span>
                                      ) : null}
                                      {data.banner.productSlugs.includes(
                                        p.slug
                                      ) ? (
                                        <span
                                          title="Đang chạy ở Banner đầu trang chủ"
                                          className="inline-flex items-center gap-0.5 rounded-full bg-[#eaf1fa] px-2 py-0.5 text-[10.5px] font-bold text-brand"
                                        >
                                          <Sparkle
                                            size={11}
                                            weight="fill"
                                            aria-hidden
                                          />
                                          Banner
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-muted">
                                      {p.englishName || p.slug}
                                      {refTotal > 0
                                        ? ` · gắn ở ${refTotal} bài viết`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-xs font-semibold text-body">
                                {p.categoryLabel}
                              </td>
                              <td className="px-4 py-3.5">
                                <StatusPill status={p.status} />
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex justify-end gap-1.5">
                                  {p.status === "show" ? (
                                    <a
                                      href={`/san-pham/${p.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Xem trên website"
                                      aria-label={`Xem ${p.name} trên website`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                    >
                                      <ArrowSquareOut size={15} aria-hidden />
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setProductModal(p)}
                                    title="Sửa"
                                    aria-label={`Sửa ${p.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <PencilSimple size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void mutate(
                                        "products",
                                        "duplicate",
                                        { slug: p.slug },
                                        "Đã nhân bản sản phẩm (mặc định ở trạng thái Ẩn)."
                                      )
                                    }
                                    title="Nhân bản"
                                    aria-label={`Nhân bản ${p.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <Copy size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void mutate(
                                        "products",
                                        "toggle",
                                        { slug: p.slug },
                                        "Đã đổi trạng thái hiển thị."
                                      )
                                    }
                                    title={
                                      p.status === "show" ? "Ẩn" : "Hiển thị"
                                    }
                                    aria-label={
                                      p.status === "show"
                                        ? `Ẩn ${p.name}`
                                        : `Hiển thị ${p.name}`
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    {p.status === "show" ? (
                                      <EyeSlash size={15} aria-hidden />
                                    ) : (
                                      <Eye size={15} aria-hidden />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => confirmDeleteProduct(p)}
                                    title="Xóa"
                                    aria-label={`Xóa ${p.name}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                  >
                                    <Trash size={15} aria-hidden />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {pagedProducts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-8 text-center text-sm text-muted"
                            >
                              Không có sản phẩm nào khớp bộ lọc hiện tại.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    page={page}
                    totalItems={filteredProducts.length}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ) : null}

            {/* APPLICATIONS CMS TAB */}
            {tab === "applications" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[1.5rem]">
                      Quản lý bài ứng dụng ({filteredApps.length}/
                      {data.applications.length})
                    </h1>
                    <p className="text-sm text-muted">
                      {visibleAppsCount} hiển thị · {hiddenAppsCount} ẩn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppModal("new")}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} weight="bold" aria-hidden />
                    Thêm bài ứng dụng
                  </button>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                      <MagnifyingGlass
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Tìm bài ứng dụng"
                        placeholder="Tìm theo tiêu đề, ngành, slug..."
                        className="field py-2 pl-9 text-sm"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc trạng thái bài ứng dụng"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="show">Hiển thị</option>
                      <option value="hidden">Ẩn (Bản nháp)</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      aria-label="Sắp xếp bài ứng dụng"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="default">Thứ tự mặc định</option>
                      <option value="updated-desc">Mới cập nhật</option>
                      <option value="title-asc">Tiêu đề A → Z</option>
                      <option value="title-desc">Tiêu đề Z → A</option>
                    </select>
                  </div>

                  {selectedSlugs.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#eaf1fa] px-4 py-2.5 text-xs font-semibold text-brand">
                      <span>Đã chọn {selectedSlugs.length} bài ứng dụng</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "applications",
                              "show",
                              "Đã hiển thị các bài ứng dụng đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Hiện đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "applications",
                              "hidden",
                              "Đã ẩn các bài ứng dụng đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Ẩn đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirmBulkDelete("applications", "bài ứng dụng")
                          }
                          className="rounded-lg bg-[#c0392b] px-2.5 py-1 text-white hover:bg-[#a5281b]"
                        >
                          Xóa đã chọn
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSlugs([])}
                          className="px-2 py-1 text-muted hover:text-ink"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label="Chọn tất cả bài ứng dụng trang hiện tại"
                              checked={
                                pagedApps.length > 0 &&
                                pagedApps.every((a) =>
                                  selectedSlugs.includes(a.slug)
                                )
                              }
                              onChange={(e) =>
                                toggleSelectPage(
                                  pagedApps.map((a) => a.slug),
                                  e.target.checked
                                )
                              }
                            />
                          </th>
                          <th className="px-4 py-3 font-bold">Tiêu đề</th>
                          <th className="px-4 py-3 font-bold">Ngành</th>
                          <th className="px-4 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedApps.map((a) => (
                          <tr key={a.slug} className="hover:bg-soft/40">
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                aria-label={`Chọn ${a.title}`}
                                checked={selectedSlugs.includes(a.slug)}
                                onChange={(e) =>
                                  toggleSelectOne(a.slug, e.target.checked)
                                }
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-ink">{a.title}</p>
                              <p className="text-xs text-muted">
                                {a.slug} · {a.relatedProducts.length} SP liên quan
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted">
                              {a.tag}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusPill status={a.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                {a.status === "show" ? (
                                  <a
                                    href={`/ung-dung/${a.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Xem trên website"
                                    aria-label={`Xem ${a.title} trên website`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <ArrowSquareOut size={15} aria-hidden />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setAppModal(a)}
                                  title="Sửa"
                                  aria-label={`Sửa ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      "applications",
                                      "duplicate",
                                      { slug: a.slug },
                                      "Đã nhân bản bài ứng dụng."
                                    )
                                  }
                                  title="Nhân bản"
                                  aria-label={`Nhân bản ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <Copy size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      "applications",
                                      "toggle",
                                      { slug: a.slug },
                                      "Đã cập nhật trạng thái."
                                    )
                                  }
                                  title="Ẩn / Hiện"
                                  aria-label={`Đổi trạng thái ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  {a.status === "show" ? (
                                    <EyeSlash size={15} aria-hidden />
                                  ) : (
                                    <Eye size={15} aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmState({
                                      title: `Xóa bài ứng dụng "${a.title}"?`,
                                      description:
                                        "Bài viết sẽ bị xóa khỏi PostgreSQL.",
                                      confirmLabel: "Xóa bài ứng dụng",
                                      danger: true,
                                      run: async () => {
                                        setConfirmState(null);
                                        await mutate(
                                          "applications",
                                          "delete",
                                          { slug: a.slug },
                                          "Đã xóa bài ứng dụng."
                                        );
                                      },
                                    })
                                  }
                                  title="Xóa"
                                  aria-label={`Xóa ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pagedApps.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-8 text-center text-sm text-muted"
                            >
                              Không tìm thấy bài ứng dụng phù hợp.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    page={page}
                    totalItems={filteredApps.length}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ) : null}

            {/* ARTICLES CMS TAB */}
            {tab === "articles" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[1.5rem]">
                      Quản lý tin tức &amp; kiến thức ({filteredArticles.length}
                      /{data.articles.length})
                    </h1>
                    <p className="text-sm text-muted">
                      {visibleArticlesCount} hiển thị · {hiddenArticlesCount} ẩn.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArticleModal("new")}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} weight="bold" aria-hidden />
                    Thêm bài tin tức
                  </button>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                      <MagnifyingGlass
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Tìm bài tin tức"
                        placeholder="Tìm tiêu đề, slug, tác giả..."
                        className="field py-2 pl-9 text-sm"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc trạng thái tin tức"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="show">Hiển thị</option>
                      <option value="hidden">Ẩn (Bản nháp)</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      aria-label="Sắp xếp tin tức"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="default">Thứ tự mặc định</option>
                      <option value="updated-desc">Mới cập nhật</option>
                      <option value="title-asc">Tiêu đề A → Z</option>
                      <option value="title-desc">Tiêu đề Z → A</option>
                    </select>
                  </div>

                  {selectedSlugs.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#eaf1fa] px-4 py-2.5 text-xs font-semibold text-brand">
                      <span>Đã chọn {selectedSlugs.length} bài tin tức</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "articles",
                              "show",
                              "Đã hiển thị các bài viết đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Hiện đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "articles",
                              "hidden",
                              "Đã ẩn các bài viết đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Ẩn đã chọn
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirmBulkDelete("articles", "bài tin tức")
                          }
                          className="rounded-lg bg-[#c0392b] px-2.5 py-1 text-white hover:bg-[#a5281b]"
                        >
                          Xóa đã chọn
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSlugs([])}
                          className="px-2 py-1 text-muted hover:text-ink"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label="Chọn tất cả bài tin tức trang hiện tại"
                              checked={
                                pagedArticles.length > 0 &&
                                pagedArticles.every((a) =>
                                  selectedSlugs.includes(a.slug)
                                )
                              }
                              onChange={(e) =>
                                toggleSelectPage(
                                  pagedArticles.map((a) => a.slug),
                                  e.target.checked
                                )
                              }
                            />
                          </th>
                          <th className="px-4 py-3 font-bold">Bài viết</th>
                          <th className="px-4 py-3 font-bold">Ngày đăng</th>
                          <th className="px-4 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedArticles.map((a) => (
                          <tr key={a.slug} className="hover:bg-soft/40">
                            <td className="px-4 py-3.5">
                              <input
                                type="checkbox"
                                aria-label={`Chọn ${a.title}`}
                                checked={selectedSlugs.includes(a.slug)}
                                onChange={(e) =>
                                  toggleSelectOne(a.slug, e.target.checked)
                                }
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-ink">{a.title}</p>
                              <p className="text-xs text-muted">
                                {a.slug} · {a.relatedProducts.length} SP liên quan
                              </p>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted">
                              {a.date}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusPill status={a.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                {a.status === "show" ? (
                                  <a
                                    href={`/tin-tuc/${a.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Xem trên website"
                                    aria-label={`Xem ${a.title} trên website`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <ArrowSquareOut size={15} aria-hidden />
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setArticleModal(a)}
                                  title="Sửa"
                                  aria-label={`Sửa ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      "articles",
                                      "duplicate",
                                      { slug: a.slug },
                                      "Đã nhân bản bài tin tức."
                                    )
                                  }
                                  title="Nhân bản"
                                  aria-label={`Nhân bản ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <Copy size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void mutate(
                                      "articles",
                                      "toggle",
                                      { slug: a.slug },
                                      "Đã cập nhật trạng thái."
                                    )
                                  }
                                  title="Ẩn / Hiện"
                                  aria-label={`Đổi trạng thái ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  {a.status === "show" ? (
                                    <EyeSlash size={15} aria-hidden />
                                  ) : (
                                    <Eye size={15} aria-hidden />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmState({
                                      title: `Xóa bài viết "${a.title}"?`,
                                      description:
                                        "Bài tin tức sẽ bị xóa khỏi PostgreSQL.",
                                      confirmLabel: "Xóa bài viết",
                                      danger: true,
                                      run: async () => {
                                        setConfirmState(null);
                                        await mutate(
                                          "articles",
                                          "delete",
                                          { slug: a.slug },
                                          "Đã xóa bài viết."
                                        );
                                      },
                                    })
                                  }
                                  title="Xóa"
                                  aria-label={`Xóa ${a.title}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pagedArticles.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-8 text-center text-sm text-muted"
                            >
                              Không tìm thấy bài tin tức phù hợp.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    page={page}
                    totalItems={filteredArticles.length}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ) : null}

            {/* JOBS CMS TAB */}
            {tab === "jobs" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[1.5rem]">
                      Quản lý tuyển dụng ({filteredJobs.length}/
                      {data.jobs.length})
                    </h1>
                    <p className="text-sm text-muted">
                      {activeOpenJobs.length} đang tuyển ({totalNeeded} người)
                      {expiredOpenJobs.length > 0
                        ? ` · ${expiredOpenJobs.length} vị trí quá hạn nộp`
                        : ""}
                      .
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJobModal("new")}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} weight="bold" aria-hidden />
                    Thêm vị trí
                  </button>
                </div>

                {/* Shared Recruitment Settings including Default Benefits */}
                <div className="card space-y-3.5 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base">
                      Nội dung chung &amp; Quyền lợi mẫu trang Tuyển dụng
                    </h2>
                    {isRecruitmentDirty ? (
                      <span className="rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                        Chưa lưu cài đặt
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="rec-intro" className="label">
                        Lời giới thiệu chung
                      </label>
                      <textarea
                        id="rec-intro"
                        rows={3}
                        value={recIntro}
                        onChange={(e) => setRecIntro(e.target.value)}
                        className="field"
                      />
                    </div>
                    <div>
                      <label htmlFor="rec-benefits" className="label">
                        Quyền lợi mẫu (dùng nút &ldquo;Chèn quyền lợi chung&rdquo; trong từng vị trí)
                      </label>
                      <textarea
                        id="rec-benefits"
                        rows={3}
                        value={recBenefits}
                        onChange={(e) => setRecBenefits(e.target.value)}
                        className="field"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label htmlFor="rec-email" className="label">
                        Email nhận hồ sơ ứng tuyển
                      </label>
                      <input
                        id="rec-email"
                        type="email"
                        value={recEmail}
                        onChange={(e) => setRecEmail(e.target.value)}
                        className="field"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          "settings",
                          "save",
                          {
                            intro: recIntro,
                            email: recEmail,
                            defaultBenefits: recBenefits,
                          },
                          "Đã lưu cài đặt tuyển dụng."
                        )
                      }
                      className="btn btn-brand btn-sm"
                    >
                      Lưu cài đặt
                    </button>
                  </div>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
                    <div className="relative min-w-[200px] flex-1 max-w-xs">
                      <MagnifyingGlass
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Tìm vị trí tuyển dụng"
                        placeholder="Tìm tên vị trí, bộ phận, địa điểm..."
                        className="field py-2 pl-9 text-sm"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Lọc trạng thái tuyển dụng"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="open">Đang tuyển (còn hạn)</option>
                      <option value="expired">Quá hạn nộp</option>
                      <option value="paused">Tạm dừng</option>
                      <option value="closed">Đã đóng</option>
                    </select>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      aria-label="Sắp xếp vị trí tuyển dụng"
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="default">Thứ tự mặc định</option>
                      <option value="updated-desc">Mới cập nhật</option>
                      <option value="title-asc">Vị trí A → Z</option>
                      <option value="title-desc">Vị trí Z → A</option>
                    </select>
                  </div>

                  {selectedSlugs.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#eaf1fa] px-4 py-2.5 text-xs font-semibold text-brand">
                      <span>Đã chọn {selectedSlugs.length} vị trí</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "jobs",
                              "open",
                              "Đã mở tuyển lại các vị trí đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Mở tuyển
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleBulkStatus(
                              "jobs",
                              "paused",
                              "Đã tạm dừng các vị trí đã chọn."
                            )
                          }
                          className="rounded-lg bg-white px-2.5 py-1 text-ink shadow-xs hover:text-brand"
                        >
                          Tạm dừng
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            confirmBulkDelete("jobs", "vị trí tuyển dụng")
                          }
                          className="rounded-lg bg-[#c0392b] px-2.5 py-1 text-white hover:bg-[#a5281b]"
                        >
                          Xóa đã chọn
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSlugs([])}
                          className="px-2 py-1 text-muted hover:text-ink"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label="Chọn tất cả vị trí trang hiện tại"
                              checked={
                                pagedJobs.length > 0 &&
                                pagedJobs.every((j) =>
                                  selectedSlugs.includes(j.slug)
                                )
                              }
                              onChange={(e) =>
                                toggleSelectPage(
                                  pagedJobs.map((j) => j.slug),
                                  e.target.checked
                                )
                              }
                            />
                          </th>
                          <th className="px-4 py-3 font-bold">Vị trí</th>
                          <th className="px-4 py-3 font-bold">Số lượng</th>
                          <th className="px-4 py-3 font-bold">Hạn nộp</th>
                          <th className="px-4 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pagedJobs.map((j) => {
                          const expired = isJobExpired(j.deadline);
                          return (
                            <tr key={j.slug} className="hover:bg-soft/40">
                              <td className="px-4 py-3.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Chọn ${j.title}`}
                                  checked={selectedSlugs.includes(j.slug)}
                                  onChange={(e) =>
                                    toggleSelectOne(j.slug, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="font-bold text-ink">{j.title}</p>
                                <p className="text-xs text-muted">
                                  {j.department} · {j.location} · {j.salary}
                                </p>
                              </td>
                              <td className="px-4 py-3.5 font-semibold">
                                {j.qty} người
                              </td>
                              <td className="px-4 py-3.5 text-xs text-muted">
                                {j.deadline || "Không giới hạn"}
                              </td>
                              <td className="px-4 py-3.5">
                                <StatusPill
                                  status={j.status}
                                  expired={expired}
                                />
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex justify-end gap-1.5">
                                  {j.status === "open" && !expired ? (
                                    <a
                                      href={`/tuyen-dung/${j.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Xem trên website"
                                      aria-label={`Xem ${j.title} trên website`}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                    >
                                      <ArrowSquareOut size={15} aria-hidden />
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setJobModal(j)}
                                    title="Sửa"
                                    aria-label={`Sửa ${j.title}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <PencilSimple size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void mutate(
                                        "jobs",
                                        "duplicate",
                                        { slug: j.slug },
                                        "Đã nhân bản vị trí tuyển dụng."
                                      )
                                    }
                                    title="Nhân bản"
                                    aria-label={`Nhân bản ${j.title}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    <Copy size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void mutate(
                                        "jobs",
                                        "toggle",
                                        { slug: j.slug },
                                        "Đã đổi trạng thái tuyển dụng."
                                      )
                                    }
                                    title="Đóng / Mở lại"
                                    aria-label={`Đổi trạng thái ${j.title}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                  >
                                    {j.status === "open" ? (
                                      <EyeSlash size={15} aria-hidden />
                                    ) : (
                                      <Eye size={15} aria-hidden />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      setConfirmState({
                                        title: `Xóa vị trí "${j.title}"?`,
                                        description:
                                          "Vị trí tuyển dụng sẽ bị xóa khỏi PostgreSQL.",
                                        confirmLabel: "Xóa vị trí",
                                        danger: true,
                                        run: async () => {
                                          setConfirmState(null);
                                          await mutate(
                                            "jobs",
                                            "delete",
                                            { slug: j.slug },
                                            "Đã xóa vị trí."
                                          );
                                        },
                                      })
                                    }
                                    title="Xóa"
                                    aria-label={`Xóa ${j.title}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                  >
                                    <Trash size={15} aria-hidden />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {pagedJobs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-5 py-8 text-center text-sm text-muted"
                            >
                              Không có vị trí tuyển dụng nào khớp bộ lọc.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    page={page}
                    totalItems={filteredJobs.length}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            ) : null}

            {/* DATA & BACKUP TAB */}
            {tab === "data" ? (
              <div className="space-y-5">
                <h1 className="text-[1.5rem]">Dữ liệu &amp; sao lưu</h1>
                <div className="grid gap-5 md:grid-cols-3">
                  {/* Export JSON */}
                  <div className="card flex flex-col justify-between space-y-4 p-6">
                    <div className="space-y-2">
                      <h2 className="text-base">Xuất sao lưu JSON</h2>
                      <p className="text-sm text-muted">
                        Tải toàn bộ dữ liệu PostgreSQL hiện tại gồm{" "}
                        {data.products.length} sản phẩm,{" "}
                        {data.applications.length} bài ứng dụng,{" "}
                        {data.articles.length} bài tin tức và {data.jobs.length}{" "}
                        vị trí tuyển dụng.
                      </p>
                    </div>
                    <div>
                      <a
                        href="/api/admin/cms?export=1"
                        className="btn btn-brand btn-sm"
                      >
                        <DownloadSimple size={16} aria-hidden />
                        Tải file sao lưu JSON
                      </a>
                    </div>
                  </div>

                  {/* Import JSON with Validation & Confirmation */}
                  <div className="card flex flex-col justify-between space-y-4 p-6">
                    <div className="space-y-2">
                      <h2 className="text-base">Nhập từ file sao lưu JSON</h2>
                      <p className="text-sm text-muted">
                        Kiểm tra cấu trúc 4 bảng, lọc mã độc HTML/script, nâng cấp ảnh{" "}
                        <code>http://</code> sang <code>https://</code>, dọn ID mồ côi và hỏi xác nhận trước khi ghi đè.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={importInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleJsonFileSelected(file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => importInputRef.current?.click()}
                        className="btn btn-outline btn-sm border-brand text-brand hover:bg-brand hover:text-white"
                      >
                        <FileArrowUp size={16} aria-hidden />
                        Chọn file JSON để nhập
                      </button>
                    </div>
                  </div>

                  {/* Reset to Seed Snapshot */}
                  <div className="card flex flex-col justify-between space-y-4 p-6">
                    <div className="space-y-2">
                      <h2 className="text-base">Khôi phục kho dữ liệu gốc</h2>
                      <p className="text-sm text-muted">
                        Đặt lại 4 bảng nội dung CMS trong PostgreSQL về bộ seed chuẩn của mã nguồn (118 sản phẩm, 8 ứng dụng, 8 tin tức, 8 vị trí). Giữ nguyên yêu cầu báo giá và liên hệ.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setConfirmState({
                            title: "Khôi phục về bộ dữ liệu seed gốc?",
                            description:
                              "Mọi chỉnh sửa thủ công trên bảng Sản phẩm, Ứng dụng, Tin tức và Tuyển dụng sẽ quay về dữ liệu chuẩn trong kho mã nguồn. Yêu cầu báo giá và tin nhắn liên hệ của khách hàng không bị ảnh hưởng.",
                            confirmLabel: "Khôi phục dữ liệu gốc",
                            danger: true,
                            run: async () => {
                              setConfirmState(null);
                              await mutate(
                                "system",
                                "reset",
                                {},
                                "Đã khôi phục bảng CMS về dữ liệu gốc."
                              );
                            },
                          })
                        }
                        className="btn btn-outline btn-sm border-[#c0392b] text-[#c0392b] hover:bg-[#c0392b] hover:text-white"
                      >
                        Khôi phục dữ liệu gốc
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* PRODUCT MODAL */}
      {productModal ? (
        <ProductEditorModal
          initial={productModal === "new" ? null : productModal}
          busy={busy}
          featuredCount={featuredProductsCount}
          mediaLibrary={mediaLibrary}
          onNotify={notify}
          onClose={() => setProductModal(null)}
          onSave={async (payload, stay) => {
            const res = await mutate<CmsProduct>(
              "products",
              "save",
              payload,
              stay
                ? "Đã lưu sản phẩm — bạn có thể tiếp tục chỉnh sửa."
                : "Đã lưu sản phẩm vào PostgreSQL."
            );
            if (res.ok && !stay) setProductModal(null);
            return res.item ?? null;
          }}
        />
      ) : null}

      {/* APPLICATION MODAL */}
      {appModal ? (
        <ArticleLikeModal
          kind="applications"
          titleLabel={
            appModal === "new" ? "Thêm bài ứng dụng" : "Sửa bài ứng dụng"
          }
          extraLabel="Ngành / nhãn"
          initial={
            appModal === "new"
              ? null
              : {
                slug: appModal.slug,
                title: appModal.title,
                extraValue: appModal.tag,
                image: appModal.image,
                excerpt: appModal.excerpt,
                contentText: blocksToText(appModal.blocks),
                video: appModal.video,
                relatedProducts: appModal.relatedProducts,
                status: appModal.status,
              }
          }
          allProducts={data.products}
          mediaLibrary={mediaLibrary}
          busy={busy}
          onNotify={notify}
          onClose={() => setAppModal(null)}
          onSave={async (payload, stay) => {
            const res = await mutate<CmsApplication>(
              "applications",
              "save",
              { ...payload, tag: payload.extraValue },
              stay
                ? "Đã lưu bài ứng dụng — tiếp tục chỉnh sửa."
                : "Đã lưu bài ứng dụng."
            );
            if (res.ok && !stay) setAppModal(null);
            return res.item ?? null;
          }}
        />
      ) : null}

      {/* ARTICLE MODAL */}
      {articleModal ? (
        <ArticleLikeModal
          kind="articles"
          titleLabel={
            articleModal === "new" ? "Thêm bài tin tức" : "Sửa bài tin tức"
          }
          extraLabel="Ngày đăng (múi giờ VN)"
          initial={
            articleModal === "new"
              ? null
              : {
                slug: articleModal.slug,
                title: articleModal.title,
                extraValue: articleModal.date,
                author: articleModal.author,
                image: articleModal.image,
                excerpt: articleModal.excerpt,
                contentText: blocksToText(articleModal.blocks),
                video: articleModal.video,
                relatedProducts: articleModal.relatedProducts,
                status: articleModal.status,
              }
          }
          allProducts={data.products}
          mediaLibrary={mediaLibrary}
          busy={busy}
          onNotify={notify}
          onClose={() => setArticleModal(null)}
          onSave={async (payload, stay) => {
            const res = await mutate<CmsArticle>(
              "articles",
              "save",
              { ...payload, date: payload.extraValue },
              stay
                ? "Đã lưu bài tin tức — tiếp tục chỉnh sửa."
                : "Đã lưu bài tin tức."
            );
            if (res.ok && !stay) setArticleModal(null);
            return res.item ?? null;
          }}
        />
      ) : null}

      {/* JOB MODAL */}
      {jobModal ? (
        <JobEditorModal
          initial={jobModal === "new" ? null : jobModal}
          defaultBenefits={recBenefits}
          busy={busy}
          onNotify={notify}
          onClose={() => setJobModal(null)}
          onSave={async (payload, stay) => {
            const res = await mutate<CmsJob>(
              "jobs",
              "save",
              payload,
              stay
                ? "Đã lưu vị trí tuyển dụng — tiếp tục chỉnh sửa."
                : "Đã lưu vị trí tuyển dụng."
            );
            if (res.ok && !stay) setJobModal(null);
            return res.item ?? null;
          }}
        />
      ) : null}

      {/* ACCESSIBLE CONFIRMATION DIALOG */}
      {confirmState ? (
        <ConfirmDialog
          title={confirmState.title}
          description={confirmState.description}
          warnings={confirmState.warnings}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          busy={busy}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => void confirmState.run()}
        />
      ) : null}
    </div>
  );
}
