"use client";

import * as React from "react";

/**
 * Countdown until a rate-limited action may be retried. The deadline is kept in
 * localStorage (per key) so a page reload does not reset the timer.
 */
export function useRetryCountdown(storageKey: string) {
  const key = `dd-retry:${storageKey}`;
  const [deadline, setDeadline] = React.useState<number | null>(null);
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount
        setDeadline(parsed);
      } else if (stored) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* storage unavailable */
    }
  }, [key]);

  React.useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const t = Date.now();
      if (t >= deadline) {
        // Expired: unlock and forget the persisted deadline (inside the timer callback, not the effect body).
        setDeadline(null);
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return;
      }
      setNow(t);
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline, key]);

  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  const start = React.useCallback(
    (seconds: number) => {
      const until = Date.now() + Math.max(1, seconds) * 1000;
      setDeadline(until);
      setNow(Date.now());
      try {
        window.localStorage.setItem(key, String(until));
      } catch {
        /* ignore */
      }
    },
    [key]
  );

  return { remaining, active: remaining > 0, start };
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
