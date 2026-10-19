import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams("type=expense&page=3"),
}));

import { DateRangeFilter } from "@/components/common/date-range-filter";

describe("DateRangeFilter", () => {
  beforeEach(() => push.mockReset());

  it("pushes the resolved preset range to the URL and resets pagination", () => {
    render(<DateRangeFilter preset="this_month" range={{ start: "2026-10-01", end: "2026-10-31" }} today="2026-10-19" />);
    fireEvent.change(screen.getByLabelText("Date range"), { target: { value: "last_month" } });
    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(`http://x${push.mock.calls[0][0]}`);
    expect(url.pathname).toBe("/reports");
    expect(url.searchParams.get("preset")).toBe("last_month");
    expect(url.searchParams.get("start")).toBe("2026-09-01");
    expect(url.searchParams.get("end")).toBe("2026-09-30");
    expect(url.searchParams.get("type")).toBe("expense");
    expect(url.searchParams.get("page")).toBeNull();
  });

  it("shows the current range on the custom-range trigger", () => {
    render(<DateRangeFilter preset="custom" range={{ start: "2026-10-05", end: "2026-10-07" }} today="2026-10-19" />);
    expect(screen.getByRole("button", { name: /custom date range/i })).toHaveTextContent("5 Oct 2026 – 7 Oct 2026");
  });
});
