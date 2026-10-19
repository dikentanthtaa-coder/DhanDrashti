import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInAction = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  signInAction: (...args: unknown[]) => signInAction(...args),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm", () => {
  beforeEach(() => signInAction.mockReset());

  it("shows validation errors and does not submit invalid input", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(await screen.findByText(/enter your password/i)).toBeInTheDocument();
    expect(signInAction).not.toHaveBeenCalled();
  });

  it("submits valid credentials and surfaces server errors", async () => {
    signInAction.mockResolvedValue({ ok: false, error: "Invalid email or password." });
    const user = userEvent.setup();
    render(<LoginForm next="/reports" />);
    await user.type(screen.getByLabelText(/email/i), "asha@example.com");
    await user.type(screen.getByLabelText(/^password/i), "secret-pass-1");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(signInAction).toHaveBeenCalledWith({ email: "asha@example.com", password: "secret-pass-1" }, "/reports"));
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = screen.getByLabelText(/^password/i);
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
  });
});

describe("LoginForm live validation", () => {
  it("validates as the user types after the first blur", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const email = screen.getByLabelText(/email/i);
    await user.type(email, "bad");
    await user.tab();
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    await user.type(email, "@example.com");
    await waitFor(() => expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument());
  });
});
