"use client";

import * as React from "react";
import { CalendarClock, MoreHorizontal, Pause, Pencil, Play, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AccountRow, CategoryRow, RecurringTransactionRow } from "@/lib/types/database";
import { FREQUENCY_LABELS } from "@/lib/constants";
import { categoryLabel, categoryMap } from "@/lib/data/categories-shared";
import { formatINR } from "@/lib/finance/money";
import { formatDisplayDate, transactionTypeLabel } from "@/lib/format";
import { deleteRecurringAction, setRecurringStatusAction } from "@/lib/actions/recurring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryIcon } from "@/components/common/category-icon";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<RecurringTransactionRow["status"], "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  paused: "secondary",
  cancelled: "destructive",
  completed: "outline",
};

export function RecurringList({
  schedules,
  accounts,
  categories,
  today,
}: {
  schedules: RecurringTransactionRow[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  today: string;
}) {
  const accountName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—";
  const catMap = React.useMemo(() => categoryMap(categories), [categories]);
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {schedules.map((s) => (
        <RecurringItem key={s.id} schedule={s} accounts={accounts} categories={categories} today={today} accountName={accountName} catMap={catMap} />
      ))}
    </ul>
  );
}

function RecurringItem({
  schedule: s,
  accounts,
  categories,
  today,
  accountName,
  catMap,
}: {
  schedule: RecurringTransactionRow;
  accounts: AccountRow[];
  categories: CategoryRow[];
  today: string;
  accountName: (id: string | null) => string;
  catMap: Map<string, CategoryRow>;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const cat = s.category_id ? catMap.get(s.category_id) : null;
  const parent = cat?.parent_id ? catMap.get(cat.parent_id) : null;
  const overdue = s.status === "active" && s.next_due_date < today;

  const setStatus = async (status: "active" | "paused" | "cancelled") => {
    const r = await setRecurringStatusAction(s.id, status);
    if (r.ok) toast.success(r.message ?? "Updated");
    else toast.error(r.error);
  };

  return (
    <li>
      <Card className={cn("gap-2 py-4", s.status !== "active" && "opacity-80")}>
        <CardContent className="flex flex-col gap-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {s.transaction_type === "transfer" ? (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-transfer/10 text-transfer" aria-hidden="true">
                  <CalendarClock className="size-4" />
                </span>
              ) : (
                <CategoryIcon icon={cat?.icon ?? parent?.icon} color={cat?.color ?? parent?.color} />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{s.merchant || (s.transaction_type === "transfer" ? `Transfer to ${accountName(s.to_account_id)}` : categoryLabel(catMap, s.category_id))}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {transactionTypeLabel(s.transaction_type)} · {FREQUENCY_LABELS[s.frequency]} · {accountName(s.account_id)}
                  {s.transaction_type !== "transfer" ? ` · ${categoryLabel(catMap, s.category_id)}` : ""}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.merchant ?? "schedule"}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                {s.status === "active" ? (
                  <DropdownMenuItem onClick={() => setStatus("paused")}>
                    <Pause /> Pause
                  </DropdownMenuItem>
                ) : s.status === "paused" ? (
                  <DropdownMenuItem onClick={() => setStatus("active")}>
                    <Play /> Resume
                  </DropdownMenuItem>
                ) : null}
                {s.status === "active" || s.status === "paused" ? (
                  <DropdownMenuItem onClick={() => setCancelOpen(true)}>
                    <XCircle /> Cancel schedule
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("text-lg font-semibold tabular", s.transaction_type === "income" ? "text-income" : s.transaction_type === "expense" ? "text-expense" : "text-transfer")}>
              {formatINR(s.amount)}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge variant={STATUS_VARIANT[s.status]} className="capitalize">
                {s.status}
              </Badge>
              <Badge variant="outline">{s.posting_mode === "auto_post" ? "Auto-post" : "Reminder"}</Badge>
            </div>
          </div>
          <p className={cn("text-xs", overdue ? "font-medium text-status-serious" : "text-muted-foreground")}>
            {s.status === "active" ? (overdue ? `Due since ${formatDisplayDate(s.next_due_date)} — press “Process due now”` : `Next due ${formatDisplayDate(s.next_due_date)}`) : s.status === "completed" ? `Ended ${s.end_date ? formatDisplayDate(s.end_date) : ""}` : `Next would be ${formatDisplayDate(s.next_due_date)}`}
            {s.end_date && s.status === "active" ? ` · ends ${formatDisplayDate(s.end_date)}` : ""}
          </p>
        </CardContent>
      </Card>
      <RecurringFormDialog accounts={accounts} categories={categories} schedule={s} today={today} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this schedule?"
        description="No further occurrences will be generated. Past transactions are kept. You can still delete it later."
        confirmLabel="Cancel schedule"
        onConfirm={() => setStatus("cancelled")}
      />
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this schedule?"
        description="The schedule and its occurrence history are removed. Transactions it already posted are kept."
        confirmLabel="Delete schedule"
        destructive
        onConfirm={async () => {
          const r = await deleteRecurringAction(s.id);
          if (r.ok) toast.success(r.message ?? "Deleted");
          else toast.error(r.error);
        }}
      />
    </li>
  );
}
