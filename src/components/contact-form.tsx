"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { submitContact } from "@/app/actions";
import { initialContactFormState } from "@/lib/form-state";

export function ContactForm() {
  const [state, action, pending] = useActionState(
    submitContact,
    initialContactFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {state.status === "success" ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-[#b7e1c7] bg-[#e6f4ec] p-4 text-sm text-[#1f6b41]"
        >
          <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Đã gửi tin nhắn thành công!</p>
            <p className="mt-0.5">
              Cảm ơn bạn đã liên hệ Vina Khang. Đội ngũ tư vấn sẽ phản hồi sớm nhất qua điện thoại hoặc email.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="label">
            Họ và tên <span className="text-[#c0392b]">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            aria-invalid={Boolean(state.errors.name)}
            className="field"
          />
          {state.errors.name ? (
            <p className="mt-1.5 text-xs font-semibold text-[#c0392b]">
              {state.errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-phone" className="label">
            Số điện thoại <span className="text-[#c0392b]">*</span>
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="0932 149 717"
            aria-invalid={Boolean(state.errors.phone)}
            className="field"
          />
          {state.errors.phone ? (
            <p className="mt-1.5 text-xs font-semibold text-[#c0392b]">
              {state.errors.phone}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className="label">
          Email (không bắt buộc)
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ten@congty.vn"
          aria-invalid={Boolean(state.errors.email)}
          className="field"
        />
        {state.errors.email ? (
          <p className="mt-1.5 text-xs font-semibold text-[#c0392b]">
            {state.errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-message" className="label">
          Nội dung cần tư vấn <span className="text-[#c0392b]">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          placeholder="Ví dụ: Cần tư vấn băng tải máy ép keo khổ 600mm, nhiệt độ làm việc 180°C..."
          aria-invalid={Boolean(state.errors.message)}
          className="field resize-y"
        />
        {state.errors.message ? (
          <p className="mt-1.5 text-xs font-semibold text-[#c0392b]">
            {state.errors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-brand w-full sm:w-auto disabled:opacity-60"
      >
        <PaperPlaneTilt size={17} weight="fill" aria-hidden />
        {pending ? "Đang gửi..." : "Gửi liên hệ"}
      </button>
    </form>
  );
}
