import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryCard } from "@/components/common/summary-card";
import { formatINR } from "@/lib/finance/money";

describe("SummaryCard", () => {
  it("renders INR values with deltas", () => {
    render(<SummaryCard title="This Month's Expenses" value={formatINR(12500)} tone="expense" delta={{ value: 12.5, label: "vs previous month", invert: true }} />);
    expect(screen.getByText("₹12,500.00")).toBeInTheDocument();
    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByText("+12.5%")).toHaveClass("text-status-critical");
  });

  it("explains missing comparison data instead of fabricating it", () => {
    render(<SummaryCard title="Savings Rate" value="—" hint="No income recorded" delta={{ value: null, label: "vs previous" }} />);
    expect(screen.getByText(/no comparison data/i)).toBeInTheDocument();
    expect(screen.getByText(/no income recorded/i)).toBeInTheDocument();
  });
});
