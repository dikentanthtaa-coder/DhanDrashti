"use client";

import { Plus } from "lucide-react";
import type { CategoryRow } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";

export function NewBudgetButton({ categories, defaultMonth }: { categories: CategoryRow[]; defaultMonth: string }) {
  return (
    <BudgetFormDialog
      categories={categories}
      defaultMonth={defaultMonth}
      trigger={
        <Button>
          <Plus data-icon="inline-start" /> New budget
        </Button>
      }
    />
  );
}
