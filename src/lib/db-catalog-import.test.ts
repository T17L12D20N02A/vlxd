import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import addedProducts from "@/data/added-products.json";

const db = vi.hoisted(() => ({
  marker: false,
  pendingMarker: false,
  failProduct: false,
  productQueries: [] as string[],
  commands: [] as string[],
}));

vi.mock("pg", () => ({
  Pool: class {
    async query(sql: string) {
      if (sql.includes("COUNT(*)")) return { rows: [{ count: "11" }] };
      return { rows: [] };
    }

    async connect() {
      return {
        query: async (sql: string) => {
          db.commands.push(sql);
          if (sql.includes("RETURNING key")) {
            if (db.marker) return { rowCount: 0 };
            db.pendingMarker = true;
            return { rowCount: 1 };
          }
          if (sql.includes("INSERT INTO cms_products")) {
            if (db.failProduct) throw new Error("product insert failed");
            db.productQueries.push(sql);
          }
          if (sql === "COMMIT" && db.pendingMarker) {
            db.marker = true;
            db.pendingMarker = false;
          }
          if (sql === "ROLLBACK") db.pendingMarker = false;
          return { rowCount: 0 };
        },
        release: () => {},
      };
    }
  },
}));

const globalDb = globalThis as typeof globalThis & {
  __vkPool?: unknown;
  __vkInitPromise?: Promise<void>;
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgres://test");
  delete globalDb.__vkPool;
  delete globalDb.__vkInitPromise;
  db.marker = false;
  db.pendingMarker = false;
  db.failProduct = false;
  db.productQueries = [];
  db.commands = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete globalDb.__vkPool;
  delete globalDb.__vkInitPromise;
});

describe("catalog import into an existing database", () => {
  it("inserts new products without overwriting existing slugs and runs only once", async () => {
    const { ensureSchema } = await import("./db");
    await ensureSchema();
    expect(db.productQueries).toHaveLength(addedProducts.length);
    expect(db.productQueries.every((sql) => sql.includes("ON CONFLICT (slug) DO NOTHING")))
      .toBe(true);
    delete globalDb.__vkInitPromise;
    await ensureSchema();
    expect(db.productQueries).toHaveLength(addedProducts.length);
  });

  it("rolls back the import marker and permits a retry after an error", async () => {
    const { ensureSchema } = await import("./db");
    db.failProduct = true;
    await expect(ensureSchema()).rejects.toThrow("product insert failed");
    expect(db.commands).toContain("ROLLBACK");
    expect(db.marker).toBe(false);
    db.failProduct = false;
    await ensureSchema();
    expect(db.marker).toBe(true);
    expect(db.productQueries).toHaveLength(addedProducts.length);
  });
});
