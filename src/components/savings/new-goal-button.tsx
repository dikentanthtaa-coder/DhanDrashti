"use client";

import { Plus } from "lucide-react";
import type { AccountRow } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { SavingsGoalDialog } from "@/components/savings/savings-goal-dialog";

export function NewGoalButton({ accounts }: { accounts: AccountRow[] }) {
  return (
    <SavingsGoalDialog
      accounts={accounts}
      trigger={
        <Button>
          <Plus data-icon="inline-start" /> New goal
        </Button>
      }
    />
  );
}
