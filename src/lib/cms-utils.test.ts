import { describe, expect, it } from "vitest";
import {
  isJobExpired,
  nextCopySlug,
  parseLinesToBlocks,
  resolveTargetSlug,
  sanitizeImageUrl,
  sanitizePlainText,
  sanitizeSafeUrl,
  todayDisplayVN,
  todayIsoVN,
  validateAndNormalizeSnapshot,
} from "./cms-utils";

describe("cms-utils", () => {
  it("computes Vietnam date accurately during 00:00–07:00 ICT (when UTC is still yesterday)", () => {
    // 2026-11-25 02:30:00 ICT == 2026-11-24T19:30:00.000Z
    const earlyMorningVN = new Date("2026-11-24T19:30:00.000Z");
    expect(earlyMorningVN.toISOString().slice(0, 10)).toBe("2026-11-24");
    expect(todayIsoVN(earlyMorningVN)).toBe("2026-11-25");
    expect(todayDisplayVN(earlyMorningVN)).toBe("25/11/2026");
  });

  it("detects expired job deadlines in Vietnam timezone", () => {
    const now = new Date("2026-11-24T19:30:00.000Z"); // 2026-11-25 in VN
    expect(isJobExpired("2026-11-24", now)).toBe(true);
    expect(isJobExpired("24/11/2026", now)).toBe(true);
    expect(isJobExpired("2026-11-25", now)).toBe(false);
    expect(isJobExpired("", now)).toBe(false);
  });

  it("preserves originalSlug when editing if slug field is cleared", () => {
    expect(
      resolveTargetSlug({
        originalSlug: "vai-chiu-nhiet-cao-cap",
        slug: "   ",
        fallbackTitle: "Tên mới hoàn toàn",
      })
    ).toBe("vai-chiu-nhiet-cao-cap");

    expect(
      resolveTargetSlug({
        slug: "",
        fallbackTitle: "Băng tải lưới PTFE",
      })
    ).toBe("bang-tai-luoi-ptfe");
  });

  it("generates unique incremental copy slugs without collision", () => {
    const existing = ["vai-teflon", "vai-teflon-copy", "vai-teflon-copy-2"];
    expect(nextCopySlug("vai-teflon", existing)).toBe("vai-teflon-copy-3");
    expect(nextCopySlug("vai-teflon-copy", existing)).toBe("vai-teflon-copy-3");
    expect(nextCopySlug("bang-keo", existing)).toBe("bang-keo-copy");
  });

  it("upgrades http:// images to https:// and rejects javascript: URLs", () => {
    const upgrades: string[] = [];
    expect(
      sanitizeImageUrl("http://example.com/logo.png", { trackUpgrades: upgrades })
    ).toBe("https://example.com/logo.png");
    expect(upgrades).toEqual(["http://example.com/logo.png"]);

    expect(sanitizeImageUrl("/images/products/test.webp")).toBe(
      "/images/products/test.webp"
    );
    expect(() => sanitizeImageUrl("javascript:alert(1)")).toThrow();
    expect(() => sanitizeSafeUrl("javascript:evil()")).toThrow();
    expect(sanitizeSafeUrl("http://youtube.com/watch?v=1")).toBe(
      "https://youtube.com/watch?v=1"
    );
  });

  it("strips script tags and inline event handlers from text and blocks", () => {
    expect(
      sanitizePlainText('Xin chào <script>alert("xss")</script><img src=x onerror=alert(1)>')
    ).toBe("Xin chào");

    const blocks = parseLinesToBlocks(
      "## Tiêu đề <script>evil()</script>\n\n- Ý 1 <b>đậm</b>\n- Ý 2\n\nĐoạn văn thường"
    );
    expect(blocks).toEqual([
      { type: "h", text: "Tiêu đề" },
      { type: "list", items: ["Ý 1 đậm", "Ý 2"] },
      { type: "p", text: "Đoạn văn thường" },
    ]);
  });

  it("validates imported JSON snapshot, upgrades http images, deduplicates slugs, and cleans orphaned related products", () => {
    expect(() => validateAndNormalizeSnapshot({ products: [] })).toThrow(
      /applications/
    );

    const res = validateAndNormalizeSnapshot({
      products: [
        {
          slug: "sp-1",
          name: "Sản phẩm 1 <script>bad()</script>",
          category: "vai",
          images: ["http://cdn.example.com/p1.jpg"],
        },
        {
          slug: "sp-1",
          name: "Sản phẩm trùng slug",
          category: "vai",
        },
      ],
      applications: [
        {
          slug: "ud-1",
          title: "Ứng dụng 1",
          image: "http://cdn.example.com/a1.jpg",
          relatedProducts: ["sp-1", "sp-khong-ton-tai"],
          blocks: [{ type: "p", text: "An toàn <img onerror=alert(1)>" }],
        },
      ],
      articles: [],
      jobs: [{ title: "Kỹ thuật viên", deadline: "2026-12-31" }],
    });

    expect(res.counts).toEqual({
      products: 2,
      applications: 1,
      articles: 0,
      jobs: 1,
    });
    expect(res.snapshot.products[0].name).toBe("Sản phẩm 1");
    expect(res.snapshot.products[0].images[0]).toBe(
      "https://cdn.example.com/p1.jpg"
    );
    expect(res.snapshot.products[1].slug).toBe("sp-1-copy");
    expect(res.snapshot.applications[0].relatedProducts).toEqual(["sp-1"]);
    expect(res.warnings.length).toBeGreaterThanOrEqual(3);
  });
});
