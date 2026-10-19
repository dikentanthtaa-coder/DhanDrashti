import { describe, expect, it } from "vitest";
import { sanitizeAmount } from "@/components/common/amount-input";

describe("sanitizeAmount", () => {
  it("strips letters and symbols", () => {
    expect(sanitizeAmount("12a3b")).toBe("123");
    expect(sanitizeAmount("₹1,250.50")).toBe("1,250.50");
    expect(sanitizeAmount("abc")).toBe("");
  });
  it("keeps a single decimal point and at most two decimals", () => {
    expect(sanitizeAmount("1.2.3")).toBe("1.23");
    expect(sanitizeAmount("10.999")).toBe("10.99");
    expect(sanitizeAmount("5.")).toBe("5.");
  });
});
