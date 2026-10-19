import { describe, expect, it } from "vitest";
import { formatCountdown } from "@/hooks/use-retry-countdown";

describe("formatCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(59)).toBe("0:59");
    expect(formatCountdown(61)).toBe("1:01");
    expect(formatCountdown(3600)).toBe("1:00:00");
    expect(formatCountdown(3725)).toBe("1:02:05");
  });
});
