"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS, isActivePath } from "@/components/layout/nav-config";
import { Badge } from "@/components/ui/badge";

export function AppSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <aside className="no-print hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex" aria-label="Primary">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
          ₹
        </span>
        <span className="font-semibold">{APP_NAME}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 ? (
                    <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs" aria-label={`${unreadCount} unread`}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">Amounts in ₹ · Private to your account</div>
    </aside>
  );
}
