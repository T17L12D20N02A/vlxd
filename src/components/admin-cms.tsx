"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  ChatCircleText,
  Copy,
  Database,
  DownloadSimple,
  Eye,
  EyeSlash,
  Newspaper,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  SignOut,
  SquaresFour,
  Stack,
  Trash,
  X,
} from "@phosphor-icons/react";
import { adminLogout } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import type {
  CmsApplication,
  CmsArticle,
  CmsJob,
  CmsProduct,
  RecruitmentSettings,
} from "@/lib/cms-store";
import type { ContactMessage } from "@/lib/contacts-store";
import { cn, formatDateTime, telHref } from "@/lib/format";
import { STATUS_LABELS, type QuoteStatus } from "@/lib/request";
import type { StoredRequest } from "@/lib/requests-store";
import type { Block } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { slug: "vai", label: "Vải Teflon chịu nhiệt" },
  { slug: "bangkeo", label: "Băng keo chịu nhiệt" },
  { slug: "epkeo", label: "Băng tải máy ép keo" },
  { slug: "bangtai", label: "Băng tải Teflon" },
  { slug: "daydai", label: "Dây đai hàn nhiệt" },
];

const JOB_TYPES = ["Toàn thời gian", "Bán thời gian", "Thời vụ", "Thực tập"];

type TabKey =
  | "dashboard"
  | "requests"
  | "contacts"
  | "products"
  | "applications"
  | "articles"
  | "jobs"
  | "data";

export type AdminInitialData = {
  dbMode: "postgres" | "json";
  products: CmsProduct[];
  applications: CmsApplication[];
  articles: CmsArticle[];
  jobs: CmsJob[];
  recruitment: RecruitmentSettings;
  requests: StoredRequest[];
  contacts: ContactMessage[];
};

function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.type === "h") return `## ${block.text}`;
      if (block.type === "list") return block.items.map((i) => `- ${i}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

function StatusPill({ status }: { status: string }) {
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

export function AdminCms({ initial }: { initial: AdminInitialData }) {
  const [data, setData] = useState<AdminInitialData>(initial);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null
  );

  // Modal state for CRUD editors
  const [productModal, setProductModal] = useState<CmsProduct | "new" | null>(null);
  const [appModal, setAppModal] = useState<CmsApplication | "new" | null>(null);
  const [articleModal, setArticleModal] = useState<CmsArticle | "new" | null>(null);
  const [jobModal, setJobModal] = useState<CmsJob | "new" | null>(null);

  // Recruitment settings local state
  const [recIntro, setRecIntro] = useState(initial.recruitment.intro);
  const [recEmail, setRecEmail] = useState(initial.recruitment.email);

  function notify(text: string, kind: "ok" | "err" = "ok") {
    setToast({ text, kind });
    setTimeout(() => {
      setToast((current) => (current?.text === text ? null : current));
    }, 3500);
  }

  async function reload() {
    const res = await fetch("/api/admin/cms", { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được dữ liệu quản trị.");
    const next = (await res.json()) as AdminInitialData;
    setData(next);
    setRecIntro(next.recruitment.intro);
    setRecEmail(next.recruitment.email);
  }

  async function mutate(
    entity: string,
    action: string,
    payload: Record<string, unknown> = {},
    successMsg?: string
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action, payload }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Thao tác thất bại.");
      }
      await reload();
      if (successMsg) notify(successMsg, "ok");
      return true;
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra.",
        "err"
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function switchTab(next: TabKey) {
    setTab(next);
    setSearch("");
    setCatFilter("");
    setStatusFilter("");
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q)) &&
        (!catFilter || p.category === catFilter) &&
        (!statusFilter || p.status === statusFilter)
    );
  }, [data.products, search, catFilter, statusFilter]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.applications.filter(
      (a) =>
        (!q || a.title.toLowerCase().includes(q)) &&
        (!statusFilter || a.status === statusFilter)
    );
  }, [data.applications, search, statusFilter]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.articles.filter(
      (a) =>
        (!q || a.title.toLowerCase().includes(q)) &&
        (!statusFilter || a.status === statusFilter)
    );
  }, [data.articles, search, statusFilter]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.jobs.filter(
      (j) =>
        (!q || j.title.toLowerCase().includes(q)) &&
        (!statusFilter || j.status === statusFilter)
    );
  }, [data.jobs, search, statusFilter]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.requests.filter(
      (r) =>
        (!q ||
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.phone.includes(q)) &&
        (!statusFilter || r.status === statusFilter)
    );
  }, [data.requests, search, statusFilter]);

  const navItems: Array<{
    key: TabKey;
    label: string;
    group: string;
    count?: number;
    Icon: typeof SquaresFour;
  }> = [
    { key: "dashboard", label: "Tổng quan", group: "Tổng quan", Icon: SquaresFour },
    {
      key: "requests",
      label: "Yêu cầu báo giá",
      group: "Khách hàng",
      count: data.requests.length,
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
    { key: "data", label: "Dữ liệu & sao lưu", group: "Hệ thống", Icon: Database },
  ];

  const openJobs = data.jobs.filter((j) => j.status === "open");
  const totalNeeded = openJobs.reduce((sum, j) => sum + (j.qty || 1), 0);

  return (
    <div className="min-h-[calc(100vh-112px)] bg-soft/60">
      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          {/* Sidebar inspired by admin (1).html */}
          <aside className="rounded-2xl bg-brand-dark p-4 text-[#cfe0f3] shadow-sm lg:sticky lg:top-24">
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
                        <span className="rounded-full bg-white/14 px-2 py-0.5 text-[11px] font-bold">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </nav>

            <div className="mt-5 border-t border-white/10 pt-4 flex items-center justify-between gap-2">
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
                role="status"
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md",
                  toast.kind === "err" ? "bg-[#c0392b]" : "bg-[#1f6b41]"
                )}
              >
                <span>{toast.text}</span>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  aria-label="Đóng thông báo"
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
                      Quản lý toàn bộ sản phẩm, bài viết, tuyển dụng, báo giá và liên hệ khách hàng.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        switchTab("products");
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
                        switchTab("articles");
                        setArticleModal("new");
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Thêm tin tức
                    </button>
                  </div>
                </div>

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
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("products")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Sản phẩm
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {data.products.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("applications")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Bài ứng dụng
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {data.applications.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("articles")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Bài tin tức
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {data.articles.length}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab("jobs")}
                    className="card p-4 text-left transition hover:border-brand"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Đang tuyển ({totalNeeded} người)
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink">
                      {openJobs.length}
                    </p>
                  </button>
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
                            <th className="px-5 py-3 font-bold text-right">Xử lý</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {data.requests.slice(0, 5).map((r) => (
                            <tr key={r.code} className="hover:bg-soft/40">
                              <td className="px-5 py-3.5 font-mono font-bold text-brand">
                                <Link href={`/quan-tri/${r.code}`} className="hover:underline">
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
                                  <ArrowRight size={13} weight="bold" aria-hidden />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="p-6 text-sm text-muted">Chưa có yêu cầu báo giá nào.</p>
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
                              <span className="font-normal text-muted">· {c.phone}</span>
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
                    <p className="p-6 text-sm text-muted">Chưa có tin nhắn liên hệ nào.</p>
                  )}
                </div>
              </div>
            ) : null}

            {/* QUOTE REQUESTS TAB */}
            {tab === "requests" ? (
              <div className="space-y-4">
                <h1 className="text-[1.5rem]">Yêu cầu báo giá ({data.requests.length})</h1>
                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm mã VK-, tên, số điện thoại..."
                      className="field max-w-xs py-2 text-sm"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
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
                          <th className="px-5 py-3 font-bold text-right">Xử lý</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredRequests.map((r) => (
                          <tr key={r.code} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5 font-mono font-bold text-brand">
                              <Link href={`/quan-tri/${r.code}`} className="hover:underline">
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
                                <ArrowRight size={13} weight="bold" aria-hidden />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {/* CONTACTS TAB */}
            {tab === "contacts" ? (
              <div className="space-y-4">
                <h1 className="text-[1.5rem]">Tin nhắn liên hệ ({data.contacts.length})</h1>
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
              </div>
            ) : null}

            {/* PRODUCTS CMS TAB */}
            {tab === "products" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[1.5rem]">Quản lý sản phẩm</h1>
                    <p className="text-sm text-muted">
                      Thêm, sửa, nhân bản, ẩn/hiện hoặc xóa sản phẩm lưu trong PostgreSQL.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductModal("new")}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} weight="bold" aria-hidden />
                    Thêm sản phẩm
                  </button>
                </div>

                <div className="card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm theo tên sản phẩm..."
                      className="field max-w-xs py-2 text-sm"
                    />
                    <select
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả nhóm</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="field w-auto py-2 text-sm"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="show">Hiển thị</option>
                      <option value="hidden">Ẩn</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-bold">Sản phẩm</th>
                          <th className="px-5 py-3 font-bold">Nhóm</th>
                          <th className="px-5 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredProducts.map((p) => (
                          <tr key={p.slug} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-soft">
                                  <Image
                                    src={p.images[0]}
                                    alt=""
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-ink">{p.name}</p>
                                  <p className="text-xs text-muted">
                                    {p.englishName || p.slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-semibold text-body">
                              {p.categoryLabel}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusPill status={p.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setProductModal(p)}
                                  title="Sửa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    mutate(
                                      "products",
                                      "duplicate",
                                      { slug: p.slug },
                                      "Đã nhân bản sản phẩm."
                                    )
                                  }
                                  title="Nhân bản"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <Copy size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    mutate(
                                      "products",
                                      "toggle",
                                      { slug: p.slug },
                                      "Đã đổi trạng thái hiển thị."
                                    )
                                  }
                                  title={p.status === "show" ? "Ẩn" : "Hiển thị"}
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
                                  onClick={() => {
                                    if (
                                      window.confirm(`Xóa sản phẩm "${p.name}"?`)
                                    ) {
                                      void mutate(
                                        "products",
                                        "delete",
                                        { slug: p.slug },
                                        "Đã xóa sản phẩm."
                                      );
                                    }
                                  }}
                                  title="Xóa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {/* APPLICATIONS CMS TAB */}
            {tab === "applications" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[1.5rem]">Quản lý bài ứng dụng</h1>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-bold">Tiêu đề</th>
                          <th className="px-5 py-3 font-bold">Ngành</th>
                          <th className="px-5 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredApps.map((a) => (
                          <tr key={a.slug} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5 font-bold text-ink">{a.title}</td>
                            <td className="px-5 py-3.5 text-xs text-muted">{a.tag}</td>
                            <td className="px-5 py-3.5">
                              <StatusPill status={a.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAppModal(a)}
                                  title="Sửa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    mutate(
                                      "applications",
                                      "toggle",
                                      { slug: a.slug },
                                      "Đã cập nhật trạng thái."
                                    )
                                  }
                                  title="Ẩn / Hiện"
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
                                  onClick={() => {
                                    if (window.confirm(`Xóa "${a.title}"?`)) {
                                      void mutate(
                                        "applications",
                                        "delete",
                                        { slug: a.slug },
                                        "Đã xóa bài ứng dụng."
                                      );
                                    }
                                  }}
                                  title="Xóa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ARTICLES CMS TAB */}
            {tab === "articles" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[1.5rem]">Quản lý tin tức &amp; kiến thức</h1>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-bold">Bài viết</th>
                          <th className="px-5 py-3 font-bold">Ngày đăng</th>
                          <th className="px-5 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredArticles.map((a) => (
                          <tr key={a.slug} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5 font-bold text-ink">{a.title}</td>
                            <td className="px-5 py-3.5 text-xs text-muted">{a.date}</td>
                            <td className="px-5 py-3.5">
                              <StatusPill status={a.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setArticleModal(a)}
                                  title="Sửa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    mutate(
                                      "articles",
                                      "toggle",
                                      { slug: a.slug },
                                      "Đã cập nhật trạng thái."
                                    )
                                  }
                                  title="Ẩn / Hiện"
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
                                  onClick={() => {
                                    if (window.confirm(`Xóa "${a.title}"?`)) {
                                      void mutate(
                                        "articles",
                                        "delete",
                                        { slug: a.slug },
                                        "Đã xóa bài viết."
                                      );
                                    }
                                  }}
                                  title="Xóa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {/* JOBS CMS TAB */}
            {tab === "jobs" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[1.5rem]">Quản lý tuyển dụng</h1>
                  <button
                    type="button"
                    onClick={() => setJobModal("new")}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} weight="bold" aria-hidden />
                    Thêm vị trí
                  </button>
                </div>

                <div className="card p-5 space-y-3">
                  <h2 className="text-base">Nội dung chung trang Tuyển dụng</h2>
                  <div>
                    <label className="label">Lời giới thiệu</label>
                    <textarea
                      rows={2}
                      value={recIntro}
                      onChange={(e) => setRecIntro(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="label">Email nhận hồ sơ</label>
                      <input
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
                        mutate(
                          "settings",
                          "save",
                          { intro: recIntro, email: recEmail },
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line bg-soft text-xs uppercase text-muted">
                        <tr>
                          <th className="px-5 py-3 font-bold">Vị trí</th>
                          <th className="px-5 py-3 font-bold">Số lượng</th>
                          <th className="px-5 py-3 font-bold">Trạng thái</th>
                          <th className="px-5 py-3 font-bold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredJobs.map((j) => (
                          <tr key={j.slug} className="hover:bg-soft/40">
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-ink">{j.title}</p>
                              <p className="text-xs text-muted">
                                {j.department} · {j.location}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 font-semibold">
                              {j.qty} người
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusPill status={j.status} />
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setJobModal(j)}
                                  title="Sửa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-brand hover:text-brand"
                                >
                                  <PencilSimple size={15} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    mutate(
                                      "jobs",
                                      "toggle",
                                      { slug: j.slug },
                                      "Đã đổi trạng thái tuyển dụng."
                                    )
                                  }
                                  title="Đóng / Mở lại"
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
                                  onClick={() => {
                                    if (window.confirm(`Xóa vị trí "${j.title}"?`)) {
                                      void mutate(
                                        "jobs",
                                        "delete",
                                        { slug: j.slug },
                                        "Đã xóa vị trí."
                                      );
                                    }
                                  }}
                                  title="Xóa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                                >
                                  <Trash size={15} aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {/* DATA & BACKUP TAB */}
            {tab === "data" ? (
              <div className="space-y-5">
                <h1 className="text-[1.5rem]">Dữ liệu &amp; sao lưu</h1>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="card p-6 space-y-3">
                    <h2 className="text-base">Xuất dữ liệu PostgreSQL (.json)</h2>
                    <p className="text-sm text-muted">
                      Gồm {data.products.length} sản phẩm, {data.applications.length} bài ứng dụng,{" "}
                      {data.articles.length} bài tin tức và {data.jobs.length} vị trí tuyển dụng.
                    </p>
                    <a
                      href="/api/admin/cms?export=1"
                      className="btn btn-brand btn-sm"
                    >
                      <DownloadSimple size={16} aria-hidden />
                      Tải file sao lưu JSON
                    </a>
                  </div>

                  <div className="card p-6 space-y-3">
                    <h2 className="text-base">Khôi phục dữ liệu mẫu</h2>
                    <p className="text-sm text-muted">
                      Đặt lại bảng nội dung CMS về dữ liệu gốc ban đầu (không xóa yêu cầu báo giá và tin nhắn liên hệ).
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Khôi phục toàn bộ nội dung CMS về dữ liệu mẫu ban đầu?"
                          )
                        ) {
                          void mutate(
                            "system",
                            "reset",
                            {},
                            "Đã khôi phục dữ liệu mẫu."
                          );
                        }
                      }}
                      className="btn btn-outline btn-sm border-[#c0392b] text-[#c0392b] hover:bg-[#c0392b] hover:text-white"
                    >
                      Khôi phục dữ liệu mẫu
                    </button>
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
          onClose={() => setProductModal(null)}
          onSave={async (payload) => {
            const ok = await mutate(
              "products",
              "save",
              payload,
              "Đã lưu sản phẩm vào PostgreSQL."
            );
            if (ok) setProductModal(null);
          }}
        />
      ) : null}

      {/* APPLICATION MODAL */}
      {appModal ? (
        <ArticleLikeModal
          titleLabel={appModal === "new" ? "Thêm bài ứng dụng" : "Sửa bài ứng dụng"}
          initial={
            appModal === "new"
              ? null
              : {
                  slug: appModal.slug,
                  title: appModal.title,
                  extraLabel: "Ngành / nhãn",
                  extraValue: appModal.tag,
                  image: appModal.image,
                  excerpt: appModal.excerpt,
                  contentText: blocksToText(appModal.blocks),
                  status: appModal.status,
                }
          }
          extraLabel="Ngành / nhãn"
          busy={busy}
          onClose={() => setAppModal(null)}
          onSave={async (payload) => {
            const ok = await mutate(
              "applications",
              "save",
              { ...payload, tag: payload.extraValue },
              "Đã lưu bài ứng dụng."
            );
            if (ok) setAppModal(null);
          }}
        />
      ) : null}

      {/* ARTICLE MODAL */}
      {articleModal ? (
        <ArticleLikeModal
          titleLabel={articleModal === "new" ? "Thêm bài tin tức" : "Sửa bài tin tức"}
          initial={
            articleModal === "new"
              ? null
              : {
                  slug: articleModal.slug,
                  title: articleModal.title,
                  extraLabel: "Ngày đăng",
                  extraValue: articleModal.date,
                  image: articleModal.image,
                  excerpt: articleModal.excerpt,
                  contentText: blocksToText(articleModal.blocks),
                  status: articleModal.status,
                }
          }
          extraLabel="Ngày đăng (VD: 22/11/2026)"
          busy={busy}
          onClose={() => setArticleModal(null)}
          onSave={async (payload) => {
            const ok = await mutate(
              "articles",
              "save",
              { ...payload, date: payload.extraValue },
              "Đã lưu bài tin tức."
            );
            if (ok) setArticleModal(null);
          }}
        />
      ) : null}

      {/* JOB MODAL */}
      {jobModal ? (
        <JobEditorModal
          initial={jobModal === "new" ? null : jobModal}
          busy={busy}
          onClose={() => setJobModal(null)}
          onSave={async (payload) => {
            const ok = await mutate(
              "jobs",
              "save",
              payload,
              "Đã lưu vị trí tuyển dụng."
            );
            if (ok) setJobModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ProductEditorModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: CmsProduct | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [englishName, setEnglishName] = useState(initial?.englishName ?? "");
  const [category, setCategory] = useState(initial?.category ?? "vai");
  const [lead, setLead] = useState(initial?.lead ?? "");
  const [image, setImage] = useState(
    initial?.images[0] ?? "/images/products/vai-chiu-nhiet-cao-cap.webp"
  );
  const [descriptionText, setDescriptionText] = useState(
    initial?.description.join("\n\n") ?? ""
  );
  const [applicationsText, setApplicationsText] = useState(
    initial?.applications.join("\n") ?? ""
  );
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [status, setStatus] = useState<"show" | "hidden">(
    initial?.status ?? "show"
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg">
            {initial ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              originalSlug: initial?.slug,
              slug,
              name,
              englishName,
              category,
              lead,
              images: image.trim() ? [image.trim()] : [],
              descriptionText,
              applicationsText,
              miniSpecs: initial?.miniSpecs ?? [],
              specs: initial?.specs ?? [],
              featured,
              status,
            });
          }}
          className="space-y-4 overflow-y-auto p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tên sản phẩm *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vải Teflon chịu nhiệt..."
                className="field"
              />
            </div>
            <div>
              <label className="label">Nhóm sản phẩm</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Đường dẫn (slug)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Để trống tự tạo từ tên"
                className="field"
              />
            </div>
            <div>
              <label className="label">Tên tiếng Anh</label>
              <input
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                placeholder="PTFE Coated Fiberglass"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">Mô tả ngắn</label>
            <textarea
              rows={2}
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label">Đường dẫn ảnh đại diện</label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="/images/products/..."
              className="field"
            />
          </div>

          <div>
            <label className="label">Mô tả chi tiết (mỗi đoạn cách 1 dòng trống)</label>
            <textarea
              rows={4}
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label">Ứng dụng tiêu biểu (mỗi dòng 1 ý)</label>
            <textarea
              rows={3}
              value={applicationsText}
              onChange={(e) => setApplicationsText(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Hiển thị nổi bật ở trang chủ
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value === "hidden" ? "hidden" : "show")
              }
              className="field w-auto py-1.5 text-sm"
            >
              <option value="show">Hiển thị</option>
              <option value="hidden">Ẩn</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
              Hủy
            </button>
            <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
              {busy ? "Đang lưu..." : "Lưu sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArticleLikeModal({
  titleLabel,
  extraLabel,
  initial,
  busy,
  onClose,
  onSave,
}: {
  titleLabel: string;
  extraLabel: string;
  initial: {
    slug: string;
    title: string;
    extraLabel: string;
    extraValue: string;
    image: string;
    excerpt: string;
    contentText: string;
    status: "show" | "hidden";
  } | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [extraValue, setExtraValue] = useState(initial?.extraValue ?? "");
  const [image, setImage] = useState(
    initial?.image ?? "/images/products/vai-chiu-nhiet-cao-cap.webp"
  );
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [contentText, setContentText] = useState(initial?.contentText ?? "");
  const [status, setStatus] = useState<"show" | "hidden">(
    initial?.status ?? "show"
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg">{titleLabel}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              originalSlug: initial?.slug,
              slug,
              title,
              extraValue,
              image,
              excerpt,
              contentText,
              status,
            });
          }}
          className="space-y-4 overflow-y-auto p-6"
        >
          <div>
            <label className="label">Tiêu đề *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Để trống tự tạo"
                className="field"
              />
            </div>
            <div>
              <label className="label">{extraLabel}</label>
              <input
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">Ảnh đại diện</label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label">Tóm tắt</label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label">
              Nội dung (dùng <code>## Tiêu đề</code> hoặc <code>- gạch đầu dòng</code>)
            </label>
            <textarea
              rows={6}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value === "hidden" ? "hidden" : "show")
              }
              className="field w-auto py-1.5 text-sm"
            >
              <option value="show">Hiển thị</option>
              <option value="hidden">Ẩn</option>
            </select>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
                Hủy
              </button>
              <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
                {busy ? "Đang lưu..." : "Lưu bài viết"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobEditorModal({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: CmsJob | null;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "Kinh doanh");
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [jobType, setJobType] = useState(initial?.jobType ?? "Toàn thời gian");
  const [location, setLocation] = useState(initial?.location ?? "TP. HCM");
  const [salary, setSalary] = useState(initial?.salary ?? "Thỏa thuận");
  const [contentText, setContentText] = useState(
    initial ? blocksToText(initial.blocks) : ""
  );
  const [status, setStatus] = useState<"open" | "paused" | "closed">(
    initial?.status ?? "open"
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg">
            {initial ? "Sửa vị trí tuyển dụng" : "Thêm vị trí tuyển dụng"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={18} aria-hidden />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              originalSlug: initial?.slug,
              slug,
              title,
              department,
              qty,
              jobType,
              location,
              salary,
              contentText,
              status,
            });
          }}
          className="space-y-4 overflow-y-auto p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tên vị trí *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label">Bộ phận</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Số lượng</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                className="field"
              />
            </div>
            <div>
              <label className="label">Hình thức</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="field"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mức lương</label>
              <input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Địa điểm</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Để trống tự tạo"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="label">Mô tả, yêu cầu &amp; quyền lợi</label>
            <textarea
              rows={5}
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              className="field"
            />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value === "paused" || e.target.value === "closed"
                    ? e.target.value
                    : "open"
                )
              }
              className="field w-auto py-1.5 text-sm"
            >
              <option value="open">Đang tuyển</option>
              <option value="paused">Tạm dừng</option>
              <option value="closed">Đã đóng</option>
            </select>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
                Hủy
              </button>
              <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
                {busy ? "Đang lưu..." : "Lưu vị trí"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
