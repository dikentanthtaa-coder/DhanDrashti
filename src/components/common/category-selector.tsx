"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { CategoryRow, CategoryType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryIcon } from "@/components/common/category-icon";
import { cn } from "@/lib/utils";

/**
 * Searchable category picker grouped by parent category. Selecting a parent
 * uses it as the main category; selecting a child uses the subcategory.
 */
export function CategorySelector({
  categories,
  type,
  value,
  onChange,
  id,
  placeholder = "Choose a category",
  invalid,
  disabled,
}: {
  categories: CategoryRow[];
  type: CategoryType;
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const visible = categories.filter((c) => c.type === type && (!c.is_archived || c.id === value));
  const parents = visible.filter((c) => !c.parent_id);
  const byParent = new Map<string, CategoryRow[]>();
  for (const c of visible) {
    if (c.parent_id) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
  }
  const selected = visible.find((c) => c.id === value) ?? null;
  const selectedParent = selected?.parent_id ? visible.find((c) => c.id === selected.parent_id) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <CategoryIcon icon={selected.icon ?? selectedParent?.icon} color={selected.color ?? selectedParent?.color} size="sm" />
              <span className="truncate">
                {selectedParent ? `${selectedParent.name} › ` : ""}
                {selected.name}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No category found.</CommandEmpty>
            {parents.map((parent) => (
              <CommandGroup key={parent.id} heading={parent.name}>
                <CategoryOption category={parent} parent={null} selected={value === parent.id} onSelect={() => { onChange(parent.id); setOpen(false); }} />
                {(byParent.get(parent.id) ?? []).map((child) => (
                  <CategoryOption key={child.id} category={child} parent={parent} selected={value === child.id} onSelect={() => { onChange(child.id); setOpen(false); }} />
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CategoryOption({
  category,
  parent,
  selected,
  onSelect,
}: {
  category: CategoryRow;
  parent: CategoryRow | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={`${parent ? parent.name + " " : ""}${category.name} ${category.id}`} onSelect={onSelect} className={cn(parent && "pl-4")}>
      <CategoryIcon icon={category.icon ?? parent?.icon} color={category.color ?? parent?.color} size="sm" />
      <span className="truncate">{parent ? category.name : `${category.name} (general)`}</span>
      {category.is_archived ? <span className="text-xs text-muted-foreground">archived</span> : null}
      <Check className={cn("ml-auto", selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}
