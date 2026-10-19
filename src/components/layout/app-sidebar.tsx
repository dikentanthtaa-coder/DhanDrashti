"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS, isActivePath } from "@/components/layout/nav-config";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/common/brand-logo";

export function AppSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <aside
      className="no-print sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex"
      aria-label="Primary"
    >
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2.5 border-b px-5 outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`${APP_NAME} home`}
      >
        <BrandLogo size={36} />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Menu</p>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "border-primary/40 border-l-2 border-l-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("size-[18px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
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
      <div className="border-t px-5 py-3 text-xs text-muted-foreground">Amounts in ₹ · Private to your account</div>
    </aside>
  );
}
