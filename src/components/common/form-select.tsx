"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FormSelectOption {
  value: string;
  label: React.ReactNode;
  /** Secondary line shown under the label in the open list only */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Plain-text label used for typeahead when `label` is a node */
  text?: string;
}

export interface FormSelectGroup {
  label: string;
  options: FormSelectOption[];
}

const NONE = "__none__";

/**
 * Option row. Only the icon + label live inside Radix's ItemText, so the closed
 * trigger shows a compact single line; the description appears in the list only.
 */
function OptionItem({ option, muted = false }: { option: FormSelectOption; muted?: boolean }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled}
      textValue={option.text ?? (typeof option.label === "string" ? option.label : undefined)}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg py-2 pr-9 pl-2.5 text-sm outline-hidden select-none",
        "focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        muted && "text-muted-foreground"
      )}
    >
      <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <span className="flex min-w-0 flex-col">
        <SelectPrimitive.ItemText>
          <span className="flex items-center gap-2">
            {option.icon ? (
              <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{option.icon}</span>
            ) : null}
            <span className="truncate">{option.label}</span>
          </span>
        </SelectPrimitive.ItemText>
        {option.description ? (
          <span className={cn("truncate text-xs text-muted-foreground", option.icon && "pl-7")}>{option.description}</span>
        ) : null}
      </span>
    </SelectPrimitive.Item>
  );
}

/**
 * Reusable styled dropdown (Radix Select) that works with plain state or
 * react-hook-form's Controller. An empty string value is supported through
 * `emptyLabel`, which renders a "none" option.
 */
export function FormSelect({
  id,
  value,
  onValueChange,
  options,
  groups,
  placeholder = "Select…",
  emptyLabel,
  invalid,
  disabled,
  className,
  contentClassName,
  size = "default",
  name,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options?: FormSelectOption[];
  groups?: FormSelectGroup[];
  placeholder?: string;
  /** When set, an extra option with this label maps to the empty string value */
  emptyLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  size?: "sm" | "default";
  name?: string;
  "aria-label"?: string;
}) {
  const current = value ? value : emptyLabel ? NONE : undefined;
  return (
    <Select value={current ?? ""} onValueChange={(v) => onValueChange(v === NONE ? "" : v)} disabled={disabled} name={name}>
      <SelectTrigger
        id={id}
        size={size}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        className={cn("w-full justify-between text-left *:data-[slot=select-value]:justify-start", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className={cn("max-h-80 min-w-(--radix-select-trigger-width)", contentClassName)}>
        {emptyLabel ? <OptionItem option={{ value: NONE, label: emptyLabel }} muted /> : null}
        {options?.map((o) => (
          <OptionItem key={o.value} option={o} />
        ))}
        {groups?.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.options.map((o) => (
              <OptionItem key={o.value} option={o} />
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
