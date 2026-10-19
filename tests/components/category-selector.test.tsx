import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategorySelector } from "@/components/common/category-selector";
import type { CategoryRow } from "@/lib/types/database";

const base = { user_id: null, icon: null, color: null, is_system: true, slug: null, sort_order: 0, is_archived: false, created_at: "", updated_at: "" };
const categories: CategoryRow[] = [
  { ...base, id: "p1", name: "Food & Eating", type: "expense", parent_id: null },
  { ...base, id: "c1", name: "Restaurants", type: "expense", parent_id: "p1" },
  { ...base, id: "c2", name: "Old", type: "expense", parent_id: "p1", is_archived: true },
  { ...base, id: "i1", name: "Salary", type: "income", parent_id: null },
];

describe("CategorySelector", () => {
  it("lists only categories of the selected type, hides archived ones, and selects a subcategory", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategorySelector categories={categories} type="expense" value={null} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Restaurants")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
    await user.click(screen.getByText("Restaurants"));
    expect(onChange).toHaveBeenCalledWith("c1");
  });

  it("shows the selected parent › child label", () => {
    render(<CategorySelector categories={categories} type="expense" value="c1" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Food & Eating › Restaurants");
  });
});
