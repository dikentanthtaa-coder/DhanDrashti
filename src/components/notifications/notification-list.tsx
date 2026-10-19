"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CalendarClock, Check, CheckCheck, Info, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { NotificationRow } from "@/lib/types/database";
import { deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ICONS = {
  budget_alert: Target,
  recurring_reminder: CalendarClock,
  recurring_posted: CalendarClock,
  system: Info,
} as const;

function linkFor(n: NotificationRow): { href: string; label: string } | null {
  if (n.type === "budget_alert") return { href: "/budgets", label: "Open budgets" };
  if (n.type === "recurring_reminder" || n.type === "recurring_posted") return { href: "/recurring", label: "Open recurring" };
  return null;
}

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const [pending, startTransition] = React.useTransition();
  const unread = notifications.filter((n) => !n.read_at).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || unread === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await markAllNotificationsReadAction();
              if (r.ok) toast.success(r.message ?? "Done");
              else toast.error(r.error);
            })
          }
        >
          {pending ? <Spinner /> : <CheckCheck data-icon="inline-start" />}
          Mark all read
        </Button>
      </div>
      <ul className="flex flex-col divide-y rounded-xl border">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </ul>
    </div>
  );
}

function NotificationItem({ notification: n }: { notification: NotificationRow }) {
  const [pending, startTransition] = React.useTransition();
  const Icon = ICONS[n.type] ?? Bell;
  const link = linkFor(n);
  const unread = !n.read_at;
  return (
    <li className={cn("flex gap-3 px-4 py-3", unread && "bg-primary/5")}>
      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")} aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>
            {unread ? <span className="sr-only">Unread: </span> : null}
            {n.title}
          </p>
          <time dateTime={n.created_at} className="shrink-0 text-xs text-muted-foreground tabular">
            {format(new Date(n.created_at), "d MMM yyyy, h:mm a")}
          </time>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {link ? (
            <Button asChild variant="link" size="sm" className="h-auto px-0">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await markNotificationReadAction(n.id, unread);
                if (!r.ok) toast.error(r.error);
              })
            }
          >
            <Check data-icon="inline-start" /> {unread ? "Mark read" : "Mark unread"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label="Delete notification"
            onClick={() =>
              startTransition(async () => {
                const r = await deleteNotificationAction(n.id);
                if (r.ok) toast.success(r.message ?? "Removed");
                else toast.error(r.error);
              })
            }
          >
            <Trash2 data-icon="inline-start" /> Delete
          </Button>
        </div>
      </div>
    </li>
  );
}
