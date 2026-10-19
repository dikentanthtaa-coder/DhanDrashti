import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  isValid,
  differenceInCalendarDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export const ISO_DATE = "yyyy-MM-dd";

/** A calendar date string "yyyy-MM-dd" (no time component). */
export type DateString = string;

export function toDateString(d: Date): DateString {
  return format(d, ISO_DATE);
}

export function fromDateString(s: DateString): Date {
  // parseISO on a date-only string yields local midnight, which is what we want
  // for calendar arithmetic on the user's day.
  return parseISO(s);
}

export function isValidDateString(s: unknown): s is DateString {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseISO(s));
}

/** "Today" as a calendar date in the given IANA timezone. */
export function todayInTimezone(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): DateString {
  try {
    return format(toZonedTime(now, timezone), ISO_DATE);
  } catch {
    return format(toZonedTime(now, DEFAULT_TIMEZONE), ISO_DATE);
  }
}

export interface DateRange {
  start: DateString;
  end: DateString; // inclusive
}

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "this_year"
  | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "Current Week" },
  { value: "last_week", label: "Previous Week" },
  { value: "this_month", label: "Current Month" },
  { value: "last_month", label: "Previous Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_90_days", label: "Last 90 Days" },
  { value: "this_year", label: "Current Year" },
  { value: "custom", label: "Custom Range" },
];

/** Resolve a preset into an inclusive range relative to `today` (weeks start Monday). */
export function resolvePreset(preset: RangePreset, today: DateString): DateRange {
  const t = fromDateString(today);
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const y = toDateString(subDays(t, 1));
      return { start: y, end: y };
    }
    case "this_week":
      return { start: toDateString(startOfWeek(t, { weekStartsOn: 1 })), end: toDateString(endOfWeek(t, { weekStartsOn: 1 })) };
    case "last_week": {
      const lw = subWeeks(t, 1);
      return { start: toDateString(startOfWeek(lw, { weekStartsOn: 1 })), end: toDateString(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case "this_month":
      return { start: toDateString(startOfMonth(t)), end: toDateString(endOfMonth(t)) };
    case "last_month": {
      const lm = subMonths(t, 1);
      return { start: toDateString(startOfMonth(lm)), end: toDateString(endOfMonth(lm)) };
    }
    case "last_30_days":
      return { start: toDateString(subDays(t, 29)), end: today };
    case "last_90_days":
      return { start: toDateString(subDays(t, 89)), end: today };
    case "this_year":
      return { start: toDateString(startOfYear(t)), end: toDateString(endOfYear(t)) };
    case "custom":
    default:
      return { start: toDateString(startOfMonth(t)), end: toDateString(endOfMonth(t)) };
  }
}

/** The immediately preceding range of equal length (for period-over-period comparison). */
export function previousRange(range: DateRange): DateRange {
  const start = fromDateString(range.start);
  const end = fromDateString(range.end);
  const days = differenceInCalendarDays(end, start) + 1;
  // Month-aligned ranges compare to the previous month rather than N days back.
  if (toDateString(startOfMonth(start)) === range.start && toDateString(endOfMonth(end)) === range.end) {
    const prevStart = subMonths(start, 1);
    const prevEnd = subDays(start, 1);
    if (toDateString(startOfMonth(prevStart)) === toDateString(prevStart)) {
      return { start: toDateString(prevStart), end: toDateString(prevEnd) };
    }
  }
  return { start: toDateString(subDays(start, days)), end: toDateString(subDays(start, 1)) };
}

export function monthStart(date: DateString): DateString {
  return toDateString(startOfMonth(fromDateString(date)));
}

export function monthEnd(date: DateString): DateString {
  return toDateString(endOfMonth(fromDateString(date)));
}

export function addMonthsToDateString(date: DateString, months: number): DateString {
  return toDateString(addMonths(fromDateString(date), months));
}

export function daysInRange(range: DateRange): number {
  return differenceInCalendarDays(fromDateString(range.end), fromDateString(range.start)) + 1;
}

/** Every day in the range (inclusive) as date strings. */
export function eachDayInRange(range: DateRange): DateString[] {
  const out: DateString[] = [];
  let cursor = fromDateString(range.start);
  const end = fromDateString(range.end);
  let guard = 0;
  while (cursor <= end && guard < 5000) {
    out.push(toDateString(cursor));
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function formatDisplayDate(date: DateString | Date, pattern = "d MMM yyyy"): string {
  const d = typeof date === "string" ? fromDateString(date) : date;
  return isValid(d) ? format(d, pattern) : "";
}

export function formatMonthLabel(date: DateString): string {
  return format(fromDateString(date), "MMM yyyy");
}

/** Clamp a custom range to sane bounds: start <= end, max 5 years. */
export function sanitizeRange(start: unknown, end: unknown, today: DateString): DateRange | null {
  if (!isValidDateString(start) || !isValidDateString(end)) return null;
  let s = start;
  let e = end;
  if (s > e) [s, e] = [e, s];
  if (daysInRange({ start: s, end: e }) > 366 * 5) return null;
  void today;
  return { start: s, end: e };
}
