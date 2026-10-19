"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import type { CategoryRow, CategoryType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CategoryIcon } from "@/components/common/category-icon";
import { cn } from "@/lib/utils";

/**
 * Category picker rendered as a modal: searchable, grouped by main category,
 * large touch targets, keyboard navigable (type to filter, arrows, Enter).
 * Selecting a main category uses it directly; selecting a child uses the subcategory.
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
  allowClear = false,
}: {
  categories: CategoryRow[];
  type: CategoryType;
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
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

  const pick = (nextId: string | null) => {
    onChange(nextId);
    setOpen(false);
  };

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-invalid={invalid}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-10 w-full justify-between px-3 font-normal shadow-xs hover:border-ring/60"
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <CategoryIcon icon={selected.icon ?? selectedParent?.icon} color={selected.color ?? selectedParent?.color} size="sm" />
            <span className="truncate">
              {selectedParent ? <span className="text-muted-foreground">{selectedParent.name} › </span> : null}
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogHeader className="border-b px-4 pt-4 pb-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>{type === "income" ? "Choose an income category" : "Choose an expense category"}</DialogTitle>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>
            <DialogDescription>Search or browse. Pick a main category or one of its subcategories.</DialogDescription>
          </DialogHeader>
          <Command className="flex-1 overflow-hidden bg-transparent" loop>
            <div className="px-2 pt-2 [&_[data-slot=input-group]]:h-11! [&_[data-slot=input-group]]:bg-background [&_[data-slot=input-group]]:border-input [&_[data-slot=input-group]]:text-base">
              <CommandInput placeholder="Search categories…" autoFocus />
            </div>
            <CommandList className="max-h-[60svh] px-2 py-2">
              <CommandEmpty>No category matches your search.</CommandEmpty>
              {allowClear && value ? (
                <CommandGroup>
                  <CommandItem value="__clear__" onSelect={() => pick(null)} className="h-11 rounded-lg px-3 text-muted-foreground">
                    <X className="size-4" /> Clear selection
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {parents.map((parent) => (
                <CommandGroup key={parent.id} heading={parent.name} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase">
                  <CategoryOption category={parent} parent={null} selected={value === parent.id} onSelect={() => pick(parent.id)} />
                  {(byParent.get(parent.id) ?? []).map((child) => (
                    <CategoryOption key={child.id} category={child} parent={parent} selected={value === child.id} onSelect={() => pick(child.id)} />
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
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
    <CommandItem
      value={`${parent ? parent.name + " " : ""}${category.name} ${category.id}`}
      onSelect={onSelect}
      aria-selected={selected}
      className={cn("h-11 cursor-pointer gap-3 rounded-lg px-3", parent && "ml-2", selected && "bg-primary/10 text-foreground")}
    >
      <CategoryIcon icon={category.icon ?? parent?.icon} color={category.color ?? parent?.color} size="md" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{parent ? category.name : category.name}</span>
        <span className="truncate text-xs text-muted-foreground">{parent ? `in ${parent.name}` : "Main category (general)"}</span>
      </span>
      {category.is_archived ? <span className="text-xs text-muted-foreground">archived</span> : null}
      <Check className={cn("size-4 shrink-0 text-primary", selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}
