"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  ShoppingCartSimple,
} from "@phosphor-icons/react";
import { MAX_QTY } from "@/lib/quote";
import { useQuote } from "./quote-provider";

export function AddToQuote({ slug }: { slug: string }) {
  const { add, items } = useQuote();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const current = items.find((item) => item.slug === slug);

  function change(next: number) {
    setQty(Math.min(MAX_QTY, Math.max(1, next)));
  }

  function handleAdd() {
    add(slug, qty);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2400);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-line bg-white">
          <button
            type="button"
            onClick={() => change(qty - 1)}
            aria-label="Giảm số lượng"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-soft disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus size={15} weight="bold" aria-hidden />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QTY}
            value={qty}
            onChange={(event) => change(Number(event.target.value) || 1)}
            aria-label="Số lượng"
            className="w-12 border-0 bg-transparent text-center text-[15px] font-bold text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => change(qty + 1)}
            aria-label="Tăng số lượng"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-soft"
          >
            <Plus size={15} weight="bold" aria-hidden />
          </button>
        </div>

        <button type="button" onClick={handleAdd} className="btn btn-brand">
          {added ? (
            <>
              <Check size={17} weight="bold" aria-hidden />
              Đã thêm
            </>
          ) : (
            <>
              <ShoppingCartSimple size={17} aria-hidden />
              Thêm vào yêu cầu
            </>
          )}
        </button>
      </div>
      <p aria-live="polite" className="text-[13px] text-muted">
        {current
          ? `Đang có ${current.qty} sản phẩm này trong giỏ yêu cầu báo giá.`
          : "Sản phẩm chưa có trong giỏ yêu cầu báo giá."}
      </p>
    </div>
  );
}
