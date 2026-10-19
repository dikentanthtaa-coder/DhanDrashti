"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const POPULAR = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

function regionOf(tz: string): string {
  const i = tz.indexOf("/");
  return i === -1 ? "Other" : tz.slice(0, i);
}

function cityOf(tz: string): string {
  const i = tz.indexOf("/");
  return (i === -1 ? tz : tz.slice(i + 1)).replace(/_/g, " ");
}

function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Searchable timezone picker rendered as a modal (hundreds of zones, grouped by region). */
export function TimezonePicker({ id, value, onChange, timezones, invalid }: { id?: string; value: string; onChange: (tz: string) => void; timezones: string[]; invalid?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const groups = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tz of timezones) {
      const r = regionOf(tz);
      map.set(r, [...(map.get(r) ?? []), tz]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [timezones]);
  const popular = POPULAR.filter((tz) => timezones.includes(tz));

  const pick = (tz: string) => {
    onChange(tz);
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
        onClick={() => setOpen(true)}
        className="h-10 w-full justify-between px-3 font-normal shadow-xs hover:border-ring/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{value}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{offsetLabel(value)}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogHeader className="border-b px-4 pt-4 pb-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle>Choose your timezone</DialogTitle>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>
            <DialogDescription>Type a city or region. This decides what “today” and “this month” mean for you.</DialogDescription>
          </DialogHeader>
          <Command className="flex-1 overflow-hidden bg-transparent" loop>
            <div className="px-2 pt-2 [&_[data-slot=input-group]]:h-11! [&_[data-slot=input-group]]:border-input [&_[data-slot=input-group]]:bg-background [&_[data-slot=input-group]]:text-base">
              <CommandInput placeholder="Search timezones…" autoFocus />
            </div>
            <CommandList className="max-h-[60svh] px-2 py-2">
              <CommandEmpty>No timezone matches your search.</CommandEmpty>
              {popular.length ? (
                <CommandGroup heading="Popular">
                  {popular.map((tz) => (
                    <TimezoneOption key={tz} tz={tz} selected={tz === value} onSelect={() => pick(tz)} />
                  ))}
                </CommandGroup>
              ) : null}
              {groups.map(([region, zones]) => (
                <CommandGroup key={region} heading={region}>
                  {zones.map((tz) => (
                    <TimezoneOption key={tz} tz={tz} selected={tz === value} onSelect={() => pick(tz)} />
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

function TimezoneOption({ tz, selected, onSelect }: { tz: string; selected: boolean; onSelect: () => void }) {
  return (
    <CommandItem value={`${tz} ${cityOf(tz)} ${regionOf(tz)}`} onSelect={onSelect} aria-selected={selected} className={cn("h-10 cursor-pointer gap-3 rounded-lg px-3", selected && "bg-primary/10")}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{cityOf(tz)}</span>
        <span className="truncate text-xs text-muted-foreground">{tz}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground tabular">{offsetLabel(tz)}</span>
      <Check className={cn("size-4 shrink-0 text-primary", selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}
