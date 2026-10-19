import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signUpAction = vi.fn();
vi.mock("@/lib/actions/auth", () => ({
  signUpAction: (...args: unknown[]) => signUpAction(...args),
  resendVerificationAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import { SignupForm } from "@/components/auth/signup-form";

describe("SignupForm", () => {
  beforeEach(() => signUpAction.mockReset());

  it("enforces password policy and confirmation", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/your name/i), "Asha");
    await user.type(screen.getByLabelText(/email/i), "asha@example.com");
    await user.type(screen.getByLabelText(/^password/i), "short1");
    await user.type(screen.getByLabelText(/confirm password/i), "different1");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/use at least 10 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signUpAction).not.toHaveBeenCalled();
  });

  it("shows the verification notice after a successful signup", async () => {
    signUpAction.mockResolvedValue({ ok: true, data: { needsVerification: true } });
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.type(screen.getByLabelText(/your name/i), "Asha");
    await user.type(screen.getByLabelText(/email/i), "asha@example.com");
    await user.type(screen.getByLabelText(/^password/i), "paisa-track-2026");
    await user.type(screen.getByLabelText(/confirm password/i), "paisa-track-2026");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(signUpAction).toHaveBeenCalled());
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText("asha@example.com")).toBeInTheDocument();
  });
});
