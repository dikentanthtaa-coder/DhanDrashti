"use client";

import { Plus } from "lucide-react";
import type { AccountRow, CategoryRow } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog";

export function NewRecurringButton({ accounts, categories, today }: { accounts: AccountRow[]; categories: CategoryRow[]; today: string }) {
  return (
    <RecurringFormDialog
      accounts={accounts}
      categories={categories}
      today={today}
      trigger={
        <Button>
          <Plus data-icon="inline-start" /> New schedule
        </Button>
      }
    />
  );
}
