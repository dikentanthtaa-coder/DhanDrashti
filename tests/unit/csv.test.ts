import { describe, expect, it } from "vitest";
import { CSV_BOM, escapeCsvField, sanitizeCell, toCsvRow } from "@/lib/csv";

describe("CSV escaping", () => {
  it("quotes fields with commas, quotes and newlines", () => {
    expect(escapeCsvField("Dominos, Andheri")).toBe('"Dominos, Andheri"');
    expect(escapeCsvField('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(sanitizeCell("=1+1")).toBe("'=1+1");
    expect(sanitizeCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(sanitizeCell("-2+3")).toBe("'-2+3");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell("\t=1")).toBe("'\t=1");
    expect(sanitizeCell("  =1")).toBe("'  =1");
    expect(sanitizeCell("Swiggy")).toBe("Swiggy");
    expect(escapeCsvField("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
  });

  it("keeps numeric columns machine-readable", () => {
    expect(escapeCsvField("1250.00", { numeric: true })).toBe("1250.00");
    expect(escapeCsvField("-15.5", { numeric: true })).toBe("-15.5");
    expect(escapeCsvField("=1", { numeric: true })).toBe("'=1");
  });

  it("builds rows with numeric column indexes", () => {
    expect(toCsvRow(["2026-10-19", "Expense", "650.50", "=evil"], new Set([2]))).toBe("2026-10-19,Expense,650.50,'=evil");
    expect(CSV_BOM).toBe("﻿");
  });
});
