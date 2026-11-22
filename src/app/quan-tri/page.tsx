import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminCms } from "@/components/admin-cms";
import { isAdmin } from "@/lib/auth";
import {
  getRecruitmentSettings,
  listCmsApplications,
  listCmsArticles,
  listCmsJobs,
  listCmsProducts,
} from "@/lib/cms-store";
import { listContacts } from "@/lib/contacts-store";
import { hasDatabase } from "@/lib/db";
import { listRequests } from "@/lib/requests-store";

export const metadata: Metadata = {
  title: "Quản trị Vina Khang",
  robots: { index: false, follow: false },
};

async function DashboardLoader() {
  await connection();
  if (!(await isAdmin())) {
    redirect("/quan-tri/dang-nhap");
  }

  const [products, applications, articles, jobs, recruitment, requests, contacts] =
    await Promise.all([
      listCmsProducts(true),
      listCmsApplications(true),
      listCmsArticles(true),
      listCmsJobs(true),
      getRecruitmentSettings(),
      listRequests(),
      listContacts(),
    ]);

  return (
    <AdminCms
      initial={{
        dbMode: hasDatabase() ? "postgres" : "json",
        products,
        applications,
        articles,
        jobs,
        recruitment,
        requests,
        contacts,
      }}
    />
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-soft" />
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}
