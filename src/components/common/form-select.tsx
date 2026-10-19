"use client";

import * as React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FormSelectOption {
  value: string;
  label: React.ReactNode;
  /** Secondary line under the label */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Plain-text label used in the closed trigger when `label` is a node */
  text?: string;
}

export interface FormSelectGroup {
  label: string;
  options: FormSelectOption[];
}

const NONE = "__none__";

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
  const renderOption = (o: FormSelectOption) => (
    <SelectItem key={o.value} value={o.value} disabled={o.disabled} textValue={o.text ?? (typeof o.label === "string" ? o.label : undefined)}>
      {o.icon ? <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">{o.icon}</span> : null}
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{o.label}</span>
        {o.description ? <span className="truncate text-xs text-muted-foreground">{o.description}</span> : null}
      </span>
    </SelectItem>
  );
  return (
    <Select
      value={current ?? ""}
      onValueChange={(v) => onValueChange(v === NONE ? "" : v)}
      disabled={disabled}
      name={name}
    >
      <SelectTrigger id={id} size={size} aria-invalid={invalid} aria-label={ariaLabel} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className={cn("max-h-80 min-w-(--radix-select-trigger-width)", contentClassName)}>
        {emptyLabel ? (
          <SelectItem value={NONE} className="text-muted-foreground">
            {emptyLabel}
          </SelectItem>
        ) : null}
        {options?.map(renderOption)}
        {groups?.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.options.map(renderOption)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
