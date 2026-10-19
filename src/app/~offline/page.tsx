import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { BrandLogo } from "@/components/common/brand-logo";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandLogo size={56} />
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <WifiOff className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {APP_NAME} needs a secure connection to show or save your financial data. Nothing is stored on this device.
        Reconnect and try again — any transaction you were adding has not been saved.
      </p>
      <a
        href="/dashboard"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </a>
    </main>
  );
}
