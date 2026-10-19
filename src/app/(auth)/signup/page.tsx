import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free DhanDrashti account and start tracking expenses, budgets and savings in Indian rupees.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Track expenses, budgets and savings in ₹. Your data is private to you."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
