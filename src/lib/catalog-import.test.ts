import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import addedProducts from "@/data/added-products.json";
import { categories, products } from "./content";
import { filterProducts } from "./catalog";

describe("imported catalog", () => {
  it("keeps product slugs unique and connects every product to its category", () => {
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
    for (const product of products) {
      expect(categories.find((category) => category.slug === product.category)?.label)
        .toBe(product.categoryLabel);
    }
    for (const category of categories) {
      expect(category.count).toBe(filterProducts(products, { category: category.slug }).length);
    }
  });

  it("uses available local images for every imported product", () => {
    for (const product of addedProducts) {
      expect(product.images.length).toBeGreaterThan(0);
      for (const image of product.images) {
        expect(image.startsWith("/images/products/imported/")).toBe(true);
        expect(existsSync(path.join(process.cwd(), "public", image.slice(1)))).toBe(true);
      }
    }
  });
});
