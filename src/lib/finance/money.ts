import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal | number | string | null | undefined;

/** Build a Decimal from any input; invalid/null becomes 0. */
export function money(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    const d = new Decimal(value);
    return d.isFinite() ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

/** Round to 2 decimal places (half-up) and return a Decimal. */
export function round2(value: MoneyInput): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Round to 2 decimals and return a plain number for display/serialisation. */
export function toNumber2(value: MoneyInput): number {
  return round2(value).toNumber();
}

/** Fixed 2-decimal string for machine-readable output (CSV, inputs). */
export function toFixed2(value: MoneyInput): string {
  return round2(value).toFixed(2);
}

export function sum(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(money(v)), new Decimal(0));
}

/** percentage = part / whole * 100, rounded to 2 decimals; 0 when whole is 0. */
export function percentOf(part: MoneyInput, whole: MoneyInput): number {
  const w = money(whole);
  if (w.isZero()) return 0;
  return money(part).div(w).times(100).toDecimalPlaces(2).toNumber();
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrNoSymbol = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format with Indian digit grouping: ₹1,25,000.00
 */
export function formatINR(value: MoneyInput, options?: { compact?: boolean; signed?: boolean }): string {
  const d = round2(value);
  const abs = d.abs().toNumber();
  const formatted = options?.compact && abs >= 1000 ? inrCompactFormatter.format(abs) : inrFormatter.format(abs);
  // Intl may render "₹" with a trailing narrow space in some runtimes; normalise.
  const normalised = formatted.replace(/^₹\s?/, "₹");
  if (d.isNegative()) return `-${normalised}`;
  if (options?.signed && d.isPositive() && !d.isZero()) return `+${normalised}`;
  return normalised;
}

/** Number with Indian grouping and no currency symbol: 1,25,000.00 */
export function formatAmount(value: MoneyInput): string {
  return inrNoSymbol.format(round2(value).toNumber());
}

/** Parse a user-typed amount ("1,25,000.50", "₹ 1200") into a Decimal or null. */
export function parseAmountInput(raw: string): Decimal | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const d = new Decimal(cleaned);
  return d.isFinite() ? d : null;
}
