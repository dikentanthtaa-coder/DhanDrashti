import { addDays, addMonths, addYears, getDaysInMonth, lastDayOfMonth, startOfMonth } from "date-fns";
import type { Frequency } from "@/lib/types/database";
import { fromDateString, toDateString, type DateString } from "@/lib/finance/dates";

/**
 * Next due date after `from`, mirroring public.recurring_next_date in SQL.
 * Monthly/yearly schedules clamp to month-end while remembering the anchor day:
 *   Jan 31 -> Feb 28 -> Mar 31 (anchor_day = 31)
 */
export function nextDueDate(frequency: Frequency, from: DateString, anchorDay: number): DateString {
  const d = fromDateString(from);
  switch (frequency) {
    case "daily":
      return toDateString(addDays(d, 1));
    case "weekly":
      return toDateString(addDays(d, 7));
    case "monthly": {
      const next = startOfMonth(addMonths(startOfMonth(d), 1));
      return toDateString(clampDay(next, anchorDay));
    }
    case "yearly": {
      const next = startOfMonth(addYears(startOfMonth(d), 1));
      return toDateString(clampDay(next, anchorDay));
    }
  }
}

function clampDay(monthStart: Date, anchorDay: number): Date {
  const dim = getDaysInMonth(monthStart);
  const day = Math.min(Math.max(1, anchorDay), dim);
  const result = new Date(monthStart);
  result.setDate(day);
  return result;
}

/** All due dates from `nextDue` up to and including `asOf`, respecting end date. */
export function dueDatesUpTo(
  frequency: Frequency,
  nextDue: DateString,
  anchorDay: number,
  asOf: DateString,
  endDate: DateString | null,
  limit = 400
): DateString[] {
  const out: DateString[] = [];
  let cursor = nextDue;
  while (cursor <= asOf && (!endDate || cursor <= endDate) && out.length < limit) {
    out.push(cursor);
    cursor = nextDueDate(frequency, cursor, anchorDay);
  }
  return out;
}

/** Upcoming occurrences for preview (does not touch the database). */
export function upcomingDates(frequency: Frequency, nextDue: DateString, anchorDay: number, count: number, endDate: DateString | null): DateString[] {
  const out: DateString[] = [];
  let cursor = nextDue;
  while (out.length < count && (!endDate || cursor <= endDate)) {
    out.push(cursor);
    cursor = nextDueDate(frequency, cursor, anchorDay);
  }
  return out;
}

export function anchorDayFor(startDate: DateString): number {
  return fromDateString(startDate).getDate();
}

export function isMonthEnd(date: DateString): boolean {
  const d = fromDateString(date);
  return toDateString(lastDayOfMonth(d)) === date;
}
