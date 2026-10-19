import type { Metadata } from "next";
import { requireUserWithProfile } from "@/lib/auth/session";
import { todayInTimezone } from "@/lib/finance/dates";
import { listCategories } from "@/lib/data/categories";
import { listAccounts } from "@/lib/data/accounts";
import { listSavingsGoals } from "@/lib/data/savings";
import { listMerchants } from "@/lib/data/transactions";
import type { TransactionType } from "@/lib/types/database";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { NoAccountsNotice } from "@/components/transactions/no-accounts-notice";

export const metadata: Metadata = { title: "New transaction" };

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { timezone } = await requireUserWithProfile();
  const today = todayInTimezone(timezone);
  const typeParam = typeof params.type === "string" ? params.type : "expense";
  const defaultType: TransactionType = typeParam === "income" || typeParam === "transfer" ? typeParam : "expense";

  const [categories, accounts, goals, merchants] = await Promise.all([listCategories(), listAccounts(), listSavingsGoals(), listMerchants()]);
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="Add transaction" description="Record an expense, income or a transfer between your accounts." />
      {accounts.filter((a) => a.is_active).length === 0 ? <NoAccountsNotice /> : null}
      <Card>
        <CardContent>
          <TransactionForm accounts={accounts} categories={categories} goals={activeGoals} merchants={merchants} today={today} defaultType={defaultType} />
        </CardContent>
      </Card>
    </div>
  );
}
