import { describe, expect, it } from "vitest";
import { anchorDayFor, dueDatesUpTo, isMonthEnd, nextDueDate, upcomingDates } from "@/lib/finance/recurring";

describe("nextDueDate", () => {
  it("daily and weekly", () => {
    expect(nextDueDate("daily", "2026-10-31", 31)).toBe("2026-11-01");
    expect(nextDueDate("weekly", "2026-12-28", 28)).toBe("2027-01-04");
  });
  it("monthly clamps to month end and restores the anchor day", () => {
    expect(nextDueDate("monthly", "2026-01-31", 31)).toBe("2026-02-28");
    expect(nextDueDate("monthly", "2026-02-28", 31)).toBe("2026-03-31");
    expect(nextDueDate("monthly", "2026-03-31", 31)).toBe("2026-04-30");
    expect(nextDueDate("monthly", "2026-04-30", 30)).toBe("2026-05-30");
    expect(nextDueDate("monthly", "2026-12-15", 15)).toBe("2027-01-15");
  });
  it("leap years", () => {
    expect(nextDueDate("monthly", "2024-01-31", 31)).toBe("2024-02-29");
    expect(nextDueDate("yearly", "2024-02-29", 29)).toBe("2025-02-28");
    expect(nextDueDate("yearly", "2025-02-28", 29)).toBe("2026-02-28");
    expect(nextDueDate("yearly", "2027-02-28", 29)).toBe("2028-02-29");
  });
});

describe("schedule enumeration", () => {
  it("catches up all missed dates up to as-of", () => {
    expect(dueDatesUpTo("monthly", "2026-01-31", 31, "2026-04-15", null)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
  it("respects the end date", () => {
    expect(dueDatesUpTo("weekly", "2026-10-01", 1, "2026-10-31", "2026-10-10")).toEqual(["2026-10-01", "2026-10-08"]);
  });
  it("returns nothing when not yet due", () => {
    expect(dueDatesUpTo("daily", "2026-11-01", 1, "2026-10-31", null)).toEqual([]);
  });
  it("previews upcoming dates", () => {
    expect(upcomingDates("monthly", "2026-01-31", 31, 3, null)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(upcomingDates("monthly", "2026-01-31", 31, 5, "2026-02-28")).toEqual(["2026-01-31", "2026-02-28"]);
  });
  it("derives anchor day and month-end", () => {
    expect(anchorDayFor("2026-01-31")).toBe(31);
    expect(isMonthEnd("2026-02-28")).toBe(true);
    expect(isMonthEnd("2026-02-27")).toBe(false);
  });
});
