import type { QuoteStatus } from "@/lib/request";
import { STATUS_LABELS } from "@/lib/request";
import { cn } from "@/lib/format";

const STYLES: Record<QuoteStatus, string> = {
  moi: "bg-[#eaf1fa] text-brand",
  "dang-xu-ly": "bg-[#fdf1d8] text-[#8a5a00]",
  "da-bao-gia": "bg-[#e6f4ec] text-[#1f6b41]",
  "hoan-tat": "bg-[#e8f0e8] text-[#2f5d33]",
  huy: "bg-[#f3f4f6] text-[#5b6472]",
};

export function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold",
        STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
