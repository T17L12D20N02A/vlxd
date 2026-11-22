import { isValidPhone, normalizePhone } from "./request";

export type ContactInput = {
  name: string;
  phone: string;
  email?: string;
  message: string;
};

export type NormalizedContact = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

export type ContactValidation =
  | { ok: true; value: NormalizedContact }
  | { ok: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const trim = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function validateContact(input: ContactInput): ContactValidation {
  const errors: Record<string, string> = {};

  const name = trim(input.name, 120);
  if (!name) errors.name = "Vui lòng nhập họ tên.";

  const phone = normalizePhone(trim(input.phone, 30));
  if (!phone) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Số điện thoại chưa đúng định dạng (ví dụ 0932 149 717).";
  }

  const email = trim(input.email, 160);
  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Email chưa đúng định dạng.";
  }

  const message = trim(input.message, 2000);
  if (message.length < 10) {
    errors.message = "Vui lòng mô tả nhu cầu từ 10 ký tự để chúng tôi tư vấn chính xác.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, value: { name, phone, email, message } };
}
