"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransactionAction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";

export function DeleteTransactionButton({ id, redirectTo, size = "icon-sm", label }: { id: string; redirectTo?: string; size?: "icon-sm" | "sm" | "default"; label?: string }) {
  const router = useRouter();
  return (
    <ConfirmationDialog
      trigger={
        <Button variant={label ? "destructive" : "ghost"} size={size} aria-label="Delete transaction">
          <Trash2 data-icon={label ? "inline-start" : undefined} />
          {label}
        </Button>
      }
      title="Delete this transaction?"
      description="This removes the transaction and any attached receipt. Account balances and reports update immediately. This cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={async () => {
        const r = await deleteTransactionAction(id);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success(r.message ?? "Deleted");
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
