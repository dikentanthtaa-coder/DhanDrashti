import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { APP_NAME } from "@/lib/constants";
import { BrandLogo } from "@/components/common/brand-logo";
import { HeaderTitle } from "@/components/layout/header-title";

export function DashboardHeader({ name, email, unreadCount }: { name: string; email: string; unreadCount: number }) {
  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold lg:hidden" aria-label={`${APP_NAME} dashboard`}>
        <BrandLogo size={30} />
      </Link>
      <HeaderTitle />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/transactions/new?type=expense">
            <Plus data-icon="inline-start" /> Add expense
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          <Link href="/notifications" className="relative">
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-status-critical" aria-hidden="true" />
            ) : null}
          </Link>
        </Button>
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
