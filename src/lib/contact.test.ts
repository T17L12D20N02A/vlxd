import { describe, expect, it } from "vitest";
import { validateContact } from "./contact";

const validInput = {
  name: "Trần Thị B",
  phone: "0932 149 717",
  email: "kinhdoanh@congty.vn",
  message: "Cần tư vấn băng tải cho máy ép keo khổ 600 mm.",
};

describe("validateContact", () => {
  it("accepts a complete message and normalises the phone", () => {
    const result = validateContact(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.phone).toBe("0932149717");
      expect(result.value.name).toBe("Trần Thị B");
    }
  });

  it("allows an empty email", () => {
    const result = validateContact({ ...validInput, email: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email).toBe("");
  });

  it("requires a name", () => {
    const result = validateContact({ ...validInput, name: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBeTruthy();
  });

  it("rejects an invalid phone number", () => {
    const result = validateContact({ ...validInput, phone: "12345" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.phone).toBeTruthy();
  });

  it("rejects an invalid email address", () => {
    const result = validateContact({ ...validInput, email: "sai-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeTruthy();
  });

  it("requires a message of at least 10 characters", () => {
    const result = validateContact({ ...validInput, message: "ngắn" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.message).toBeTruthy();
  });

  it("caps the message at 2000 characters", () => {
    const result = validateContact({ ...validInput, message: "x".repeat(3000) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.message.length).toBe(2000);
  });
});
