"use client";

import { useActionState } from "react";
import { LockKey } from "@phosphor-icons/react";
import { adminLogin } from "@/app/actions";
import type { LoginFormState } from "@/lib/form-state";

const initialState: LoginFormState = {};

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="admin-password" className="label">
          Mật khẩu quản trị
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Nhập mật khẩu..."
          aria-invalid={Boolean(state.error)}
          className="field"
        />
        {state.error ? (
          <p className="mt-1.5 text-xs font-semibold text-[#c0392b]">
            {state.error}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-brand w-full disabled:opacity-60"
      >
        <LockKey size={17} weight="fill" aria-hidden />
        {pending ? "Đang xác thực..." : "Đăng nhập"}
      </button>
    </form>
  );
}
