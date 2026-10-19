import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams("type=expense&page=3"),
}));

import { DateRangeFilter } from "@/components/common/date-range-filter";

describe("DateRangeFilter", () => {
  beforeEach(() => push.mockReset());

  it("pushes the resolved preset range to the URL and resets pagination", async () => {
    const user = userEvent.setup();
    render(<DateRangeFilter preset="this_month" range={{ start: "2026-10-01", end: "2026-10-31" }} today="2026-10-19" />);
    await user.click(screen.getByRole("combobox", { name: "Date range" }));
    await user.click(await screen.findByRole("option", { name: "Previous Month" }));
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
