"use client";

export type QuoteFormState = {
  status: "idle" | "error";
  errors: Record<string, string>;
};

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors: Record<string, string>;
};

export type LoginFormState = {
  error?: string;
};

export const initialQuoteFormState: QuoteFormState = {
  status: "idle",
  errors: {},
};

export const initialContactFormState: ContactFormState = {
  status: "idle",
  errors: {},
};
