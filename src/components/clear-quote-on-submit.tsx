"use client";

import { useEffect } from "react";
import { useQuote } from "@/components/quote-provider";

export function ClearQuoteOnSubmit() {
  const { clear } = useQuote();

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("vk_quote_submitted") === "1") {
        window.sessionStorage.removeItem("vk_quote_submitted");
        clear();
      }
    } catch {
      // ignore storage errors
    }
  }, [clear]);

  return null;
}
