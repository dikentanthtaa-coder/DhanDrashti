import type { Metadata } from "next";
import { Info, Plus, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getAccountBalances, listAccounts } from "@/lib/data/accounts";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SummaryCard } from "@/components/common/summary-card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { AccountList } from "@/components/accounts/account-list";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  await requireUser();
  const [accounts, balances] = await Promise.all([listAccounts(), getAccountBalances()]);
  const active = balances.filter((b) => b.is_active);
  const netWorth = active.reduce((s, b) => s + Number(b.balance), 0);
  const savings = active.filter((b) => b.account_type === "savings").reduce((s, b) => s + Number(b.balance), 0);
  const owed = active.filter((b) => b.account_type === "credit_card" && Number(b.balance) < 0).reduce((s, b) => s - Number(b.balance), 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Accounts"
        description="Cash, bank, savings, credit cards and anything else you move money through."
        actions={
          <AccountFormDialog
            trigger={
              <Button>
                <Plus data-icon="inline-start" /> New account
              </Button>
            }
          />
        }
      />
      {accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet" description="Create a cash or bank account to start recording transactions." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard title="Net across active accounts" value={formatINR(netWorth)} hint="Sum of all active account balances" />
            <SummaryCard title="Tracked savings balance" value={formatINR(savings)} hint="Balances of accounts typed “Savings”" tone="income" />
            <SummaryCard title="Credit card owed" value={formatINR(owed)} hint="Outstanding on credit card accounts" tone={owed > 0 ? "expense" : "neutral"} />
          </div>
          <AccountList accounts={accounts} balances={balances} />
        </>
      )}
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>How balances are calculated</AlertTitle>
        <AlertDescription>
          Balance = opening balance + income + refunds + transfers in − expenses − transfers out. Transfers between your accounts never count as
          income or spending. A credit card purchase is spending at purchase time; paying the card off is a transfer, so nothing is counted twice.
        </AlertDescription>
      </Alert>
    </div>
  );
}
