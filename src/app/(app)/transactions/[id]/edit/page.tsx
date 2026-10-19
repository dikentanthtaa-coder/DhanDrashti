import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserWithProfile } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/finance/dates";
import { getTransaction, listMerchants } from "@/lib/data/transactions";
import { listCategories } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import { listSavingsGoals } from "@/lib/data/savings";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";

export const metadata: Metadata = { title: "Edit transaction" };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const [tx, categories, accounts, goals, merchants] = await Promise.all([getTransaction(id), listCategories(), listAccounts(), listSavingsGoals({ includeArchived: true }), listMerchants()]);
  if (!tx) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Edit transaction" description="Changes update balances, budgets and reports immediately." />
      <Card>
        <CardContent>
          <TransactionForm accounts={accounts} categories={categories} goals={goals.filter((g) => g.status === "active" || g.id === tx.savings_goal_id)} merchants={merchants} today={today} transaction={tx} />
        </CardContent>
      </Card>
    </div>
  );
}
