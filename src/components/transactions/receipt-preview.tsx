"use client";

import * as React from "react";
import { ExternalLink, FileText, RefreshCw } from "lucide-react";
import { getReceiptUrlAction } from "@/lib/actions/receipts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Loads a short-lived signed URL for the receipt and renders an image or PDF link. */
export function ReceiptPreview({ transactionId, compact = false }: { transactionId: string; compact?: boolean }) {
  const [state, setState] = React.useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; url: string; isPdf: boolean; expiresAt: number }>({ status: "loading" });
  const [expired, setExpired] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const fetchUrl = React.useCallback(async () => {
    const r = await getReceiptUrlAction(transactionId);
    if (!r.ok) setState({ status: "error", message: r.error });
    else {
      setState({ status: "ready", url: r.data.url, isPdf: r.data.isPdf, expiresAt: Date.now() + r.data.expiresInSeconds * 1000 });
      setExpired(false);
    }
  }, [transactionId]);

  // Initial load (async work only; no synchronous state updates in the effect body).
  React.useEffect(() => {
    let cancelled = false;
    void getReceiptUrlAction(transactionId).then((r) => {
      if (cancelled) return;
      if (!r.ok) setState({ status: "error", message: r.error });
      else setState({ status: "ready", url: r.data.url, isPdf: r.data.isPdf, expiresAt: Date.now() + r.data.expiresInSeconds * 1000 });
    });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  // Flip to "expired" when the signed URL lifetime passes.
  React.useEffect(() => {
    if (state.status !== "ready") return;
    const ms = Math.max(0, state.expiresAt - Date.now());
    const handle = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(handle);
  }, [state]);

  const load = () => {
    setState({ status: "loading" });
    startTransition(() => fetchUrl());
  };

  if (state.status === "loading") return <Skeleton className={compact ? "h-24 w-24 rounded-md" : "h-64 w-full rounded-lg"} />;
  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {state.message}
        <Button type="button" variant="ghost" size="sm" onClick={load} disabled={pending}>
          <RefreshCw data-icon="inline-start" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state.isPdf ? (
        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
          <span>PDF receipt</span>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <a href={state.url} target="_blank" rel="noopener noreferrer">
              Open PDF <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      ) : (
        <a href={state.url} target="_blank" rel="noopener noreferrer" className="block w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.url}
            alt="Receipt"
            className={compact ? "max-h-24 rounded-md border object-contain" : "max-h-96 rounded-lg border object-contain"}
            onError={() => setState({ status: "error", message: "The preview link expired." })}
          />
        </a>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Private link, expires in a couple of minutes.</span>
        <Button type="button" variant="ghost" size="xs" onClick={load} disabled={pending}>
          <RefreshCw data-icon="inline-start" /> {expired ? "Link expired — refresh" : "Refresh link"}
        </Button>
      </div>
    </div>
  );
}
