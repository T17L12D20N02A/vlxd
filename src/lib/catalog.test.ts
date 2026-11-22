import { describe, expect, it } from "vitest";
import { filterProducts, normalizeText } from "./catalog";

type P = {
  slug: string;
  name: string;
  category: string;
  englishName: string;
  lead: string;
};

const products: P[] = [
  {
    slug: "vai-chiu-nhiet-cao-cap",
    name: "Vải chịu nhiệt cao cấp",
    category: "vai",
    englishName: "PTFE Fabric Premium",
    lead: "Bề mặt trơn láng màu nâu",
  },
  {
    slug: "bang-tai-may-ep-keo-duc-lien",
    name: "Băng tải máy ép keo đúc liền",
    category: "epkeo",
    englishName: "Seamless PTFE Fusing Machine Belt",
    lead: "Vòng băng liên tục cho ngành may mặc",
  },
  {
    slug: "day-dai-han-nhiet-teflon",
    name: "Dây đai hàn nhiệt Teflon",
    category: "daidai",
    englishName: "PTFE Sealing Belt",
    lead: "Dùng cho máy hàn miệng túi",
  },
];

describe("normalizeText", () => {
  it("lowercases and removes Vietnamese diacritics", () => {
    expect(normalizeText("Băng tải Đúc Liền")).toBe("bang tai duc lien");
  });
});

describe("filterProducts", () => {
  it("returns everything by default", () => {
    expect(filterProducts(products, {})).toHaveLength(3);
  });

  it("filters by category", () => {
    const result = filterProducts(products, { category: "epkeo" });
    expect(result.map((p) => p.slug)).toEqual(["bang-tai-may-ep-keo-duc-lien"]);
  });

  it("searches without accents and ignores case", () => {
    const result = filterProducts(products, { q: "bang tai" });
    expect(result.map((p) => p.slug)).toEqual(["bang-tai-may-ep-keo-duc-lien"]);
  });

  it("searches the english name and the short description", () => {
    expect(filterProducts(products, { q: "sealing" })[0].slug).toBe("day-dai-han-nhiet-teflon");
    expect(filterProducts(products, { q: "tui" })[0].slug).toBe("day-dai-han-nhiet-teflon");
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterProducts(products, { q: "khong co gi" })).toEqual([]);
  });

  it("combines category and search", () => {
    expect(filterProducts(products, { category: "vai", q: "ep keo" })).toEqual([]);
  });

  it("sorts by Vietnamese name when asked", () => {
    const result = filterProducts(products, { sort: "ten" });
    expect(result.map((p) => p.slug)).toEqual([
      "bang-tai-may-ep-keo-duc-lien",
      "day-dai-han-nhiet-teflon",
      "vai-chiu-nhiet-cao-cap",
    ]);
  });

  it("keeps the original order for the default sort", () => {
    expect(filterProducts(products, { sort: "mac-dinh" }).map((p) => p.slug)).toEqual(
      products.map((p) => p.slug)
    );
  });

  it("does not mutate the input", () => {
    const copy = [...products];
    filterProducts(products, { sort: "ten" });
    expect(products).toEqual(copy);
  });
});
