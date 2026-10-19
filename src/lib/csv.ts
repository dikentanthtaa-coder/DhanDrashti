/**
 * CSV utilities with RFC 4180 quoting and spreadsheet formula-injection protection.
 */

const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Neutralise cells that spreadsheet apps would evaluate as formulas by
 * prefixing with a single quote. Numbers are handled separately (never escaped).
 */
export function sanitizeCell(value: string): string {
  if (value.length === 0) return value;
  const first = value[0];
  if (FORMULA_TRIGGERS.has(first)) return `'${value}`;
  // Also guard against leading whitespace followed by a trigger (" =1+1").
  const trimmed = value.trimStart();
  if (trimmed !== value && trimmed.length > 0 && FORMULA_TRIGGERS.has(trimmed[0])) return `'${value}`;
  return value;
}

export function escapeCsvField(value: unknown, options?: { numeric?: boolean }): string {
  if (value === null || value === undefined) return "";
  if (options?.numeric) {
    const s = String(value);
    return /^-?\d+(\.\d+)?$/.test(s) ? s : escapeCsvField(s);
  }
  const text = sanitizeCell(String(value));
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvRow(fields: (string | number | null | undefined)[], numericColumns: Set<number> = new Set()): string {
  return fields.map((f, i) => escapeCsvField(f, { numeric: numericColumns.has(i) })).join(",");
}

/** UTF-8 BOM so Excel detects encoding and renders ₹ and Indic text correctly. */
export const CSV_BOM = "﻿";
