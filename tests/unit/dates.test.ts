import { describe, expect, it } from "vitest";
import {
  daysInRange,
  eachDayInRange,
  isValidDateString,
  monthEnd,
  monthStart,
  previousRange,
  resolvePreset,
  sanitizeRange,
  todayInTimezone,
} from "@/lib/finance/dates";
import { rangeFromSearchParams } from "@/lib/finance/range-params";

describe("timezone handling", () => {
  it("computes today in Asia/Kolkata across the UTC boundary", () => {
    // 2026-10-19T20:30:00Z is 02:00 on Oct 20 in IST (+05:30)
    expect(todayInTimezone("Asia/Kolkata", new Date("2026-10-19T20:30:00Z"))).toBe("2026-10-20");
    expect(todayInTimezone("UTC", new Date("2026-10-19T20:30:00Z"))).toBe("2026-10-19");
    expect(todayInTimezone("America/Los_Angeles", new Date("2026-10-19T05:00:00Z"))).toBe("2026-10-18");
  });
  it("falls back to the default timezone when invalid", () => {
    expect(todayInTimezone("Not/AZone", new Date("2026-10-19T20:30:00Z"))).toBe("2026-10-20");
  });
});

describe("presets (today = Monday 2026-10-19)", () => {
  const today = "2026-10-19";
  it("resolves inclusive ranges", () => {
    expect(resolvePreset("today", today)).toEqual({ start: today, end: today });
    expect(resolvePreset("yesterday", today)).toEqual({ start: "2026-10-18", end: "2026-10-18" });
    expect(resolvePreset("this_week", today)).toEqual({ start: "2026-10-19", end: "2026-10-25" });
    expect(resolvePreset("last_week", today)).toEqual({ start: "2026-10-12", end: "2026-10-18" });
    expect(resolvePreset("this_month", today)).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(resolvePreset("last_month", today)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(resolvePreset("last_30_days", today)).toEqual({ start: "2026-09-20", end: today });
    expect(resolvePreset("last_90_days", today)).toEqual({ start: "2026-07-22", end: today });
    expect(resolvePreset("this_year", today)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
  });
  it("handles month and year boundaries", () => {
    expect(resolvePreset("last_month", "2026-01-15")).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    expect(resolvePreset("this_month", "2024-02-10")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(resolvePreset("yesterday", "2026-01-01")).toEqual({ start: "2025-12-31", end: "2025-12-31" });
  });
});

describe("previousRange", () => {
  it("compares whole months to the previous month", () => {
    expect(previousRange({ start: "2026-10-01", end: "2026-10-31" })).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(previousRange({ start: "2026-03-01", end: "2026-03-31" })).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
  it("compares other ranges to the same number of preceding days", () => {
    expect(previousRange({ start: "2026-10-10", end: "2026-10-19" })).toEqual({ start: "2026-09-30", end: "2026-10-09" });
    expect(previousRange({ start: "2026-10-19", end: "2026-10-19" })).toEqual({ start: "2026-10-18", end: "2026-10-18" });
  });
});

describe("range helpers", () => {
  it("counts days and enumerates them", () => {
    expect(daysInRange({ start: "2026-10-01", end: "2026-10-31" })).toBe(31);
    expect(eachDayInRange({ start: "2026-02-27", end: "2026-03-02" })).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  });
  it("month bounds", () => {
    expect(monthStart("2026-10-19")).toBe("2026-10-01");
    expect(monthEnd("2026-02-10")).toBe("2026-02-28");
  });
  it("validates date strings", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("28-02-2026")).toBe(false);
    expect(isValidDateString(123)).toBe(false);
  });
  it("sanitizes custom ranges (swaps reversed, rejects huge/invalid)", () => {
    expect(sanitizeRange("2026-10-19", "2026-10-01", "2026-10-19")).toEqual({ start: "2026-10-01", end: "2026-10-19" });
    expect(sanitizeRange("2000-01-01", "2026-10-19", "2026-10-19")).toBeNull();
    expect(sanitizeRange("bad", "2026-10-19", "2026-10-19")).toBeNull();
  });
  it("parses search params with safe fallbacks", () => {
    const today = "2026-10-19";
    expect(rangeFromSearchParams({}, today)).toEqual({ preset: "this_month", range: { start: "2026-10-01", end: "2026-10-31" } });
    expect(rangeFromSearchParams({ preset: "custom", start: "2026-10-05", end: "2026-10-07" }, today).range).toEqual({ start: "2026-10-05", end: "2026-10-07" });
    expect(rangeFromSearchParams({ preset: "custom", start: "x", end: "y" }, today).preset).toBe("this_month");
    expect(rangeFromSearchParams({ preset: "evil" }, today).preset).toBe("this_month");
  });
});
