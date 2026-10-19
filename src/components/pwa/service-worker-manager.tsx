"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the Serwist service worker in production and prompts the user to
 * reload when a new version is waiting. Registration is skipped in development
 * and never interferes with auth flows (the worker is network-only for app routes).
 */
export function ServiceWorkerManager() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // On the very first visit the worker claims the page (clientsClaim) — that is
    // not an update, so never reload then; only reload when a previous controller
    // is replaced after the user accepted an update.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const onControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const promptUpdate = (worker: ServiceWorker) => {
      toast("A new version of DhanDrashti is available", {
        duration: Infinity,
        action: {
          label: "Update",
          onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) promptUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) promptUpdate(installing);
          });
        });
        // Check for updates when the app regains focus.
        const onVisible = () => {
          if (document.visibilityState === "visible") registration.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {
        /* registration failures are non-fatal */
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
