import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const verified = params.verified === "1";
  const deleted = params.deleted === "1";
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to see your dashboard."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {verified ? (
        <Alert className="mb-4" role="status">
          <AlertDescription>Your email is verified. You can sign in now.</AlertDescription>
        </Alert>
      ) : null}
      {deleted ? (
        <Alert className="mb-4" role="status">
          <AlertDescription>Your account and all its data have been deleted.</AlertDescription>
        </Alert>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  );
}
