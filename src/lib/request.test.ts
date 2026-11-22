import { describe, expect, it } from "vitest";
import {
  canTransition,
  makeRequestCode,
  normalizePhone,
  validateRequest,
} from "./request";

const validInput = {
  name: "Nguyễn Văn A",
  phone: "0932 149 717",
  email: "mua@congty.vn",
  company: "Công ty Bao Bì Tân Phú",
  address: "Bình Dương",
  note: "Cần băng tải rộng 600 mm",
  items: [{ slug: "bang-tai-may-ep-keo-duc-lien", qty: 2 }],
};

describe("normalizePhone", () => {
  it("strips spaces, dots and dashes", () => {
    expect(normalizePhone(" 0932.149.717 ")).toBe("0932149717");
    expect(normalizePhone("0932-149-717")).toBe("0932149717");
  });
});

describe("validateRequest", () => {
  it("accepts a complete request and normalises the phone", () => {
    const result = validateRequest(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.phone).toBe("0932149717");
      expect(result.value.name).toBe("Nguyễn Văn A");
      expect(result.value.items).toEqual([{ slug: "bang-tai-may-ep-keo-duc-lien", qty: 2 }]);
    }
  });

  it("requires a name", () => {
    const result = validateRequest({ ...validInput, name: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeTruthy();
  });

  it("requires a phone number", () => {
    const result = validateRequest({ ...validInput, phone: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.phone).toBeTruthy();
  });

  it("rejects phone numbers that are not Vietnamese mobile or landline", () => {
    for (const phone of ["12345", "abcdefghij", "09321497171", "1234567890"]) {
      const result = validateRequest({ ...validInput, phone });
      expect(result.ok, phone).toBe(false);
    }
  });

  it("rejects an invalid email when one is provided", () => {
    const result = validateRequest({ ...validInput, email: "khong-phai-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
  });

  it("allows an empty email", () => {
    const result = validateRequest({ ...validInput, email: "" });
    expect(result.ok).toBe(true);
  });

  it("requires at least one product", () => {
    const result = validateRequest({ ...validInput, items: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.items).toBeTruthy();
  });

  it("rejects quantities outside 1 to 9999", () => {
    for (const qty of [0, -1, 10000]) {
      const result = validateRequest({
        ...validInput,
        items: [{ slug: "a", qty }],
      });
      expect(result.ok, String(qty)).toBe(false);
    }
  });

  it("rejects items without a slug", () => {
    const result = validateRequest({
      ...validInput,
      items: [{ slug: "", qty: 1 }],
    });
    expect(result.ok).toBe(false);
  });

  it("caps stored notes at 1000 characters", () => {
    const result = validateRequest({ ...validInput, note: "x".repeat(1500) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.note.length).toBe(1000);
  });
});

describe("makeRequestCode", () => {
  it("builds a dated, zero padded code", () => {
    expect(makeRequestCode(new Date(2026, 10, 22), 3)).toBe("VK-261122-003");
    expect(makeRequestCode(new Date(2026, 0, 5), 12)).toBe("VK-260105-012");
  });
});

describe("canTransition", () => {
  it("allows the documented flow", () => {
    expect(canTransition("moi", "dang-xu-ly")).toBe(true);
    expect(canTransition("dang-xu-ly", "da-bao-gia")).toBe(true);
    expect(canTransition("da-bao-gia", "hoan-tat")).toBe(true);
  });

  it("blocks skipping or reopening finished requests", () => {
    expect(canTransition("moi", "hoan-tat")).toBe(false);
    expect(canTransition("hoan-tat", "dang-xu-ly")).toBe(false);
    expect(canTransition("huy", "moi")).toBe(false);
  });
});
