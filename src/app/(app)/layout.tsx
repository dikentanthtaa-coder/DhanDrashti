import { requireUserWithProfile } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import type { Metadata } from "next";

// Private, per-user pages: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ user, profile }, unreadCount] = await Promise.all([requireUserWithProfile(), getUnreadNotificationCount()]);

  return (
    <div className="flex min-h-svh">
      <AppSidebar unreadCount={unreadCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader name={profile.display_name} email={user.email ?? ""} unreadCount={unreadCount} />
        <main id="main" className="flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileNavigation unreadCount={unreadCount} />
    </div>
  );
}
