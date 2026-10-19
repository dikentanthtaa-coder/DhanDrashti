"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CONTROL_KEYS = new Set(["Backspace", "Delete", "Tab", "Enter", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]);

/**
 * Keyboard guard for numeric fields: allows digits, navigation/editing keys and
 * shortcuts (copy/paste/select-all); optionally one decimal point and minus.
 */
export function numericKeyGuard(e: React.KeyboardEvent<HTMLInputElement>, opts: { decimal?: boolean; negative?: boolean } = {}) {
  if (e.ctrlKey || e.metaKey || e.altKey || CONTROL_KEYS.has(e.key)) return;
  if (/^\d$/.test(e.key)) return;
  const value = e.currentTarget.value;
  if (opts.decimal && e.key === "." && !value.includes(".")) return;
  if (opts.negative && e.key === "-" && !value.includes("-") && e.currentTarget.selectionStart === 0) return;
  if (e.key === ",") return; // Indian digit grouping while typing
  e.preventDefault();
}

/** Strip anything that is not part of a decimal amount (keeps digits, one dot, commas). */
export function sanitizeAmount(raw: string): string {
  let out = raw.replace(/[^\d.,]/g, "");
  const firstDot = out.indexOf(".");
  if (firstDot !== -1) out = out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  const [intPart, decPart] = out.split(".");
  return decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
}

/** Rupee amount input: numeric keyboard on mobile, ₹ prefix, letters blocked, max 2 decimals. */
export const AmountInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(function AmountInput(
  { className, onKeyDown, onChange, onPaste, ...props },
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
        pattern="[0-9,]*[.]?[0-9]{0,2}"
        className={cn("tabular pl-7", className)}
        onKeyDown={(e) => {
          numericKeyGuard(e, { decimal: true });
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          const cleaned = sanitizeAmount(e.target.value);
          if (cleaned !== e.target.value) e.target.value = cleaned;
          onChange?.(e);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          const cleaned = sanitizeAmount(text);
          if (cleaned !== text) {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? el.value.length;
            const next = sanitizeAmount(el.value.slice(0, start) + cleaned + el.value.slice(end));
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
            setter?.call(el, next);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
          onPaste?.(e);
        }}
        {...props}
      />
    </div>
  );
});
