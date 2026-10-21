"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerManager } from "@/components/pwa/service-worker-manager";
import { ThemeColorSync } from "@/components/pwa/theme-color-sync";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <Toaster position="top-center" richColors closeButton />
      <ServiceWorkerManager />
      <ThemeColorSync />
    </ThemeProvider>
  );
}
