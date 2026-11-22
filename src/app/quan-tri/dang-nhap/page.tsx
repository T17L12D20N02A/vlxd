import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PageHero } from "@/components/page-hero";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};

async function LoginGate() {
  await connection();
  if (await isAdmin()) {
    redirect("/quan-tri");
  }

  return (
    <div className="mx-auto max-w-md card p-6 sm:p-8">
      <h2 className="text-[1.25rem]">Xác thực nội bộ</h2>
      <p className="mt-1.5 text-sm text-muted">
        Nhập mật khẩu quản trị để xem yêu cầu báo giá và tin nhắn liên hệ.
      </p>
      <div className="mt-6">
        <AdminLoginForm />
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <>
      <PageHero
        title="Quản trị Vina Khang"
        description="Khu vực nội bộ theo dõi yêu cầu báo giá và phản hồi khách hàng."
        crumbs={[
          { href: "/", label: "Trang chủ" },
          { label: "Đăng nhập quản trị" },
        ]}
      />

      <section className="py-12 sm:py-16">
        <div className="container-page">
          <Suspense
            fallback={
              <div className="mx-auto max-w-md h-64 animate-pulse rounded-2xl border border-line bg-soft" />
            }
          >
            <LoginGate />
          </Suspense>
        </div>
      </section>
    </>
  );
}
