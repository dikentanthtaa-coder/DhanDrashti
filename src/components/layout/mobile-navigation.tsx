"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "@/components/layout/nav-config";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/common/brand-logo";

export function MobileNavigation({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const primary = NAV_ITEMS.filter((i) => i.mobile);

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur safe-bottom lg:hidden"
      aria-label="Primary mobile"
    >
      <ul className="grid grid-cols-5 items-end">
        {primary.slice(0, 2).map((item) => (
          <MobileTab key={item.href} href={item.href} label={item.label} icon={<item.icon className="size-5" />} active={isActivePath(pathname, item.href)} />
        ))}
        <li className="flex justify-center">
          <Link
            href="/transactions/new?type=expense"
            className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Add expense"
          >
            <Plus className="size-6" aria-hidden="true" />
          </Link>
        </li>
        {primary.slice(2, 3).map((item) => (
          <MobileTab key={item.href} href={item.href} label={item.label} icon={<item.icon className="size-5" />} active={isActivePath(pathname, item.href)} />
        ))}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-0.5 px-2 py-2 text-[11px] text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="More navigation"
              >
                <span className="relative">
                  <Menu className="size-5" aria-hidden="true" />
                  {unreadCount > 0 ? <span className="absolute -top-1 -right-1 size-2 rounded-full bg-status-critical" aria-hidden="true" /> : null}
                </span>
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BrandLogo size={28} /> {APP_NAME}
                </SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-2 gap-2 px-4 pb-6">
                {NAV_ITEMS.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium",
                          active ? "border-primary bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <item.icon className="size-4" aria-hidden="true" />
                        {item.label}
                        {item.href === "/notifications" && unreadCount > 0 ? (
                          <Badge variant="secondary" className="ml-auto">
                            {unreadCount}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

function MobileTab({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {icon}
        {label}
      </Link>
    </li>
  );
}
