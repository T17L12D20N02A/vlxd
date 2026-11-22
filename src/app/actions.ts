"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, signIn, signOut } from "@/lib/auth";
import { listCmsProducts } from "@/lib/cms-store";
import { validateContact } from "@/lib/contact";
import { createContact } from "@/lib/contacts-store";
import type { ContactFormState, LoginFormState, QuoteFormState } from "@/lib/form-state";
import { createRequest, updateStatus } from "@/lib/requests-store";
import {
  STATUS_LABELS,
  validateRequest,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/request";

export async function submitQuote(
  _previous: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const allProducts = await listCmsProducts(true);
  const known = new Set(allProducts.map((product) => product.slug));
  const merged = new Map<string, number>();

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    parsed = [];
  }

  if (Array.isArray(parsed)) {
    for (const entry of parsed.slice(0, 200)) {
      if (!entry || typeof entry !== "object") continue;
      const slug = String((entry as { slug?: unknown }).slug ?? "");
      const qty = Number((entry as { qty?: unknown }).qty);
      if (!known.has(slug) || !Number.isFinite(qty) || qty < 1) continue;
      merged.set(slug, Math.min(9999, (merged.get(slug) ?? 0) + Math.floor(qty)));
    }
  }

  const items: QuoteItem[] = [...merged]
    .slice(0, 50)
    .map(([slug, qty]) => ({ slug, qty }));

  const result = validateRequest({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    address: String(formData.get("address") ?? ""),
    note: String(formData.get("note") ?? ""),
    items,
  });

  if (!result.ok) {
    return { status: "error", errors: result.errors };
  }

  const created = await createRequest(result.value);
  revalidatePath("/quan-tri");
  redirect(`/bao-gia/${created.code}`);
}

export async function submitContact(
  _previous: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const result = validateContact({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!result.ok) {
    return { status: "error", errors: result.errors };
  }

  await createContact(result.value);
  revalidatePath("/quan-tri");
  return { status: "success", errors: {} };
}

export async function adminLogin(
  _previous: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const ok = await signIn(String(formData.get("password") ?? ""));
  if (!ok) return { error: "Mật khẩu chưa đúng." };
  redirect("/quan-tri");
}

export async function adminLogout(): Promise<void> {
  await signOut();
  redirect("/quan-tri/dang-nhap");
}

export async function changeStatus(formData: FormData): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/quan-tri/dang-nhap");
  }

  const code = String(formData.get("code") ?? "").trim();
  const status = String(formData.get("status") ?? "") as QuoteStatus;

  if (!code || !(status in STATUS_LABELS)) return;

  await updateStatus(code, status);
  revalidatePath("/quan-tri");
  revalidatePath(`/quan-tri/${code}`);
  revalidatePath(`/bao-gia/${code}`);
}
