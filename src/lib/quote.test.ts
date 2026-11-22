import { describe, expect, it } from "vitest";
import {
  addItem,
  parseStoredItems,
  removeItem,
  setQty,
  totalQty,
} from "./quote";

describe("addItem", () => {
  it("adds a new line with the requested quantity", () => {
    expect(addItem([], "vai-chiu-nhiet-cao-cap", 3)).toEqual([
      { slug: "vai-chiu-nhiet-cao-cap", qty: 3 },
    ]);
  });

  it("merges the quantity when the product is already in the list", () => {
    const items = [{ slug: "vai-chiu-nhiet-cao-cap", qty: 2 }];
    expect(addItem(items, "vai-chiu-nhiet-cao-cap", 3)).toEqual([
      { slug: "vai-chiu-nhiet-cao-cap", qty: 5 },
    ]);
  });

  it("defaults to one unit", () => {
    expect(addItem([], "day-dai-han-nhiet-teflon")).toEqual([
      { slug: "day-dai-han-nhiet-teflon", qty: 1 },
    ]);
  });

  it("ignores non-positive quantities", () => {
    expect(addItem([], "day-dai-han-nhiet-teflon", 0)).toEqual([]);
    expect(addItem([], "day-dai-han-nhiet-teflon", -4)).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const items = [{ slug: "a", qty: 1 }];
    addItem(items, "b", 1);
    expect(items).toEqual([{ slug: "a", qty: 1 }]);
  });
});

describe("setQty", () => {
  it("updates the quantity of an existing line", () => {
    expect(setQty([{ slug: "a", qty: 1 }], "a", 9)).toEqual([{ slug: "a", qty: 9 }]);
  });

  it("removes the line when the quantity reaches zero", () => {
    expect(setQty([{ slug: "a", qty: 1 }], "a", 0)).toEqual([]);
  });

  it("caps the quantity at 9999", () => {
    expect(setQty([{ slug: "a", qty: 1 }], "a", 50000)).toEqual([{ slug: "a", qty: 9999 }]);
  });
});

describe("removeItem", () => {
  it("drops only the requested product", () => {
    expect(removeItem([{ slug: "a", qty: 1 }, { slug: "b", qty: 2 }], "a")).toEqual([
      { slug: "b", qty: 2 },
    ]);
  });
});

describe("totalQty", () => {
  it("sums the quantities", () => {
    expect(totalQty([{ slug: "a", qty: 2 }, { slug: "b", qty: 3 }])).toBe(5);
  });

  it("is zero for an empty list", () => {
    expect(totalQty([])).toBe(0);
  });
});

describe("parseStoredItems", () => {
  it("returns an empty list for missing or malformed storage", () => {
    expect(parseStoredItems(null)).toEqual([]);
    expect(parseStoredItems("not json")).toEqual([]);
    expect(parseStoredItems('{"slug":"a"}')).toEqual([]);
  });

  it("drops entries with invalid slugs or quantities", () => {
    const raw = JSON.stringify([
      { slug: "vai-chiu-nhiet-cao-cap", qty: 2 },
      { slug: "", qty: 1 },
      { slug: "x", qty: 0 },
      { slug: "y", qty: -1 },
      { slug: "z", qty: "3" },
      { nope: true },
    ]);
    expect(parseStoredItems(raw)).toEqual([{ slug: "vai-chiu-nhiet-cao-cap", qty: 2 }]);
  });

  it("merges duplicate slugs found in storage", () => {
    const raw = JSON.stringify([
      { slug: "a", qty: 1 },
      { slug: "a", qty: 2 },
    ]);
    expect(parseStoredItems(raw)).toEqual([{ slug: "a", qty: 3 }]);
  });
});
