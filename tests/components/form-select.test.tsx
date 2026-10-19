import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormSelect } from "@/components/common/form-select";

const options = [
  { value: "cash", label: "Cash", description: "Physical cash" },
  { value: "upi", label: "UPI" },
];

describe("FormSelect", () => {
  it("renders the placeholder, opens, and reports the chosen value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FormSelect id="pm" aria-label="Payment method" value="" onValueChange={onChange} options={options} placeholder="Pick one" />);
    const trigger = screen.getByRole("combobox", { name: "Payment method" });
    expect(trigger).toHaveTextContent("Pick one");
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: /UPI/ }));
    expect(onChange).toHaveBeenCalledWith("upi");
  });

  it("maps the empty option back to an empty string", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FormSelect aria-label="Account" value="cash" onValueChange={onChange} options={options} emptyLabel="All accounts" />);
    await user.click(screen.getByRole("combobox", { name: "Account" }));
    await user.click(await screen.findByRole("option", { name: "All accounts" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
