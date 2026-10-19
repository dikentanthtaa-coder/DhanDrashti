"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Pencil, PiggyBank, Power, Trash2, Wallet, CircleDollarSign } from "lucide-react";
import { toast } from "sonner";
import type { AccountBalance, AccountRow, AccountType } from "@/lib/types/database";
import { deleteAccountRecordAction, setAccountActiveAction } from "@/lib/actions/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  cash: Wallet,
  bank: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  other: CircleDollarSign,
};

export function AccountList({ accounts, balances }: { accounts: AccountRow[]; balances: AccountBalance[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const balanceOf = new Map(balances.map((b) => [b.account_id, Number(b.balance)]));
  const groups: AccountType[] = ["cash", "bank", "savings", "credit_card", "other"];

  const toggleActive = (a: AccountRow) =>
    startTransition(async () => {
      const r = await setAccountActiveAction(a.id, !a.is_active);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(r.message ?? "Updated");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-6">
      {groups.map((type) => {
        const items = accounts.filter((a) => a.account_type === type);
        if (items.length === 0) return null;
        const Icon = TYPE_ICONS[type];
        const total = items.filter((a) => a.is_active).reduce((s, a) => s + (balanceOf.get(a.id) ?? 0), 0);
        return (
          <section key={type} aria-labelledby={`acc-group-${type}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id={`acc-group-${type}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" /> {ACCOUNT_TYPE_LABELS[type]}
              </h2>
              <span className="tabular text-sm text-muted-foreground">{type === "credit_card" && total < 0 ? `Owed ${formatINR(-total)}` : formatINR(total)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((a) => {
                const bal = balanceOf.get(a.id) ?? 0;
                const owed = type === "credit_card" && bal < 0;
                return (
                  <Card key={a.id} className={cn("gap-2 py-4", !a.is_active && "opacity-60")} data-pending={pending || undefined}>
                    <CardContent className="flex flex-col gap-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{a.name}</span>
                            {!a.is_active ? <Badge variant="outline" className="text-[10px]">Inactive</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">Opening {formatINR(a.opening_balance)}</div>
                        </div>
                        <div className="text-right">
                          <div className={cn("tabular text-lg font-semibold", owed ? "text-expense" : bal < 0 ? "text-status-critical" : "")}>{owed ? formatINR(-bal) : formatINR(bal)}</div>
                          <div className="text-xs text-muted-foreground">{owed ? "Amount owed" : "Balance"}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <AccountFormDialog
                          account={a}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Pencil data-icon="inline-start" /> Edit
                            </Button>
                          }
                        />
                        <Button variant="outline" size="sm" onClick={() => toggleActive(a)} disabled={pending}>
                          <Power data-icon="inline-start" /> {a.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                        <ConfirmationDialog
                          trigger={
                            <Button variant="ghost" size="sm" className="text-destructive" disabled={pending}>
                              <Trash2 data-icon="inline-start" /> Delete
                            </Button>
                          }
                          title={`Delete "${a.name}"?`}
                          description="Accounts with transactions cannot be deleted — deactivate them to keep history intact. Empty accounts are removed permanently."
                          confirmLabel="Delete account"
                          destructive
                          onConfirm={async () => {
                            const r = await deleteAccountRecordAction(a.id);
                            if (!r.ok) toast.error(r.error);
                            else {
                              toast.success(r.message ?? "Deleted");
                              router.refresh();
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
