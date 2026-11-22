import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteCmsApplication,
  deleteCmsArticle,
  deleteCmsJob,
  deleteCmsProduct,
  duplicateCmsProduct,
  exportCmsSnapshot,
  getRecruitmentSettings,
  listCmsApplications,
  listCmsArticles,
  listCmsJobs,
  listCmsProducts,
  resetCmsToSeed,
  saveCmsApplication,
  saveCmsArticle,
  saveCmsJob,
  saveCmsProduct,
  saveRecruitmentSettings,
  toggleCmsApplicationStatus,
  toggleCmsArticleStatus,
  toggleCmsJobStatus,
  toggleCmsProductStatus,
} from "@/lib/cms-store";
import { listContacts } from "@/lib/contacts-store";
import { hasDatabase } from "@/lib/db";
import { listRequests } from "@/lib/requests-store";
import type { Block } from "@/lib/types";

function parseLinesToBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of paragraphs) {
    if (part.startsWith("## ")) {
      blocks.push({ type: "h", text: part.slice(3).trim() });
    } else if (part.split("\n").every((line) => line.trim().startsWith("- "))) {
      blocks.push({
        type: "list",
        items: part
          .split("\n")
          .map((line) => line.trim().replace(/^-\s*/, ""))
          .filter(Boolean),
      });
    } else {
      blocks.push({ type: "p", text: part });
    }
  }
  return blocks;
}

function revalidateAllPublic() {
  revalidatePath("/");
  revalidatePath("/san-pham");
  revalidatePath("/ung-dung");
  revalidatePath("/tin-tuc");
  revalidatePath("/tuyen-dung");
  revalidatePath("/quan-tri");
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("export") === "1") {
    const snapshot = await exportCmsSnapshot();
    return new NextResponse(JSON.stringify(snapshot, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="vinakhang-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
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

  return NextResponse.json({
    dbMode: hasDatabase() ? "postgres" : "json",
    products,
    applications,
    articles,
    jobs,
    recruitment,
    requests,
    contacts,
  });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      entity: string;
      action: string;
      payload?: Record<string, unknown>;
    };

    const { entity, action, payload = {} } = body;

    if (entity === "system" && action === "reset") {
      await resetCmsToSeed();
      revalidateAllPublic();
      return NextResponse.json({ ok: true });
    }

    if (entity === "settings" && action === "save") {
      const saved = await saveRecruitmentSettings({
        intro: String(payload.intro ?? ""),
        email: String(payload.email ?? ""),
      });
      revalidatePath("/tuyen-dung");
      revalidatePath("/quan-tri");
      return NextResponse.json({ ok: true, item: saved });
    }

    if (entity === "products") {
      if (action === "save") {
        const saved = await saveCmsProduct({
          originalSlug: payload.originalSlug ? String(payload.originalSlug) : undefined,
          slug: payload.slug ? String(payload.slug) : undefined,
          name: String(payload.name ?? ""),
          category: String(payload.category ?? "vai"),
          englishName: String(payload.englishName ?? ""),
          lead: String(payload.lead ?? ""),
          miniSpecs: Array.isArray(payload.miniSpecs) ? payload.miniSpecs : [],
          images: Array.isArray(payload.images) ? payload.images : [],
          description: Array.isArray(payload.description)
            ? payload.description
            : String(payload.descriptionText ?? "")
                .split(/\n{2,}/)
                .map((s) => s.trim())
                .filter(Boolean),
          specs: Array.isArray(payload.specs) ? payload.specs : [],
          applications: Array.isArray(payload.applications)
            ? payload.applications
            : String(payload.applicationsText ?? "")
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
          featured: Boolean(payload.featured),
          status: payload.status === "hidden" ? "hidden" : "show",
        });
        revalidateAllPublic();
        revalidatePath(`/san-pham/${saved.slug}`);
        return NextResponse.json({ ok: true, item: saved });
      }
      if (action === "delete") {
        await deleteCmsProduct(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true });
      }
      if (action === "toggle") {
        const item = await toggleCmsProductStatus(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true, item });
      }
      if (action === "duplicate") {
        const item = await duplicateCmsProduct(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true, item });
      }
    }

    if (entity === "applications") {
      if (action === "save") {
        const blocks = Array.isArray(payload.blocks)
          ? (payload.blocks as Block[])
          : parseLinesToBlocks(String(payload.contentText ?? ""));
        const saved = await saveCmsApplication({
          originalSlug: payload.originalSlug ? String(payload.originalSlug) : undefined,
          slug: payload.slug ? String(payload.slug) : undefined,
          title: String(payload.title ?? ""),
          tag: String(payload.tag ?? ""),
          image: String(payload.image ?? ""),
          excerpt: String(payload.excerpt ?? ""),
          blocks,
          video: String(payload.video ?? ""),
          relatedProducts: Array.isArray(payload.relatedProducts)
            ? (payload.relatedProducts as string[])
            : [],
          status: payload.status === "hidden" ? "hidden" : "show",
        });
        revalidateAllPublic();
        revalidatePath(`/ung-dung/${saved.slug}`);
        return NextResponse.json({ ok: true, item: saved });
      }
      if (action === "delete") {
        await deleteCmsApplication(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true });
      }
      if (action === "toggle") {
        const item = await toggleCmsApplicationStatus(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true, item });
      }
    }

    if (entity === "articles") {
      if (action === "save") {
        const blocks = Array.isArray(payload.blocks)
          ? (payload.blocks as Block[])
          : parseLinesToBlocks(String(payload.contentText ?? ""));
        const saved = await saveCmsArticle({
          originalSlug: payload.originalSlug ? String(payload.originalSlug) : undefined,
          slug: payload.slug ? String(payload.slug) : undefined,
          title: String(payload.title ?? ""),
          date: String(payload.date ?? ""),
          author: String(payload.author ?? "Vina Khang"),
          image: String(payload.image ?? ""),
          excerpt: String(payload.excerpt ?? ""),
          blocks,
          video: String(payload.video ?? ""),
          relatedProducts: Array.isArray(payload.relatedProducts)
            ? (payload.relatedProducts as string[])
            : [],
          status: payload.status === "hidden" ? "hidden" : "show",
        });
        revalidateAllPublic();
        revalidatePath(`/tin-tuc/${saved.slug}`);
        return NextResponse.json({ ok: true, item: saved });
      }
      if (action === "delete") {
        await deleteCmsArticle(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true });
      }
      if (action === "toggle") {
        const item = await toggleCmsArticleStatus(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true, item });
      }
    }

    if (entity === "jobs") {
      if (action === "save") {
        const blocks = Array.isArray(payload.blocks)
          ? (payload.blocks as Block[])
          : parseLinesToBlocks(String(payload.contentText ?? ""));
        const saved = await saveCmsJob({
          originalSlug: payload.originalSlug ? String(payload.originalSlug) : undefined,
          slug: payload.slug ? String(payload.slug) : undefined,
          title: String(payload.title ?? ""),
          department: String(payload.department ?? ""),
          qty: Number(payload.qty ?? 1),
          jobType: String(payload.jobType ?? "Toàn thời gian"),
          location: String(payload.location ?? "TP. HCM"),
          salary: String(payload.salary ?? "Thỏa thuận"),
          deadline: String(payload.deadline ?? ""),
          blocks,
          status:
            payload.status === "paused" || payload.status === "closed"
              ? payload.status
              : "open",
        });
        revalidateAllPublic();
        revalidatePath(`/tuyen-dung/${saved.slug}`);
        return NextResponse.json({ ok: true, item: saved });
      }
      if (action === "delete") {
        await deleteCmsJob(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true });
      }
      if (action === "toggle") {
        const item = await toggleCmsJobStatus(String(payload.slug ?? ""));
        revalidateAllPublic();
        return NextResponse.json({ ok: true, item });
      }
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 400 }
    );
  }
}
