import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "vk_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "vinakhang";
}

function sessionSecret(): string {
  return process.env.ADMIN_SECRET || `vlxd-session::${adminPassword()}`;
}

function sign(expiresAt: number): string {
  return createHmac("sha256", sessionSecret()).update(String(expiresAt)).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [expiresRaw, signature] = raw.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;

  return safeEqual(signature, sign(expiresAt));
}

export async function signIn(password: string): Promise<boolean> {
  if (!password || !safeEqual(password, adminPassword())) return false;

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const store = await cookies();
  const secureCookie =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";

  store.set(COOKIE_NAME, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return true;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
