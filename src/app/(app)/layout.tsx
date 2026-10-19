import { requireUserWithProfile } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUserWithProfile();
  const unreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-dvh">
      <AppSidebar unreadCount={unreadCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader name={profile.display_name} email={user.email ?? ""} unreadCount={unreadCount} />
        <main id="main" className="flex-1 px-4 pt-4 pb-24 lg:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileNavigation unreadCount={unreadCount} />
    </div>
  );
}
