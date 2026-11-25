"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  Eye,
  Images,
  LinkSimple,
  ListBullets,
  PencilSimple,
  Plus,
  TextHTwo,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ContentBlocks } from "@/components/content-blocks";
import CATEGORY_OPTIONS from "@/data/product-categories.json";
import type {
  CmsApplication,
  CmsArticle,
  CmsJob,
  CmsProduct,
} from "@/lib/cms-store";
import {
  DEFAULT_PRODUCT_IMAGE,
  blocksToText,
  isJobExpired,
  parseLinesToBlocks,
  todayDisplayVN,
} from "@/lib/cms-utils";
import { cn } from "@/lib/format";
import type { MiniSpec, Spec } from "@/lib/types";

const JOB_TYPES = ["Toàn thời gian", "Bán thời gian", "Thời vụ", "Thực tập"];

/**
 * Compresses an uploaded image file onto a canvas with a solid #ffffff background
 * so transparent PNGs never turn black when exported as JPEG.
 */
async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ảnh tải lên vượt quá giới hạn 8MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không đọc được tệp hình ảnh."));
      el.src = objectUrl;
    });

    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas.");

    // Always paint white background first so transparent PNGs never render black
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function upgradeHttpClientUrl(raw: string): { value: string; upgraded: boolean } {
  const trimmed = raw.trim();
  if (
    /^http:\/\//i.test(trimmed) &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed)
  ) {
    return {
      value: trimmed.replace(/^http:\/\//i, "https://"),
      upgraded: true,
    };
  }
  return { value: raw, upgraded: false };
}

function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}

function useModalA11y(onEscape: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const firstInput = dialogRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea, button"
    );
    firstInput?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscapeRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, []);

  return dialogRef;
}

/* ---------------- ACCESSIBLE CONFIRM DIALOG ---------------- */

export function ConfirmDialog({
  title,
  description,
  warnings,
  confirmLabel = "Xác nhận",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  warnings?: string[];
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const dialogRef = useModalA11y(() => {
    if (!busy) onCancel();
  });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card w-full max-w-md overflow-hidden p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">
            {title}
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Đóng hộp thoại"
            title="Đóng"
            className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-body">{description}</p>

        {warnings && warnings.length > 0 ? (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-[#f2d194] bg-[#fff9eb] p-3 text-xs text-[#8a5a00]">
            <p className="font-bold">Lưu ý kiểm tra dữ liệu ({warnings.length}):</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="btn btn-outline btn-sm"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "btn btn-sm",
              danger
                ? "bg-[#c0392b] text-white hover:bg-[#a5281b]"
                : "btn-brand"
            )}
          >
            {busy ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- IMAGE LIBRARY + UPLOAD PICKER ---------------- */

function ImagePickerField({
  label,
  value,
  onChange,
  mediaLibrary,
  onNotify,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  mediaLibrary: string[];
  onNotify: (msg: string, kind?: "ok" | "err") => void;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="label mb-0">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                const dataUrl = await compressImageFileToDataUrl(file);
                onChange(dataUrl);
                onNotify(
                  "Đã nén ảnh (nền trắng #ffffff cho PNG trong suốt) và gắn vào biểu mẫu.",
                  "ok"
                );
              } catch (err) {
                onNotify(
                  err instanceof Error ? err.message : "Lỗi xử lý ảnh.",
                  "err"
                );
              } finally {
                setUploading(false);
              }
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
          >
            <UploadSimple size={14} aria-hidden />
            {uploading ? "Đang nén..." : "Tải ảnh từ máy"}
          </button>
          {mediaLibrary.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowLibrary((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2.5 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
            >
              <Images size={14} aria-hidden />
              {showLibrary ? "Ẩn thư viện ảnh" : `Thư viện (${mediaLibrary.length})`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-soft">
          {value.trim() ? (
            <Image
              src={value.trim()}
              alt="Xem trước ảnh đại diện"
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : null}
        </div>
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const res = upgradeHttpClientUrl(value);
            if (res.upgraded) {
              onChange(res.value);
              onNotify(
                "Đã tự động đổi đường dẫn ảnh http:// sang https:// để tránh chặn Mixed Content.",
                "ok"
              );
            }
          }}
          placeholder="/images/products/... hoặc https://..."
          className="field flex-1"
        />
      </div>

      {value.startsWith("data:image/") ? (
        <p className="text-[11.5px] text-[#8a5a00]">
          Ảnh đang lưu dạng dữ liệu nén trực tiếp. Với ảnh dùng lặp lại nhiều bài, ưu tiên đặt trong{" "}
          <code>/images/products/...</code> để tải trang nhanh hơn.
        </p>
      ) : null}

      {showLibrary ? (
        <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line bg-soft/60 p-2.5 sm:grid-cols-6">
          {mediaLibrary.map((url) => {
            const selected = value.trim() === url;
            const fileName = url.split("/").pop() ?? url;
            return (
              <button
                key={url}
                type="button"
                onClick={() => {
                  onChange(url);
                  setShowLibrary(false);
                }}
                title={url}
                aria-label={`Chọn ảnh ${fileName}`}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-white transition",
                  selected
                    ? "border-2 border-brand ring-2 ring-brand/25"
                    : "border-line hover:border-brand"
                )}
              >
                <Image
                  src={url}
                  alt={fileName}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- KEY-VALUE ROW EDITOR (SPECS / MINISPECS) ---------------- */

function KeyValueListEditor({
  title,
  labelPlaceholder,
  valuePlaceholder,
  rows,
  onChange,
}: {
  title: string;
  labelPlaceholder: string;
  valuePlaceholder: string;
  rows: Array<{ label: string; value: string }>;
  onChange: (next: Array<{ label: string; value: string }>) => void;
}) {
  function updateRow(idx: number, patch: Partial<{ label: string; value: string }>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const copy = [...rows];
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  }

  function removeRow(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  function addRow() {
    onChange([...rows, { label: "", value: "" }]);
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ink">
          {title} ({rows.length})
        </span>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-brand hover:border-brand"
        >
          <Plus size={13} weight="bold" aria-hidden />
          Thêm dòng
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted">
          Chưa có dòng nào. Nhấn &ldquo;Thêm dòng&rdquo; để bổ sung thông số.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <input
                value={row.label}
                onChange={(e) => updateRow(idx, { label: e.target.value })}
                placeholder={labelPlaceholder}
                aria-label={`${title} - tên thông số ${idx + 1}`}
                className="field py-1.5 text-xs"
              />
              <input
                value={row.value}
                onChange={(e) => updateRow(idx, { value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRow();
                  }
                }}
                placeholder={valuePlaceholder}
                aria-label={`${title} - giá trị ${idx + 1}`}
                className="field py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveRow(idx, -1)}
                title="Đưa lên"
                aria-label={`Đưa dòng ${idx + 1} lên`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:opacity-40"
              >
                <ArrowUp size={13} aria-hidden />
              </button>
              <button
                type="button"
                disabled={idx === rows.length - 1}
                onClick={() => moveRow(idx, 1)}
                title="Đưa xuống"
                aria-label={`Đưa dòng ${idx + 1} xuống`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:text-ink disabled:opacity-40"
              >
                <ArrowDown size={13} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                title="Xóa dòng"
                aria-label={`Xóa dòng ${idx + 1}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
              >
                <Trash size={13} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- MARKDOWN / BLOCK TOOLBAR ---------------- */

function ContentEditorField({
  id,
  label,
  value,
  onChange,
  onNotify,
  extraToolbarButton,
  rows = 6,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onNotify: (msg: string, kind?: "ok" | "err") => void;
  extraToolbarButton?: React.ReactNode;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");

  function appendBlock(snippet: string) {
    const trimmed = value.trimEnd();
    onChange(trimmed ? `${trimmed}\n\n${snippet}` : snippet);
    textareaRef.current?.focus();
  }

  function handleInsertSafeLink() {
    const url = linkUrl.trim();
    if (!url || /^(javascript|vbscript|data):/i.test(url)) {
      onNotify("Liên kết không hợp lệ (đã chặn giao thức javascript:/data:).", "err");
      return;
    }
    const normalized = upgradeHttpClientUrl(url).value;
    const text = linkLabel.trim() || normalized;
    appendBlock(`${text} (${normalized})`);
    setLinkLabel("");
    setLinkUrl("https://");
    setShowLinkBox(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="label mb-0">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => appendBlock("## Tiêu đề mục")}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
          >
            <TextHTwo size={14} aria-hidden />
            Tiêu đề H2
          </button>
          <button
            type="button"
            onClick={() => appendBlock("- Ý chính thứ nhất\n- Ý chính thứ hai")}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
          >
            <ListBullets size={14} aria-hidden />
            Danh sách
          </button>
          <button
            type="button"
            onClick={() => setShowLinkBox((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-soft px-2 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
          >
            <LinkSimple size={14} aria-hidden />
            Chèn liên kết
          </button>
          {extraToolbarButton}
        </div>
      </div>

      {showLinkBox ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-soft p-2.5">
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Nhãn hiển thị"
            aria-label="Nhãn liên kết"
            className="field max-w-[180px] py-1.5 text-xs"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://... hoặc /san-pham/..."
            aria-label="Địa chỉ URL liên kết"
            className="field flex-1 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={handleInsertSafeLink}
            className="btn btn-brand btn-sm py-1.5 text-xs"
          >
            Chèn
          </button>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Mỗi đoạn văn cách nhau 1 dòng trống. Dùng '## Tiêu đề' cho tiêu đề mục và '- nội dung' cho danh sách gạch đầu dòng."
        className="field"
      />
    </div>
  );
}

/* ---------------- PRODUCT EDITOR MODAL ---------------- */

export function ProductEditorModal({
  initial,
  busy,
  featuredCount,
  mediaLibrary,
  onNotify,
  onClose,
  onSave,
}: {
  initial: CmsProduct | null;
  busy: boolean;
  featuredCount: number;
  mediaLibrary: string[];
  onNotify: (msg: string, kind?: "ok" | "err") => void;
  onClose: () => void;
  onSave: (
    payload: Record<string, unknown>,
    stay: boolean
  ) => Promise<CmsProduct | null>;
}) {
  const titleId = useId();
  const idPrefix = useId();

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [baseSlug, setBaseSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [englishName, setEnglishName] = useState(initial?.englishName ?? "");
  const [category, setCategory] = useState(initial?.category ?? "vai");
  const [lead, setLead] = useState(initial?.lead ?? "");
  const [primaryImage, setPrimaryImage] = useState(
    initial?.images[0] ?? DEFAULT_PRODUCT_IMAGE
  );
  const [extraImages, setExtraImages] = useState<string[]>(
    initial?.images.slice(1) ?? []
  );
  const [descriptionText, setDescriptionText] = useState(
    initial?.description.join("\n\n") ?? ""
  );
  const [applicationsText, setApplicationsText] = useState(
    initial?.applications.join("\n") ?? ""
  );
  const [miniSpecs, setMiniSpecs] = useState<MiniSpec[]>(
    initial?.miniSpecs ?? []
  );
  const [specs, setSpecs] = useState<Spec[]>(initial?.specs ?? []);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [status, setStatus] = useState<"show" | "hidden">(
    initial?.status ?? "show"
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const currentSnapshot = JSON.stringify({
    name,
    slug,
    englishName,
    category,
    lead,
    primaryImage,
    extraImages,
    descriptionText,
    applicationsText,
    miniSpecs,
    specs,
    featured,
    status,
  });
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const isDirty = currentSnapshot !== savedSnapshot;

  useBeforeUnload(isDirty);

  function requestClose() {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  const dialogRef = useModalA11y(requestClose);

  const allImages = useMemo(
    () =>
      [primaryImage, ...extraImages]
        .map((s) => s.trim())
        .filter(Boolean),
    [primaryImage, extraImages]
  );

  async function submitForm(stay: boolean) {
    const saved = await onSave(
      {
        originalSlug: baseSlug || undefined,
        slug,
        name,
        englishName,
        category,
        lead,
        images: allImages,
        descriptionText,
        applicationsText,
        miniSpecs,
        specs,
        featured,
        status,
      },
      stay
    );
    if (saved && stay) {
      setBaseSlug(saved.slug);
      setSlug(saved.slug);
      setSavedSnapshot(
        JSON.stringify({
          name,
          slug: saved.slug,
          englishName,
          category,
          lead,
          primaryImage,
          extraImages,
          descriptionText,
          applicationsText,
          miniSpecs,
          specs,
          featured,
          status,
        })
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
      >
        {/* Sticky Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 id={titleId} className="text-lg font-extrabold">
              {baseSlug ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h2>
            {isDirty ? (
              <span className="rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                Chưa lưu
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-line bg-soft p-0.5 text-xs font-bold"
              role="tablist"
              aria-label="Chế độ biên tập sản phẩm"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "edit"}
                onClick={() => setMode("edit")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "edit" ? "bg-white text-brand shadow-xs" : "text-muted"
                )}
              >
                <PencilSimple size={13} aria-hidden />
                Soạn thảo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "preview"}
                onClick={() => setMode("preview")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "preview"
                    ? "bg-white text-brand shadow-xs"
                    : "text-muted"
                )}
              >
                <Eye size={13} aria-hidden />
                Xem trước
              </button>
            </div>

            <button
              type="button"
              onClick={requestClose}
              aria-label="Đóng cửa sổ"
              title="Đóng"
              className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <form
          id={`${idPrefix}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm(false);
          }}
          className="flex-1 overflow-y-auto p-6"
        >
          {mode === "edit" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idPrefix}-name`} className="label">
                    Tên sản phẩm *
                  </label>
                  <input
                    id={`${idPrefix}-name`}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vải Teflon chịu nhiệt..."
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-cat`} className="label">
                    Nhóm sản phẩm
                  </label>
                  <select
                    id={`${idPrefix}-cat`}
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
                  <label htmlFor={`${idPrefix}-slug`} className="label">
                    Đường dẫn (slug)
                  </label>
                  <input
                    id={`${idPrefix}-slug`}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={
                      baseSlug
                        ? `Giữ nguyên: ${baseSlug}`
                        : "Để trống tự tạo từ tên"
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-en`} className="label">
                    Tên tiếng Anh / Mã kỹ thuật
                  </label>
                  <input
                    id={`${idPrefix}-en`}
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder="PTFE Coated Fiberglass"
                    className="field"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`${idPrefix}-lead`} className="label">
                    Mô tả ngắn (hiển thị đầu trang &amp; SEO meta)
                  </label>
                  <span className="text-[11px] text-muted">
                    {lead.length}/160 ký tự
                  </span>
                </div>
                <textarea
                  id={`${idPrefix}-lead`}
                  rows={2}
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  className="field"
                />
              </div>

              <ImagePickerField
                label="Ảnh đại diện chính"
                value={primaryImage}
                onChange={setPrimaryImage}
                mediaLibrary={mediaLibrary}
                onNotify={onNotify}
              />

              {/* Extra Gallery Images */}
              <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink">
                    Ảnh thư viện phụ ({extraImages.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraImages([...extraImages, ""])}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-brand hover:border-brand"
                  >
                    <Plus size={13} weight="bold" aria-hidden />
                    Thêm ảnh phụ
                  </button>
                </div>
                {extraImages.map((imgUrl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={imgUrl}
                      onChange={(e) =>
                        setExtraImages(
                          extraImages.map((u, i) =>
                            i === idx ? e.target.value : u
                          )
                        )
                      }
                      onBlur={() => {
                        const res = upgradeHttpClientUrl(imgUrl);
                        if (res.upgraded) {
                          setExtraImages(
                            extraImages.map((u, i) =>
                              i === idx ? res.value : u
                            )
                          );
                        }
                      }}
                      placeholder="/images/products/... hoặc https://..."
                      aria-label={`Đường dẫn ảnh phụ ${idx + 1}`}
                      className="field py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExtraImages(extraImages.filter((_, i) => i !== idx))
                      }
                      aria-label={`Xóa ảnh phụ ${idx + 1}`}
                      title="Xóa ảnh phụ"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:border-[#c0392b] hover:text-[#c0392b]"
                    >
                      <Trash size={13} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <KeyValueListEditor
                  title="Thông số tóm tắt (Mini Specs)"
                  labelPlaceholder="VD: Nhiệt độ"
                  valuePlaceholder="VD: -73 → 260°C"
                  rows={miniSpecs}
                  onChange={setMiniSpecs}
                />
                <KeyValueListEditor
                  title="Bảng thông số kỹ thuật"
                  labelPlaceholder="VD: Độ dày"
                  valuePlaceholder="VD: 0.08 - 0.35 mm"
                  rows={specs}
                  onChange={setSpecs}
                />
              </div>

              <div>
                <label htmlFor={`${idPrefix}-desc`} className="label">
                  Mô tả chi tiết (mỗi đoạn cách 1 dòng trống)
                </label>
                <textarea
                  id={`${idPrefix}-desc`}
                  rows={4}
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor={`${idPrefix}-apps`} className="label">
                  Ứng dụng tiêu biểu (mỗi dòng 1 ý)
                </label>
                <textarea
                  id={`${idPrefix}-apps`}
                  rows={3}
                  value={applicationsText}
                  onChange={(e) => setApplicationsText(e.target.value)}
                  className="field"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-soft/40 p-3.5">
                <div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                    />
                    Hiển thị nổi bật ở trang chủ
                  </label>
                  <p className="mt-0.5 text-xs text-muted">
                    Hiện đang có {featuredCount} sản phẩm gắn cờ nổi bật (khuyến nghị ≤ 8 để trang chủ chọn lọc).
                  </p>
                </div>

                <div>
                  <label htmlFor={`${idPrefix}-status`} className="sr-only">
                    Trạng thái hiển thị
                  </label>
                  <select
                    id={`${idPrefix}-status`}
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value === "hidden" ? "hidden" : "show")
                    }
                    className="field w-auto py-1.5 text-sm"
                  >
                    <option value="show">Hiển thị công khai</option>
                    <option value="hidden">Ẩn (Bản nháp)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            /* LIVE WEBSITE PREVIEW */
            <div className="space-y-6 rounded-2xl border border-line bg-soft/40 p-5">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-white">
                  <Image
                    src={allImages[0] || DEFAULT_PRODUCT_IMAGE}
                    alt={name || "Ảnh sản phẩm"}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-[#eaf1fa] px-2.5 py-0.5 text-xs font-bold text-brand">
                    {CATEGORY_OPTIONS.find((c) => c.slug === category)?.label ??
                      category}
                  </span>
                  <h3 className="mt-2 text-xl font-extrabold text-ink">
                    {name || "Tên sản phẩm mẫu"}
                  </h3>
                  {englishName ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {englishName}
                    </p>
                  ) : null}
                  <p className="mt-2.5 text-sm leading-relaxed text-body">
                    {lead || "Chưa nhập mô tả ngắn cho sản phẩm."}
                  </p>

                  {miniSpecs.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {miniSpecs
                        .filter((m) => m.label || m.value)
                        .map((m, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-line bg-white px-3 py-2"
                          >
                            <p className="text-[11px] uppercase text-muted">
                              {m.label}
                            </p>
                            <p className="text-xs font-bold text-ink">{m.value}</p>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {descriptionText.trim() ? (
                <div className="space-y-2 text-sm leading-relaxed text-body">
                  {descriptionText
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                </div>
              ) : null}

              {specs.filter((s) => s.label || s.value).length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-line">
                      {specs
                        .filter((s) => s.label || s.value)
                        .map((s, idx) => (
                          <tr key={idx}>
                            <th className="w-2/5 bg-soft/60 px-4 py-2.5 font-semibold text-ink">
                              {s.label}
                            </th>
                            <td className="px-4 py-2.5 text-body">{s.value}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </form>

        {/* Sticky Bottom Action Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-6 py-3.5">
          <div>
            {baseSlug && status === "show" ? (
              <a
                href={`/san-pham/${baseSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                Xem trên website
                <ArrowSquareOut size={14} aria-hidden />
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestClose}
              className="btn btn-outline btn-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void submitForm(true)}
              className="btn btn-outline btn-sm border-brand text-brand hover:bg-brand hover:text-white"
            >
              Lưu &amp; tiếp tục sửa
            </button>
            <button
              type="submit"
              form={`${idPrefix}-form`}
              disabled={busy}
              className="btn btn-brand btn-sm"
            >
              {busy ? "Đang lưu..." : "Lưu sản phẩm"}
            </button>
          </div>
        </div>
      </div>

      {confirmDiscard ? (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Bạn có các chỉnh sửa chưa lưu trong biểu mẫu sản phẩm. Nếu đóng bây giờ, thay đổi sẽ bị mất."
          confirmLabel="Bỏ thay đổi"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      ) : null}
    </div>
  );
}

/* ---------------- APPLICATION & ARTICLE EDITOR MODAL ---------------- */

export function ArticleLikeModal({
  kind,
  titleLabel,
  extraLabel,
  initial,
  allProducts,
  mediaLibrary,
  busy,
  onNotify,
  onClose,
  onSave,
}: {
  kind: "applications" | "articles";
  titleLabel: string;
  extraLabel: string;
  initial: {
    slug: string;
    title: string;
    extraValue: string;
    author?: string;
    image: string;
    excerpt: string;
    contentText: string;
    video: string;
    relatedProducts: string[];
    status: "show" | "hidden";
  } | null;
  allProducts: CmsProduct[];
  mediaLibrary: string[];
  busy: boolean;
  onNotify: (msg: string, kind?: "ok" | "err") => void;
  onClose: () => void;
  onSave: (
    payload: Record<string, unknown>,
    stay: boolean
  ) => Promise<CmsApplication | CmsArticle | null>;
}) {
  const titleId = useId();
  const idPrefix = useId();

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [baseSlug, setBaseSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [extraValue, setExtraValue] = useState(
    initial?.extraValue ?? (kind === "articles" ? todayDisplayVN() : "Công nghiệp")
  );
  const [author, setAuthor] = useState(initial?.author ?? "Vina Khang");
  const [image, setImage] = useState(initial?.image ?? DEFAULT_PRODUCT_IMAGE);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [contentText, setContentText] = useState(initial?.contentText ?? "");
  const [video, setVideo] = useState(initial?.video ?? "");
  const [relatedProducts, setRelatedProducts] = useState<string[]>(
    initial?.relatedProducts ?? []
  );
  const [prodQuery, setProdQuery] = useState("");
  const [status, setStatus] = useState<"show" | "hidden">(
    initial?.status ?? "show"
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const currentSnapshot = JSON.stringify({
    title,
    slug,
    extraValue,
    author,
    image,
    excerpt,
    contentText,
    video,
    relatedProducts,
    status,
  });
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const isDirty = currentSnapshot !== savedSnapshot;

  useBeforeUnload(isDirty);

  function requestClose() {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  const dialogRef = useModalA11y(requestClose);

  const filteredProductOptions = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    return allProducts.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [allProducts, prodQuery]);

  async function submitForm(stay: boolean) {
    const saved = await onSave(
      {
        originalSlug: baseSlug || undefined,
        slug,
        title,
        extraValue,
        author,
        image,
        excerpt,
        contentText,
        video,
        relatedProducts,
        status,
      },
      stay
    );
    if (saved && stay) {
      setBaseSlug(saved.slug);
      setSlug(saved.slug);
      setSavedSnapshot(
        JSON.stringify({
          title,
          slug: saved.slug,
          extraValue,
          author,
          image,
          excerpt,
          contentText,
          video,
          relatedProducts,
          status,
        })
      );
    }
  }

  const publicHref = baseSlug
    ? kind === "applications"
      ? `/ung-dung/${baseSlug}`
      : `/tin-tuc/${baseSlug}`
    : "";

  const previewBlocks = useMemo(
    () => parseLinesToBlocks(contentText),
    [contentText]
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
      >
        {/* Sticky Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 id={titleId} className="text-lg font-extrabold">
              {titleLabel}
            </h2>
            {isDirty ? (
              <span className="rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                Chưa lưu
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-line bg-soft p-0.5 text-xs font-bold"
              role="tablist"
              aria-label="Chế độ biên tập bài viết"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "edit"}
                onClick={() => setMode("edit")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "edit" ? "bg-white text-brand shadow-xs" : "text-muted"
                )}
              >
                <PencilSimple size={13} aria-hidden />
                Soạn thảo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "preview"}
                onClick={() => setMode("preview")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "preview"
                    ? "bg-white text-brand shadow-xs"
                    : "text-muted"
                )}
              >
                <Eye size={13} aria-hidden />
                Xem trước
              </button>
            </div>

            <button
              type="button"
              onClick={requestClose}
              aria-label="Đóng cửa sổ"
              title="Đóng"
              className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form
          id={`${idPrefix}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm(false);
          }}
          className="flex-1 overflow-y-auto p-6"
        >
          {mode === "edit" ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`${idPrefix}-title`} className="label">
                    Tiêu đề *
                  </label>
                  <span className="text-[11px] text-muted">
                    {title.length}/70 ký tự
                  </span>
                </div>
                <input
                  id={`${idPrefix}-title`}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idPrefix}-slug`} className="label">
                    Đường dẫn (slug)
                  </label>
                  <input
                    id={`${idPrefix}-slug`}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={
                      baseSlug ? `Giữ nguyên: ${baseSlug}` : "Để trống tự tạo"
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-extra`} className="label">
                    {extraLabel}
                  </label>
                  <input
                    id={`${idPrefix}-extra`}
                    value={extraValue}
                    onChange={(e) => setExtraValue(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              {kind === "articles" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${idPrefix}-author`} className="label">
                      Tác giả
                    </label>
                    <input
                      id={`${idPrefix}-author`}
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-video`} className="label">
                      Liên kết video minh họa (tùy chọn)
                    </label>
                    <input
                      id={`${idPrefix}-video`}
                      value={video}
                      onChange={(e) => setVideo(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="field"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor={`${idPrefix}-video`} className="label">
                    Liên kết video minh họa (tùy chọn)
                  </label>
                  <input
                    id={`${idPrefix}-video`}
                    value={video}
                    onChange={(e) => setVideo(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="field"
                  />
                </div>
              )}

              <ImagePickerField
                label="Ảnh đại diện bài viết"
                value={image}
                onChange={setImage}
                mediaLibrary={mediaLibrary}
                onNotify={onNotify}
              />

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`${idPrefix}-excerpt`} className="label">
                    Tóm tắt (SEO meta description)
                  </label>
                  <span className="text-[11px] text-muted">
                    {excerpt.length}/160 ký tự
                  </span>
                </div>
                <textarea
                  id={`${idPrefix}-excerpt`}
                  rows={2}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="field"
                />
              </div>

              <ContentEditorField
                id={`${idPrefix}-content`}
                label="Nội dung chi tiết"
                value={contentText}
                onChange={setContentText}
                onNotify={onNotify}
                rows={7}
              />

              {/* Related Products Multi-select */}
              <div className="space-y-2 rounded-xl border border-line bg-soft/40 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`${idPrefix}-prod-search`}
                    className="text-xs font-bold uppercase tracking-wide text-ink"
                  >
                    Sản phẩm liên quan ({relatedProducts.length} đã chọn)
                  </label>
                  <input
                    id={`${idPrefix}-prod-search`}
                    type="search"
                    value={prodQuery}
                    onChange={(e) => setProdQuery(e.target.value)}
                    placeholder="Lọc nhanh sản phẩm..."
                    className="field max-w-[220px] py-1 text-xs"
                  />
                </div>
                <div className="grid max-h-36 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredProductOptions.slice(0, 60).map((p) => {
                    const checked = relatedProducts.includes(p.slug);
                    return (
                      <label
                        key={p.slug}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition",
                          checked
                            ? "border-brand bg-[#eaf1fa] font-semibold text-brand"
                            : "border-line bg-white text-ink hover:border-brand/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRelatedProducts([...relatedProducts, p.slug]);
                            } else {
                              setRelatedProducts(
                                relatedProducts.filter((s) => s !== p.slug)
                              );
                            }
                          }}
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-soft/40 p-3.5">
                <label
                  htmlFor={`${idPrefix}-status`}
                  className="text-sm font-semibold text-ink"
                >
                  Trạng thái xuất bản
                </label>
                <select
                  id={`${idPrefix}-status`}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value === "hidden" ? "hidden" : "show")
                  }
                  className="field w-auto py-1.5 text-sm"
                >
                  <option value="show">Hiển thị công khai</option>
                  <option value="hidden">Ẩn (Bản nháp)</option>
                </select>
              </div>
            </div>
          ) : (
            /* LIVE WEBSITE PREVIEW */
            <article className="space-y-5 rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand">
                <span className="rounded-full bg-[#eaf1fa] px-2.5 py-0.5">
                  {extraValue || "Chuyên mục"}
                </span>
                {kind === "articles" ? (
                  <span className="text-muted">· Tác giả: {author}</span>
                ) : null}
              </div>
              <h3 className="text-2xl font-extrabold leading-snug text-ink">
                {title || "Tiêu đề bài viết mẫu"}
              </h3>
              {excerpt ? (
                <p className="text-sm font-medium leading-relaxed text-muted">
                  {excerpt}
                </p>
              ) : null}
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-line bg-soft">
                <Image
                  src={image.trim() || DEFAULT_PRODUCT_IMAGE}
                  alt={title || "Ảnh bài viết"}
                  fill
                  sizes="640px"
                  className="object-cover"
                />
              </div>
              {previewBlocks.length > 0 ? (
                <ContentBlocks blocks={previewBlocks} />
              ) : (
                <p className="text-sm italic text-muted">
                  Chưa có nội dung chi tiết để hiển thị.
                </p>
              )}
            </article>
          )}
        </form>

        {/* Sticky Bottom Action Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-6 py-3.5">
          <div>
            {publicHref && status === "show" ? (
              <a
                href={publicHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                Xem trên website
                <ArrowSquareOut size={14} aria-hidden />
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestClose}
              className="btn btn-outline btn-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void submitForm(true)}
              className="btn btn-outline btn-sm border-brand text-brand hover:bg-brand hover:text-white"
            >
              Lưu &amp; tiếp tục sửa
            </button>
            <button
              type="submit"
              form={`${idPrefix}-form`}
              disabled={busy}
              className="btn btn-brand btn-sm"
            >
              {busy ? "Đang lưu..." : "Lưu bài viết"}
            </button>
          </div>
        </div>
      </div>

      {confirmDiscard ? (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Bài viết đang soạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?"
          confirmLabel="Bỏ thay đổi"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      ) : null}
    </div>
  );
}

/* ---------------- JOB EDITOR MODAL ---------------- */

export function JobEditorModal({
  initial,
  defaultBenefits,
  busy,
  onNotify,
  onClose,
  onSave,
}: {
  initial: CmsJob | null;
  defaultBenefits: string;
  busy: boolean;
  onNotify: (msg: string, kind?: "ok" | "err") => void;
  onClose: () => void;
  onSave: (
    payload: Record<string, unknown>,
    stay: boolean
  ) => Promise<CmsJob | null>;
}) {
  const titleId = useId();
  const idPrefix = useId();

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [baseSlug, setBaseSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [department, setDepartment] = useState(
    initial?.department ?? "Kinh doanh"
  );
  const [qty, setQty] = useState(initial?.qty ?? 1);
  const [jobType, setJobType] = useState(initial?.jobType ?? "Toàn thời gian");
  const [location, setLocation] = useState(initial?.location ?? "TP. HCM");
  const [salary, setSalary] = useState(initial?.salary ?? "Thỏa thuận");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [contentText, setContentText] = useState(
    initial ? blocksToText(initial.blocks) : ""
  );
  const [status, setStatus] = useState<"open" | "paused" | "closed">(
    initial?.status ?? "open"
  );
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const currentSnapshot = JSON.stringify({
    title,
    slug,
    department,
    qty,
    jobType,
    location,
    salary,
    deadline,
    contentText,
    status,
  });
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const isDirty = currentSnapshot !== savedSnapshot;

  useBeforeUnload(isDirty);

  function requestClose() {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  const dialogRef = useModalA11y(requestClose);
  const expired = isJobExpired(deadline);
  const previewBlocks = useMemo(
    () => parseLinesToBlocks(contentText),
    [contentText]
  );

  function insertSharedBenefits() {
    const lines = defaultBenefits
      .split("\n")
      .map((l) => l.trim().replace(/^-\s*/, ""))
      .filter(Boolean)
      .map((l) => `- ${l}`)
      .join("\n");
    if (!lines) return;
    const block = `## Quyền lợi\n\n${lines}`;
    setContentText((prev) => (prev.trim() ? `${prev.trim()}\n\n${block}` : block));
    onNotify("Đã chèn mục Quyền lợi chung vào cuối nội dung.", "ok");
  }

  async function submitForm(stay: boolean) {
    const saved = await onSave(
      {
        originalSlug: baseSlug || undefined,
        slug,
        title,
        department,
        qty,
        jobType,
        location,
        salary,
        deadline,
        contentText,
        status,
      },
      stay
    );
    if (saved && stay) {
      setBaseSlug(saved.slug);
      setSlug(saved.slug);
      setSavedSnapshot(
        JSON.stringify({
          title,
          slug: saved.slug,
          department,
          qty,
          jobType,
          location,
          salary,
          deadline,
          contentText,
          status,
        })
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#081424]/55 p-3 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden shadow-xl"
      >
        {/* Sticky Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 id={titleId} className="text-lg font-extrabold">
              {baseSlug ? "Sửa vị trí tuyển dụng" : "Thêm vị trí tuyển dụng"}
            </h2>
            {isDirty ? (
              <span className="rounded-full bg-[#fff1d6] px-2.5 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                Chưa lưu
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-xl border border-line bg-soft p-0.5 text-xs font-bold"
              role="tablist"
              aria-label="Chế độ biên tập tuyển dụng"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "edit"}
                onClick={() => setMode("edit")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "edit" ? "bg-white text-brand shadow-xs" : "text-muted"
                )}
              >
                <PencilSimple size={13} aria-hidden />
                Soạn thảo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "preview"}
                onClick={() => setMode("preview")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition",
                  mode === "preview"
                    ? "bg-white text-brand shadow-xs"
                    : "text-muted"
                )}
              >
                <Eye size={13} aria-hidden />
                Xem trước
              </button>
            </div>

            <button
              type="button"
              onClick={requestClose}
              aria-label="Đóng cửa sổ"
              title="Đóng"
              className="rounded-lg p-1 text-muted hover:bg-soft hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        {/* Scrollable Form */}
        <form
          id={`${idPrefix}-form`}
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm(false);
          }}
          className="flex-1 overflow-y-auto p-6"
        >
          {mode === "edit" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idPrefix}-title`} className="label">
                    Tên vị trí *
                  </label>
                  <input
                    id={`${idPrefix}-title`}
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-dept`} className="label">
                    Bộ phận
                  </label>
                  <input
                    id={`${idPrefix}-dept`}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor={`${idPrefix}-qty`} className="label">
                    Số lượng (người)
                  </label>
                  <input
                    id={`${idPrefix}-qty`}
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value) || 1)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-type`} className="label">
                    Hình thức
                  </label>
                  <select
                    id={`${idPrefix}-type`}
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
                  <label htmlFor={`${idPrefix}-salary`} className="label">
                    Mức lương
                  </label>
                  <input
                    id={`${idPrefix}-salary`}
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="field"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor={`${idPrefix}-loc`} className="label">
                    Địa điểm làm việc
                  </label>
                  <input
                    id={`${idPrefix}-loc`}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-deadline`} className="label">
                    Hạn nộp hồ sơ
                  </label>
                  <input
                    id={`${idPrefix}-deadline`}
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-slug`} className="label">
                    Đường dẫn (slug)
                  </label>
                  <input
                    id={`${idPrefix}-slug`}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={
                      baseSlug ? `Giữ nguyên: ${baseSlug}` : "Để trống tự tạo"
                    }
                    className="field"
                  />
                </div>
              </div>

              {expired && status === "open" ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#f2d194] bg-[#fff9eb] px-3.5 py-2.5 text-xs font-semibold text-[#8a5a00]">
                  <WarningCircle size={16} weight="fill" aria-hidden />
                  Hạn nộp hồ sơ ({deadline}) đã qua. Vị trí này sẽ tự động ẩn khỏi trang Tuyển dụng công khai cho đến khi gia hạn hoặc bỏ trống hạn nộp.
                </div>
              ) : null}

              <ContentEditorField
                id={`${idPrefix}-content`}
                label="Mô tả công việc, yêu cầu & quyền lợi"
                value={contentText}
                onChange={setContentText}
                onNotify={onNotify}
                rows={7}
                extraToolbarButton={
                  <button
                    type="button"
                    onClick={insertSharedBenefits}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-[#eaf1fa] px-2 py-1 text-xs font-semibold text-brand hover:border-brand"
                  >
                    + Chèn quyền lợi chung
                  </button>
                }
              />

              <div className="flex items-center justify-between rounded-xl border border-line bg-soft/40 p-3.5">
                <label
                  htmlFor={`${idPrefix}-status`}
                  className="text-sm font-semibold text-ink"
                >
                  Trạng thái tuyển dụng
                </label>
                <select
                  id={`${idPrefix}-status`}
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
              </div>
            </div>
          ) : (
            /* LIVE JOB PREVIEW */
            <div className="space-y-5 rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#eaf1fa] px-3 py-1 text-xs font-bold text-brand">
                  {department}
                </span>
                {expired ? (
                  <span className="rounded-full bg-[#fde8e6] px-2.5 py-0.5 text-xs font-bold text-[#c0392b]">
                    Quá hạn nộp ({deadline})
                  </span>
                ) : null}
              </div>

              <h3 className="text-2xl font-extrabold text-ink">
                {title || "Tên vị trí tuyển dụng"}
              </h3>

              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Số lượng", value: `${qty} người` },
                  { label: "Hình thức", value: jobType },
                  { label: "Địa điểm", value: location },
                  { label: "Mức lương", value: salary },
                ].map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-xl border border-line bg-soft/70 p-3"
                  >
                    <dt className="text-[11px] font-semibold uppercase text-muted">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-extrabold text-ink">
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>

              {previewBlocks.length > 0 ? (
                <ContentBlocks blocks={previewBlocks} />
              ) : (
                <p className="text-sm italic text-muted">
                  Chưa nhập mô tả công việc &amp; quyền lợi.
                </p>
              )}
            </div>
          )}
        </form>

        {/* Sticky Bottom Action Bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-6 py-3.5">
          <div>
            {baseSlug && status === "open" && !expired ? (
              <a
                href={`/tuyen-dung/${baseSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                Xem trên website
                <ArrowSquareOut size={14} aria-hidden />
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestClose}
              className="btn btn-outline btn-sm"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void submitForm(true)}
              className="btn btn-outline btn-sm border-brand text-brand hover:bg-brand hover:text-white"
            >
              Lưu &amp; tiếp tục sửa
            </button>
            <button
              type="submit"
              form={`${idPrefix}-form`}
              disabled={busy}
              className="btn btn-brand btn-sm"
            >
              {busy ? "Đang lưu..." : "Lưu vị trí"}
            </button>
          </div>
        </div>
      </div>

      {confirmDiscard ? (
        <ConfirmDialog
          title="Bỏ thay đổi chưa lưu?"
          description="Thông tin vị trí tuyển dụng đang sửa chưa được lưu. Bạn có chắc muốn đóng?"
          confirmLabel="Bỏ thay đổi"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      ) : null}
    </div>
  );
}
