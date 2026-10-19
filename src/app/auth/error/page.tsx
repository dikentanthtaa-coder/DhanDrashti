import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Link expired" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold">This link is invalid or has expired</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Verification and password-reset links can only be used once and expire after a short time. Request a new one and
        try again.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    </main>
  );
}
