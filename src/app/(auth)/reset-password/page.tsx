import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <AuthShell title="Choose a new password" description="You're signed in through your reset link. Set a new password to continue.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
