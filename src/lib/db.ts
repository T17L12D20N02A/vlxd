import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import contentData from "@/data/content.json";
import addedProducts from "@/data/added-products.json";
import type { Content, Product } from "./types";

const seed = contentData as Content;
const catalogImportKey = "catalog-expansion-2026-11";

const globalForDb = globalThis as unknown as {
  __vkPool?: Pool;
  __vkInitPromise?: Promise<void>;
};

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    ""
  );
}

export function hasDatabase(): boolean {
  return Boolean(resolveDatabaseUrl());
}

function shouldUseSsl(connectionString: string): boolean {
  if (/sslmode=disable/i.test(connectionString)) return false;
  if (/sslmode=(require|verify-ca|verify-full|prefer)/i.test(connectionString)) {
    return true;
  }
  return !/@(localhost|127\.0\.0\.1|db)(:|\/)/i.test(connectionString);
}

export function getPool(): Pool {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL / POSTGRES_URL is not configured");
  }
  if (!globalForDb.__vkPool) {
    const useSsl = shouldUseSsl(connectionString);
    // Strip sslmode param when passing explicit ssl config so pg doesn't override rejectUnauthorized
    const sanitized = useSsl
      ? connectionString.replace(/([?&])sslmode=[^&]+(&?)/i, (_, p1, p2) =>
          p1 === "?" && p2 ? "?" : p2 ? p1 : ""
        )
      : connectionString;

    globalForDb.__vkPool = new Pool({
      connectionString: sanitized,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: process.env.VERCEL ? 5 : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.__vkPool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cms_products (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  english_name TEXT NOT NULL DEFAULT '',
  lead TEXT NOT NULL DEFAULT '',
  mini_specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  description JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  applications JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'show',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_applications (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  video TEXT NOT NULL DEFAULT '',
  related_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'show',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_articles (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT 'Vina Khang',
  image TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  video TEXT NOT NULL DEFAULT '',
  related_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'show',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_jobs (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  job_type TEXT NOT NULL DEFAULT 'Toàn thời gian',
  location TEXT NOT NULL DEFAULT 'TP. HCM',
  salary TEXT NOT NULL DEFAULT 'Thỏa thuận',
  deadline TEXT NOT NULL DEFAULT '',
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_requests (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'moi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  history JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at
  ON quote_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON contact_messages (created_at DESC);

ALTER TABLE cms_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
`;

async function insertSeedProduct(client: PoolClient, p: Product, sortOrder: number): Promise<void> {
  const catLabel =
    p.categoryLabel ||
    seed.categories.find((c) => c.slug === p.category)?.label ||
    p.category ||
    "Vật tư Teflon";
  await client.query(
    `INSERT INTO cms_products (
      slug, name, category, category_label, english_name, lead,
      mini_specs, images, description, specs, applications, featured, status, sort_order
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,'show',$13)
    ON CONFLICT (slug) DO NOTHING`,
    [
      p.slug,
      p.name || p.slug,
      p.category || "vai",
      catLabel,
      p.englishName || "",
      p.lead || "",
      JSON.stringify(p.miniSpecs ?? []),
      JSON.stringify(p.images ?? []),
      JSON.stringify(p.description ?? []),
      JSON.stringify(p.specs ?? []),
      JSON.stringify(p.applications ?? []),
      Boolean(p.featured),
      sortOrder,
    ]
  );
}

async function seedCmsTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const products = [...seed.products, ...addedProducts];
    for (let i = 0; i < products.length; i += 1) {
      await insertSeedProduct(client, products[i], i);
    }

    const APP_TAGS: Record<string, string> = {
      "may-mac-ep-keo": "May mặc",
      "giay-dep-ep-dan": "Giày dép",
      "dong-goi-han-mieng-tui": "Đóng gói",
      "che-bien-thuc-pham": "Thực phẩm",
      "in-chuyen-nhiet": "In ấn",
      "thiet-bi-ep-nhiet": "Ép nhiệt",
      "say-xu-ly-be-mat": "Sấy",
      "boc-phu-bao-ve-thiet-bi": "Bảo vệ",
    };

    for (let i = 0; i < seed.applications.length; i += 1) {
      const a = seed.applications[i];
      await client.query(
        `INSERT INTO cms_applications (
          slug, title, tag, image, excerpt, blocks, video, related_products, status, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,'',$7::jsonb,'show',$8)
        ON CONFLICT (slug) DO NOTHING`,
        [
          a.slug,
          a.title,
          APP_TAGS[a.slug] || a.title.split("–")[0]?.trim() || "Công nghiệp",
          a.image,
          a.excerpt,
          JSON.stringify(a.blocks),
          JSON.stringify(a.relatedProducts),
          i,
        ]
      );
    }

    for (let i = 0; i < seed.articles.length; i += 1) {
      const a = seed.articles[i];
      await client.query(
        `INSERT INTO cms_articles (
          slug, title, date, author, image, excerpt, blocks, video, related_products, status, sort_order
        ) VALUES ($1,$2,$3,'Vina Khang',$4,$5,$6::jsonb,'',$7::jsonb,'show',$8)
        ON CONFLICT (slug) DO NOTHING`,
        [
          a.slug,
          a.title,
          a.date,
          a.image,
          a.excerpt,
          JSON.stringify(a.blocks),
          JSON.stringify(a.relatedProducts),
          i,
        ]
      );
    }

    for (let i = 0; i < seed.jobs.length; i += 1) {
      const j = seed.jobs[i];
      const qtyFact = j.facts.find((f) => /số lượng/i.test(f.label))?.value ?? "1";
      const qty = parseInt(qtyFact.replace(/[^\d]/g, ""), 10) || 1;
      const typeFact =
        j.facts.find((f) => /hình thức/i.test(f.label))?.value ?? "Toàn thời gian";
      const locFact =
        j.facts.find((f) => /địa điểm/i.test(f.label))?.value ?? "TP. HCM";
      const salFact =
        j.facts.find((f) => /lương|thu nhập/i.test(f.label))?.value ?? "Thỏa thuận";

      await client.query(
        `INSERT INTO cms_jobs (
          slug, title, department, qty, job_type, location, salary, deadline, facts, blocks, status, sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'',$8::jsonb,$9::jsonb,'open',$10)
        ON CONFLICT (slug) DO NOTHING`,
        [
          j.slug,
          j.title,
          j.department,
          qty,
          typeFact,
          locFact,
          salFact,
          JSON.stringify(j.facts),
          JSON.stringify(j.blocks),
          i,
        ]
      );
    }

    await client.query(
      `INSERT INTO cms_settings (key, value)
       VALUES ('recruitment', $1::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [
        JSON.stringify({
          intro:
            "Đồng hành cùng đội ngũ cung ứng vật tư công nghiệp ổn định cho hơn 5000 khách hàng trên toàn quốc.",
          email: "vinakhangtrade@gmail.com",
        }),
      ]
    );

    await client.query(
      `INSERT INTO cms_settings (key, value) VALUES ($1, '{}'::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [catalogImportKey]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function importAddedProducts(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const marker = await client.query(
      `INSERT INTO cms_settings (key, value) VALUES ($1, '{}'::jsonb)
       ON CONFLICT (key) DO NOTHING RETURNING key`,
      [catalogImportKey]
    );
    if (marker.rowCount) {
      for (let i = 0; i < addedProducts.length; i += 1) {
        await insertSeedProduct(client, addedProducts[i], seed.products.length + i);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  if (!hasDatabase()) return;
  if (!globalForDb.__vkInitPromise) {
    globalForDb.__vkInitPromise = (async () => {
      const pool = getPool();
      await pool.query(SCHEMA_SQL);
      const { rows } = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM cms_products"
      );
      if (Number(rows[0]?.count ?? 0) === 0) {
        await seedCmsTables(pool);
      }
      await importAddedProducts(pool);
    })().catch((error) => {
      globalForDb.__vkInitPromise = undefined;
      throw error;
    });
  }
  await globalForDb.__vkInitPromise;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

export async function resetCmsToSeed(): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    "TRUNCATE TABLE cms_products, cms_applications, cms_articles, cms_jobs, cms_settings"
  );
  await seedCmsTables(pool);
}

export async function checkDbHealth(): Promise<{
  mode: "postgres" | "json";
  ok: boolean;
  error?: string;
}> {
  if (!hasDatabase()) {
    return { mode: "json", ok: true };
  }
  try {
    await dbQuery("SELECT 1");
    return { mode: "postgres", ok: true };
  } catch (error) {
    return {
      mode: "postgres",
      ok: false,
      error: error instanceof Error ? error.message : "Database error",
    };
  }
}
