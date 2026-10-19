import { describe, expect, it } from "vitest";
import { formatINR, formatAmount, money, parseAmountInput, percentOf, round2, sum, toFixed2 } from "@/lib/finance/money";

describe("money", () => {
  it("formats INR with Indian digit grouping", () => {
    expect(formatINR(1250)).toBe("₹1,250.00");
    expect(formatINR(25000)).toBe("₹25,000.00");
    expect(formatINR(125000)).toBe("₹1,25,000.00");
    expect(formatINR(12345678.9)).toBe("₹1,23,45,678.90");
    expect(formatINR(0)).toBe("₹0.00");
  });

  it("formats negative and signed values", () => {
    expect(formatINR(-1500)).toBe("-₹1,500.00");
    expect(formatINR(1500, { signed: true })).toBe("+₹1,500.00");
    expect(formatINR(0, { signed: true })).toBe("₹0.00");
  });

  it("formats compact values without decimals", () => {
    expect(formatINR(125000, { compact: true })).toBe("₹1,25,000");
    expect(formatINR(999.5, { compact: true })).toBe("₹999.50");
  });

  it("keeps monetary precision with Decimal (no float drift)", () => {
    expect(sum([0.1, 0.2]).toString()).toBe("0.3");
    expect(sum(["1.10", "2.20", "3.30"]).toFixed(2)).toBe("6.60");
    expect(round2(2.345).toString()).toBe("2.35");
    expect(round2(2.344).toString()).toBe("2.34");
    expect(toFixed2("1000")).toBe("1000.00");
  });

  it("treats invalid input as zero", () => {
    expect(money(null).toNumber()).toBe(0);
    expect(money("abc").toNumber()).toBe(0);
    expect(money(Number.NaN).toNumber()).toBe(0);
  });

  it("computes percentages safely", () => {
    expect(percentOf(6500, 8000)).toBe(81.25);
    expect(percentOf(10, 0)).toBe(0);
  });

  it("parses user amount input", () => {
    expect(parseAmountInput("1,25,000.50")?.toString()).toBe("125000.5");
    expect(parseAmountInput("₹ 1200")?.toString()).toBe("1200");
    expect(parseAmountInput("12.345")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("")).toBeNull();
  });

  it("formats plain amounts", () => {
    expect(formatAmount(1234567.891)).toBe("12,34,567.89");
  });
});
