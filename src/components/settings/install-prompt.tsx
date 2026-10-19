"use client";

import * as React from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const noop = () => () => {};
const getIsIos = () => {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
};
const getStandalone = () => {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const isIos = React.useSyncExternalStore(noop, getIsIos, () => false);
  const standalone = React.useSyncExternalStore(noop, getStandalone, () => false);

  React.useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="size-4" aria-hidden="true" /> DhanDrashti is installed on this device.
      </p>
    );
  }

  if (deferred) {
    return (
      <Button
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") setInstalled(true);
          setDeferred(null);
        }}
      >
        <Download data-icon="inline-start" /> Install app
      </Button>
    );
  }

  if (isIos) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Share className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          On iPhone or iPad: open this page in Safari, tap <span className="font-medium text-foreground">Share</span>, then{" "}
          <span className="font-medium text-foreground">Add to Home Screen</span>.
        </span>
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Use your browser&apos;s menu and choose <span className="font-medium text-foreground">Install app</span> or{" "}
      <span className="font-medium text-foreground">Add to Home screen</span>. The install option appears once the site is served over HTTPS.
    </p>
  );
}
