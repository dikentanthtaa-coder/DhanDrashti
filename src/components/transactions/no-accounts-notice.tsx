import Link from "next/link";
import { Wallet } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function NoAccountsNotice() {
  return (
    <Alert>
      <Wallet aria-hidden="true" />
      <AlertTitle>You need an active account first</AlertTitle>
      <AlertDescription>Transactions belong to an account (cash, bank, credit card…). Create one to continue.</AlertDescription>
      <AlertAction>
        <Button asChild size="sm" variant="outline">
          <Link href="/accounts">Manage accounts</Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
