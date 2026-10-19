"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { processDueRecurringAction } from "@/lib/actions/recurring";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ProcessDueButton({ dueCount }: { dueCount: number }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant={dueCount > 0 ? "default" : "outline"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await processDueRecurringAction();
          if (r.ok) {
            toast.success(r.message ?? "Processed");
          } else toast.error(r.error);
        })
      }
    >
      {pending ? <Spinner /> : <RefreshCw data-icon="inline-start" />}
      Process due now{dueCount > 0 ? ` (${dueCount})` : ""}
    </Button>
  );
}
