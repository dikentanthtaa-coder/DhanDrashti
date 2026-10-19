import Link from "next/link";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";
import type { BudgetUsage, NotificationRow } from "@/lib/types/database";
import { budgetStatus } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/finance/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

export function BudgetAlertsWidget({ usage, notifications }: { usage: BudgetUsage[]; notifications: NotificationRow[] }) {
  const flagged = usage
    .map((u) => ({ u, s: budgetStatus(u.spent, u.amount_limit, u.alert_thresholds) }))
    .filter(({ s }) => s.state !== "ok")
    .sort((a, b) => b.s.percentUsed - a.s.percentUsed);
  const alerts = notifications.filter((n) => n.type === "budget_alert").slice(0, 3);

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Budget alerts</CardTitle>
        <Button asChild variant="ghost" size="sm" className="no-print">
          <Link href="/budgets">Budgets</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {usage.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No budgets yet"
            description="Create a monthly budget to get alerts at 80% and 100%."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/budgets">Create a budget</Link>
              </Button>
            }
          />
        ) : flagged.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-status-good/30 bg-status-good/10 px-3 py-2 text-sm">
            <CheckCircle2 className="size-4 text-status-good" aria-hidden="true" />
            All {usage.length} budget{usage.length === 1 ? "" : "s"} on track this month.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {flagged.slice(0, 4).map(({ u, s }) => (
              <li key={u.budget_id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className={cn("size-4", s.state === "over" ? "text-status-critical" : "text-status-serious")} aria-hidden="true" />
                    {u.category_name ?? "Overall budget"}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {formatINR(u.spent)} / {formatINR(u.amount_limit)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, s.percentUsed)}
                  aria-label={`${u.category_name ?? "Overall"} budget ${s.percentUsed.toFixed(0)}% used`}
                  className={cn(s.state === "over" ? "[&>[data-slot=progress-indicator]]:bg-status-critical" : "[&>[data-slot=progress-indicator]]:bg-status-serious")}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.state === "over" ? `Over by ${formatINR(s.spent.minus(s.limit))}` : `${s.percentUsed.toFixed(1)}% used · ${formatINR(s.remaining)} left`}
                </div>
              </li>
            ))}
          </ul>
        )}
        {alerts.length > 0 ? (
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <div className="mb-1 font-medium text-foreground">Unread alerts</div>
            <ul className="flex flex-col gap-1">
              {alerts.map((n) => (
                <li key={n.id}>
                  <Link href="/notifications" className="hover:underline">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
