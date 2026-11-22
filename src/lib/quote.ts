export type QuoteItem = {
  slug: string;
  qty: number;
};

export const MAX_QTY = 9999;

const clone = (items: QuoteItem[]): QuoteItem[] => items.map((item) => ({ ...item }));

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));

export function addItem(items: QuoteItem[], slug: string, qty = 1): QuoteItem[] {
  if (!slug || !Number.isFinite(qty) || qty <= 0) return clone(items);

  const existing = items.find((item) => item.slug === slug);
  if (!existing) {
    return [...clone(items), { slug, qty: clampQty(qty) }];
  }

  return items.map((item) =>
    item.slug === slug ? { ...item, qty: Math.min(MAX_QTY, item.qty + Math.floor(qty)) } : { ...item }
  );
}

export function setQty(items: QuoteItem[], slug: string, qty: number): QuoteItem[] {
  if (!Number.isFinite(qty) || qty <= 0) return removeItem(items, slug);
  return items.map((item) => (item.slug === slug ? { ...item, qty: clampQty(qty) } : { ...item }));
}

export function removeItem(items: QuoteItem[], slug: string): QuoteItem[] {
  return items.filter((item) => item.slug !== slug).map((item) => ({ ...item }));
}

export function totalQty(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function parseStoredItems(raw: string | null): QuoteItem[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  let items: QuoteItem[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const { slug, qty } = entry as Record<string, unknown>;
    if (typeof slug !== "string" || !slug.trim()) continue;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) continue;
    items = addItem(items, slug.trim(), qty);
  }

  return items;
}
