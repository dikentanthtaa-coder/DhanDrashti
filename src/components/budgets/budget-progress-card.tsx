"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, History, MoreHorizontal, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { BudgetHistoryRow, BudgetRow, BudgetUsage, CategoryRow } from "@/lib/types/database";
import { budgetStatus } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/finance/money";
import { formatPercent } from "@/lib/format";
import { deleteBudgetAction } from "@/lib/actions/budgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/common/category-icon";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import { BudgetHistoryChart } from "@/components/budgets/budget-history-chart";
import { cn } from "@/lib/utils";

export function BudgetProgressCard({
  usage,
  budget,
  history,
  categories,
  defaultMonth,
  readOnly = false,
}: {
  usage: BudgetUsage;
  budget: BudgetRow | null;
  history?: BudgetHistoryRow[];
  categories: CategoryRow[];
  defaultMonth: string;
  readOnly?: boolean;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const status = budgetStatus(usage.spent, usage.amount_limit, usage.alert_thresholds);
  const pct = Math.min(100, Math.max(0, status.percentUsed));
  const barColor = status.state === "over" ? "bg-status-critical" : status.state === "warning" ? "bg-status-serious" : "bg-primary";
  const name = usage.category_name ?? "Overall budget";

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CategoryIcon icon={usage.category_id ? usage.category_icon : "wallet"} color={usage.category_id ? usage.category_color : null} />
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {usage.category_id ? "Category budget" : "All spending"} · Limit {formatINR(usage.amount_limit)}
            </p>
          </div>
        </div>
        {!readOnly && budget ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowHistory((s) => !s)}>
                <History /> {showHistory ? "Hide history" : "Show history"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-semibold tabular">{formatINR(usage.spent)}</div>
            <div className="text-xs text-muted-foreground">spent of {formatINR(usage.amount_limit)}</div>
          </div>
          <div className="text-right">
            <div className={cn("text-sm font-medium tabular", status.remaining.lt(0) ? "text-status-critical" : "text-foreground")}>
              {status.remaining.lt(0) ? `${formatINR(status.remaining.abs())} over` : `${formatINR(status.remaining)} left`}
            </div>
            <div className="text-xs text-muted-foreground tabular">{formatPercent(status.percentUsed, 2)} used</div>
          </div>
        </div>
        <div
          className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(status.percentUsed)}
          aria-label={`${name}: ${formatPercent(status.percentUsed, 1)} of budget used`}
        >
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
          {usage.alert_thresholds
            .filter((t) => t < 100)
            .map((t) => (
              <span key={t} className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: `${t}%` }} aria-hidden="true" title={`${t}% alert`} />
            ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {status.state === "over" ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" aria-hidden="true" /> Over budget
            </Badge>
          ) : status.state === "warning" ? (
            <Badge variant="outline" className="gap-1 border-status-serious text-status-serious">
              <TriangleAlert className="size-3" aria-hidden="true" /> Approaching limit
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-status-good">
              <CheckCircle2 className="size-3" aria-hidden="true" /> On track
            </Badge>
          )}
          <span className="text-muted-foreground">Alerts at {usage.alert_thresholds.map((t) => `${t}%`).join(", ") || "none"}</span>
        </div>
        {showHistory && history ? (
          <div className="border-t pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Last {history.length} months</p>
            <BudgetHistoryChart history={history} />
          </div>
        ) : null}
      </CardContent>
      {!readOnly && budget ? (
        <>
          <BudgetFormDialog categories={categories} budget={budget} defaultMonth={defaultMonth} open={editOpen} onOpenChange={setEditOpen} />
          <ConfirmationDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete ${name}?`}
            description="The budget and its alert history will be removed. Transactions are not affected."
            confirmLabel="Delete budget"
            destructive
            onConfirm={async () => {
              const r = await deleteBudgetAction(budget.id);
              if (r.ok) toast.success(r.message ?? "Deleted");
              else toast.error(r.error);
            }}
          />
        </>
      ) : null}
    </Card>
  );
}
