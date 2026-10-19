"use client";

import { Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCountdown } from "@/hooks/use-retry-countdown";

/** Shown while an action is rate-limited; counts down to when it can be retried. */
export function RetryNotice({ message, remaining }: { message: string; remaining: number }) {
  return (
    <Alert role="status" aria-live="polite">
      <Clock aria-hidden="true" />
      <AlertTitle className="flex items-center justify-between gap-3">
        <span>Please wait</span>
        <span className="tabular font-mono text-base" aria-label={`${remaining} seconds remaining`}>
          {formatCountdown(remaining)}
        </span>
      </AlertTitle>
      <AlertDescription>{message} The button will unlock automatically.</AlertDescription>
    </Alert>
  );
}
