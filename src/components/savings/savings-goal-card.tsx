"use client";

import * as React from "react";
import { Archive, CheckCircle2, MoreHorizontal, Pencil, PiggyBank, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AccountRow } from "@/lib/types/database";
import type { GoalWithProgress } from "@/lib/data/savings";
import { monthsUntil, suggestedMonthlyContribution } from "@/lib/finance/calculations";
import { formatINR, percentOf } from "@/lib/finance/money";
import { formatDisplayDate, formatPercent } from "@/lib/format";
import { deleteSavingsGoalAction, setSavingsGoalStatusAction } from "@/lib/actions/savings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { SavingsGoalDialog } from "@/components/savings/savings-goal-dialog";
import { ContributionDialog } from "@/components/savings/contribution-dialog";
import { cn } from "@/lib/utils";

export function SavingsGoalCard({ goal, accounts, today }: { goal: GoalWithProgress; accounts: AccountRow[]; today: string }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [contribOpen, setContribOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const pct = percentOf(goal.saved, goal.target_amount);
  const clamped = Math.min(100, Math.max(0, pct));
  const months = monthsUntil(goal.target_date, today);
  const suggested = suggestedMonthlyContribution(goal.target_amount, goal.saved, months);
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved));
  const linked = goal.account_id ? accounts.find((a) => a.id === goal.account_id) : null;
  const reached = Number(goal.saved) >= Number(goal.target_amount);

  const setStatus = async (status: "active" | "completed" | "archived") => {
    const r = await setSavingsGoalStatusAction(goal.id, status);
    if (r.ok) toast.success(r.message ?? "Updated");
    else toast.error(r.error);
  };

  return (
    <Card className={cn("gap-3", goal.status !== "active" && "opacity-80")}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <PiggyBank className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{goal.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {goal.target_date ? `Target ${formatDisplayDate(goal.target_date)}` : "No target date"}
              {linked ? ` · ${linked.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={goal.status === "completed" ? "default" : goal.status === "archived" ? "secondary" : "outline"} className="capitalize">
            {goal.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${goal.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setContribOpen(true)}>
                <Plus /> Add contribution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {goal.status !== "completed" ? (
                <DropdownMenuItem onClick={() => setStatus("completed")}>
                  <CheckCircle2 /> Mark completed
                </DropdownMenuItem>
              ) : null}
              {goal.status !== "archived" ? (
                <DropdownMenuItem onClick={() => setStatus("archived")}>
                  <Archive /> Archive
                </DropdownMenuItem>
              ) : null}
              {goal.status !== "active" ? (
                <DropdownMenuItem onClick={() => setStatus("active")}>
                  <RotateCcw /> Reactivate
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-semibold tabular">{formatINR(goal.saved)}</div>
            <div className="text-xs text-muted-foreground">saved of {formatINR(goal.target_amount)}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium tabular">{formatPercent(pct, 1)}</div>
            <div className="text-xs text-muted-foreground">{reached ? "Target reached" : `${formatINR(remaining)} to go`}</div>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} aria-label={`${goal.name}: ${formatPercent(pct, 1)} saved`}>
          <div className={cn("h-full rounded-full", reached ? "bg-status-good" : "bg-primary")} style={{ width: `${clamped}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {goal.contribution_count} contribution{goal.contribution_count === 1 ? "" : "s"}
            {goal.last_contribution ? ` · last ${formatDisplayDate(goal.last_contribution)}` : ""}
          </span>
          {!reached && goal.status === "active" ? (
            suggested ? (
              <span>
                Save <span className="font-medium text-foreground tabular">{formatINR(suggested)}</span>/month for {months} month{months === 1 ? "" : "s"}
              </span>
            ) : (
              <span>Add a target date to get a monthly suggestion</span>
            )
          ) : null}
        </div>
        {goal.status === "active" ? (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setContribOpen(true)}>
            <Plus data-icon="inline-start" /> Add contribution
          </Button>
        ) : null}
      </CardContent>
      <SavingsGoalDialog accounts={accounts} goal={goal} open={editOpen} onOpenChange={setEditOpen} />
      <ContributionDialog goal={goal} accounts={accounts} today={today} open={contribOpen} onOpenChange={setContribOpen} />
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${goal.name}”?`}
        description="The goal is removed. Transfers you recorded as contributions stay in your transaction history."
        confirmLabel="Delete goal"
        destructive
        onConfirm={async () => {
          const r = await deleteSavingsGoalAction(goal.id);
          if (r.ok) toast.success(r.message ?? "Deleted");
          else toast.error(r.error);
        }}
      />
    </Card>
  );
}
