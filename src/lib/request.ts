export type QuoteItem = {
  slug: string;
  qty: number;
};

export type QuoteStatus = "moi" | "dang-xu-ly" | "da-bao-gia" | "hoan-tat" | "huy";

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  moi: "Mới tiếp nhận",
  "dang-xu-ly": "Đang xử lý",
  "da-bao-gia": "Đã báo giá",
  "hoan-tat": "Hoàn tất",
  huy: "Đã huỷ",
};

const FLOW: Record<QuoteStatus, QuoteStatus[]> = {
  moi: ["dang-xu-ly", "huy"],
  "dang-xu-ly": ["da-bao-gia", "huy"],
  "da-bao-gia": ["hoan-tat", "dang-xu-ly"],
  "hoan-tat": [],
  huy: [],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return FLOW[from]?.includes(to) ?? false;
}

export type QuoteRequestInput = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address?: string;
  note?: string;
  items: QuoteItem[];
};

export type NormalizedRequest = {
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  note: string;
  items: QuoteItem[];
};

export type ValidationResult =
  | { ok: true; value: NormalizedRequest }
  | { ok: false; errors: Record<string, string> };

const PHONE_RE = /^(0(3|5|7|8|9)\d{8}|02\d{8,9}|\+84(3|5|7|8|9)\d{8})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(normalizePhone(value));
}

const trim = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function validateRequest(input: QuoteRequestInput): ValidationResult {
  const errors: Record<string, string> = {};

  const name = trim(input.name, 120);
  if (!name) errors.name = "Vui lòng nhập họ tên.";

  const rawPhone = trim(input.phone, 30);
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!PHONE_RE.test(phone)) {
    errors.phone = "Số điện thoại chưa đúng định dạng (ví dụ 0932 149 717).";
  }

  const email = trim(input.email, 160);
  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Email chưa đúng định dạng.";
  }

  const items: QuoteItem[] = [];
  for (const item of input.items ?? []) {
    if (!item || typeof item.slug !== "string" || !item.slug.trim()) continue;
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 9999) continue;
    items.push({ slug: item.slug.trim(), qty: item.qty });
  }
  if (items.length === 0) {
    errors.items = "Chọn ít nhất một sản phẩm cần báo giá.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      phone,
      email,
      company: trim(input.company, 200),
      address: trim(input.address, 300),
      note: trim(input.note, 1000),
      items,
    },
  };
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

export function makeRequestCode(date: Date, seq: number): string {
  const yy = pad(date.getFullYear() % 100);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `VK-${yy}${mm}${dd}-${pad(seq, 3)}`;
}
