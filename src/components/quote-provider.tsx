"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  addItem,
  parseStoredItems,
  removeItem,
  setQty as setQtyPure,
  totalQty,
  type QuoteItem,
} from "@/lib/quote";

const STORAGE_KEY = "vinakhang.quote.v1";
const CHANGE_EVENT = "vinakhang:quote-change";

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function writeItems(next: QuoteItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore storage errors
  }
}

type QuoteContextValue = {
  items: QuoteItem[];
  ready: boolean;
  count: number;
  add: (slug: string, qty?: number) => void;
  updateQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = raw !== null;
  const items = useMemo(() => (raw ? parseStoredItems(raw) : []), [raw]);

  const add = useCallback((slug: string, qty = 1) => {
    const current = parseStoredItems(getSnapshot());
    writeItems(addItem(current, slug, qty));
  }, []);

  const updateQty = useCallback((slug: string, qty: number) => {
    const current = parseStoredItems(getSnapshot());
    writeItems(setQtyPure(current, slug, qty));
  }, []);

  const remove = useCallback((slug: string) => {
    const current = parseStoredItems(getSnapshot());
    writeItems(removeItem(current, slug));
  }, []);

  const clear = useCallback(() => {
    writeItems([]);
  }, []);

  const value = useMemo<QuoteContextValue>(
    () => ({
      items,
      ready,
      count: totalQty(items),
      add,
      updateQty,
      remove,
      clear,
    }),
    [items, ready, add, updateQty, remove, clear]
  );

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote(): QuoteContextValue {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuote phải dùng bên trong QuoteProvider");
  }
  return context;
}
