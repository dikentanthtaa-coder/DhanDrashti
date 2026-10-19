import type { Metadata } from "next";
import { BellOff } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/data/notifications";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { NotificationList } from "@/components/notifications/notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser();
  const notifications = await listNotifications(100);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="Budget alerts and recurring reminders. Each alert is sent once per threshold and month." />
      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet" description="You'll see budget threshold alerts and recurring-transaction reminders here." />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
