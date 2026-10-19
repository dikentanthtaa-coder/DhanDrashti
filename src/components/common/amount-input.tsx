"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Rupee amount input: numeric keyboard on mobile, ₹ prefix, 2-decimal pattern. */
export const AmountInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(function AmountInput(
  { className, ...props },
  ref
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
        ₹
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className={cn("tabular pl-7", className)}
        {...props}
      />
    </div>
  );
});
