"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorkerManager } from "@/components/pwa/service-worker-manager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <Toaster position="top-center" richColors closeButton />
      <ServiceWorkerManager />
    </ThemeProvider>
  );
}
