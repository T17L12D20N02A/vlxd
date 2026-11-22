export type CatalogProduct = {
  slug: string;
  name: string;
  category: string;
  englishName?: string;
  lead?: string;
};

export type ProductQuery = {
  category?: string;
  q?: string;
  sort?: "mac-dinh" | "ten";
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterProducts<T extends CatalogProduct>(
  products: readonly T[],
  query: ProductQuery = {}
): T[] {
  let result = products.filter(
    (product) => !query.category || product.category === query.category
  );

  const needle = query.q ? normalizeText(query.q) : "";
  if (needle) {
    result = result.filter((product) =>
      normalizeText([product.name, product.englishName, product.lead].filter(Boolean).join(" "))
        .includes(needle)
    );
  }

  if (query.sort === "ten") {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }

  return result;
}
